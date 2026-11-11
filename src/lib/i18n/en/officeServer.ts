import type { Dictionary } from '../types'
import type { officeServer as source } from '../vi/officeServer'

export const officeServer = {
  trips: {
    noDeparture: 'No departure time yet',
    noVehicle: 'No vehicle assigned',
    departure: 'Departs {time} {date}',
    cancelled: 'Trip cancelled. Reason: {reason}',
    plannedArrival: 'Planned arrival {time} {date}',
    actualArrival: 'Arrived {time} {date}',
    stop: 'Stop {number} / {total}: {name}',
  },
  overview: {
    retired: 'Retired',
  },
} satisfies Dictionary<typeof source>
