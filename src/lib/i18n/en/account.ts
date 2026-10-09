import type { Dictionary } from '../types'
import type { account as source } from '../vi/account'

export const account = {
  title: 'Account',
  email: 'Email',
  phone: 'Phone',
  depot: 'Depot / branch',
  signOut: 'Sign out',
  dataSource: {
    title: 'Data source',
    mock: 'Sample data on this device. The app is not connected to a server: nothing you do here shows on the web app or other devices.',
    http: 'Server {url}',
    mixed: 'Server {url} for: {features}. Everything else uses sample data on this device.',
  },
  scope: {
    webOnly: 'Your role works in the web app. This app only has your account.',
    notYet: 'This version has no work screens for your role yet.',
  },
} satisfies Dictionary<typeof source>
