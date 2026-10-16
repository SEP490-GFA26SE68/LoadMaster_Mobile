import { getMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { TripScreen } from '@/features/driver/TripScreen'

import { renderApp } from './render'

/** Tài xế mẫu và chuyến của họ mà kho đã xếp xong — ba điểm giao, điểm 1 nhiều kiện nhất. */
export const DRIVER_EMAIL = 'taixe@loadmaster.vn'
export const LOADED_TRIP = 'TRIP-010'

/** Vẽ màn một chuyến của tài xế; phiên đăng nhập khôi phục từ kho khoá giả (`signInAs`). */
export function renderTrip(tripId = LOADED_TRIP) {
  return renderApp(<TripScreen tripId={tripId} />, { auth: createMockAuth() })
}

/** Nhãn QR của các kiện ở một điểm của chuyến mẫu. */
export async function labelsAt(stop: number) {
  return (await getMockDb().listTripLabels(LOADED_TRIP)).filter((label) => label.deliveryStop === stop)
}

/** Ghi thẳng trong kho: xe rời kho, và đã đến điểm 1 khi `arrive` — test của hai nút đó bấm qua màn. */
export async function departLoadedTrip({ arrive }: { arrive: boolean }) {
  await getMockDb().startDelivery(LOADED_TRIP)
  if (arrive) await getMockDb().arriveAtStop(LOADED_TRIP, 1)
}

/** Dỡ thẳng trong kho mọi kiện của điểm 1 trừ kiện cuối, để test chỉ đối chiếu kiện còn lại trên màn. */
export async function unloadAllButLast() {
  const labels = await labelsAt(1)
  const last = labels.at(-1)
  if (last === undefined) throw new Error('chuyến mẫu không có kiện nào ở điểm 1')
  for (const label of labels.slice(0, -1)) await getMockDb().confirmUnloadByQr(LOADED_TRIP, 1, label.qrToken, 'QR')
  return { last, total: labels.length }
}
