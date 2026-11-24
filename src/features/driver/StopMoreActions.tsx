import { ClipboardList, Ellipsis, TrafficCone } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { useCan } from '@/features/auth/AuthProvider'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import type { DriverTripException, TripHead } from './driver-model'
import { useTripExceptionHistoryView } from './TripExceptionHistorySheet'
import { useTripExceptionForm } from './TripExceptionSheet'
import { useDriverCapabilities, useReportTripExceptionMutation } from './useDriverQueries'

type Panel = 'menu' | 'exception' | 'exceptionHistory'

type StopMoreActionsProps = {
  trip: TripHead
  /** Chuyến đang vận chuyển: các việc trong tờ chỉ có khi xe đã rời kho. */
  delivering: boolean
  /** Danh sách sự cố trên đường đã báo của chuyến. */
  exceptions: readonly DriverTripException[]
  exceptionsLoading?: boolean
  /** Tăng số này để mở thẳng danh sách sự cố đã báo (khi bấm vào thẻ tóm tắt trên màn). */
  openHistorySignal?: number
  /** Kho đã ghi sự cố `id` của cả xe: tờ đóng, màn nói đã báo. */
  onExceptionReported: (id: string) => void
}

/**
 * Nút phụ "Thêm" ở màn điểm giao của tài xế (như `StopMoreActions` của web): gom các việc trên đường vào **một** tờ trượt từ đáy —
 * "Sự cố trên đường" (tạo mới) và "Xem sự cố đã báo" (xem lại lịch sử + trạng thái xử lý).
 */
export function StopMoreActions({
  trip,
  delivering,
  exceptions,
  exceptionsLoading = false,
  openHistorySignal = 0,
  onExceptionReported,
}: StopMoreActionsProps) {
  const t = useT()
  const can = useCan()
  const capabilities = useDriverCapabilities()
  const [open, setOpen] = useState(false)
  // Nội dung giữ nguyên khi tờ đang mờ dần lúc đóng
  const [panel, setPanel] = useState<Panel>('menu')
  const close = () => setOpen(false)

  // Mỗi lần `openHistorySignal` tăng: mở tờ ở lịch sử sự cố. Đổi state ngay lúc vẽ khi tín hiệu đổi (không qua effect)
  const [seenHistorySignal, setSeenHistorySignal] = useState(0)
  if (openHistorySignal !== seenHistorySignal) {
    setSeenHistorySignal(openHistorySignal)
    if (openHistorySignal > 0) {
      setPanel('exceptionHistory')
      setOpen(true)
    }
  }

  const report = useReportTripExceptionMutation(trip.id)
  const exception = useTripExceptionForm({
    tripCode: trip.code,
    report,
    onCancel: close,
    onReported: (id) => {
      close()
      onExceptionReported(id)
    },
  })
  const canException = delivering && capabilities.tripExceptions && can('exceptions.report')
  const exceptionHistory = useTripExceptionHistoryView({
    tripCode: trip.code,
    exceptions,
    loading: exceptionsLoading,
    canReport: canException,
    onClose: close,
    onReportNew: () => {
      exception.reset()
      setPanel('exception')
    },
  })
  if (!canException) return null

  const historyLabel =
    exceptions.length > 0
      ? t('tripException.history.openWithCount', { count: exceptions.length })
      : t('tripException.history.open')

  const view =
    panel === 'exception'
      ? exception
      : panel === 'exceptionHistory'
        ? exceptionHistory
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
                <Button
                  write
                  variant="secondary"
                  icon={TrafficCone}
                  style={styles.row}
                  onPress={() => {
                    exception.reset()
                    setPanel('exception')
                  }}>
                  {t('monitoring.reportDialog.driverOpen')}
                </Button>
                <Button variant="secondary" icon={ClipboardList} style={styles.row} onPress={() => setPanel('exceptionHistory')}>
                  {historyLabel}
                </Button>
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
