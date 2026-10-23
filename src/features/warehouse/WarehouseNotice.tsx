import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { EmptyState } from '@/components/StateView'
import { TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { SessionExitButton } from './SessionExitButton'
import { useLeaveSession } from './useLeaveSession'
import { useWarehouseTrips } from './useWarehouseQueries'
import type { WarehouseTripRow } from './warehouse-trips'

export type WarehouseNoticeProps = {
  readonly tripId: string
  readonly title: string
  /** Một câu: vì sao kho chưa xếp được chuyến này và đang chờ ai. */
  readonly description: string
  /**
   * Chuyến chờ duyệt lại: dòng phụ của chuyến ở dải trời và thẻ tuyến · ngày chạy · xe · số kiện, đọc từ danh sách chuyến của kho.
   * Chuyến không có trong danh sách đó thì bỏ hẳn hai phần này, không điền thay.
   */
  readonly showTrip?: boolean
  /** Lỗi (tải chuyến, bắt đầu soạn hàng): câu là lỗi, đọc ngay; chân màn có "Thử lại" (nút chính) trên "Về danh sách chuyến". */
  readonly onRetry?: () => void
  /** Đang thử lại: nút "Thử lại" quay và không nhận bấm. */
  readonly retrying?: boolean
}

/**
 * Phiên kho không xếp được (như `WarehouseEmpty` của web, không có linh vật): chưa có phương án đã duyệt, bản duyệt lỗi thời chờ duyệt
 * lại, chuyến quay về chờ điều phối tối ưu lại, chuyến đã huỷ, hoặc không tải / không bắt đầu được. Dải trời mang mã chuyến và nút thoát;
 * thân là tiêu đề và một câu lý do; chân màn luôn có lối về danh sách chuyến — mặc định là nút chính duy nhất của màn.
 */
export function WarehouseNotice(props: WarehouseNoticeProps) {
  return props.showTrip === true ? <NoticeWithTrip {...props} /> : <NoticeView {...props} row={undefined} />
}

/** Chỉ màn có `showTrip` mới đọc danh sách chuyến của kho. */
function NoticeWithTrip(props: WarehouseNoticeProps) {
  const row = useWarehouseTrips().data?.find((entry) => entry.id === props.tripId)
  return <NoticeView {...props} row={row} />
}

function NoticeView({ tripId, title, description, onRetry, retrying = false, row }: WarehouseNoticeProps & { readonly row: WarehouseTripRow | undefined }) {
  const t = useT()
  const leave = useLeaveSession()
  const failed = onRetry !== undefined
  return (
    <Screen
      title={tripId}
      leading={<SessionExitButton />}
      below={row?.sub ? <TripSubStatusTag sub={row.sub} /> : undefined}
      scroll
      footer={
        failed ? (
          <>
            <Button onPress={onRetry} loading={retrying}>
              {t('warehouse.retry')}
            </Button>
            <Button variant="secondary" onPress={leave}>
              {t('warehouse.backToList')}
            </Button>
          </>
        ) : (
          <Button onPress={leave}>{t('warehouse.backToList')}</Button>
        )
      }>
      <EmptyState title={title} description={description} alert={failed} />
      {row === undefined ? null : <TripFacts row={row} />}
    </Screen>
  )
}

/** Thẻ thông tin chuyến: tuyến, rồi ngày chạy · xe · số kiện — mỗi dòng tự xuống hàng ở 360 dp. */
function TripFacts({ row }: { row: WarehouseTripRow }) {
  const t = useT()
  const format = useFormat()
  return (
    <Card>
      <AppText variant="label">{row.name}</AppText>
      <Fact label={t('warehouse.list.date')}>{format.date(calendarDate(row.scheduledDate))}</Fact>
      <Fact label={t('warehouse.list.vehicle')}>{row.vehicleName}</Fact>
      <Fact label={t('warehouse.list.packages')}>{format.integer(row.total)}</Fact>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="label" style={styles.value}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  fact: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space[2] },
  value: { flexShrink: 1 },
})
