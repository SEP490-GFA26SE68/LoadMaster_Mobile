import { focusManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

import { MAX_POLL_FAILURES, pollInterval, type PolledQuery } from '@/lib/polling'

import { connectAppFocus } from './app-focus'

/** Query giả: mỗi bước ghi một lần đọc thành công hoặc thất bại, như TanStack Query cập nhật ba trường đó. */
function fakeQuery() {
  let clock = 0
  const state = { dataUpdatedAt: 0, errorUpdatedAt: 0, errorUpdateCount: 0 }
  const query: PolledQuery = { state }
  return {
    query,
    succeed: () => {
      state.dataUpdatedAt = ++clock
    },
    fail: () => {
      state.errorUpdatedAt = ++clock
      state.errorUpdateCount += 1
    },
  }
}

describe('nhịp đọc lại khi máy chủ lỗi', () => {
  test('máy chủ trả lời thì giữ nhịp; lỗi liên tiếp thì giãn gấp đôi, đủ năm lần thì dừng; đọc được lại thì về nhịp cũ', () => {
    const { query, succeed, fail } = fakeQuery()
    succeed()
    expect(pollInterval(query, 30_000)).toBe(30_000)
    expect(pollInterval(query, null)).toBe(false)
    fail()
    expect(pollInterval(query, 30_000)).toBe(60_000)
    fail()
    expect(pollInterval(query, 30_000)).toBe(120_000)
    for (let index = 2; index < MAX_POLL_FAILURES; index += 1) fail()
    expect(pollInterval(query, 30_000)).toBe(false)
    succeed()
    expect(pollInterval(query, 30_000)).toBe(30_000)
  })
})

describe('app xuống nền', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    focusManager.setFocused(undefined)
  })

  test('focusManager theo AppState: nền thì không focus (thôi nhịp đọc lại), quay lại thì focus; gỡ thì thôi nghe', () => {
    let listener: ((status: AppStateStatus) => void) | undefined
    const remove = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (status: AppStateStatus) => void
      return { remove } as unknown as ReturnType<typeof AppState.addEventListener>
    })
    const disconnect = connectAppFocus()
    listener?.('background')
    expect(focusManager.isFocused()).toBe(false)
    listener?.('inactive')
    expect(focusManager.isFocused()).toBe(false)
    listener?.('active')
    expect(focusManager.isFocused()).toBe(true)
    disconnect()
    expect(remove).toHaveBeenCalled()
  })
})
