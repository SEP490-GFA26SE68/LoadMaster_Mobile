import type { Dictionary } from '../types'
import type { common as source } from '../vi/common'

export const common = {
  loading: 'Loading…',
  retry: 'Try again',
  loadFailed: 'Could not load data',
} satisfies Dictionary<typeof source>
