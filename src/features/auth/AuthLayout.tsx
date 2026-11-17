import { Boxes, Gauge, Layers } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg'

import { AppText } from '@/components/AppText'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Logo } from '@/components/Logo'
import { useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '@/theme/tokens'

/** Nền dải trời công nghệ LoadMaster (Cyan kính V2.3) */
function SkyBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#02222d" />
            <Stop offset="45%" stopColor="#042a37" />
            <Stop offset="100%" stopColor="#053341" />
          </LinearGradient>

          <RadialGradient id="glowLeft" cx="15%" cy="8%" r="45%">
            <Stop offset="0%" stopColor="#00c3d4" stopOpacity="0.25" />
            <Stop offset="60%" stopColor="#00c3d4" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#00c3d4" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="glowRight" cx="85%" cy="15%" r="40%">
            <Stop offset="0%" stopColor="#008a9d" stopOpacity="0.25" />
            <Stop offset="65%" stopColor="#008a9d" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#008a9d" stopOpacity="0" />
          </RadialGradient>

          <Pattern id="skyDots" width="24" height="24" patternUnits="userSpaceOnUse">
            <Circle cx="12" cy="12" r="1.1" fill="rgba(155, 237, 242, 0.10)" />
          </Pattern>
        </Defs>

        {/* Nền gradient sâu */}
        <Rect width="100%" height="100%" fill="url(#skyGrad)" />
        {/* Điểm sáng quang phổ cyan */}
        <Rect width="100%" height="100%" fill="url(#glowLeft)" />
        <Rect width="100%" height="100%" fill="url(#glowRight)" />
        {/* Lưới điểm sàn kho */}
        <Rect width="100%" height="100%" fill="url(#skyDots)" />
      </Svg>
    </View>
  )
}

/** Khung của màn đăng nhập và Đặt lại mật khẩu (đồng bộ nhận diện Web V2.3) */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useT()
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.root}>
      <SkyBackground />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top, space[4]) + space[2],
              paddingBottom: Math.max(insets.bottom, space[4]) + space[6],
            },
          ]}>
          <View style={styles.column}>
            {/* Header nhận diện thương hiệu */}
            <View style={styles.head}>
              <Logo tone="dark" size="md" tagline />
              <LanguageSwitch tone="sky" />
            </View>

            {/* Nội dung chính (AuthCard) */}
            {children}

            {/* Ba giá trị cốt lõi LoadMaster (đồng bộ Web V2.3) */}
            <View style={styles.showcase}>
              <View style={styles.showcaseItem}>
                <View style={styles.showcaseIcon}>
                  <Gauge size={16} color="#00c3d4" strokeWidth={2} />
                </View>
                <AppText variant="meta" color="rgba(255, 255, 255, 0.85)" style={styles.showcaseText}>
                  {t('auth.showcase.fillRate')}
                </AppText>
              </View>

              <View style={styles.showcaseItem}>
                <View style={styles.showcaseIcon}>
                  <Layers size={16} color="#00c3d4" strokeWidth={2} />
                </View>
                <AppText variant="meta" color="rgba(255, 255, 255, 0.85)" style={styles.showcaseText}>
                  {t('auth.showcase.reverseOrder')}
                </AppText>
              </View>

              <View style={styles.showcaseItem}>
                <View style={styles.showcaseIcon}>
                  <Boxes size={16} color="#00c3d4" strokeWidth={2} />
                </View>
                <AppText variant="meta" color="rgba(255, 255, 255, 0.85)" style={styles.showcaseText}>
                  {t('auth.showcase.sharedPlan')}
                </AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

export type AuthCardProps = {
  title?: string
  headerSlot?: ReactNode
  children: ReactNode
}

/** Thẻ trắng chứa form; hỗ trợ headerSlot tuỳ biến hoặc title mặc định */
export function AuthCard({ title, headerSlot, children }: AuthCardProps) {
  return (
    <View style={styles.card}>
      {headerSlot !== undefined ? (
        headerSlot
      ) : title !== undefined ? (
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#02222d',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: space[5],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[1],
  },
  card: {
    gap: space[5],
    padding: space[5],
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(0, 195, 212, 0.18)',
    ...shadow.card,
  },
  showcase: {
    gap: space[2],
    paddingHorizontal: space[2],
    marginTop: space[1],
  },
  showcaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: space[1],
  },
  showcaseIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 195, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseText: {
    fontWeight: '500',
    flex: 1,
  },
})
