/** Đường dẫn của màn giám sát trên app (bản web là `/giam-sat?chuyen=`). */

/** Tab Giám sát: các chuyến đang chạy. */
export const MONITORING_LIST = '/monitoring'

/** Giám sát một chuyến đang chạy (`src/app/(app)/live/[tripId].tsx`), mở chồng lên thanh tab. */
export function liveTripPath(tripId: string) {
  return { pathname: '/live/[tripId]', params: { tripId } } as const
}
