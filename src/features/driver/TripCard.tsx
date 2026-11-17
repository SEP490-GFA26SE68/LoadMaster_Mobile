import { useRouter } from 'expo-router'
import { CircleCheck, Clock, Ellipsis, Info, TriangleAlert, Truck } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { StopDot } from '@/components/StopDot'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, shadow, space } from '@/theme/tokens'

import { DepartButton } from './DepartButton'
import type { DriverTripRow } from './driver-model'
import { myTripGroup } from './my-trips'
import { EtaSourceLine, StopListTime } from './StopTimingParts'
import { useDriverCapabilities } from './useDriverQueries'

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

/**
 * Một chuyến ở "Chuyến của tôi" (như `MyTripCard` của web):
 * - Hàng đầu: mã chuyến, trạng thái chính, tiến độ xếp (sub-status) và menu tùy chọn (3 chấm).
 * - Thông tin rõ ràng dạng Field: Value (Ngày chạy, Số điểm dừng, Biển số xe tải).
 * - Các điểm dừng hiển thị rõ Địa chỉ điểm giao, Số lượng kiện, Thời gian dự kiến đến.
 * - Hàng nút thao tác được thiết kế nhỏ gọn, tinh tế và căn ở góc phải cuối thẻ.
 */
export function TripCard({ trip, primary = false }: { readonly trip: DriverTripRow; readonly primary?: boolean }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const preparing = myTripGroup(trip) === 'preparing'
  const upcoming = myTripGroup(trip) === 'upcoming' || trip.status === 'PLANNED'
  // Máy chủ: chuyến Đang xếp hàng xuất phát ngay ở thẻ — máy chủ không mở màn điểm giao trước khi xe chạy; nút bật khi kho đã xếp xong
  const departs = useDriverCapabilities().departFromList && trip.status === 'LOADING'

  const action = preparing
    ? t('driver.myTrips.preview')
    : trip.status === 'IN_TRANSIT'
      ? t('driver.myTrips.resume')
      : trip.status === 'DELIVERED'
        ? t('driver.myTrips.viewSummary')
        : t('driver.myTrips.open')

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <AppText variant="label" style={styles.code}>
            {trip.code}
          </AppText>
          <TripStatusChip status={trip.status} />
          {trip.sub === null ? null : <TripSubStatusTag sub={trip.sub} />}
          {trip.manualSub === null ? null : <TripSubStatusTag sub={trip.manualSub} />}
        </View>
        <TripActionMenu trip={trip} onOpenDetail={() => router.push(driverTripDetailPath(trip.id))} />
      </View>

      {trip.name === undefined ? null : <AppText variant="heading">{trip.name}</AppText>}

      {/* Thông tin chuyến: nhãn Field rõ ràng */}
      <View style={styles.factsContainer}>
        {trip.date !== undefined ? (
          <View style={styles.factRow}>
            <AppText color={colors.text3} variant="meta">
              {t('driver.myTrips.labels.plannedDate')}:{' '}
            </AppText>
            <AppText variant="label" color={colors.text}>
              {format.date(dayOf(trip.date))}
            </AppText>
          </View>
        ) : null}

        <View style={styles.factRow}>
          <AppText color={colors.text3} variant="meta">
            {t('driver.myTrips.labels.totalStops')}:{' '}
          </AppText>
          <AppText variant="label" color={colors.text}>
            {t('driver.myTrips.stops', { count: trip.stopCount })}
          </AppText>
          {trip.packageCount !== undefined ? (
            <>
              <AppText color={colors.text3} variant="meta">
                {' · '}{t('driver.myTrips.labels.totalPackages')}:{' '}
              </AppText>
              <AppText variant="label" color={colors.text}>
                {t('driver.myTrips.packages', { count: trip.packageCount })}
              </AppText>
            </>
          ) : null}
        </View>

        {trip.vehicleName !== '' ? (
          <View style={styles.factRow}>
            <AppText color={colors.text3} variant="meta">
              {t('driver.myTrips.labels.vehiclePlate')}:{' '}
            </AppText>
            <AppText variant="label" color={colors.text}>
              {trip.vehicleName}
            </AppText>
          </View>
        ) : null}
      </View>

      {trip.status === 'IN_TRANSIT' && trip.currentStop !== undefined ? (
        <AppText variant="label">{t('driver.myTrips.atStop', { number: trip.currentStop, total: trip.stopCount })}</AppText>
      ) : null}

      {trip.stops.length > 0 ? <TripStops trip={trip} /> : null}

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
        <AppText color={colors.text2}>
          {t('driver.myTrips.completedAt', { time: format.time(trip.completedAt), date: format.date(trip.completedAt) })}
          {trip.issueCount > 0 ? (
            <AppText variant="label" color={badgeTones.warning.fg}>
              {' · '}
              {t('driver.myTrips.issues', { count: trip.issueCount })}
            </AppText>
          ) : null}
        </AppText>
      ) : null}

      {/* Hàng nút thao tác nhỏ gọn ở góc phải cuối thẻ */}
      <View style={styles.footerActionRow}>
        {departs ? (
          <View style={styles.actionButtonsRow}>
            <Button
              variant="secondary"
              style={styles.compactBtn}
              onPress={() => router.push(driverTripDetailPath(trip.id))}>
              {t('driver.myTrips.viewDetail')}
            </Button>
            <DepartButton
              tripId={trip.id}
              tripCode={trip.code}
              primary={primary}
              blockedReason={preparing ? t('driver.myTrips.departNote') : undefined}
              href={tripPath(trip.id)}
              style={styles.compactBtn}
            />
          </View>
        ) : upcoming ? (
          <View style={styles.actionButtonsRow}>
            <Button
              variant={primary ? 'primary' : 'secondary'}
              style={styles.compactBtn}
              onPress={() => router.push(driverTripDetailPath(trip.id))}>
              {t('driver.myTrips.viewDetail')}
            </Button>
          </View>
        ) : (
          <View style={styles.actionButtonsRow}>
            <Button
              variant="secondary"
              style={styles.compactBtn}
              onPress={() => router.push(driverTripDetailPath(trip.id))}>
              {t('driver.myTrips.viewDetail')}
            </Button>
            <Button
              variant={primary ? 'primary' : 'secondary'}
              style={styles.compactBtn}
              accessibilityLabel={t('driver.myTrips.openLabel', { action, tripId: trip.code })}
              onPress={() => router.push(tripPath(trip.id))}>
              {action}
            </Button>
          </View>
        )}
      </View>
    </Card>
  )
}

/** Nút 3 chấm mở menu tùy chọn nhanh ở góc phải trên của thẻ */
function TripActionMenu({
  trip,
  onOpenDetail,
}: {
  readonly trip: DriverTripRow
  readonly onOpenDetail: () => void
}) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.menuAnchor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('driver.myTrips.actionsMenu')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.menuIconBtn, pressed && styles.menuIconBtnPressed]}
        hitSlop={8}>
        <Ellipsis color={colors.text2} size={20} />
      </Pressable>
      {open ? (
        <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <View style={styles.dropdownMenu}>
              <Pressable
                style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                onPress={() => {
                  setOpen(false)
                  onOpenDetail()
                }}>
                <Info size={18} color={colors.primary} />
                <AppText variant="label">{t('driver.myTrips.viewDetail')}</AppText>
              </Pressable>
              {trip.status === 'IN_TRANSIT' ? (
                <Pressable
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                  onPress={() => {
                    setOpen(false)
                    router.push(tripPath(trip.id))
                  }}>
                  <Truck size={18} color={colors.primary} />
                  <AppText variant="label">{t('driver.myTrips.resume')}</AppText>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  )
}

/**
 * Các điểm của chuyến trong thẻ:
 * Hiển thị rõ ràng Địa chỉ điểm giao, Số lượng kiện, Thời gian dự kiến đến (kèm trạng thái hạn).
 */
function TripStops({ trip }: { readonly trip: DriverTripRow }) {
  const t = useT()
  return (
    <View style={styles.stops} accessibilityLabel={t('driver.myTrips.stopsLabel', { tripId: trip.code })}>
      {trip.stops.map((stop) => {
        const amount =
          stop.kind === 'PICKUP'
            ? t('driver.stopKinds.PICKUP')
            : stop.packageCount === undefined
              ? undefined
              : t('driver.myTrips.packages', { count: stop.packageCount })
        const spoken = [
          t('common.stop', { number: stop.number }),
          stop.name,
          ...(amount === undefined ? [] : [amount]),
          ...(stop.done ? [t('driver.stopList.state.done')] : []),
        ].join(', ')
        return (
          <View key={stop.number} style={styles.stop}>
            <View style={styles.stopRow} accessible accessibilityLabel={spoken}>
              <StopDot number={stop.number} />
              <View style={styles.stopMain}>
                <View style={styles.stopLabelLine}>
                  <AppText color={colors.text3} variant="meta">
                    {t('driver.myTrips.labels.deliveryAddress')}:
                  </AppText>
                  {amount === undefined ? null : (
                    <View style={styles.stopAmountBadge}>
                      <AppText color={colors.text3} variant="meta">
                        {t('driver.myTrips.labels.packageQuantity')}:{' '}
                      </AppText>
                      <AppText variant="label" color={colors.text}>
                        {amount}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText variant="label" style={styles.stopName}>
                  {stop.name}
                </AppText>
              </View>
              {stop.done ? <CircleCheck color={badgeTones.success.fg} size={20} strokeWidth={1.5} /> : null}
            </View>
            {stop.timing === undefined ? null : (
              <View style={styles.stopTime}>
                <AppText color={colors.text3} variant="meta">
                  {t('driver.myTrips.labels.plannedArrival')}:{' '}
                </AppText>
                <StopListTime timing={stop.timing} />
              </View>
            )}
          </View>
        )
      })}
      <EtaSourceLine sources={trip.etaSources} mock={!trip.etaFromServer} />
    </View>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[4],
  },
  dropdownMenu: {
    minWidth: 220,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[2],
    gap: space[1],
    ...shadow.card,
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
  factsContainer: {
    gap: space[1],
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  stops: {
    gap: space[2],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  stop: {
    gap: space[1],
    paddingBottom: space[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  stopRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  stopMain: {
    flex: 1,
    gap: 2,
  },
  stopLabelLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[2],
  },
  stopName: {
    flex: 1,
    minWidth: 0,
  },
  stopAmountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Căn thẳng hàng với tên địa chỉ
  stopTime: {
    paddingLeft: 44,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerActionRow: {
    marginTop: space[2],
    alignItems: 'flex-end',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space[2],
    flexWrap: 'wrap',
  },
  compactBtn: {
    minHeight: 38,
    height: 38,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
})
