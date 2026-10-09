import { isApiError } from '@/data/http/api-error'
import { isMockDbError } from '@/lib/mock-db/errors'

import type { TFunction } from './types'
import { vi } from './vi'

type Coded = { readonly code: string; readonly params: Readonly<Record<string, unknown>> }

function coded(error: unknown): Coded | null {
  if (isMockDbError(error)) return { code: error.code, params: error.params }
  if (isApiError(error)) return { code: error.code, params: error.params }
  return null
}

/**
 * Câu cho lỗi của một lượt gọi dữ liệu, dù nguồn là kho mẫu (`MockDbError`) hay backend (`ApiError`): cả hai mang **mã + tham số**, màn
 * không cần biết lỗi đến từ đâu. Thứ tự tìm câu: `apiErrors.<mã>` (lỗi mạng, phiên, máy chủ) → `dataErrors.<mã>` (mã nghiệp vụ, trùng
 * tên giữa kho mẫu và backend) → câu chung. Mã backend chưa có câu thì hiện câu chung, không hiện thông điệp thô của máy chủ.
 */
export function dataErrorMessage(error: unknown, t: TFunction): string {
  const known = coded(error)
  if (!known) return t('dataErrors.UNKNOWN')
  const branch = known.code in vi.apiErrors ? 'apiErrors' : known.code in vi.dataErrors ? 'dataErrors' : null
  if (branch === null) return t('dataErrors.UNKNOWN')
  const params = Object.fromEntries(
    Object.entries(known.params).map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)]),
  )
  // Tham số của từng mã trùng placeholder của câu cùng mã; TFunction không suy được từ mã động.
  const translate = t as unknown as (key: string, values: Record<string, string>) => string
  return translate(`${branch}.${known.code}`, params)
}
