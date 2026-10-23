import type { Package } from '@/lib/mock-db'

import type { LookupCapabilities, PackageLookup } from './lookup-api'

/*
 * Tab Tra cứu kiện của nhân viên kho: màn hiện gì với một lần tra, và nhân viên kho làm được gì trên kiện tìm thấy — cùng luật với
 * `package-lookup.ts` của web, gói trong việc của vai trò kho (tab chỉ mở cho vai trò có `warehouse.operate`). Hàm thuần.
 */

export type LookupView =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  /** Mã không khớp kiện nào của công ty — kể cả khi đó là kiện của công ty khác. */
  | { readonly kind: 'notFound'; readonly code: string }
  | { readonly kind: 'many'; readonly code: string; readonly items: readonly PackageLookup[] }
  /** `fromMany`: kiện được chọn trong danh sách trùng mã — có lối quay lại danh sách. */
  | { readonly kind: 'one'; readonly item: PackageLookup; readonly fromMany: boolean }

/**
 * `code`: mã đang tra (rỗng là chưa tra gì); `pickedId`: kiện đã chọn khi nhiều kiện trùng mã của bên gửi; `notFound`: nguồn trả "không
 * khớp kiện nào" (`isUnknownPackage`). Lỗi khác vẫn là `pending` — màn hiện lỗi đó thay vòng quay.
 */
export function lookupView({ code, pickedId, pending, notFound, data }: {
  code: string
  pickedId: string | null
  pending: boolean
  notFound: boolean
  data: readonly PackageLookup[] | undefined
}): LookupView {
  if (code === '') return { kind: 'idle' }
  if (notFound) return { kind: 'notFound', code }
  if (pending || data === undefined) return { kind: 'pending' }
  const [first] = data
  if (first === undefined) return { kind: 'notFound', code }
  if (data.length === 1) return { kind: 'one', item: first, fromMany: false }
  const picked = data.find((item) => item.package.id === pickedId)
  return picked ? { kind: 'one', item: picked, fromMany: true } : { kind: 'many', code, items: data }
}

export type LookupActions = {
  /**
   * Nhân viên kho xác nhận đã tìm thấy kiện đang mang cờ "Không tìm thấy" (gỡ cờ): gõ mã thì thẻ kiện có nút xác nhận — gõ mã chưa chắc
   * là đang cầm kiện; quét nhãn thì gỡ luôn.
   */
  readonly confirmFound: boolean
}

/**
 * Việc nhân viên kho làm được trên một kiện tìm thấy. In lại nhãn (app không in), mở kiện ở Kho kiện, mở chuyến và gỡ cờ của điều phối
 * viên không có trên điện thoại. Nguồn chưa làm được việc gỡ cờ thì không có gì.
 */
export function lookupActions(pkg: Pick<Package, 'flags'>, capabilities: LookupCapabilities): LookupActions {
  return { confirmFound: capabilities.reportFound && pkg.flags.includes('NOT_FOUND') }
}
