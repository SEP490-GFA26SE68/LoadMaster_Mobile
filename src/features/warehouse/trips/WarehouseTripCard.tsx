import { useRouter } from 'expo-router'
import { TriangleAlert } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import { loadingPath } from '../session-routes'
import type { WarehouseTripRow } from '../warehouse-trips'

/**
 * Một chuyến ở tab Kho (như `WarehouseTripCard` của web), cỡ điện thoại: mã chuyến cùng chip trạng thái và dòng phụ (xuống hàng khi hết
 * chỗ), tuyến là tiêu đề, ngày chạy · số kiện · tiến độ, xe ở dòng riêng để biển số không bị ngắt, thanh tiến độ khi đang soạn / xếp, số
 * seal khi đã xếp xong, và một nút 56 rộng hết thẻ theo nhóm: "Tiếp tục soạn / xếp (x/y)", "Bắt đầu soạn hàng", "Xem chuyến đã xếp". Bản
 * duyệt lỗi thời thì không có nút — một cảnh báo nói vì sao kho chưa xếp được, và chuyến vừa quay về thì nói lý do, có phải dỡ ra không.
 * Điều phối viên từ chối xác nhận tay mà kiện chưa được kiểm lại thì thẻ nhắc mở chuyến để kiểm lại.
 */
export function WarehouseTripCard({ row, primary }: { row: WarehouseTripRow; primary: boolean }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const progress = `${format.integer(row.recorded)}/${format.integer(row.total)}`
  const action =
    row.stage === 'loading'
      ? t(`warehouse.list.resume.${row.step}`, { done: format.integer(row.recorded), total: format.integer(row.total) })
      : row.stage === 'loaded'
        ? t('warehouse.list.openLoaded')
        : t('warehouse.list.start')

  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="label" accessibilityRole="header" style={styles.code}>
          {row.id}
        </AppText>
        <TripStatusChip status={row.status} />
        {row.sub === null ? null : <TripSubStatusTag sub={row.sub} />}
        {row.manualSub === null ? null : <TripSubStatusTag sub={row.manualSub} />}
      </View>
      <AppText variant="heading">{row.name}</AppText>

      <View style={styles.facts}>
        <Fact label={t('warehouse.list.date')}>{format.date(calendarDate(row.scheduledDate))}</Fact>
        <Fact label={t('warehouse.list.packages')} code>
          {format.integer(row.total)}
        </Fact>
        <Fact label={t('warehouse.list.progress')} code wide>
          {progress}
          {row.damaged > 0 ? (
            <AppText variant="label" color={badgeTones.warning.fg}>{` · ${t('warehouse.list.damaged', { count: row.damaged })}`}</AppText>
          ) : null}
        </Fact>
        {/* Tên xe có biển số: dòng riêng rộng hết thẻ để biển số không bị ngắt; xe không còn trong kho thì là mã xe */}
        <Fact label={t('warehouse.list.vehicle')} wide>
          {row.vehicleName}
        </Fact>
      </View>

      {row.stage === 'loading' ? <ProgressMeter row={row} /> : null}
      {row.stage === 'loaded' ? (
        <AppText color={colors.text2}>{row.seal === undefined ? t('warehouse.list.noSeal') : t('warehouse.list.seal', { number: row.seal })}</AppText>
      ) : null}
      {row.recheck > 0 ? <Warning tone="danger">{t('warehouse.list.recheck', { count: row.recheck })}</Warning> : null}
      {row.stage === 'stale' ? (
        <Warning tone="warning">
          {row.replan === undefined ? t('warehouse.list.stale') : t(`warehouse.replan.${row.replan.reason}`, { tripId: row.id })}
          {row.replan?.unload ? ` ${t('warehouse.replan.unload')}` : ''}
        </Warning>
      ) : (
        <Button
          variant={primary ? 'primary' : 'secondary'}
          accessibilityLabel={t('warehouseTrips.openLabel', { action, tripId: row.id })}
          onPress={() => router.push(loadingPath(row.id))}>
          {action}
        </Button>
      )}
    </Card>
  )
}

/**
 * Thanh tiến độ của chuyến đang ở kho: kiện đã xong ở bước hiện tại (đã soạn, hoặc đã có kết quả xếp) trên tổng kiện của phương án. Phần
 * trăm hiện cạnh thanh chỉ để nhìn — thanh mang tên và giá trị cho trình đọc màn hình.
 */
function ProgressMeter({ row }: { row: WarehouseTripRow }) {
  const t = useT()
  const format = useFormat()
  const percent = row.total === 0 ? 0 : Math.round((row.recorded / row.total) * 100)
  return (
    <View style={styles.meter}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('warehouse.list.progressLabel', { tripId: row.id })}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <AppText variant="label" color={colors.text2} style={styles.percent} accessibilityElementsHidden importantForAccessibility="no">
        {`${format.integer(percent)}%`}
      </AppText>
    </View>
  )
}

/** Một thông tin của chuyến: nhãn trên, giá trị dưới. `wide` chiếm cả hàng (tiến độ kèm kiện hỏng, tên xe). */
function Fact({ label, code = false, wide = false, children }: { label: string; code?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.fact, wide && styles.wide]}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="label" style={code ? styles.code : undefined}>
        {children}
      </AppText>
    </View>
  )
}

/** Khung nhấn của thẻ: icon cảnh báo kèm câu — màu chỉ nhấn, chữ nói đủ. */
function Warning({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  const { bg, fg, border } = badgeTones[tone]
  return (
    <View style={[styles.box, { backgroundColor: bg, borderColor: border }]}>
      <TriangleAlert color={fg} size={20} strokeWidth={1.5} style={styles.boxIcon} />
      <AppText variant="label" color={fg} style={styles.boxText}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[3] },
  fact: { flexGrow: 1, flexBasis: '40%', minWidth: 0 },
  wide: { flexBasis: '100%' },
  meter: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  track: { flex: 1, height: 10, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.lineSoft },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primaryFill },
  percent: { minWidth: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, borderWidth: 1 },
  boxIcon: { marginTop: 2 },
  boxText: { flex: 1 },
})
