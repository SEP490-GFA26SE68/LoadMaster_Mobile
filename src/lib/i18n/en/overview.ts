import type { Dictionary } from '../types'
import type { overview as source } from '../vi/overview'

export const overview = {
  title: 'Overview',
  emptyDescription: 'Pick another period to see the figures of the trips that run in it.',
  fleetStatus: {
    available: 'Available',
    in_use: 'On a trip',
    maintenance: 'Maintenance',
  },
  statusRow: '{count} · {share}',
  statusRowA11y: '{status}: {count}, {share}',
} satisfies Dictionary<typeof source>
