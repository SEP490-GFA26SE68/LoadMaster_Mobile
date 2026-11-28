/**
 * Hợp đồng của `POST /api/assistant/messages` (trợ lý trong ứng dụng, cùng endpoint với bản web). Chỉ `assistant-http.ts` import file này;
 * kiểu của app nằm ở `assistant-model.ts`.
 */

/** Màn đang mở: máy chủ chỉ đưa `path` cho mô hình (`^/[A-Za-z0-9/_-]{0,120}$`). */
export type AssistantPageDto = { readonly path: string; readonly title: string }

export type AssistantMessageRequestDto = {
  readonly conversationId?: string
  /** Không rỗng, tối đa 20.000 ký tự. */
  readonly message: string
  readonly locale: string
  readonly page?: AssistantPageDto
}

export type AssistantLinkDto = { readonly label: string; readonly to: string }

/** `offered`: trợ lý đang hỏi có chuyển cho đội hỗ trợ không. `ticketCode`: mã yêu cầu hỗ trợ đã tạo. */
export type HandoffDto = { readonly offered: boolean; readonly ticketCode: string | null }

export type AssistantReplyDto = {
  readonly conversationId: string
  readonly reply: string
  /** Lệnh cho khung 3D của Planner bản web — app bỏ qua. */
  readonly uiActions?: readonly unknown[] | null
  readonly links?: readonly AssistantLinkDto[] | null
  readonly handoff?: HandoffDto | null
  readonly usage?: { readonly inputTokens: number; readonly outputTokens: number } | null
}
