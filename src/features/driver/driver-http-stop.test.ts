import { backend, fail, failure, ok, onTrip, STOP, STOP_KEY, stopOf, TRIP } from '@/test/driver-backend'

const unloadOk = () => ok({ remainingPackagesCount: 1 })

describe('httpDriverApi: dỡ kiện bằng mã', () => {
  test.each([
    ['mã QR, khác hoa thường và có khoảng trắng', '  LM-QR-7001 '],
    ['mã vạch', 'lm-ab12-cd34-ef56'],
    ['mã của kho kiện', '7001'],
    ['mã của bên gửi duy nhất trong điểm', 'dmx-01'],
  ])('khớp %s: ghi bằng mã kiện kèm mã tài xế, màn thấy kiện đã dỡ', async (_, code) => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7001/unload': unloadOk }))
    await driver.fetchTripScreen('41')
    await expect(driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code })).resolves.toEqual({ id: '7001' })
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/packages/7001/unload', query: { driverId: '15' } })
  })

  test('mã của bên gửi trùng nhiều kiện của điểm: không đoán, nói số kiện trùng; mã lạ: báo ngay — cả hai không gọi ghi', async () => {
    const packages = [...STOP.packages, { packageId: 7003, packageName: 'Máy giặt', packageCode: 'dmx-01', weight: 40, unloadOrder: 3 }]
    const { driver, calls } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => ok({ ...STOP, packages }) }))
    await driver.fetchTripScreen('41')
    expect(await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: 'DMX-01 ' }))).toMatchObject({
      code: 'UNLOAD_CODE_AMBIGUOUS',
      params: { code: 'DMX-01', count: 2 },
    })
    // Mã riêng của kiện vẫn khớp đúng một kiện dù mã bên gửi trùng
    expect(stopOf(await driver.fetchTripScreen('41')).items[0]?.label).toBe('LM-AB12-CD34-EF56')
    expect(await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: ' PK-404 ' }))).toMatchObject({
      code: 'PACKAGE_CODE_UNKNOWN',
      params: { code: 'PK-404' },
    })
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  test('kiện vừa ghi dỡ: quét lại báo đã dỡ, không gọi ghi lần hai', async () => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7002/unload': unloadOk }))
    await driver.fetchTripScreen('41')
    await driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: '7002' })
    expect(await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: '7002' }))).toMatchObject({
      code: 'PACKAGE_ALREADY_UNLOADED',
      params: { code: '7002' },
    })
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })

  test.each([
    [409, null, 'PACKAGE_ALREADY_UNLOADED'],
    [409, 'DUPLICATE_UNLOAD', 'PACKAGE_ALREADY_UNLOADED'],
    [400, null, 'PACKAGE_NOT_AT_STOP'],
    [400, 'WRONG_DELIVERY_STOP', 'PACKAGE_NOT_AT_STOP'],
  ])('backend từ chối dỡ (%i, mã %s): câu %s nêu mã in trên nhãn', async (status, code, expected) => {
    const { driver } = backend(onTrip({ 'POST /api/driver/packages/7001/unload': () => fail(status, code) }))
    await driver.fetchTripScreen('41')
    const error = await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'QR', code: 'LM-QR-7001' }))
    expect(error).toMatchObject({ code: expected, status, params: { code: 'DMX-01' } })
  })

  test.each([
    [409, 'SOMETHING_NEW'],
    [400, 'VALIDATION_ERROR'],
  ])('lỗi dỡ kèm mã nghiệp vụ khác cùng mã HTTP (%i %s): giữ mã của backend, kiện chưa được ghi dỡ', async (status, code) => {
    const { driver } = backend(onTrip({ 'POST /api/driver/packages/7001/unload': () => fail(status, code) }))
    await driver.fetchTripScreen('41')
    expect(await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'QR', code: 'LM-QR-7001' }))).toMatchObject({ code, status })
    expect(stopOf(await driver.fetchTripScreen('41')).items[0]).toMatchObject({ unloaded: false })
  })
})

describe('httpDriverApi: xác nhận tay và sự cố theo kiện', () => {
  test('xác nhận tay: gửi lý do và ghi chú, rồi đọc lại điểm — kiện chờ duyệt theo máy chủ', async () => {
    let pending = false
    const { driver, calls } = backend(
      onTrip({
        'GET /api/driver/trips/41/current-stop': () =>
          ok(pending ? { ...STOP, packages: [{ ...STOP.packages[0], unloaded: true, manualStatus: 'PENDING' }, STOP.packages[1]] } : STOP),
        'POST /api/driver/packages/7001/manual-unload': () => {
          pending = true
          return ok({ packageId: 7001 })
        },
      }),
    )
    await driver.fetchTripScreen('41')
    await expect(driver.confirmUnloadManually('41', { stop: STOP_KEY, itemId: '7001', reason: 'OTHER', note: 'Nhãn bị nước' })).resolves.toEqual({ id: '7001' })
    expect(calls.at(-1)).toMatchObject({ path: '/api/driver/packages/7001/manual-unload', body: { reason: 'OTHER', note: 'Nhãn bị nước' } })
    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(stop.items[0]).toMatchObject({ unloaded: true, via: 'MANUAL_PENDING' })
    expect(stop.pendingConfirms).toBe(1)
  })

  test('xác nhận tay bị từ chối: kiện đã dỡ / không thuộc điểm nói mã trên nhãn; thiếu ghi chú giữ mã của máy chủ', async () => {
    let reply = fail(409, 'DUPLICATE_UNLOAD')
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7001/manual-unload': () => reply }))
    await driver.fetchTripScreen('41')
    const input = { stop: STOP_KEY, itemId: '7001', reason: 'LABEL_DAMAGED' as const, note: undefined }
    expect(await failure(() => driver.confirmUnloadManually('41', input))).toMatchObject({ code: 'PACKAGE_ALREADY_UNLOADED', params: { code: 'DMX-01' } })
    expect(calls.at(-1)).toMatchObject({ body: { reason: 'LABEL_DAMAGED', note: null } })
    reply = fail(400, 'WRONG_DELIVERY_STOP')
    expect(await failure(() => driver.confirmUnloadManually('41', input))).toMatchObject({ code: 'PACKAGE_NOT_AT_STOP' })
    reply = fail(400, 'MANUAL_CONFIRM_NOTE_REQUIRED')
    expect(await failure(() => driver.confirmUnloadManually('41', input))).toMatchObject({ code: 'MANUAL_CONFIRM_NOTE_REQUIRED' })
  })

  test('sự cố theo kiện: loại viết hoa, ghi chú trống gửi null, rồi đọc lại điểm', async () => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7002/issues': () => ok({ issueId: 3 }) }))
    await driver.fetchTripScreen('41')
    await driver.reportDeliveryIssue('41', { stop: STOP_KEY, itemId: '7002', kind: 'refused', note: undefined })
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/packages/7002/issues', body: { kind: 'REFUSED', note: null } })
    await driver.reportDeliveryIssue('41', { stop: STOP_KEY, itemId: '7002', kind: 'other', note: 'Thùng móp' })
    // Lệnh ghi trước đã bỏ lần đọc cũ: điểm được đọc lại trước lệnh ghi sau
    expect(calls.slice(-2).map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /api/driver/trips/41/current-stop',
      'POST /api/driver/packages/7002/issues',
    ])
    expect(await failure(() => driver.reportDeliveryIssue('41', { stop: STOP_KEY, itemId: '9999', kind: 'damaged', note: undefined }))).toMatchObject({
      code: 'PACKAGE_NOT_AT_STOP',
    })
  })
})

describe('httpDriverApi: điểm nhận dọc đường và hoàn tất điểm', () => {
  const PICKUP_STOP = {
    stopId: 905,
    stopSequence: 3,
    stopName: 'Xưởng may Thuận An',
    address: 'KCN Việt Hương, Thuận An',
    actualArrival: '2026-10-16T10:00:00',
    stopType: 'PICKUP',
    packages: [],
    pickupPackages: [
      { packageId: 8101, packageName: null, packageCode: 'HG-1', qrToken: 'lm-qr-8101', trackingBarcode: null, weight: 8, unloadOrder: null, pickupRequestId: 12, picked: false },
      { packageId: 8102, packageName: 'Áo khoác', packageCode: 'HG-2', trackingBarcode: null, weight: null, unloadOrder: null, picked: true },
    ],
  }
  const PICKUP_KEY = { number: 3, ref: '905' }

  test('điểm nhận: kiện nhận lên xe theo máy chủ, đối chiếu bằng mã gọi pick, quét lại báo đã nhận', async () => {
    const { driver, calls } = backend(
      onTrip({
        'GET /api/driver/trips/41/current-stop': () => ok(PICKUP_STOP),
        'POST /api/driver/pickup-packages/8101/pick': () => ok({ packageId: 8101 }),
      }),
    )
    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(stop).toMatchObject({ stop: { kind: 'PICKUP', number: 3 }, items: [], total: 2, doneCount: 1, remaining: 1, verifiable: 1 })
    expect(stop.pickupItems.map(({ id, label, name, weightKg, requestId, role, done }) => [id, label, name, weightKg, requestId, role, done])).toEqual([
      ['8101', 'HG-1', 'HG-1', 8, '12', 'pick', false],
      ['8102', 'HG-2', 'Áo khoác', undefined, '', 'pick', true],
    ])
    await expect(driver.confirmUnload('41', { stop: PICKUP_KEY, method: 'QR', code: 'LM-QR-8101' })).resolves.toEqual({ id: '8101' })
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/pickup-packages/8101/pick' })
    expect(await failure(() => driver.confirmUnload('41', { stop: PICKUP_KEY, method: 'CODE', code: 'hg-1' }))).toMatchObject({
      code: 'PICKUP_PACKAGE_ALREADY_PICKED',
    })
    // Xác nhận tay ở điểm nhận: máy chủ chưa có
    expect(await failure(() => driver.confirmUnloadManually('41', { stop: PICKUP_KEY, itemId: '8101', reason: 'QR_UNREADABLE', note: undefined }))).toMatchObject({
      code: 'NOT_SUPPORTED',
    })
  })

  test('hoàn tất điểm: còn kiện chưa dỡ (400) nói tên điểm; còn xác nhận tay chờ, còn kiện nhận chưa lên xe: câu riêng', async () => {
    let reply = fail(400, 'INCOMPLETE_STOP_UNLOAD')
    const { driver } = backend(onTrip({ 'POST /api/driver/stops/902/complete': () => reply }))
    await driver.fetchTripScreen('41')
    expect(await failure(() => driver.completeStop('41', STOP_KEY))).toMatchObject({ code: 'STOP_NOT_COMPLETABLE', params: { name: 'Điện máy Xanh Biên Hoà' } })
    reply = fail(400, 'MANUAL_CONFIRM_PENDING')
    expect(await failure(() => driver.completeStop('41', STOP_KEY))).toMatchObject({ code: 'STOP_MANUAL_CONFIRM_PENDING' })
    reply = fail(400, 'PICKUP_STOP_INCOMPLETE')
    expect(await failure(() => driver.completeStop('41', STOP_KEY))).toMatchObject({ code: 'PICKUP_STOP_INCOMPLETE' })
  })

  test('hoàn tất điểm cuối: gửi mã tài xế; chuyến rời danh sách đang vận chuyển thì mở màn tổng kết', async () => {
    let tripDone = false
    const { driver, calls } = backend({
      'GET /api/driver/trips': () => ok([{ ...TRIP, status: tripDone ? 'DELIVERED' : 'IN_TRANSIT' }]),
      'GET /api/driver/trips/41/current-stop': () => ok(STOP),
      'POST /api/driver/stops/902/complete': () => {
        tripDone = true
        return ok({ tripCompleted: true })
      },
    })
    await driver.fetchTripScreen('41')
    await driver.completeStop('41', STOP_KEY)
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/stops/902/complete', query: { driverId: '15' } })
    expect(await driver.fetchTripScreen('41')).toEqual({ kind: 'completed', trip: { id: '41', code: 'TRIP-0041', name: undefined }, summary: undefined })
  })
})
