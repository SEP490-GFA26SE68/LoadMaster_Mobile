/** Màn Xếp xong của phiên kho: số kiện đã xếp, kiện bỏ lại, số seal niêm phong (`LoadingFinishedView`). */
import type { Dictionary } from '../types'
import type { warehouseFinished as source } from '../vi/warehouseFinished'

export const warehouseFinished = {
  leftOut: { one: '{count} package left at the warehouse', other: '{count} packages left at the warehouse' },
  stopLoaded: '{loaded} / {total} packages loaded',
} satisfies Dictionary<typeof source>
