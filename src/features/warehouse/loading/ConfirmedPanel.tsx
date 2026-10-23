import { Check, Hourglass } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import type { Confirmed } from './useLoadingSession'

/**
 * Thẻ "Đã xếp" sau khi tờ đối chiếu ghi xong một kiện (như `ConfirmedOverlay` của web): dấu xanh, mã kiện vừa xếp và bước kế tiếp — kiện
 * cuối thì báo đang hoàn tất xếp hàng, hoặc nói còn chờ điều phối viên duyệt xác nhận tay (kho chưa cho xong xếp). Hiện thay thẻ hướng
 * dẫn tối thiểu 1,2 giây, các nút của bước khoá trong lúc đó. Ghi bằng xác nhận tay thì kèm dải hổ phách nói kiện chờ duyệt (web nói bằng
 * toast). Trình đọc màn hình đọc ngay khi thẻ hiện.
 */
export function ConfirmedPanel({ confirmed, pendingConfirms }: { confirmed: Confirmed; pendingConfirms: number }) {
  const t = useT()
  const format = useFormat()
  const awaitingApproval = confirmed.manual || pendingConfirms > 0
  const next =
    confirmed.nextStep !== undefined
      ? t('warehouse.nextStep', { step: format.integer(confirmed.nextStep) })
      : awaitingApproval
        ? t('warehouse.confirms.overlayWaiting')
        : t('warehouse.finishing')
  return (
    <Card accessibilityLiveRegion="assertive" style={styles.card}>
      <View style={styles.mark}>
        <Check color={colors.bg} size={24} strokeWidth={1.5} />
      </View>
      <AppText variant="display" accessibilityRole="header" style={styles.center}>
        {t('warehouse.confirmed', { id: confirmed.id })}
      </AppText>
      <AppText variant="heading" color={colors.text2} style={styles.center}>
        {next}
      </AppText>
      {confirmed.manual ? (
        <View style={styles.banner}>
          <Banner tone="warning" icon={Hourglass}>
            {`${t('warehouse.scan.manualRecorded', { id: confirmed.id })}\n${t('warehouse.scan.manualRecordedDescription')}`}
          </Banner>
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: space[8] },
  mark: { width: TOUCH, height: TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  center: { textAlign: 'center' },
  banner: { alignSelf: 'stretch' },
})
