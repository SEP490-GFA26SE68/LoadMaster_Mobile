/**
 * Tờ đối chiếu kiện ba mức (`features/driver/PackageVerifySheet.tsx`): quét QR bằng camera → gõ mã in trên nhãn → xác nhận tay chờ
 * điều phối viên duyệt. Câu theo bản web (nhánh `qr.verify`, `qr.scan.camera`); tên ba mức và lý do xác nhận tay ở nhánh `common`.
 */
export const verify = {
  levels: 'Cách đối chiếu',
  camera: {
    starting: 'Đang mở camera…',
    scanning: 'Camera đang quét. Đưa mã QR vào giữa khung hình.',
    permission: 'Cần quyền dùng camera để quét mã QR trên nhãn.',
    allow: 'Cho phép dùng camera',
    denied: 'Chưa được phép dùng camera. Cấp quyền camera cho LoadMaster trong Cài đặt của máy, hoặc gõ mã in dưới hình QR.',
    failed: 'Không mở được camera. Hãy gõ mã in dưới hình QR.',
    openSettings: 'Mở Cài đặt',
  },
  codeLabel: 'Mã QR hoặc mã bên gửi',
  codeHint: 'Mã in dưới hình QR, hoặc mã kiện của bên gửi in trên nhãn. Chữ hoa hay thường đều được.',
  codeRequired: 'Nhập mã trước khi đối chiếu.',
  codeSubmit: 'Đối chiếu mã',
  manualIntro: 'Dùng khi nhãn rách, mất hoặc không đọc được. Điều phối viên phải duyệt xác nhận tay trước khi bước này hoàn tất.',
  manualPackage: 'Kiện',
  manualReason: 'Lý do',
  manualNote: 'Ghi chú',
  manualNoteHint: 'Bắt buộc khi chọn Khác.',
  manualSubmit: 'Gửi xác nhận tay',
  manualEmpty: 'Không có kiện nào để xác nhận tay ở bước này.',
  errors: {
    packageRequired: 'Chọn kiện cần xác nhận.',
    reasonRequired: 'Chọn lý do.',
    noteRequired: 'Chọn Khác thì cần ghi chú.',
    noteTooLong: 'Ghi chú tối đa {max} ký tự.',
  },
  close: 'Đóng',
} as const
