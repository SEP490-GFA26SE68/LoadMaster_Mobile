import { createTranslator } from '@/lib/i18n'

import { checkInBlocker } from './presence-label'
import type { PresenceVehicle } from './presence-model'

/* Lý do nút "Ghi nhận có ở kho" mờ, theo đúng các trường hợp máy chủ còn từ chối. */

const t = createTranslator('vi')

const VEHICLE: PresenceVehicle = {
  id: '9',
  name: null,
  licensePlate: '51C-555.55',
  state: 'AVAILABLE',
  presence: 'UNKNOWN',
  warehouseId: null,
  warehouseName: null,
  observedAt: null,
  actorName: null,
  loadingTripId: null,
  loadingTripCode: null,
  transferring: false,
}

const busy = t('vehiclePresence.checkInBlocked.busy')

describe('checkInBlocker', () => {
  test('xe sẵn sàng, chưa ghi nhận hay đang trên đường: ghi nhận được', () => {
    expect(checkInBlocker(t, VEHICLE, '3')).toBeNull()
    expect(checkInBlocker(t, { ...VEHICLE, presence: 'IN_TRANSIT' }, '3')).toBeNull()
  })

  test('xe của chuyến Đang xếp hàng xuất phát từ kho này: ghi nhận được dù đang trên đường hay đang ở kho khác', () => {
    const loading = { ...VEHICLE, state: 'IN_TRIP', loadingTripId: '51', loadingTripCode: 'TRIP-0051' } as const
    expect(checkInBlocker(t, loading, '3')).toBeNull()
    expect(checkInBlocker(t, { ...loading, presence: 'IN_TRANSIT' }, '3')).toBeNull()
    expect(checkInBlocker(t, { ...loading, presence: 'AT_WAREHOUSE', warehouseId: '4' }, '3')).toBeNull()
  })

  test('xe ở chuyến khác (Đang vận chuyển, đang xếp ở kho khác): bận', () => {
    expect(checkInBlocker(t, { ...VEHICLE, state: 'IN_TRIP', presence: 'IN_TRANSIT' }, '3')).toBe(busy)
  })

  test('đang điều chuyển thì luôn mờ, kể cả xe của chuyến đang xếp; xe ở kho khác thì kho đó ghi xe rời trước', () => {
    expect(checkInBlocker(t, { ...VEHICLE, transferring: true, loadingTripId: '51' }, '3')).toBe(t('vehiclePresence.checkInBlocked.transferring'))
    expect(checkInBlocker(t, { ...VEHICLE, presence: 'AT_WAREHOUSE', warehouseId: '4' }, '3')).toBe(t('vehiclePresence.checkInBlocked.elsewhere'))
  })
})
