import type { Dictionary } from '../types'
import type { common as source } from '../vi/common'

export const common = {
  loading: 'Loading…',
  retry: 'Try again',
  loadFailed: 'Could not load data',
  back: 'Back',
  close: 'Close',
  dismiss: 'Dismiss',
  stop: 'Stop {number}',
  deliveryIssueKinds: { damaged: 'Damaged', missing: 'Missing', refused: 'Refused by customer', other: 'Other' },
  tripExceptionTypes: { TRAFFIC: 'Traffic jam', ACCIDENT: 'Accident', ROAD_CONSTRUCTION: 'Road works', VEHICLE_BREAKDOWN: 'Vehicle breakdown', OTHER: 'Other' },
  deadlineStatuses: { OK: 'On time', AT_RISK: 'Tight', MISSED: 'Expected late' },
  arrivalStatuses: { onTime: 'Arrived on time', late: 'Arrived late' },
  verifyMethods: { QR: 'QR scan', CODE: 'Typed code', MANUAL: 'By hand' },
  manualConfirmReasons: { LABEL_DAMAGED: 'Label torn / missing', QR_UNREADABLE: 'QR unreadable', OTHER: 'Other' },
} satisfies Dictionary<typeof source>
