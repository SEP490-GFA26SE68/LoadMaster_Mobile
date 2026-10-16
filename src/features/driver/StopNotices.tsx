import { MapPinCheck, PackagePlus } from 'lucide-react-native'

import { Banner } from '@/components/Banner'
import { useFormat, useT } from '@/lib/i18n'

import type { StopScreen } from './driver-model'

/**
 * Các thông báo đầu màn điểm giao (như `StopNotices` của web): kho chưa xếp xong (chỉ xem), kho đã xếp xong (chờ xuất phát), đang tới điểm
 * (chưa bấm "Đã đến") hoặc giờ đã đến, kiện của điểm này hỏng lúc xếp nên bị bỏ lại kho, và điểm nhận hàng dọc đường. Nằm trong vùng cuộn
 * để không chiếm chỗ cố định của màn một tay.
 */
export function StopNotices({ screen }: { screen: StopScreen }) {
  const t = useT()
  const format = useFormat()
  const { mode, arrivedAt, stop, leftAtWarehouse, pickupItems } = screen
  return (
    <>
      <Banner tone="info" icon={arrivedAt === undefined ? undefined : MapPinCheck}>
        {mode !== 'delivering'
          ? t(mode === 'preview' ? 'driver.notice.preview' : 'driver.notice.ready')
          : arrivedAt === undefined
            ? t('driver.notice.enRoute', { number: stop.number })
            : t('driver.notice.arrived', { number: stop.number, time: format.time(arrivedAt) })}
      </Banner>
      {leftAtWarehouse > 0 ? <Banner tone="warning">{t('driver.notice.leftOut', { count: leftAtWarehouse })}</Banner> : null}
      {stop.kind === 'PICKUP' ? (
        <Banner tone="info" icon={PackagePlus}>
          {t('driver.pickup.banner', { count: pickupItems.length, name: stop.name })}
        </Banner>
      ) : null}
    </>
  )
}
