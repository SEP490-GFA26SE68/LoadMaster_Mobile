import { act, configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { liveTripPath } from '@/features/monitoring/live-routes'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { DISPATCHER_EMAIL, MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored, signInAs } from '@/test/render'
import { LOADING_TRIP, STALE_TRIP } from '@/test/warehouse-flow'

import { TripDetailScreen } from './TripDetailScreen'

/*
 * Chi tiết chuyến (`TripDetailScreen`) của điều phối viên và quản lý công ty: banner theo pha, tiến trình, sơ đồ tuyến (thứ tự đi, giờ
 * đến dự kiến, mức hạn bằng chữ), yêu cầu giao, phương tiện, và nút chính "Giám sát chuyến" chỉ khi chuyến đang vận chuyển. Chuyến có tuyến
 * dựng bằng kho dưới phiên điều phối viên; còn lại là seed của Long Bình.
 */

// Chi tiết đọc chuyến, revision, nhật ký, người dùng và tuyến: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
})

/**
 * Thẻ yêu cầu giao và hai thẻ chờ duyệt đọc riêng sau khi chi tiết hiện: cuối mỗi test chờ các lượt đọc đó xong trong `act`, không để
 * chúng xong giữa lúc test vừa xong và lúc màn được gỡ.
 */
function settle() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
}

const ETA = /^Dự kiến đến \d\d:\d\d \d\d\/\d\d$/

function renderDetail(tripId: string, email = DISPATCHER_EMAIL) {
  return renderOfficeScreen(<TripDetailScreen tripId={tripId} />, { email })
}

/** Ba điểm có toạ độ trên cùng một vĩ tuyến, khai lệch thứ tự đi; tối ưu tuyến xếp lại Dĩ An → Hóc Môn → Đức Hoà. */
async function routedTrip(): Promise<string> {
  await signInAs(DISPATCHER_EMAIL)
  const db = getMockDb()
  const trip = await db.createTrip({
    name: 'Tuyến Dĩ An – Hóc Môn – Đức Hoà',
    vehicleId: 'VEHICLE-001',
    scheduledDate: '2099-12-31',
    departureAt: '2099-12-31T08:00:00+07:00',
    stops: [
      { id: 'STOP-01', name: 'Kho Đức Hoà', address: 'Quốc lộ N2, Đức Hoà, Long An', lat: 10.9294, lng: 106.5747 },
      { id: 'STOP-02', name: 'Kho Dĩ An', address: 'Quốc lộ 1K, Dĩ An, Bình Dương', lat: 10.9294, lng: 106.7747 },
      { id: 'STOP-03', name: 'Kho Hóc Môn', address: 'Quốc lộ 22, Hóc Môn, TP.HCM', lat: 10.9294, lng: 106.6747 },
    ],
    packages: [],
  })
  await db.optimizeTripRoute(trip.id)
  return trip.id
}

test('tuyến đã tối ưu: điểm theo thứ tự đi, giờ đến dự kiến, MOCK RESULT; chưa đang chạy thì không có nút chính', async () => {
  const tripId = await routedTrip()
  await renderDetail(tripId)
  expect(await screen.findByText('Tuyến đã tối ưu')).toBeOnTheScreen()
  expect(screen.getByText('MOCK RESULT')).toBeOnTheScreen()
  expect(screen.getByText('42,6 km · 1 giờ 36 phút')).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Điểm 1 \/ 3: Kho Dĩ An, 0 kiện, 0 kg, /)).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Điểm 2 \/ 3: Kho Hóc Môn, /)).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Điểm 3 \/ 3: Kho Đức Hoà, /)).toBeOnTheScreen()
  expect(screen.getAllByText(ETA)).toHaveLength(3)
  expect(screen.queryByRole('button', { name: 'Giám sát chuyến' })).toBeNull()
  await settle()
})

test('yêu cầu giao vào chuyến: hạn và ưu tiên ở điểm, điểm trễ hạn bằng chữ, thẻ yêu cầu giao', async () => {
  await signInAs(MANAGER_EMAIL)
  const db = getMockDb()
  const requirement = await db.createDeliveryRequirement({
    destinationName: 'Xưởng Hoà Khánh',
    address: 'Lô 5, KCN Hoà Khánh, Đà Nẵng',
    lat: 16.0747,
    lng: 108.1506,
    deadline: '2099-12-31T08:10:00+07:00',
    priority: 'HIGH',
    packageIds: ['PK-0031'],
  })
  await signInAs(DISPATCHER_EMAIL)
  const trip = await db.createTrip({
    name: 'Tuyến Đà Nẵng',
    vehicleId: 'VEHICLE-001',
    scheduledDate: '2099-12-31',
    departureAt: '2099-12-31T08:00:00+07:00',
    stops: [],
    packages: [],
  })
  await db.assignDeliveryRequirement(requirement.id, trip.id)
  await db.optimizeTripRoute(trip.id)

  await renderDetail(trip.id, MANAGER_EMAIL)
  expect(await screen.findByText('1 điểm trễ hạn dự kiến')).toBeOnTheScreen()
  expect(screen.getByText('Trễ hạn dự kiến')).toBeOnTheScreen()
  expect(screen.getByText('Hạn 08:10 31/12')).toBeOnTheScreen()
  expect(screen.getByText(ETA)).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Điểm 1 \/ 1: Xưởng Hoà Khánh, 1 kiện, .*Lô 5, KCN Hoà Khánh, Đà Nẵng, hạn giao 08:10 31\/12\/2099, ưu tiên Cao/)).toBeOnTheScreen()
  expect(await screen.findByText('Yêu cầu giao của chuyến')).toBeOnTheScreen()
  expect(screen.getByLabelText(new RegExp(`^${requirement.id}, Xưởng Hoà Khánh, Cao, `))).toBeOnTheScreen()
  await settle()
})

test('kho đang xếp: banner khoá, tiến độ xếp, tài xế kèm số điện thoại', async () => {
  await renderDetail(LOADING_TRIP, MANAGER_EMAIL)
  expect(await screen.findByText('Kho đang xếp hàng theo phương án đã duyệt nên chuyến đã khoá, không sửa được nữa.')).toBeOnTheScreen()
  expect(screen.getByText(/^Đã xếp 110 \/ \d+ kiện/)).toBeOnTheScreen()
  expect(screen.getByLabelText('Tài xế: Đặng Hoài Nam · 0907 890 123')).toBeOnTheScreen()
  await settle()
})

test('phương án lỗi thời: banner nói lần sửa, người sửa và giá trị trước, sau', async () => {
  await renderDetail(STALE_TRIP)
  expect(await screen.findByText(/^Phương án REV-\S+ đã lỗi thời: xe hoặc kiện đã đổi sau lần tối ưu\./)).toBeOnTheScreen()
  expect(screen.getByText(/Nguyễn Thanh Tùng — PKG-001 Kiện nước giặt 4 can · Số lượng từ 80 thành 86/)).toBeOnTheScreen()
  await settle()
})

test('chuyến đang vận chuyển: nút chính mở Giám sát chuyến; nút quay lại', async () => {
  await signInAs(DISPATCHER_EMAIL)
  const trips = await getMockDb().listTrips()
  const running = trips.find((trip) => trip.phase === 'delivering')
  if (running === undefined) throw new Error('seed không có chuyến đang vận chuyển')
  await renderDetail(running.id)
  await fireEvent.press(await screen.findByRole('button', { name: 'Giám sát chuyến' }))
  expect(router.push).toHaveBeenCalledWith(liveTripPath(running.id))
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }))
  expect(router.back).toHaveBeenCalled()
  await settle()
})

test('chuyến của công ty khác: lỗi kèm thử lại', async () => {
  await renderDetail('TRIP-PN-001')
  expect(await screen.findByText('Không tải được dữ liệu')).toBeOnTheScreen()
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
  await settle()
})
