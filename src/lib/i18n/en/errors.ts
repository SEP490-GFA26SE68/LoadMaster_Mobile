import type { Dictionary } from '../types'
import type { errors as source } from '../vi/errors'

export const errors = {
  home: 'Go to main screen',
  crash: {
    title: 'This screen could not be shown',
  },
  notFound: {
    title: 'Screen not found',
    description: 'The address you opened does not match any screen in the app. The link may be out of date or mistyped.',
  },
} satisfies Dictionary<typeof source>
