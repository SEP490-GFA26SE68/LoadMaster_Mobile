import { z } from 'zod'

import type { MessageKey, TFunction } from '@/lib/i18n'

/** Câu lỗi của schema là key từ điển: màn dịch khi hiện. */
const message = (key: MessageKey) => ({ message: key })

const email = z
  .string()
  .trim()
  .min(1, message('auth.login.emailRequired'))
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message('auth.login.emailInvalid'))

export const signInSchema = z.object({
  email,
  password: z.string().min(1, message('auth.login.passwordRequired')),
})

export type SignInValues = z.infer<typeof signInSchema>

/** Bước 1 của Đặt lại mật khẩu: cùng luật email với màn đăng nhập. */
export const resetEmailSchema = z.object({ email })

export type ResetEmailValues = z.infer<typeof resetEmailSchema>

/** Bước 2: mã xác nhận 6 số máy chủ gửi tới email. */
export const resetCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, message('auth.forgot.codeInvalid')),
})

export type ResetCodeValues = z.infer<typeof resetCodeSchema>

/** Mật khẩu ngắn nhất máy chủ nhận. */
export const MIN_PASSWORD_LENGTH = 8

/** Bước 3: mật khẩu mới, nhập hai lần. */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, message('auth.forgot.passwordTooShort')),
    confirm: z.string().min(1, message('auth.forgot.confirmRequired')),
  })
  .refine((values) => values.password === values.confirm, { path: ['confirm'], ...message('auth.forgot.confirmMismatch') })

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

/** Câu lỗi của một ô: các schema trên dùng key từ điển không có tham số làm câu lỗi. */
export function fieldErrorText(t: TFunction, key: string | undefined): string | undefined {
  return key === undefined ? undefined : (t as unknown as (key: string) => string)(key)
}
