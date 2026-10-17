import { account } from './en/account'
import { apiErrors } from './en/apiErrors'
import { auth } from './en/auth'
import { backendErrors } from './en/backendErrors'
import { common } from './en/common'
import { dataErrors } from './en/dataErrors'
import { driver } from './en/driver'
import { fleet } from './en/fleet'
import { issues } from './en/issues'
import { language } from './en/language'
import { monitoring } from './en/monitoring'
import { nav } from './en/nav'
import { notifications } from './en/notifications'
import { roles } from './en/roles'
import { status } from './en/status'
import { tripException } from './en/tripException'
import { verify } from './en/verify'
import { warehouse } from './en/warehouse'
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
  fleet,
  issues,
  language,
  monitoring,
  nav,
  notifications,
  roles,
  status,
  tripException,
  verify,
  warehouse,
} satisfies Dictionary<typeof vi>
