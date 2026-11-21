import { fireEvent } from '@testing-library/react-native'

import { renderApp } from '@/test/render'

import { RouteMap } from './RouteMap'

const depot = { name: 'Kho Long Bình', lat: 10.78, lng: 106.7 }
const stops = [{ id: '1', number: 1, name: 'Biên Hoà', lat: 10.95, lng: 106.82 }]

test('nút phóng lớn mở modal bản đồ lớn và Đóng tắt modal', async () => {
  const view = await renderApp(<RouteMap label="Bản đồ tuyến TRIP-2026-0914" depot={depot} stops={stops} />)

  expect(view.getByLabelText('Bản đồ tuyến TRIP-2026-0914')).toBeOnTheScreen()
  expect(view.queryByRole('header', { name: 'Bản đồ tuyến' })).toBeNull()
  expect(view.queryByLabelText('Bản đồ phóng lớn: Bản đồ tuyến TRIP-2026-0914')).toBeNull()

  await fireEvent.press(view.getByRole('button', { name: 'Phóng lớn bản đồ' }))
  expect(view.getByRole('header', { name: 'Bản đồ tuyến' })).toBeOnTheScreen()
  expect(view.getByLabelText('Bản đồ phóng lớn: Bản đồ tuyến TRIP-2026-0914')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Đóng' })).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('button', { name: 'Đóng' }))
  expect(view.queryByRole('header', { name: 'Bản đồ tuyến' })).toBeNull()
  expect(view.queryByLabelText('Bản đồ phóng lớn: Bản đồ tuyến TRIP-2026-0914')).toBeNull()
})

test('HUD hiện bước kế và Sau đó; kéo map thì hiện Về giữa', async () => {
  const view = await renderApp(
    <RouteMap
      label="Bản đồ tuyến TRIP-2026-0914"
      depot={depot}
      stops={stops}
      followVehicle
      hud={{ next: 'Còn 300 m · Rẽ phải', then: 'Sau đó Đi thẳng', remaining: '2 phút · 1,2 km', speed: '40 km/h' }}
    />,
  )

  expect(view.getByText('Còn 300 m · Rẽ phải')).toBeOnTheScreen()
  expect(view.getByText('Sau đó Đi thẳng')).toBeOnTheScreen()
  expect(view.getByText('2 phút · 1,2 km')).toBeOnTheScreen()
  expect(view.getByText('40 km/h')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Về giữa' })).toBeNull()

  await fireEvent.press(view.getByRole('button', { name: 'Phóng lớn bản đồ' }))
  expect(view.getByRole('header', { name: 'Bản đồ tuyến' })).toBeOnTheScreen()
  expect(view.getAllByText('Còn 300 m · Rẽ phải').length).toBeGreaterThanOrEqual(1)
  expect(view.getAllByText('Sau đó Đi thẳng').length).toBeGreaterThanOrEqual(1)
  expect(view.getAllByText('2 phút · 1,2 km').length).toBeGreaterThanOrEqual(1)

  await fireEvent(view.getByTestId('route-map-nav'), 'message', { nativeEvent: { data: 'unfollowed' } })
  expect(view.getAllByRole('button', { name: 'Về giữa' }).length).toBeGreaterThanOrEqual(1)
})

test('Đóng sau Về giữa trả bản thu nhỏ, không kẹt modal', async () => {
  const view = await renderApp(
    <RouteMap
      label="Bản đồ tuyến TRIP-2026-0914"
      depot={depot}
      stops={stops}
      followVehicle
      hud={{ next: 'Còn 300 m · Rẽ phải', remaining: '2 phút · 1,2 km', speed: '0 km/h' }}
    />,
  )

  await fireEvent.press(view.getByRole('button', { name: 'Phóng lớn bản đồ' }))
  await fireEvent(view.getByTestId('route-map-nav'), 'message', { nativeEvent: { data: 'unfollowed' } })
  await fireEvent.press(view.getByRole('button', { name: 'Về giữa' }))
  await fireEvent.press(view.getByRole('button', { name: 'Đóng' }))

  expect(view.queryByRole('header', { name: 'Bản đồ tuyến' })).toBeNull()
  expect(view.queryByLabelText('Bản đồ phóng lớn: Bản đồ tuyến TRIP-2026-0914')).toBeNull()
  expect(view.getByLabelText('Bản đồ tuyến TRIP-2026-0914')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Phóng lớn bản đồ' })).toBeOnTheScreen()
})
