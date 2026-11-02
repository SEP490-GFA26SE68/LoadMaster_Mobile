import { CircleCheck, CircleX } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import type { PickupRuleResult } from '@/domain/pickup'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { ruleText } from './pickup-rule-text'

/**
 * Mười luật nhận hàng dọc đường Đạt / Không đạt (như `PickupRulesList` của web): mỗi dòng có icon, số và tên luật, chip "Đạt" / "Không
 * đạt" bằng chữ — không chỉ màu — và câu lý do dựng từ mã + tham số của kho (`ruleText`). Trình đọc màn hình đọc cả dòng một lần.
 */
export function PickupRulesList({ results, stopLabel }: {
  results: readonly PickupRuleResult[]
  /** Nhãn của một điểm theo mã điểm của chuyến, cho câu của luật 2 (`stopLabeler`). */
  stopLabel: (stopId: string) => string
}) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={styles.list} accessibilityLabel={t('pickups.rules.title')}>
      {results.map((result, index) => {
        const name = `${format.integer(result.rule)}. ${t(`pickups.rules.names.${result.rule}`)}`
        const verdict = t(result.passed ? 'pickups.rules.pass' : 'pickups.rules.fail')
        const reason = ruleText(result, { t, format, stopLabel })
        const Icon = result.passed ? CircleCheck : CircleX
        return (
          <View key={result.rule} style={[styles.row, index > 0 && styles.divider]} accessible accessibilityLabel={`${name}, ${verdict}. ${reason}`}>
            <Icon color={result.passed ? colors.success : colors.danger} size={20} strokeWidth={1.5} style={styles.icon} />
            <View style={styles.body}>
              <AppText variant="label">{name}</AppText>
              <Chip tone={result.passed ? 'success' : 'danger'} label={verdict} />
              <AppText color={colors.text2}>{reason}</AppText>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  icon: { marginTop: 2 },
  body: { flex: 1, minWidth: 0, gap: space[1] },
})
