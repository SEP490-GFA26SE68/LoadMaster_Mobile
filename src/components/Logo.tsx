import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'

export const BRAND_TAGLINE = 'Plan smarter. Load further.'

export const LOGO_MARK_VIEWBOX = '178 188 900 900'

export const LOGO_MARK_PATHS = [
  'M628 219 837.9 340 628 461 418.1 340Z',
  'M222 447.1 279.9 414 408 488 408 733 660 878 660 1020 596 1057 222 841Z',
  'M633 613 968 420 1034 458 1034 813 940 867 940 614.9 774 711 774 989.1 766 993.7 766 835 633 758Z',
] as const

export type LogoTone = 'color' | 'dark' | 'mono'

const COLORS: Readonly<Record<LogoTone, readonly [string, string, string]>> = {
  color: ['#00c3d4', '#008a9d', '#02222d'],
  dark: ['#00c3d4', '#008a9d', '#ffffff'],
  mono: ['#ffffff', '#ffffff', '#ffffff'],
}

const TEXT_COLORS: Readonly<Record<LogoTone, { load: string; master: string; tagline: string }>> = {
  color: { load: '#02222d', master: '#008a9d', tagline: '#4a5568' },
  dark: { load: '#ffffff', master: '#00c3d4', tagline: 'rgba(255, 255, 255, 0.7)' },
  mono: { load: '#ffffff', master: '#ffffff', tagline: 'rgba(255, 255, 255, 0.8)' },
}

export function LogoMark({
  tone = 'color',
  size = 32,
}: {
  tone?: LogoTone
  size?: number
}) {
  const [top, left, right] = COLORS[tone]
  return (
    <Svg
      width={size}
      height={size}
      viewBox={LOGO_MARK_VIEWBOX}
      strokeLinejoin="round"
      strokeWidth={52}
      accessibilityRole="image"
      aria-hidden
    >
      <Path d={LOGO_MARK_PATHS[0]} fill={top} stroke={top} />
      <Path d={LOGO_MARK_PATHS[1]} fill={left} stroke={left} />
      <Path d={LOGO_MARK_PATHS[2]} fill={right} stroke={right} />
    </Svg>
  )
}

export type LogoProps = {
  tone?: LogoTone
  size?: 'sm' | 'md' | 'lg'
  tagline?: boolean
  lockup?: 'horizontal' | 'stacked'
  style?: StyleProp<ViewStyle>
}

const SIZES = {
  sm: { mark: 28, title: 18, tagline: 11, gap: 8 },
  md: { mark: 36, title: 22, tagline: 12, gap: 10 },
  lg: { mark: 48, title: 28, tagline: 14, gap: 12 },
} as const

export function Logo({
  tone = 'color',
  size = 'md',
  tagline = false,
  lockup = 'horizontal',
  style,
}: LogoProps) {
  const config = SIZES[size]
  const textCols = TEXT_COLORS[tone]
  const isStacked = lockup === 'stacked'

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="LoadMaster"
      style={[
        styles.container,
        isStacked ? styles.stacked : styles.horizontal,
        { gap: config.gap },
        style,
      ]}
    >
      <LogoMark tone={tone} size={config.mark} />
      <View style={[styles.textGroup, isStacked && styles.textCenter]}>
        <Text style={[styles.title, { fontSize: config.title }]}>
          <Text style={{ color: textCols.load }}>Load</Text>
          <Text style={{ color: textCols.master }}>Master</Text>
        </Text>
        {tagline && (
          <Text style={[styles.tagline, { fontSize: config.tagline, color: textCols.tagline }]}>
            {BRAND_TAGLINE}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
  },
  stacked: {
    flexDirection: 'column',
  },
  textGroup: {
    justifyContent: 'center',
  },
  textCenter: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontWeight: '500',
    marginTop: 1,
  },
})

export default Logo
