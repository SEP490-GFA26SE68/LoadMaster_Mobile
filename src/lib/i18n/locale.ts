import type { FormatLocale } from '@/lib/format'

/** Ngôn ngữ giao diện. Thêm một ngôn ngữ: thêm mã vào đây rồi để TypeScript chỉ ra các bảng còn thiếu. */
export const LOCALES = ['vi', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'vi'

/** Locale của `Intl` cho số và ngày theo từng ngôn ngữ giao diện. */
export const INTL_LOCALES: Record<Locale, FormatLocale> = { vi: 'vi-VN', en: 'en-US' }

/** Tên ngôn ngữ viết bằng chính ngôn ngữ đó, không dịch. */
export const LOCALE_NAMES: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English' }

/** Khoá lưu lựa chọn ngôn ngữ (`@/lib/storage`). */
export const LOCALE_STORAGE_KEY = 'ngon-ngu'

export function isLocale(value: string | null): value is Locale {
  return LOCALES.some((locale) => locale === value)
}
