/**
 * Mã nghiệp vụ của nguồn backend mà kho mẫu không có (kho mẫu có câu riêng ở nhánh `dataErrors`, chép từ web). Adapter `http` đổi phản
 * hồi lỗi của backend sang các mã này khi backend chưa trả mã; màn hiện câu qua `dataErrorMessage` như mọi lỗi khác.
 */
export const backendErrors = {
  PACKAGE_CODE_UNKNOWN: 'Mã {code} không khớp kiện nào của điểm đang giao.',
  PACKAGE_ALREADY_UNLOADED: 'Kiện {code} đã được ghi dỡ rồi.',
  PACKAGE_NOT_AT_STOP: 'Kiện {code} không thuộc điểm đang giao. Chưa ghi gì — để kiện lại trên xe.',
  STOP_NOT_COMPLETABLE: 'Máy chủ chưa cho hoàn tất điểm {name}: còn kiện chưa dỡ.',
  TRIP_NOT_IN_TRANSIT: 'Chuyến {tripId} không còn trong danh sách chuyến đang vận chuyển của bạn.',
  // Đăng nhập qua Keycloak của backend
  SIGN_IN_FAILED: 'Không đăng nhập được qua trang đăng nhập của máy chủ. Thử lại.',
  SIGN_IN_REJECTED: 'Máy chủ không nhận phiên vừa đăng nhập: cấu hình đăng nhập của app và của máy chủ chưa khớp. Báo cho quản trị hệ thống.',
  PROFILE_UNAVAILABLE: 'Không đọc được hồ sơ tài khoản từ máy chủ. Thử đăng nhập lại.',
  ROLE_UNKNOWN: 'Tài khoản có vai trò "{role}" mà app chưa hỗ trợ. Liên hệ quản trị công ty.',
} as const
