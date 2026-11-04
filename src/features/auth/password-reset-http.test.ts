import { ApiError, createApiClient } from '@/data/http'
import { createTranslator, dataErrorMessage } from '@/lib/i18n'

import { httpPasswordReset } from './password-reset-http'

type Call = { readonly url: string; readonly body: unknown; readonly authorization: string | undefined }

/** Backend giả của Đặt lại mật khẩu: trả lần lượt các phản hồi, ghi lại địa chỉ, thân và token của mỗi lượt gọi. */
function backend(...replies: readonly (readonly [number, unknown] | Error)[]) {
  const calls: Call[] = []
  const queue = [...replies]
  const client = createApiClient({
    baseUrl: 'http://api.test',
    accessToken: async () => null,
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)), authorization: (init.headers as Record<string, string>).Authorization })
      const reply = queue.shift()
      if (reply === undefined) throw new Error('hết phản hồi giả')
      if (reply instanceof Error) throw reply
      const [status, body] = reply
      return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as Response
    }) as unknown as typeof fetch,
  })
  return { api: httpPasswordReset(() => client), calls }
}

const ok = (data: unknown = null) => [200, { success: true, message: 'OK', data }] as const
/** Máy chủ trước khi gắn mã: 400 kèm câu thô, không mã. */
const refused = (message: string) => [400, { success: false, message, data: null }] as const
/** Máy chủ đã gắn mã: `code` là tên `ErrorCode`. */
const coded = (code: string, status = 400) => [status, { success: false, code, message: 'câu thô của máy chủ', data: null }] as const

test('xin mã: gửi email, không gửi token', async () => {
  const { api, calls } = backend(ok())
  await api.requestCode('binh@longbinh.vn')
  expect(calls).toEqual([{ url: 'http://api.test/api/auth/password-reset/request', body: { email: 'binh@longbinh.vn' }, authorization: undefined }])
})

test('xin mã lại quá sớm hoặc quá nhiều lần (400): RESET_REQUEST_REFUSED, không lộ câu của máy chủ', async () => {
  const { api } = backend(refused('Please wait 60 seconds'))
  await expect(api.requestCode('binh@longbinh.vn')).rejects.toMatchObject({ code: 'RESET_REQUEST_REFUSED', status: 400 })
})

test.each(['OTP_RESEND_COOLDOWN', 'OTP_REQUEST_LIMIT_EXCEEDED'])('xin mã bị từ chối kèm mã %s: giữ mã đó để nói đúng lý do', async (code) => {
  const { api } = backend(coded(code))
  await expect(api.requestCode('binh@longbinh.vn')).rejects.toMatchObject({ code, status: 400 })
})

test('xin mã bị từ chối kèm mã lạ (400): mã chung của bước', async () => {
  const { api } = backend(coded('SOMETHING_NEW'))
  await expect(api.requestCode('binh@longbinh.vn')).rejects.toMatchObject({ code: 'RESET_REQUEST_REFUSED', status: 400 })
})

test('xác nhận mã: trả mã phiên đặt lại', async () => {
  const { api, calls } = backend(ok({ resetToken: 'RST-1' }))
  await expect(api.verifyCode('binh@longbinh.vn', '123456')).resolves.toBe('RST-1')
  expect(calls[0]).toMatchObject({ url: 'http://api.test/api/auth/password-reset/verify', body: { email: 'binh@longbinh.vn', otp: '123456' } })
})

test('mã sai, hết hạn hoặc hết lượt thử (400): RESET_CODE_INVALID', async () => {
  const { api } = backend(refused('Invalid OTP'))
  await expect(api.verifyCode('binh@longbinh.vn', '000000')).rejects.toMatchObject({ code: 'RESET_CODE_INVALID' })
})

test.each(['OTP_EXPIRED', 'OTP_INCORRECT', 'OTP_ATTEMPTS_EXCEEDED'])('mã bị từ chối kèm mã %s: giữ mã đó', async (code) => {
  const { api } = backend(coded(code))
  await expect(api.verifyCode('binh@longbinh.vn', '000000')).rejects.toMatchObject({ code, status: 400 })
})

test('máy chủ trả xác nhận thiếu mã phiên: SERVER_ERROR', async () => {
  const { api } = backend(ok({}))
  await expect(api.verifyCode('binh@longbinh.vn', '123456')).rejects.toMatchObject({ code: 'SERVER_ERROR' })
})

test('đặt mật khẩu: gửi mã phiên và mật khẩu mới', async () => {
  const { api, calls } = backend(ok())
  await api.resetPassword('RST-1', 'mat-khau-moi')
  expect(calls[0]).toMatchObject({ url: 'http://api.test/api/auth/password-reset/reset', body: { resetToken: 'RST-1', newPassword: 'mat-khau-moi' } })
})

test('phiên đặt lại hết hạn (400): RESET_SESSION_EXPIRED', async () => {
  const { api } = backend(refused('Reset token expired'))
  await expect(api.resetPassword('RST-1', 'mat-khau-moi')).rejects.toMatchObject({ code: 'RESET_SESSION_EXPIRED' })
})

test.each([
  ['RESET_TOKEN_INVALID', 400],
  ['USER_NOT_FOUND', 404],
])('đặt mật khẩu bị từ chối kèm mã %s (%i): RESET_SESSION_EXPIRED để màn quay về bước nhập email', async (code, status) => {
  const { api } = backend(coded(code, status))
  await expect(api.resetPassword('RST-1', 'mat-khau-moi')).rejects.toMatchObject({ code: 'RESET_SESSION_EXPIRED', status })
})

test('mất mạng hoặc máy chủ lỗi: giữ mã của lỗi, không đổi thành lỗi của bước', async () => {
  const { api } = backend(new TypeError('Network request failed'), [500, { success: false, message: 'boom' }])
  await expect(api.requestCode('binh@longbinh.vn')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  await expect(api.verifyCode('binh@longbinh.vn', '123456')).rejects.toMatchObject({ code: 'SERVER_ERROR', status: 500 })
})

test('mã máy chủ giữ lại có câu riêng ở cả hai ngôn ngữ, không rơi về câu của mã HTTP', () => {
  const vi = createTranslator('vi')
  expect(dataErrorMessage(new ApiError('OTP_INCORRECT', { status: 400 }), vi)).toBe('Mã không đúng. Kiểm tra lại mã trong email.')
  for (const t of [vi, createTranslator('en')]) {
    const fallback = dataErrorMessage(new ApiError('SERVER_ERROR', { status: 400 }), t)
    for (const code of ['OTP_RESEND_COOLDOWN', 'OTP_REQUEST_LIMIT_EXCEEDED', 'OTP_EXPIRED', 'OTP_INCORRECT', 'OTP_ATTEMPTS_EXCEEDED']) {
      expect(dataErrorMessage(new ApiError(code, { status: 400 }), t)).not.toBe(fallback)
    }
  }
})
