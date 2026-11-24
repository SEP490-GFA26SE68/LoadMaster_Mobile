import { appLinksOf } from './app-links'

const link = (to: string, label = 'Mở') => ({ label, to })

describe('appLinksOf: liên kết của trợ lý → màn của app', () => {
  test('route web có màn trên app thì đổi sang tab của vai trò; route không có màn bị bỏ', () => {
    const links = [link('/tai-xe', 'Chuyến của tôi'), link('/bang-gia', 'Bảng giá'), link('/chuyen/TRIP-0041', 'Chuyến'), link('/ho-so', 'Hồ sơ')]
    expect(appLinksOf(links, 'driver')).toEqual([
      { label: 'Chuyến của tôi', href: '/trips' },
      { label: 'Hồ sơ', href: '/account' },
    ])
  })

  test('phiếu lương theo vai trò; tra cứu kiện chỉ của kho', () => {
    expect(appLinksOf([link('/phieu-luong'), link('/tra-cuu-kien', 'Tra cứu')], 'warehouse')).toEqual([
      { label: 'Mở', href: '/warehouse-payroll' },
      { label: 'Tra cứu', href: '/lookup' },
    ])
    expect(appLinksOf([link('/phieu-luong'), link('/tra-cuu-kien'), link('/kho')], 'driver')).toEqual([{ label: 'Mở', href: '/payroll' }])
  })

  test('bỏ truy vấn, neo; không nhận liên kết ra ngoài app, nhãn trống; không trùng màn; tối đa ba', () => {
    expect(appLinksOf([link('/kho?chuyen=41#x', 'Kho')], 'warehouse')).toEqual([{ label: 'Kho', href: '/warehouse' }])
    expect(appLinksOf([link('https://example.com/kho'), link('//example.com/kho'), link('/kho', '  ')], 'warehouse')).toEqual([])
    const many = [link('/kho', 'A'), link('/kho', 'B'), link('/tra-cuu-kien', 'C'), link('/phieu-luong', 'D'), link('/ho-so', 'E')]
    expect(appLinksOf(many, 'warehouse').map((item) => item.label)).toEqual(['A', 'C', 'D'])
  })
})
