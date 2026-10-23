/** Phiên soạn → xếp một chuyến ở kho (`LoadingSessionScreen`, `StepHeader`): câu thêm ngoài nhánh `warehouse` chép từ web. */
import type { Dictionary } from '../types'
import type { warehouseSession as source } from '../vi/warehouseSession'

export const warehouseSession = {
  staged: 'Staged {done} / {total}',
  step: 'Step {step} / {total}',
  recorded: '{recorded} / {total} packages have a result',
} satisfies Dictionary<typeof source>
