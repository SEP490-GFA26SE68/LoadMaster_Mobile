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
    stops: [{ number: 1, name: 'Biên Hoà', done: false, kind: 'DELIVERY', packageCount: undefined, timing: undefined }],
    stopCount: 1,
    arrived: false,
    arrivedAt: undefined,
    timing: undefined,
    items: [],
    pickupItems: [],
    leftAtWarehouse: 0,
    total: 0,
    doneCount: 0,
    issueCount: 0,
    remaining: 0,
    verifiable: 0,
    pendingConfirms: 0,
    completion: { delivered: 0, returned: [], picked: 0, issues: 0, next: undefined, nextKnown: true },
    names: {},
    hasPickupStops: false,
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
