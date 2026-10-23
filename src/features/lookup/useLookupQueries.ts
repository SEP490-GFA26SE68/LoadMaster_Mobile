import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { lookupCapabilities, lookupPackages, reportPackageFound, scanPackage, type LookupCapabilities } from './lookup-api'

const NO_CAPABILITIES: LookupCapabilities = { reportFound: false }

/**
 * Việc tra cứu kiện làm được với nguồn đang dùng. Nguồn chưa nối (`HTTP_NOT_WIRED`) thì không có việc nào — lỗi đó vẫn hiện ở truy vấn
 * của màn, không bị nuốt.
 */
export function useLookupCapabilities(): LookupCapabilities {
  try {
    return lookupCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/**
 * Khoá truy vấn của kho kiện, mọi khoá nằm dưới `['packages']`: lệnh ghi đổi trạng thái hoặc cờ của kiện (báo đã tìm thấy, mọi bước soạn
 * và xếp của phiên kho) làm mới hết.
 */
export const lookupKeys = {
  all: ['packages'] as const,
  lookup: (code: string) => ['packages', 'lookup', code] as const,
}

/**
 * Tra theo mã người dùng gõ; `code` rỗng thì không gọi nguồn. Trạng thái và cờ của kiện đổi ở nơi khác nên mỗi lần mở là đọc lại.
 * Không khớp: lỗi `QR_UNKNOWN` (`isUnknownPackage`), không thử lại.
 */
export function usePackageLookup(code: string) {
  return useQuery({ queryKey: lookupKeys.lookup(code), queryFn: () => lookupPackages(code), enabled: code !== '', staleTime: 0, retry: false })
}

/** Tra kiện theo mã QR — dạng lệnh vì chạy theo cú quét, không phải dữ liệu nền của màn; không đổi gì nên không làm mới gì. */
export function useScanPackageMutation() {
  return useMutation({ mutationFn: (token: string) => scanPackage(token) })
}

/**
 * Nhân viên kho báo đã tìm thấy lại kiện mang cờ "Không tìm thấy". Xong — kể cả lỗi: người khác có thể vừa gỡ cờ trước — thì đọc lại
 * mọi kết quả tra cứu đang có, để thẻ kiện theo đúng cờ trong kho.
 */
export function useReportPackageFoundMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => reportPackageFound(token),
    onSettled: () => client.invalidateQueries({ queryKey: lookupKeys.all }),
  })
}
