import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { serverWarehouseKeys } from './useServerWarehouseQueries'

/**
 * Kéo xuống để đọc lại phiên máy chủ (máy khác có thể vừa soạn, điều phối viên vừa duyệt xác nhận tay). Vòng quay chỉ cho lần kéo của người
 * dùng: phiên đặt vào cache sau mỗi lần ghi không làm vòng quay hiện lên.
 */
export function useSessionRefresh(tripId: string) {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void client.refetchQueries({ queryKey: serverWarehouseKeys.session(tripId) }).finally(() => setRefreshing(false))
  }, [client, tripId])
  return { refreshing, onRefresh }
}
