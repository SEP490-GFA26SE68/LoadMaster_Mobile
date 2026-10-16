import { account } from './en/account'
import { apiErrors } from './en/apiErrors'
import { auth } from './en/auth'
import { backendErrors } from './en/backendErrors'
import { common } from './en/common'
import { dataErrors } from './en/dataErrors'
import { driver } from './en/driver'
import { issues } from './en/issues'
import { language } from './en/language'
import { nav } from './en/nav'
import { notifications } from './en/notifications'
import { roles } from './en/roles'
import { status } from './en/status'
import { tripException } from './en/tripException'
import { verify } from './en/verify'
import type { Dictionary } from './types'
import type { vi } from './vi'

export const en = {
  account,
  apiErrors,
  auth,
  backendErrors,
  common,
  dataErrors,
  driver,
  issues,
  language,
  nav,
  notifications,
  roles,
  status,
  tripException,
  verify,
} satisfies Dictionary<typeof vi>
