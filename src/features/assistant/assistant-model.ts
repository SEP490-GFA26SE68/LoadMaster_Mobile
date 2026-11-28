import type { Locale } from '@/lib/i18n'

/** Màn đang mở, gửi kèm câu hỏi: đường dẫn theo route của bản web (máy chủ hiểu route web), tiêu đề là tên màn trên app. */
export type AssistantPage = { readonly path: string; readonly title: string }

export type AssistantQuestion = {
  readonly message: string
  readonly locale: Locale
  /** Hội thoại đang nói tiếp; `null` mở hội thoại mới. */
  readonly conversationId: string | null
  readonly page: AssistantPage | null
}

/** Liên kết máy chủ gợi ý, đường dẫn là route của bản web (`/tai-xe`, `/kho`…) — app đổi sang màn của mình hoặc bỏ (`app-links.ts`). */
export type AssistantLink = { readonly label: string; readonly to: string }

/** Máy chủ mời chuyển câu hỏi cho đội hỗ trợ (`offered`), hoặc đã tạo yêu cầu hỗ trợ (`ticketCode`). */
export type AssistantHandoff = { readonly offered: boolean; readonly ticketCode: string | null }

/** Câu trả lời của mô hình. Lệnh giao diện cho khung 3D (`uiActions`) bị bỏ: app không có khung 3D của Planner. */
export type AssistantReply = {
  readonly conversationId: string
  readonly text: string
  readonly links: readonly AssistantLink[]
  readonly handoff: AssistantHandoff
}

export type AssistantCapabilities = {
  /** Nguồn có trợ lý: chỉ máy chủ. Kho mẫu không có trợ lý nên không có nút (không vẽ nút giả). */
  readonly available: boolean
}

/** Tên riêng của linh vật, không dịch: câu nói về Lumo nhận tham số `{name}`. */
export const LUMO_NAME = 'Lumo'
