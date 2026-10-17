import type { Dictionary } from '../types'
import type { fleet as source } from '../vi/fleet'

export const fleet = {
  title: 'Trips',
  empty: { title: 'No trips yet', description: 'Trips created by a dispatcher will show up here.' },
  driver: 'Driver {name}',
  noDriver: 'No driver assigned',
  monitor: 'Monitor',
  openLabel: 'Monitor {tripId}',
} satisfies Dictionary<typeof source>
