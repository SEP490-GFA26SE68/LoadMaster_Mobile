import { useRouter } from 'expo-router'
import { ArrowLeft, ScanLine, TrafficCone, TriangleAlert } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { StopDot } from '@/components/StopDot'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import { useCan } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { useT } from '@/lib/i18n'
import { stopColor } from '@/lib/stops'
import { colors, palette, radius, shadow, space } from '@/theme/tokens'

import type { StopScreen, TripHead } from './driver-model'
import { GpsToggle } from './GpsToggle'
import { ReportIssueSheet } from './ReportIssueSheet'
import { StopContactCard } from './StopContactCard'
import { footerStep, StopFooter } from './StopFooter'
import { DeliveryItemRow, PickupItemRow } from './StopItemRows'
import { StopList } from './StopList'
import { StopNotices } from './StopNotices'
import { StopProgress } from './StopProgress'
import { TripExceptionSheet } from './TripExceptionSheet'
import { useDriverCapabilities } from './useDriverQueries'
import { useStopActions } from './useStopActions'
import { useUnloadVerify } from './useUnloadVerify'

/** Một tờ mở theo lượt: `key` đổi mỗi lần mở để form trong tờ bắt đầu lại, giữ nguyên khi đóng để tờ mờ dần. */
type SheetTurn = { readonly open: boolean; readonly key: number }
const CLOSED: SheetTurn = { open: false, key: 0 }
const opened = (turn: SheetTurn): SheetTurn => ({ open: true, key: turn.key + 1 })
const closed = (turn: SheetTurn): SheetTurn => ({ ...turn, open: false })

/**
 * Màn tài xế tại điểm giao (như `DeliveryStopView` của web) — điện thoại, một tay, ngoài trời. Dải trời: lối về danh sách chuyến, số điểm có
 * màu điểm giao kèm số, chuông; dưới là dải tiến độ theo điểm (chỉ để nhìn). Vùng cuộn: thông báo, công tắc GPS thật, danh sách điểm (khi
 * chuyến có điểm nhận dọc đường), thẻ liên hệ kèm giờ đến và hạn giao, tiến độ dỡ, các nút phụ (đối chiếu kiện, báo sự cố, sự cố trên
 * đường), danh sách kiện. Chân màn: đúng một nút chính theo bước (`StopFooter`). Nút của việc mà nguồn dữ liệu chưa làm được thì không hiện.
 */
export function StopView({ trip, screen }: { trip: TripHead; screen: StopScreen }) {
  const t = useT()
  const router = useRouter()
  const can = useCan()
  const capabilities = useDriverCapabilities()
  const actions = useStopActions(trip.id, screen)
  const verify = useUnloadVerify(trip.id, screen)
  const [issue, setIssue] = useState(CLOSED)
  const [exception, setException] = useState(CLOSED)
  const { stop, mode, arrived, items, pickupItems } = screen
  const pickupStop = stop.kind === 'PICKUP'
  const delivering = mode === 'delivering'
  const canReportException = delivering && capabilities.tripExceptions && can('exceptions.report')
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
      actions={<NotificationBell />}
      below={<ProgressStrip screen={screen} />}
      scroll
      footer={footerShown ? <StopFooter screen={screen} actions={actions} capabilities={capabilities} verifyPending={verify.pending} /> : undefined}>
      <StopNotices screen={screen} />
      {delivering && capabilities.gps ? <GpsToggle tripId={trip.id} localOnly={capabilities.gpsLocalOnly} /> : null}
      {screen.hasPickupStops ? <StopList screen={screen} /> : null}
      <StopContactCard screen={screen} />
      <StopProgress screen={screen} />

      <View style={styles.actions}>
        {arrived && screen.verifiable > 0 ? (
          <Button variant="secondary" icon={ScanLine} onPress={() => verify.setOpen(true)}>
            {t(pickupStop ? 'driver.pickup.scanOpen' : 'driver.scan.open')}
          </Button>
        ) : null}
        {arrived && capabilities.deliveryIssues && items.length > 0 ? (
          <Button variant="secondary" icon={TriangleAlert} onPress={() => setIssue(opened)}>
            {t('driver.issue.report')}
          </Button>
        ) : null}
        {canReportException ? (
          <Button variant="secondary" icon={TrafficCone} onPress={() => setException(opened)}>
            {t('tripException.open')}
          </Button>
        ) : null}
      </View>

      {items.length > 0 ? (
        <View accessibilityLabel={t('driver.itemsTitle')} style={styles.list}>
          {items.map((item, index) => (
            <DeliveryItemRow key={item.id} item={item} last={index === items.length - 1} />
          ))}
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
          manualAllowed={capabilities.manualConfirm}
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
      {canReportException ? (
        <TripExceptionSheet
          key={`exception-${exception.key}`}
          open={exception.open}
          onClose={() => setException(closed)}
          tripId={trip.id}
          tripCode={trip.code}
          onReported={(id) => {
            setException(closed)
            actions.show({ tone: 'success', message: t('tripException.reported', { id }) })
          }}
        />
      ) : null}
    </Screen>
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
  actions: { gap: space[2] },
  list: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  empty: { padding: space[4] },
  section: { gap: space[2] },
  center: { textAlign: 'center' },
  strip: { flexDirection: 'row', gap: space[1] },
  segment: { flex: 1, height: 8, borderRadius: radius.pill },
})
