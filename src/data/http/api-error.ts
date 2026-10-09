/**
 * Lỗi của một lượt gọi backend, cùng dạng **mã + tham số** với `MockDbError` của kho mẫu để màn hiện câu bằng một hàm chung
 * (`dataErrorMessage`). Mã nghiệp vụ là `code` backend trả trong phong bì; mã dưới đây là các lỗi không thuộc nghiệp vụ.
 */
export const TRANSPORT_ERROR_CODES = ['NETWORK_ERROR', 'TIMEOUT', 'UNAUTHENTICATED', 'UNAUTHORIZED', 'SERVER_ERROR', 'HTTP_NOT_WIRED'] as const

export type TransportErrorCode = (typeof TRANSPORT_ERROR_CODES)[number]

export type ApiErrorDetails = {
  /** Mã HTTP; 0 khi không có phản hồi (mất mạng, quá giờ, feature chưa nối). */
  readonly status?: number
  readonly params?: Readonly<Record<string, unknown>>
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly params: Readonly<Record<string, unknown>>

  constructor(code: TransportErrorCode | (string & {}), { status = 0, params = {} }: ApiErrorDetails = {}) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.params = params
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
