import { account } from './en/account'
import { apiErrors } from './en/apiErrors'
import { auth } from './en/auth'
import { backendErrors } from './en/backendErrors'
import { common } from './en/common'
import { companyTrips } from './en/companyTrips'
import { dataErrors } from './en/dataErrors'
import { driver } from './en/driver'
import { errors } from './en/errors'
import { issues } from './en/issues'
import { language } from './en/language'
import { liveTrip } from './en/liveTrip'
import { lookup } from './en/lookup'
import { manager } from './en/manager'
import { monitoring } from './en/monitoring'
import { nav } from './en/nav'
import { notifications } from './en/notifications'
import { overview } from './en/overview'
import { packageLookup } from './en/packageLookup'
import { pickupRequest } from './en/pickupRequest'
import { pickups } from './en/pickups'
import { roles } from './en/roles'
import { status } from './en/status'
import { tripException } from './en/tripException'
import { trips } from './en/trips'
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
  overview,
  packageLookup,
  pickupRequest,
  pickups,
  roles,
  status,
  tripException,
  trips,
  verify,
  warehouse,
  warehouseFinished,
  warehouseLoading,
  warehouseSession,
  warehouseStaging,
  warehouseTrips,
} satisfies Dictionary<typeof vi>
