import type { Permission } from '@/features/auth/permissions'
import type { OfficeNotification } from '@/features/monitoring/monitoring-api'
import { NOTIFICATION_ACTIONS } from '@/features/notifications/notifications'
import { createFormatter } from '@/lib/format'
import { createTranslator } from '@/lib/i18n'

import { officeRow } from './office-rows'

/**
 * Dòng của chuông điều phối viên và quản lý công ty: câu, đối tượng, người làm, tham số đã dịch, và màn mà dòng mở theo quyền người đọc.
 * Luồng đủ trên kho mẫu (sự kiện thật, chuông, bấm dòng) ở `OfficeNotifications.test.tsx`.
 */

const vi = { t: createTranslator('vi'), format: createFormatter('vi-VN') }
const en = { t: createTranslator('en'), format: createFormatter('en-US') }

const DISPATCHER: readonly Permission[] = ['trips.view', 'monitoring.view']
const canOf = (permissions: readonly Permission[]) => (permission: Permission) => permissions.includes(permission)

const TRIP = { type: 'trip', id: 'TRIP-009', label: 'Tuyến Thủ Đức – Bình Thạnh' }

function entry(overrides: Partial<OfficeNotification> & Pick<OfficeNotification, 'action'>): OfficeNotification {
  return {
    id: 'EV-000301',
    at: '2026-09-14T03:20:00.000Z',
    actorName: 'Lê Văn Tài',
    actorId: 'US-0004',
    target: TRIP,
    params: {},
    names: {},
    ...overrides,
  }
}

const row = (notification: OfficeNotification, permissions = DISPATCHER) => officeRow(notification, vi.t, vi.format, canOf(permissions))

test('mọi sự kiện chuông của điều phối viên và quản lý công ty có câu riêng, không lộ mã của kho', () => {
  const actions = new Set([...NOTIFICATION_ACTIONS.dispatcher, ...NOTIFICATION_ACTIONS.companyManager])
  for (const action of actions) {
    const sentence = row(entry({ action })).sentence
    expect(sentence).not.toBe(action)
    expect(sentence).not.toBe('')
  }
})

test('tài xế báo sự cố chuyến: người làm, tham số đã dịch theo thứ tự kho ghi, mở màn giám sát chuyến đó', () => {
  const reported = entry({
    action: 'exception.reported',
    params: { exceptionId: 'EXC-001', exceptionType: 'TRAFFIC', delayMinutes: 25, stopNumber: 2, note: 'Kẹt xe cầu Sài Gòn' },
  })
  expect(row(reported)).toStrictEqual({
    id: 'EV-000301',
    at: '2026-09-14T03:20:00.000Z',
    sentence: 'Báo sự cố chuyến',
    target: 'Chuyến TRIP-009 · Tuyến Thủ Đức – Bình Thạnh',
    details: [
      'Người làm: Lê Văn Tài',
      'Sự cố: EXC-001',
      'Loại sự cố: Tắc đường',
      'Dự kiến chậm (phút): 25',
      'Điểm giao: 2',
      'Ghi chú: Kẹt xe cầu Sài Gòn',
    ],
    open: { tripId: 'TRIP-009', href: { pathname: '/live/[tripId]', params: { tripId: 'TRIP-009' } }, hint: 'Mở giám sát chuyến TRIP-009' },
  })
})

test('người đọc không xem được giám sát: sự cố mở Chi tiết chuyến; không xem được chuyến thì dòng không mở gì', () => {
  const reported = entry({ action: 'exception.reported', params: { exceptionId: 'EXC-001' } })
  expect(row(reported, ['trips.view']).open).toStrictEqual({
    tripId: 'TRIP-009',
    href: { pathname: '/trip-detail/[tripId]', params: { tripId: 'TRIP-009' } },
  })
  expect(row(reported, []).open).toBeUndefined()
})

test('việc của chuyến không có việc ở màn giám sát (huỷ chuyến) mở Chi tiết chuyến; người làm đã bị xoá thì nói vậy kèm mã', () => {
  const cancelled = entry({ action: 'trip.cancelled', actorName: null, actorId: 'US-0099', params: { reason: 'Khách hoãn nhận hàng', returned: 12 } })
  const result = row(cancelled)
  expect(result.sentence).toBe('Huỷ chuyến')
  expect(result.details).toStrictEqual(['Người làm: Tài khoản đã xoá (US-0099)', 'Lý do: Khách hoãn nhận hàng', 'Hoàn trả: 12'])
  expect(result.open).toStrictEqual({ tripId: 'TRIP-009', href: { pathname: '/trip-detail/[tripId]', params: { tripId: 'TRIP-009' } } })
})

test('nguy cơ trễ hạn là việc của hệ thống: mức hạn bằng chữ, giờ đến và hạn theo giờ Việt Nam', () => {
  const risk = entry({
    action: 'delivery.etaRisk',
    actorName: null,
    actorId: null,
    params: { stopNumber: 3, deadlineStatus: 'MISSED', eta: '2026-09-14T08:45:00.000Z', deadline: '2026-09-14T08:30:00.000Z' },
  })
  expect(row(risk).details).toStrictEqual([
    'Người làm: Hệ thống',
    'Điểm giao: 3',
    'Mức hạn: Trễ hạn dự kiến',
    'Dự kiến đến: 15:45 · 14/09',
    'Hạn giao: 15:30 · 14/09',
  ])
  expect(row(risk).open?.hint).toBe('Mở giám sát chuyến TRIP-009')
})

test('xác nhận tay chờ duyệt: bước và lý do là mã của kho, giá trị rỗng và tham số không có nhãn bị bỏ', () => {
  const manual = entry({
    action: 'manualConfirm.requested',
    params: { packageInstanceId: 'PKG-003-01', verifyContext: 'LOADING', stopNumber: 1, manualReason: 'QR_UNREADABLE', fields: 'vehicleId', note: '' },
  })
  expect(row(manual).details).toStrictEqual([
    'Người làm: Lê Văn Tài',
    'Kiện: PKG-003-01',
    'Bước: Xếp hàng',
    'Điểm giao: 1',
    'Lý do xác nhận tay: QR không đọc được',
  ])
})

test('tham số nêu mã một người đọc họ tên; kho không còn tài khoản đó thì nói vậy kèm mã', () => {
  const dropped = entry({
    action: 'loading.shortageDropped',
    params: { packageInstanceId: 'PKG-007-02', packageCode: 'HK-DNG-2609-01', requirementId: 'REQ-004', requestedBy: 'US-0003', driverId: 'US-0098' },
    names: { 'US-0003': 'Phạm Minh Kho' },
  })
  expect(row(dropped).details).toStrictEqual([
    'Người làm: Lê Văn Tài',
    'Kiện: PKG-007-02',
    'Mã của bên gửi: HK-DNG-2609-01',
    'Yêu cầu giao: REQ-004',
    'Người gửi: Phạm Minh Kho',
    'Tài xế: Tài khoản đã xoá (US-0098)',
  ])
})

test('kho tìm thấy lại kiện: đối tượng là kiện, cờ bằng chữ, dòng không mở gì', () => {
  const found = entry({ action: 'package.found', target: { type: 'package', id: 'PK-0088', label: undefined }, params: { flag: 'NOT_FOUND', packageCode: 'HK-0088' } })
  const result = row(found)
  expect(result.target).toBe('Kiện PK-0088')
  expect(result.details).toStrictEqual(['Người làm: Lê Văn Tài', 'Cờ: Không tìm thấy', 'Mã của bên gửi: HK-0088'])
  expect(result.open).toBeUndefined()
})

test('trả lời yêu cầu hỗ trợ của chính mình: câu chung, không nêu lại người gửi, không mở gì', () => {
  const replied = entry({ action: 'ticket.replied', actorName: 'Đỗ Hỗ Trợ', target: { type: 'ticket', id: 'TKT-001', label: undefined }, params: { requestedBy: 'US-0001' } })
  expect(row(replied)).toMatchObject({
    sentence: 'Bộ phận hỗ trợ đã trả lời yêu cầu của bạn',
    target: 'Yêu cầu hỗ trợ TKT-001',
    details: ['Người làm: Đỗ Hỗ Trợ'],
    open: undefined,
  })
})

test('tiếng Anh: câu, nhãn và số theo ngôn ngữ đang chọn', () => {
  const completed = entry({ action: 'loading.completed', params: { loaded: 1234, damaged: 0 } })
  const result = officeRow(completed, en.t, en.format, canOf(DISPATCHER))
  expect(result.sentence).not.toBe(row(completed).sentence)
  expect(result.details).toContain(en.t('notifications.detail', { label: en.t('notifications.office.params.loaded'), value: '1,234' }))
  expect(row(completed).details).toContain('Đã lên xe: 1.234')
})
