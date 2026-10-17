import type { Dictionary } from '../types'
import type { monitoring as source } from '../vi/monitoring'

export const monitoring = {
  board: {
    title: 'Monitoring',
    empty: { title: 'No trips in transit', description: 'Trips currently in transit will show up here.' },
    exceptions: { one: '{count} exception', other: '{count} exceptions' },
    open: 'View trip',
    openLabel: 'View trip {tripId}',
    location: '{lat}, {lng}',
    noLocation: 'No GPS location yet',
  },
  trip: {
    title: 'Trip {tripId}',
    toBoard: 'Back to monitoring',
    location: 'Vehicle location',
    stops: 'Open stops',
    eta: 'ETA {time}',
    exceptions: 'Exceptions',
    noExceptions: 'No exceptions yet.',
    resolve: 'Mark resolved',
    escalate: 'Escalate to manager',
    note: 'Note',
    reroute: 'Find another route',
    confirmRoute: 'Use this route',
    options: 'Alternative routes',
    mock: 'MOCK RESULT',
    distance: '{km} km · {minutes} min',
  },
} satisfies Dictionary<typeof source>
