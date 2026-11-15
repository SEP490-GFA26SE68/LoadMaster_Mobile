import type { Dictionary } from '../types'
import type { accountLock as source } from '../vi/accountLock'

export const accountLock = {
  signOut: 'Sign out',
  subscriptionExpired: {
    badge: 'Plan expired',
    title: 'Your company’s plan has expired',
    body: 'Your company has no active LoadMaster plan. Every operating feature (trips, dispatch, warehouse and load optimisation) is paused.',
    nextBody: 'Ask your company admin to renew or subscribe to a plan.',
  },
  flagged: {
    badge: 'Account locked',
    title: 'Account temporarily locked: the service agreement was not signed within 72 hours',
    body: 'The operating screens are paused.',
    nextBody: 'Your company admin needs to sign the service agreement on the LoadMaster web app to reopen the account.',
  },
} satisfies Dictionary<typeof source>
