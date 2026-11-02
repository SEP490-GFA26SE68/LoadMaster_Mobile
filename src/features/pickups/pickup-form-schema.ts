import { z } from 'zod'

import { HANDLING_CLASSES } from '@/domain/models'
import type { TFunction } from '@/lib/i18n'

import { validatePickupForm, type PickupFormError } from './pickup-form'

const pointSchema = z.object({ name: z.string(), address: z.string(), coordinates: z.object({ lat: z.string(), lng: z.string() }) })

/** Schema zod của form nhận hàng (như bản web): luật nằm ở `validatePickupForm` (thuần, có test); schema chỉ gắn **mã** lỗi vào đúng ô. */
export const pickupFormSchema = z
  .object({
    pickup: pointSchema,
    delivery: pointSchema,
    deadlineDate: z.string(),
    deadlineTime: z.string(),
    packages: z.array(
      z.object({
        packageCode: z.string(),
        lengthCm: z.string(),
        widthCm: z.string(),
        heightCm: z.string(),
        weightKg: z.string(),
        handlingClass: z.enum(HANDLING_CLASSES),
      }),
    ),
  })
  .superRefine((values, ctx) => {
    for (const issue of validatePickupForm(values)) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.code })
  })

const ERRORS: readonly PickupFormError[] = ['required', 'tooLong', 'coordinatesRequired', 'coordinatesInvalid', 'deadlineInvalid', 'number', 'packagesRequired']
const isError = (code: string | undefined): code is PickupFormError => ERRORS.some((item) => item === code)

/** Câu của một mã lỗi của form; `max` là độ dài tối đa của ô chữ (`tooLong`). */
export function pickupErrorText(code: string | undefined, max: number, t: TFunction): string | undefined {
  if (!isError(code)) return undefined
  if (code === 'tooLong') return t('pickups.dialog.errors.tooLong', { max })
  return t(`pickups.dialog.errors.${code}`)
}
