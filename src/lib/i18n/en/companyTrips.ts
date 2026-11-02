import type { Dictionary } from '../types'
import type { companyTrips as source } from '../vi/companyTrips'

export const companyTrips = {
  title: 'Trips',
  list: {
    loading: 'Loading trips',
    search: 'Search trips',
    emptyDescription: 'Your company’s trips show up here, grouped by run date.',
    noMatchTitle: 'No results match the filters',
    noMatchDescription: 'Try another search, or show every status.',
    clearFilters: 'Clear filters',
    openHint: 'Opens the trip details',
  },
  detail: {
    monitor: 'Monitor trip',
    routeNotOptimized: 'Route not optimized: no stop order, expected arrival times or deadline status yet.',
    liveEta: 'Expected arrival times based on the vehicle position are on the Monitor trip screen.',
  },
  packageCount: { one: '{count} package', other: '{count} packages' },
  verifyContexts: {
    STAGING: 'Staging',
    LOADING: 'Loading',
    UNLOADING: 'Unloading',
    PICKUP: 'En-route pickup',
  },
  requirements: {
    title: 'Delivery requirements of this trip',
    count: { one: '{count} requirement', other: '{count} requirements' },
    stop: 'Stop {number} · {name}',
    deadline: 'Due {time} {date}',
    status: {
      PENDING: 'Waiting for a trip',
      ASSIGNED: 'On a trip',
      IN_TRIP: 'Being delivered',
      DELIVERED: 'Delivered',
      PARTIAL: 'Delivered short',
    },
  },
  priority: {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Urgent',
  },
  fieldNames: {
    name: 'Trip name',
    vehicleId: 'Vehicle',
    stops: 'Delivery stops',
    packages: 'Packages',
    scheduledDate: 'Scheduled date',
    departureAt: 'Departure time',
    departureDepot: 'Departure depot',
    driverId: 'Driver',
  },
  packageFields: {
    name: 'Package name',
    lengthCm: 'Length',
    widthCm: 'Width',
    heightCm: 'Height',
    weightKg: 'Weight',
    quantity: 'Quantity',
    deliveryStop: 'Delivery stop',
    fragilityLevel: 'Fragility',
    maxTopLoadKg: 'Max load on top',
    priority: 'Priority',
  },
} satisfies Dictionary<typeof source>
