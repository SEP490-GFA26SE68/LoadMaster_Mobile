import { Text, type TextProps } from 'react-native'

import { colors, type as scale, type TextVariant } from '@/theme/tokens'

export type AppTextProps = TextProps & {
  variant?: TextVariant
  color?: string
}

/** Chữ của app: cỡ và độ đậm lấy từ thang chữ, không đặt `fontSize` rời trong component. */
export function AppText({ variant = 'body', color = colors.text, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[scale[variant], { color }, style]} />
}
