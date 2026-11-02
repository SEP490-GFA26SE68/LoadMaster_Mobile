import { getMockDb, resetMockDb } from '@/data/mock-db'
import { SEED_PASSWORD } from '@/lib/mock-db'

import {
  createPickupRequest,
  fetchLiveTrip,
  fetchMonitoringBoard,
  fetchNotifications,
  fetchPickupRows,
  fetchTripRequirements,
  monitoringCapabilities,
  reportTripException,
  resolveTripException,
} from './monitoring-api'

/** Lớp dữ liệu của màn giám sát trên kho mẫu: hình dữ liệu màn đọc, và kho tự xét vai trò cho từng lệnh ghi. */

const DISPATCHER = 'dieuphoi@loadmaster.vn'
const MANAGER = 'quanly@loadmaster.vn'
const RUNNING_DRIVER = 'bao.ngo@loadmaster.vn'
const TRAFFIC = { type: 'TRAFFIC' as const, description: 'Kẹt xe ở ngã tư Vũng Tàu', delayMinutes: 30 }
const signIn = (email: string) => getMockDb().authenticate(email, SEED_PASSWORD)

beforeEach(resetMockDb)

test('chưa đăng nhập: NOT_SIGNED_IN', async () => {
  await expect(fetchMonitoringBoard()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
  await expect(fetchNotifications()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
})

test('kho mẫu làm được mọi việc của màn giám sát', () => {
  expect(monitoringCapabilities()).toStrictEqual({ exceptions: true, reroute: true, escalation: true, pickups: true, notifications: true })
})

test('bảng giám sát: chuyến đang chạy kèm xe, tài xế, kho đi, điểm giao, và số yêu cầu nhận hàng chờ duyệt', async () => {
  await signIn(DISPATCHER)
  const board = await fetchMonitoringBoard()
  expect(board.trips.map((trip) => trip.tripId)).toStrictEqual(['TRIP-009'])
  const [trip] = board.trips
  expect(trip).toMatchObject({ name: 'Tuyến Thủ Dầu Một – Sóng Thần', vehicleName: 'Thaco Ollin 720 · 61C-339.05', driverName: 'Ngô Văn Bảo' })
  expect(trip?.stops.map((stop) => [stop.number, stop.completedAt !== undefined, stop.arrivedAt !== undefined])).toStrictEqual([
    [1, true, true],
    [2, false, true],
    [3, false, false],
  ])
  expect(board.pendingPickups).toStrictEqual({ 'TRIP-009': 1 })
  expect(board.userNames['US-0006']).toBe('Ngô Văn Bảo')
})

test('một chuyến: phần ít đổi và lần đọc giám sát trong cùng một lần đọc; chuyến đã giao xong vẫn đọc được, không còn chạy', async () => {
  await signIn(MANAGER)
  const running = await fetchLiveTrip('TRIP-009')
  expect([running.trip.tripId, running.running, running.live.tripId]).toStrictEqual(['TRIP-009', true, 'TRIP-009'])
  expect(running.live.refreshMs).not.toBeNull()
  const done = await fetchLiveTrip('TRIP-001')
  expect([done.running, done.live.refreshMs]).toStrictEqual([false, null])
})

test('đánh dấu đã xử lý kèm ghi chú; quản lý công ty không xử lý được (kho xét vai trò)', async () => {
  await signIn(DISPATCHER)
  const { id } = await reportTripException('TRIP-009', TRAFFIC)
  await signIn(MANAGER)
  await expect(resolveTripException('TRIP-009', id, undefined)).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })
  await signIn(DISPATCHER)
  await resolveTripException('TRIP-009', id, ' Đã báo khách điểm 3 ')
  const live = await fetchLiveTrip('TRIP-009')
  expect(live.live.exceptions.map((item) => [item.id, item.status, item.resolution?.note])).toStrictEqual([[id, 'RESOLVED', 'Đã báo khách điểm 3']])
})

test('yêu cầu giao của chuyến: chuyến chạy từ seed không có yêu cầu nào', async () => {
  await signIn(MANAGER)
  expect(await fetchTripRequirements('TRIP-009')).toStrictEqual([])
})

test('yêu cầu nhận hàng: dòng kèm họ tên người gửi; gửi trả cả các điểm của chuyến để gọi tên điểm được bảo vệ', async () => {
  await signIn(DISPATCHER)
  const [seed] = await fetchPickupRows('TRIP-009')
  expect([seed?.request.id, seed?.createdByName]).toStrictEqual(['PKR-001', 'Nguyễn Thanh Tùng'])
  const { request, stops } = await createPickupRequest('TRIP-009', {
    pickup: { name: 'Kho Minh Phát', address: 'KCN VSIP 1, Thuận An', lat: 10.928, lng: 106.712 },
    delivery: seed?.request.delivery ?? { name: '', address: '', lat: 0, lng: 0 },
    packages: [{ packageCode: 'MP-001', lengthCm: 60, widthCm: 40, heightCm: 40, weightKg: 12, handlingClass: 'STANDARD' }],
  })
  expect([request.id, request.status, request.validationResults.length]).toStrictEqual(['PKR-002', 'VALIDATED', 10])
  expect(stops.map((stop) => stop.id)).toStrictEqual((await getMockDb().getTrip('TRIP-009')).stops.map((stop) => stop.id))
})

test('chuông văn phòng: sự kiện theo vai trò người đọc, kèm họ tên người làm và tên tuyến', async () => {
  await signIn(RUNNING_DRIVER)
  await getMockDb().reportTripException('TRIP-009', TRAFFIC)
  await signIn(DISPATCHER)
  const [reported, ...rest] = await fetchNotifications()
  expect(rest).toStrictEqual([])
  expect(reported).toMatchObject({
    action: 'exception.reported',
    actorId: 'US-0006',
    actorName: 'Ngô Văn Bảo',
    target: { type: 'trip', id: 'TRIP-009', label: 'Tuyến Thủ Dầu Một – Sóng Thần' },
    params: { exceptionId: 'EXC-001', exceptionType: 'TRAFFIC', delayMinutes: 30, stopNumber: 2 },
    names: {},
  })
  // Quản lý công ty không nhận sự cố tài xế vừa báo (chỉ nhận khi sự cố chuyển lên mình)
  await signIn(MANAGER)
  expect(await fetchNotifications()).toStrictEqual([])
})
