import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'

import { createFormatter, type Formatter } from '@/lib/format'
import { readStored, writeStored } from '@/lib/storage'

import { DEFAULT_LOCALE, INTL_LOCALES, isLocale, LOCALE_STORAGE_KEY, type Locale } from './locale'
import { createTranslator } from './translate'
import type { TFunction } from './types'

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TFunction
  format: Formatter
}

const I18nContext = createContext<I18nValue | null>(null)

/**
 * Bọc toàn app. Mở app bằng tiếng Việt rồi đọc lựa chọn đã lưu; đổi ngôn ngữ chỉ vẽ lại chữ và số, không dựng lại màn, form đang nhập
 * giữ nguyên. `initialLocale` dành cho test: không đọc, không ghi nơi lưu.
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)

  useEffect(() => {
    if (initialLocale !== undefined) return
    let cancelled = false
    void readStored(LOCALE_STORAGE_KEY).then((stored) => {
      if (!cancelled && isLocale(stored)) setLocaleState(stored)
    })
    return () => {
      cancelled = true
    }
  }, [initialLocale])

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next)
        if (initialLocale === undefined) void writeStored(LOCALE_STORAGE_KEY, next)
      },
      t: createTranslator(locale),
      format: createFormatter(INTL_LOCALES[locale]),
    }),
    [locale, initialLocale],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}

function useI18n(hook: string): I18nValue {
  const value = use(I18nContext)
  if (!value) throw new Error(`${hook} phải nằm trong <I18nProvider>`)
  return value
}

export function useT(): TFunction {
  return useI18n('useT').t
}

export function useFormat(): Formatter {
  return useI18n('useFormat').format
}

export function useLocale(): Pick<I18nValue, 'locale' | 'setLocale'> {
  const { locale, setLocale } = useI18n('useLocale')
  return { locale, setLocale }
}
