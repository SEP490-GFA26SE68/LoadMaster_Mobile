import { act, renderHook } from '@testing-library/react-native'

import { setThinkingPace } from '@/features/marketing/assistant/assistant-pace'

import { askAssistant } from './assistant-api'
import type { AssistantReply } from './assistant-model'
import { resetAssistantSessionForTest, useAssistantSession } from './assistant-session'

/*
 * Nhịp "đang trả lời" với nhịp thật (`src/test/setup.ts` đặt nhịp 0 cho mọi test khác): câu trả lời chỉ vào cuộc trò chuyện khi đã qua
 * đích 2–6 giây tính từ lúc gửi, `pending` (màn vẽ "Lumo đang trả lời…") giữ suốt lúc chờ; câu về muộn hơn đích thì hiện ngay; lỗi báo
 * ngay. Máy chủ giả trả câu sau một khoảng do test chọn; đồng hồ giả của Jest (cả `setTimeout` lẫn `Date`).
 */
jest.mock('./assistant-api', () => ({ askAssistant: jest.fn() }))

const ask = jest.mocked(askAssistant)
const OWNER = 'US-0001'
const CONTEXT = { locale: 'vi' as const, page: null }

function reply(text: string): AssistantReply {
  return { conversationId: 'c-1', text, links: [], handoff: { offered: false, ticketCode: null } }
}

function respond(afterMs: number, result: AssistantReply | Error) {
  ask.mockImplementation(
    () => new Promise((resolve, reject) => setTimeout(() => (result instanceof Error ? reject(result) : resolve(result)), afterMs)),
  )
}

/** Tua tới đúng `ms` kể từ lúc gửi (đồng hồ giả bắt đầu ở 0). */
async function advanceTo(ms: number) {
  await act(() => jest.advanceTimersByTimeAsync(ms - Date.now()))
}

async function send(question: string) {
  const hook = await renderHook(() => useAssistantSession(OWNER))
  await act(() => {
    void hook.result.current.ask(question, CONTEXT)
  })
  const kinds = () => hook.result.current.session.entries.map((entry) => entry.kind)
  return { hook, kinds, pending: () => hook.result.current.session.pending }
}

beforeEach(() => {
  jest.useFakeTimers({ now: 0 })
  setThinkingPace(null)
  resetAssistantSessionForTest()
})

afterEach(() => {
  jest.useRealTimers()
  setThinkingPace(() => 0)
  resetAssistantSessionForTest()
})

test('câu về sớm chờ tới đích: "đang trả lời" suốt lúc chờ, câu hiện đúng lúc đích', async () => {
  // Đích: 2000 + 10 × 40 + 6 × 100 = 3000 ms; câu về lúc 1500 ms
  respond(1_500, reply('b'.repeat(100)))
  const { kinds, pending } = await send('a'.repeat(40))

  await advanceTo(1_500)
  expect(ask).toHaveBeenCalledTimes(1)
  expect(kinds()).toEqual(['question'])
  expect(pending()).toBe(true)

  await advanceTo(2_999)
  expect(kinds()).toEqual(['question'])
  expect(pending()).toBe(true)

  await advanceTo(3_000)
  expect(kinds()).toEqual(['question', 'answer'])
  expect(pending()).toBe(false)
})

test('câu về muộn hơn đích thì hiện ngay khi về, không chờ thêm', async () => {
  respond(7_000, reply('b'.repeat(100)))
  const { kinds, pending } = await send('a'.repeat(40))

  await advanceTo(6_999)
  expect(kinds()).toEqual(['question'])
  expect(pending()).toBe(true)

  await advanceTo(7_000)
  expect(kinds()).toEqual(['question', 'answer'])
  expect(pending()).toBe(false)
})

test('lỗi báo ngay, không chờ tới đích', async () => {
  respond(500, new Error('máy chủ từ chối'))
  const { kinds, pending } = await send('a'.repeat(40))

  await advanceTo(500)
  expect(kinds()).toEqual(['question', 'error'])
  expect(pending()).toBe(false)
})

test('bắt đầu lại trong lúc chờ thì câu trả lời về muộn bị bỏ', async () => {
  respond(1_000, reply('cũ'))
  const { hook, kinds } = await send('a'.repeat(40))
  await advanceTo(1_000)
  await act(() => hook.result.current.restart())

  await advanceTo(6_000)
  expect(kinds()).toEqual([])
})
