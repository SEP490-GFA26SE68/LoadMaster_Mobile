import { account } from './en/account'
import { apiErrors } from './en/apiErrors'
import { auth } from './en/auth'
import { common } from './en/common'
import { dataErrors } from './en/dataErrors'
import { driver } from './en/driver'
import { issues } from './en/issues'
import { language } from './en/language'
import { nav } from './en/nav'
import { roles } from './en/roles'
import { status } from './en/status'
import type { Dictionary } from './types'
import type { vi } from './vi'

export const en = {
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
} satisfies Dictionary<typeof vi>
