import { ROLES, type Role } from '@/types/user'

import { hasTab, landingOf, scopeNote, WORK_TABS, type WorkTab } from './landing'

/** Tab làm việc của từng vai trò trên app, theo thứ tự trên thanh — phạm vi app đã duyệt. */
const EXPECTED: Readonly<Record<Role, readonly WorkTab[]>> = {
  systemAdmin: [],
  systemManager: [],
  systemSupporter: [],
  companyAdmin: [],
  manager: ['overview', 'trip-list', 'monitoring'],
  dispatcher: ['trip-list', 'monitoring'],
  warehouse: ['warehouse', 'lookup'],
  driver: ['trips'],
}

describe('tab làm việc theo vai trò', () => {
  test.each(ROLES)('%s: đúng các tab của phạm vi app, màn chính là tab đầu tiên', (role) => {
    const tabs = WORK_TABS.filter((tab) => hasTab(role, tab))
    expect(tabs).toEqual(EXPECTED[role])
    expect(landingOf(role)).toBe(tabs[0] === undefined ? '/account' : `/${tabs[0]}`)
    expect(scopeNote(role)).toBe(tabs.length === 0 ? 'webOnly' : null)
  })

  test('điều phối viên có quyền bảng điều khiển và tra cứu kiện nhưng hai màn đó của họ ở bản web: không có tab', () => {
    expect(hasTab('dispatcher', 'overview')).toBe(false)
    expect(hasTab('dispatcher', 'lookup')).toBe(false)
  })

  test('chưa đăng nhập thì không có tab nào', () => {
    for (const tab of WORK_TABS) expect(hasTab(undefined, tab)).toBe(false)
  })
})
