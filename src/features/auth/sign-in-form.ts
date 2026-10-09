import { z } from 'zod'

import type { MessageKey } from '@/lib/i18n'

/** Câu lỗi của schema là key từ điển: màn dịch khi hiện. */
const message = (key: MessageKey) => ({ message: key })

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, message('auth.login.emailRequired'))
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message('auth.login.emailInvalid')),
  password: z.string().min(1, message('auth.login.passwordRequired')),
})

export type SignInValues = z.infer<typeof signInSchema>
