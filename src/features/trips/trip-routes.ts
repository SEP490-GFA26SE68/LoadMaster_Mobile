/** Đường dẫn của màn chuyến của điều phối viên và quản lý công ty trên app (bản web là `/chuyen`, `/chuyen/:id`). */

/** Tab Chuyến hàng. */
export const TRIP_LIST = '/trip-list'

/** Chi tiết một chuyến (`src/app/(app)/trip-detail/[tripId].tsx`), mở chồng lên thanh tab. */
export function tripDetailPath(tripId: string) {
  return { pathname: '/trip-detail/[tripId]', params: { tripId } } as const
}
