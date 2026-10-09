/**
 * i18n vi/en tự viết, cùng cách dùng với bản web: `useT()` cho chữ, `useFormat()` cho số và ngày, `useLocale()` khi cần biết hoặc đổi
 * ngôn ngữ. Ngoài React (hàm thuần, test): `createTranslator(locale)`.
 */
export { I18nProvider, useFormat, useLocale, useT } from './I18nProvider'
export { dataErrorMessage } from './data-error'
export { LOCALE_NAMES, LOCALES, type Locale } from './locale'
export { createTranslator } from './translate'
export type { MessageKey, TFunction } from './types'
