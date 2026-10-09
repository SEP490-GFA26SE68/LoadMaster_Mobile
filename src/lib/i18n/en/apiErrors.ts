import type { Dictionary } from '../types'
import type { apiErrors as source } from '../vi/apiErrors'

export const apiErrors = {
  NETWORK_ERROR: 'Could not reach the server. Check your connection and try again.',
  TIMEOUT: 'The server took too long to respond. Try again later.',
  UNAUTHENTICATED: 'Your session has ended. Sign in again.',
  UNAUTHORIZED: 'You do not have permission to do this.',
  SERVER_ERROR: 'The server ran into a problem. Try again later.',
  HTTP_NOT_WIRED: 'This feature is not connected to the server yet.',
} satisfies Dictionary<typeof source>
