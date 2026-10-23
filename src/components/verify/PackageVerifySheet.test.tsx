import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { useState } from 'react'

import { Button } from '@/components/Button'
import type { LabelVerifyMethod } from '@/lib/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { PackageVerifySheet } from './PackageVerifySheet'
import type { VerifyController, VerifyOutcome } from './verify-types'

const TITLE = 'Soạn hàng chuyến TRIP-010'
const CODE_FIELD = 'Mã QR hoặc mã bên gửi'

/**
 * Nơi gọi giả của tờ: `respond` trả lời từng mã, tờ đang ghi (`pending`) tới khi nó trả lời. Ghi được thì nói mã vừa ghi;
 * `closeOnSuccess` đóng tờ ngay như bước xếp (một kiện mỗi lần mở), không thì tờ ở lại như bước soạn hàng. Lỗi thì tờ ở lại kèm câu lỗi.
 * Nút "Mở tờ" ngoài tờ mở lại tờ, như nút chính của bước.
 */
function Harness({ respond, closeOnSuccess }: { respond: (code: string, method: LabelVerifyMethod) => Promise<boolean>; closeOnSuccess: boolean }) {
  const [open, setOpen] = useState(true)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)
  const controller: VerifyController = {
    open,
    setOpen: (next) => {
      setResult(null)
      setOpen(next)
    },
    pending,
    result,
    candidates: [],
    verify: async (method, code) => {
      setPending(true)
      const ok = await respond(code, method).finally(() => setPending(false))
      setResult(ok ? { tone: 'success', message: `Đã ghi ${code}.` } : { tone: 'error', message: `Không ghi được ${code}.` })
      if (ok && closeOnSuccess) setOpen(false)
      return ok
    },
    confirmManually: async () => false,
  }
  return (
    <>
      <Button onPress={() => controller.setOpen(true)}>Mở tờ</Button>
      <PackageVerifySheet verify={controller} title={TITLE} manualAllowed={false} />
    </>
  )
}

/** Camera đọc thấy `data` một lần; chờ lượt ghi (nếu có) chạy xong. */
async function scan(data: string) {
  await fireEvent(screen.getByTestId('qr-camera', { includeHiddenElements: true }), 'barcodeScanned', { data })
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

const header = () => screen.queryByRole('header', { name: TITLE })

describe('tờ đối chiếu kiện', () => {
  beforeEach(() => {
    clearStored()
    resetNativeMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('nơi gọi giữ tờ mở (soạn hàng): ghi được kiện này thì quét tiếp kiện khác; chỉ người dùng đóng tờ', async () => {
    const respond = jest.fn(async () => true)
    await renderApp(<Harness respond={respond} closeOnSuccess={false} />)
    expect(await screen.findByRole('header', { name: TITLE })).toBeOnTheScreen()

    await scan('LM-AAAA')
    expect(await screen.findByText('Đã ghi LM-AAAA.')).toBeOnTheScreen()
    await scan('LM-BBBB')
    expect(await screen.findByText('Đã ghi LM-BBBB.')).toBeOnTheScreen()
    expect(header()).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    expect(header()).toBeNull()
  })

  test('nơi gọi đóng tờ (xếp hàng): mã sai thì tờ ở lại kèm câu lỗi, ghi được thì tờ đóng', async () => {
    const respond = jest.fn(async (code: string) => code === 'LM-DUNG')
    await renderApp(<Harness respond={respond} closeOnSuccess />)

    await scan('LM-SAI')
    expect(await screen.findByText('Không ghi được LM-SAI.')).toBeOnTheScreen()
    expect(header()).toBeOnTheScreen()

    await scan('LM-DUNG')
    await waitFor(() => expect(header()).toBeNull())
  })

  test('camera đọc một nhãn nhiều lần: chỉ gửi lại khi đã thấy mã khác hoặc nhãn rời khung hình 3 giây; mã đến lúc đang ghi bị bỏ', async () => {
    let clock = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => clock)
    let release: (ok: boolean) => void = () => undefined
    const respond = jest.fn((code: string) =>
      code === 'LM-CHAM'
        ? new Promise<boolean>((resolve) => {
            release = resolve
          })
        : Promise.resolve(true),
    )
    const sent = () => respond.mock.calls.map(([code]) => code)
    await renderApp(<Harness respond={respond} closeOnSuccess={false} />)

    await scan('LM-A')
    await scan('LM-A')
    await scan('LM-A')
    expect(sent()).toStrictEqual(['LM-A'])

    // Mã khác vào khung hình thì gửi ngay; mã cũ quay lại sau đó cũng được gửi
    await scan('LM-B')
    await scan('LM-A')
    expect(sent()).toStrictEqual(['LM-A', 'LM-B', 'LM-A'])

    // Nhãn còn trong khung hình (camera vẫn đọc thấy, mỗi lần cách nhau dưới 3 giây): không gửi lại
    clock += 2_000
    await scan('LM-A')
    clock += 2_000
    await scan('LM-A')
    expect(sent()).toHaveLength(3)
    // Nhãn rời khung hình đủ 3 giây rồi quay lại: gửi lại
    clock += 3_000
    await scan('LM-A')
    expect(sent()).toHaveLength(4)

    // Đang ghi một mã thì mã đến sau bị bỏ, ghi xong mới nhận mã mới
    await scan('LM-CHAM')
    await scan('LM-C')
    expect(sent()).toStrictEqual(['LM-A', 'LM-B', 'LM-A', 'LM-A', 'LM-CHAM'])
    await act(async () => release(true))
    expect(await screen.findByText('Đã ghi LM-CHAM.')).toBeOnTheScreen()
    await scan('LM-C')
    expect(sent().at(-1)).toBe('LM-C')
  })

  test('mỗi lần mở là một lượt mới, kể cả khi nơi gọi đóng tờ: về mức quét QR, quét lại được ngay nhãn camera vừa thấy', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const respond = jest.fn(async (_code: string, _method: LabelVerifyMethod) => true)
    const sent = () => respond.mock.calls.map(([code, method]) => `${method} ${code}`)
    await renderApp(<Harness respond={respond} closeOnSuccess />)
    const reopen = async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Mở tờ' }))
      expect(await screen.findByRole('header', { name: TITLE })).toBeOnTheScreen()
    }

    // Ghi được thì nơi gọi đóng tờ; mở lại, cùng nhãn đó trong cùng giây vẫn được gửi
    await scan('LM-A')
    await waitFor(() => expect(header()).toBeNull())
    await reopen()
    await scan('LM-A')
    await waitFor(() => expect(header()).toBeNull())
    expect(sent()).toStrictEqual(['QR LM-A', 'QR LM-A'])

    // Ghi bằng gõ mã rồi nơi gọi đóng tờ: mở lại là mức quét QR
    await reopen()
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await fireEvent.changeText(screen.getByLabelText(CODE_FIELD), 'LM-B')
    await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))
    await waitFor(() => expect(header()).toBeNull())
    expect(sent().at(-1)).toBe('CODE LM-B')
    await reopen()
    expect(screen.getByRole('tab', { name: 'Quét QR' })).toBeSelected()
    expect(screen.getByTestId('qr-camera', { includeHiddenElements: true })).toBeOnTheScreen()
    expect(screen.queryByLabelText(CODE_FIELD)).toBeNull()

    // Người dùng đóng tờ khi đang ở mức gõ mã: mở lại cũng là mức quét QR
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    expect(header()).toBeNull()
    await reopen()
    expect(screen.getByRole('tab', { name: 'Quét QR' })).toBeSelected()
  })

  test('phím "Xong" của bàn phím khi mã đang được ghi: không gửi mã lần nữa; ghi xong thì phím lại gửi được', async () => {
    let release: (ok: boolean) => void = () => undefined
    const respond = jest.fn((code: string) =>
      code === 'LM-CHAM'
        ? new Promise<boolean>((resolve) => {
            release = resolve
          })
        : Promise.resolve(true),
    )
    await renderApp(<Harness respond={respond} closeOnSuccess={false} />)
    await fireEvent.press(await screen.findByRole('tab', { name: 'Gõ mã' }))
    const field = screen.getByLabelText(CODE_FIELD)

    await fireEvent.changeText(field, 'LM-CHAM')
    await fireEvent(field, 'submitEditing')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đối chiếu mã' })).toBeBusy())
    await fireEvent(field, 'submitEditing')
    await fireEvent(field, 'submitEditing')
    expect(respond).toHaveBeenCalledTimes(1)

    await act(async () => release(true))
    expect(await screen.findByText('Đã ghi LM-CHAM.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText(CODE_FIELD), 'LM-D')
    await fireEvent(screen.getByLabelText(CODE_FIELD), 'submitEditing')
    expect(await screen.findByText('Đã ghi LM-D.')).toBeOnTheScreen()
    expect(respond.mock.calls.map(([code]) => code)).toStrictEqual(['LM-CHAM', 'LM-D'])
  })
})
