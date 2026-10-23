import type { WarehouseNotification } from '@/features/warehouse/warehouse-model'
import { createFormatter } from '@/lib/format'
import { createTranslator } from '@/lib/i18n'

import { warehouseRow } from './bell-rows'

/**
 * Dòng của chuông kho với dữ liệu kho mẫu chưa có: kiện của yêu cầu giao mang mã của bên gửi khác mã kiện, và số kiện đọc theo ngôn
 * ngữ. Luồng đủ (điều phối viên quyết, huỷ chuyến, trả lời hỗ trợ) ở `WarehouseNotifications.test.tsx`.
 */

const vi = { t: createTranslator('vi'), format: createFormatter('vi-VN') }
const en = { t: createTranslator('en'), format: createFormatter('en-US') }

const TRIP = { id: 'TRIP-2026-0914', label: 'Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà' }

function notice(kind: WarehouseNotification['kind'], details: WarehouseNotification['details']): WarehouseNotification {
  return { id: 'EV-000201', at: '2026-09-14T03:20:00.000Z', kind, target: TRIP, tripId: TRIP.id, details }
}

test('kiện báo thiếu có mã của bên gửi khác mã kiện: thêm một dòng mã in trên nhãn để tìm đúng kiện', () => {
  const kept = notice('shortageKept', { packageInstanceId: 'PKG-007-02', packageCode: 'HK-DNG-2609-01' })
  expect(warehouseRow(kept, vi.t, vi.format)).toStrictEqual({
    id: 'EV-000201',
    at: '2026-09-14T03:20:00.000Z',
    sentence: 'Điều phối viên chọn tìm tiếp kiện PKG-007-02 — tìm kiện này rồi soạn vào khu chờ',
    target: 'Chuyến TRIP-2026-0914 · Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà',
    details: ['Mã của bên gửi: HK-DNG-2609-01'],
    open: { tripId: 'TRIP-2026-0914', href: { pathname: '/loading/[tripId]', params: { tripId: 'TRIP-2026-0914' } } },
  })
  expect(warehouseRow(kept, en.t, en.format).details).toStrictEqual(['Sender code: HK-DNG-2609-01'])

  const sameCode = notice('shortageDropped', { packageInstanceId: 'PKG-007-02', packageCode: 'PKG-007-02' })
  expect(warehouseRow(sameCode, vi.t, vi.format).details).toStrictEqual([])
})

test('chuyến huỷ lúc đang xếp: dòng dưới câu nói số kiện phải dỡ theo ngôn ngữ, tiếng Anh chia số ít', () => {
  const one = notice('cancelled', { reason: 'Khách hoãn nhận hàng', loaded: 1 })
  expect(warehouseRow(one, en.t, en.format)).toMatchObject({
    sentence: 'Trip cancelled',
    details: ['Unload the 1 package already loaded.', 'Reason: Khách hoãn nhận hàng'],
  })

  const many = notice('cancelled', { reason: 'Xe hỏng máy lạnh', loaded: 1000 })
  expect(warehouseRow(many, vi.t, vi.format)).toMatchObject({
    sentence: 'Chuyến đã huỷ',
    details: ['Dỡ 1.000 kiện đã xếp khỏi xe.', 'Lý do: Xe hỏng máy lạnh'],
  })
  expect(warehouseRow(many, en.t, en.format).details[0]).toBe('Unload the 1,000 packages already loaded.')

  // Nguồn không nói số kiện đã lên xe: không nói "không phải dỡ"
  const unknown = notice('cancelled', { reason: 'Xe hỏng máy lạnh' })
  expect(warehouseRow(unknown, vi.t, vi.format).details).toStrictEqual(['Lý do: Xe hỏng máy lạnh'])
})

test('trả lời yêu cầu hỗ trợ: đối tượng là yêu cầu, dòng không mở chuyến nào', () => {
  const replied: WarehouseNotification = {
    id: 'EV-000202',
    at: '2026-09-14T04:00:00.000Z',
    kind: 'ticketReplied',
    target: { id: 'TKT-003', label: undefined },
    tripId: undefined,
    details: {},
  }
  expect(warehouseRow(replied, vi.t, vi.format)).toMatchObject({
    sentence: 'Bộ phận hỗ trợ đã trả lời yêu cầu của bạn',
    target: 'Yêu cầu hỗ trợ TKT-003',
    details: [],
    open: undefined,
  })
})
