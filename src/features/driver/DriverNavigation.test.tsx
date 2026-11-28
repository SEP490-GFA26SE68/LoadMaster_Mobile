import { fireEvent } from '@testing-library/react-native'
import { useState } from 'react'
import { Pressable } from 'react-native'

import { AppText } from '@/components/AppText'
import { renderApp } from '@/test/render'

import type { StopScreen } from './driver-model'
import { DriverNavigation } from './DriverNavigation'

const stop = {
  number: 1,
  ref: '1',
  name: 'Biên Hoà',
  address: '1 Phạm Văn Thuận',
  phone: undefined,
  contactName: undefined,
  kind: 'DELIVERY' as const,
  lat: 10.95,
  lng: 106.82,
}

function screenOf(planVersion: number): StopScreen {
  return {
    mode: 'delivering',
    stop,
    stops: [{ number: 1, name: 'Biên Hoà', done: false, packageCount: undefined, timing: undefined }],
    stopCount: 1,
    arrived: false,
    arrivedAt: undefined,
    timing: undefined,
    items: [],
    leftAtWarehouse: 0,
    total: 0,
    doneCount: 0,
    issueCount: 0,
    remaining: 0,
    verifiable: 0,
    pendingConfirms: 0,
    completion: { delivered: 0, returned: [], picked: 0, issues: 0, next: undefined, nextKnown: true },
    names: {},
    refreshMs: null,
    routeMap: {
      depot: { name: 'Kho Long Bình', lat: 10.78, lng: 106.7 },
      stops: [{ id: '1', number: 1, name: 'Biên Hoà', lat: 10.95, lng: 106.82 }],
      planVersion,
    },
  }
}

function Harness() {
  const [version, setVersion] = useState(1)
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Tăng phiên bản" onPress={() => setVersion(2)}>
        <AppText>bump</AppText>
      </Pressable>
      <DriverNavigation screen={screenOf(version)} vehicle={{ lat: 10.86, lng: 106.75, heading: 90 }} />
    </>
  )
}

test('pin GPS hiện trên nhãn bản đồ; tăng planVersion thì có banner tuyến đã đổi', async () => {
  const view = await renderApp(<Harness />)
  expect(await view.findByLabelText(/Xe tại 10.8600, 106.7500/)).toBeOnTheScreen()
  expect(view.getByText('Tuyến phiên bản 1')).toBeOnTheScreen()
  expect(view.queryByText('Điều phối viên đã đổi tuyến. Bản đồ đang theo tuyến mới.')).toBeNull()

  await fireEvent.press(view.getByRole('button', { name: 'Tăng phiên bản' }))
  expect(await view.findByText('Tuyến phiên bản 2')).toBeOnTheScreen()
  expect(view.getByText('Điều phối viên đã đổi tuyến. Bản đồ đang theo tuyến mới.')).toBeOnTheScreen()
})

test('HUD có bước Sau đó, ETA và tốc độ khi đang giao', async () => {
  const view = await renderApp(
    <DriverNavigation
      screen={{
        ...screenOf(1),
        routeMap: {
          depot: { name: 'Kho Long Bình', lat: 10.78, lng: 106.7 },
          stops: [{ id: '1', number: 1, name: 'Biên Hoà', lat: 10.95, lng: 106.82 }],
          planVersion: 1,
          guidanceSteps: [
            { instruction: 'Rẽ phải vào Nguyễn Huệ', maneuver: 'turn-right', distanceMeters: 300, durationSeconds: 40, lat: 10.95, lng: 106.82 },
            { instruction: 'Đi thẳng QL13', maneuver: 'straight', distanceMeters: 8000, durationSeconds: 600, lat: 10.96, lng: 106.83 },
          ],
        },
      }}
      vehicle={{ lat: 10.86, lng: 106.75, heading: 90, speedKmh: 42 }}
    />,
  )

  expect(await view.findByText(/Rẽ phải vào Nguyễn Huệ/)).toBeOnTheScreen()
  expect(view.getByText('Sau đó Đi thẳng QL13')).toBeOnTheScreen()
  expect(view.getByText('42 km/h')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Tắt giọng nói' })).toBeOnTheScreen()
})
