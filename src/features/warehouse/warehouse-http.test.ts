import { fail, failure, loadingDto, ok, sessionDto, step, TASKS, warehouseBackend, type Routes } from '@/test/warehouse-backend'

/*
 * Adapter backend của màn kho (`httpWarehouseApi`) trên máy chủ giả: đường dẫn, thân lệnh, đổi DTO sang kiểu màn và đổi mã lỗi. Mọi lệnh ghi
 * đọc lại phiên của máy chủ, nên kỳ vọng nói cả lượt đọc lại.
 */

const SESSION = '/api/warehouse/tasks/51'

/** Máy chủ trả phiên `dto` cho mọi lượt đọc phiên của chuyến 51, cộng các lệnh ghi của test. */
const onSession = (dto: unknown, extra: Routes = {}): Routes => ({ [`GET ${SESSION}`]: () => ok(dto), ...extra })

const reads = (calls: readonly { method: string; path: string }[]) => calls.filter((call) => call.method === 'GET' && call.path === SESSION).length

describe('httpWarehouseApi: danh sách chuyến', () => {
  test('xin cả chuyến chờ tối ưu lại; nhóm theo trạng thái phiên, sắp theo giờ xuất phát (giờ Việt Nam), chuyến chưa có giờ đứng đầu', async () => {
    const { warehouse, calls } = warehouseBackend({ 'GET /api/warehouse/tasks': () => ok(TASKS) })
    const trips = await warehouse.fetchTasks()

    expect(calls[0]).toMatchObject({ path: '/api/warehouse/tasks', query: { includeAwaitingReplan: 'true' } })
    expect(trips.map((trip) => [trip.code, trip.stage, trip.departureAt])).toEqual([
      ['TRIP-0054', 'stale', null],
      ['TRIP-0053', 'loaded', '2026-11-11T23:00:00.000Z'],
      ['TRIP-0051', 'loading', '2026-11-12T00:30:00.000Z'],
      ['TRIP-0052', 'waiting', '2026-11-12T02:00:00.000Z'],
    ])
    expect(trips[0]).toMatchObject({ id: '54', replanReason: 'damaged', status: 'PLANNED', packageCount: 3 })
  })

  test('máy chủ trả rỗng: danh sách rỗng', async () => {
    const { warehouse } = warehouseBackend({ 'GET /api/warehouse/tasks': () => ok(null) })
    await expect(warehouse.fetchTasks()).resolves.toEqual([])
  })
})

describe('httpWarehouseApi: bắt đầu và soạn hàng', () => {
  test('bắt đầu gửi kèm bước soạn hàng và trả phiên của máy chủ', async () => {
    const { warehouse, calls } = warehouseBackend({ 'POST /api/warehouse/tasks/51/start': () => ok(sessionDto()) })
    const session = await warehouse.start('51')

    expect(calls[0]).toMatchObject({ method: 'POST', body: { staging: true } })
    expect(session).toMatchObject({ tripId: '51', code: 'TRIP-0051', stagingRequired: true, stagingComplete: false, completed: false })
    expect(session.placements.map((placement) => placement.id)).toEqual(['901', '902'])
  })

  test('chuyến đã bắt đầu ở máy khác (TRIP_ALREADY_LOADING): mở lại phiên đó', async () => {
    const { warehouse, calls } = warehouseBackend(
      onSession(loadingDto(), { 'POST /api/warehouse/tasks/51/start': () => fail(409, 'TRIP_ALREADY_LOADING') }),
    )
    await expect(warehouse.start('51')).resolves.toMatchObject({ stagingComplete: true })
    expect(reads(calls)).toBe(1)
  })

  test('soạn một kiện gửi cách đối chiếu rồi đọc lại phiên; kiện đã soạn từ trước báo `alreadyStaged`', async () => {
    const path = '/api/warehouse/tasks/51/staging/packages/7001/confirm'
    const { warehouse, calls } = warehouseBackend(onSession(sessionDto(), { [`POST ${path}`]: () => ok({ alreadyStaged: true }) }))
    await expect(warehouse.stage('51', '7001', 'CODE')).resolves.toMatchObject({ alreadyStaged: true, session: { tripId: '51' } })
    expect(calls.find((call) => call.path === path)?.body).toEqual({ method: 'CODE' })
    expect(reads(calls)).toBe(1)
  })

  test('xác nhận tay gửi lý do, bỏ ghi chú rỗng; báo thiếu không thân lệnh — cả hai đọc lại phiên', async () => {
    const base = '/api/warehouse/tasks/51/staging/packages/7002'
    const { warehouse, calls } = warehouseBackend(
      onSession(sessionDto(), { [`POST ${base}/manual`]: () => ok(null), [`POST ${base}/shortage`]: () => ok(null) }),
    )
    await warehouse.stageManually('51', '7002', { reason: 'QR_UNREADABLE', note: '   ' })
    await warehouse.reportShortage('51', '7002')

    expect(calls.find((call) => call.path === `${base}/manual`)?.body).toEqual({ reason: 'QR_UNREADABLE' })
    expect(calls.find((call) => call.path === `${base}/shortage`)?.body).toBeUndefined()
    expect(reads(calls)).toBe(2)
  })
})

describe('httpWarehouseApi: xếp', () => {
  test('xếp khi chưa soạn đủ: STAGING_INCOMPLETE thành STAGING_NOT_READY, không đọc lại phiên', async () => {
    const { warehouse, calls } = warehouseBackend(
      onSession(sessionDto(), { 'POST /api/warehouse/placements/901/confirm': () => fail(400, 'STAGING_INCOMPLETE') }),
    )
    expect(await failure(() => warehouse.confirm('51', '901'))).toMatchObject({ code: 'STAGING_NOT_READY', status: 400 })
    expect(reads(calls)).toBe(0)
  })

  test('kiện đã được ghi từ trước (lượt gọi trước mất phản hồi): không báo lỗi, đọc lại phiên', async () => {
    const { warehouse } = warehouseBackend(
      onSession(loadingDto(['CONFIRMED', 'PENDING']), {
        'POST /api/warehouse/placements/901/confirm': () => fail(409, 'PLACEMENT_ALREADY_CONFIRMED'),
      }),
    )
    await expect(warehouse.confirm('51', '901')).resolves.toMatchObject({ outcomes: { '901': 'confirmed' } })
  })

  test('sai lệch vị trí gửi cm nguyên và lý do đã cắt khoảng trắng', async () => {
    const path = '/api/warehouse/placements/902/deviation'
    const { warehouse, calls } = warehouseBackend(onSession(loadingDto(['CONFIRMED', 'DEVIATION']), { [`POST ${path}`]: () => ok(null) }))
    const session = await warehouse.deviation('51', '902', { x: 205.4, y: 10.6, z: 0, reason: '  Vướng vách  ' })

    expect(calls.find((call) => call.path === path)?.body).toEqual({ actualPosX: 205, actualPosY: 11, actualPosZ: 0, reason: 'Vướng vách' })
    expect(session.outcomes).toEqual({ '901': 'confirmed', '902': 'deviation' })
  })

  test('kiện hỏng có kiện tựa lên: chuyến về lập kế hoạch, không còn phiên để đọc', async () => {
    const { warehouse, calls } = warehouseBackend({
      'POST /api/warehouse/placements/901/damaged': () => ok({ outcome: 'REPLANNED', restingCount: 2 }),
    })
    await expect(warehouse.damaged('51', '901')).resolves.toEqual({ outcome: 'replanned', resting: 2 })
    expect(reads(calls)).toBe(0)
  })

  test('kiện hỏng không kiện nào tựa lên: bỏ lại kho, xếp tiếp trên phiên đọc lại', async () => {
    const { warehouse } = warehouseBackend(
      onSession(loadingDto(['DAMAGED', 'PENDING']), { 'POST /api/warehouse/placements/901/damaged': () => ok({ outcome: 'LEFT_OUT' }) }),
    )
    const result = await warehouse.damaged('51', '901')
    expect(result).toMatchObject({ outcome: 'leftOut', session: { outcomes: { '901': 'damaged' } } })
  })

  test.each([
    [400, null, 'INCOMPLETE_LOADING'],
    [409, 'LOADING_MANUAL_CONFIRM_PENDING', 'LOADING_MANUAL_CONFIRM_PENDING'],
  ])('hoàn tất bị từ chối (%i, mã %s): màn nhận %s', async (status, code, expected) => {
    const { warehouse } = warehouseBackend({ 'POST /api/warehouse/tasks/51/complete': () => fail(status, code) })
    expect(await failure(() => warehouse.complete('51'))).toMatchObject({ code: expected, status })
  })

  test('số seal cắt khoảng trắng; máy chủ từ chối số sai độ dài thì câu kèm độ dài tối đa', async () => {
    const path = '/api/warehouse/tasks/51/seal'
    let reject = false
    const { warehouse, calls } = warehouseBackend(
      onSession(loadingDto(['CONFIRMED', 'CONFIRMED'], { status: 'COMPLETED', sealNumber: 'SL-77', sealedAt: '2026-11-12T08:05:00' }), {
        [`POST ${path}`]: () => (reject ? fail(400, 'SEAL_INVALID') : ok(null)),
      }),
    )
    const session = await warehouse.seal('51', '  SL-77 ')
    expect(calls.find((call) => call.path === path)?.body).toEqual({ sealNumber: 'SL-77' })
    expect(session).toMatchObject({ completed: true, seal: { number: 'SL-77', at: '2026-11-12T01:05:00.000Z' } })

    reject = true
    expect(await failure(() => warehouse.seal('51', 'X'))).toMatchObject({ code: 'SEAL_INVALID', params: { max: 32 } })
  })
})

describe('httpWarehouseApi: phiên của máy chủ', () => {
  test('kiện sắp theo thứ tự xếp; soạn, báo thiếu và xác nhận tay theo từng chỗ xếp; số xác nhận tay chờ đếm khi máy chủ không trả', async () => {
    const dto = sessionDto({
      pendingManualCount: undefined,
      placements: [
        step(902, 2, { shortageStatus: 'OPEN' }),
        step(901, 1, { staged: true, manualStatus: 'PENDING', manualStep: 'STAGING' }),
      ],
    })
    const { warehouse } = warehouseBackend(onSession(dto))
    const session = await warehouse.fetchSession('51')

    expect(session.placements.map((placement) => placement.id)).toEqual(['901', '902'])
    expect(session.staging).toEqual({
      '901': { staged: true, shortage: null, manual: { status: 'PENDING', step: 'STAGING', rejectReason: null } },
      '902': { staged: false, shortage: 'open', manual: null },
    })
    expect(session.pendingManual).toBe(1)
    expect(session.box).toEqual({ innerLengthCm: 600, innerWidthCm: 240, innerHeightCm: 240 })
  })

  test('phiên bắt đầu không kèm bước soạn (app khác): coi như đã soạn đủ', async () => {
    const { warehouse } = warehouseBackend(onSession(sessionDto({ stagingRequired: undefined, stagingComplete: undefined })))
    await expect(warehouse.fetchSession('51')).resolves.toMatchObject({ stagingRequired: false, stagingComplete: true })
  })

  test('chỗ xếp thiếu vị trí là lỗi của máy chủ, không điền 0', async () => {
    const { warehouse } = warehouseBackend(onSession(sessionDto({ placements: [step(901, 1, { posX: null })] })))
    expect(await failure(() => warehouse.fetchSession('51'))).toMatchObject({ code: 'SERVER_ERROR' })
  })
})
