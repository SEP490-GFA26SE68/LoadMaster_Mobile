import type { Dictionary } from '../types'
import type { auth as source } from '../vi/auth'

export const auth = {
  login: {
    title: 'Sign in',
    subtitle: 'Plan and track cargo loading.',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    emailRequired: 'Enter your email',
    emailInvalid: 'This email is not valid',
    passwordRequired: 'Enter your password',
  },
  passwordToggle: {
    show: 'Show password',
    hide: 'Hide password',
  },
  demo: {
    title: 'Demo accounts',
    hint: 'Tap an account to fill in its email and the sample password.',
    platform: 'Platform',
  },
} satisfies Dictionary<typeof source>
