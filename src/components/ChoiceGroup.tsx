import { useId } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

export type Choice<T extends string> = {
  readonly value: T
  readonly label: string
  /** Dòng phụ dưới nhãn (tên kiện, thứ tự dỡ…). */
  readonly description?: string
}

type ChoiceGroupProps<T extends string> = {
  label: string
  choices: readonly Choice<T>[]
  value: T | undefined
  onChange: (value: T) => void
  error?: string | undefined
  /** Hai cột cho nhãn ngắn (loại sự cố); một cột cho nhãn dài (kiện, loại sự cố trên đường). */
  columns?: 1 | 2
  /** Nhãn là mã (mã kiện): chữ số cùng bề rộng. */
  codeLabels?: boolean
}

/**
 * Nhóm chọn một (thay cho ô chọn và nút radio của web): mỗi lựa chọn là một ô cao tối thiểu 56, ô đang chọn có viền cyan đậm, nền nhạt
 * **và** vòng tròn có chấm — không chỉ dựa vào màu. Trình đọc màn hình đọc nhóm bằng nhãn, từng ô là `radio` kèm trạng thái chọn.
 */
export function ChoiceGroup<T extends string>({ label, choices, value, onChange, error, columns = 1, codeLabels = false }: ChoiceGroupProps<T>) {
  const labelId = useId()
  return (
    <View style={styles.group}>
      <AppText variant="label" color={colors.text2} nativeID={labelId}>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} accessibilityLabelledBy={labelId} style={[styles.options, columns === 2 && styles.twoColumns]}>
        {choices.map((choice) => {
          const selected = choice.value === value
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.description === undefined ? choice.label : `${choice.label}, ${choice.description}`}
              accessibilityState={{ checked: selected, selected }}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [styles.option, columns === 2 && styles.half, selected && styles.selected, pressed && !selected && styles.pressed]}>
              <View style={[styles.ring, selected && styles.ringSelected]}>{selected ? <View style={styles.mark} /> : null}</View>
              <View style={styles.text}>
                <AppText variant={codeLabels ? 'label' : 'body'} style={codeLabels ? styles.code : undefined}>
                  {choice.label}
                </AppText>
                {choice.description === undefined ? null : <AppText color={colors.text2}>{choice.description}</AppText>}
              </View>
            </Pressable>
          )
        })}
      </View>
      {error === undefined ? null : (
        <AppText color={colors.danger} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  options: { gap: space[2] },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bg,
  },
  // Hai ô một hàng, chừa khe 8 ở giữa
  half: { flexBasis: '48%', flexGrow: 1 },
  selected: { borderColor: colors.focus, borderWidth: 2, backgroundColor: colors.primaryBg },
  pressed: { backgroundColor: colors.surface },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  ringSelected: { borderColor: colors.primary },
  mark: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  text: { flex: 1, minWidth: 0 },
  code: { fontVariant: ['tabular-nums'] },
})
