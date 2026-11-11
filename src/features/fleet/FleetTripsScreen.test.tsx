import { screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'

import { FleetTripsScreen } from './FleetTripsScreen'

const dispatcher = DEMO_ACCOUNTS.find((account) => account.role === 'dispatcher')

describe('màn chuyến công ty', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
  })

  test('điều phối viên thấy danh sách chuyến', async () => {
    await getMockDb().authenticate(dispatcher?.email ?? '', SEED_PASSWORD)
    const trips = await getMockDb().listTrips()
    await renderApp(<FleetTripsScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Chuyến' })).toBeOnTheScreen()
    expect(await screen.findByText(trips[0]?.id ?? 'TRIP-001')).toBeOnTheScreen()
  })
})
