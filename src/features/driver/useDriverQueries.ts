import { useQuery } from '@tanstack/react-query'

import { fetchMyTrips } from './driver-api'

/** Khoá truy vấn của feature tài xế, mọi khoá nằm dưới `['driver']`. */
export const driverKeys = {
  all: ['driver'] as const,
  myTrips: ['driver', 'my-trips'] as const,
}

/** "Chuyến của tôi": pha của chuyến đổi ở nơi khác (kho xếp xong, điều phối huỷ) nên mỗi lần mở màn đọc lại. */
export function useMyTripsQuery() {
  return useQuery({ queryKey: driverKeys.myTrips, queryFn: fetchMyTrips, staleTime: 0 })
}
