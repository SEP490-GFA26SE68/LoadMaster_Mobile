import { StyleSheet, View } from 'react-native'

import { useT } from '@/lib/i18n'
import { badgeTones, radius, space, type BadgeTone } from '@/theme/tokens'
import type { TripStatus, TripSubStatus } from '@/types/trip'

import { AppText } from './AppText'

/** Màu kể giai đoạn của chuyến, như bản web: xám nháp · cyan đã lập kế hoạch · xanh lam đang chạy · xanh lá đã giao · đỏ đã huỷ. */
const STATUS_TONE: Record<TripStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PLANNED: 'cyan',
  LOADING: 'azure',
  IN_TRANSIT: 'azure',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

/** Dòng phụ "cần người xử lý" mang màu hổ phách; tiến độ kho mang xanh lam. */
const SUB_TONE: Record<TripSubStatus['kind'], BadgeTone> = {
  awaitingApproval: 'warning',
  approved: 'cyan',
  stale: 'warning',
  staging: 'azure',
  shortage: 'warning',
  loading: 'azure',
  loaded: 'azure',
  lateStops: 'warning',
  manualPending: 'warning',
}

function Chip({ tone, label }: { tone: BadgeTone; label: string }) {
  const { bg, fg } = badgeTones[tone]
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <AppText variant="meta" color={fg}>
        {label}
      </AppText>
    </View>
  )
}

/** Chip trạng thái của chuyến (sáu trạng thái của backend). Màu luôn đi kèm chữ. */
export function TripStatusChip({ status }: { status: TripStatus }) {
  const t = useT()
  return <Chip tone={STATUS_TONE[status]} label={t(`status.${status}`)} />
}

/** Dòng phụ dưới chip: phương án chờ duyệt / lỗi thời, tiến độ kho, xác nhận tay chờ duyệt. */
export function TripSubStatusTag({ sub }: { sub: TripSubStatus }) {
  const t = useT()
  const label =
    sub.kind === 'staging' || sub.kind === 'loading'
      ? t(`status.sub.${sub.kind}`, { recorded: sub.recorded, total: sub.total })
      : sub.kind === 'manualPending'
        ? t('status.sub.manualPending', { count: sub.count })
        : t(`status.sub.${sub.kind}`)
  return <Chip tone={SUB_TONE[sub.kind]} label={label} />
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start', paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
