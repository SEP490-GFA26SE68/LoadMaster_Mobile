import { Chip } from '@/components/Chip'
import type { DeadlineStatus } from '@/domain/routing'
import { useT } from '@/lib/i18n'
import type { LocationSource, TripExceptionStatus } from '@/lib/mock-db'
import type { BadgeTone } from '@/theme/tokens'

/** Tông của mức hạn, như màn điểm giao của tài xế: kịp hạn xanh lá, sát hạn hổ phách, trễ hạn dự kiến đỏ — luôn kèm chữ. */
export const DEADLINE_TONE: Readonly<Record<DeadlineStatus, BadgeTone>> = { OK: 'success', AT_RISK: 'warning', MISSED: 'danger' }

/** Mức hạn xấu nhất của chuyến hoặc mức hạn một điểm; `null` (không điểm nào có hạn) là chip xám "Không có hạn". */
export function DeadlineChip({ status }: { status: DeadlineStatus | null }) {
  const t = useT()
  if (status === null) return <Chip tone="neutral" label={t('monitoring.list.noDeadline')} />
  return <Chip tone={DEADLINE_TONE[status]} label={t(`common.deadlineStatuses.${status}`)} />
}

/** Nguồn của vị trí xe: GPS thật xanh lá, mô phỏng xám — nhãn luôn đi kèm mọi chỗ hiện vị trí. */
export function SourceTag({ source }: { source: LocationSource }) {
  const t = useT()
  return <Chip tone={source === 'GPS' ? 'success' : 'neutral'} label={t(`monitoring.location.sources.${source}`)} />
}

const EXCEPTION_TONE: Readonly<Record<TripExceptionStatus, BadgeTone>> = { OPEN: 'warning', ESCALATED: 'azure', RESOLVED: 'success' }

/** Trạng thái của một sự cố cấp chuyến: chưa xử lý hổ phách, đã chuyển quản lý xanh lam, đã xử lý xanh lá. */
export function ExceptionStatusChip({ status }: { status: TripExceptionStatus }) {
  const t = useT()
  return <Chip tone={EXCEPTION_TONE[status]} label={t(`monitoring.exceptions.statuses.${status}`)} />
}
