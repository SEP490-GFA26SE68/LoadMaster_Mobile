import { useRouter } from 'expo-router'
import {
  Calendar,
  CircleCheck,
  Clock,
  Ellipsis,
  Info,
  MapPin,
  Navigation,
  Package,
  Route,
  TriangleAlert,
  Truck,
  Weight,
  type LucideIcon,
} from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Dimensions, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, shadow, space, type BadgeTone } from '@/theme/tokens'

import type { DriverTripRow } from './driver-model'
import { myTripGroup } from './my-trips'
import { useDriverCapabilities, useStartDeliveryMutation } from './useDriverQueries'

/** Đường mở một chuyến ở màn điểm giao (hoặc tổng kết khi chuyến đã giao). */
export function tripPath(tripId: string) {
  return { pathname: '/trip/[tripId]', params: { tripId } } as const
}

/** Đường mở màn hình chi tiết chuyến của tài xế. */
export function driverTripDetailPath(tripId: string) {
  return { pathname: '/driver-trip/[tripId]', params: { tripId } } as const
}

/** Ngày chạy `YYYY-MM-DD` là ngày lịch; giờ xuất phát ISO giữ nguyên. */
function dayOf(value: string): Date | string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDate(value) : value
}

function formatDuration(seconds: number, t: ReturnType<typeof useT>): string {
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) {
    return t('driver.detail.minutes', { mins: totalMinutes })
  }
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return t('driver.detail.hoursAndMinutes', { hours, mins })
}

function cardAccentOf(trip: DriverTripRow): BadgeTone {
  if (trip.status === 'IN_TRANSIT') return 'azure'
  if (trip.status === 'DELIVERED') return 'success'
  if (trip.status === 'LOADING') return trip.sub?.kind === 'loaded' ? 'cyan' : 'warning'
  return 'neutral'
}

/**
 * Một chuyến ở "Chuyến của tôi" hoặc "Lịch sử giao hàng":
 * Bố cục 2 cột gọn gàng, nhấn màu các thông tin quan trọng:
 * - Cột trái: Ngày chạy theo kế hoạch, Tổng số điểm dừng, Biển số xe tải.
 * - Cột phải: Số lượng kiện, Tổng khối lượng kiện, Tổng quãng đường.
 * - Dải nhấn cuối thẻ: Thời gian dự kiến hoàn thành (hoặc Hoàn thành lúc với chuyến đã giao).
 */
export function TripCard({ trip }: { readonly trip: DriverTripRow; readonly primary?: boolean }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const compact = width < 520
  const preparing = myTripGroup(trip) === 'preparing'
  const upcoming = myTripGroup(trip) === 'upcoming' || trip.status === 'PLANNED'
  const departs = useDriverCapabilities().departFromList && trip.status === 'LOADING'
  const start = useStartDeliveryMutation(trip.id)
  const accent = badgeTones[cardAccentOf(trip)]

  const distanceText =
    trip.totalDistanceMeters !== undefined ? `${format.lengthValue(trip.totalDistanceMeters / 1000)} km` : undefined

  const durationText =
    trip.estimatedDurationSeconds !== undefined ? formatDuration(trip.estimatedDurationSeconds, t) : undefined

  const completionText =
    trip.estimatedCompletionTime !== undefined && durationText !== undefined
      ? `${format.time(trip.estimatedCompletionTime)} · ${format.date(trip.estimatedCompletionTime)} (${durationText})`
      : trip.estimatedCompletionTime !== undefined
        ? `${format.time(trip.estimatedCompletionTime)} · ${format.date(trip.estimatedCompletionTime)}`
        : durationText

  const hasRightMetrics =
    trip.packageCount !== undefined || trip.totalWeightKg !== undefined || distanceText !== undefined

  return (
    <Card style={[styles.card, { borderLeftColor: accent.fg }]}>
      {start.isError ? (
        <Banner tone="danger" onDismiss={() => start.reset()}>
          {dataErrorMessage(start.error, t)}
        </Banner>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headLeft}>
          <AppText variant="label" style={styles.code}>
            {trip.code}
          </AppText>
          <TripStatusChip status={trip.status} />
          {trip.sub === null ? null : <TripSubStatusTag sub={trip.sub} />}
          {trip.manualSub === null ? null : <TripSubStatusTag sub={trip.manualSub} />}
        </View>
        <TripActionMenu
          trip={trip}
          onOpenDetail={() => router.push(driverTripDetailPath(trip.id))}
          start={start}
        />
      </View>

      {trip.name === undefined ? null : <AppText variant="heading">{trip.name}</AppText>}

      {/* Bố cục 2 cột gọn: trái = lịch trình & xe, phải = 3 chỉ số kiện / khối lượng / quãng đường */}
      <View style={styles.columns}>
        <View style={styles.leftCol}>
          {trip.date !== undefined ? (
            <LeftFact
              icon={Calendar}
              iconColor={colors.primary}
              label={t('driver.myTrips.labels.plannedDate')}
              value={format.date(dayOf(trip.date))}
            />
          ) : null}

          <LeftFact
            icon={MapPin}
            iconColor={badgeTones.azure.fg}
            label={t('driver.myTrips.labels.totalStops')}
            value={t('driver.myTrips.stops', { count: trip.stopCount })}
            valueColor={badgeTones.azure.fg}
          />

          {trip.vehicleName !== '' ? (
            <View style={styles.leftFactRow}>
              <Truck size={15} color={badgeTones.cyan.fg} strokeWidth={1.75} style={styles.factIcon} />
              <View style={styles.leftFactText}>
                <AppText color={colors.text3} variant="meta">
                  {t('driver.myTrips.labels.vehiclePlate')}:{' '}
                </AppText>
                <View style={styles.platePill}>
                  <AppText variant="meta" color={badgeTones.cyan.fg} style={styles.plateText}>
                    {trip.vehicleName}
                  </AppText>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {hasRightMetrics ? (
          <View style={[styles.rightCol, compact && styles.rightColCompact]}>
            {trip.packageCount !== undefined ? (
              <RightMetric
                icon={Package}
                tone="cyan"
                compact={compact}
                label={t('driver.myTrips.labels.totalPackages')}
                value={t('driver.myTrips.packages', { count: trip.packageCount })}
              />
            ) : null}

            {trip.totalWeightKg !== undefined ? (
              <RightMetric
                icon={Weight}
                tone="warning"
                compact={compact}
                label={t('driver.myTrips.labels.totalWeight')}
                value={format.weight(trip.totalWeightKg)}
              />
            ) : null}

            {distanceText !== undefined ? (
              <RightMetric
                icon={Route}
                tone="success"
                compact={compact}
                label={t('driver.myTrips.labels.totalDistance')}
                value={distanceText}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {completionText !== undefined && trip.status !== 'DELIVERED' ? (
        <View style={[styles.highlightStrip, styles.azureStrip]}>
          <Clock color={badgeTones.azure.fg} size={16} strokeWidth={1.75} style={styles.stripIcon} />
          <View style={styles.stripText}>
            <AppText variant="meta" color={colors.text2}>
              {t('driver.myTrips.labels.estimatedCompletion')}:{' '}
            </AppText>
            <AppText variant="label" color={badgeTones.azure.fg} style={styles.tabularValue}>
              {completionText}
            </AppText>
          </View>
        </View>
      ) : null}

      {trip.status === 'IN_TRANSIT' && trip.currentStop !== undefined ? (
        <AppText variant="label" color={colors.primary}>
          {t('driver.myTrips.atStop', { number: trip.currentStop, total: trip.stopCount })}
        </AppText>
      ) : null}

      {trip.recheck > 0 ? (
        <View style={[styles.box, styles.danger]}>
          <TriangleAlert color={badgeTones.danger.fg} size={20} strokeWidth={1.5} style={styles.boxIcon} />
          <AppText variant="label" color={badgeTones.danger.fg} style={styles.boxText}>
            {t('driver.myTrips.recheck', { count: trip.recheck })}
          </AppText>
        </View>
      ) : null}

      {preparing ? (
        <View style={[styles.box, styles.neutral]}>
          <Clock color={colors.text2} size={20} strokeWidth={1.5} style={styles.boxIcon} />
          <AppText color={colors.text2} style={styles.boxText}>
            {t(departs ? 'driver.myTrips.departNote' : 'driver.myTrips.waitingLoading')}
          </AppText>
        </View>
      ) : null}

      {upcoming ? (
        <View style={[styles.box, styles.neutral]}>
          <Clock color={colors.text2} size={20} strokeWidth={1.5} style={styles.boxIcon} />
          <AppText color={colors.text2} style={styles.boxText}>
            {t('driver.myTrips.waitingLoading')}
          </AppText>
        </View>
      ) : null}

      {trip.status === 'DELIVERED' && trip.completedAt !== undefined ? (
        <View style={[styles.highlightStrip, styles.successStrip]}>
          <CircleCheck color={badgeTones.success.fg} size={16} strokeWidth={1.75} style={styles.stripIcon} />
          <AppText variant="meta" color={badgeTones.success.fg} style={styles.boxText}>
            {t('driver.myTrips.completedAt', { time: format.time(trip.completedAt), date: format.date(trip.completedAt) })}
            {trip.issueCount > 0 ? (
              <AppText variant="meta" color={badgeTones.warning.fg}>
                {' · '}
                {t('driver.myTrips.issues', { count: trip.issueCount })}
              </AppText>
            ) : null}
          </AppText>
        </View>
      ) : null}
    </Card>
  )
}

function LeftFact({
  icon: Icon,
  iconColor,
  label,
  value,
  valueColor = colors.text,
}: {
  readonly icon: LucideIcon
  readonly iconColor: string
  readonly label: string
  readonly value: string
  readonly valueColor?: string
}) {
  return (
    <View style={styles.leftFactRow}>
      <Icon size={15} color={iconColor} strokeWidth={1.75} style={styles.factIcon} />
      <View style={styles.leftFactText}>
        <AppText color={colors.text3} variant="meta">
          {label}:{' '}
        </AppText>
        <AppText variant="label" color={valueColor} style={styles.tabularValue}>
          {value}
        </AppText>
      </View>
    </View>
  )
}

function RightMetric({
  icon: Icon,
  tone,
  compact,
  label,
  value,
}: {
  readonly icon: LucideIcon
  readonly tone: BadgeTone
  readonly compact: boolean
  readonly label: string
  readonly value: string
}) {
  const paletteTone = badgeTones[tone]
  if (compact) {
    return (
      <View style={[styles.metricCompactBox, { backgroundColor: paletteTone.bg, borderColor: paletteTone.border }]}>
        <View style={styles.metricCompactHead}>
          <Icon size={13} color={paletteTone.fg} strokeWidth={1.75} style={styles.factIcon} />
          <AppText variant="meta" color={colors.text2} numberOfLines={1} style={styles.metricCompactLabel}>
            {label}
          </AppText>
        </View>
        <AppText variant="meta" color={paletteTone.fg} numberOfLines={1} style={styles.metricValue}>
          {value}
        </AppText>
      </View>
    )
  }
  return (
    <View style={[styles.metricRow, { backgroundColor: paletteTone.bg, borderColor: paletteTone.border }]}>
      <Icon size={14} color={paletteTone.fg} strokeWidth={1.75} style={styles.factIcon} />
      <AppText variant="meta" color={colors.text2} numberOfLines={1} style={styles.metricLabel}>
        {label}:
      </AppText>
      <AppText variant="meta" color={paletteTone.fg} style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  )
}

/** Nút 3 chấm mở menu tùy chọn nhanh ở góc phải trên của thẻ */
function TripActionMenu({
  trip,
  onOpenDetail,
  start,
}: {
  readonly trip: DriverTripRow
  readonly onOpenDetail: () => void
  readonly start: ReturnType<typeof useStartDeliveryMutation>
}) {
  const t = useT()
  const router = useRouter()
  const buttonRef = useRef<View>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 50, right: 16 })
  const preparing = myTripGroup(trip) === 'preparing'
  const departs = useDriverCapabilities().departFromList && trip.status === 'LOADING'

  function handleOpenMenu() {
    buttonRef.current?.measureInWindow?.((x, y, width, height) => {
      if (typeof y === 'number' && typeof height === 'number') {
        const win = Dimensions.get('window')
        const rawTop = y + height + 4
        const top = Math.min(Math.max(12, win.height - 200), Math.max(12, rawTop))
        const right = Math.max(12, win.width - (x + width))
        setCoords({ top, right })
      }
    })
    setOpen(true)
  }

  function handleDepart() {
    if (preparing || start.isPending) return
    setOpen(false)
    start.mutate(undefined, {
      onSuccess: () => router.push(tripPath(trip.id)),
    })
  }

  function handleResume() {
    setOpen(false)
    router.push(tripPath(trip.id))
  }

  return (
    <View style={styles.menuAnchor} ref={buttonRef}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('driver.myTrips.actionsMenu')}
        onPress={handleOpenMenu}
        style={({ pressed }) => [styles.menuIconBtn, pressed && styles.menuIconBtnPressed]}
        hitSlop={8}>
        <Ellipsis color={colors.text2} size={20} />
      </Pressable>
      {open ? (
        <Modal transparent animationType="none" visible={open} onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <View style={[styles.dropdownMenu, { top: coords.top, right: coords.right }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('driver.myTrips.viewDetail')}
                style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                onPress={() => {
                  setOpen(false)
                  onOpenDetail()
                }}>
                <Info size={18} color={colors.primary} />
                <AppText variant="label">{t('driver.myTrips.viewDetail')}</AppText>
              </Pressable>

              {departs ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.myTrips.openLabel', { action: t('driver.start'), tripId: trip.code })}
                  accessibilityHint={preparing ? t('driver.myTrips.departNote') : undefined}
                  accessibilityState={{ disabled: preparing || start.isPending }}
                  disabled={preparing || start.isPending}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    preparing && styles.dropdownItemDisabled,
                    pressed && !preparing && styles.dropdownItemPressed,
                  ]}
                  onPress={handleDepart}>
                  <Navigation size={18} color={preparing ? colors.textDisabled : colors.success} />
                  <View style={styles.dropdownTextCol}>
                    <AppText variant="label" color={preparing ? colors.textDisabled : colors.text}>
                      {t('driver.start')}
                    </AppText>
                    {preparing ? (
                      <AppText variant="meta" color={colors.text3}>
                        {t('driver.myTrips.departNote')}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              ) : null}

              {trip.status === 'IN_TRANSIT' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.myTrips.resume')}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                  onPress={handleResume}>
                  <Truck size={18} color={colors.primary} />
                  <AppText variant="label">{t('driver.myTrips.resume')}</AppText>
                </Pressable>
              ) : null}

              {trip.status === 'DELIVERED' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.myTrips.viewSummary')}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                  onPress={handleResume}>
                  <CircleCheck size={18} color={colors.primary} />
                  <AppText variant="label">{t('driver.myTrips.viewSummary')}</AppText>
                </Pressable>
              ) : null}

              {preparing && !departs ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.myTrips.preview')}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                  onPress={handleResume}>
                  <Info size={18} color={colors.primary} />
                  <AppText variant="label">{t('driver.myTrips.preview')}</AppText>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space[3],
    rowGap: space[2],
  },
  headLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  code: {
    fontVariant: ['tabular-nums'],
  },
  menuAnchor: {
    marginLeft: space[2],
  },
  menuIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIconBtnPressed: {
    backgroundColor: colors.lineSoft,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    minWidth: 220,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[2],
    gap: space[1],
    ...shadow.card,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.sm,
  },
  dropdownItemPressed: {
    backgroundColor: colors.surface,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownTextCol: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    gap: space[2],
  },
  leftFactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  factIcon: {
    marginTop: 3,
    flexShrink: 0,
  },
  leftFactText: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  platePill: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  plateText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rightCol: {
    minWidth: 185,
    flexShrink: 0,
    gap: space[1],
    alignItems: 'stretch',
  },
  rightColCompact: {
    minWidth: 0,
    width: 132,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingHorizontal: space[2],
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  metricCompactBox: {
    gap: 1,
    paddingHorizontal: space[2],
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  metricCompactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  metricCompactLabel: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    flexShrink: 1,
  },
  metricValue: {
    fontWeight: '700',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  tabularValue: {
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  highlightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  azureStrip: {
    backgroundColor: badgeTones.azure.bg,
    borderColor: badgeTones.azure.border,
  },
  successStrip: {
    backgroundColor: badgeTones.success.bg,
    borderColor: badgeTones.success.border,
  },
  stripIcon: {
    flexShrink: 0,
  },
  stripText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: badgeTones.danger.bg,
    borderColor: badgeTones.danger.border,
  },
  neutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  boxIcon: {
    marginTop: 2,
  },
  boxText: {
    flex: 1,
  },
})
