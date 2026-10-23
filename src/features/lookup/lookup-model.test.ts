import type { Package } from '@/lib/mock-db'

import type { PackageLookup } from './lookup-api'
import { lookupActions, lookupView } from './lookup-model'

/** Tab Tra cứu kiện: màn hiện gì với kết quả nào, và nhân viên kho làm được gì trên một kiện (cùng các ca của bản web). */

const pkg = (overrides: Partial<Package> = {}): Package => ({
  id: 'PK-0063',
  companyId: 'LOG-001',
  packageCode: 'BV-VIN-2609-05',
  qrToken: 'LM-7K3F-9XQ2-M4TD',
  lengthCm: 80,
  widthCm: 60,
  heightCm: 50,
  weightKg: 32,
  handlingClass: 'STANDARD',
  destination: 'KCN Bắc Vinh, TP. Vinh, Nghệ An',
  status: 'IMPORTED',
  flags: [],
  source: 'IMPORT',
  createdAt: '2026-09-13T09:20:00.000Z',
  createdBy: 'US-0001',
  history: [],
  ...overrides,
})
const found = (overrides: Partial<Package> = {}): PackageLookup => ({ package: pkg(overrides), type: undefined, trip: undefined, stop: undefined })

test('màn hiện gì: chưa gõ gì, đang tra, không tìm thấy, một kiện, nhiều kiện để chọn, kiện đã chọn', () => {
  const one = found()
  const twin = found({ id: 'PK-0090' })
  const base = { code: 'BV-VIN-2609-05', pickedId: null, pending: false, notFound: false }
  expect(lookupView({ ...base, code: '', data: undefined })).toStrictEqual({ kind: 'idle' })
  expect(lookupView({ ...base, pending: true, data: undefined })).toStrictEqual({ kind: 'pending' })
  expect(lookupView({ ...base, code: 'XX', notFound: true, data: undefined })).toStrictEqual({ kind: 'notFound', code: 'XX' })
  // Nguồn trả danh sách rỗng cũng là không tìm thấy
  expect(lookupView({ ...base, data: [] })).toStrictEqual({ kind: 'notFound', code: 'BV-VIN-2609-05' })
  expect(lookupView({ ...base, data: [one] })).toStrictEqual({ kind: 'one', item: one, fromMany: false })
  expect(lookupView({ ...base, data: [twin, one] })).toStrictEqual({ kind: 'many', code: 'BV-VIN-2609-05', items: [twin, one] })
  expect(lookupView({ ...base, pickedId: 'PK-0063', data: [twin, one] })).toStrictEqual({ kind: 'one', item: one, fromMany: true })
  // Kiện đã chọn không còn trong kết quả: về danh sách để chọn lại
  expect(lookupView({ ...base, pickedId: 'PK-9999', data: [twin, one] }).kind).toBe('many')
  // Lỗi khác "không tìm thấy" chưa có dữ liệu: vẫn là đang tra — màn hiện lỗi thay vòng quay
  expect(lookupView({ ...base, data: undefined }).kind).toBe('pending')
})

test('nhân viên kho xác nhận đã tìm thấy kiện mang cờ "Không tìm thấy"; cờ khác không gỡ được ở đây', () => {
  const reportFound = { reportFound: true }
  expect(lookupActions(pkg({ flags: ['NOT_FOUND'], tripId: 'TRIP-014' }), reportFound)).toStrictEqual({ confirmFound: true })
  expect(lookupActions(pkg({ flags: ['NOT_FOUND', 'DAMAGED'] }), reportFound)).toStrictEqual({ confirmFound: true })
  expect(lookupActions(pkg({ flags: ['DAMAGED'] }), reportFound)).toStrictEqual({ confirmFound: false })
  expect(lookupActions(pkg(), reportFound)).toStrictEqual({ confirmFound: false })
})

test('nguồn chưa gỡ cờ được: không có nút xác nhận đã tìm thấy', () => {
  expect(lookupActions(pkg({ flags: ['NOT_FOUND'] }), { reportFound: false })).toStrictEqual({ confirmFound: false })
})
