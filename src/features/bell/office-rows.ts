import type { DeadlineStatus } from '@/domain/routing'
import type { Permission } from '@/features/auth/permissions'
import { liveTripPath } from '@/features/monitoring/live-routes'
import type { OfficeNotification } from '@/features/monitoring/monitoring-api'
import { tripDetailPath } from '@/features/trips/trip-routes'
import type { Formatter } from '@/lib/format'
import type { TFunction } from '@/lib/i18n'
import {
  DELIVERY_ISSUE_KINDS,
  EXCEPTION_ESCALATIONS,
  MANUAL_CONFIRM_REASONS,
  PACKAGE_FLAGS,
  TRIP_EXCEPTION_TYPES,
  VERIFY_CONTEXTS,
  type AuditAction,
} from '@/lib/mock-db'

import type { BellRow } from './bell-rows'

/**
 * Dòng của chuông điều phối viên và quản lý công ty, như một thông báo của chuông web (`NotificationItem`): câu là nhãn hành động của
 * nhật ký, đối tượng là chuyến (mã kèm tên hiện tại), chi tiết là người làm rồi từng tham số kho ghi — có nhãn, mã đã dịch, không thêm số
 * nào. Thông báo về một chuyến mở Chi tiết chuyến; nguy cơ trễ hạn, sự cố cấp chuyến và yêu cầu nhận hàng dọc đường mở màn giám sát chuyến
 * đó khi người đọc xem được giám sát — việc phải làm nằm ở đó. Kiện tìm thấy lại và trả lời yêu cầu hỗ trợ không mở gì: app chưa có màn
 * của chúng.
 */

/** Sự kiện có câu ở `notifications.office.actions` (nhóm.tên đúng như mã của kho). */
export const OFFICE_ACTIONS = [
  'revision.approved', 'loading.completed', 'loading.shortageReported', 'loading.shortageDropped', 'loading.damaged', 'package.found',
  'delivery.issue', 'delivery.etaRisk', 'delivery.completed', 'trip.cancelled', 'manualConfirm.requested', 'exception.reported',
  'exception.escalated', 'exception.deadlineRenegotiated', 'pickup.requested',
] as const satisfies readonly AuditAction[]

/** Việc phải làm ở màn giám sát chuyến: thông báo này mở màn đó thay Chi tiết chuyến. */
export const LIVE_ACTIONS: readonly AuditAction[] = [
  'delivery.etaRisk', 'exception.reported', 'exception.escalated', 'exception.deadlineRenegotiated', 'pickup.requested',
]

/** Tham số có nhãn ở `notifications.office.params`, theo nhãn tham số nhật ký của web. */
const PARAM_KEYS = [
  'reason', 'note', 'revisionId', 'sourceRevisionId', 'edits', 'loaded', 'returned', 'damaged', 'supporting', 'requirementId',
  'packageInstanceId', 'packageCode', 'stopNumber', 'kind', 'stops', 'issues', 'count', 'flag', 'lateStops', 'verifyContext', 'manualReason',
  'requestedBy', 'deadlineStatus', 'eta', 'deadline', 'exceptionId', 'exceptionType', 'delayMinutes', 'escalation', 'pickupId', 'failedRules',
  'driverId',
] as const

type ParamKey = (typeof PARAM_KEYS)[number]

const DEADLINE_STATUSES = ['OK', 'AT_RISK', 'MISSED'] as const satisfies readonly DeadlineStatus[]

function isOneOf<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value)
}

/** Họ tên người mà tham số nêu mã; kho không còn tài khoản đó thì nói vậy kèm mã. */
function personName(entry: OfficeNotification, id: string, t: TFunction): string {
  return entry.names[id] ?? t('notifications.office.deletedUser', { id })
}

/** Giá trị của một tham số: số theo ngôn ngữ, mã của kho qua từ điển, mốc giờ theo giờ và ngày, chữ người dùng nhập giữ nguyên. */
function paramValue(entry: OfficeNotification, key: ParamKey, value: string | number, t: TFunction, format: Formatter): string {
  if (typeof value === 'number') return format.integer(value)
  switch (key) {
    case 'kind':
      return isOneOf(DELIVERY_ISSUE_KINDS, value) ? t(`common.deliveryIssueKinds.${value}`) : value
    case 'flag':
      return isOneOf(PACKAGE_FLAGS, value) ? t(`common.packageFlags.${value}`) : value
    case 'deadlineStatus':
      return isOneOf(DEADLINE_STATUSES, value) ? t(`common.deadlineStatuses.${value}`) : value
    case 'eta':
    case 'deadline':
      return t('notifications.dateTime', { time: format.time(value), date: format.dayMonth(value) })
    case 'verifyContext':
      return isOneOf(VERIFY_CONTEXTS, value) ? t(`notifications.office.verifyContexts.${value}`) : value
    case 'manualReason':
      return isOneOf(MANUAL_CONFIRM_REASONS, value) ? t(`common.manualConfirmReasons.${value}`) : value
    case 'exceptionType':
      return isOneOf(TRIP_EXCEPTION_TYPES, value) ? t(`common.tripExceptionTypes.${value}`) : value
    case 'escalation':
      return isOneOf(EXCEPTION_ESCALATIONS, value) ? t(`notifications.office.escalations.${value}`) : value
    case 'requestedBy':
    case 'driverId':
      return personName(entry, value, t)
    default:
      return value
  }
}

function sentenceOf(action: AuditAction, t: TFunction): string {
  if (action === 'ticket.replied') return t('notifications.ticketReplied')
  return isOneOf(OFFICE_ACTIONS, action) ? t(`notifications.office.actions.${action}`) : action
}

function targetLabel({ target }: OfficeNotification, t: TFunction): string {
  if (target.type === 'trip') {
    return target.label === undefined ? t('notifications.target.trip', { id: target.id }) : t('notifications.target.tripNamed', { id: target.id, name: target.label })
  }
  if (target.type === 'ticket') return t('notifications.target.ticket', { id: target.id })
  if (target.type === 'package') return t('notifications.office.package', { id: target.id })
  return target.id
}

/** Người làm: họ tên, "Hệ thống" khi kho tự làm, hoặc tài khoản đã xoá. */
function actorLine(entry: OfficeNotification, t: TFunction): string {
  const name = entry.actorId === null ? t('notifications.office.system') : (entry.actorName ?? t('notifications.office.deletedUser', { id: entry.actorId }))
  return t('notifications.detail', { label: t('notifications.office.params.actor'), value: name })
}

/**
 * Người làm, rồi các tham số có nhãn theo thứ tự kho ghi. Bỏ giá trị rỗng, và người gửi của câu trả lời yêu cầu hỗ trợ — đó là chính
 * người đọc.
 */
function detailsOf(entry: OfficeNotification, t: TFunction, format: Formatter): string[] {
  const params = Object.entries(entry.params).flatMap(([key, value]) => {
    if (!isOneOf(PARAM_KEYS, key) || value === '') return []
    if (entry.action === 'ticket.replied' && key === 'requestedBy') return []
    return [t('notifications.detail', { label: t(`notifications.office.params.${key}`), value: paramValue(entry, key, value, t, format) })]
  })
  return [actorLine(entry, t), ...params]
}

function openOf(entry: OfficeNotification, t: TFunction, can: (permission: Permission) => boolean): BellRow['open'] {
  if (entry.target.type !== 'trip') return undefined
  const tripId = entry.target.id
  if (LIVE_ACTIONS.includes(entry.action) && can('monitoring.view')) {
    return { tripId, href: liveTripPath(tripId), hint: t('notifications.office.openLive', { id: tripId }) }
  }
  return can('trips.view') ? { tripId, href: tripDetailPath(tripId) } : undefined
}

/** Dòng của điều phối viên và quản lý công ty; `can` là quyền của người đọc, để chỉ mở màn họ mở được. */
export function officeRow(entry: OfficeNotification, t: TFunction, format: Formatter, can: (permission: Permission) => boolean): BellRow {
  return {
    id: entry.id,
    at: entry.at,
    sentence: sentenceOf(entry.action, t),
    target: targetLabel(entry, t),
    details: detailsOf(entry, t, format),
    open: openOf(entry, t, can),
  }
}
