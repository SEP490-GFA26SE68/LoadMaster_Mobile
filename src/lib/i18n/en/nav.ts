import type { Dictionary } from '../types'
import type { nav as source } from '../vi/nav'

export const nav = {
  trips: 'My trips',
  warehouse: 'Warehouse',
  fleet: 'Trips',
  monitoring: 'Monitoring',
  account: 'Account',
} satisfies Dictionary<typeof source>
