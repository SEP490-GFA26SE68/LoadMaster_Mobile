/**
 * Nền bản đồ (như web `components/map/map-style.ts`): **chỉ Goong**. Không dùng OpenStreetMap. Khoá REST của Goong không nằm ở app.
 */
export const GOONG_STYLE_URL = 'https://tiles.goong.io/assets/goong_map_web.json'

/** Khoá map tiles của Goong, hoặc `undefined` khi chưa cấu hình (dev, CI, test). */
export function goongMapTilesKey(
  env: { readonly EXPO_PUBLIC_GOONG_MAPTILES_KEY?: string } = {
    EXPO_PUBLIC_GOONG_MAPTILES_KEY: process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY,
  },
): string | undefined {
  const key = env.EXPO_PUBLIC_GOONG_MAPTILES_KEY?.trim()
  return key ? key : undefined
}

/** URL style `goong_map_web.json` khi có khoá; `undefined` khi không — bản đồ dùng nền trống, vẫn vẽ tuyến. */
export function goongStyleUrl(key: string | undefined = goongMapTilesKey()): string | undefined {
  return key ? `${GOONG_STYLE_URL}?api_key=${encodeURIComponent(key)}` : undefined
}
