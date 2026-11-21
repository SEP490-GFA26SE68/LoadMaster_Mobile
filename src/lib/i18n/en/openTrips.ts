import type { Dictionary } from '../types'
import type { openTrips as source } from '../vi/openTrips'

export const openTrips = {
  title: 'Open trips',
  loading: 'Loading open trips…',
  stopCount: '{count} stops',
  originWarehouse: 'Origin: {warehouse}',
  departureTime: 'Departure: {time}',
  departureNotSet: 'No departure time',
  empty: {
    title: 'No open trips',
    description: 'There are currently no open trips waiting for drivers.',
  },
  status: {
    pending: 'Pending approval',
    rejected: 'Rejected',
  },
  actions: {
    claim: 'Claim trip',
    cancel: 'Cancel claim',
  },
  rejectReason: 'Reason: {reason}',
} satisfies Dictionary<typeof source>
