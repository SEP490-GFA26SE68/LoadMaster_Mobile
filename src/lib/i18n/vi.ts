import { account } from './vi/account'
import { apiErrors } from './vi/apiErrors'
import { auth } from './vi/auth'
import { common } from './vi/common'
import { dataErrors } from './vi/dataErrors'
import { driver } from './vi/driver'
import { issues } from './vi/issues'
import { language } from './vi/language'
import { nav } from './vi/nav'
import { roles } from './vi/roles'
import { status } from './vi/status'

/**
 * Từ điển nguồn của app. `en.ts` khai `satisfies Dictionary<typeof vi>`: thiếu hoặc thừa key là lỗi lúc kiểm kiểu.
 *
 * - Mỗi nhánh cấp 1 là một file trong `vi/`. Nhánh `dataErrors`, `issues`, `language`, `roles`, `status` chép từ bản web
 *   (`src/web-mirror.json`) — không sửa ở đây; nhánh còn lại là của mobile.
 * - Tham số viết `{ten}`; câu đổi theo số lượng là object đúng hai key `one` / `other` với tham số `{count}`.
 * - Tên riêng không dịch (LoadMaster, MOCK RESULT) để thẳng trong JSX.
 */
export const vi = {
  account,
  apiErrors,
  auth,
  common,
  dataErrors,
  driver,
  issues,
  language,
  nav,
  roles,
  status,
} as const
