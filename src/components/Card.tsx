import { StyleSheet, View, type ViewProps } from 'react-native'

import { colors, radius, shadow, space } from '@/theme/tokens'

/** Thẻ nền trắng, viền 1 px, bóng rất nhẹ; các phần bên trong cách nhau 12. Không nâng thẻ khi nhấn. */
export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />
}

const styles = StyleSheet.create({
  card: { gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
})
