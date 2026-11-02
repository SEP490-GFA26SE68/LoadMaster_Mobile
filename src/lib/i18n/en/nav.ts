import type { Dictionary } from '../types'
import type { nav as source } from '../vi/nav'

export const nav = {
  trips: 'My trips',
  warehouse: 'Warehouse',
  lookup: 'Package lookup',
  overview: 'Overview',
  tripList: 'Trips',
  monitoring: 'Monitoring',
  account: 'Account',
} satisfies Dictionary<typeof source>
