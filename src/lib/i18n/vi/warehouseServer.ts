/**
 * Màn kho khi nguồn `warehouse` là máy chủ (`features/warehouse/server`): câu mobile cần thêm ngoài nhánh `serverWarehouse` chép từ web —
 * web nói các việc này bằng toast, app nói ngay trên thẻ hoặc trong tờ.
 */
export const warehouseServer = {
  /** Thẻ chuyến chờ xếp: máy chủ từ chối lệnh bắt đầu soạn hàng. */
  startFailed: 'Chưa bắt đầu soạn hàng được. {reason}',
  /** Điểm giao của kiện khi máy chủ trả cả tên điểm. */
  stopNamed: 'Điểm {number} · {name}',
} as const
