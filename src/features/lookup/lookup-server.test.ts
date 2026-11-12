import { fail, failure, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpLookupApi } from './lookup-http'

/*
 * Tra cứu kiện khi nguồn `packages` là máy chủ (`httpLookupApi`) trên máy chủ giả: mã QR gửi chữ thường, cờ đọc từ lượt quét, kích thước
 * đọc từ kiện đầy đủ, mã gõ khớp mã QR, mã của kho, mã của bên gửi hoặc mã vạch; không có hay không được đọc là `QR_UNKNOWN`.
 */

const TOKEN = '3f2a9c1e-7b4d-4e8a-9c2b-1d5e6f7a8b9c'

const FULL = {
  id: 7001,
  packageCode: 'DMX-01',
  trackingBarcode: 'LM-BAR-7001',
  qrToken: TOKEN,
  actualLength: '60.00',
  actualWidth: 50,
  actualHeight: 80,
  actualWeightKg: 42.5,
  handlingClass: 'FRAGILE',
  status: 'PLANNED',
  destination: null,
  flag: null,
}

const SCAN = {
  id: 7001,
  packageCode: 'DMX-01',
  qrToken: TOKEN,
  handlingClass: 'FRAGILE',
  actualWeightKg: 42.5,
  status: 'PENDING',
  trip: { id: 51, name: 'TRIP-0051' },
  stop: { number: 2, name: 'Điện máy Xanh Biên Hoà' },
  destination: 'Biên Hoà',
  flag: 'NOT_FOUND',
}

function server(extra: Routes = {}) {
  const { calls, client } = fakeDriverBackend({
    [`GET /api/packages/scan/${TOKEN}`]: () => ok(SCAN),
    'GET /api/packages/7001': () => ok(FULL),
    'GET /api/packages': () => ok([{ ...FULL, actualWidth: null }, { ...FULL, id: 7002, packageCode: 'KHAC', trackingBarcode: null }]),
    ...extra,
  })
  return { calls, lookup: httpLookupApi({ client: () => client }) }
}

test('có tra cứu kiện và báo đã tìm thấy', () => {
  expect(server().lookup.capabilities).toEqual({ available: true, reportFound: true })
})

test('quét: mã QR gửi chữ thường; trạng thái, cờ, điểm đến, chuyến, điểm giao theo lượt quét, kích thước theo kiện đầy đủ', async () => {
  const { lookup, calls } = server()
  const found = await lookup.scanPackage(TOKEN.toUpperCase())

  expect(calls[0]).toMatchObject({ method: 'GET', path: `/api/packages/scan/${TOKEN}` })
  expect(found.package).toMatchObject({
    id: '7001',
    packageCode: 'DMX-01',
    qrToken: TOKEN,
    lengthCm: 60,
    widthCm: 50,
    heightCm: 80,
    weightKg: 42.5,
    handlingClass: 'FRAGILE',
    status: 'IMPORTED',
    flags: ['NOT_FOUND'],
    destination: 'Biên Hoà',
    tripId: 'TRIP-0051',
  })
  expect(found.stop).toEqual({ number: 2, name: 'Điện máy Xanh Biên Hoà' })
})

test('quét mã không có (404) hoặc của công ty khác: QR_UNKNOWN', async () => {
  const { lookup } = server({ [`GET /api/packages/scan/${TOKEN}`]: () => fail(404, 'PACKAGE_NOT_FOUND') })
  expect(await failure(() => lookup.scanPackage(TOKEN))).toMatchObject({ code: 'QR_UNKNOWN' })
})

test.each([
  ['mã QR', TOKEN],
  ['mã của kho', '7001'],
  ['mã của bên gửi, khác hoa thường', ' dmx-01 '],
  ['mã vạch', 'lm-bar-7001'],
])('gõ %s: một kiện, đọc đủ kích thước', async (_, code) => {
  const { lookup } = server()
  const found = await lookup.lookupPackages(code)
  expect(found.map((item) => [item.package.id, item.package.widthCm, item.package.flags])).toEqual([['7001', 50, ['NOT_FOUND']]])
})

test('gõ mã không khớp kiện nào: QR_UNKNOWN', async () => {
  const { lookup } = server()
  expect(await failure(() => lookup.lookupPackages('PK-404'))).toMatchObject({ code: 'QR_UNKNOWN' })
})

test('đã tìm thấy kiện: quét để có mã kiện rồi gỡ cờ theo mã của kho', async () => {
  const { lookup, calls } = server({ 'POST /api/packages/7001/found': () => ok({ ...FULL, status: 'PENDING' }) })
  const pkg = await lookup.reportPackageFound(TOKEN.toUpperCase())
  expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/packages/7001/found' })
  expect(pkg).toMatchObject({ id: '7001', flags: [] })
})
