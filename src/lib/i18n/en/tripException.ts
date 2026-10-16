import type { Dictionary } from '../types'
import type { tripException as source } from '../vi/tripException'

export const tripException = {
  open: 'Incident on the road',
  title: 'Report an incident of trip {id}',
  description: 'The simulated vehicle stands still for exactly the expected delay; arrival times are recalculated from the vehicle position.',
  type: 'Incident type',
  details: 'Description',
  detailsHint: 'What happened, and where.',
  delay: 'Expected delay in minutes',
  delayHint: 'A whole number from 0 to {max}.',
  errors: {
    typeRequired: 'Choose the incident type.',
    detailsRequired: 'Describe the incident.',
    detailsTooLong: 'The description can be at most {max} characters.',
    delayInvalid: 'Enter whole minutes from 0 to {max}.',
  },
  cancel: 'Cancel',
  submit: 'Report incident',
  reported: 'Incident {id} reported.',
} satisfies Dictionary<typeof source>
