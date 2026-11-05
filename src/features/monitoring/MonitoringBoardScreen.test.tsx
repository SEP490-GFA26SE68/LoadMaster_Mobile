import { screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'

import { MonitoringBoardScreen } from './MonitoringBoardScreen'

const dispatcher = DEMO_ACCOUNTS.find((account) => account.role === 'dispatcher')

describe('màn giám sát', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
  })

  test('điều phối viên mở được bảng giám sát', async () => {
    await getMockDb().authenticate(dispatcher?.email ?? '', SEED_PASSWORD)
    await renderApp(<MonitoringBoardScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Giám sát' })).toBeOnTheScreen()
  })
})
