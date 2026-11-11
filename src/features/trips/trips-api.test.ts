import { getMockDb, resetMockDb } from '@/data/mock-db'
import { SEED_PASSWORD } from '@/lib/mock-db'
import { DISPATCHER_EMAIL, MANAGER_EMAIL, PHUONG_NAM_DISPATCHER_EMAIL } from '@/test/office-flow'
import { stageAll } from '@/test/trip-flow'
import { asDispatcher, LOADING_TRIP, READY_TRIP, stagedTwoCartonTrip, startSession, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'
import { optimizedTwoCartonTrip } from '@/test/mock-db-samples'

import * as api from './trips-api'
import type { FullTripDetail } from './trips-model'

/**
 * Lớp dữ liệu của màn chuyến trên kho mẫu (`trips-mock.ts`): mọi lệnh đòi phiên, kho chỉ trả chuyến của công ty người đăng nhập, và hai
 * việc ghi (xác nhận tay, kiện kho báo thiếu) chỉ điều phối viên làm được. Luật của từng chuyến (trạng thái, dòng phụ, tuyến) đã có test ở
 * bản web.
 */

const signIn = (email: string) => getMockDb().authenticate(email, SEED_PASSWORD)

/** Kho mẫu luôn trả chi tiết đủ thẻ. */
async function fullDetail(tripId: string): Promise<FullTripDetail> {
  const detail = await api.fetchTripDetail(tripId)
  if (detail.kind !== 'full') throw new Error('kho mẫu phải trả chi tiết đủ thẻ')
  return detail
}

/** Chuyến như kho đang lưu, dưới phiên hiện tại. */
const storedTrip = (tripId: string) => getMockDb().getTrip(tripId)

beforeEach(resetMockDb)

describe('lệnh của màn chuyến đòi phiên', () => {
  test.each([
    ['fetchTrips', () => api.fetchTrips()],
    ['fetchTripDetail', () => api.fetchTripDetail(READY_TRIP)],
    ['fetchTripRequirements', () => api.fetchTripRequirements(READY_TRIP)],
    ['fetchManualConfirmations', () => api.fetchManualConfirmations(LOADING_TRIP)],
    ['approveManualConfirmation', () => api.approveManualConfirmation(LOADING_TRIP, 'VF-001')],
    ['rejectManualConfirmation', () => api.rejectManualConfirmation(LOADING_TRIP, 'VF-001', 'Nhãn còn đọc được')],
    ['fetchStagingShortages', () => api.fetchStagingShortages(LOADING_TRIP)],
    ['resolveStagingShortage', () => api.resolveStagingShortage(LOADING_TRIP, 'PKG-001-01', 'KEEP_SEARCHING')],
  ])('%s chưa đăng nhập: NOT_SIGNED_IN', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
  })

  test('kho mẫu làm được mọi việc của màn', () => {
    expect(api.tripsCapabilities()).toEqual({ manualConfirms: true, shortages: true, requirements: true, planStatus: true })
  })
})

describe('chuyến của công ty người đăng nhập', () => {
  test('điều phối viên Long Bình thấy 15 chuyến của Long Bình, chuyến chính đứng đầu', async () => {
    await signIn(DISPATCHER_EMAIL)
    const rows = await api.fetchTrips()
    expect(rows).toHaveLength(15)
    expect(rows[0]?.id).toBe(READY_TRIP)
    expect(rows.some((row) => row.id.startsWith('TRIP-PN-'))).toBe(false)
  })

  test('điều phối viên Phương Nam chỉ thấy chuyến của Phương Nam', async () => {
    await signIn(PHUONG_NAM_DISPATCHER_EMAIL)
    const rows = await api.fetchTrips()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.id.startsWith('TRIP-PN-'))).toBe(true)
  })

  test('chi tiết kèm xe, tài xế, trạng thái và tuyến đã tối ưu', async () => {
    await signIn(MANAGER_EMAIL)
    const loading = await fullDetail(LOADING_TRIP)
    expect(loading.status).toBe('LOADING')
    expect(loading.driver).toMatchObject({ fullName: 'Đặng Hoài Nam', phone: '0907 890 123' })
    expect(loading.vehicle.id).toBe(loading.trip.vehicleId)
    expect(loading.events.every((event) => event.target.type === 'trip' && event.target.id === LOADING_TRIP)).toBe(true)
    const ready = await fullDetail(READY_TRIP)
    expect(ready.eta?.stops).toHaveLength(ready.trip.stops.length)
    // Chuyến nháp chưa tối ưu tuyến: không có giờ đến
    expect((await fullDetail('TRIP-014')).eta).toBeNull()
  })

  test('chuyến của công ty khác đọc như không có', async () => {
    await signIn(DISPATCHER_EMAIL)
    await expect(api.fetchTripDetail('TRIP-PN-001')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('yêu cầu giao của chuyến', () => {
  test('theo thứ tự điểm giao, kèm trạng thái và số điểm', async () => {
    await signIn(DISPATCHER_EMAIL)
    const db = getMockDb()
    const trip = await db.createTrip({ name: 'Tuyến Hoà Khánh', vehicleId: 'VEHICLE-001', scheduledDate: '2099-12-31', stops: [], packages: [] })
    const requirement = await db.createDeliveryRequirement({
      destinationName: 'Xưởng Hoà Khánh',
      address: 'Lô 5, KCN Hoà Khánh, Đà Nẵng',
      deadline: '2099-12-31T17:00:00+07:00',
      priority: 'HIGH',
      packageIds: ['PK-0031'],
    })
    expect(await api.fetchTripRequirements(trip.id)).toEqual([])
    await db.assignDeliveryRequirement(requirement.id, trip.id)
    const rows = await api.fetchTripRequirements(trip.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ requirement: { id: requirement.id }, status: 'ASSIGNED', stopNumber: 1 })
  })
})

/** Kho (dưới phiên nhân viên kho) xác nhận tay kiện ở bước 1 của chuyến hai thùng. */
async function pendingLoadingConfirm(): Promise<string> {
  await signIn(WAREHOUSE_EMAIL)
  const { trip } = await stagedTwoCartonTrip()
  await getMockDb().confirmLoadingManually(trip.id, { packageInstanceId: 'PKG-001-01', reason: 'LABEL_DAMAGED', note: 'Nhãn rách một nửa' })
  return trip.id
}

describe('xác nhận tay chờ duyệt', () => {
  test('dòng chờ của bước đang diễn ra kèm kiện, lý do và người gửi', async () => {
    const tripId = await pendingLoadingConfirm()
    await signIn(MANAGER_EMAIL)
    const rows = await api.fetchManualConfirmations(tripId)
    expect(rows).toEqual([
      expect.objectContaining({
        context: 'LOADING',
        packageInstanceId: 'PKG-001-01',
        packageName: 'Carton A',
        reason: 'LABEL_DAMAGED',
        note: 'Nhãn rách một nửa',
        senderName: 'Lê Văn Hải',
      }),
    ])
    expect(rows[0]?.stopNumber).toBeUndefined()
  })

  test('chỉ điều phối viên duyệt; duyệt xong không còn dòng chờ', async () => {
    const tripId = await pendingLoadingConfirm()
    await signIn(MANAGER_EMAIL)
    const [row] = await api.fetchManualConfirmations(tripId)
    if (row === undefined) throw new Error('thiếu dòng chờ duyệt')
    await expect(api.approveManualConfirmation(tripId, row.id)).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })
    await signIn(DISPATCHER_EMAIL)
    await api.approveManualConfirmation(tripId, row.id)
    expect(await api.fetchManualConfirmations(tripId)).toEqual([])
  })

  test('từ chối kèm lý do gỡ kết quả của kiện', async () => {
    const tripId = await pendingLoadingConfirm()
    await signIn(DISPATCHER_EMAIL)
    const [row] = await api.fetchManualConfirmations(tripId)
    if (row === undefined) throw new Error('thiếu dòng chờ duyệt')
    await api.rejectManualConfirmation(tripId, row.id, 'Nhãn còn đọc được, quét lại')
    const trip = await storedTrip(tripId)
    expect(trip.loading?.steps.some((step) => step.packageInstanceId === 'PKG-001-01')).toBe(false)
    expect(await api.fetchManualConfirmations(tripId)).toEqual([])
  })
})

/** Kho bắt đầu chuyến hai thùng, soạn mọi kiện trừ `PKG-001-01` (điểm 3) rồi báo thiếu kiện đó. */
async function shortageTrip(): Promise<string> {
  await signIn(WAREHOUSE_EMAIL)
  const { trip } = await asDispatcher(async (db) => {
    const created = await optimizedTwoCartonTrip(db)
    await db.approveRevision(created.revision.id, [])
    return created
  })
  await startSession(trip.id)
  await stageAll(getMockDb(), trip.id, ['PKG-001-01'])
  await getMockDb().reportStagingShortage(trip.id, 'PKG-001-01')
  return trip.id
}

describe('kiện kho báo thiếu', () => {
  test('dòng kiện kèm điểm giao và người báo', async () => {
    const tripId = await shortageTrip()
    await signIn(MANAGER_EMAIL)
    expect(await api.fetchStagingShortages(tripId)).toEqual([
      expect.objectContaining({ packageInstanceId: 'PKG-001-01', packageName: 'Carton A', stopNumber: 3, reporterName: 'Lê Văn Hải' }),
    ])
    await expect(api.resolveStagingShortage(tripId, 'PKG-001-01', 'KEEP_SEARCHING')).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })
  })

  test('tìm tiếp đóng báo thiếu, chuyến vẫn ở kho', async () => {
    const tripId = await shortageTrip()
    await signIn(DISPATCHER_EMAIL)
    await api.resolveStagingShortage(tripId, 'PKG-001-01', 'KEEP_SEARCHING')
    expect((await storedTrip(tripId)).phase).toBe('loading')
    expect(await api.fetchStagingShortages(tripId)).toEqual([])
  })

  test('bỏ kiện đưa chuyến về Đã lập kế hoạch', async () => {
    const tripId = await shortageTrip()
    await signIn(DISPATCHER_EMAIL)
    await api.resolveStagingShortage(tripId, 'PKG-001-01', 'DROP')
    expect((await storedTrip(tripId)).phase).toBe('planning')
    expect(await api.fetchStagingShortages(tripId)).toEqual([])
  })
})
