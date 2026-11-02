import { configure, fireEvent, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { useAuth } from '@/features/auth/AuthProvider'
import * as monitoringApi from '@/features/monitoring/monitoring-api'
import { liveTripPath } from '@/features/monitoring/live-routes'
import { tripDetailPath } from '@/features/trips/trip-routes'
import { router } from '@/test/native-mocks'
import { DISPATCHER_EMAIL, MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored, signInAs } from '@/test/render'

import { NotificationBell } from './NotificationBell'
import { resetReadNotifications } from './notification-read'
import { NotificationsScreen } from './NotificationsScreen'

configure({ asyncUtilTimeout: 5000 })

/** Tài xế của chuyến đang chạy `TRIP-009` (Ngô Văn Bảo, `US-0006`). */
const RUNNING_DRIVER_EMAIL = 'bao.ngo@loadmaster.vn'
const RUNNING_TARGET = 'Chuyến TRIP-009 · Tuyến Thủ Dầu Một – Sóng Thần'

/** Như bộ điều hướng gốc của app: đang mở lại phiên thì chưa vẽ gì, mở xong mới vẽ chuông và màn của người đăng nhập. */
function AfterRestore({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  return status === 'restoring' ? null : children
}

const renderNotifications = (email: string) =>
  renderOfficeScreen(
    <AfterRestore>
      <NotificationBell />
      <NotificationsScreen />
    </AfterRestore>,
    { email },
  )

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tên đọc của một dòng: "Chưa đọc" khi chưa đọc, giờ · ngày (giờ thật của máy chạy test), rồi các dòng chữ. */
const rowName = (unread: boolean, ...lines: string[]) => new RegExp(`^${unread ? 'Chưa đọc, ' : ''}[^,]+, ${lines.map(escape).join(', ')}$`)

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetReadNotifications()
})

test('tài xế báo sự cố chuyến: chuông điều phối viên báo chưa đọc, dòng mở màn giám sát chuyến và thành đã đọc', async () => {
  await signInAs(RUNNING_DRIVER_EMAIL)
  await getMockDb().reportTripException('TRIP-009', { type: 'TRAFFIC', description: 'Kẹt xe cầu vượt Sóng Thần', delayMinutes: 30 })
  await renderNotifications(DISPATCHER_EMAIL)

  expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
  const lines = [
    'Báo sự cố chuyến',
    RUNNING_TARGET,
    'Người làm: Ngô Văn Bảo',
    'Sự cố: EXC-001',
    'Loại sự cố: Tắc đường',
    'Dự kiến chậm (phút): 30',
    'Điểm giao: 2',
    'Ghi chú: Kẹt xe cầu vượt Sóng Thần',
  ]
  const row = screen.getByRole('button', { name: rowName(true, ...lines) })
  expect(row.props.accessibilityHint).toBe('Mở giám sát chuyến TRIP-009')

  await fireEvent.press(row)
  expect(router.push).toHaveBeenCalledWith(liveTripPath('TRIP-009'))
  expect(await screen.findByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
  expect(screen.getByRole('button', { name: rowName(false, ...lines) })).toBeOnTheScreen()
})

test('điều phối viên huỷ chuyến: quản lý công ty nhận, dòng mở Chi tiết chuyến', async () => {
  await signInAs(DISPATCHER_EMAIL)
  const db = getMockDb()
  await db.cancelTrip('TRIP-012', 'Khách hoãn nhận hàng')
  const { name } = await db.getTrip('TRIP-012')
  await renderNotifications(MANAGER_EMAIL)

  expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
  const row = screen.getByRole('button', { name: new RegExp(`^Chưa đọc, [^,]+, Huỷ chuyến, ${escape(`Chuyến TRIP-012 · ${name}`)}, Người làm: Nguyễn Thanh Tùng, .*Lý do: Khách hoãn nhận hàng`) })
  await fireEvent.press(row)
  expect(router.push).toHaveBeenCalledWith(tripDetailPath('TRIP-012'))
})

test('việc chính mình làm không thành thông báo', async () => {
  await signInAs(DISPATCHER_EMAIL)
  await getMockDb().cancelTrip('TRIP-012', 'Khách hoãn nhận hàng')
  await renderNotifications(DISPATCHER_EMAIL)

  expect(await screen.findByText('Không có thông báo nào trong 7 ngày qua.')).toBeOnTheScreen()
  expect(screen.getByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
})

test('nguồn dữ liệu của giám sát chưa có thông báo: không có chuông, màn nói không làm được', async () => {
  const capabilities = jest
    .spyOn(monitoringApi, 'monitoringCapabilities')
    .mockReturnValue({ exceptions: true, reroute: true, escalation: true, pickups: true, notifications: false })
  try {
    await renderNotifications(DISPATCHER_EMAIL)
    expect(await screen.findByText('Máy chủ chưa làm được việc này.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /^Thông báo/ })).toBeNull()
  } finally {
    capabilities.mockRestore()
  }
})
