import { account } from './en/account'
import { apiErrors } from './en/apiErrors'
import { auth } from './en/auth'
import { backendErrors } from './en/backendErrors'
import { common } from './en/common'
import { dataErrors } from './en/dataErrors'
import { driver } from './en/driver'
import { errors } from './en/errors'
import { issues } from './en/issues'
import { language } from './en/language'
import { lookup } from './en/lookup'
import { nav } from './en/nav'
import { notifications } from './en/notifications'
import { packageLookup } from './en/packageLookup'
import { roles } from './en/roles'
import { status } from './en/status'
import { tripException } from './en/tripException'
import { verify } from './en/verify'
import { warehouse } from './en/warehouse'
import { warehouseFinished } from './en/warehouseFinished'
import { warehouseLoading } from './en/warehouseLoading'
import { warehouseSession } from './en/warehouseSession'
import { warehouseStaging } from './en/warehouseStaging'
import { warehouseTrips } from './en/warehouseTrips'
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
} satisfies Dictionary<typeof vi>
