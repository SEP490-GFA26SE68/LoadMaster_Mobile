/**
 * Tờ "Sự cố trên đường" của tài xế (`features/driver/TripExceptionSheet.tsx`): sự cố của cả xe kèm số phút dự kiến chậm — khác "Báo sự
 * cố" của từng kiện. Câu theo bản web (nhánh `monitoring.reportDialog`); tên loại sự cố ở `common.tripExceptionTypes`.
 */
export const tripException = {
  open: 'Sự cố trên đường',
  title: 'Báo sự cố chuyến {id}',
  description: 'Xe mô phỏng dừng thêm đúng số phút dự kiến chậm; giờ đến các điểm tính lại theo vị trí xe.',
  type: 'Loại sự cố',
  details: 'Mô tả',
  detailsHint: 'Chuyện gì xảy ra, ở đâu.',
  delay: 'Số phút dự kiến chậm',
  delayHint: 'Số nguyên từ 0 đến {max}.',
  errors: {
    typeRequired: 'Chọn loại sự cố.',
    detailsRequired: 'Nhập mô tả sự cố.',
    detailsTooLong: 'Mô tả tối đa {max} ký tự.',
    delayInvalid: 'Nhập số phút nguyên từ 0 đến {max}.',
  },
  cancel: 'Huỷ',
  submit: 'Báo sự cố',
  reported: 'Đã báo sự cố {id}.',
} as const
