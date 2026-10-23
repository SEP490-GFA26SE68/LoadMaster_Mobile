import { useMemo } from 'react'

import { adaptResult, type ViewerSceneModel } from '@/features/viewer3d/scene-input'
import type { Revision, Trip } from '@/lib/mock-db'

/**
 * Scene cm của phương án kho đang xếp (như `useSessionModel` của web): kiện theo thứ tự xếp (`placement.step` = `loadingOrder`, `stop`
 * là số điểm giao hiện tại), vùng điểm giao, xe, và hai cờ `isMockResult` / `ordersRecomputed` cho `PlanNotices`. Dựng lại chỉ khi phương
 * án hoặc điểm giao đổi: mỗi bước ghi làm đổi `trip.loading` rồi đọc lại chuyến, còn `stops` và `plan` giữ nguyên tham chiếu nhờ
 * structural sharing của TanStack Query.
 *
 * Mọi màn của phiên đọc kiện qua đây — bước Soạn hàng (WP-B) đưa `model.placements` vào `stagingProgress`, bước Xếp (WP-C) vào
 * `loadingProgress` và khung 3D, màn Xếp xong (WP-A) vào `stopTallies` — không tự đọc `plan.result.placements`.
 */
export function useSessionScene(trip: Trip, plan: Revision): ViewerSceneModel {
  const { id, stops, inputVersion } = trip
  return useMemo(() => adaptResult({ trip: { id, stops, inputVersion }, revision: plan }), [id, stops, inputVersion, plan])
}
