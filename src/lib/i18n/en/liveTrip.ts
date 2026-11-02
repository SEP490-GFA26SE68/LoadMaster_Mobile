import type { Dictionary } from '../types'
import type { liveTrip as source } from '../vi/liveTrip'

export const liveTrip = {
  title: 'Monitoring',
  card: {
    openHint: 'Open monitoring for trip {id}',
    noPosition: 'No vehicle position yet',
    pendingPickups: { one: '{count} pickup request awaiting approval', other: '{count} pickup requests awaiting approval' },
  },
  etaRisk: {
    one: '{count} trip has a stop close to its deadline or expected late.',
    other: '{count} trips have a stop close to their deadline or expected late.',
  },
  escalated: {
    one: '{count} incident was sent up to you: contact the customer and enter a new deadline.',
    other: '{count} incidents were sent up to you: contact the customers and enter new deadlines.',
  },
  escalatedOpen: 'View incidents to handle',
  refreshFailed: 'Could not refresh monitoring: {message}',
  openDetail: 'Trip details',
  stops: { noEta: 'No estimated arrival yet' },
  notRunning: 'Trip {id} is no longer in transit: the vehicle position and arrival times stopped updating.',
  system: 'the system',
  resolve: {
    title: 'Incident {id} handled',
    description: 'Mark the incident of trip {tripId} as handled. A note, if any, is saved with the incident.',
    note: 'Handling note',
    noteHint: 'Optional. What was done, who was told.',
    noteTooLong: 'The note can be at most {max} characters.',
    cancel: 'Cancel',
    confirm: 'Handled',
  },
  resolutionNote: 'Handling note: {note}',
  deadline: {
    dateHint: 'Date as dd/mm/yyyy, for example 24/10/2026.',
    timeHint: 'Time as HH:mm, 24-hour, for example 17:30.',
  },
} satisfies Dictionary<typeof source>
