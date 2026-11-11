import { Check, X } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import type { Formatter } from '@/lib/format'
import { useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, palette, radius, space } from '@/theme/tokens'

import { tripProgress, type ProgressStep } from '../trip-progress'
import type { FullTripDetail } from '../trips-model'

type Look = 'done' | 'closed' | 'final' | 'current' | 'next' | 'stale' | 'cancel' | 'pending'

/** Cách vẽ một mốc, như web: chuyến đã khép (hoàn thành, huỷ) thì mốc đã qua dịu đi, chỉ mốc cuối còn màu. */
function lookOf(step: ProgressStep, closed: boolean): Look {
  if (step.kind === 'cancelled') return 'cancel'
  if (step.stale) return 'stale'
  if (step.state === 'current') return 'current'
  if (step.state === 'done') return step.kind === 'completed' ? 'final' : closed ? 'closed' : 'done'
  return step.note ? 'next' : 'pending'
}

/** Mốc trên nền thẻ sáng: nền, viền và màu dấu. Đang diễn ra dùng xanh lam (không tím). Màu chỉ để nhìn — trạng thái nằm ở chữ. */
const DOT: Record<Look, { readonly bg: string; readonly border: string; readonly mark: string }> = {
  done: { bg: palette.cyan[400], border: palette.cyan[400], mark: palette.cyan[950] },
  closed: { bg: palette.cyan[100], border: palette.cyan[200], mark: palette.cyan[800] },
  final: { bg: palette.green[500], border: palette.green[500], mark: palette.cyan[950] },
  current: { bg: palette.azure[50], border: palette.azure[500], mark: palette.azure[500] },
  next: { bg: colors.bg, border: palette.cyan[500], mark: palette.cyan[500] },
  stale: { bg: palette.amber[50], border: palette.amber[500], mark: palette.amber[700] },
  cancel: { bg: palette.red[700], border: palette.red[700], mark: colors.bg },
  pending: { bg: colors.bg, border: colors.border, mark: colors.border },
}

/**
 * Tiến trình của chuyến (như `TripDetailStepper` của web, dọc cho điện thoại): tạo → tối ưu → duyệt → xếp → xếp xong → giao → hoàn
 * thành, hoặc dừng ở "Đã huỷ". Mỗi mốc ghi giờ và người làm; mốc đang diễn ra có số kiện đã xếp / số điểm đã giao kèm thước đo; mốc kế
 * tiếp mang "Tiếp theo" (hoặc "Chờ duyệt lại" khi bản duyệt lỗi thời); mốc duyệt mang "Lỗi thời". Mọi mốc lấy từ kho. Mỗi mốc là một
 * phần tử đọc, tên đọc gồm đủ các ý.
 */
export function ProgressCard({ detail }: { detail: FullTripDetail }) {
  const t = useT()
  const { trip, revisions, events, people } = detail
  const steps = useMemo(() => tripProgress(trip, revisions, events), [trip, revisions, events])
  const names = useMemo(() => new Map(people.map((person) => [person.id, person.fullName])), [people])
  const closed = trip.phase === 'completed' || trip.phase === 'cancelled'
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('trips.progress.title')}
      </AppText>
      <View>
        {steps.map((step, index) => (
          <StepRow
            key={step.kind}
            step={step}
            look={lookOf(step, closed)}
            actor={step.actorId ? (names.get(step.actorId) ?? step.actorId) : null}
            last={index === steps.length - 1}
          />
        ))}
      </View>
    </Card>
  )
}

function StepRow({ step, look, actor, last }: { step: ProgressStep; look: Look; actor: string | null; last: boolean }) {
  const t = useT()
  const format = useFormat()
  const bar = barOf(step, t, format)
  const at = step.at ? t('trips.progress.at', { time: format.time(step.at), date: format.date(step.at) }) : null
  const note = step.note ? t(`trips.progress.note.${step.note}`) : null
  const reached = look !== 'pending' && look !== 'next'
  const spoken = [
    t(`trips.progress.steps.${step.kind}`),
    t(`trips.progress.state.${step.state}`),
    ...(step.stale ? [t('trips.progress.staleA11y')] : []),
    ...(bar ? [bar.count] : []),
    ...(at ? [at] : []),
    ...(at && actor ? [actor] : []),
    ...(step.reason ? [step.reason] : []),
    ...(note ? [note] : []),
  ].join(', ')
  const dot = DOT[look]
  return (
    <View accessible accessibilityLabel={spoken} style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dot.bg, borderColor: dot.border }]}>
          {look === 'cancel' ? <X color={dot.mark} size={14} strokeWidth={3} /> : null}
          {look === 'current' ? <View style={[styles.inner, { backgroundColor: dot.mark }]} /> : null}
          {look === 'done' || look === 'closed' || look === 'final' || look === 'stale' ? <Check color={dot.mark} size={14} strokeWidth={3} /> : null}
        </View>
        {last ? null : <View style={[styles.line, reached && look !== 'cancel' ? styles.lineReached : null]} />}
      </View>
      <View style={[styles.body, last ? null : styles.bodyGap]}>
        <View style={styles.titleRow}>
          <AppText variant="label" color={reached ? colors.text : look === 'next' ? colors.primary : colors.text3}>
            {t(`trips.progress.steps.${step.kind}`)}
          </AppText>
          {step.stale ? <Chip tone="warning" label={t('trips.progress.staleTag')} /> : null}
          {note ? <Chip tone={step.note === 'next' ? 'cyan' : 'warning'} label={note} /> : null}
        </View>
        {bar ? <AppText color={colors.text2}>{bar.count}</AppText> : null}
        {bar && look === 'current' ? (
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${Math.round(bar.ratio * 100)}%` }]} />
          </View>
        ) : null}
        {at ? (
          <AppText variant="meta" color={colors.text3} style={styles.number}>
            {at}
          </AppText>
        ) : null}
        {at && actor ? <AppText color={colors.text3}>{actor}</AppText> : null}
        {step.reason ? <AppText color={colors.text2}>{step.reason}</AppText> : null}
      </View>
    </View>
  )
}

/** Số của mốc đang diễn ra (hoặc đã qua): kiện đã xếp kèm kiện hỏng bỏ lại kho, hay số điểm đã giao; kèm tỉ lệ cho thước đo. */
function barOf(step: ProgressStep, t: TFunction, format: Formatter): { count: string; ratio: number } | null {
  if (step.loading) {
    const { loaded, damaged, total } = step.loading
    const count = [
      t('trips.progress.loadingCount', { loaded: format.integer(loaded), total: format.integer(total) }),
      ...(damaged > 0 ? [t('trips.progress.damagedCount', { count: damaged })] : []),
    ].join(' · ')
    return { count, ratio: total > 0 ? loaded / total : 0 }
  }
  if (step.delivery) {
    const { done, total } = step.delivery
    return { count: t('trips.progress.deliveryCount', { done: format.integer(done), total: format.integer(total) }), ratio: total > 0 ? done / total : 0 }
  }
  return null
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  rail: { alignItems: 'center', width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, width: 2, minHeight: space[3], marginVertical: space[1], borderRadius: 1, backgroundColor: colors.border },
  lineReached: { backgroundColor: palette.cyan[300] },
  body: { flex: 1, gap: space[1], paddingTop: 0 },
  bodyGap: { paddingBottom: space[4] },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  meter: { height: 6, maxWidth: 200, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.lineSoft },
  meterFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.azure[500] },
  number: { fontVariant: ['tabular-nums'] },
})
