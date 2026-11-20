import { useRouter } from 'expo-router'
import { ArrowLeft, FileText, ListOrdered, ScanLine, TriangleAlert } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { StopDot } from '@/components/StopDot'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { useT } from '@/lib/i18n'
import { stopColor } from '@/lib/stops'
import { badgeTones, colors, palette, radius, shadow, space } from '@/theme/tokens'

import type { StopScreen, TripHead } from './driver-model'
import { DriverNavigation } from './DriverNavigation'
import { GpsToggle } from './GpsToggle'
import { ReportIssueSheet } from './ReportIssueSheet'
import { StopContactCard } from './StopContactCard'
import { footerStep, StopFooter } from './StopFooter'
import { DeliveryItemRow, PickupItemRow } from './StopItemRows'
import { StopList } from './StopList'
import { StopMoreActions } from './StopMoreActions'
import { StopNotices } from './StopNotices'
import { StopProgress } from './StopProgress'
import { driverTripDetailPath } from './TripCard'
import { TripExceptionsBanner } from './TripExceptionHistorySheet'
import { useDeviceLocation } from './useDeviceLocation'
import { useDriverCapabilities, useTripExceptionsQuery } from './useDriverQueries'
import { useStopActions } from './useStopActions'
import { useUnloadVerify } from './useUnloadVerify'

/** Một tờ mở theo lượt: `key` đổi mỗi lần mở để form trong tờ bắt đầu lại, giữ nguyên khi đóng để tờ mờ dần. */
type SheetTurn = { readonly open: boolean; readonly key: number }
const CLOSED: SheetTurn = { open: false, key: 0 }
const opened = (turn: SheetTurn): SheetTurn => ({ open: true, key: turn.key + 1 })
const closed = (turn: SheetTurn): SheetTurn => ({ ...turn, open: false })

/**
 * Màn tài xế tại điểm giao (như `DeliveryStopView` của web) — điện thoại, một tay, ngoài trời.
 */
export function StopView({ trip, screen }: { trip: TripHead; screen: StopScreen }) {
  const t = useT()
  const router = useRouter()
  const capabilities = useDriverCapabilities()
  const gps = useDeviceLocation(trip.id)
  const actions = useStopActions(trip.id, screen)
  const verify = useUnloadVerify(trip.id, screen)
  const [issue, setIssue] = useState(CLOSED)
  const [historySignal, setHistorySignal] = useState(0)
  const { stop, mode, arrived, items, pickupItems } = screen
  const pickupStop = stop.kind === 'PICKUP'
  const delivering = mode === 'delivering'
  const exceptionsQuery = useTripExceptionsQuery(trip.id, delivering && capabilities.tripExceptions)
  const exceptions = exceptionsQuery.data ?? []
  const nextItemId = items.find((entry) => !entry.unloaded && entry.issueKind === undefined)?.id
  // Không có nút chính và không có câu báo (xem trước): không vẽ chân màn trống
  const footerShown = footerStep(screen, capabilities) !== null || actions.flash !== null

  return (
    <Screen
      title={t('driver.stopTitle', { number: stop.number, total: screen.stopCount })}
      leading={
        <View style={styles.leading}>
          <IconButton icon={ArrowLeft} tone="sky" label={t('driver.toTrips')} onPress={() => router.dismissTo('/trips')} />
          <StopDot number={stop.number} size="lg" />
        </View>
      }
      actions={
        <View style={styles.headActions}>
          <IconButton
            icon={FileText}
            tone="sky"
            label={t('driver.myTrips.viewDetail')}
            onPress={() => router.push(driverTripDetailPath(trip.id))}
          />
          <NotificationBell />
        </View>
      }
      below={<ProgressStrip screen={screen} />}
      scroll
      footer={footerShown ? <StopFooter screen={screen} actions={actions} capabilities={capabilities} verifyPending={verify.pending} /> : undefined}>
      <StopNotices screen={screen} />
      {delivering && exceptions.length > 0 ? (
        <TripExceptionsBanner exceptions={exceptions} onOpen={() => setHistorySignal((n) => n + 1)} />
      ) : null}
      {delivering && capabilities.gps ? (
        <GpsToggle localOnly={capabilities.gpsLocalOnly} enabled={gps.enabled} state={gps.state} toggle={gps.toggle} />
      ) : null}
      {screen.hasPickupStops ? <StopList screen={screen} /> : null}
      <DriverNavigation screen={screen} vehicle={gps.enabled ? gps.latest ?? undefined : undefined} />
      <StopContactCard screen={screen} />
      <StopProgress screen={screen} />

      <View style={styles.actions}>
        {arrived && screen.verifiable > 0 ? (
          <Button write variant="secondary" icon={ScanLine} onPress={() => verify.setOpen(true)}>
            {t(pickupStop ? 'driver.pickup.scanOpen' : 'driver.scan.open')}
          </Button>
        ) : null}
        {arrived && capabilities.deliveryIssues && items.length > 0 ? (
          <Button write variant="secondary" icon={TriangleAlert} onPress={() => setIssue(opened)}>
            {t('driver.issue.report')}
          </Button>
        ) : null}
        <StopMoreActions
          trip={trip}
          delivering={delivering}
          exceptions={exceptions}
          exceptionsLoading={exceptionsQuery.isLoading}
          openHistorySignal={historySignal}
          onExceptionReported={(id) => actions.show({ tone: 'success', message: t('tripException.reported', { id }) })}
        />
      </View>

      {items.length > 0 ? (
        <View style={styles.section}>
          <UnloadingRuleCallout />
          <View accessibilityLabel={t('driver.itemsTitle')} style={styles.list}>
            {items.map((item, index) => (
              <DeliveryItemRow key={item.id} item={item} last={index === items.length - 1} isNext={item.id === nextItemId} />
            ))}
          </View>
        </View>
      ) : pickupItems.length === 0 ? (
        <View style={[styles.list, styles.empty]}>
          <AppText color={colors.text2}>{t('driver.noItems')}</AppText>
        </View>
      ) : null}

      {pickupItems.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            {t('driver.pickup.listTitle')}
          </AppText>
          <AppText color={colors.text2}>{t('driver.pickup.listHint')}</AppText>
          <View style={styles.list}>
            {pickupItems.map((item, index) => (
              <PickupItemRow key={item.id} item={item} last={index === pickupItems.length - 1} />
            ))}
          </View>
        </View>
      ) : null}

      {arrived ? (
        <AppText color={colors.text3} style={styles.center}>
          {screen.remaining > 0
            ? t(pickupStop ? 'driver.pickup.remaining' : 'driver.remaining', { count: screen.remaining })
            : t(pickupStop ? 'driver.pickup.allHandled' : 'driver.allHandled')}
        </AppText>
      ) : null}

      {arrived ? (
        <PackageVerifySheet
          verify={verify}
          title={t(pickupStop ? 'driver.pickup.scanTitle' : 'driver.scan.title', { number: stop.number })}
          description={t(pickupStop ? 'driver.pickup.scanDescription' : 'driver.scan.description', {
            number: stop.number,
            done: screen.doneCount,
            total: screen.total,
          })}
          manualAllowed={capabilities.manualConfirm && (!pickupStop || capabilities.pickupManualConfirm)}
        />
      ) : null}
      <ReportIssueSheet
        key={`issue-${issue.key}`}
        open={issue.open}
        onClose={() => setIssue(closed)}
        stopNumber={stop.number}
        items={items}
        pending={actions.reporting}
        onSubmit={actions.reportIssue}
      />
    </Screen>
  )
}

/** Khối nhấn mạnh quy tắc dỡ hàng bắt buộc (LIFO) đặt ngay trên danh sách kiện cần dỡ. */
function UnloadingRuleCallout() {
  const t = useT()
  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <ListOrdered size={20} color={palette.amber[700]} strokeWidth={2.2} />
        <AppText variant="heading" color={palette.amber[700]} style={styles.ruleTitle}>
          {t('driver.unloadingRule.title')}
        </AppText>
      </View>
      <AppText variant="label" color={colors.text} style={styles.ruleBody}>
        {t('driver.unloadingRule.rule')}
      </AppText>
      <AppText variant="meta" color={palette.amber[700]} style={styles.ruleNote}>
        {t('driver.unloadingRule.note')}
      </AppText>
    </View>
  )
}

/** Dải tiến độ theo điểm trong dải trời: điểm đã xong cyan, điểm hiện tại màu của điểm, điểm chưa tới mờ. Chữ "Điểm n / N" nói đủ. */
function ProgressStrip({ screen }: { screen: StopScreen }) {
  return (
    <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {screen.stops.map(({ number, done }) => (
        <View
          key={number}
          style={[styles.segment, { backgroundColor: done ? palette.cyan[300] : number === screen.stop.number ? stopColor(number) : colors.skyTrack }]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  leading: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  actions: { gap: space[2] },
  list: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  empty: { padding: space[4] },
  section: { gap: space[2] },
  center: { textAlign: 'center' },
  strip: { flexDirection: 'row', gap: space[1] },
  segment: { flex: 1, height: 8, borderRadius: radius.pill },
  ruleCard: {
    backgroundColor: badgeTones.warning.bg,
    borderWidth: 1.5,
    borderColor: palette.amber[500],
    borderLeftWidth: 5,
    borderLeftColor: palette.amber[700],
    borderRadius: radius.md,
    padding: space[3],
    gap: space[1],
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  ruleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  ruleBody: {
    fontWeight: '700',
  },
  ruleNote: {
    fontWeight: '600',
    marginTop: 2,
  },
})
