import { ChevronRight, Clock, TrafficCone } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, palette, radius, space } from '@/theme/tokens'

import type { DriverTripException, SheetView } from './driver-model'

function statusTone(status: DriverTripException['status']) {
  if (status === 'RESOLVED') return 'success' as const
  if (status === 'ESCALATED') return 'danger' as const
  return 'warning' as const
}

/**
 * Thẻ tóm tắt ngay trên màn điểm giao khi chuyến đã có sự cố trên đường:
 * hiển thị số lượng, sự cố mới nhất và cho phép bấm để mở danh sách chi tiết.
 */
export function TripExceptionsBanner({
  exceptions,
  onOpen,
}: {
  readonly exceptions: readonly DriverTripException[]
  readonly onOpen: () => void
}) {
  const t = useT()
  const latest = exceptions[0]
  if (latest === undefined) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('tripException.history.bannerTitle', { count: exceptions.length })}
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      onPress={onOpen}>
      <View style={styles.bannerTop}>
        <View style={styles.bannerTitleRow}>
          <TrafficCone size={18} color={badgeTones.warning.fg} strokeWidth={2} />
          <AppText variant="label" color={badgeTones.warning.fg} style={styles.flex}>
            {t('tripException.history.bannerTitle', { count: exceptions.length })}
          </AppText>
        </View>
        <View style={styles.bannerLinkRow}>
          <AppText variant="meta" color={colors.primary}>
            {t('tripException.history.viewAll')}
          </AppText>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </View>
      <View style={styles.bannerPreview}>
        <AppText variant="meta" color={colors.text2} numberOfLines={1} style={styles.flex}>
          {`${t(`common.tripExceptionTypes.${latest.type}`)} · ${t('tripException.history.delayMinutes', { minutes: latest.delayMinutes })}`}
        </AppText>
        <Chip tone={statusTone(latest.status)} label={t(`tripException.history.status.${latest.status}`)} />
      </View>
    </Pressable>
  )
}

/**
 * Nội dung tờ "Xem sự cố trên đường đã báo":
 * hiển thị toàn bộ danh sách sự cố của chuyến kèm loại, thời gian báo, số phút chậm, mô tả, trạng thái và ghi chú xử lý.
 */
export function useTripExceptionHistoryView({
  tripCode,
  exceptions,
  loading,
  canReport,
  onClose,
  onReportNew,
}: {
  readonly tripCode: string
  readonly exceptions: readonly DriverTripException[]
  readonly loading: boolean
  readonly canReport: boolean
  readonly onClose: () => void
  readonly onReportNew: () => void
}): SheetView {
  const t = useT()
  const format = useFormat()

  return {
    title: t('tripException.history.title', { id: tripCode }),
    description: t('tripException.history.description'),
    busy: false,
    footer: (
      <>
        <Button variant="secondary" style={styles.flex} onPress={onClose}>
          {t('tripException.history.close')}
        </Button>
        {canReport ? (
          <Button write style={styles.flex} onPress={onReportNew}>
            {t('tripException.history.reportNew')}
          </Button>
        ) : null}
      </>
    ),
    body: loading ? (
      <AppText color={colors.text2}>{t('tripException.history.loading')}</AppText>
    ) : exceptions.length === 0 ? (
      <View style={styles.emptyBox}>
        <TrafficCone size={24} color={colors.text3} />
        <AppText color={colors.text2} style={styles.emptyText}>
          {t('tripException.history.empty')}
        </AppText>
      </View>
    ) : (
      <View style={styles.list}>
        {exceptions.map((item) => {
          const reportedLabel = item.reportedAt
            ? `${format.time(item.reportedAt)} · ${format.date(item.reportedAt)}`
            : undefined
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHead}>
                <AppText variant="label" style={styles.flex}>
                  {`${item.id} · ${t(`common.tripExceptionTypes.${item.type}`)}`}
                </AppText>
                <Chip tone={statusTone(item.status)} label={t(`tripException.history.status.${item.status}`)} />
              </View>

              <View style={styles.metaChips}>
                <Chip
                  tone="warning"
                  label={t('tripException.history.delayMinutes', { minutes: item.delayMinutes })}
                />
                {item.stopNumber !== undefined ? (
                  <Chip tone="neutral" label={t('tripException.history.atStop', { number: item.stopNumber })} />
                ) : null}
              </View>

              {item.description ? (
                <AppText color={colors.text}>{item.description}</AppText>
              ) : null}

              {reportedLabel ? (
                <View style={styles.timeRow}>
                  <Clock size={14} color={colors.text3} />
                  <AppText variant="meta" color={colors.text3}>
                    {t('tripException.history.reportedAt', { time: reportedLabel })}
                  </AppText>
                </View>
              ) : null}

              {item.resolutionNote ? (
                <View style={styles.resolutionBox}>
                  <AppText variant="meta" color={badgeTones.success.fg}>
                    {t('tripException.history.resolutionNote', { note: item.resolutionNote })}
                  </AppText>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    backgroundColor: badgeTones.warning.bg,
    borderWidth: 1,
    borderColor: palette.amber[200],
    borderLeftWidth: 4,
    borderLeftColor: palette.amber[500],
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
  },
  bannerPressed: {
    opacity: 0.9,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  bannerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  bannerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bannerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[5],
    gap: space[2],
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    gap: space[3],
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  resolutionBox: {
    backgroundColor: badgeTones.success.bg,
    borderRadius: radius.sm,
    padding: space[2],
  },
})
