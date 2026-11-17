import {
  Building2,
  ChartColumn,
  Headset,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'
import type { Role } from '@/types/user'

export const ROLE_ICON: Readonly<Record<Role, LucideIcon>> = {
  systemAdmin: ShieldCheck,
  systemManager: SlidersHorizontal,
  systemSupporter: Headset,
  companyAdmin: Building2,
  companyManager: ChartColumn,
  dispatcher: Monitor,
  warehouse: Tablet,
  driver: Smartphone,
}

export type RoleBadgeProps = {
  role: Role
  size?: 'sm' | 'md'
}

/**
 * Nhãn vai trò (V2.3): nền slate/cyan nhẹ, bo góc, icon thiết bị/nhiệm vụ + tên vai trò.
 */
export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const t = useT()
  const Icon = ROLE_ICON[role] ?? Monitor
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <View style={[styles.badge, size === 'sm' && styles.badgeSm]}>
      <Icon size={iconSize} color={colors.text2} aria-hidden strokeWidth={1.8} />
      <AppText variant="meta" color={colors.text} style={styles.text} numberOfLines={1}>
        {t(`roles.${role}`)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 195, 212, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 195, 212, 0.25)',
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: space[1],
  },
  text: {
    fontWeight: '600',
  },
})
