import { api, ApiError, isApiError, type ApiClient } from '@/data/http'

import type { AssistantApi } from './assistant-api'
import type { AssistantMessageRequestDto, AssistantReplyDto } from './assistant-http-dto'
import type { AssistantQuestion, AssistantReply } from './assistant-model'

/** Một lượt trả lời có thể gọi công cụ vài vòng: chờ lâu hơn giới hạn mặc định của client (như bản web). */
export const ASSISTANT_TIMEOUT_MS = 45_000

/** Máy chủ chỉ nhận đường dẫn dạng này cho `page.path`; đường dẫn khác thì không gửi màn đang mở. */
const PAGE_PATH = /^\/[A-Za-z0-9/_-]{0,120}$/

function replyOf(dto: AssistantReplyDto): AssistantReply {
  return {
    conversationId: dto.conversationId,
    text: dto.reply,
    links: (dto.links ?? []).map(({ label, to }) => ({ label, to })),
    handoff: { offered: dto.handoff?.offered === true, ticketCode: dto.handoff?.ticketCode ?? null },
  }
}

function bodyOf(question: AssistantQuestion, conversationId: string | null): AssistantMessageRequestDto {
  const page = question.page !== null && PAGE_PATH.test(question.page.path) ? question.page : null
  return {
    ...(conversationId === null ? {} : { conversationId }),
    message: question.message,
    locale: question.locale,
    ...(page === null ? {} : { page: { path: page.path, title: page.title } }),
  }
}

const notFound = (error: unknown) => isApiError(error) && error.status === 404

/**
 * Trợ lý trên máy chủ. Máy chủ không còn nhận hội thoại cũ (hội thoại đã xoá, của tài khoản khác: 404) thì mở hội thoại mới một lần, như
 * bản web. Máy chủ không có endpoint trợ lý (404 cho hội thoại mới) là trợ lý chưa dùng được: `ASSISTANT_UNAVAILABLE`, cùng mã máy chủ trả
 * khi trợ lý bị tắt.
 */
export function httpAssistantApi({ client = api }: { client?: () => ApiClient } = {}): AssistantApi {
  const post = async (question: AssistantQuestion, conversationId: string | null) => {
    const body = bodyOf(question, conversationId)
    return replyOf(await client().post<AssistantReplyDto>('/api/assistant/messages', { body, timeoutMs: ASSISTANT_TIMEOUT_MS }))
  }
  const unavailable = (error: unknown): unknown => (notFound(error) ? new ApiError('ASSISTANT_UNAVAILABLE', { status: 404 }) : error)

  return {
    capabilities: { available: true },
    async ask(question) {
      try {
        return await post(question, question.conversationId)
      } catch (error) {
        if (question.conversationId === null || !notFound(error)) throw unavailable(error)
      }
      try {
        return await post(question, null)
      } catch (error) {
        throw unavailable(error)
      }
    },
  }
}
