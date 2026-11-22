import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { PresenceStatus, PresenceVehicle, PresenceWarehouse } from './presence-model'
import { useCheckInVehicle, usePresenceEvents } from './usePresenceQueries'

type CheckInSheetProps = {
  readonly warehouse: PresenceWarehouse
  /** Xe đang hỏi; `null` là tờ đóng. */
  readonly vehicle: PresenceVehicle | null
  readonly onClose: () => void
  /** Máy chủ đã ghi nhận: tờ đóng, màn nói kết quả. */
  readonly onDone: (vehicle: PresenceVehicle) => void
}

/**
 * Tờ "Ghi nhận xe có ở kho": nhắc chỉ ghi khi xe có mặt thật, nút chính "Ghi nhận". Lỗi của máy chủ nằm trong tờ, bấm lại là gửi lại với
 * cùng `Idempotency-Key` (máy chủ không ghi hai lần).
 */
export function CheckInSheet({ warehouse, vehicle, onClose, onDone }: CheckInSheetProps) {
  const t = useT()
  const checkIn = useCheckInVehicle(warehouse.id)
  const [failure, setFailure] = useState<string | null>(null)

  async function handleConfirm() {
    if (vehicle === null) return
    setFailure(null)
    try {
      await checkIn.mutateAsync(vehicle.id)
      onDone(vehicle)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  function close() {
    setFailure(null)
    onClose()
  }

  return (
    <Sheet
      open={vehicle !== null}
      onClose={close}
      busy={checkIn.isPending}
      title={t('vehiclePresence.checkInSheet.title')}
      description={vehicle === null ? undefined : t('vehiclePresence.checkInSheet.description', { plate: vehicle.licensePlate, warehouse: warehouse.name })}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={checkIn.isPending} onPress={close}>
            {t('vehiclePresence.checkInSheet.cancel')}
          </Button>
          <Button write style={styles.flex} loading={checkIn.isPending} onPress={() => void handleConfirm()}>
            {t('vehiclePresence.checkInSheet.confirm')}
          </Button>
        </>
      }>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

/** Trạng thái trước / sau của một lần ghi: lịch sử là của một kho, nên "Ở kho" là kho đang xem. */
const statusLabel = (t: TFunction, status: PresenceStatus) =>
  status === 'AT_WAREHOUSE' ? t('vehiclePresence.presence.here') : t(`vehiclePresence.presence.${status}`)

type EventsSheetProps = {
  readonly warehouse: PresenceWarehouse
  readonly vehicle: PresenceVehicle | null
  readonly onClose: () => void
}

/** Tờ lịch sử ghi nhận của một xe ở kho đang xem, mới nhất trước. Máy chủ không trả người ghi của từng lần, nên dòng không có tên người. */
export function PresenceEventsSheet({ warehouse, vehicle, onClose }: EventsSheetProps) {
  const t = useT()
  const format = useFormat()
  const events = usePresenceEvents(warehouse.id, vehicle?.id ?? null)
  const rows = events.data

  return (
    <Sheet
      open={vehicle !== null}
      onClose={onClose}
      title={t('vehiclePresence.events.title', { plate: vehicle?.licensePlate ?? '' })}
      description={t('vehiclePresence.events.description', { warehouse: warehouse.name })}
      footer={
        <Button variant="secondary" style={styles.flex} onPress={onClose}>
          {t('vehiclePresence.events.close')}
        </Button>
      }>
      {rows === undefined ? (
        events.isError ? (
          <ErrorState message={dataErrorMessage(events.error, t)} onRetry={() => void events.refetch()} />
        ) : (
          <LoadingState label={t('vehiclePresence.events.loading')} />
        )
      ) : rows.length === 0 ? (
        <AppText color={colors.text2}>{t('vehiclePresence.events.empty')}</AppText>
      ) : (
        rows.map((row) => (
          <View key={row.id} style={styles.event}>
            <AppText variant="label">{t(`vehiclePresence.events.${row.type}`)}</AppText>
            {row.previous === null || row.next === null ? null : (
              <AppText color={colors.text2}>
                {t('vehiclePresence.events.change', { from: statusLabel(t, row.previous), to: statusLabel(t, row.next) })}
              </AppText>
            )}
            <AppText color={colors.text3}>{`${format.time(row.recordedAt)} ${format.date(row.recordedAt)}`}</AppText>
          </View>
        ))
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  event: { gap: space[1], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.border },
})
