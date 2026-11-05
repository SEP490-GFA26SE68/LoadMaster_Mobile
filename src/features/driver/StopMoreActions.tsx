import { Ellipsis, PackagePlus, TrafficCone } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { useCan } from '@/features/auth/AuthProvider'
import { usePickupFormView } from '@/features/pickups/usePickupFormView'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import type { TripHead } from './driver-model'
import { useTripExceptionForm } from './TripExceptionSheet'
import { useCreatePickupRequestMutation, useDriverCapabilities, useReportTripExceptionMutation } from './useDriverQueries'

type Panel = 'menu' | 'exception' | 'pickup'

type StopMoreActionsProps = {
  trip: TripHead
  /** Chuyến đang vận chuyển: hai việc trong tờ chỉ có khi xe đã rời kho. */
  delivering: boolean
  /** Kho đã ghi sự cố `id` của cả xe: tờ đóng, màn nói đã báo. */
  onExceptionReported: (id: string) => void
}

/**
 * Nút phụ "Thêm" ở màn điểm giao của tài xế (như `StopMoreActions` của web): gom hai việc ít dùng trên đường vào **một** tờ trượt từ đáy —
 * "Sự cố trên đường" (`exceptions.report`: sự cố của cả xe, kèm số phút chậm; khác "Báo sự cố" của từng kiện) và "Nhận hàng dọc đường"
 * (`pickups.create`). Mỗi hàng giữ quyền của nó và chỉ hiện khi nguồn dữ liệu làm được việc đó; không còn hàng nào thì không có nút. Chọn
 * một hàng thì form hiện ngay trong tờ đang mở (một tờ cho cả luồng, không mở tờ thứ hai chồng lên); đóng tờ ở bước nào cũng đóng hết.
 */
export function StopMoreActions({ trip, delivering, onExceptionReported }: StopMoreActionsProps) {
  const t = useT()
  const can = useCan()
  const capabilities = useDriverCapabilities()
  const [open, setOpen] = useState(false)
  // Nội dung giữ nguyên khi tờ đang mờ dần lúc đóng
  const [panel, setPanel] = useState<Panel>('menu')
  const close = () => setOpen(false)
  const report = useReportTripExceptionMutation(trip.id)
  const create = useCreatePickupRequestMutation(trip.id)
  const exception = useTripExceptionForm({
    tripCode: trip.code,
    report,
    onCancel: close,
    onReported: (id) => {
      close()
      onExceptionReported(id)
    },
  })
  const pickup = usePickupFormView({ tripCode: trip.code, create, onClose: close })
  const canException = delivering && capabilities.tripExceptions && can('exceptions.report')
  const canPickup = delivering && capabilities.pickups && can('pickups.create')
  if (!canException && !canPickup) return null

  const view =
    panel === 'exception'
      ? exception
      : panel === 'pickup'
        ? pickup
        : {
            title: t('driver.more.title'),
            description: t('driver.more.description'),
            busy: false,
            footer: (
              <Button variant="secondary" style={styles.flex} onPress={close}>
                {t('driver.more.close')}
              </Button>
            ),
            body: (
              <View style={styles.rows}>
                {canException ? (
                  <Button
                    variant="secondary"
                    icon={TrafficCone}
                    style={styles.row}
                    onPress={() => {
                      exception.reset()
                      setPanel('exception')
                    }}>
                    {t('monitoring.reportDialog.driverOpen')}
                  </Button>
                ) : null}
                {canPickup ? (
                  <Button
                    variant="secondary"
                    icon={PackagePlus}
                    style={styles.row}
                    onPress={() => {
                      pickup.reset()
                      setPanel('pickup')
                    }}>
                    {t('pickups.open')}
                  </Button>
                ) : null}
              </View>
            ),
          }

  return (
    <>
      <Button
        variant="secondary"
        icon={Ellipsis}
        onPress={() => {
          setPanel('menu')
          setOpen(true)
        }}>
        {t('driver.more.open')}
      </Button>
      <Sheet open={open} onClose={close} busy={view.busy} title={view.title} description={view.description} footer={view.footer}>
        {view.body}
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rows: { gap: space[2] },
  row: { justifyContent: 'flex-start' },
})
