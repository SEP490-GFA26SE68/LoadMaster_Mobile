import type { Dictionary } from '../types'
import type { nav as source } from '../vi/nav'

export const nav = {
  trips: 'My trips',
  account: 'Account',
} satisfies Dictionary<typeof source>
