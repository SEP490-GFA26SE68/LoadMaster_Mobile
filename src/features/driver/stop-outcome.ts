import type { CompleteStopResult, StopCompletionInfo, StopOutcome, StopScreen } from './driver-model'

/**
 * Còn điểm giao phía sau sau khi hoàn tất điểm này. Máy chủ nói `tripCompleted` thì hết chuyến; nói `hasNext` thì còn. Không nói thì tin
 * `completion.next` khi nguồn biết cả tuyến; nguồn không biết thì coi như còn — không đóng chuyến nhầm.
 */
export function hasRemainingStops(ack: CompleteStopResult, completion: StopCompletionInfo): boolean {
  if (ack.tripCompleted) return false
  if (ack.hasNext) return true
  if (completion.nextKnown) return completion.next !== undefined
  return true
}

export function completeResultOf(dto: { readonly tripCompleted?: boolean | null; readonly nextStopId?: number | null } | null | undefined): CompleteStopResult {
  return {
    tripCompleted: dto?.tripCompleted === true,
    hasNext: dto?.tripCompleted !== true && dto?.nextStopId != null,
  }
}

/** Ảnh chụp điểm vừa hoàn tất, trước khi màn đọc lại điểm kế tiếp hoặc tổng kết chuyến. */
export function stopOutcomeOf(screen: StopScreen, ack: CompleteStopResult): StopOutcome {
  const remaining = hasRemainingStops(ack, screen.completion)
  return {
    stopNumber: screen.stop.number,
    stopName: screen.stop.name,
    stopCount: screen.stopCount,
    pickup: false,
    delivered: screen.completion.delivered,
    returned: screen.completion.returned,
    issues: screen.completion.issues,
    picked: screen.completion.picked,
    tripCompleted: !remaining,
    next: remaining ? screen.completion.next : undefined,
  }
}
