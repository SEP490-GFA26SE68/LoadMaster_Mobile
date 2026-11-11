import { lookupCapabilities, lookupPackages, reportPackageFound, scanPackage } from './lookup-api'

/*
 * Tra cứu kiện khi nguồn `packages` là máy chủ: app chưa đọc kiện của máy chủ, nên nguồn báo không làm được và tab Tra cứu kiện ẩn — không
 * hàm nào đọc kho mẫu thay, không gọi mạng.
 */

jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, packages: 'http' } } }
})

test('nguồn máy chủ không có tra cứu kiện: tab ẩn, mọi hàm từ chối NOT_SUPPORTED', async () => {
  expect(lookupCapabilities()).toEqual({ available: false, reportFound: false })
  await expect(scanPackage('LM-0000-0000-0000')).rejects.toMatchObject({ code: 'NOT_SUPPORTED' })
  await expect(lookupPackages('DMX-01')).rejects.toMatchObject({ code: 'NOT_SUPPORTED' })
  await expect(reportPackageFound('LM-0000-0000-0000')).rejects.toMatchObject({ code: 'NOT_SUPPORTED' })
})
