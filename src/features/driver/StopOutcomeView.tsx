import { ArrowLeft, CircleCheck, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { StopDot } from '@/components/StopDot'
import { useT } from '@/lib/i18n'
import { badgeTones, colors, radius, shadow, space } from '@/theme/tokens'

import type { StopOutcome, TripHead } from './driver-model'

type StopOutcomeViewProps = {
  trip: TripHead
  outcome: StopOutcome
  onBackToTrip: () => void
  onToTrips: () => void
}

/**
 * Màn xen giữa sau khi tài xế xác nhận hoàn tất một điểm: còn điểm phía sau thì nói đã giao xong điểm này và nút quay lại chuyến (điểm
 * kế tiếp); điểm cuối thì nói hoàn thành chuyến và nút về Chuyến của tôi. Có sự cố thì heading khác — kiện vẫn giao, bên gửi và bên nhận tự bàn.
 */
export function StopOutcomeView({ trip, outcome, onBackToTrip, onToTrips }: StopOutcomeViewProps) {
  const t = useT()
  const { tripCompleted, pickup, stopNumber, stopName, issues, next } = outcome
  const withIssues = issues > 0 || outcome.returned.length > 0
  const remainingCount = Math.max(0, outcome.stopCount - stopNumber)
  const heading = tripCompleted
    ? t('driver.stopOutcome.tripDoneHeading', { tripId: trip.code })
    : withIssues
      ? t(pickup ? 'driver.stopOutcome.headingPickupWithIssues' : 'driver.stopOutcome.headingWithIssues', { number: stopNumber })
      : t(pickup ? 'driver.stopOutcome.headingPickup' : 'driver.stopOutcome.heading', { number: stopNumber })
  const title = tripCompleted
    ? t('driver.stopOutcome.tripDoneTitle')
    : t(pickup ? 'driver.stopOutcome.titlePickup' : 'driver.stopOutcome.title', { number: stopNumber })
  const Icon = withIssues ? TriangleAlert : CircleCheck
  const iconColor = withIssues ? badgeTones.warning.fg : badgeTones.success.fg
  const continueLabel = next === undefined ? t('driver.stopOutcome.backToTrip') : t('driver.stopOutcome.continueNext', { number: next.number })

  return (
    <Screen
      title={title}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={tripCompleted ? t('driver.toTrips') : t('driver.stopOutcome.backToTrip')} onPress={tripCompleted ? onToTrips : onBackToTrip} />}
      scroll
      footer={
        tripCompleted ? (
          <Button onPress={onToTrips}>{t('driver.toTrips')}</Button>
        ) : (
          <Button write onPress={onBackToTrip}>
            {continueLabel}
          </Button>
        )
      }>
      <Card style={styles.hero}>
        <View style={[styles.iconWrap, withIssues ? styles.iconWarn : styles.iconOk]}>
          <Icon color={iconColor} size={40} strokeWidth={1.8} />
        </View>
        <AppText variant="heading" accessibilityRole="header" style={styles.center}>
          {heading}
        </AppText>
        <View style={styles.stopLine}>
          <StopDot number={stopNumber} />
          <AppText variant="label" style={styles.flex}>
            {stopName}
          </AppText>
        </View>
      </Card>

      <View style={styles.facts}>
        {outcome.delivered > 0 ? <Fact label={t('driver.stopOutcome.delivered', { count: outcome.delivered })} /> : null}
        {outcome.picked > 0 ? <Fact label={t('driver.stopOutcome.picked', { count: outcome.picked })} /> : null}
        {outcome.returned.length > 0 ? <Fact label={t('driver.stopOutcome.returned', { count: outcome.returned.length })} warn /> : null}
        {issues > 0 ? <Fact label={t('driver.stopOutcome.issues', { count: issues })} warn /> : null}
      </View>

      {outcome.returned.length === 0 ? null : (
        <View style={styles.returned}>
          {outcome.returned.map((item) => (
            <AppText key={item.id} style={styles.returnedItem}>
              <AppText variant="label" style={styles.code}>
                {item.label}
              </AppText>
              {` · ${item.name}`}
            </AppText>
          ))}
        </View>
      )}

      {tripCompleted ? (
        <Banner tone={withIssues ? 'warning' : 'success'}>{t('driver.stopOutcome.tripDoneDescription')}</Banner>
      ) : remainingCount > 0 ? (
        <Banner tone="info">{t('driver.stopOutcome.remaining', { count: remainingCount })}</Banner>
      ) : (
        <Banner tone="info">{t('driver.stopOutcome.remainingUnknown')}</Banner>
      )}
      {tripCompleted || next === undefined ? null : <AppText color={colors.text2}>{t('driver.stopOutcome.next', { number: next.number, name: next.name })}</AppText>}

      {withIssues ? <Banner tone="warning">{t('driver.stopOutcome.problemNote')}</Banner> : null}
    </Screen>
  )
}

function Fact({ label, warn = false }: { label: string; warn?: boolean }) {
  return (
    <View style={[styles.fact, warn && styles.factWarn]} accessible accessibilityLabel={label}>
      <AppText variant="label" color={warn ? badgeTones.warning.fg : colors.text}>
        {label}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space[3] },
  center: { textAlign: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconOk: { backgroundColor: badgeTones.success.bg, borderColor: badgeTones.success.border },
  iconWarn: { backgroundColor: badgeTones.warning.bg, borderColor: badgeTones.warning.border },
  stopLine: { flexDirection: 'row', alignItems: 'center', gap: space[3], alignSelf: 'stretch' },
  flex: { flex: 1 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  fact: { flexGrow: 1, flexBasis: '40%', padding: space[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  factWarn: { borderColor: badgeTones.warning.border, backgroundColor: badgeTones.warning.bg },
  returned: {
    gap: space[1],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg, borderWidth: 1,
    borderColor: badgeTones.warning.border,
    backgroundColor: badgeTones.warning.bg,
  },
  returnedItem: { paddingLeft: space[1] },
  code: { fontVariant: ['tabular-nums'] },
})
