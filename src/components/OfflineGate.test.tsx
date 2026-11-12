import { onlineManager } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react-native'

import { renderApp } from '@/test/render'

import { Button } from './Button'
import { OfflineGate } from './OfflineGate'
import { Screen } from './Screen'

// Tài xế đọc ghi backend, kho vẫn là kho mẫu
jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, driver: 'http', warehouse: 'mock' } } }
})

function Work({ feature }: { feature: 'driver' | 'warehouse' }) {
  return (
    <OfflineGate feature={feature}>
      <Screen title="Điểm giao">
        <Button write onPress={() => undefined}>
          Hoàn tất điểm giao
        </Button>
        <Button variant="secondary" onPress={() => undefined}>
          Gọi khách
        </Button>
      </Screen>
    </OfflineGate>
  )
}

afterEach(async () => {
  await act(async () => onlineManager.setOnline(true))
})

describe('OfflineGate', () => {
  it('mất mạng: dải "Mất kết nối" và nút ghi mờ kèm lý do; nút khác vẫn bấm được; có mạng lại thì mở lại', async () => {
    await renderApp(<Work feature="driver" />)
    expect(screen.queryByText(/Mất kết nối/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeEnabled()

    await act(async () => onlineManager.setOnline(false))
    expect(screen.getByText(/Mất kết nối. Màn đang hiện/)).toBeOnTheScreen()
    const write = screen.getByRole('button', { name: 'Hoàn tất điểm giao' })
    expect(write).toBeDisabled()
    expect(write.props.accessibilityHint).toBe('Mất kết nối — chờ có mạng lại để ghi.')
    expect(screen.getByRole('button', { name: 'Gọi khách' })).toBeEnabled()

    await act(async () => onlineManager.setOnline(true))
    expect(screen.queryByText(/Mất kết nối/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeEnabled()
  })

  it('feature chạy trên kho mẫu không bị chặn khi mất mạng', async () => {
    await renderApp(<Work feature="warehouse" />)
    await act(async () => onlineManager.setOnline(false))
    expect(screen.queryByText(/Mất kết nối/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeEnabled()
  })

  it('nói bằng tiếng Anh khi chọn en', async () => {
    await renderApp(<Work feature="driver" />, { locale: 'en' })
    await act(async () => onlineManager.setOnline(false))
    expect(screen.getByText(/No connection. This screen/)).toBeOnTheScreen()
  })
})
