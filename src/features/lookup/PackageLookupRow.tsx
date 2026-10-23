import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import type { PackageLookup } from './lookup-api'
import { PackageFlagTag, PackageStatusChip } from './package-look'

/**
 * Một kiện trong danh sách kiện trùng mã của bên gửi (như `PackageLookupList` của web): mã của kho, chuyến, điểm đến, trạng thái và cờ
 * — đủ để chọn đúng kiện. Cả dòng là một nút cao từ 56; tên đọc được mở đầu bằng "Xem kiện <mã>" rồi các mục trên dòng.
 */
export function PackageLookupRow({ item, onPress }: { item: PackageLookup; onPress: () => void }) {
  const t = useT()
  const { package: pkg, trip } = item
  const spoken = [
    t('lookup.many.choose', { id: pkg.id }),
    ...(trip === undefined ? [] : [trip.id]),
    ...(pkg.destination === '' ? [] : [pkg.destination]),
    t(`common.packageStatuses.${pkg.status}`),
    ...pkg.flags.map((flag) => t(`common.packageFlags.${flag}`)),
  ].join(', ')

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={spoken} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.body}>
        <View style={styles.line}>
          <AppText variant="label" style={styles.code}>
            {pkg.id}
          </AppText>
          {trip === undefined ? null : (
            <AppText color={colors.text2} style={styles.code}>
              {trip.id}
            </AppText>
          )}
        </View>
        {pkg.destination === '' ? null : <AppText>{pkg.destination}</AppText>}
        <View style={styles.chips}>
          <PackageStatusChip status={pkg.status} />
          {pkg.flags.map((flag) => (
            <PackageFlagTag key={flag} flag={flag} />
          ))}
        </View>
      </View>
      <ChevronRight color={colors.text3} size={20} strokeWidth={1.5} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  pressed: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  body: { flex: 1, gap: space[1] },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
})
