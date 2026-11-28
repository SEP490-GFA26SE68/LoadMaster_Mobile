import { useRouter } from 'expo-router'
import { ChevronRight, Weight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { driverTripDetailPath } from '@/features/driver/TripCard'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import type { PayrollTripLine } from './payroll-model'

type PayrollTripCardProps = {
  readonly line: PayrollTripLine
}

/** Thẻ chi tiết thu nhập của một chuyến: ô khối lượng (tiền theo kg) và các khoản thêm của chuyến. Lương không còn tính theo km. */
export function PayrollTripCard({ line }: PayrollTripCardProps) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('payroll.trips.openDetailHint', { code: line.tripCode })}
      onPress={() => router.push(driverTripDetailPath(line.tripId))}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: badgeTones.cyan.fg },
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.topRow}>
        <View style={styles.codeGroup}>
          <AppText variant="label" color={colors.text} numberOfLines={1} style={styles.code}>
            {line.tripCode}
          </AppText>
        </View>
        <View style={styles.amountGroup}>
          <View style={styles.amountPill}>
            <AppText variant="meta" color={badgeTones.success.fg} style={styles.amountText}>
              {format.currency(line.totalAmountVnd)}
            </AppText>
          </View>
          <ChevronRight color={colors.text3} size={18} strokeWidth={1.75} />
        </View>
      </View>

      <View style={styles.tilesRow}>
        <View style={[styles.metricTile, styles.warningTile]}>
          <View style={styles.tileHead}>
            <Weight color={badgeTones.warning.fg} size={14} strokeWidth={1.75} style={styles.noShrink} />
            <AppText variant="meta" color={colors.text2} numberOfLines={2} style={styles.tileLabel}>
              {t('payroll.trips.allocatedKg')}
            </AppText>
          </View>
          <AppText variant="meta" color={colors.text3} numberOfLines={1}>
            {format.weight(line.allocatedKg)}
          </AppText>
          <AppText variant="label" color={badgeTones.warning.fg} numberOfLines={1} adjustsFontSizeToFit style={styles.tabular}>
            {format.currency(line.kgAmountVnd)}
          </AppText>
        </View>

      </View>

      {(line.handlingAmountVnd !== undefined && line.handlingAmountVnd > 0) ||
      (line.commissionAmountVnd !== undefined && line.commissionAmountVnd > 0) ? (
        <View style={styles.extrasList}>
          {line.handlingAmountVnd !== undefined && line.handlingAmountVnd > 0 ? (
            <ExtraLine label={t('payroll.trips.handlingLabel')} amount={format.currency(line.handlingAmountVnd)} />
          ) : null}
          {line.commissionAmountVnd !== undefined && line.commissionAmountVnd > 0 ? (
            <ExtraLine label={t('payroll.trips.commissionLabel')} amount={format.currency(line.commissionAmountVnd)} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
}

function ExtraLine({ label, amount }: { readonly label: string; readonly amount: string }) {
  return (
    <View style={styles.extraRow}>
      <AppText variant="meta" color={colors.text3}>
        {label}
      </AppText>
      <AppText variant="meta" color={colors.primary} style={styles.tabular}>
        {amount}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  cardPressed: {
    backgroundColor: colors.primaryBg,
    borderColor: badgeTones.cyan.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  codeGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  code: {
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  amountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: space[1],
  },
  amountPill: {
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: badgeTones.success.bg,
    borderWidth: 1,
    borderColor: badgeTones.success.border,
  },
  amountText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tilesRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  metricTile: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    padding: space[2],
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  warningTile: {
    backgroundColor: badgeTones.warning.bg,
    borderColor: badgeTones.warning.border,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  noShrink: {
    flexShrink: 0,
    marginTop: 2,
  },
  tileLabel: {
    flex: 1,
    minWidth: 0,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  extrasList: {
    gap: space[1],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
})
