import { connectNetworkStatus, isOnlineState } from './network'

describe('isOnlineState', () => {
  it('chỉ coi là mất mạng khi máy báo không có kết nối nào', () => {
    expect(isOnlineState({ isConnected: true })).toBe(true)
    expect(isOnlineState({ isConnected: false })).toBe(false)
  })

  it('chưa đo xong (lúc mở app) thì coi là có mạng', () => {
    expect(isOnlineState({ isConnected: null })).toBe(true)
  })
})

describe('connectNetworkStatus', () => {
  it('nối và gỡ được khi NetInfo có sẵn (bản giả trong Jest)', () => {
    const disconnect = connectNetworkStatus()
    expect(typeof disconnect).toBe('function')
    disconnect()
  })
})
