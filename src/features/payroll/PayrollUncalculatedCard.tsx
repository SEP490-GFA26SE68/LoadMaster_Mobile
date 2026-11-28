import { CalendarOff } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

type PayrollUncalculatedCardProps = {
  readonly periodLabel: string
  readonly description: string
  readonly onPrevious: () => void
  /** Dòng thêm giữa câu giải thích và nút (lương cứng đã biết của nhân viên kho). */
  readonly children?: ReactNode
}

/** Thẻ "Chưa có phiếu lương" của kỳ chưa tính (hoặc chưa chốt): chip Chưa tính, câu giải thích, nút "Xem tháng trước". */
export function PayrollUncalculatedCard({ periodLabel, description, onPrevious, children }: PayrollUncalculatedCardProps) {
  const t = useT()
  return (
    <Card style={styles.card}>
      <View style={styles.icon}>
        <CalendarOff color={colors.text3} size={28} strokeWidth={1.5} />
      </View>
      <Chip tone="neutral" label={t('payroll.status.UNCALCULATED')} />
      <AppText variant="heading" accessibilityRole="header" style={styles.centered}>
        {t('payroll.uncalculated.title', { period: periodLabel })}
      </AppText>
      <AppText variant="body" color={colors.text2} style={styles.centered}>
        {description}
      </AppText>
      {children}
      <Button variant="secondary" onPress={onPrevious} style={styles.action}>
        {t('payroll.uncalculated.viewPrevious')}
      </Button>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: space[6],
    gap: space[3],
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: space[2],
    alignSelf: 'stretch',
  },
})
