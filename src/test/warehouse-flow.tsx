import { screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { getMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { LoadingSessionScreen } from '@/features/warehouse/LoadingSessionScreen'
import { createTranslator, type Locale } from '@/lib/i18n'
import type { MockDb, Trip, TripLabel } from '@/lib/mock-db'

import { optimizedTwoCartonTrip } from './mock-db-samples'
import { renderApp, signInAs } from './render'
import { loadAll, loadingOrder, stageAll } from './trip-flow'

/**
 * Dữ liệu và bước dựng sẵn cho test của kho, trên kho mẫu của app (`getMockDb()`). Phiên của kho do test đặt trước (`signInAs`, hoặc
 * `renderWarehouseScreen` / `renderSession` tự đăng nhập); các bước ghi bằng đúng lối của app — mọi kiện qua đối chiếu bằng mã QR của nó
 * (`@/test/trip-flow`).
 */

/** Nhân viên kho mẫu của Long Bình (Lê Văn Hải, `US-0003`) và của Phương Nam (Lâm Quốc Việt, `US-0015`). */
export const WAREHOUSE_EMAIL = 'kho@loadmaster.vn'
export const PHUONG_NAM_WAREHOUSE_EMAIL = 'viet.lam@phuongnam.vn'
/** Điều phối viên mẫu của Long Bình — `asDispatcher`. */
export const DISPATCHER_ID = 'US-0001'

/**
 * Chuyến seed của Long Bình theo từng nhóm của danh sách kho:
 * - `READY_TRIP` chờ soạn: bản duyệt `REV-002` còn hiệu lực, 132 kiện, bốn điểm giao;
 * - `LOADING_TRIP` đang xếp: đồng nghiệp đã soạn đủ và xếp 110 / 280 kiện;
 * - `LOADED_TRIP` xếp xong — chờ xuất phát (210 kiện), còn ghi được số seal;
 * - `STALE_TRIP` chờ điều phối tối ưu lại: bản duyệt lỗi thời, kho không vào phiên được.
 */
export const READY_TRIP = 'TRIP-2026-0914'
export const LOADING_TRIP = 'TRIP-011'
export const LOADED_TRIP = 'TRIP-010'
export const STALE_TRIP = 'TRIP-013'

/** Nhãn QR mọi kiện của một chuyến. */
export function labelsOf(tripId: string): Promise<TripLabel[]> {
  return getMockDb().listTripLabels(tripId)
}

/** Nhãn của chuyến theo thứ tự xếp của phương án kho đang làm theo (chuyến phải đã bắt đầu xếp). */
export async function labelsInLoadingOrder(tripId: string): Promise<TripLabel[]> {
  const db = getMockDb()
  const [order, labels] = await Promise.all([loadingOrder(db, tripId), db.listTripLabels(tripId)])
  const byId = new Map(labels.map((label) => [label.packageInstanceId, label]))
  return order.flatMap((id) => byId.get(id) ?? [])
}

/** Nhân viên kho bắt đầu phiên của một chuyến đã duyệt: Đã lập kế hoạch → Đang xếp hàng, ở bước Soạn hàng. */
export function startSession(tripId: string): Promise<Trip> {
  return getMockDb().startLoading(tripId)
}

/**
 * Soạn bằng quét mọi kiện chưa soạn của chuyến đang xếp, chừa lại `leave` kiện cuối theo thứ tự xếp. Trả mã các kiện chừa lại, theo thứ
 * tự xếp — kiện test còn phải soạn trên màn.
 */
export async function stageAllBut(tripId: string, leave = 0): Promise<string[]> {
  const db = getMockDb()
  const order = await loadingOrder(db, tripId)
  const left = leave === 0 ? [] : order.slice(-leave)
  await stageAll(db, tripId, left)
  return left
}

/**
 * Xếp bằng quét, theo thứ tự xếp, mọi kiện trước bước `step` (bước đầu là 1) còn chưa có kết quả: phiên dừng ở bước đó. Kiện phải đã
 * soạn đủ. Trả nhãn của kiện ở bước `step` — kiện màn đang hỏi. Kho không tự hoàn tất xếp ở đây (việc đó là của `warehouse-api.ts`).
 */
export async function loadUpTo(tripId: string, step: number): Promise<TripLabel> {
  const target = (await labelsInLoadingOrder(tripId))[step - 1]
  if (target === undefined) throw new Error(`chuyến ${tripId} không có bước ${step}`)
  await loadAll(getMockDb(), tripId, target.packageInstanceId)
  return target
}

/** Chạy `work` dưới phiên của điều phối viên mẫu rồi trả kho về phiên trước đó: việc của điều phối viên giữa một test của kho. */
export async function asDispatcher<T>(work: (db: MockDb) => Promise<T>): Promise<T> {
  const db = getMockDb()
  const previous = db.sessionUser()?.id ?? null
  db.restoreSession(DISPATCHER_ID)
  try {
    return await work(db)
  } finally {
    db.restoreSession(previous)
  }
}

/**
 * Chuyến hai thùng (`twoCartonTrip`, Long Bình): điều phối viên duyệt phương án dựng tay, rồi — dưới phiên của test — kho bắt đầu và
 * soạn đủ bằng quét (`VF-001`, `VF-002`). Phiên ở bước xếp: bước 1 `PKG-001-01`, bước 2 `PKG-002-01`, cả hai trên sàn, không kiện nào
 * tựa lên kiện nào — báo hỏng kiện nào cũng chỉ bỏ kiện đó lại kho. `labels` theo thứ tự xếp.
 */
export async function stagedTwoCartonTrip(): Promise<{ trip: Trip; labels: TripLabel[] }> {
  const { trip } = await asDispatcher(async (db) => {
    const created = await optimizedTwoCartonTrip(db)
    await db.approveRevision(created.revision.id, [])
    return created
  })
  await startSession(trip.id)
  await stageAllBut(trip.id)
  return { trip: await getMockDb().getTrip(trip.id), labels: await labelsInLoadingOrder(trip.id) }
}

export type WarehouseRenderOptions = {
  /** Tài khoản seed đăng nhập trước khi vẽ; mặc định nhân viên kho mẫu của Long Bình (`WAREHOUSE_EMAIL`). */
  readonly email?: string
  readonly locale?: Locale
}

/**
 * Đăng nhập bằng một tài khoản seed (mặc định nhân viên kho mẫu) rồi vẽ một màn của kho trong đủ provider của app (`renderApp`): phiên
 * của kho mẫu và phiên của `AuthProvider` là cùng một người, như sau khi đăng nhập thật.
 */
export async function renderWarehouseScreen(ui: ReactElement, { email = WAREHOUSE_EMAIL, locale = 'vi' }: WarehouseRenderOptions = {}) {
  await signInAs(email)
  return renderApp(ui, { locale, auth: createMockAuth() })
}

/**
 * Vẽ phiên soạn → xếp của một chuyến (`LoadingSessionScreen`) và chờ tới khi phiên đã qua lúc tải chuyến và lúc bắt đầu soạn hàng: màn
 * đang hiện là một bước, màn Xếp xong, hoặc lời giải thích vì sao chưa xếp được — màn nào của phiên cũng có nút "Về danh sách chuyến".
 */
export async function renderSession(tripId: string, options: WarehouseRenderOptions = {}) {
  const view = await renderWarehouseScreen(<LoadingSessionScreen tripId={tripId} />, options)
  const t = createTranslator(options.locale ?? 'vi')
  // Bắt đầu soạn hàng ghi rồi đọc lại cả chuyến lẫn nhãn: cho máy chậm thêm thời gian
  await waitFor(
    () => {
      expect(screen.getAllByRole('button', { name: t('warehouse.backToList') }).length).toBeGreaterThan(0)
      for (const busy of [t('warehouse.loading'), t('warehouse.starting')]) expect(screen.queryByRole('progressbar', { name: busy })).toBeNull()
    },
    { timeout: 10_000 },
  )
  return view
}
