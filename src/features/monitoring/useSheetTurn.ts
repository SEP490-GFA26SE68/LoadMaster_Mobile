import { useState } from 'react'

/**
 * Một tờ trượt mở theo lượt, kèm đối tượng của lượt đó (sự cố cần xử lý, yêu cầu cần duyệt): `key` đổi mỗi lần mở để form trong tờ bắt
 * đầu lại; đóng thì giữ `key` và đối tượng để tờ mờ dần với đúng nội dung vừa hiện.
 */
export type SheetTurn<T> = { readonly open: boolean; readonly key: number; readonly target: T | null }

export function useSheetTurn<T>() {
  const [turn, setTurn] = useState<SheetTurn<T>>({ open: false, key: 0, target: null })
  return {
    ...turn,
    show: (target: T) => setTurn((current) => ({ open: true, key: current.key + 1, target })),
    hide: () => setTurn((current) => ({ ...current, open: false })),
  }
}
