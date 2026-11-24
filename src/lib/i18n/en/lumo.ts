import type { Dictionary } from '../types'
import type { lumo as source } from '../vi/lumo'

export const lumo = {
  ticket: 'Support request {code} has been created. The support team replies under “Support requests” on the web app.',
  unavailable: 'The AI assistant is not available for this account.',
} satisfies Dictionary<typeof source>
