import { GOONG_STYLE_URL, goongMapTilesKey, goongStyleUrl } from './map-style'

test('khoá tiles lấy từ EXPO_PUBLIC_GOONG_MAPTILES_KEY; trống thì không có URL Goong', () => {
  expect(goongMapTilesKey({ EXPO_PUBLIC_GOONG_MAPTILES_KEY: ' key-1 ' })).toBe('key-1')
  expect(goongMapTilesKey({ EXPO_PUBLIC_GOONG_MAPTILES_KEY: '' })).toBeUndefined()
  expect(goongStyleUrl('abc 123')).toBe(`${GOONG_STYLE_URL}?api_key=abc%20123`)
  expect(goongStyleUrl(undefined)).toBeUndefined()
  expect(GOONG_STYLE_URL).toBe('https://tiles.goong.io/assets/goong_map_web.json')
})
