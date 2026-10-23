import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { clearStored, renderApp } from '@/test/render'

import { ManualConfirmForm } from './ManualConfirmForm'
import type { VerifyCandidate } from './verify-types'

const FILTER = 'Tìm kiện'

/** Tên kiện có dấu, lặp vòng theo số kiện: kiện số 3, 9, 15, 21, 27 là đèn bàn; số 6, 12, 18, 24, 30 là quạt đứng. */
const NAMES = ['Băng keo trong', 'Thùng sơn nước', 'Đèn bàn LED', 'Ghế xếp gỗ', 'Nồi cơm điện', 'Quạt đứng']

/** `count` kiện chọn được: mã nguồn `PKG-001-NN`, mã trên nhãn `LM-NN`. */
function candidatesOf(count: number): VerifyCandidate[] {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return { id: `PKG-001-${number}`, label: `LM-${number}`, name: `${NAMES[index % NAMES.length] ?? ''} ${number}`, description: `Thứ tự dỡ ${index + 1}` }
  })
}

const onSubmit = jest.fn()

async function renderForm(count: number) {
  await renderApp(<ManualConfirmForm candidates={candidatesOf(count)} pending={false} onSubmit={onSubmit} />)
}

/** Ô chọn kiện đang vẽ — tên đọc được bắt đầu bằng mã trên nhãn; ô chọn lý do không tính. */
const packageChoices = () => screen.queryAllByRole('radio', { name: /^LM-/ })
const packageChoice = (label: string) => screen.getByRole('radio', { name: new RegExp(`^${label}, `) })

async function search(text: string) {
  await fireEvent.changeText(screen.getByLabelText(FILTER), text)
}

async function send(reason: string) {
  await fireEvent.press(screen.getByRole('radio', { name: reason }))
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi xác nhận tay' }))
}

describe('chọn kiện ở mức xác nhận tay', () => {
  beforeEach(() => {
    clearStored()
  })

  test('tới 8 kiện: không có ô tìm, mỗi kiện một ô chọn', async () => {
    await renderForm(8)
    expect(screen.queryByLabelText(FILTER)).toBeNull()
    expect(packageChoices()).toHaveLength(8)
  })

  test('chỉ một kiện: kiện đó được chọn sẵn, gửi luôn được', async () => {
    await renderForm(1)
    expect(packageChoice('LM-01')).toBeChecked()
    await send('QR không đọc được')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ itemId: 'PKG-001-01', reason: 'QR_UNREADABLE', note: undefined }))
  })

  test('hơn 8 kiện: ô tìm bỏ dấu, chỉ vẽ 20 kiện khớp kèm dòng đếm; chọn kiện đã lọc rồi gửi', async () => {
    await renderForm(30)
    expect(packageChoices()).toHaveLength(20)
    expect(screen.getByText('Có 30 kiện để chọn — đang hiện 20 kiện đầu. Gõ mã hoặc tên để tìm kiện khác.')).toBeOnTheScreen()

    // Chữ hoa, không dấu vẫn khớp tên có dấu
    await search('DEN BAN')
    expect(screen.getByText('5 kiện khớp.')).toBeOnTheScreen()
    expect(packageChoices()).toHaveLength(5)
    expect(packageChoice('LM-21')).toBeOnTheScreen()

    // Khớp cả mã nguồn của kiện, không chỉ mã trên nhãn
    await search('pkg-001-1')
    expect(screen.getByText('10 kiện khớp.')).toBeOnTheScreen()

    // Khớp quá 20 kiện: vẫn chỉ vẽ 20, dòng đếm gợi ý gõ thêm
    await search('lm')
    expect(screen.getByText('30 kiện khớp — đang hiện 20 kiện đầu. Gõ thêm để thu hẹp.')).toBeOnTheScreen()
    expect(packageChoices()).toHaveLength(20)

    // Có dấu cũng được; mọi từ phải khớp, không kể thứ tự
    await search('21 đèn')
    expect(screen.getByText('1 kiện khớp.')).toBeOnTheScreen()
    await fireEvent.press(packageChoice('LM-21'))
    await fireEvent.changeText(screen.getByLabelText('Ghi chú'), 'Nhãn bị nước làm nhoè')
    await send('Khác')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ itemId: 'PKG-001-21', reason: 'OTHER', note: 'Nhãn bị nước làm nhoè' }))
  })

  test('kiện đang chọn vẫn hiện khi ô tìm không khớp nó, và là kiện được gửi', async () => {
    await renderForm(30)
    await fireEvent.press(packageChoice('LM-02'))

    await search('quat')
    expect(screen.getByText('5 kiện khớp.')).toBeOnTheScreen()
    expect(packageChoices()).toHaveLength(6)
    expect(packageChoice('LM-02')).toBeChecked()

    await search('xyz')
    expect(screen.getByText('Không có kiện nào khớp. Kiểm tra lại chữ đã gõ.')).toBeOnTheScreen()
    expect(packageChoices()).toHaveLength(1)

    await send('Nhãn rách / mất')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ itemId: 'PKG-001-02', reason: 'LABEL_DAMAGED', note: undefined }))
  })
})
