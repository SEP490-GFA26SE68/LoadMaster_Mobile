import { api, ApiError, type ApiClient } from '@/data/http'
import { notSupported, readAllPages, withStatusCode } from '@/lib/office-backend'

import type { TripsApi } from './trips-api'
import type { ManualConfirmationDto, StagingShortageDto, TripDetailDto, TripDto } from './trips-http-dto'
import { manualConfirmRowOf, serverDetailOf, shortageRowOf, tripCodeOf, tripRowOf } from './trips-http-mapping'

/*
 * Nguồn backend của màn chuyến (điều phối viên, quản lý công ty), như `trips-backend-api.ts`, `manual-confirm-backend-api.ts` và
 * `shortage-backend-api.ts` của web. Mã chuyến là mã trên đường dẫn của màn; endpoint chi tiết chỉ nhận mã số nên tìm mã số qua
 * `GET /api/trips?search=` trước. Máy chủ chưa có danh sách yêu cầu giao theo chuyến nên thẻ đó ẩn (`requirements: false`); máy chủ không
 * trả phương án hay tiến độ kho trong danh sách nên số "cần bạn xử lý" ẩn (`planStatus: false`).
 */

/** Đường dẫn có mã chuyến (mã số hoặc mã chuyến, endpoint nhận cả hai). */
const tripPath = (tripId: string) => `/api/trips/${encodeURIComponent(tripId)}`

const DIGITS = /^[0-9]+$/

/**
 * Mã số của một chuyến theo mã chuyến (không phân biệt hoa thường). Chuyến cũ chưa có mã chuyến mang mã số trên đường dẫn. Không có (hoặc
 * của công ty khác) là `TRIP_NOT_FOUND`.
 */
async function tripIdOf(client: ApiClient, code: string): Promise<number> {
  const wanted = code.trim()
  const rows = (await client.get<readonly TripDto[] | null>('/api/trips', { query: { search: wanted, page: 0, size: 100 } })) ?? []
  const found = rows.find((row) => tripCodeOf(row).toLowerCase() === wanted.toLowerCase())
  if (found !== undefined) return found.id
  if (DIGITS.test(wanted)) return Number(wanted)
  throw new ApiError('TRIP_NOT_FOUND')
}

/** Chi tiết chuyến của máy chủ theo mã chuyến (endpoint chi tiết chỉ nhận mã số). */
export async function readTripDetail(client: ApiClient, code: string): Promise<TripDetailDto> {
  const id = await tripIdOf(client, code)
  return withStatusCode(client.get<TripDetailDto>(`/api/trips/${id}/detail`), { 404: 'TRIP_NOT_FOUND' })
}

export function httpTripsApi({ client = api }: { readonly client?: () => ApiClient } = {}): TripsApi {
  return {
    capabilities: { manualConfirms: true, shortages: true, requirements: false, planStatus: false },
    async fetchTrips() {
      const rows = await readAllPages<TripDto>(client(), '/api/trips', { sortBy: 'departureTime', sortDir: 'desc' })
      return rows.map(tripRowOf)
    },
    async fetchTripDetail(tripId) {
      return serverDetailOf(await readTripDetail(client(), tripId))
    },
    fetchTripRequirements: notSupported,
    async fetchManualConfirmations(tripId) {
      const rows = await client().get<readonly ManualConfirmationDto[] | null>(`${tripPath(tripId)}/manual-confirmations`)
      return (rows ?? []).map(manualConfirmRowOf)
    },
    async approveManualConfirmation(tripId, confirmationId) {
      await withStatusCode(
        client().post(`${tripPath(tripId)}/manual-confirmations/${encodeURIComponent(confirmationId)}/approve`),
        { 404: 'MANUAL_CONFIRM_NOT_FOUND' },
      )
    },
    async rejectManualConfirmation(tripId, confirmationId, reason) {
      await withStatusCode(
        client().post(`${tripPath(tripId)}/manual-confirmations/${encodeURIComponent(confirmationId)}/reject`, { body: { reason } }),
        { 404: 'MANUAL_CONFIRM_NOT_FOUND' },
      )
    },
    async fetchStagingShortages(tripId) {
      const rows = await client().get<readonly StagingShortageDto[] | null>(`${tripPath(tripId)}/staging-shortages`)
      return (rows ?? []).map(shortageRowOf)
    },
    async resolveStagingShortage(tripId, shortageId, decision) {
      await withStatusCode(
        client().post(`${tripPath(tripId)}/staging-shortages/${encodeURIComponent(shortageId)}/resolve`, { body: { decision } }),
        { 404: 'STAGING_SHORTAGE_NOT_FOUND' },
      )
    },
  }
}
