import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { StopDot } from '@/components/StopDot'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

type DamagedSheetProps = {
  readonly open: boolean
  /** Kiện của bước đang hỏi. */
  readonly placement: Pick<ScenePlacement, 'id' | 'name' | 'stop'>
  /** Số kiện tựa lên nó **trong phương án** (trừ kiện cũng đã bị bỏ lại kho). */
  readonly resting: number
  readonly pending: boolean
  /** Câu lỗi của lần ghi vừa rồi; tờ ở lại để thử lại. */
  readonly failure: string | null
  readonly onClose: () => void
  readonly onConfirm: (id: string) => void
}

/**
 * Tờ hỏi lại "Kiện hỏng" ở bước xếp (như `DamagedPackageDialog` của web): ghi hỏng là ghi thật — kiện về kho kiện kèm cờ "Hư hỏng",
 * không lên xe — nên hỏi lại trước và nói trước hệ quả. `resting` bằng 0 thì kho bỏ kiện và xếp tiếp; lớn hơn 0 thì chuyến quay về Đã
 * lập kế hoạch, phải dỡ ra và xếp lại theo phương án mới. Kho từ chối thì câu lỗi hiện ngay trong tờ (web nói bằng toast).
 */
export function DamagedSheet({ open, placement, resting, pending, failure, onClose, onConfirm }: DamagedSheetProps) {
  const t = useT()
  const stop = t('common.stop', { number: placement.stop })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={pending}
      title={t('warehouse.damaged.title', { id: placement.id })}
      description={resting > 0 ? t('warehouse.damaged.withSupport', { count: resting }) : t('warehouse.damaged.noSupport')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
            {t('warehouse.damaged.cancel')}
          </Button>
          <Button style={styles.flex} loading={pending} onPress={() => onConfirm(placement.id)}>
            {t('warehouse.damaged.confirm')}
          </Button>
        </>
      }>
      <View style={styles.item}>
        <AppText variant="label" style={styles.code}>
          {placement.id}
        </AppText>
        <AppText color={colors.text2}>{placement.name}</AppText>
        <View accessible accessibilityLabel={stop} style={styles.stop}>
          <StopDot number={placement.stop} />
          <AppText variant="label">{stop}</AppText>
        </View>
      </View>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { gap: space[1] },
  code: { fontVariant: ['tabular-nums'] },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
})
