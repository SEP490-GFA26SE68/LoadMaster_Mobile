import { account } from './vi/account'
import { apiErrors } from './vi/apiErrors'
import { auth } from './vi/auth'
import { backendErrors } from './vi/backendErrors'
import { common } from './vi/common'
import { companyTrips } from './vi/companyTrips'
import { dataErrors } from './vi/dataErrors'
import { driver } from './vi/driver'
import { errors } from './vi/errors'
import { issues } from './vi/issues'
import { language } from './vi/language'
import { liveTrip } from './vi/liveTrip'
import { lookup } from './vi/lookup'
import { manager } from './vi/manager'
import { monitoring } from './vi/monitoring'
import { nav } from './vi/nav'
import { notifications } from './vi/notifications'
import { officeServer } from './vi/officeServer'
import { overview } from './vi/overview'
import { packageLookup } from './vi/packageLookup'
import { pickupRequest } from './vi/pickupRequest'
import { pickups } from './vi/pickups'
import { roles } from './vi/roles'
import { serverWarehouse } from './vi/serverWarehouse'
import { status } from './vi/status'
import { tripException } from './vi/tripException'
import { trips } from './vi/trips'
import { verify } from './vi/verify'
import { warehouse } from './vi/warehouse'
import { warehouseFinished } from './vi/warehouseFinished'
import { warehouseLoading } from './vi/warehouseLoading'
import { warehouseSession } from './vi/warehouseSession'
import { warehouseServer } from './vi/warehouseServer'
import { warehouseStaging } from './vi/warehouseStaging'
import { warehouseTrips } from './vi/warehouseTrips'

/**
 * Từ điển nguồn của app. `en.ts` khai `satisfies Dictionary<typeof vi>`: thiếu hoặc thừa key là lỗi lúc kiểm kiểu.
 *
 * - Mỗi nhánh cấp 1 là một file trong `vi/`. Nhánh `dataErrors`, `issues`, `language`, `lookup`, `manager`, `monitoring`, `pickups`,
 *   `roles`, `serverWarehouse`, `status`, `trips`, `warehouse` chép từ bản web (`src/web-mirror.json`) — không sửa ở đây; nhánh còn lại là của mobile. Màn
 *   ưu tiên câu của nhánh chép (cùng chữ với web): kho `warehouse` (phiên xếp của máy chủ `serverWarehouse`), tra cứu kiện `lookup`, chuyến của điều phối viên và quản lý `trips`,
 *   giám sát và sự cố `monitoring`, nhận hàng dọc đường `pickups`, số liệu của quản lý `manager`. Câu chỉ mobile cần nằm ở nhánh riêng
 *   của từng màn (`warehouseTrips`, `warehouseSession`, `warehouseStaging`, `warehouseLoading`, `warehouseFinished`, `packageLookup`,
 *   `companyTrips`, `overview`, `liveTrip`, `pickupRequest`), và phần máy chủ trả khác kho mẫu ở nhánh `officeServer` (màn văn phòng), `warehouseServer` (màn kho).
 * - Tham số viết `{ten}`; câu đổi theo số lượng là object đúng hai key `one` / `other` với tham số `{count}`.
 * - Tên riêng không dịch (LoadMaster, MOCK RESULT) để thẳng trong JSX.
 */
export const vi = {
  account,
  apiErrors,
  auth,
  backendErrors,
  common,
  companyTrips,
  dataErrors,
  driver,
  errors,
  issues,
  language,
  liveTrip,
  lookup,
  manager,
  monitoring,
  nav,
  notifications,
  officeServer,
  overview,
  packageLookup,
  pickupRequest,
  pickups,
  roles,
  serverWarehouse,
  status,
  tripException,
  trips,
  verify,
  warehouse,
  warehouseFinished,
  warehouseLoading,
  warehouseSession,
  warehouseServer,
  warehouseStaging,
  warehouseTrips,
} as const
