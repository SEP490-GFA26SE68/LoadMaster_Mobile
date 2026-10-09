import { Pressable, StyleSheet, View } from 'react-native'

import { LOCALE_NAMES, LOCALES, useLocale, useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

/** Hai nút "VI" · "EN" cao 56. `tone="sky"` cho nền dải trời (nền đặc, không kính). */
export function LanguageSwitch({ tone = 'light' }: { tone?: 'light' | 'sky' }) {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const sky = tone === 'sky'
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('language.label')} style={styles.group}>
      {LOCALES.map((code) => {
        const selected = code === locale
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={LOCALE_NAMES[code]}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => setLocale(code)}
            style={[styles.option, sky ? styles.optionSky : styles.optionLight, selected && (sky ? styles.selectedSky : styles.selectedLight)]}>
            <AppText variant="label" color={sky ? colors.skyText : selected ? colors.primary : colors.text2}>
              {code.toUpperCase()}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: space[2] },
  option: { minWidth: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[3], borderRadius: radius.md, borderWidth: 1 },
  optionLight: { backgroundColor: colors.bg, borderColor: colors.border },
  optionSky: { backgroundColor: colors.skySolid, borderColor: colors.skySolidBorder },
  selectedLight: { backgroundColor: colors.primaryBg, borderColor: colors.focus, borderWidth: 2 },
  selectedSky: { backgroundColor: colors.skySolidPressed, borderColor: colors.skyFocus, borderWidth: 2 },
})
