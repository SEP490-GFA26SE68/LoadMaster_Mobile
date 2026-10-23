import type { LabelVerifyMethod, ManualConfirmReason } from '@/lib/mock-db'

/**
 * Kiểu của tờ đối chiếu kiện ba mức (`PackageVerifySheet`), dùng chung cho mọi bước có đối chiếu: tài xế dỡ và nhận dọc đường, kho soạn
 * và xếp hàng. Tờ chỉ vẽ và chuyển mã đi; nơi gọi giữ một `VerifyController` — kiện nào chọn được, mã đúng hay sai, câu kết quả, và khi
 * nào tờ đóng.
 */

/** Kết quả của lần đối chiếu gần nhất, nơi gọi dịch sẵn: hiện trong tờ, trình đọc màn hình đọc được. */
export type VerifyOutcome = { readonly tone: 'success' | 'warning' | 'error'; readonly message: string }

/** Một kiện chọn được ở mức xác nhận tay. */
export type VerifyCandidate = {
  /** Mã nguồn dùng để ghi. */
  readonly id: string
  /** Mã in trên nhãn. */
  readonly label: string
  readonly name: string
  /** Dòng phụ: thứ tự dỡ, yêu cầu nhận, điểm giao. */
  readonly description: string
}

/** Một xác nhận tay: kiện, lý do, ghi chú (bắt buộc khi lý do là "Khác"). */
export type ManualValues = { readonly itemId: string; readonly reason: ManualConfirmReason; readonly note: string | undefined }

/**
 * Nơi gọi điều khiển tờ đối chiếu. **Tờ không tự đóng sau một lần ghi được** — nơi gọi đặt `open`: soạn hàng để tờ mở cho kiện kế tiếp
 * tới khi hết kiện chờ, xếp hàng đóng ngay sau kiện hiện tại, tài xế đóng sau kiện cuối còn chờ của điểm. Tờ chỉ gọi `setOpen(false)`
 * khi người dùng đóng (nút Đóng, nút Back, chạm lớp phủ), và không gọi khi `pending`.
 */
export type VerifyController = {
  readonly open: boolean
  readonly setOpen: (open: boolean) => void
  /** Đang ghi: tờ không đóng được, nút gửi hiện vòng quay. */
  readonly pending: boolean
  readonly result: VerifyOutcome | null
  /** Kiện chọn được ở mức xác nhận tay. Danh sách đổi (vừa ghi một kiện) thì form xác nhận tay bắt đầu lại. */
  readonly candidates: readonly VerifyCandidate[]
  /** Mức 1 (quét) và 2 (gõ mã). `true` khi nguồn đã ghi — ô gõ mã trống lại cho kiện kế tiếp; lỗi thì giữ mã đã gõ để sửa. */
  readonly verify: (method: LabelVerifyMethod, code: string) => Promise<boolean>
  /** Mức 3: một xác nhận tay chờ điều phối viên duyệt. `true` khi nguồn đã ghi. */
  readonly confirmManually: (values: ManualValues) => Promise<boolean>
}
