import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip, MockResultTag } from '@/components/Chip'
import type { DeadlineStatus } from '@/domain/routing'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space, type BadgeTone } from '@/theme/tokens'

import type { EtaSource, StopTiming } from './stop-timing'

/*
 * Phần dùng chung của giờ đến và hạn giao trên màn tài xế (như `StopTimingParts` của web): thẻ liên hệ của điểm đang giao và dòng giờ của
 * từng điểm ở hai danh sách điểm — một cách viết giờ, một bộ chip mức hạn, một dòng nguồn kèm MOCK RESULT.
 */

const DEADLINE_TONE: Readonly<Record<DeadlineStatus, BadgeTone>> = { OK: 'success', AT_RISK: 'warning', MISSED: 'danger' }

/** Viết một mốc giờ: chỉ giờ khi là hôm nay, kèm ngày khi không phải ("09:40 · 17/09"). */
export function useMoment(): (iso: string) => string {
  const t = useT()
  const format = useFormat()
  return (iso) =>
    format.date(iso) === format.date(new Date()) ? format.time(iso) : t('driver.timing.dated', { time: format.time(iso), date: format.dayMonth(iso) })
}

/**
 * Mức hạn bằng chữ, chỉ khi điểm có hạn: đã đến thì "Đến kịp hạn" / "Đến trễ hạn" theo giờ đến thật, chưa đến thì mức hạn của giờ đến dự
 * kiến (Kịp hạn · Sát hạn · Trễ hạn dự kiến). Màu luôn đi kèm chữ.
 */
export function TimingChip({ timing }: { timing: Pick<StopTiming, 'arrival' | 'expected'> }) {
  const t = useT()
  const { arrival, expected } = timing
  if (arrival) {
    if (arrival.onTime === null) return null
    return <Chip tone={arrival.onTime ? 'success' : 'danger'} label={t(arrival.onTime ? 'common.arrivalStatuses.onTime' : 'common.arrivalStatuses.late')} />
  }
  if (expected?.status === undefined) return null
  return <Chip tone={DEADLINE_TONE[expected.status]} label={t(`common.deadlineStatuses.${expected.status}`)} />
}

/** Nguồn của giờ đến dự kiến kèm MOCK RESULT (giờ đến là ước lượng của mock): một dòng cho cả thẻ hay cả danh sách. */
export function EtaSourceLine({ sources }: { sources: readonly EtaSource[] }) {
  const t = useT()
  const format = useFormat()
  if (sources.length === 0) return null
  return (
    <View style={styles.row}>
      <AppText color={colors.text3}>{format.list(sources.map((source) => t(`driver.timing.sources.${source}`)))}</AppText>
      <MockResultTag />
    </View>
  )
}

/** Dòng giờ của một điểm trong danh sách điểm: "Dự kiến 08:15" (chưa đến) hoặc "Đã đến 08:50", kèm chip mức hạn khi điểm có hạn. */
export function StopListTime({ timing }: { timing: StopTiming }) {
  const t = useT()
  const moment = useMoment()
  const at = timing.arrival?.at ?? timing.expected?.eta
  if (at === undefined) return null
  return (
    <View style={styles.row}>
      <AppText color={colors.text2}>
        {t(timing.arrival ? 'driver.timing.arrived' : 'driver.timing.expectedShort')}{' '}
        <AppText variant="label" style={styles.time}>
          {moment(at)}
        </AppText>
      </AppText>
      <TimingChip timing={timing} />
    </View>
  )
}

const styles = StyleSheet.create({
  // Chip xuống dòng riêng khi hết chỗ (điện thoại 360)
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  time: { fontVariant: ['tabular-nums'] },
})
