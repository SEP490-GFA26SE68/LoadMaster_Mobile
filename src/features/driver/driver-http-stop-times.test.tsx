import { screen } from '@testing-library/react-native'

import { backend, ok, onTrip, TRIP } from '@/test/driver-backend'
import { renderApp } from '@/test/render'

import { serverStopTiming, tripStopsOf, type DriverTripStopsDto } from './driver-http-stop-times'
import { EtaSourceLine } from './StopTimingParts'

/** Ba điểm của chuyến 41: điểm 1 đã giao, điểm 2 (điểm hiện tại) đã đến, điểm 3 có giờ đến theo GPS. Giờ là giờ Việt Nam. */
const STOPS: DriverTripStopsDto = {
  tripId: 41,
  status: 'IN_TRANSIT',
  location: { source: 'GPS' },
  refreshMs: 15_000,
  stops: [
    stop(1, 'Kho Sóng Thần', { status: 'COMPLETED', actualArrival: '2026-10-16T08:10:00' }),
    stop(2, 'Điện máy Xanh Biên Hoà', { status: 'ARRIVED', actualArrival: '2026-10-16T09:15:00', deadline: '2026-10-16T09:00:00' }),
    stop(3, 'Co.op Dĩ An', {
      plannedArrival: '2026-10-16T10:30:00',
      plannedStatus: 'OK',
      eta: '2026-10-16T10:50:00',
      etaStatus: 'AT_RISK',
      deadline: '2026-10-16T11:00:00',
    }),
  ],
}

function stop(stopSequence: number, stopName: string, extra: Partial<NonNullable<DriverTripStopsDto['stops']>[number]> = {}) {
  return {
    stopId: 900 + stopSequence,
    stopSequence,
    stopName,
    address: '',
    status: 'PENDING',
    packageCount: 4,
    plannedArrival: null,
    actualArrival: null,
    deadline: null,
    plannedStatus: null,
    eta: null,
    etaStatus: null,
    ...extra,
  }
}

describe('giờ đến và hạn giao theo máy chủ', () => {
  test('đã đến: giờ đến thật và kịp / trễ hạn; chưa đến: giờ theo GPS, không GPS thì giờ kế hoạch', () => {
    const trip = tripStopsOf(STOPS)
    const [, arrived, next] = trip.stops
    expect(serverStopTiming(arrived!, trip.location)).toEqual({
      deadline: '2026-10-16T09:00:00+07:00',
      arrival: { at: '2026-10-16T09:15:00+07:00', onTime: false },
      expected: undefined,
    })
    expect(serverStopTiming(next!, trip.location).expected).toEqual({ eta: '2026-10-16T10:50:00+07:00', source: 'GPS', status: 'AT_RISK' })
    expect(serverStopTiming(next!, null).expected).toEqual({ eta: '2026-10-16T10:30:00+07:00', source: 'PLAN', status: 'OK' })
    expect(serverStopTiming({ ...next!, plannedArrival: undefined }, null)).toEqual({ deadline: '2026-10-16T11:00:00+07:00', arrival: undefined, expected: undefined })
  })

  test('màn điểm giao: giờ của điểm đang giao, danh sách điểm có tên và giờ, biết điểm kế tiếp, đọc lại theo nhịp máy chủ', async () => {
    const { driver, calls } = backend(onTrip({ 'GET /api/driver/trips/41/stops': () => ok(STOPS) }))
    const result = await driver.fetchTripScreen('41')
    if (result.kind !== 'stop') throw new Error('phải mở điểm giao')
    const view = result.screen
    expect(calls.some((call) => call.path === '/api/driver/trips/41/stops')).toBe(true)
    expect(view.timing?.arrival).toEqual({ at: '2026-10-16T09:15:00+07:00', onTime: false })
    expect(view.etaFromServer).toBe(true)
    expect(view.stops.map(({ number, name, done, timing }) => [number, name, done, timing?.expected?.source])).toEqual([
      [1, 'Kho Sóng Thần', true, undefined],
      [2, 'Điện máy Xanh Biên Hoà', false, undefined],
      [3, 'Co.op Dĩ An', false, 'GPS'],
    ])
    expect(view.completion).toMatchObject({ next: { number: 3, name: 'Co.op Dĩ An' }, nextKnown: true })
    expect(view.refreshMs).toBe(15_000)
  })

  test('máy chủ không trả giờ đến: màn điểm giao vẫn mở, không có phần giờ', async () => {
    const { driver } = backend(onTrip())
    const result = await driver.fetchTripScreen('41')
    if (result.kind !== 'stop') throw new Error('phải mở điểm giao')
    expect(result.screen.timing).toBeUndefined()
    expect(result.screen.etaFromServer).toBeUndefined()
    expect(result.screen.completion.nextKnown).toBe(false)
  })

  test('Chuyến của tôi: thẻ chuyến đang chạy có các điểm và giờ của máy chủ; chuyến đã giao thì không đọc giờ', async () => {
    const { driver, calls } = backend(onTrip({ 'GET /api/driver/trips/41/stops': () => ok(STOPS) }))
    const { groups } = await driver.fetchMyTrips()
    const [row] = groups.inTransit
    expect(row).toMatchObject({ id: String(TRIP.tripId), etaFromServer: true, etaSources: ['GPS'] })
    expect(row?.stops.map(({ number, done, packageCount }) => [number, done, packageCount])).toEqual([
      [1, true, 4],
      [2, false, 4],
      [3, false, 4],
    ])
    expect(calls.filter((call) => call.path.endsWith('/stops')).map((call) => call.path)).toEqual(['/api/driver/trips/41/stops'])
  })

  test('dòng nguồn: giờ máy chủ tính không kèm MOCK RESULT, giờ của mock thì có', async () => {
    const server = await renderApp(<EtaSourceLine sources={['GPS']} mock={false} />)
    expect(await screen.findByText(/GPS/)).toBeTruthy()
    expect(screen.queryByText('MOCK RESULT')).toBeNull()
    await server.unmount()
    await renderApp(<EtaSourceLine sources={['GPS']} />)
    expect(await screen.findByText('MOCK RESULT')).toBeTruthy()
  })
})
