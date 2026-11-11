/** Màn kho khi nguồn `warehouse` là máy chủ (`features/warehouse/server`): câu mobile cần thêm ngoài nhánh `serverWarehouse`. */
import type { Dictionary } from '../types'
import type { warehouseServer as source } from '../vi/warehouseServer'

export const warehouseServer = {
  startFailed: 'Could not start staging. {reason}',
  stopNamed: 'Stop {number} · {name}',
} satisfies Dictionary<typeof source>
