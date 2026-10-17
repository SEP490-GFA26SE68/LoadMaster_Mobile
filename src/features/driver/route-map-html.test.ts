import { colors } from '@/theme/tokens'

import { GOONG_STYLE_URL } from './map-style'
import { routeLine, routeMapHtml, routeMapPayload } from './route-map-html'

const depot = { lat: 10.78, lng: 106.7 }
const stops = [{ id: 's1', number: 1, name: 'Biên Hoà', lat: 10.95, lng: 106.82 }]

test('đường tuyến nối kho với điểm; polyline backend thay thế đường thẳng', () => {
  expect(routeLine({ depot, stops })).toEqual([depot, stops[0]])
  const path = [depot, { lat: 10.86, lng: 106.75 }, stops[0]!]
  expect(routeLine({ depot, stops, path })).toEqual(path)
})

test('HTML MapLibre dùng style Goong khi có khoá, không nhúng Google Maps', () => {
  const html = routeMapHtml(routeMapPayload({ depot, stops }, 'tile-key'))
  expect(html).toContain(`${GOONG_STYLE_URL}?api_key=tile-key`)
  expect(html).toContain('maplibre-gl')
  expect(html.toLowerCase()).not.toContain('google')
})

test('không khoá: payload không có styleUrl, HTML vẫn vẽ tuyến bằng màu primary', () => {
  const payload = routeMapPayload({ depot, stops }, undefined)
  expect(payload.styleUrl).toBeUndefined()
  expect(payload.primary).toBe(colors.primary)
  expect(payload.line).toEqual([[106.7, 10.78], [106.82, 10.95]])
  expect(routeMapHtml(payload)).not.toContain(`${GOONG_STYLE_URL}?api_key=`)
})
