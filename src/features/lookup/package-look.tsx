import { Gem, Package, Snowflake, TriangleAlert, Wine, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import type { HandlingClass } from '@/domain/models'
import { useT } from '@/lib/i18n'
import type { PackageFlag, PackageStatus } from '@/lib/mock-db'
import { badgeTones, radius, space, type BadgeTone } from '@/theme/tokens'

/**
 * Màu kể trạng thái của kiện, như bản web: xám đã nhập · cyan đã gán chuyến, đã soạn · xanh lam đã xếp, đang vận chuyển · xanh lá đã
 * giao · hổ phách hoàn trả.
 */
const STATUS_TONE: Record<PackageStatus, BadgeTone> = {
  IMPORTED: 'neutral',
  ASSIGNED: 'cyan',
  STAGED: 'cyan',
  LOADED: 'azure',
  IN_TRANSIT: 'azure',
  DELIVERED: 'success',
  RETURNED: 'warning',
}

/** Chip trạng thái của kiện trong kho kiện. Màu luôn đi kèm chữ. */
export function PackageStatusChip({ status }: { status: PackageStatus }) {
  const t = useT()
  return <Chip tone={STATUS_TONE[status]} label={t(`common.packageStatuses.${status}`)} />
}

/** Cờ của kiện: nhãn hổ phách có viền — kiện mang cờ chưa vào yêu cầu giao hay chuyến được. */
export function PackageFlagTag({ flag }: { flag: PackageFlag }) {
  const t = useT()
  return (
    <View style={styles.flag}>
      <AppText variant="meta" color={badgeTones.warning.fg}>
        {t(`common.packageFlags.${flag}`)}
      </AppText>
    </View>
  )
}

/** Loại hàng nhận ra bằng icon và chữ, như bản web: hàng thường xám, bốn loại cần chú ý hổ phách. */
const HANDLING: Record<HandlingClass, { readonly icon: LucideIcon; readonly tone: BadgeTone }> = {
  STANDARD: { icon: Package, tone: 'neutral' },
  FRAGILE: { icon: Wine, tone: 'warning' },
  REFRIGERATED: { icon: Snowflake, tone: 'warning' },
  HAZARDOUS: { icon: TriangleAlert, tone: 'warning' },
  HIGH_VALUE: { icon: Gem, tone: 'warning' },
}

export function HandlingClassChip({ handlingClass }: { handlingClass: HandlingClass }) {
  const t = useT()
  const { icon: Icon, tone } = HANDLING[handlingClass]
  const { bg, fg } = badgeTones[tone]
  return (
    <View style={[styles.handling, { backgroundColor: bg }]}>
      <Icon color={fg} size={20} strokeWidth={1.5} />
      <AppText variant="meta" color={fg}>
        {t(`common.handlingClasses.${handlingClass}`)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  flag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: badgeTones.warning.fg,
    backgroundColor: badgeTones.warning.bg,
  },
  // Cao bằng chip trạng thái (28): icon 20 thay chấm màu
  handling: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start', paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.pill },
})
