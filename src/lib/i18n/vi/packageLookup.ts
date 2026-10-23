/**
 * Tab Tra cứu kiện của nhân viên kho: quét hoặc gõ mã để xem một kiện (`PackageLookupScreen`). Tiêu đề màn và câu của màn là của web
 * (nhánh `lookup`); ở đây chỉ câu mobile cần thêm.
 */
export const packageLookup = {
  /** Ô nhập tay của tờ quét mã QR (`ScanPackageSheet`): gõ mã in dưới hình QR tính như một lần quét. Câu của bản web (nhánh `qr.scan`). */
  scan: {
    manualLabel: 'Nhập mã',
    manualHint: 'Mã in ngay dưới hình QR. Chữ hoa hay thường, có khoảng trắng đều được.',
    manualRequired: 'Nhập mã trước khi xác nhận.',
    submit: 'Xác nhận mã',
  },
} as const
