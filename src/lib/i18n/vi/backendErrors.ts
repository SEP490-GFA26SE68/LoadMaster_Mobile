/**
 * Mã nghiệp vụ của nguồn backend mà kho mẫu không có (kho mẫu có câu riêng ở nhánh `dataErrors`, chép từ web). Adapter `http` đổi phản
 * hồi lỗi của backend sang các mã này khi backend không trả mã, hoặc giữ đúng tên `ErrorCode` của backend khi mã đó có câu ở đây; màn
 * hiện câu qua `dataErrorMessage` như mọi lỗi khác.
 */
export const backendErrors = {
  PACKAGE_CODE_UNKNOWN: 'Mã {code} không khớp kiện nào của điểm đang giao.',
  PACKAGE_ALREADY_UNLOADED: 'Kiện {code} đã được ghi dỡ rồi.',
  PACKAGE_NOT_AT_STOP: 'Kiện {code} không thuộc điểm đang giao. Chưa ghi gì — để kiện lại trên xe.',
  STOP_NOT_COMPLETABLE: 'Máy chủ chưa cho hoàn tất điểm {name}: còn kiện chưa dỡ.',
  TRIP_NOT_IN_TRANSIT: 'Chuyến {tripId} không còn trong danh sách chuyến đang vận chuyển của bạn.',
  // Đăng nhập qua Keycloak của backend
  SIGN_IN_FAILED: 'Máy chủ đăng nhập không nhận lượt đăng nhập này. Thử lại; vẫn không được thì báo cho quản trị hệ thống.',
  /** Tài khoản đang dùng mật khẩu tạm (vừa được cấp hoặc vừa đặt lại): phải đặt mật khẩu mới trước khi vào app. */
  PASSWORD_CHANGE_REQUIRED: 'Tài khoản cần đặt mật khẩu mới trước khi đăng nhập.',
  SIGN_IN_REJECTED: 'Máy chủ không nhận phiên vừa đăng nhập: cấu hình đăng nhập của app và của máy chủ chưa khớp. Báo cho quản trị hệ thống.',
  PROFILE_UNAVAILABLE: 'Không đọc được hồ sơ tài khoản từ máy chủ. Thử đăng nhập lại.',
  PROFILE_NOT_FOUND: 'Tài khoản đăng nhập chưa gắn với người dùng nào của LoadMaster. Liên hệ quản trị công ty.',
  ROLE_UNKNOWN: 'Tài khoản có vai trò "{role}" mà app chưa hỗ trợ. Liên hệ quản trị công ty.',
  // Đặt lại mật khẩu qua mã gửi tới email. Máy chủ trả 400 không kèm mã: mỗi bước một câu chung
  RESET_REQUEST_REFUSED: 'Chưa gửi được mã: bạn vừa yêu cầu mã hoặc đã yêu cầu quá nhiều lần. Đợi vài phút rồi thử lại.',
  RESET_CODE_INVALID: 'Mã không đúng hoặc đã hết hạn. Kiểm tra lại mã, hoặc gửi mã mới.',
  RESET_SESSION_EXPIRED: 'Phiên đặt lại mật khẩu đã hết hạn. Bắt đầu lại từ bước nhập email.',
  // Máy chủ trả kèm mã: câu đúng lý do
  OTP_RESEND_COOLDOWN: 'Bạn vừa yêu cầu mã. Đợi một phút rồi gửi lại.',
  OTP_REQUEST_LIMIT_EXCEEDED: 'Bạn đã yêu cầu mã quá nhiều lần. Thử lại sau.',
  OTP_EXPIRED: 'Mã đã hết hạn hoặc không còn dùng được. Bấm Gửi lại mã để nhận mã mới.',
  OTP_INCORRECT: 'Mã không đúng. Kiểm tra lại mã trong email.',
  OTP_ATTEMPTS_EXCEEDED: 'Bạn đã nhập sai mã quá nhiều lần. Bấm Gửi lại mã để nhận mã mới.',
  // Màn kho nối backend
  LOADING_NOT_STARTED: 'Chưa bắt đầu xếp chuyến {tripId}.',
  PACKAGE_LOOKUP_UNKNOWN: 'Không tìm thấy kiện với mã {code}.',
  PLACEMENT_ALREADY_CONFIRMED: 'Kiện này đã được xác nhận xếp.',
} as const
