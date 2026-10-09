import { z } from 'zod'
import { gt, lt } from '@/domain/geometry'
import { rule, type ModelIssueCode } from './issue-codes'

/*
 * Khối dựng trường dùng chung cho mọi schema domain: mỗi kiểu dữ liệu gắn sẵn mã lỗi `common.*`,
 * để không issue nào mang câu mặc định của zod.
 */

/** Tham số lỗi sai kiểu. Lỗi sai kiểu của zod vốn đã chặn refinement phía trên, không cần `abort`. */
function typeError(code: ModelIssueCode) {
  return { error: code }
}

/** Số hữu hạn. zod 4 đã từ chối NaN và ±Infinity; ở đây chỉ thay câu mặc định bằng mã lỗi. */
export function finiteNumber() {
  return z.number(typeError('common.number.invalid'))
}

export function text() {
  return z.string(typeError('common.string.invalid'))
}

export function flag() {
  return z.boolean(typeError('common.boolean.invalid'))
}

/** Một giá trị trong tập cho phép (mã hướng đặt, loại vật cản, trạng thái…). */
export function oneOf<const T extends readonly string[]>(values: T) {
  return z.enum(values, typeError('common.enum.invalid'))
}

export function listOf<T extends z.core.SomeType>(item: T) {
  return z.array(item, typeError('common.array.invalid'))
}

/** Đối tượng; trường ngoài hợp đồng bị bỏ khi parse (D-04), không giữ lại cũng không từ chối. */
export function objectOf<T extends z.core.$ZodLooseShape>(shape: T) {
  return z.object(shape, typeError('common.object.invalid'))
}

/* Quy tắc số so qua EPSILON của geometry (D-27), không dùng `<` `>` trực tiếp. */

/** Lớn hơn 0 thật sự: kích thước (cm), tải trọng xe (kg). */
export function positive(code: ModelIssueCode) {
  return finiteNumber().refine((v) => gt(v, 0), rule(code))
}

/** Không âm: khối lượng, tải (kg), khoảng hở (cm). */
export function nonNegative(code: ModelIssueCode) {
  return finiteNumber().refine((v) => !lt(v, 0), rule(code))
}

/** Tỷ lệ trong đoạn [0, 1]. */
export function ratio(code: ModelIssueCode) {
  return finiteNumber().refine((v) => !lt(v, 0) && !gt(v, 1), rule(code))
}
