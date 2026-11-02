import type { DeadlineStatus } from '@/domain/routing'
import type { RequirementPriority, RequirementStatus } from '@/lib/mock-db'
import type { BadgeTone } from '@/theme/tokens'

/** Mức hạn của điểm theo giờ đến dự kiến (như web): kịp hạn xanh lá, sát hạn hổ phách, trễ hạn dự kiến đỏ — chip luôn kèm chữ. */
export const DEADLINE_TONE: Readonly<Record<DeadlineStatus, BadgeTone>> = { OK: 'success', AT_RISK: 'warning', MISSED: 'danger' }

/** Ưu tiên của yêu cầu giao và của điểm giao: màu chỉ nhấn hai mức cần chú ý (Cao hổ phách, Khẩn đỏ); chữ luôn nói mức. */
export const PRIORITY_TONE: Readonly<Record<RequirementPriority, BadgeTone>> = {
  LOW: 'neutral',
  NORMAL: 'neutral',
  HIGH: 'warning',
  URGENT: 'danger',
}

/** Trạng thái yêu cầu giao (như web): chờ xếp chuyến hổ phách, đã vào chuyến cyan, đang giao xanh lam, đã giao xanh lá, giao thiếu đỏ. */
export const REQUIREMENT_STATUS_TONE: Readonly<Record<RequirementStatus, BadgeTone>> = {
  PENDING: 'warning',
  ASSIGNED: 'cyan',
  IN_TRIP: 'azure',
  DELIVERED: 'success',
  PARTIAL: 'danger',
}
