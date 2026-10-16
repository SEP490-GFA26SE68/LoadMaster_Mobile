import { z } from 'zod'
import { DELIVERY_ISSUE_KINDS } from '@/lib/mock-db'

/** Ghi chú sự cố tối đa, ký tự — đủ cho vài câu, không thành báo cáo dài trên điện thoại. */
export const ISSUE_NOTE_MAX = 300

/** Mã lỗi của form; UI dịch qua `driver.issue.errors.<mã>` (D-28). */
export const ISSUE_FORM_ERRORS = ['packageRequired', 'kindRequired', 'noteRequired', 'noteTooLong'] as const
export type IssueFormError = (typeof ISSUE_FORM_ERRORS)[number]

/** "Báo sự cố" (D-47): một kiện, một loại, ghi chú; loại "Khác" không tự nói lên chuyện gì nên bắt buộc ghi chú. */
export const issueFormSchema = z
  .object({
    packageInstanceId: z.string().min(1, 'packageRequired'),
    kind: z.enum(DELIVERY_ISSUE_KINDS, 'kindRequired'),
    note: z.string().trim().max(ISSUE_NOTE_MAX, 'noteTooLong'),
  })
  .refine((value) => value.kind !== 'other' || value.note !== '', { path: ['note'], message: 'noteRequired' })

export type IssueFormInput = z.input<typeof issueFormSchema>
export type IssueFormValues = z.output<typeof issueFormSchema>

export function isIssueFormError(message: string | undefined): message is IssueFormError {
  return ISSUE_FORM_ERRORS.some((code) => code === message)
}
