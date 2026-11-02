import { Lock } from 'lucide-react-native'
import { useMemo } from 'react'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import type { Formatter } from '@/lib/format'
import { useFormat, useT, type TFunction } from '@/lib/i18n'
import type { Trip } from '@/lib/mock-db'

import { staleReason, type StaleEdit } from '../trip-detail'
import type { TripDetail } from '../trips-model'

/**
 * Banner theo pha của Chi tiết chuyến (như `TripDetailBanner` của web): bản duyệt lỗi thời nói **vì sao** — lần sửa xe / kiện mới nhất
 * sau lúc duyệt, kèm giờ, người sửa và giá trị trước → sau, đọc từ nhật ký; kho đang xếp / đã xếp xong, xe đang giao, chuyến đã hoàn
 * thành nói vì sao chuyến đã khoá (web để hai câu sau dưới nút ở đầu trang); chuyến đã huỷ nói lúc huỷ và lý do. Chuyến còn lập kế hoạch
 * mà phương án không lỗi thời thì không có banner. Bản web còn có lối tới Thiết lập tối ưu và câu "vẫn sửa được…": trên điện thoại không
 * sửa chuyến, nên không có.
 */
export function TripBanners({ detail }: { detail: TripDetail }) {
  const t = useT()
  const format = useFormat()
  const { trip, revisions, events, people } = detail
  const stale = useMemo(() => staleReason(trip, revisions, events), [trip, revisions, events])

  if (stale) {
    const actorId = stale.edit?.actorId ?? null
    const actor = actorId === null ? null : (people.find((person) => person.id === actorId)?.fullName ?? actorId)
    return (
      <Banner tone="warning">
        <AppText variant="label">{t('trips.detail.stale.title', { revision: stale.revisionId })}</AppText>
        {` ${t('trips.detail.stale.body')}`}
        {stale.edit ? `\n${editLine(stale.edit, trip, actor, t, format)}` : null}
      </Banner>
    )
  }
  switch (trip.phase) {
    case 'loading':
    case 'loaded':
    case 'delivering':
    case 'completed':
      return (
        <Banner tone="info" icon={Lock}>
          {t(`trips.detail.locked.${trip.phase}`)}
        </Banner>
      )
    case 'cancelled': {
      const { cancellation } = trip
      return (
        <Banner tone="danger">
          {cancellation
            ? t('trips.detail.locked.cancelled', { time: format.time(cancellation.at), date: format.date(cancellation.at), reason: cancellation.reason })
            : t('trips.detail.locked.completed')}
        </Banner>
      )
    }
    default:
      return null
  }
}

/**
 * Dòng thứ hai của banner lỗi thời: "Sửa lúc 11:40 24/09/2026 · Người sửa — PKG-001 Tên kiện · Số lượng từ 80 thành 86". Bản web vẽ
 * "80 → 86" và để câu "từ 80 thành 86" cho trình đọc màn hình; ở đây câu đó hiện luôn, mắt và tai đọc cùng một chữ.
 */
function editLine(edit: StaleEdit, trip: Pick<Trip, 'packages'>, actor: string | null, t: TFunction, format: Formatter): string {
  const head = `${t('trips.detail.stale.editedAt', { time: format.time(edit.at), date: format.date(edit.at) })}${actor ? ` · ${actor}` : ''}`
  if (!edit.packageId) return `${head} — ${t('trips.detail.stale.fields', { fields: format.list(edit.fields.map((field) => fieldLabel(field, t))) })}`
  const pkg = trip.packages.find((item) => item.id === edit.packageId)
  const value = (raw: string | number) => (typeof raw === 'number' ? format.integer(raw) : raw)
  const change =
    edit.field && edit.before !== undefined && edit.after !== undefined
      ? ` · ${t(`companyTrips.packageFields.${edit.field}`)} ${t('trips.detail.stale.change', { before: value(edit.before), after: value(edit.after) })}`
      : ''
  return `${head} — ${edit.packageId}${pkg ? ` ${pkg.name}` : ''}${change}`
}

/** Trường kho ghi vào tham số `fields` của `trip.updated` / `trip.vehicleChanged`. */
const TRIP_FIELDS = ['name', 'scheduledDate', 'departureAt', 'departureDepot', 'driverId', 'vehicleId', 'stops', 'packages'] as const

const isTripField = (field: string): field is (typeof TRIP_FIELDS)[number] => TRIP_FIELDS.some((name) => name === field)

/**
 * Tên trường đã sửa. Bản web chỉ dịch xe và kiện, trường khác hiện tên trong code (`name`); ở đây mọi trường kho ghi đều có nhãn,
 * trường lạ (dữ liệu cũ) mới giữ nguyên tên.
 */
function fieldLabel(field: string, t: TFunction): string {
  return isTripField(field) ? t(`companyTrips.fieldNames.${field}`) : field
}
