import type { LocationRequest } from './driver-model'

/** Toạ độ của máy (`expo-location`): tốc độ m/s, hướng độ; máy không đo được thì `null` hoặc số âm (iOS trả −1). */
export type DeviceCoordinates = {
  readonly latitude: number
  readonly longitude: number
  readonly speed: number | null
  readonly heading: number | null
}

/**
 * Điểm vị trí gửi đi từ toạ độ của máy (như `locationInput` của web): tốc độ m/s → km/h làm tròn 0,1; hướng làm tròn độ, về [0, 360).
 * Thiếu, âm hoặc không đọc được là 0.
 */
export function locationInput({ latitude, longitude, speed, heading }: DeviceCoordinates): LocationRequest {
  const speedKmh = speed !== null && Number.isFinite(speed) && speed > 0 ? Math.round(speed * 36) / 10 : 0
  const degrees = heading !== null && Number.isFinite(heading) && heading >= 0 ? Math.round(heading) % 360 : 0
  return { lat: latitude, lng: longitude, speedKmh, heading: degrees }
}
