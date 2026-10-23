import { act, configure, fireEvent, screen } from '@testing-library/react-native'

import { AppText } from '@/components/AppText'
import { getMockDb, resetMockDb } from '@/data/mock-db'
import { SPEC_CARTON_A } from '@/domain/fixtures/spec-samples'
import { usePackageLookup } from '@/features/lookup/useLookupQueries'
import type { Revision, Trip } from '@/lib/mock-db'
import { optimizedTwoCartonTrip, twoCartonRequest, twoCartonResult, twoCartonTrip } from '@/test/mock-db-samples'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import {
  asDispatcher,
  labelsInLoadingOrder,
  READY_TRIP,
  renderSession,
  renderWarehouseScreen,
  startSession,
  WAREHOUSE_EMAIL,
} from '@/test/warehouse-flow'

import { LoadingSessionScreen } from '../LoadingSessionScreen'
import { useWarehouseTrips } from '../useWarehouseQueries'
import * as warehouseApi from '../warehouse-api'

/*
 * Đối chiếu kiện vào khu chờ ở bước Soạn hàng (`useStagingVerify` + `PackageVerifySheet`), trong phiên thật (`renderSession`) trên kho
 * mẫu. Bước Xếp là bản giả nói phiên đã sang bước đó, cho chuyến nào. Kỳ vọng về chuyến đọc thẳng từ kho.
 */

jest.mock('../LoadingStepView', () => ({ LoadingStepView: mockLoadingStep }))

function mockLoadingStep({ trip }: { trip: Trip; plan: Revision }) {
  return <AppText accessibilityRole="header">{`loading ${trip.id}`}</AppText>
}

/**
 * Hai tab vẫn gắn dưới phiên (Kho, Tra cứu kiện): danh sách chuyến của kho đang đọc hay đã đọc xong, và trạng thái của kiện `code` mà thẻ
 * tra cứu đang hiện.
 */
function OtherTabs({ code }: { code: string }) {
  const trips = useWarehouseTrips()
  const lookup = usePackageLookup(code)
  return (
    <>
      <AppText>{`trips ${trips.isFetching ? 'fetching' : 'idle'}`}</AppText>
      <AppText>{`lookup ${lookup.data?.[0]?.package.status ?? 'none'}`}</AppText>
    </>
  )
}

// Mỗi lần ghi, màn đọc lại cả chuyến từ kho mẫu: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const TITLE = 'Đối chiếu kiện vào khu chờ'
const CODE_FIELD = 'Mã QR hoặc mã bên gửi'

const sheetHeader = () => screen.queryByRole('header', { name: TITLE })

/** Mở tờ đối chiếu bằng nút chính của bước, rồi sang tab `tab` khi có. */
async function openVerify(tab?: 'Gõ mã' | 'Xác nhận tay') {
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu kiện' }))
  expect(await screen.findByRole('header', { name: TITLE })).toBeOnTheScreen()
  if (tab !== undefined) await fireEvent.press(screen.getByRole('tab', { name: tab }))
}

async function typeCode(code: string) {
  await fireEvent.changeText(screen.getByLabelText(CODE_FIELD), code)
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))
}

/** Camera đọc thấy `data` một lần; chờ lượt ghi bắt đầu. */
async function scan(data: string) {
  await fireEvent(screen.getByTestId('qr-camera', { includeHiddenElements: true }), 'barcodeScanned', { data })
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

/** Chuyến hai thùng đã duyệt, chưa bắt đầu: bước 1 `PKG-001-01` (điểm 3), bước 2 `PKG-002-01` (điểm 1), cả hai tên Carton A. */
async function approvedTwoCartonTrip(): Promise<string> {
  return asDispatcher(async (db) => {
    const { trip, revision } = await optimizedTwoCartonTrip(db)
    await db.approveRevision(revision.id, [])
    return trip.id
  })
}

const verificationsOf = async (tripId: string) =>
  (await getMockDb().getTrip(tripId)).verifications?.map((entry) => [entry.context, entry.packageInstanceId, entry.method, entry.manual?.status, entry.manual?.reason])

describe('đối chiếu kiện vào khu chờ', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(WAREHOUSE_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('quét nhãn: kiện sang đã soạn, tờ ở lại; đối chiếu lại chỉ được nhắc, mã ngoài chuyến bị từ chối — kho không ghi thêm', async () => {
    await renderSession(READY_TRIP)
    const [first] = await labelsInLoadingOrder(READY_TRIP)
    if (first === undefined) throw new Error('chuyến mẫu không có kiện nào')
    const id = first.packageInstanceId
    await openVerify()
    expect(screen.getByText('Quét nhãn QR của kiện vừa đưa vào khu chờ, hoặc gõ mã in trên nhãn. Đã soạn 0 / 132 kiện.')).toBeOnTheScreen()

    await scan(first.qrToken)
    expect(await screen.findByText(new RegExp(`^Đã soạn ${id} · .+\\.$`))).toBeOnTheScreen()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (131)' })).toBeOnTheScreen()
    expect(await screen.findByText('Quét nhãn QR của kiện vừa đưa vào khu chờ, hoặc gõ mã in trên nhãn. Đã soạn 1 / 132 kiện.')).toBeOnTheScreen()
    expect(sheetHeader()).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: `Báo thiếu ${id}` })).toBeNull()

    // Camera bỏ qua nhãn còn trong khung hình: đối chiếu lại bằng gõ mã, chữ thường cũng được
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await typeCode(first.qrToken.toLowerCase())
    expect(await screen.findByText(new RegExp(`^Kiện ${id} · .+ đã soạn rồi, không ghi lại\\.$`))).toBeOnTheScreen()

    await typeCode('LM-0000-0000-0000')
    expect(await screen.findByText(`Mã LM-0000-0000-0000 không thuộc chuyến ${READY_TRIP}.`)).toBeOnTheScreen()
    expect(screen.getByLabelText(CODE_FIELD)).toHaveDisplayValue('LM-0000-0000-0000')
    expect(sheetHeader()).toBeOnTheScreen()

    expect((await getMockDb().getTrip(READY_TRIP)).loading?.stagedIds).toStrictEqual([id])
    expect(await verificationsOf(READY_TRIP)).toStrictEqual([['STAGING', id, 'QR', undefined, undefined]])
  })

  test('mã của bên gửi trùng hai kiện của chuyến: nói phải gõ mã QR, không soạn kiện nào', async () => {
    const tripId = await asDispatcher(async (db) => {
      const { lengthCm, widthCm, heightCm, weightKg } = SPEC_CARTON_A
      const carton = { lengthCm, widthCm, heightCm, weightKg, handlingClass: 'STANDARD' as const, destination: '215 Quốc lộ 1K, P. Đông Hoà, Dĩ An', packageCode: 'KH-778' }
      const first = await db.createPackage(carton)
      const second = await db.createPackage(carton)
      const { id } = await db.createTrip({ ...twoCartonTrip(), packages: [] })
      const trip = await db.addTripPackages(id, [first.id, second.id], { stopId: 'STOP-02' })
      // Kiện đưa thẳng từ kho kiện giữ mã của bên gửi: hai dòng cùng mã KH-778
      const instances = (await db.listTripLabels(id)).map((label) => label.packageInstanceId)
      const placements = twoCartonResult().placements.map((placement, index) => ({ ...placement, packageInstanceId: instances[index] ?? '' }))
      const revision = await db.addRevision({ tripId: id, request: { ...twoCartonRequest(), packages: trip.packages }, result: { ...twoCartonResult(), placements } })
      await db.approveRevision(revision.id, [])
      return id
    })
    await renderSession(tripId)
    await openVerify('Gõ mã')

    await typeCode('KH-778')
    expect(await screen.findByText('Mã KH-778 trùng 2 kiện trong chuyến — gõ mã QR in dưới hình QR của kiện.')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (2)' })).toBeOnTheScreen()
    expect((await getMockDb().getTrip(tripId)).loading?.stagedIds ?? []).toStrictEqual([])
  })

  test('soạn kiện cuối: tờ đóng và phiên tự sang bước Xếp', async () => {
    const tripId = await approvedTwoCartonTrip()
    await renderSession(tripId)
    // Mỗi dòng: mã kiện, tên, điểm giao bằng chữ
    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (2)' })).toBeOnTheScreen()
    expect(screen.getByText('PKG-001-01')).toBeOnTheScreen()
    expect(screen.getByText('PKG-002-01')).toBeOnTheScreen()
    expect(screen.getAllByText('Carton A')).toHaveLength(2)
    expect(screen.getByText('Điểm 3')).toBeOnTheScreen()
    expect(screen.getByText('Điểm 1')).toBeOnTheScreen()
    await openVerify('Gõ mã')

    await typeCode('pkg-002-01')
    expect(await screen.findByText('Đã soạn PKG-002-01 · Carton A.')).toBeOnTheScreen()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (1)' })).toBeOnTheScreen()
    expect(sheetHeader()).toBeOnTheScreen()

    await typeCode('pkg-001-01')
    expect(await screen.findByRole('header', { name: `loading ${tripId}` })).toBeOnTheScreen()
    expect(sheetHeader()).toBeNull()
    expect((await getMockDb().getTrip(tripId)).loading?.stagedIds).toStrictEqual(['PKG-002-01', 'PKG-001-01'])
    // Gõ mã là đối chiếu bằng mã, không phải quét
    expect(await verificationsOf(tripId)).toStrictEqual([
      ['STAGING', 'PKG-002-01', 'CODE', undefined, undefined],
      ['STAGING', 'PKG-001-01', 'CODE', undefined, undefined],
    ])
  })

  test('xác nhận tay khi nhãn không đọc được: kiện tính là đã soạn, chờ điều phối viên duyệt', async () => {
    const tripId = await approvedTwoCartonTrip()
    await renderSession(tripId)
    await openVerify('Xác nhận tay')

    await fireEvent.press(screen.getByRole('radio', { name: 'PKG-002-01, Carton A · Điểm 1' }))
    await fireEvent.press(screen.getByRole('radio', { name: 'Nhãn rách / mất' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi xác nhận tay' }))
    expect(await screen.findByText('Đã ghi xác nhận tay PKG-002-01 Chờ điều phối viên duyệt trước khi xong xếp.')).toBeOnTheScreen()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (1)' })).toBeOnTheScreen()
    expect(sheetHeader()).toBeOnTheScreen()
    expect((await getMockDb().getTrip(tripId)).loading?.stagedIds).toStrictEqual(['PKG-002-01'])
    expect(await verificationsOf(tripId)).toStrictEqual([['STAGING', 'PKG-002-01', 'MANUAL', 'MANUAL_PENDING', 'LABEL_DAMAGED']])

    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    expect(sheetHeader()).toBeNull()
    expect(screen.getByText('Còn 1 xác nhận tay chờ điều phối viên duyệt.')).toBeOnTheScreen()
  })

  test('lệnh ghi chỉ chờ chuyến của phiên: danh sách chuyến đọc lại sau; thẻ tra cứu đang mở theo trạng thái mới của kiện', async () => {
    await startSession(READY_TRIP)
    const [first] = await labelsInLoadingOrder(READY_TRIP)
    if (first === undefined) throw new Error('chuyến mẫu không có kiện nào')
    // Danh sách chuyến của tab Kho: từ lúc `hold`, mỗi lần đọc treo tới khi test cho chạy tiếp
    const readList = warehouseApi.fetchWarehouseTrips
    let hold = false
    let releaseList: () => void = () => undefined
    const listGate = new Promise<void>((resolve) => {
      releaseList = resolve
    })
    jest.spyOn(warehouseApi, 'fetchWarehouseTrips').mockImplementation(() => (hold ? listGate.then(readList) : readList()))
    await renderWarehouseScreen(
      <>
        <LoadingSessionScreen tripId={READY_TRIP} />
        <OtherTabs code={first.qrToken} />
      </>,
    )
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (132)' })).toBeOnTheScreen()
    expect(await screen.findByText('lookup ASSIGNED')).toBeOnTheScreen()
    expect(await screen.findByText('trips idle')).toBeOnTheScreen()
    await openVerify()

    hold = true
    await scan(first.qrToken)
    expect(await screen.findByText(new RegExp(`^Đã soạn ${first.packageInstanceId} · .+\\.$`))).toBeOnTheScreen()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (131)' })).toBeOnTheScreen()
    expect(await screen.findByText('lookup STAGED')).toBeOnTheScreen()
    expect(screen.getByText('trips fetching')).toBeOnTheScreen()

    await act(async () => releaseList())
    expect(await screen.findByText('trips idle')).toBeOnTheScreen()
  })

  test('nguồn dữ liệu không nhận xác nhận tay: tờ chỉ có quét và gõ mã', async () => {
    jest.spyOn(warehouseApi, 'warehouseCapabilities').mockReturnValue({ manualConfirm: false, shortages: true, seal: true, notifications: true })
    await renderSession(READY_TRIP)
    await openVerify()

    expect(screen.getByRole('tab', { name: 'Quét QR' })).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: 'Gõ mã' })).toBeOnTheScreen()
    expect(screen.queryByRole('tab', { name: 'Xác nhận tay' })).toBeNull()
  })
})
