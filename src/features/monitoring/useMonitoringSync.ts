import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import type { LiveMonitoring, MonitoringBoard } from './monitoring-api'
import { monitoringKeys } from './useMonitoringQueries'

const joined = (ids: readonly string[]) => ids.toSorted().join(',')

/**
 * Giữ bảng giám sát khớp với kho (như `BoardSync` của web): chuyến vừa xuất phát hoặc vừa giao xong làm các chuyến của lần đọc giám sát
 * khác các chuyến bảng đang hiện — khi đó đọc lại bảng, một lần cho mỗi lần lệch.
 */
export function useBoardSync(board: MonitoringBoard | undefined, fleet: readonly LiveMonitoring[] | undefined) {
  const client = useQueryClient()
  const shown = board === undefined ? undefined : joined(board.trips.map((trip) => trip.tripId))
  const running = fleet === undefined ? undefined : joined(fleet.map((live) => live.tripId))
  useEffect(() => {
    if (shown !== undefined && running !== undefined && running !== shown) void client.invalidateQueries({ queryKey: monitoringKeys.board })
  }, [client, running, shown])
}

/**
 * Chuông đọc lại khi lần đọc giám sát có điều chuông nói tới: kho ghi cảnh báo nguy cơ trễ, tự chuyển sự cố cho quản lý, hay người khác
 * vừa báo sự cố — đều là sự kiện nhật ký mới, mà chuông chỉ đọc lúc mở màn. Lần đọc đầu không tính: chuông tự đọc khi màn mở.
 */
export function useBellSync(lives: readonly LiveMonitoring[] | undefined) {
  const client = useQueryClient()
  const marks =
    lives === undefined
      ? undefined
      : joined(lives.flatMap((live) => [...live.alerts.map((alert) => alert.eventId), ...live.exceptions.map((item) => `${item.id}:${item.status}`)]))
  const last = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (marks === undefined) return
    if (last.current !== undefined && last.current !== marks) void client.invalidateQueries({ queryKey: monitoringKeys.notifications })
    last.current = marks
  }, [client, marks])
}
