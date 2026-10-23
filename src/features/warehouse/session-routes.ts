/**
 * Đường dẫn của màn kho trên app. Không dùng `loadingSessionPath` của `warehouse-trips.ts` (chép từ web): hàm đó dựng đường dẫn của web
 * (`/kho?chuyen=`), app không có route đó.
 */

/** Tab Kho: danh sách chuyến cần xếp — nơi mọi lối thoát của phiên soạn → xếp quay về. */
export const WAREHOUSE_LIST = '/warehouse'

/** Mở phiên soạn → xếp một chuyến (`src/app/(app)/loading/[tripId].tsx`), mở chồng lên thanh tab. */
export function loadingPath(tripId: string) {
  return { pathname: '/loading/[tripId]', params: { tripId } } as const
}
