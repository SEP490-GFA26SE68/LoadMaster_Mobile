/** Phiên soạn → xếp một chuyến ở kho (`LoadingSessionScreen`, `StepHeader`): câu thêm ngoài nhánh `warehouse` chép từ web. */
export const warehouseSession = {
  /** Dòng tiến độ của bước Soạn hàng trong dải trời: kiện đã soạn trên tổng số kiện của phương án. */
  staged: 'Đã soạn {done} / {total}',
  /** Dòng bước của bước Xếp trong dải trời: bước của kiện đang xếp trên tổng số kiện. */
  step: 'Bước {step} / {total}',
  /** Dưới thanh tiến độ của bước Xếp: kiện đã có kết quả — đã xếp, hoặc hỏng bị bỏ lại kho. */
  recorded: 'Đã có kết quả {recorded} / {total} kiện',
} as const
