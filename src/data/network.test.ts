import { isOnlineState } from './network'

describe('isOnlineState', () => {
  it('chỉ coi là mất mạng khi máy báo không có kết nối nào', () => {
    expect(isOnlineState({ isConnected: true })).toBe(true)
    expect(isOnlineState({ isConnected: false })).toBe(false)
  })

  it('chưa đo xong (lúc mở app) thì coi là có mạng', () => {
    expect(isOnlineState({ isConnected: null })).toBe(true)
  })
})
