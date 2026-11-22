/**
 * Màn kho khi nguồn `warehouse` là máy chủ (`features/warehouse/server`): câu mobile cần thêm ngoài nhánh `serverWarehouse` chép từ web —
 * web nói các việc này bằng toast, app nói ngay trên thẻ hoặc trong tờ.
 */
export const warehouseServer = {
  /** Thẻ chuyến chờ xếp: máy chủ từ chối lệnh bắt đầu soạn hàng. */
  startFailed: 'Chưa bắt đầu soạn hàng được. {reason}',
  /** Điểm giao của kiện khi máy chủ trả cả tên điểm. */
  stopNamed: 'Điểm {number} · {name}',
  /** Sơ đồ 2D lòng thùng ở bước Xếp (`ServerHoldSketch`): màu là màu điểm giao, luôn kèm số. */
  sketch: {
    title: 'Chỗ đặt kiện trong thùng',
    top: 'Nhìn từ trên xuống',
    rear: 'Nhìn từ cửa sau vào',
    left: 'Vách trái',
    right: 'Vách phải',
    current: 'Kiện đang xếp (viền trắng)',
    stop: 'Điểm {number}',
  },
} as const
