import type { Dictionary } from '../types'
import type { backendErrors as source } from '../vi/backendErrors'

export const backendErrors = {
  PACKAGE_CODE_UNKNOWN: 'Code {code} matches no package of the current stop.',
  PACKAGE_ALREADY_UNLOADED: 'Package {code} is already recorded as unloaded.',
  PACKAGE_NOT_AT_STOP: 'Package {code} does not belong to the current stop. Nothing was recorded — keep it on the vehicle.',
  STOP_NOT_COMPLETABLE: 'The server does not allow completing stop {name} yet: some packages are not unloaded.',
  TRIP_NOT_IN_TRANSIT: 'Trip {tripId} is no longer among your trips in transit.',
  SIGN_IN_FAILED: 'The sign-in server did not accept this sign-in. Try again; if it keeps failing, tell your system administrator.',
  PASSWORD_CHANGE_REQUIRED: 'This account needs a new password before it can sign in.',
  SIGN_IN_REJECTED: 'The server did not accept the new session: the sign-in settings of the app and the server do not match. Tell your system administrator.',
  PROFILE_UNAVAILABLE: 'Your account profile could not be read from the server. Try signing in again.',
  PROFILE_NOT_FOUND: 'This sign-in is not linked to any LoadMaster user. Contact your company administrator.',
  ROLE_UNKNOWN: 'Your account has a role ("{role}") this app does not support. Contact your company administrator.',
  RESET_REQUEST_REFUSED: 'The code was not sent: you just asked for one or asked too many times. Wait a few minutes and try again.',
  RESET_CODE_INVALID: 'The code is wrong or has expired. Check it, or send a new code.',
  RESET_SESSION_EXPIRED: 'The password reset has expired. Start again from the email step.',
  OTP_RESEND_COOLDOWN: 'You just asked for a code. Wait a minute before sending another.',
  OTP_REQUEST_LIMIT_EXCEEDED: 'You have asked for a code too many times. Try again later.',
  OTP_EXPIRED: 'The code has expired or can no longer be used. Tap Send a new code to get another.',
  OTP_INCORRECT: 'The code is wrong. Check the code in your email.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many wrong attempts. Tap Send a new code to get another.',
} satisfies Dictionary<typeof source>
