import { getMockDb, resetMockDb } from '@/data/mock-db'
import { pendingManualConfirms, SEED_PASSWORD } from '@/lib/mock-db'
import {
  asDispatcher,
  labelsInLoadingOrder,
  LOADED_TRIP,
  LOADING_TRIP,
  loadUpTo,
  PHUONG_NAM_WAREHOUSE_EMAIL,
  READY_TRIP,
  STALE_TRIP,
  stageAllBut,
  stagedTwoCartonTrip,
  startSession,
  WAREHOUSE_EMAIL,
} from '@/test/warehouse-flow'

import * as api from './warehouse-api'

/**
 * Luật của lớp dữ liệu kho trên kho mẫu (`warehouse-mock.ts`): danh sách chuyến ráp từ chuyến, revision và xe của kho; xếp xong tự động
 * sau kiện cuối (`finishWhenReady`); và lệnh nào cũng đòi phiên. Luật của từng chuyến (nhóm, dòng phụ, đối chiếu) đã có test ở bản web.
 */

const signIn = (email: string) => getMockDb().authenticate(email, SEED_PASSWORD)

/** Phần chung của mọi dòng seed: không xác nhận tay, kiện hỏng, báo thiếu, lần quay về hay seal. */
const REST = { manualSub: null, damaged: 0, shortages: 0, replan: undefined, recheck: 0, seal: undefined }

beforeEach(resetMockDb)

describe('lệnh của kho đòi phiên', () => {
  const manual = { packageInstanceId: 'PKG-001-01', reason: 'QR_UNREADABLE' } as const
  const code = { method: 'QR', code: 'LM-0000-0000-0000' } as const
  test.each([
    ['fetchWarehouseTrips', () => api.fetchWarehouseTrips()],
    ['fetchWarehouseTrip', () => api.fetchWarehouseTrip(READY_TRIP)],
    ['startLoading', () => api.startLoading(READY_TRIP)],
    ['confirmStagingByQr', () => api.confirmStagingByQr(READY_TRIP, code)],
    ['confirmStagingManually', () => api.confirmStagingManually(READY_TRIP, manual)],
    ['reportStagingShortage', () => api.reportStagingShortage(READY_TRIP, 'PKG-001-01')],
    ['confirmLoadingByQr', () => api.confirmLoadingByQr(LOADING_TRIP, code)],
    ['confirmLoadingManually', () => api.confirmLoadingManually(LOADING_TRIP, manual)],
    ['reportDamagedPackage', () => api.reportDamagedPackage(LOADING_TRIP, 'PKG-001-01')],
    ['completeLoading', () => api.completeLoading(LOADING_TRIP)],
    ['recordSeal', () => api.recordSeal(LOADED_TRIP, 'SL-001')],
    ['fetchTripLabels', () => api.fetchTripLabels(READY_TRIP)],
    ['fetchNotifications', () => api.fetchNotifications()],
  ])('%s chưa đăng nhập: NOT_SIGNED_IN, kho không ghi gì', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('planning')
  })
})

describe('danh sách chuyến của kho', () => {
  test('Long Bình (seed 14/09): đang xếp, chờ soạn, xếp xong, chờ tối ưu lại — chờ duyệt, nháp và chuyến đã rời kho không có', async () => {
    await signIn(WAREHOUSE_EMAIL)
    expect(await api.fetchWarehouseTrips()).toStrictEqual([
      { id: 'TRIP-011', name: 'Tuyến Tân Bình – Q.1 – Q.7', scheduledDate: '2026-09-14', vehicleName: 'Isuzu FVR 900 · 51D-622.14', status: 'LOADING', sub: { kind: 'loading', recorded: 110, total: 280 }, stage: 'loading', step: 'loading', total: 280, recorded: 110, ...REST },
      { id: 'TRIP-2026-0914', name: 'Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà', scheduledDate: '2026-09-14', vehicleName: 'Hyundai HD210 · 60C-446.32', status: 'PLANNED', sub: { kind: 'approved' }, stage: 'waiting', step: 'staging', total: 132, recorded: 0, ...REST },
      { id: 'TRIP-010', name: 'Tuyến Thủ Đức – An Phú – Phú Nhuận', scheduledDate: '2026-09-14', vehicleName: 'Isuzu NQR 550 · 51C-284.19', status: 'LOADING', sub: { kind: 'loaded' }, stage: 'loaded', step: 'loading', total: 210, recorded: 210, ...REST },
      { id: 'TRIP-013', name: 'Tuyến Biên Hoà – Long Bình Tân', scheduledDate: '2026-09-15', vehicleName: 'Truck 6m', status: 'PLANNED', sub: { kind: 'stale' }, stage: 'stale', step: 'staging', total: 200, recorded: 0, ...REST },
    ])
  })

  test('xe không còn trong kho: dòng ghi mã xe', async () => {
    await signIn(WAREHOUSE_EMAIL)
    jest.spyOn(getMockDb(), 'listVehicles').mockResolvedValue([])
    expect((await api.fetchWarehouseTrips()).map((row) => [row.id, row.vehicleName])).toStrictEqual([
      ['TRIP-011', 'VEHICLE-007'], ['TRIP-2026-0914', 'VEHICLE-002'], ['TRIP-010', 'VEHICLE-003'], ['TRIP-013', 'VEHICLE-001'],
    ])
  })

  test('chuyến tài xế đã cho xe chạy và chuyến bị huỷ rời danh sách', async () => {
    await signIn(WAREHOUSE_EMAIL)
    const db = getMockDb()
    // Tài xế của TRIP-010 (US-0004) xuất phát; điều phối viên huỷ chuyến đang xếp dở
    db.restoreSession('US-0004')
    await db.startDelivery(LOADED_TRIP)
    await asDispatcher((dispatcher) => dispatcher.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh'))
    db.restoreSession('US-0003')
    expect((await api.fetchWarehouseTrips()).map((row) => row.id)).toStrictEqual([READY_TRIP, STALE_TRIP])
  })

  test('nhân viên kho Phương Nam chỉ thấy chuyến đã duyệt của công ty mình', async () => {
    await signIn(PHUONG_NAM_WAREHOUSE_EMAIL)
    expect(await api.fetchWarehouseTrips()).toStrictEqual([
      { id: 'TRIP-PN-001', name: 'Tuyến Quận 7 – Nhà Bè', scheduledDate: '2026-09-14', vehicleName: 'Isuzu QKR 230 · 51C-907.41', status: 'PLANNED', sub: { kind: 'approved' }, stage: 'waiting', step: 'staging', total: 42, recorded: 0, ...REST },
    ])
  })
})

describe('xếp xong tự động sau kiện cuối', () => {
  beforeEach(async () => {
    await signIn(WAREHOUSE_EMAIL)
    await startSession(READY_TRIP)
  })

  test('kiện giữa chuyến không đổi pha; gõ mã kiện cuối thì chuyến xếp xong luôn, lần đối chiếu ghi đúng cách', async () => {
    await stageAllBut(READY_TRIP)
    const [first] = await labelsInLoadingOrder(READY_TRIP)
    const middle = await api.confirmLoadingByQr(READY_TRIP, { method: 'QR', code: first?.qrToken ?? '' })
    expect(middle.trip.phase).toBe('loading')

    const last = await loadUpTo(READY_TRIP, 132)
    const done = await api.confirmLoadingByQr(READY_TRIP, { method: 'CODE', code: last.qrToken.toLowerCase() })
    expect([done.packageInstanceId, done.trip.phase]).toStrictEqual([last.packageInstanceId, 'loaded'])
    expect(done.trip.verifications?.at(-1)).toMatchObject({ context: 'LOADING', packageInstanceId: last.packageInstanceId, method: 'CODE' })
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('loaded')
  })

  test('xác nhận tay kiện cuối không xếp xong: chờ điều phối viên duyệt, rồi kho bấm hoàn tất', async () => {
    await stageAllBut(READY_TRIP)
    const last = await loadUpTo(READY_TRIP, 132)
    const manual = await api.confirmLoadingManually(READY_TRIP, { packageInstanceId: last.packageInstanceId, reason: 'QR_UNREADABLE' })
    expect(manual.trip.phase).toBe('loading')
    await expect(api.completeLoading(READY_TRIP)).rejects.toMatchObject({ code: 'MANUAL_CONFIRM_PENDING' })

    const [pending] = pendingManualConfirms(manual.trip, 'LOADING')
    await asDispatcher((db) => db.approveManualConfirmation(READY_TRIP, pending?.id ?? ''))
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('loading')
    expect((await api.completeLoading(READY_TRIP)).phase).toBe('loaded')
  })

  test('còn xác nhận tay lúc xếp chờ duyệt: quét kiện cuối vẫn đang xếp', async () => {
    await stageAllBut(READY_TRIP)
    const before = await loadUpTo(READY_TRIP, 131)
    await api.confirmLoadingManually(READY_TRIP, { packageInstanceId: before.packageInstanceId, reason: 'LABEL_DAMAGED' })
    const last = (await labelsInLoadingOrder(READY_TRIP))[131]
    const result = await api.confirmLoadingByQr(READY_TRIP, { method: 'QR', code: last?.qrToken ?? '' })
    expect([result.packageInstanceId, result.trip.phase]).toStrictEqual([last?.packageInstanceId, 'loading'])
  })

  test('còn xác nhận tay lúc soạn chờ duyệt: quét kiện cuối vẫn đang xếp', async () => {
    const [unstaged] = await stageAllBut(READY_TRIP, 1)
    await api.confirmStagingManually(READY_TRIP, { packageInstanceId: unstaged ?? '', reason: 'OTHER', note: 'Nhãn bị nước làm nhoè' })
    const last = await loadUpTo(READY_TRIP, 132)
    expect(last.packageInstanceId).toBe(unstaged)
    const result = await api.confirmLoadingByQr(READY_TRIP, { method: 'QR', code: last.qrToken })
    expect(result.trip.phase).toBe('loading')
    expect(pendingManualConfirms(result.trip).map((entry) => [entry.context, entry.packageInstanceId])).toStrictEqual([['STAGING', unstaged]])
  })
})

describe('kiện hỏng lúc xếp, chuyến hai thùng (không kiện nào tựa lên kiện nào)', () => {
  beforeEach(() => signIn(WAREHOUSE_EMAIL))

  test('kiện đầu hỏng: bỏ lại kho, kho xếp tiếp; quét kiện còn lại thì xếp xong', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const [first, second] = labels
    const damaged = await api.reportDamagedPackage(trip.id, first?.packageInstanceId ?? '')
    expect(damaged.phase).toBe('loading')
    expect(damaged.loading?.steps.map((step) => [step.packageInstanceId, step.outcome])).toStrictEqual([['PKG-001-01', 'damaged']])
    const loaded = await api.confirmLoadingByQr(trip.id, { method: 'QR', code: second?.qrToken ?? '' })
    expect(loaded.trip.phase).toBe('loaded')
  })

  test('kiện cuối hỏng: chuyến xếp xong luôn', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const [first, second] = labels
    expect((await api.confirmLoadingByQr(trip.id, { method: 'QR', code: first?.qrToken ?? '' })).trip.phase).toBe('loading')
    const done = await api.reportDamagedPackage(trip.id, second?.packageInstanceId ?? '')
    expect(done.phase).toBe('loaded')
    expect(done.loading?.steps.map((step) => [step.packageInstanceId, step.outcome])).toStrictEqual([['PKG-001-01', 'loaded'], ['PKG-002-01', 'damaged']])
  })
})

test('số seal: chỉ ghi khi đã xếp xong; số trống hoặc quá 32 ký tự bị từ chối; ghi xong hiện ở dòng của chuyến', async () => {
  await signIn(WAREHOUSE_EMAIL)
  await expect(api.recordSeal(LOADING_TRIP, 'SL-2026-0914')).rejects.toMatchObject({ code: 'TRIP_PHASE_INVALID', params: { tripId: LOADING_TRIP, phase: 'loading' } })
  await expect(api.recordSeal(LOADED_TRIP, '   ')).rejects.toMatchObject({ code: 'SEAL_INVALID', params: { max: 32 } })
  await expect(api.recordSeal(LOADED_TRIP, 'S'.repeat(33))).rejects.toMatchObject({ code: 'SEAL_INVALID', params: { max: 32 } })

  const sealed = await api.recordSeal(LOADED_TRIP, ' SL-2026-0914 ')
  expect(sealed.loading?.seal?.number).toBe('SL-2026-0914')
  expect((await api.fetchWarehouseTrips()).find((row) => row.id === LOADED_TRIP)?.seal).toBe('SL-2026-0914')
})

test('chuông: điều phối viên quyết kiện mình báo thiếu, huỷ chuyến đang xếp; huỷ chuyến kho chưa bắt đầu thì không báo', async () => {
  await signIn(WAREHOUSE_EMAIL)
  await startSession(READY_TRIP)
  const [missing] = await labelsInLoadingOrder(READY_TRIP)
  await api.reportStagingShortage(READY_TRIP, missing?.packageInstanceId ?? '')
  await asDispatcher(async (db) => {
    await db.resolveStagingShortage(READY_TRIP, missing?.packageInstanceId ?? '', 'KEEP_SEARCHING')
    await db.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh')
    await db.cancelTrip(STALE_TRIP, 'Khách hoãn nhận hàng')
  })

  const notifications = await api.fetchNotifications()
  // Mới nhất trước; chuyến huỷ lúc đang xếp nêu số kiện đã lên xe phải dỡ ra (TRIP-011 đã xếp 110 kiện)
  expect(notifications.map(({ kind, target, tripId, details }) => ({ kind, target, tripId, details }))).toStrictEqual([
    { kind: 'cancelled', target: { id: LOADING_TRIP, label: 'Tuyến Tân Bình – Q.1 – Q.7' }, tripId: LOADING_TRIP, details: { reason: 'Xe hỏng máy lạnh', loaded: 110 } },
    {
      kind: 'shortageKept',
      target: { id: READY_TRIP, label: 'Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà' },
      tripId: READY_TRIP,
      details: { packageInstanceId: missing?.packageInstanceId, packageCode: missing?.packageCode },
    },
  ])
})
