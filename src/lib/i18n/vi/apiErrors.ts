/** Lỗi của lượt gọi backend không thuộc nghiệp vụ: mạng, phiên, máy chủ. Key trùng mã của `ApiError` (`src/data/http/api-error.ts`). */
export const apiErrors = {
  NETWORK_ERROR: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  TIMEOUT: 'Máy chủ phản hồi quá lâu. Thử lại sau.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết, hãy đăng nhập lại.',
  UNAUTHORIZED: 'Bạn không có quyền làm việc này.',
  SERVER_ERROR: 'Máy chủ gặp lỗi. Thử lại sau.',
  HTTP_NOT_WIRED: 'Chức năng này chưa được nối với máy chủ.',
  NOT_SUPPORTED: 'Máy chủ chưa làm được việc này.',
} as const
