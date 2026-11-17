import { CircleCheck, Package, TriangleAlert, Undo2, type LucideIcon } from 'lucide-react-native'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, palette, radius, space } from '@/theme/tokens'

import type { StopItem, StopPickupItem } from './driver-model'

function handlingChipInfo(handlingClass: string | undefined, fragile: boolean | undefined, t: ReturnType<typeof useT>) {
  const effective = handlingClass === 'STANDARD' && fragile ? 'FRAGILE' : handlingClass || (fragile ? 'FRAGILE' : 'STANDARD')
  switch (effective) {
    case 'FRAGILE':
      return { label: t('driver.detail.handling.FRAGILE'), tone: 'danger' as const }
    case 'REFRIGERATED':
      return { label: t('driver.detail.handling.REFRIGERATED'), tone: 'cyan' as const }
    case 'HAZARDOUS':
      return { label: t('driver.detail.handling.HAZARDOUS'), tone: 'danger' as const }
    case 'HIGH_VALUE':
      return { label: t('driver.detail.handling.HIGH_VALUE'), tone: 'warning' as const }
    default:
      return { label: t('driver.detail.handling.STANDARD'), tone: 'neutral' as const }
  }
}

/**
 * Một dòng kiện cần dỡ, cao tối thiểu 80 (như `DeliveryItemRow` của web), đầy đủ thông tin như màn Chi tiết chuyến đi:
 * tên kiện, mã kiện, thứ tự dỡ nổi bật (highlight kiện cần dỡ tiếp theo theo quy tắc LIFO), phân loại hàng hóa,
 * kích thước, khối lượng, loại thùng, ghi chú, vị trí trên thùng xe và trạng thái đối chiếu / sự cố.
 */
export const DeliveryItemRow = memo(function DeliveryItemRow({
  item,
  last,
  isNext = false,
}: {
  item: StopItem
  last: boolean
  /** Kiện cần dỡ kế tiếp theo đúng thứ tự LIFO. */
  isNext?: boolean
}) {
  const t = useT()
  const format = useFormat()
  const issue = item.issueKind
  const handling = handlingChipInfo(item.handlingClass, item.fragile, t)
  const extraFragile = item.fragile && item.handlingClass && item.handlingClass !== 'FRAGILE' && item.handlingClass !== 'STANDARD'
  const dims =
    item.lengthCm !== undefined && item.widthCm !== undefined && item.heightCm !== undefined
      ? `${Math.round(item.lengthCm)} × ${Math.round(item.widthCm)} × ${Math.round(item.heightCm)} cm`
      : undefined
  const showType = item.packageTypeName && item.packageTypeName !== item.name

  return (
    <View
      style={[
        styles.row,
        last && styles.last,
        item.unloaded ? styles.done : issue !== undefined ? styles.issue : isNext ? styles.nextRow : null,
      ]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <AppText variant="label" style={styles.flexShrink}>
            {item.name}
          </AppText>
        </View>
        <View style={styles.orderGroup}>
          {isNext && !item.unloaded && issue === undefined ? (
            <Chip tone="warning" label={t('driver.item.next')} />
          ) : null}
          <View style={[styles.orderPill, isNext && !item.unloaded ? styles.orderPillNext : null]}>
            <AppText
              variant="label"
              color={isNext && !item.unloaded ? palette.amber[700] : colors.primary}
              style={styles.orderText}>
              {t('driver.item.order', { order: item.unloadingOrder })}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.chipsRow}>
        <Chip tone={handling.tone} label={handling.label} />
        {extraFragile ? <Chip tone="danger" label={t('driver.detail.handling.FRAGILE')} /> : null}
        {item.weightKg !== undefined ? (
          <AppText variant="label" color={colors.text2} style={styles.code}>
            {format.weight(item.weightKg)}
          </AppText>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <AppText variant="meta" color={colors.text3} style={styles.code}>
          {item.label}
        </AppText>
        {dims ? (
          <AppText variant="meta" color={colors.text2} style={styles.code}>
            {t('driver.detail.packageDimensions', { dims })}
          </AppText>
        ) : null}
      </View>

      {showType ? (
        <AppText variant="meta" color={colors.text2}>
          {t('driver.detail.packageType', { type: item.packageTypeName })}
        </AppText>
      ) : null}

      {item.note ? (
        <AppText variant="meta" color={colors.text2}>
          {t('driver.detail.packageNote', { note: item.note })}
        </AppText>
      ) : null}

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
})

/**
 * Một dòng kiện nhận dọc đường (như `PickupItemRow` của web): không có thứ tự dỡ, vùng hay lớp. Điểm nhận: "Chưa nhận" / "Đã nhận"; điểm
 * giao: "Chưa dỡ" / "Đã dỡ", kèm cách đối chiếu gần nhất. Xác nhận tay bị từ chối thì kiện quay về chưa xong kèm lý do.
 */
export const PickupItemRow = memo(function PickupItemRow({ item, last }: { item: StopPickupItem; last: boolean }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={[styles.row, last && styles.last, item.done && styles.done]}>
      <AppText variant="label" style={styles.code}>
        {item.label}
      </AppText>
      <AppText color={colors.text2}>{item.weightKg === undefined ? item.name : `${item.name} · ${format.weight(item.weightKg)}`}</AppText>
      {item.requestId === '' ? null : (
        <Line icon={Package} color={colors.text3}>
          {t('driver.pickup.request', { id: item.requestId })}
        </Line>
      )}
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
})

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
  row: {
    minHeight: 80,
    justifyContent: 'center',
    gap: space[1],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.bg,
  },
  last: { borderBottomWidth: 0 },
  done: { backgroundColor: badgeTones.success.bg },
  issue: { backgroundColor: badgeTones.warning.bg },
  nextRow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    backgroundColor: palette.amber[50],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  headLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  orderPill: {
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: palette.cyan[200],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  orderPillNext: {
    backgroundColor: palette.amber[200],
    borderColor: colors.warning,
  },
  orderText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  flexShrink: { flexShrink: 1 },
  code: { fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { marginTop: 4 },
  flex: { flex: 1 },
})
