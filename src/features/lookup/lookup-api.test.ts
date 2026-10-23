import { getMockDb, resetMockDb } from '@/data/mock-db'
import { ApiError } from '@/data/http/api-error'
import { MockDbError, SEED_PASSWORD } from '@/lib/mock-db'
import { labelsOf, PHUONG_NAM_WAREHOUSE_EMAIL, READY_TRIP, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import { isUnknownPackage, lookupPackages, reportPackageFound, scanPackage } from './lookup-api'

/**
 * Tra cứu kiện trên kho mẫu (`lookup-mock.ts`): kiện kèm chuyến và điểm giao đang giữ nó; mã không khớp — hay chỉ khớp kiện của công ty
 * khác — là "không tìm thấy"; nhân viên kho gỡ cờ "Không tìm thấy". Kiện seed: `BV-VIN-2609-05` mang cờ "Không tìm thấy",
 * `BV-VIN-2609-01` không mang cờ nào (`seed-packages.ts`).
 */

const signIn = (email: string) => getMockDb().authenticate(email, SEED_PASSWORD)

/** Mã QR của kiện có mã `code` (mã của bên gửi hoặc mã kho), đọc dưới phiên đang có. */
async function tokenOf(code: string): Promise<string> {
  const [found] = await lookupPackages(code)
  if (found === undefined) throw new Error(`không có kiện ${code}`)
  return found.package.qrToken
}

beforeEach(resetMockDb)

test.each([
  ['scanPackage', () => scanPackage('LM-0000-0000-0000')],
  ['lookupPackages', () => lookupPackages('BV-VIN-2609-05')],
  ['reportPackageFound', () => reportPackageFound('LM-0000-0000-0000')],
])('%s chưa đăng nhập: NOT_SIGNED_IN', async (_name, call) => {
  await expect(call()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
})

test('mã không khớp kiện nào: QR_UNKNOWN, kể cả khi quét lẫn khi gõ', async () => {
  await signIn(WAREHOUSE_EMAIL)
  await expect(scanPackage('LM-0000-0000-0000')).rejects.toMatchObject({ code: 'QR_UNKNOWN' })
  await expect(lookupPackages('KHONG-CO')).rejects.toMatchObject({ code: 'QR_UNKNOWN' })
  expect(isUnknownPackage(new MockDbError('QR_UNKNOWN', { token: 'X' }))).toBe(true)
  expect(isUnknownPackage(new ApiError('QR_UNKNOWN', { status: 404 }))).toBe(true)
  expect(isUnknownPackage(new MockDbError('NOT_SIGNED_IN', {}))).toBe(false)
})

test('kiện của công ty khác là "không tìm thấy" như mã không có thật', async () => {
  await signIn(PHUONG_NAM_WAREHOUSE_EMAIL)
  const token = await tokenOf('PK-PN-0001')

  getMockDb().restoreSession('US-0003')
  await expect(scanPackage(token)).rejects.toMatchObject({ code: 'QR_UNKNOWN' })
  await expect(lookupPackages('PK-PN-0001')).rejects.toMatchObject({ code: 'QR_UNKNOWN' })
  await expect(reportPackageFound(token)).rejects.toMatchObject({ code: 'QR_UNKNOWN' })
})

test('kiện của chuyến kèm chuyến và điểm giao, đánh số theo thứ tự điểm của chuyến; kiện chưa vào chuyến thì không có', async () => {
  await signIn(WAREHOUSE_EMAIL)
  const atStop4 = (await labelsOf(READY_TRIP)).find((label) => label.deliveryStop === 4)
  const inTrip = await scanPackage(atStop4?.qrToken ?? '')
  expect([inTrip.package.id, inTrip.trip, inTrip.stop]).toStrictEqual([
    atStop4?.poolPackageId,
    { id: READY_TRIP, name: 'Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà' },
    { number: 4, name: 'Nhà thuốc Long Châu Biên Hoà' },
  ])

  const [free] = await lookupPackages('bv-vin-2609-01')
  expect([free?.package.packageCode, free?.trip, free?.stop]).toStrictEqual(['BV-VIN-2609-01', undefined, undefined])
  expect(free?.type?.id).toBe(free?.package.packageTypeId)
})

test('báo đã tìm thấy kiện: chỉ nhân viên kho, chỉ kiện đang mang cờ "Không tìm thấy"; gỡ xong ghi nhật ký', async () => {
  await signIn('dieuphoi@loadmaster.vn')
  const missing = await tokenOf('BV-VIN-2609-05')
  const unflagged = await tokenOf('BV-VIN-2609-01')
  await expect(reportPackageFound(missing)).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })

  getMockDb().restoreSession('US-0003')
  await expect(reportPackageFound(unflagged)).rejects.toMatchObject({ code: 'PACKAGE_FLAG_NOT_SET' })
  const found = await reportPackageFound(missing)
  expect([found.packageCode, found.flags]).toStrictEqual(['BV-VIN-2609-05', []])
  const [event] = await getMockDb().listEvents({ actorId: 'US-0003' })
  expect(event).toMatchObject({ action: 'package.found', target: { type: 'package', id: found.id }, params: { flag: 'NOT_FOUND', packageCode: 'BV-VIN-2609-05' } })
  // Cờ đã gỡ: báo lần nữa là kho từ chối
  await expect(reportPackageFound(missing)).rejects.toMatchObject({ code: 'PACKAGE_FLAG_NOT_SET' })
})
