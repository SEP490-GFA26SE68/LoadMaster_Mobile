/**
 * Lỗi của tầng service tối ưu, theo mã để UI dịch (LM-048):
 * - `SERVICE_UNAVAILABLE`: service không phản hồi (mô phỏng bằng `?mo-phong=loi` ở tầng `-api.ts`);
 * - `TIME_LIMIT_EXCEEDED`: quá `settings.timeLimitSeconds`;
 * - `MOCK_FAILED`: mock ném lỗi trong worker;
 * - `WORKER_CRASHED`: worker không chạy được (lỗi tải script, lỗi ngoài message).
 */
export type OptimizationServiceErrorCode = 'SERVICE_UNAVAILABLE' | 'TIME_LIMIT_EXCEEDED' | 'MOCK_FAILED' | 'WORKER_CRASHED'

export class OptimizationServiceError extends Error {
  readonly code: OptimizationServiceErrorCode

  constructor(code: OptimizationServiceErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'OptimizationServiceError'
    this.code = code
  }
}
