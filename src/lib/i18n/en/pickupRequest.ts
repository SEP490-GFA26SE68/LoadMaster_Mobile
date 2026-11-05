import type { Dictionary } from '../types'
import type { pickupRequest as source } from '../vi/pickupRequest'

export const pickupRequest = {
  title: 'Pickup on the way',
  place: {
    search: 'Search sample places',
    hint: 'Type a province, district or industrial park. Sample coordinates are approximate, at area level.',
    none: 'No sample place matches.',
    choose: 'Choose {name}, {region}',
    chosen: 'Filled in the coordinates of {name}.',
  },
  latitude: 'Latitude',
  longitude: 'Longitude',
  coordinatesHint: 'Decimal degrees, dot or comma, for example 10.9294.',
  deadlineDateHint: 'Date as dd/mm/yyyy. Leave both date and time empty if there is no deadline.',
  deadlineTimeHint: 'Time as HH:mm, 24-hour.',
  deadlineFormat: 'The date or time is not valid: date as dd/mm/yyyy, time as HH:mm.',
  approvedDescription: {
    one: '{count} package is now in the package pool with a QR code; the pickup and delivery stops were added to the route.',
    other: '{count} packages are now in the package pool with QR codes; the pickup and delivery stops were added to the route.',
  },
  hideRules: 'Hide the ten rules',
  loadFailed: 'Could not load pickup requests: {message}',
} satisfies Dictionary<typeof source>
