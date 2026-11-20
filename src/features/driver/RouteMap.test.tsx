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

  await fireEvent.press(view.getAllByRole('button', { name: 'Đóng' })[0]!)
  expect(view.queryByRole('header', { name: 'Bản đồ tuyến' })).toBeNull()
  expect(view.queryByLabelText('Bản đồ phóng lớn: Bản đồ tuyến TRIP-2026-0914')).toBeNull()
})
