/**
 * Nhận hàng dọc đường trên điện thoại: tài xế tạo yêu cầu, điều phối viên duyệt / từ chối, mười luật. Câu chung với bản web lấy ở
 * nhánh `pickups` (chép từ web); ở đây chỉ câu mobile cần thêm.
 */
export const pickupRequest = {
  title: 'Nhận hàng dọc đường',
  /** Tìm địa danh mẫu để điền toạ độ (bản web có ô chọn toạ độ kèm bản đồ). */
  place: {
    search: 'Tìm địa danh mẫu',
    hint: 'Gõ tên tỉnh, quận hoặc khu công nghiệp. Toạ độ mẫu gần đúng ở mức khu vực.',
    none: 'Không có địa danh mẫu nào khớp.',
    choose: 'Chọn {name}, {region}',
    chosen: 'Đã điền toạ độ của {name}.',
  },
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  coordinatesHint: 'Độ thập phân, dấu chấm hoặc dấu phẩy, ví dụ 10,9294.',
  deadlineDateHint: 'Ngày dạng dd/mm/yyyy. Để trống cả ngày và giờ nếu không có hạn.',
  deadlineTimeHint: 'Giờ dạng HH:mm, 24 giờ.',
  /** Ngày hoặc giờ gõ sai dạng (bản web dùng ô ngày, ô giờ của trình duyệt nên không gặp). */
  deadlineFormat: 'Ngày hoặc giờ chưa đúng: ngày dạng dd/mm/yyyy, giờ dạng HH:mm.',
  /** Kết quả duyệt trên điện thoại: không có máy in nhãn như bản web, chỉ có mã để đọc cho bên gửi. */
  approvedDescription: {
    one: '{count} kiện đã vào kho kiện kèm mã QR; điểm nhận và điểm giao đã chèn vào tuyến.',
    other: '{count} kiện đã vào kho kiện kèm mã QR; điểm nhận và điểm giao đã chèn vào tuyến.',
  },
  hideRules: 'Ẩn mười luật',
  /** Lỗi khi đọc danh sách yêu cầu của chuyến. */
  loadFailed: 'Không tải được yêu cầu nhận hàng: {message}',
} as const
