import type { Dictionary } from '../types'
import type { driver as source } from '../vi/driver'

export const driver = {
  myTrips: {
    title: 'My trips',
    groups: {
      inTransit: 'In transit',
      loaded: 'Loaded — waiting to depart',
      preparing: 'Warehouse is staging / loading',
      recent: 'Recently delivered',
    },
    empty: {
      title: 'No trips yet',
      description: 'Trips assigned to you appear here once the warehouse starts staging.',
    },
    stops: { one: '{count} stop', other: '{count} stops' },
    packages: { one: '{count} package', other: '{count} packages' },
    currentStop: 'Heading to stop {number}',
    completedAt: 'Delivered {time} {date}',
    issues: { one: '{count} delivery issue', other: '{count} delivery issues' },
  },
} satisfies Dictionary<typeof source>
