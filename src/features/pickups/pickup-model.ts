import type { ReactNode } from 'react'

import type { PickupRequest, PickupRequestInput } from '@/lib/mock-db'

import type { StopRef } from './pickup-stops'

/** Một yêu cầu nhận hàng dọc đường kèm họ tên người gửi, để thẻ yêu cầu của chuyến đọc được (như `PickupRow` của web). */
export type PickupRow = { readonly request: PickupRequest; readonly createdByName: string | null }

/**
 * Kết quả gửi một yêu cầu nhận: yêu cầu kho đã kiểm mười luật, và các điểm của chuyến lúc đó — câu của luật 2 gọi tên điểm được bảo vệ
 * (`stopLabeler`). Bản web trả riêng yêu cầu; màn tài xế trên điện thoại không có sẵn mã các điểm của chuyến.
 */
export type PickupRequestResult = { readonly request: PickupRequest; readonly stops: readonly StopRef[] }

/** Lệnh gửi yêu cầu nhận của nguồn đang dùng (tài xế: `driver-api`; điều phối viên: `monitoring-api`). */
export type PickupCreate = {
  readonly isPending: boolean
  mutateAsync(input: PickupRequestInput): Promise<PickupRequestResult>
}

/**
 * Nội dung của một tờ trượt dưới dạng dữ liệu: tiêu đề, mô tả, đang ghi, hàng nút chân tờ, thân tờ. Nhờ vậy một `Sheet` duy nhất hiện
 * được nhiều việc nối nhau (tờ "Thêm" của tài xế) mà không phải đóng tờ này rồi mở tờ khác — trên iOS, mở một Modal trong lúc Modal
 * khác đang đóng không chắc hiện được.
 */
export type SheetView = {
  readonly title: string
  readonly description?: string
  readonly busy: boolean
  readonly footer: ReactNode
  readonly body: ReactNode
}

/** Kết quả duyệt: yêu cầu đã duyệt và các kiện kho kiện vừa tạo cho nó, kèm mã QR — bên gửi dán nhãn theo các mã đó. */
export type PickupApprovalResult = {
  readonly request: PickupRequest
  readonly packages: readonly { readonly id: string; readonly packageCode: string; readonly qrToken: string }[]
}
