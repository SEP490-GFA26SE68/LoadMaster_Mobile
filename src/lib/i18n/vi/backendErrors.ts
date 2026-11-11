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
  /** Mã của bên gửi trùng nhiều kiện của điểm: không biết là kiện nào. */
  UNLOAD_CODE_AMBIGUOUS: 'Mã {code} trùng {count} kiện của điểm này — gõ mã QR hoặc mã vạch in trên nhãn của kiện.',
  LOADING_NOT_COMPLETED: 'Kho chưa xếp xong hàng cho chuyến này, chưa xuất phát được.',
  DELIVERY_STOP_ALREADY_COMPLETED: 'Điểm giao này đã hoàn tất.',
  DELIVERY_STOP_NOT_CURRENT: 'Chưa tới lượt điểm giao này — hoàn tất điểm đang giao trước.',
  DELIVERY_STOP_NOT_ARRIVED: 'Chưa báo đã đến điểm này. Bấm "Đã đến điểm" trước khi dỡ hoặc báo sự cố.',
  DELIVERY_ISSUE_NOTE_REQUIRED: 'Sự cố loại "Khác" cần ghi chú.',
  MANUAL_CONFIRM_NOTE_REQUIRED: 'Lý do "Khác" cần ghi chú.',
  /** Máy chủ không nói còn bao nhiêu xác nhận tay chờ (mã `MANUAL_CONFIRM_PENDING` của kho mẫu có số). */
  STOP_MANUAL_CONFIRM_PENDING: 'Còn xác nhận tay chờ điều phối viên duyệt — chưa hoàn tất điểm được.',
  PICKUP_PACKAGE_NOT_AT_STOP: 'Kiện này không phải kiện nhận ở điểm hiện tại.',
  PICKUP_PACKAGE_ALREADY_PICKED: 'Kiện này đã được nhận lên xe.',
  PICKUP_STOP_INCOMPLETE: 'Còn kiện nhận chưa đối chiếu lên xe — chưa hoàn tất điểm nhận được.',
  // Màn điều phối viên và quản lý công ty nối backend
  TRIP_NOT_FOUND: 'Không tìm thấy chuyến này, hoặc chuyến không thuộc công ty của bạn.',
  TRIP_EXCEPTION_NOT_FOUND: 'Sự cố này không còn trên chuyến. Kéo xuống để đọc lại.',
  GPS_TRIP_NOT_IN_TRANSIT: 'Chuyến không còn đang vận chuyển.',
  NO_PENDING_DELIVERY_STOP: 'Chuyến không còn điểm nào chờ giao nên không có tuyến để tìm.',
  INVALID_REROUTE_INDEX: 'Lựa chọn tuyến này không còn dùng được. Đóng lại rồi tìm tuyến khác.',
  DELIVERY_REQUIREMENT_NOT_FOUND: 'Không tìm thấy yêu cầu giao này.',
  DELIVERY_REQUIREMENT_NOT_IN_TRIP: 'Yêu cầu giao này không thuộc chuyến.',
  CONTACT_NOTE_REQUIRED: 'Ghi lại nội dung đã liên hệ khách trước khi nhập hạn mới.',
  STAGING_SHORTAGE_NOT_FOUND: 'Báo thiếu này không còn. Kéo xuống để đọc lại.',
  STAGING_SHORTAGE_NOT_OPEN: 'Báo thiếu này đã được xử lý.',
  MANUAL_CONFIRM_NOT_FOUND: 'Xác nhận tay này không còn. Kéo xuống để đọc lại.',
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
  // Màn kho nối backend: phiên xếp của máy chủ (`warehouse-http.ts`)
  TRIP_NOT_LOADING: 'Chuyến không còn ở Đang xếp hàng, không mở được phiên xếp.',
  LOADING_EXECUTION_NOT_FOUND: 'Không tìm thấy phiên xếp hàng của chuyến.',
  TRIP_ALREADY_LOADING: 'Chuyến đã bắt đầu xếp hàng.',
  TRIP_NOT_READY_FOR_LOADING: 'Chỉ bắt đầu xếp được chuyến Đã lập kế hoạch.',
  NO_APPROVED_LOAD_PLAN: 'Chuyến chưa có phương án đã duyệt.',
  PLACEMENT_ALREADY_CONFIRMED: 'Kiện này đã được xác nhận xếp.',
  PLACEMENT_NOT_FOUND: 'Không tìm thấy vị trí của kiện trong phương án.',
  PLACEMENT_NOT_IN_PLAN: 'Kiện này không thuộc phương án đang xếp.',
  PACKAGE_NOT_IN_LOADING_PLAN: 'Kiện này không thuộc phương án đang xếp của chuyến.',
  INVALID_SEQUENCE_ORDER: 'Chưa tới lượt kiện này — xếp theo đúng thứ tự.',
  DEVIATION_ALREADY_RECORDED: 'Sai lệch của kiện này đã được ghi.',
  INCOMPLETE_LOADING: 'Còn kiện chưa xếp, chưa hoàn tất được.',
  LOADING_MANUAL_CONFIRM_PENDING: 'Còn xác nhận tay chờ điều phối viên duyệt — chưa hoàn tất xếp được.',
  /** Mã `STAGING_INCOMPLETE` của máy chủ — không kèm số kiện như mã cùng tên của kho mẫu, nên adapter đổi sang mã này. */
  STAGING_NOT_READY: 'Chưa soạn đủ hàng vào khu chờ, hoặc còn kiện báo thiếu chờ điều phối viên quyết — chưa xếp được.',
  SEAL_NOT_ALLOWED: 'Chỉ ghi được số seal khi đã xếp xong và xe chưa xuất phát.',
} as const
