/**
 * Bước Soạn hàng của phiên kho (`StagingStepView`): câu chỉ mobile cần, ngoài nhánh `warehouse` chép từ web — tên đọc được của nút báo
 * thiếu trên từng dòng kiện.
 */
export const warehouseStaging = {
  /**
   * Tên đọc được của nút "Báo thiếu" trên một dòng kiện: chữ trên nút không nói là kiện nào. Ở mọi ngôn ngữ tên bắt đầu bằng đúng chữ trên
   * nút, để người điều khiển bằng giọng nói gọi được nút bằng chữ mình thấy.
   */
  reportShortageFor: 'Báo thiếu {id}',
} as const
