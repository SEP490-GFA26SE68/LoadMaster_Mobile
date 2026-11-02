import { configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetReadNotifications } from '@/features/bell/notification-read'
import type { OptimizationRequest } from '@/domain/models'
import { runMockOptimization } from '@/services/optimization/mock-optimization'
import { router } from '@/test/native-mocks'
import { DISPATCHER_EMAIL, MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored, signInAs } from '@/test/render'
import { loadTrip } from '@/test/trip-flow'

import { deadlineText } from './deadline-input'
import { liveTripPath } from './live-routes'
import { MonitoringScreen } from './MonitoringScreen'

configure({ asyncUtilTimeout: 5000 })

/** Chuyến Đang vận chuyển duy nhất của Long Bình trong seed (xe đang ở điểm 2, một yêu cầu nhận hàng chờ duyệt). */
const RUNNING_TRIP = 'TRIP-009'
const CARD_START = 'TRIP-009, Tuyến Thủ Dầu Một – Sóng Thần, Thaco Ollin 720 · 61C-339.05 · Tài xế Ngô Văn Bảo, Mô phỏng, '
const card = (rest = '') => new RegExp(`^${CARD_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*${rest}`)
const TRAFFIC = { type: 'TRAFFIC' as const, description: 'Kẹt xe ở ngã tư Vũng Tàu', delayMinutes: 30 }

/** Điều phối viên mẫu báo sự cố trên một chuyến đang chạy, rồi (tuỳ chọn) chuyển nó cho quản lý công ty. */
async function reportIncident(tripId: string, { escalate }: { escalate: boolean }) {
  await signInAs(DISPATCHER_EMAIL)
  const db = getMockDb()
  const exception = await db.reportTripException(tripId, TRAFFIC)
  if (escalate) await db.escalateTripException(tripId, exception.id)
  return exception.id
}

/**
 * Chuyến một điểm giao từ yêu cầu `REQ-006` (như `departedTrip` của test kho bản web): lập, tối ưu tuyến, tối ưu xếp hàng, duyệt, kho xếp
 * xong, xe xuất phát. Hạn của yêu cầu là của seed nên đã qua.
 */
async function departedRequirementTrip(): Promise<string> {
  await signInAs(DISPATCHER_EMAIL)
  const db = getMockDb()
  const created = await db.createTrip({ name: 'Tuyến Dĩ An', vehicleId: 'VEHICLE-005', scheduledDate: '2026-09-16', packages: [], stops: [] })
  await db.assignDeliveryRequirement('REQ-006', created.id)
  await db.optimizeTripRoute(created.id)
  const trip = await db.getTrip(created.id)
  const request: OptimizationRequest = {
    vehicle: await db.getVehicle(trip.vehicleId),
    packages: trip.packages,
    settings: { method: 'MOCK', timeLimitSeconds: 30, randomSeed: 20_260_916, enforceLifo: true, prioritizeLowCenterOfGravity: false },
  }
  const revision = await db.addRevision({ tripId: trip.id, request, result: runMockOptimization(request, { clock: () => 0 }) })
  await db.approveRevision(revision.id, [], { force: true })
  await loadTrip(db, trip.id)
  await db.startDelivery(trip.id)
  return trip.id
}

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetReadNotifications()
})

describe('tab Giám sát của điều phối viên', () => {
  test('một thẻ mỗi chuyến đang chạy, không tab của quản lý; bấm thẻ mở màn giám sát chuyến đó', async () => {
    await renderOfficeScreen(<MonitoringScreen />)

    const tripCard = await screen.findByRole('button', { name: card('1 yêu cầu nhận hàng chờ duyệt$') })
    expect(screen.getByText('1 chuyến đang vận chuyển')).toBeOnTheScreen()
    expect(screen.getByText('Đang ở điểm 2 · Nhà sách Phương Nam Thủ Dầu Một · Đã đến 08:20')).toBeOnTheScreen()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)

    await fireEvent.press(tripCard)
    expect(router.push).toHaveBeenCalledWith(liveTripPath(RUNNING_TRIP))
  })

  test('công tắc lọc kèm số chuyến; không chuyến nào khớp thì nói vậy, "Bỏ lọc" đưa thẻ trở lại', async () => {
    await renderOfficeScreen(<MonitoringScreen />)
    await screen.findByRole('button', { name: card() })

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Có sự cố 0' }))
    expect(await screen.findByText('Không có chuyến khớp bộ lọc.')).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: 'Có sự cố 0' })).toBeChecked()
    expect(screen.queryByRole('button', { name: card() })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Bỏ lọc' }))
    expect(await screen.findByRole('button', { name: card() })).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: 'Có sự cố 0' })).not.toBeChecked()
  })

  test('chuyến có sự cố chưa xử lý: thẻ nói số sự cố và qua được bộ lọc "Có sự cố"', async () => {
    await reportIncident(RUNNING_TRIP, { escalate: false })
    await renderOfficeScreen(<MonitoringScreen />)

    expect(await screen.findByRole('button', { name: card('1 sự cố, 1 yêu cầu nhận hàng chờ duyệt$') })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Có sự cố 1' }))
    expect(screen.getByRole('button', { name: card('1 sự cố') })).toBeOnTheScreen()
    expect(screen.queryByText('Không có chuyến khớp bộ lọc.')).toBeNull()
  })
})

describe('tab Giám sát của quản lý công ty', () => {
  test('hai tab; chưa có sự cố nào chuyển lên thì tab "Sự cố cần xử lý" nói vậy', async () => {
    await renderOfficeScreen(<MonitoringScreen />, { email: MANAGER_EMAIL })

    expect(await screen.findByRole('tab', { name: 'Chuyến đang chạy 1' })).toBeSelected()
    await fireEvent.press(screen.getByRole('tab', { name: 'Sự cố cần xử lý 0' }))
    expect(await screen.findByText('Không có sự cố nào cần xử lý')).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: 'Sự cố cần xử lý 0' })).toBeSelected()
  })

  test('sự cố vừa chuyển lên: dải báo dẫn tới tab; chuyến không có yêu cầu giao nào đang giao thì tờ gia hạn nói vậy', async () => {
    await reportIncident(RUNNING_TRIP, { escalate: true })
    await renderOfficeScreen(<MonitoringScreen />, { email: MANAGER_EMAIL })

    expect(await screen.findByText('1 sự cố đã chuyển lên bạn: liên hệ khách và nhập hạn mới.')).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: 'Sự cố cần xử lý 1' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Xem sự cố cần xử lý' }))

    expect(await screen.findByText('Kẹt xe ở ngã tư Vũng Tàu')).toBeOnTheScreen()
    expect(screen.getByText('Đã chuyển quản lý')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Nhập hạn mới' }))
    expect(await screen.findByRole('header', { name: 'Liên hệ khách và nhập hạn mới' })).toBeOnTheScreen()
    expect(await screen.findByText('Chuyến này không có yêu cầu giao nào đang giao để gia hạn.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Lưu hạn mới' })).toBeNull()
  })

  test('liên hệ khách và nhập hạn mới: ghi chú bắt buộc, kho từ chối hạn đã qua, hạn tương lai thì lưu và sự cố chờ điều phối viên', async () => {
    const tripId = await departedRequirementTrip()
    const exceptionId = await reportIncident(tripId, { escalate: true })
    await renderOfficeScreen(<MonitoringScreen />, { email: MANAGER_EMAIL })

    await fireEvent.press(await screen.findByRole('tab', { name: 'Sự cố cần xử lý 1' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Nhập hạn mới' }))
    const requirement = await screen.findByRole('radio', { name: 'REQ-006 · Kho Bách Hoá Xanh Dĩ An · điểm 1' })
    expect(requirement).toBeChecked()
    const current = deadlineText('2026-09-16T04:00:00.000Z')
    expect(screen.getByLabelText('Ngày của hạn mới')).toHaveDisplayValue(current.date)
    expect(screen.getByLabelText('Giờ của hạn mới')).toHaveDisplayValue(current.time)

    await fireEvent.press(screen.getByRole('button', { name: 'Lưu hạn mới' }))
    expect(await screen.findByText('Ghi lại việc đã liên hệ khách.')).toBeOnTheScreen()

    await fireEvent.changeText(screen.getByLabelText('Đã liên hệ khách'), 'Chị Lan ở kho nhận tin, đồng ý lùi sang chiều mai')
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu hạn mới' }))
    expect(await screen.findByText('Hạn giao phải ở tương lai.')).toBeOnTheScreen()

    const later = deadlineText(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
    await fireEvent.changeText(screen.getByLabelText('Ngày của hạn mới'), later.date)
    await fireEvent.changeText(screen.getByLabelText('Giờ của hạn mới'), later.time)
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu hạn mới' }))

    expect(await screen.findByText('Đã nhập hạn mới cho REQ-006')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Liên hệ khách và nhập hạn mới' })).toBeNull()
    expect(await screen.findByText('Đã nhập hạn mới — chờ điều phối viên xử lý tiếp.')).toBeOnTheScreen()
    const saved = await getMockDb().getDeliveryRequirement('REQ-006')
    expect(deadlineText(saved.deadline)).toStrictEqual(later)
    const exception = (await getMockDb().listTripExceptions(tripId)).find((item) => item.id === exceptionId)
    expect(exception?.status).toBe('ESCALATED')
    expect(exception?.renegotiation?.contactNote).toBe('Chị Lan ở kho nhận tin, đồng ý lùi sang chiều mai')
  })
})
