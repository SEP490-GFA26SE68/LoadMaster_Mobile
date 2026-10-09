import { en } from './en'
import { INTL_LOCALES, type Locale } from './locale'
import type { MessageKey, MessageParams, MessageTree, ParamsArgs, ParamValue, PluralMessage, TFunction } from './types'
import { vi } from './vi'

const DICTIONARIES: Record<Locale, MessageTree> = { vi, en }

/**
 * Như bản web, trừ cách chọn dạng số nhiều: Hermes không bảo đảm có `Intl.PluralRules`, nên luật viết thẳng ở đây — tiếng Anh dùng
 * `one` khi đếm đúng 1, tiếng Việt luôn dùng `other` (hai dạng của câu tiếng Việt phải giống hệt nhau).
 */
export function createTranslator(locale: Locale): TFunction {
  const messages = DICTIONARIES[locale]
  const numbers = new Intl.NumberFormat(INTL_LOCALES[locale])

  function t<Key extends MessageKey>(key: Key, ...params: ParamsArgs<Key>): string
  function t(key: string, params?: MessageParams): string {
    const message = lookup(messages, key)
    if (message === undefined) return key

    const text = typeof message === 'string' ? message : pickPlural(message, params?.count, locale)
    return interpolate(text, params, numbers)
  }

  return t
}

type MessageNode = MessageTree[string]

function isPluralMessage(node: MessageNode): node is PluralMessage {
  return typeof node === 'object' && typeof node.one === 'string' && typeof node.other === 'string' && Object.keys(node).length === 2
}

function lookup(messages: MessageTree, key: string): string | PluralMessage | undefined {
  let node: MessageNode | undefined = messages
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string' || isPluralMessage(node)) return undefined
    node = node[part]
  }
  return node === undefined || typeof node === 'string' || isPluralMessage(node) ? node : undefined
}

function pickPlural(message: PluralMessage, count: ParamValue | undefined, locale: Locale): string {
  return locale === 'en' && count === 1 ? message.one : message.other
}

function interpolate(text: string, params: MessageParams | undefined, numbers: Intl.NumberFormat): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name]
    if (value === undefined) return placeholder
    return typeof value === 'number' ? numbers.format(value) : value
  })
}
