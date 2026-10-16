import { CircleCheck, Package, TriangleAlert, Undo2, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, space } from '@/theme/tokens'

import type { StopItem, StopPickupItem } from './driver-model'

/**
 * Một dòng kiện cần dỡ, cao tối thiểu 80 (như `DeliveryItemRow` của web). Thứ tự dỡ lấy từ phương án đã duyệt. Dòng chỉ **hiện** trạng
 * thái — kiện được ghi "đã dỡ" qua tờ đối chiếu, không có nút đánh dấu tay. Trạng thái không chỉ nằm ở màu: kiện đã dỡ có nền xanh nhạt và
 * dòng "Đã dỡ" kèm dấu kiểm và cách đối chiếu; kiện có sự cố có nền vàng nhạt và dòng nêu loại sự cố; kiện khách từ chối thêm dòng "Hoàn
 * trả". Xác nhận tay bị điều phối viên từ chối thì kiện quay về chưa dỡ kèm lý do để tài xế kiểm lại.
 */
export function DeliveryItemRow({ item, last }: { item: StopItem; last: boolean }) {
  const t = useT()
  const format = useFormat()
  const issue = item.issueKind
  return (
    <View style={[styles.row, last && styles.last, item.unloaded ? styles.done : issue !== undefined ? styles.issue : null]}>
      <View style={styles.head}>
        <AppText variant="label" style={styles.code}>
          {item.label}
        </AppText>
        <AppText color={colors.text3} style={styles.code}>
          {t('driver.item.order', { order: item.unloadingOrder })}
        </AppText>
      </View>
      <AppText color={colors.text2}>{item.weightKg === undefined ? item.name : `${item.name} · ${format.weight(item.weightKg)}`}</AppText>
      {item.place === undefined ? null : (
        <Line icon={Package} color={colors.text3}>
          {t('driver.item.where', { area: t(`driver.item.area.${item.place.area}`), layer: t(`driver.item.layer.${item.place.layer}`) })}
        </Line>
      )}
      {item.unloaded ? (
        <Line icon={CircleCheck} color={badgeTones.success.fg} strong>
          {item.via === undefined ? t('driver.item.done') : t(`driver.scan.via.${item.via}`)}
        </Line>
      ) : null}
      {item.rejectedReason === undefined ? null : <Rejected reason={item.rejectedReason} />}
      {issue === undefined ? null : (
        <Line icon={TriangleAlert} color={badgeTones.warning.fg} strong>
          {t('driver.item.issue', { kind: t(`common.deliveryIssueKinds.${issue}`) })}
        </Line>
      )}
      {item.returned ? (
        <Line icon={Undo2} color={badgeTones.warning.fg} strong>
          {t('driver.item.returned')}
        </Line>
      ) : null}
    </View>
  )
}

/**
 * Một dòng kiện nhận dọc đường (như `PickupItemRow` của web): không có thứ tự dỡ, vùng hay lớp. Điểm nhận: "Chưa nhận" / "Đã nhận"; điểm
 * giao: "Chưa dỡ" / "Đã dỡ", kèm cách đối chiếu gần nhất. Xác nhận tay bị từ chối thì kiện quay về chưa xong kèm lý do.
 */
export function PickupItemRow({ item, last }: { item: StopPickupItem; last: boolean }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={[styles.row, last && styles.last, item.done && styles.done]}>
      <AppText variant="label" style={styles.code}>
        {item.id}
      </AppText>
      <AppText color={colors.text2}>{`${item.name} · ${format.weight(item.weightKg)}`}</AppText>
      <Line icon={Package} color={colors.text3}>
        {t('driver.pickup.request', { id: item.requestId })}
      </Line>
      {item.done ? (
        <Line icon={CircleCheck} color={badgeTones.success.fg} strong>
          {item.via === undefined ? t(`driver.pickup.${item.role}.done`) : `${t(`driver.pickup.${item.role}.done`)} · ${t(`driver.pickup.via.${item.via}`)}`}
        </Line>
      ) : (
        <AppText variant="label" color={colors.text2}>
          {t(`driver.pickup.${item.role}.waiting`)}
        </AppText>
      )}
      {item.rejectedReason === undefined ? null : <Rejected reason={item.rejectedReason} />}
    </View>
  )
}

/** Lý do điều phối viên từ chối xác nhận tay: đọc ngay khi xuất hiện. */
function Rejected({ reason }: { reason: string }) {
  const t = useT()
  return (
    <View accessibilityRole="alert">
      <Line icon={TriangleAlert} color={colors.danger} strong>
        {t('driver.confirms.rejected', { reason })}
      </Line>
    </View>
  )
}

function Line({ icon: Icon, color, strong = false, children }: { icon: LucideIcon; color: string; strong?: boolean; children: string }) {
  return (
    <View style={styles.line}>
      <Icon color={color} size={16} strokeWidth={1.5} style={styles.icon} />
      <AppText variant={strong ? 'label' : 'body'} color={color} style={styles.flex}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: 80, justifyContent: 'center', gap: space[1], paddingVertical: space[3], paddingHorizontal: space[4], borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: colors.bg },
  last: { borderBottomWidth: 0 },
  done: { backgroundColor: badgeTones.success.bg },
  issue: { backgroundColor: badgeTones.warning.bg },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { marginTop: 4 },
  flex: { flex: 1 },
})
