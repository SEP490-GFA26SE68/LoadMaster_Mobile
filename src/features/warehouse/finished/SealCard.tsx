import { Lock } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import type { LoadingProgress } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

type SealCardProps = {
  /** Số seal đã ghi (`trip.loading.seal`); vắng là chưa ghi. */
  readonly seal: LoadingProgress['seal']
  /** Chuyến còn ở kho: còn ghi / đổi được. */
  readonly editable: boolean
  /** Câu lỗi của lần ghi khi tờ nhập đã đóng (xe vừa rời kho). */
  readonly failure: string | null
  /** Mở tờ nhập để đổi số seal đã ghi. */
  readonly onChange: () => void
}

/**
 * Niêm phong thùng ở màn Xếp xong (như `SealCard` của web; luồng 5 Review 1): số seal không bắt buộc. Đã ghi thì thẻ nói số và giờ ghi —
 * còn ở kho thì đổi được, xe đã rời kho thì chỉ đọc; chưa ghi mà còn ở kho thì thẻ nói chưa ghi và vì sao nên ghi (nút "Ghi số seal" là nút
 * chính ở chân màn); xe đã rời kho mà chưa ghi thì một câu nói chuyến không ghi số seal. Số seal nhập trong tờ `SealSheet`.
 */
export function SealCard({ seal, editable, failure, onChange }: SealCardProps) {
  const t = useT()
  const format = useFormat()
  return (
    <Card>
      <View style={styles.title}>
        <Lock color={colors.primary} size={20} strokeWidth={1.5} />
        <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
          {t('warehouse.seal.title')}
        </AppText>
      </View>
      {seal !== undefined ? (
        // Đọc ngay khi vừa ghi xong: tờ nhập đóng lại, câu này là kết quả của lần ghi (app không có toast)
        <AppText variant="label" accessibilityLiveRegion="polite" style={styles.code}>
          {t('warehouse.seal.recorded', { number: seal.number, time: format.time(seal.at) })}
        </AppText>
      ) : editable ? (
        <>
          <AppText variant="label">{t('warehouse.list.noSeal')}</AppText>
          <AppText color={colors.text2}>{t('warehouse.seal.description')}</AppText>
        </>
      ) : (
        <AppText color={colors.text2}>{t('warehouse.seal.none')}</AppText>
      )}
      {seal === undefined ? null : editable ? (
        <Button variant="secondary" onPress={onChange}>
          {t('warehouse.seal.change')}
        </Button>
      ) : (
        <AppText color={colors.text3}>{t('warehouse.seal.locked')}</AppText>
      )}
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Card>
  )
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
  code: { fontVariant: ['tabular-nums'] },
})
