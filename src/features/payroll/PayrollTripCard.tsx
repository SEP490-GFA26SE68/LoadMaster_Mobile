import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import { driverTripDetailPath } from '@/features/driver/TripCard'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import type { PayrollTripLine } from './payroll-model'

type PayrollTripCardProps = {
  readonly line: PayrollTripLine
}

/** Thẻ chi tiết thu nhập của một chuyến: mã chuyến, tỉ lệ chia (nếu chạy ghép), phân bổ kg/km và tiền từng phần. */
export function PayrollTripCard({ line }: PayrollTripCardProps) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const isShared = line.sharePercent < 100

  const allocatedKgText = format.weight(line.allocatedKg)
  const baseKgText = isShared ? ` ${t('payroll.trips.baseOf', { value: format.weight(line.baseKg) })}` : ''

  const allocatedKmText = t('payroll.trips.kmUnit', { value: format.lengthValue(line.allocatedKm) })
  const baseKmText = isShared
    ? ` ${t('payroll.trips.baseOf', { value: t('payroll.trips.kmUnit', { value: format.lengthValue(line.baseKm) }) })}`
    : ''

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('payroll.trips.openDetailHint', { code: line.tripCode })}
      onPress={() => router.push(driverTripDetailPath(line.tripId))}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.topRow}>
        <View style={styles.codeGroup}>
          <AppText variant="label" color={colors.text} numberOfLines={1} style={styles.code}>
            {line.tripCode}
          </AppText>
          {isShared ? (
            <Chip tone="azure" label={t('payroll.trips.shareBadge', { percent: format.lengthValue(line.sharePercent) })} />
          ) : null}
        </View>
        <View style={styles.amountGroup}>
          <AppText variant="label" color={colors.primary}>
            {format.currency(line.totalAmountVnd)}
          </AppText>
          <ChevronRight color={colors.text3} size={18} strokeWidth={1.75} />
        </View>
      </View>

      <View style={styles.detailList}>
        <DetailLine
          label={t('payroll.trips.allocatedKg')}
          metric={`${allocatedKgText}${baseKgText}`}
          amount={format.currency(line.kgAmountVnd)}
        />
        <DetailLine
          label={t('payroll.trips.allocatedKm')}
          metric={`${allocatedKmText}${baseKmText}`}
          amount={format.currency(line.kmAmountVnd)}
        />
        {line.handlingAmountVnd !== undefined && line.handlingAmountVnd > 0 ? (
          <DetailLine label={t('payroll.trips.handlingLabel')} amount={format.currency(line.handlingAmountVnd)} />
        ) : null}
        {line.commissionAmountVnd !== undefined && line.commissionAmountVnd > 0 ? (
          <DetailLine label={t('payroll.trips.commissionLabel')} amount={format.currency(line.commissionAmountVnd)} />
        ) : null}
      </View>
    </Pressable>
  )
}

function DetailLine({ label, metric, amount }: { readonly label: string; readonly metric?: string; readonly amount: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <AppText variant="meta" color={colors.text3}>
          {label}
        </AppText>
        {metric === undefined ? null : (
          <AppText variant="meta" color={colors.text2}>
            {metric}
          </AppText>
        )}
      </View>
      <AppText variant="meta" color={colors.text}>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  cardPressed: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  codeGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  code: {
    flexShrink: 1,
  },
  amountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  detailList: {
    gap: space[1],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  detailLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
})
