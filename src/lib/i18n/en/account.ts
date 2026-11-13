import type { Dictionary } from '../types'
import type { account as source } from '../vi/account'

export const account = {
  title: 'Account',
  email: 'Email',
  phone: 'Phone',
  depot: 'Depot / branch',
  signOut: 'Sign out',
  changePassword: 'Change password',
  backToAccount: 'Back to account',
  passwordChanged: 'Password changed. Use the new password next time you sign in.',
  dataSource: {
    title: 'Data source',
    mock: 'Sample data on this device. The app is not connected to a server: nothing you do here shows on the web app or other devices.',
    http: 'Server {url}',
    mixed: 'Server {url} for: {features}. Everything else uses sample data on this device.',
  },
  scope: {
    webOnly: 'Your role works in the web app. This app only has your account.',
  },
} satisfies Dictionary<typeof source>
