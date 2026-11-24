/**
 * Màn trò chuyện với trợ lý AI Lumo của tài xế và nhân viên kho (`features/assistant`). Phần lớn câu dùng chung với bản web ở nhánh
 * `assistant` (chép từ web); nhánh này chỉ giữ câu riêng của app. Tên Lumo là tên riêng: câu nói về Lumo nhận tham số `{name}`.
 */
export const lumo = {
  /** Máy chủ đã tạo yêu cầu hỗ trợ: app chưa có màn yêu cầu hỗ trợ, nên câu chỉ về bản web. */
  ticket: 'Đã tạo yêu cầu hỗ trợ {code}. Đội hỗ trợ trả lời ở mục “Yêu cầu hỗ trợ” của bản web.',
  /** Mở màn trợ lý khi trợ lý không dùng được cho tài khoản này (đăng nhập trên kho mẫu, vai trò khác). */
  unavailable: 'Trợ lý AI chưa dùng được với tài khoản này.',
} as const
