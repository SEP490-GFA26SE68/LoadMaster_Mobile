import { emptyPackage, initialPickupValues, positiveNumber, toPickupInput, validatePickupForm, type PickupFormValues } from './pickup-form'

/** Form đã điền đủ: điểm nhận ở KCN VSIP 1, điểm giao ở Sóng Thần, một kiện. */
function filled(): PickupFormValues {
  return {
    pickup: { name: 'Xưởng may Hoàng Gia', address: 'Đường số 4, KCN VSIP 1, Thuận An', coordinates: { lat: '10,928', lng: '106.712' } },
    delivery: { name: 'Bếp ăn Sóng Thần', address: 'KCN Sóng Thần, Dĩ An', coordinates: { lat: '10.894', lng: '106.751' } },
    deadlineDate: '',
    deadlineTime: '',
    packages: [{ packageCode: ' HG-0412 ', lengthCm: '60', widthCm: '40', heightCm: '40', weightKg: '12,5', handlingClass: 'FRAGILE' }],
  }
}

test('số dương từ chữ đang gõ, nhận dấu phẩy thập phân', () => {
  expect(positiveNumber('12,5')).toBe(12.5)
  expect(positiveNumber(' 40 ')).toBe(40)
  for (const text of ['', '0', '-3', 'abc', '  ']) expect(positiveNumber(text)).toBeNull()
})

test('form trống: lỗi theo ô, theo thứ tự trên màn, là mã', () => {
  expect(validatePickupForm(initialPickupValues())).toStrictEqual([
    { path: ['pickup', 'name'], code: 'required' },
    { path: ['pickup', 'address'], code: 'required' },
    { path: ['pickup', 'coordinates'], code: 'coordinatesRequired' },
    { path: ['delivery', 'name'], code: 'required' },
    { path: ['delivery', 'address'], code: 'required' },
    { path: ['delivery', 'coordinates'], code: 'coordinatesRequired' },
    { path: ['packages', 0, 'packageCode'], code: 'required' },
    { path: ['packages', 0, 'lengthCm'], code: 'number' },
    { path: ['packages', 0, 'widthCm'], code: 'number' },
    { path: ['packages', 0, 'heightCm'], code: 'number' },
    { path: ['packages', 0, 'weightKg'], code: 'number' },
  ])
})

test('chữ quá dài, toạ độ sai, hạn chỉ có một ô, không kiện nào', () => {
  const values = filled()
  values.pickup.name = 'x'.repeat(121)
  values.delivery.coordinates = { lat: '95', lng: '106.7' }
  values.deadlineDate = '25/10/2026'
  values.packages = []
  expect(validatePickupForm(values)).toStrictEqual([
    { path: ['pickup', 'name'], code: 'tooLong' },
    { path: ['delivery', 'coordinates'], code: 'coordinatesInvalid' },
    { path: ['deadlineDate'], code: 'deadlineInvalid' },
    { path: ['packages'], code: 'packagesRequired' },
  ])
  expect(validatePickupForm({ ...filled(), packages: [{ ...emptyPackage(), packageCode: 'x'.repeat(41), lengthCm: '1', widthCm: '1', heightCm: '1', weightKg: '1' }] })).toStrictEqual([
    { path: ['packages', 0, 'packageCode'], code: 'tooLong' },
  ])
})

test('đầu vào gửi kho: chữ đã cắt khoảng trắng, toạ độ và số đã đổi, không có hạn khi để trống', () => {
  const values = filled()
  expect(validatePickupForm(values)).toStrictEqual([])
  expect(toPickupInput(values)).toStrictEqual({
    pickup: { name: 'Xưởng may Hoàng Gia', address: 'Đường số 4, KCN VSIP 1, Thuận An', lat: 10.928, lng: 106.712 },
    delivery: { name: 'Bếp ăn Sóng Thần', address: 'KCN Sóng Thần, Dĩ An', lat: 10.894, lng: 106.751 },
    packages: [{ packageCode: 'HG-0412', lengthCm: 60, widthCm: 40, heightCm: 40, weightKg: 12.5, handlingClass: 'FRAGILE' }],
  })
  const withDeadline = toPickupInput({ ...values, deadlineDate: '25/10/2026', deadlineTime: '17:30' })
  expect(withDeadline.deadline).toBe(new Date(2026, 9, 25, 17, 30).toISOString())
})
