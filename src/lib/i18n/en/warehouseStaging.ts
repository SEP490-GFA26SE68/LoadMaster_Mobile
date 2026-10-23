/**
 * Bước Soạn hàng của phiên kho (`StagingStepView`): câu chỉ mobile cần, ngoài nhánh `warehouse` chép từ web — tên đọc được của nút báo
 * thiếu trên từng dòng kiện.
 */
import type { Dictionary } from '../types'
import type { warehouseStaging as source } from '../vi/warehouseStaging'

export const warehouseStaging = {
  reportShortageFor: 'Report missing {id}',
} satisfies Dictionary<typeof source>
