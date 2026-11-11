import { screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'

import { WarehouseTasksScreen } from './WarehouseTasksScreen'

const warehouse = DEMO_ACCOUNTS.find((account) => account.role === 'warehouse')

describe('màn nhiệm vụ kho', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
  })

  test('nhân viên kho thấy tiêu đề và có thể tải danh sách', async () => {
    await getMockDb().authenticate(warehouse?.email ?? '', SEED_PASSWORD)
    await renderApp(<WarehouseTasksScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Nhiệm vụ kho' })).toBeOnTheScreen()
  })
})
