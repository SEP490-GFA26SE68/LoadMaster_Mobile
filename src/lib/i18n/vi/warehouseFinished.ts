/** Màn Xếp xong của phiên kho: số kiện đã xếp, kiện bỏ lại, số seal niêm phong (`LoadingFinishedView`). */
export const warehouseFinished = {
  /** Tên đọc của ô "Bỏ lại kho": số kiện hỏng bị bỏ lại kho. */
  leftOut: { one: 'Bỏ lại kho {count} kiện', other: 'Bỏ lại kho {count} kiện' },
  /** Tên đọc một dòng "Theo điểm giao", sau số và tên điểm: kiện của điểm đã lên xe trên tổng kiện của điểm. */
  stopLoaded: 'đã xếp {loaded} / {total} kiện',
} as const
