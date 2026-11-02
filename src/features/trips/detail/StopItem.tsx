import { Check, Clock, Navigation } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import { StopDot } from '@/components/StopDot'
import { useFormat, useT } from '@/lib/i18n'
import type { TripEtaStop } from '@/lib/mock-db'
import { colors, palette, space } from '@/theme/tokens'

import type { StopRow } from '../trip-summary'
import { DEADLINE_TONE, PRIORITY_TONE } from './looks'
import { stopStateLabel, type StopState } from './route-view'

/**
 * Một điểm giao trên sơ đồ tuyến (như `StopCard` của web, xếp dọc cho điện thoại): số điểm trên màu định danh, tên, địa chỉ, số kiện ·
 * khối lượng; điểm có yêu cầu giao thì thêm hạn sớm nhất và ưu tiên cao nhất; tuyến đã tối ưu thì thêm giờ đến dự kiến và mức hạn bằng
 * chữ; điểm chưa có toạ độ mang "Chưa có toạ độ" khi chuyến còn lập kế hoạch; chuyến đang giao / đã giao thì thêm trạng thái giao. Chỉ
 * đọc, không bấm. Cả điểm là một phần tử đọc: tên đọc nói đủ những gì hiện ra, theo câu của bản web (thêm địa chỉ, số kiện đã dỡ và sự cố).
 */
export function StopItem({ stop, total, state, eta, missingCoordinates }: {
  stop: StopRow
  total: number
  state?: StopState
  /** Giờ đến dự kiến và mức hạn của tuyến đã tối ưu, khi xe chưa rời kho. */
  eta?: TripEtaStop
  missingCoordinates: boolean
}) {
  const t = useT()
  const format = useFormat()
  const packages = t('companyTrips.packageCount', { count: stop.packageCount })
  const weight = format.weight(stop.weightKg)
  const pickup = stop.kind === 'PICKUP'
  const unloaded = state?.kind === 'current' ? t('trips.route.unloaded', { done: format.integer(state.unloaded), total: format.integer(stop.packageCount) }) : null
  const issues = state && state.issues > 0 ? t('trips.route.issueTag', { count: state.issues }) : null
  const spoken = [
    t('trips.route.stop', { number: stop.number, total, name: stop.name, packages, weight }),
    ...(pickup ? [t('trips.route.pickupTag')] : []),
    ...(stop.address ? [stop.address] : []),
    ...(stop.deadline ? [t('trips.route.deadlineA11y', { time: format.time(stop.deadline), date: format.date(stop.deadline) })] : []),
    ...(stop.priority ? [t('trips.route.priorityA11y', { priority: t(`companyTrips.priority.${stop.priority}`) })] : []),
    ...(eta ? [t('trips.routePlan.etaA11y', { time: format.time(eta.eta), date: format.date(eta.eta) })] : []),
    ...(eta?.deadlineStatus ? [t(`common.deadlineStatuses.${eta.deadlineStatus}`)] : []),
    ...(missingCoordinates ? [t('trips.routePlan.missingCoordinates')] : []),
    ...(state ? [stopStateLabel(state, t, format)] : []),
    ...(unloaded ? [unloaded] : []),
    ...(issues ? [issues] : []),
  ].join(', ')

  return (
    <View accessible accessibilityLabel={spoken} style={styles.row}>
      <View>
        <StopDot number={stop.number} />
        {state?.kind === 'done' ? (
          <View style={styles.doneMark}>
            <Check color={colors.bg} size={10} strokeWidth={3.5} />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <AppText variant="label">{stop.name}</AppText>
        {pickup ? <Chip tone="azure" label={t('trips.route.pickupTag')} /> : null}
        {stop.address ? <AppText color={colors.text3}>{stop.address}</AppText> : null}
        <AppText color={stop.packageCount === 0 ? colors.text3 : colors.text2} style={styles.number}>
          {`${packages} · ${weight}`}
        </AppText>
        {stop.deadline ? (
          <View style={styles.line}>
            <Clock color={colors.text3} size={16} strokeWidth={1.75} />
            <AppText color={colors.text2} style={styles.number}>
              {t('trips.route.deadline', { time: format.time(stop.deadline), date: format.dayMonth(stop.deadline) })}
            </AppText>
            {stop.priority ? <Chip tone={PRIORITY_TONE[stop.priority]} label={t(`companyTrips.priority.${stop.priority}`)} /> : null}
          </View>
        ) : null}
        {eta ? (
          <View style={styles.line}>
            <Navigation color={colors.text3} size={16} strokeWidth={1.75} />
            <AppText color={colors.text2} style={styles.number}>
              {t('trips.routePlan.eta', { time: format.time(eta.eta), date: format.dayMonth(eta.eta) })}
            </AppText>
            {eta.deadlineStatus ? <Chip tone={DEADLINE_TONE[eta.deadlineStatus]} label={t(`common.deadlineStatuses.${eta.deadlineStatus}`)} /> : null}
          </View>
        ) : null}
        {missingCoordinates ? (
          <AppText variant="label" color={colors.warning}>
            {t('trips.routePlan.missingCoordinates')}
          </AppText>
        ) : null}
        {state ? <StateLine state={state} unloaded={unloaded} issues={issues} /> : null}
      </View>
    </View>
  )
}

/** Trạng thái giao của điểm: đã giao (giờ, xanh lá), đang giao (chấm xanh lam, số kiện đã dỡ), chưa giao; kèm số sự cố tại điểm. */
function StateLine({ state, unloaded, issues }: { state: StopState; unloaded: string | null; issues: string | null }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={styles.line}>
      {state.kind === 'current' ? <View style={styles.currentDot} /> : null}
      {state.kind === 'pending' ? <View style={styles.pendingDot} /> : null}
      {state.kind === 'done' ? (
        <AppText variant="label" color={palette.green[700]} style={styles.number}>
          {t('trips.route.state.done', { time: format.time(state.at) })}
        </AppText>
      ) : (
        <AppText variant={state.kind === 'current' ? 'label' : 'body'} color={state.kind === 'current' ? palette.azure[700] : colors.text3}>
          {t(`trips.route.state.${state.kind}`)}
        </AppText>
      )}
      {unloaded ? (
        <AppText color={colors.text2} style={styles.number}>
          {`· ${unloaded}`}
        </AppText>
      ) : null}
      {issues ? <Chip tone="warning" label={issues} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  body: { flex: 1, gap: space[1] },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  number: { fontVariant: ['tabular-nums'] },
  doneMark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: palette.green[500],
  },
  currentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.azure[500] },
  pendingDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: palette.neutral[500] },
})
