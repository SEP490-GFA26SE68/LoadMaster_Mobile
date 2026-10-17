import type { Dictionary } from '../types'
import type { backendErrors as source } from '../vi/backendErrors'

export const backendErrors = {
  PACKAGE_CODE_UNKNOWN: 'Code {code} matches no package of the current stop.',
  PACKAGE_ALREADY_UNLOADED: 'Package {code} is already recorded as unloaded.',
  PACKAGE_NOT_AT_STOP: 'Package {code} does not belong to the current stop. Nothing was recorded — keep it on the vehicle.',
  STOP_NOT_COMPLETABLE: 'The server does not allow completing stop {name} yet: some packages are not unloaded.',
  TRIP_NOT_IN_TRANSIT: 'Trip {tripId} is no longer among your trips in transit.',
  SIGN_IN_FAILED: 'Signing in through the server sign-in page failed. Try again.',
  SIGN_IN_REJECTED: 'The server did not accept the new session: the sign-in settings of the app and the server do not match. Tell your system administrator.',
  PROFILE_UNAVAILABLE: 'Your account profile could not be read from the server. Try signing in again.',
  ROLE_UNKNOWN: 'Your account has a role ("{role}") this app does not support. Contact your company administrator.',
  LOADING_NOT_STARTED: 'Loading has not started for trip {tripId}.',
  PACKAGE_LOOKUP_UNKNOWN: 'No package matches code {code}.',
  PLACEMENT_ALREADY_CONFIRMED: 'This placement is already confirmed.',
} satisfies Dictionary<typeof source>
