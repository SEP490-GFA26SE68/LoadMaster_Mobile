import type { Dictionary } from '../types'
import type { tripException as source } from '../vi/tripException'

export const tripException = {
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
  history: {
    open: 'View reported incidents',
    openWithCount: 'View reported incidents ({count})',
    bannerTitle: 'Reported road incidents ({count})',
    viewAll: 'View details',
    title: 'Road incidents — trip {id}',
    description: 'Road incidents reported for this trip.',
    empty: 'No road incidents have been reported for this trip yet.',
    loading: 'Loading reported incidents...',
    reportNew: 'Report new incident',
    close: 'Close',
    delayMinutes: '{minutes} min delay',
    atStop: 'At stop {number}',
    reportedAt: 'Reported at {time}',
    resolutionNote: 'Resolution note: {note}',
    status: {
      OPEN: 'Open',
      ESCALATED: 'Escalated',
      RESOLVED: 'Resolved',
    },
  },
} satisfies Dictionary<typeof source>
