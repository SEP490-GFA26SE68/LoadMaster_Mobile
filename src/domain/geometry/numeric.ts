/** Dung sai so sánh số thực của domain, đơn vị theo đại lượng đang so (cm hoặc kg). Spec mục 2. */
export const EPSILON = 1e-6

/**
 * Làm tròn về bội `1 / stepsPerUnit`; giá trị đúng giữa làm tròn xa số 0.
 * Cộng EPSILON trước khi làm tròn để một nửa bị dấu phẩy động cắt hụt
 * (262,45 − 250 = 12,4499999…) vẫn được coi là nửa. Không trả −0.
 */
function roundToStep(value: number, stepsPerUnit: number): number {
  const steps = Math.round((Math.abs(value) + EPSILON) * stepsPerUnit)
  if (steps === 0) return 0
  return (Math.sign(value) * steps) / stepsPerUnit
}

/** Bằng nhau trong dung sai EPSILON. */
export function eq(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON
}

/** Nhỏ hơn thật sự: chênh lệch vượt EPSILON. */
export function lt(a: number, b: number): boolean {
  return a < b - EPSILON
}

/** Lớn hơn thật sự: chênh lệch vượt EPSILON. */
export function gt(a: number, b: number): boolean {
  return a > b + EPSILON
}

/** Làm tròn độ dài về bội 0,1 cm (bước nhập của Spec). */
export function roundCm(value: number): number {
  return roundToStep(value, 10)
}

/** Làm tròn khối lượng về bội 0,01 kg (bước nhập của Spec). */
export function roundKg(value: number): number {
  return roundToStep(value, 100)
}
