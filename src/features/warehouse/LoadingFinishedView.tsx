import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import type { Revision, Trip } from '@/lib/mock-db'
import { colors } from '@/theme/tokens'

import { DamagedList, FinishedTiles, StopTallyList } from './finished/FinishedFigures'
import { SealCard } from './finished/SealCard'
import { SealSheet } from './finished/SealSheet'
import { useSealEntry } from './finished/useSealEntry'
import { loadingProgress, stopTallies } from './loading-session'
import { SessionExitButton } from './SessionExitButton'
import { useLeaveSession } from './useLeaveSession'
import { useSessionScene } from './useSessionScene'
import { useWarehouseTrips } from './useWarehouseQueries'

export type LoadingFinishedViewProps = {
  /** Chuyến kho đã xếp xong (pha `loaded` trở đi). */
  readonly trip: Trip
  /** Phương án kho đã xếp theo (`warehousePlan`). */
  readonly plan: Revision
}

/**
 * Màn "Xếp xong — chờ xuất phát" của phiên kho (như `LoadingFinished` của web, cỡ điện thoại, một cột): tiêu đề, hai ô số (đã xếp trên
 * tổng, bỏ lại kho), kiện hỏng bỏ lại kho, niêm phong thùng, "Theo điểm giao", số kiện đối chiếu bằng nhãn, rồi tuyến · xe · ngày chạy (xe
 * chỉ khi chuyến còn trong danh sách của kho). Không có tên hay số điện thoại tài xế: màn không có nguồn đó. Mở lại chuyến đã xếp xong — kể
 * cả khi xe đã đi giao — cũng ra màn này, chỉ đọc.
 *
 * Chân màn: còn ở kho mà chưa ghi số seal thì "Ghi số seal" là nút chính (mở tờ nhập), "Về danh sách chuyến" là nút phụ; còn lại "Về danh
 * sách chuyến" là nút chính. Tờ nhập đang mở thì chân màn ẩn — tờ che chỗ đó, và màn chỉ có một nút chính.
 */
export function LoadingFinishedView({ trip, plan }: LoadingFinishedViewProps) {
  const t = useT()
  const leave = useLeaveSession()
  const model = useSessionScene(trip, plan)
  const progress = loadingProgress(model.placements, trip.loading)
  const tallies = stopTallies(model.stops, model.placements, progress.damaged)
  const loadedByQr = trip.loading?.steps.filter((step) => step.outcome === 'loaded' && step.via === 'qr').length ?? 0
  // Tên xe từ danh sách chuyến của kho (cùng khoá truy vấn); xe đã đi giao thì chuyến không còn trong danh sách nên không có dòng xe
  const vehicleName = useWarehouseTrips().data?.find((row) => row.id === trip.id)?.vehicleName
  const entry = useSealEntry(trip)
  const seal = trip.loading?.seal
  const needsSeal = entry.editable && seal === undefined

  const footer = entry.open ? undefined : (
    <>
      {needsSeal ? <Button onPress={entry.start}>{t('warehouse.seal.submit')}</Button> : null}
      <Button variant={needsSeal ? 'secondary' : 'primary'} onPress={leave}>
        {t('warehouse.backToList')}
      </Button>
    </>
  )

  return (
    <Screen title={trip.id} leading={<SessionExitButton />} scroll footer={footer}>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          {t('warehouse.finished.title', { tripId: trip.id })}
        </AppText>
        {trip.phase === 'loaded' ? <AppText color={colors.text2}>{t('warehouse.finished.description')}</AppText> : null}
      </Card>
      <FinishedTiles loaded={progress.loaded} total={progress.total} left={progress.damaged.length} />
      <DamagedList damaged={progress.damaged} />
      {entry.available ? <SealCard seal={seal} editable={entry.editable} failure={entry.open ? null : entry.failure} onChange={entry.start} /> : null}
      <StopTallyList tallies={tallies} />
      {loadedByQr > 0 ? <AppText color={colors.text2}>{t('warehouse.scan.recordedByQr', { count: loadedByQr })}</AppText> : null}
      <TripInfo trip={trip} vehicleName={vehicleName} />
      {entry.available ? (
        <SealSheet
          key={entry.session}
          open={entry.open}
          initial={seal?.number ?? ''}
          pending={entry.pending}
          failure={entry.open ? entry.failure : null}
          onCancel={entry.cancel}
          onSubmit={entry.submit}
        />
      ) : null}
    </Screen>
  )
}

/** Tuyến, xe, ngày chạy của chuyến: mỗi dòng một phần tử đọc "nhãn: giá trị". Tên dài xuống dòng, không cắt. */
function TripInfo({ trip, vehicleName }: { trip: Pick<Trip, 'name' | 'scheduledDate'>; vehicleName: string | undefined }) {
  const t = useT()
  const format = useFormat()
  const rows = [
    { label: t('warehouse.header.trip'), value: trip.name },
    ...(vehicleName === undefined ? [] : [{ label: t('warehouse.list.vehicle'), value: vehicleName }]),
    { label: t('warehouse.list.date'), value: format.date(calendarDate(trip.scheduledDate)) },
  ]
  return (
    <Card>
      {rows.map(({ label, value }) => (
        <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={styles.info}>
          <AppText color={colors.text3}>{label}</AppText>
          <AppText variant="label">{value}</AppText>
        </View>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  info: { gap: 2 },
})
