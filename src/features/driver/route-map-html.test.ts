import { colors } from '@/theme/tokens'

import { MAPLIBRE_CSS, MAPLIBRE_JS } from './maplibre-dist.generated'
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

test('MapLibre nằm ngay trong trang: không tải script hay CSS từ mạng', () => {
  const html = routeMapHtml(routeMapPayload({ depot, stops }, undefined))
  expect(html).toContain(MAPLIBRE_JS)
  expect(html).toContain(MAPLIBRE_CSS)
  expect(html).not.toMatch(/<script[^>]+src=/)
  expect(html).not.toMatch(/<link[^>]+href=/)
  expect(html).not.toContain('cdn.jsdelivr.net')
})

test('mốc xe xoay theo heading; injectJavaScript gọi __lmVehicle(lng, lat, heading)', () => {
  const payload = routeMapPayload({ depot, stops, vehicle: { lat: 10.86, lng: 106.75, heading: 90 } }, undefined)
  expect(payload.vehicle).toEqual([106.75, 10.86])
  expect(payload.heading).toBe(90)
  const html = routeMapHtml(payload)
  expect(html).toContain('window.__lmVehicle=function(lng,lat,heading)')
  expect(html).toContain("needle.style.transform='rotate('+heading+'deg)'")
})

test('bản thu nhỏ không bật nút +/−; bản phóng lớn mới navigation:true', () => {
  const preview = routeMapHtml(routeMapPayload({ depot, stops }, undefined))
  expect(preview).not.toContain('"navigation":true')
  const expanded = routeMapHtml(routeMapPayload({ depot, stops }, undefined, { navigation: true }))
  expect(expanded).toContain('"navigation":true')
  expect(expanded).toContain('if(data.navigation) map.addControl(new maplibregl.NavigationControl')
})

test('follow: camera bám xe, kéo / pinch / nút zoom gửi unfollowed, __lmFollow bật lại — resize không fit cả tuyến', () => {
  const html = routeMapHtml(routeMapPayload({ depot, stops }, undefined, { follow: true, pitch: 50 }))
  expect(html).toContain('"follow":true')
  expect(html).toContain('"pitch":50')
  expect(html).toContain('window.__lmFollow=function()')
  expect(html).toContain("post('unfollowed')")
  expect(html).toContain("map.on('zoomstart', onUserCamera)")
  expect(html).toContain("map.on('dragstart', onUserCamera)")
  expect(html).toContain('if(!e || !e.originalEvent) return')
  expect(html).toContain('easeTo')
  expect(html).toContain('function afterResize(){ map.resize(); }')
  expect(html).not.toContain('function afterResize(){ map.resize(); if(!following) fit(); }')
})
