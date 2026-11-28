import { getMockDb, resetMockDb } from '@/data/mock-db'
import { SEED_PASSWORD } from '@/lib/mock-db'

import {
  fetchLiveTrip,
  fetchMonitoringBoard,
  fetchNotifications,
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
  expect(monitoringCapabilities()).toStrictEqual({ exceptions: true, reroute: true, escalation: true, notifications: true })
})

test('bảng giám sát: chuyến đang chạy kèm xe, tài xế, kho đi, điểm giao', async () => {
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
