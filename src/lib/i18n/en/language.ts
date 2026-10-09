import type { Dictionary } from '../types'
import type { language as source } from '../vi/language'

export const language = {
  label: 'Interface language',
} satisfies Dictionary<typeof source>
