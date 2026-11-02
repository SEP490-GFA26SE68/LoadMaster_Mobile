import { Check } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { badgeTones, colors, radius, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

export type FilterChip<T extends string> = {
  readonly value: T
  readonly label: string
  /** Số đếm cạnh nhãn (số chuyến của tab); vắng thì không có số. */
  readonly count?: number
  /** Số "cần bạn xử lý" vẽ nền hổ phách (như `TabCount tone="warn"` của web); chữ của số vẫn nói đủ, không chỉ dựa vào màu. */
  readonly warnCount?: number
  /** Câu đọc thay cho số hổ phách ("2 cần bạn xử lý"); vắng thì trình đọc màn hình chỉ nghe con số. */
  readonly warnLabel?: string
}

type FilterChipsProps<T extends string> = {
  /** Tên của cả hàng cho trình đọc màn hình ("Trạng thái chuyến", "Bộ lọc"). */
  label: string
  chips: readonly FilterChip<T>[]
  /**
   * Một giá trị: hàng tab chọn một (tab trạng thái) — ô là `tab`, ô đang chọn `selected`. Mảng: các công tắc lọc bật tắt độc lập — ô là
   * `checkbox`, ô đang bật `checked`.
   */
  selected: T | readonly T[]
  onPress: (value: T) => void
  /** Số theo ngôn ngữ đang chọn (`format.integer`). */
  formatCount: (count: number) => string
}

/**
 * Hàng chip lọc cuộn ngang (thay hàng tab và công tắc lọc của web trên điện thoại): mỗi ô cao tối thiểu 56, dạng viên thuốc. Ô đang chọn
 * có viền cyan đậm, nền nhạt **và** dấu kiểm — không chỉ dựa vào màu. Số đếm viết theo ngôn ngữ đang chọn, đọc cùng nhãn.
 */
export function FilterChips<T extends string>({ label, chips, selected, onPress, formatCount }: FilterChipsProps<T>) {
  const single = !Array.isArray(selected)
  const isOn = (value: T) => (Array.isArray(selected) ? selected.includes(value) : selected === value)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={single ? 'tablist' : undefined}
      accessibilityLabel={label}
      contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const on = isOn(chip.value)
        const counts = [
          ...(chip.count === undefined ? [] : [formatCount(chip.count)]),
          ...(chip.warnCount === undefined ? [] : [chip.warnLabel ?? formatCount(chip.warnCount)]),
        ]
        return (
          <Pressable
            key={chip.value}
            accessibilityRole={single ? 'tab' : 'checkbox'}
            accessibilityState={single ? { selected: on } : { checked: on }}
            accessibilityLabel={counts.length === 0 ? chip.label : `${chip.label} ${counts.join(' ')}`}
            onPress={() => onPress(chip.value)}
            style={({ pressed }) => [styles.chip, on && styles.on, pressed && styles.pressed]}>
            {on ? <Check color={colors.primary} size={16} strokeWidth={2} /> : null}
            <AppText variant="label" color={on ? colors.primary : colors.text2}>
              {chip.label}
            </AppText>
            {chip.count === undefined ? null : (
              <AppText variant="meta" color={on ? colors.primary : colors.text3}>
                {formatCount(chip.count)}
              </AppText>
            )}
            {chip.warnCount === undefined ? null : (
              <View style={styles.warn}>
                <AppText variant="meta" color={badgeTones.warning.fg}>
                  {formatCount(chip.warnCount)}
                </AppText>
              </View>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: space[1] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: TOUCH,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  on: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryBg },
  pressed: { backgroundColor: colors.surface },
  warn: { paddingHorizontal: space[2], borderRadius: radius.pill, backgroundColor: badgeTones.warning.bg },
})
