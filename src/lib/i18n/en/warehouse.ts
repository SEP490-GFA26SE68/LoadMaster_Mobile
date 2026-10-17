import type { Dictionary } from '../types'
import type { warehouse as source } from '../vi/warehouse'

export const warehouse = {
  tasks: {
    title: 'Warehouse tasks',
    empty: { title: 'No trips to load', description: 'Trips with an approved load plan will show up here.' },
    packages: { one: '{count} package', other: '{count} packages' },
    start: 'Start loading',
    resume: 'Resume loading',
    openLabel: '{action} {tripId}',
    scan: 'Look up package',
  },
  loading: {
    title: 'Loading {tripId}',
    toTasks: 'Back to warehouse tasks',
    next: 'Next package',
    done: 'Every package is loaded',
    position: 'Position {x} · {y} · {z} cm',
    confirm: 'Confirm loaded',
    deviate: 'Record deviation',
    complete: 'Finish loading',
    completed: 'Finished loading trip {tripId}.',
    deviation: {
      title: 'Position deviation',
      x: 'Actual X (cm)',
      y: 'Actual Y (cm)',
      z: 'Actual Z (cm)',
      reason: 'Reason',
      submit: 'Record deviation',
    },
  },
  scan: {
    title: 'Package lookup',
    hint: 'Scan the label QR or type the package code.',
    code: 'Package / QR code',
    submit: 'Look up',
    destination: 'Destination',
    trip: 'Trip {tripId}',
    stop: 'Stop {number}: {name}',
    weight: '{weight}',
  },
} satisfies Dictionary<typeof source>
