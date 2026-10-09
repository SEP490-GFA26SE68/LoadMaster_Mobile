/**
 * Bản của mobile: chỉ xuất phần thuần của `services/optimization`. Bản web còn xuất lớp chạy trong Web Worker (`import.meta`,
 * `new Worker`) — Hermes không có hai thứ đó, và app không chạy tối ưu trên máy: kết quả tối ưu lấy từ backend.
 * Kho dữ liệu mẫu cần hai hàm thuần dưới đây để dựng seed và xếp kiện nhận dọc đường.
 */
export { runMockCandidates, type CandidatePlan, type CandidateProgress, type CandidateRun, type CandidateRunOptions } from './mock-candidates'
export { reoptimizeFreedZone, type ReoptimizeFreedZoneInput } from './reoptimize-freed-zone'
export { runMockOptimization, type MockRunOptions } from './mock-optimization'
export type { CandidateOptions, OptimizationProgress, OptimizationService, OptimizeOptions } from './OptimizationService'
export { OptimizationServiceError, type OptimizationServiceErrorCode } from './service-errors'
