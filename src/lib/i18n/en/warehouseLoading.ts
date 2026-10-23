/** Bước Xếp hàng của phiên kho (`LoadingStepView`): câu chỉ mobile cần, ngoài nhánh `warehouse` chép từ web — chú giải của sơ đồ thùng. */
import type { Dictionary } from '../types'
import type { warehouseLoading as source } from '../vi/warehouseLoading'

export const warehouseLoading = {
  sketch: { current: 'Package being loaded', loaded: 'Already loaded', obstacle: 'Obstacle' },
} satisfies Dictionary<typeof source>
