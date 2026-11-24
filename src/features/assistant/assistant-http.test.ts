import { ApiError } from '@/data/http'
import { fail, failure, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpAssistantApi } from './assistant-http'
import type { AssistantQuestion } from './assistant-model'

const PATH = 'POST /api/assistant/messages'

const REPLY = {
  conversationId: 'c-1',
  reply: 'Chuyến TRIP-0041 đang chạy.',
  uiActions: [{ type: 'focusPackage', packageCode: 'PK-1' }],
  links: [{ label: 'Chuyến của tôi', to: '/tai-xe' }],
  handoff: { offered: false, ticketCode: null },
  usage: { inputTokens: 10, outputTokens: 5 },
}

function assistantOn(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, assistant: httpAssistantApi({ client: () => client }) }
}

const question = (extra: Partial<AssistantQuestion> = {}): AssistantQuestion => ({
  message: '  Hôm nay tôi chạy chuyến nào? ',
  locale: 'vi',
  conversationId: null,
  page: { path: '/tai-xe', title: 'Chuyến của tôi' },
  ...extra,
})

describe('httpAssistantApi', () => {
  test('gửi câu hỏi tới POST /api/assistant/messages kèm ngôn ngữ và màn đang mở; câu trả lời bỏ lệnh của khung 3D', async () => {
    const { assistant, calls } = assistantOn({ [PATH]: () => ok(REPLY) })
    await expect(assistant.ask(question())).resolves.toEqual({
      conversationId: 'c-1',
      text: 'Chuyến TRIP-0041 đang chạy.',
      links: [{ label: 'Chuyến của tôi', to: '/tai-xe' }],
      handoff: { offered: false, ticketCode: null },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.headers.Authorization).toBe('Bearer TOKEN')
    expect(calls[0]?.body).toEqual({ message: '  Hôm nay tôi chạy chuyến nào? ', locale: 'vi', page: { path: '/tai-xe', title: 'Chuyến của tôi' } })
  })

  test('nói tiếp hội thoại thì gửi conversationId; đường dẫn máy chủ không nhận thì không gửi màn đang mở', async () => {
    const { assistant, calls } = assistantOn({ [PATH]: () => ok({ ...REPLY, links: null, handoff: null }) })
    const reply = await assistant.ask(question({ conversationId: 'c-1', page: { path: '/kho?chuyen=41', title: 'Kho' }, locale: 'en' }))
    expect(calls[0]?.body).toEqual({ conversationId: 'c-1', message: '  Hôm nay tôi chạy chuyến nào? ', locale: 'en' })
    expect(reply.links).toEqual([])
    expect(reply.handoff).toEqual({ offered: false, ticketCode: null })
  })

  test('máy chủ không còn nhận hội thoại cũ (404): mở hội thoại mới một lần', async () => {
    const { assistant, calls } = assistantOn({
      [PATH]: (call) => ((call.body as { conversationId?: string }).conversationId === undefined ? ok(REPLY) : fail(404, 'RESOURCE_NOT_FOUND')),
    })
    await expect(assistant.ask(question({ conversationId: 'cu' }))).resolves.toMatchObject({ conversationId: 'c-1' })
    expect(calls.map((call) => (call.body as { conversationId?: string }).conversationId)).toEqual(['cu', undefined])
  })

  test('máy chủ chưa có trợ lý (404 cho hội thoại mới) là ASSISTANT_UNAVAILABLE; mã ASSISTANT_* của máy chủ giữ nguyên', async () => {
    const missing = assistantOn({})
    const error = await failure(() => missing.assistant.ask(question()))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('ASSISTANT_UNAVAILABLE')

    const limited = assistantOn({ [PATH]: () => fail(429, 'ASSISTANT_RATE_LIMITED') })
    expect((await failure(() => limited.assistant.ask(question()))).code).toBe('ASSISTANT_RATE_LIMITED')
    const off = assistantOn({ [PATH]: () => fail(503, 'ASSISTANT_UNAVAILABLE') })
    expect((await failure(() => off.assistant.ask(question()))).code).toBe('ASSISTANT_UNAVAILABLE')
  })
})
