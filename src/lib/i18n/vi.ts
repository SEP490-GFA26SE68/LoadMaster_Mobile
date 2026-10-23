import { account } from './vi/account'
import { apiErrors } from './vi/apiErrors'
import { auth } from './vi/auth'
import { backendErrors } from './vi/backendErrors'
import { common } from './vi/common'
import { dataErrors } from './vi/dataErrors'
import { driver } from './vi/driver'
import { errors } from './vi/errors'
import { issues } from './vi/issues'
import { language } from './vi/language'
import { lookup } from './vi/lookup'
import { nav } from './vi/nav'
import { notifications } from './vi/notifications'
import { packageLookup } from './vi/packageLookup'
import { roles } from './vi/roles'
import { status } from './vi/status'
import { tripException } from './vi/tripException'
import { verify } from './vi/verify'
import { warehouse } from './vi/warehouse'
import { warehouseFinished } from './vi/warehouseFinished'
import { warehouseLoading } from './vi/warehouseLoading'
import { warehouseSession } from './vi/warehouseSession'
import { warehouseStaging } from './vi/warehouseStaging'
import { warehouseTrips } from './vi/warehouseTrips'

/**
 * Từ điển nguồn của app. `en.ts` khai `satisfies Dictionary<typeof vi>`: thiếu hoặc thừa key là lỗi lúc kiểm kiểu.
 *
 * - Mỗi nhánh cấp 1 là một file trong `vi/`. Nhánh `dataErrors`, `issues`, `language`, `lookup`, `roles`, `status`, `warehouse` chép từ
 *   bản web (`src/web-mirror.json`) — không sửa ở đây; nhánh còn lại là của mobile. Màn kho, tra cứu kiện ưu tiên câu của hai nhánh
 *   `warehouse`, `lookup` (cùng chữ với web); câu chỉ mobile cần nằm ở nhánh riêng của từng màn (`warehouseTrips`, `warehouseSession`,
 *   `warehouseStaging`, `warehouseLoading`, `warehouseFinished`, `packageLookup`).
 * - Tham số viết `{ten}`; câu đổi theo số lượng là object đúng hai key `one` / `other` với tham số `{count}`.
 * - Tên riêng không dịch (LoadMaster, MOCK RESULT) để thẳng trong JSX.
 */
export const vi = {
  account,
  apiErrors,
  auth,
  backendErrors,
  common,
  dataErrors,
  driver,
  errors,
  issues,
  language,
  lookup,
  nav,
  notifications,
  packageLookup,
  roles,
  status,
  tripException,
  verify,
  warehouse,
  warehouseFinished,
  warehouseLoading,
  warehouseSession,
  warehouseStaging,
  warehouseTrips,
} as const
