import { httpDriverApi } from '@/features/driver/driver-http'
import { fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { driverNotificationsOf, fetchServerNotifications, markServerNotificationsRead, warehouseNotificationsOf } from './server-notifications'

/** Một dòng `NotificationResponse` của máy chủ (tài xế xem là người dùng 15). */
function item(id: number, actionType: string, values: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {}, extra: Record<string, unknown> = {}) {
  return {
    id,
    actionType,
    entityName: 'Trip',
    entityId: '41',
    tripId: 41,
    tripCode: 'TRIP-0041',
    actorId: 3,
    actorName: 'Điều phối',
    actorRole: 'DISPATCHER',
    oldValues: values.old ?? null,
    newValues: values.new ?? null,
    createdAt: '2026-10-16T02:30:00Z',
    read: false,
    ...extra,
  }
}

const list = (...items: unknown[]) => ok({ items, unreadCount: items.length, windowDays: 7 })

async function serverItems(routes: Routes) {
  const { client, calls } = fakeDriverBackend(routes)
  return { items: await fetchServerNotifications(client), calls, client }
}

describe('chuông máy chủ: đọc và đánh dấu đã đọc', () => {
  test('GET /api/notifications: giờ máy chủ là Instant, đã đọc theo máy chủ, dòng thiếu giờ hay loại bị bỏ', async () => {
    const { items, calls } = await serverItems({
      'GET /api/notifications': () =>
        list(item(1, 'LOADING_COMPLETED', {}, { read: true }), item(2, 'TRIP_CANCELLED', {}, { createdAt: null }), item(3, null as unknown as string)),
    })
    expect(calls).toMatchObject([{ method: 'GET', path: '/api/notifications' }])
    expect(items).toEqual([
      { id: '1', at: '2026-10-16T02:30:00.000Z', actionType: 'LOADING_COMPLETED', tripId: '41', tripCode: 'TRIP-0041', before: {}, after: {}, read: true },
    ])
  })

  test('POST /api/notifications/read: gửi mã số dòng nhật ký, đọc lại danh sách máy chủ trả', async () => {
    const { client, calls } = fakeDriverBackend({ 'POST /api/notifications/read': () => list(item(5, 'LOADING_COMPLETED', {}, { read: true })) })
    const items = await markServerNotificationsRead(client, ['5', 'không-phải-số'])
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/notifications/read', body: { ids: [5] } })
    expect(items.map(({ id, read }) => [id, read])).toEqual([['5', true]])
  })

  test('máy chủ trả rỗng: không có thông báo', async () => {
    expect((await serverItems({ 'GET /api/notifications': () => ok(null) })).items).toEqual([])
  })
})

describe('chuông máy chủ của tài xế', () => {
  test('câu của tài xế theo loại việc; chi tiết chỉ điều tài xế làm theo; loại app chưa có câu bị bỏ', async () => {
    const { items } = await serverItems({
      'GET /api/notifications': () =>
        list(
          item(10, 'TRIP_CANCELLED', { old: { status: 'IN_TRANSIT' }, new: { reason: 'Khách hoãn', returned: 4, driverId: 15, requirementsReleased: 2 } }),
          item(9, 'LOADING_COMPLETED', { new: { loadedPackages: 12, driverId: 15 } }),
          item(8, 'PICKUP_APPROVED', { new: { placed: 2, unplaced: 1, driverId: 15 } }),
          item(7, 'TRIP_STATUS_TRANSITION', { new: { status: 'LOADING' } }),
          item(6, 'TRIP_STATUS_TRANSITION', { new: { status: 'IN_TRANSIT' } }),
          item(5, 'LOADING_DAMAGE_REPORTED', { new: { outcome: 'REPLANNED' } }),
          item(4, 'STAGING_SHORTAGE_RESOLVED', { new: { decision: 'DROP' } }),
          item(3, 'MANUAL_CONFIRM_REJECTED', { new: { reason: 'Kiện không đúng', requestedBy: 15 } }),
          item(2, 'SUPPORT_TICKET_UPDATED', { new: { ticketCode: 'TKT-007', replied: true, requestedBy: 15 } }, { tripId: null, tripCode: null }),
          item(1, 'PLAN_APPROVED'),
        ),
    })
    const notes = driverNotificationsOf(items, '15')
    expect(notes.map(({ id, kind, details }) => [id, kind, details])).toEqual([
      ['10', 'cancelled', { reason: 'Khách hoãn', returned: 4 }],
      ['9', 'loadingCompleted', { loaded: 12 }],
      ['8', 'pickupApproved', { count: 3 }],
      ['7', 'loadingStarted', {}],
      ['5', 'replanDamaged', {}],
      ['4', 'replanShortage', {}],
      ['3', 'manualRejected', { reason: 'Kiện không đúng' }],
      ['2', 'ticketReplied', {}],
    ])
    expect(notes[0]).toMatchObject({ target: { id: 'TRIP-0041' }, tripId: '41', read: false })
    expect(notes.at(-1)).toMatchObject({ target: { id: 'TKT-007' }, tripId: undefined })
  })

  test('đổi tài xế: người mới "được giao", người bị thay "không còn chạy" và thông báo của chuyến đó thôi mở chuyến', async () => {
    const { items } = await serverItems({
      'GET /api/notifications': () =>
        list(
          item(3, 'TRIP_UPDATED', { old: { driverId: 15 }, new: { driverId: 22, tripStatus: 'LOADING' } }),
          item(2, 'LOADING_COMPLETED', { new: { loadedPackages: 5 } }),
          item(1, 'TRIP_UPDATED', { old: { driverId: 9 }, new: { driverId: 15, tripStatus: 'LOADING' } }),
        ),
    })
    expect(driverNotificationsOf(items, '15').map(({ kind, tripId }) => [kind, tripId])).toEqual([
      ['unassigned', undefined],
      ['loadingCompleted', undefined],
      ['assigned', undefined],
    ])
    expect(driverNotificationsOf(items, '22').map(({ kind, tripId }) => [kind, tripId])).toEqual([
      ['assigned', '41'],
      ['loadingCompleted', '41'],
    ])
  })

  test('nguồn tài xế máy chủ: chuông đọc /api/notifications, đánh dấu đã đọc gửi lên máy chủ', async () => {
    const { client, calls } = fakeDriverBackend({
      'GET /api/notifications': () => list(item(9, 'LOADING_COMPLETED', { new: { loadedPackages: 12 } })),
      'POST /api/notifications/read': () => list(item(9, 'LOADING_COMPLETED', { new: { loadedPackages: 12 } }, { read: true })),
    })
    const driver = httpDriverApi({ client: () => client, userId: () => '15' })
    expect(driver.capabilities.notifications).toBe(true)
    expect(await driver.fetchNotifications()).toMatchObject([{ id: '9', kind: 'loadingCompleted', read: false }])
    expect(await driver.markNotificationsRead(['9'])).toMatchObject([{ id: '9', read: true }])
    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual(['GET /api/notifications', 'POST /api/notifications/read'])
  })
})

describe('chuông máy chủ của kho', () => {
  test('chuyến huỷ lúc đang xếp, quyết định với kiện báo thiếu, yêu cầu hỗ trợ đổi trạng thái; loại khác bị bỏ', async () => {
    const { items } = await serverItems({
      'GET /api/notifications': () =>
        list(
          item(5, 'TRIP_CANCELLED', { old: { status: 'LOADING' }, new: { reason: 'Xe hỏng', loadedPackages: 3 } }),
          item(4, 'STAGING_SHORTAGE_RESOLVED', { new: { decision: 'KEEP_SEARCHING', reportedBy: 20 } }),
          item(3, 'STAGING_SHORTAGE_RESOLVED', { new: { decision: 'DROP', reportedBy: 20 } }),
          item(2, 'SUPPORT_TICKET_UPDATED', { new: { ticketCode: 'TKT-009', replied: false, status: 'CLOSED' } }, { tripId: null, tripCode: null, read: true }),
          item(1, 'LOADING_COMPLETED'),
        ),
    })
    expect(warehouseNotificationsOf(items).map(({ id, kind, tripId, details, read }) => [id, kind, tripId, details, read])).toEqual([
      ['5', 'cancelled', '41', { loaded: 3, reason: 'Xe hỏng' }, false],
      ['4', 'shortageKept', '41', {}, false],
      ['3', 'shortageDropped', '41', {}, false],
      ['2', 'ticketUpdated', undefined, {}, true],
    ])
  })

})
