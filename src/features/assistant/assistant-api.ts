/**
 * Hàm → endpoint backend; nguồn backend ở `assistant-http.ts`, kho mẫu không có trợ lý.
 *   askAssistant            POST /api/assistant/messages
 */
import { createAdapter } from '@/data/adapter'
import { ApiError } from '@/data/http'

import { httpAssistantApi } from './assistant-http'
import type { AssistantCapabilities, AssistantQuestion, AssistantReply } from './assistant-model'

/** Hợp đồng dữ liệu của trợ lý AI Lumo. Màn và hook chỉ biết hợp đồng này, không biết nguồn. */
export type AssistantApi = {
  readonly capabilities: AssistantCapabilities
  ask(question: AssistantQuestion): Promise<AssistantReply>
}

/** Kho mẫu không có mô hình nào trả lời: không có nút trợ lý; gọi tới là `NOT_SUPPORTED`, không có câu trả lời giả. */
const mockAssistantApi = (): AssistantApi => ({
  capabilities: { available: false },
  ask: () => Promise.reject(new ApiError('NOT_SUPPORTED')),
})

const adapter = createAdapter<AssistantApi>('assistant', { mock: mockAssistantApi, http: () => httpAssistantApi() })

/** Trợ lý dùng được với nguồn đang dùng (chỉ máy chủ). */
export function assistantCapabilities(): AssistantCapabilities {
  return adapter().capabilities
}

// POST /api/assistant/messages
export function askAssistant(question: AssistantQuestion): Promise<AssistantReply> {
  return adapter().ask(question)
}
