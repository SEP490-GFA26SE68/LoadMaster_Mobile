import type { Dictionary } from '../types'
import type { notifications as source } from '../vi/notifications'
import { lookup as lookupScreen } from './lookup'
import { warehouse as warehouseScreen } from './warehouse'

export const notifications = {
  label: 'Notifications',
  labelUnread: { one: 'Notifications, {count} unread', other: 'Notifications, {count} unread' },
  title: 'Notifications',
  unreadCount: { one: '{count} unread', other: '{count} unread' },
  markAllRead: 'Mark as read',
  unread: 'Unread',
  empty: 'No notifications in the last {days} days.',
  scope: 'Events from the last {days} days, not including your own actions.',
  dateTime: '{time} · {date}',
  target: {
    trip: 'Trip {id}',
    tripNamed: 'Trip {id} · {name}',
    ticket: 'Support request {id}',
  },
  openTrip: 'Open trip {id}',
  driver: {
    loadingStarted: 'New trip: the warehouse is staging your cargo',
    loadingRestarted: 'The warehouse is staging your cargo again',
    loadingCompleted: 'Loaded — waiting for you to depart',
    replanDamaged: 'Trip on hold: the warehouse reported a damaged package, waiting for the dispatcher to re-plan',
    replanShortage: 'Trip on hold: a package is missing, waiting for the dispatcher to re-plan',
    cancelled: 'Trip cancelled',
    assigned: 'New trip: you now drive this trip',
    unassigned: 'You no longer drive this trip',
    pickupApproved: 'The dispatcher approved an en-route pickup — the route has a new pickup stop',
    pickupRejected: 'En-route pickup request rejected',
    stopsReordered: 'The dispatcher changed the stop order — check the route',
  },
  warehouse: {
    shortageKept: 'The dispatcher chose to keep searching for package {id} — find it and bring it to the staging area',
    shortageDropped: 'The dispatcher dropped package {id} from the trip — staged packages stay in the staging area; continue once the new plan is approved',
    manualRejected: warehouseScreen.confirms.rejected,
    cancelled: warehouseScreen.cancelledTitle,
    cancelledUnload: warehouseScreen.cancelledUnload,
    nothingLoaded: 'No package is on the truck yet, nothing to unload.',
  },
  manualRejected: 'The dispatcher rejected your manual confirmation — check the package again',
  ticketReplied: 'Support replied to your request',
  params: {
    reason: 'Reason',
    loaded: 'Loaded',
    returned: 'Returned',
    packageInstanceId: 'Package',
    packageCode: lookupScreen.fields.senderCode,
    count: 'Packages',
    lateStops: 'Stops expected late',
  },
  detail: '{label}: {value}',
} satisfies Dictionary<typeof source>
