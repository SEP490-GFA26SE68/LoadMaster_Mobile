import type { Locale } from '@/lib/i18n'

type SpeechApi = {
  speak(phrase: string, options: { language: string; rate: number }): void
  stop(): void
}

let cached: SpeechApi | null | undefined

/**
 * `expo-speech` gọi `requireNativeModule('ExpoSpeech')`: thiếu module thì **ném** và LogBox vẫn hiện dù `try/catch`.
 * Chỉ `require('expo-speech')` khi `requireOptionalNativeModule` thấy native (im lặng nếu không có). Jest không có native —
 * cho `require` bản mock. Bản dev-client cũ: HUD chạy, không loa, không ERROR; `pnpm android` lại thì có TTS.
 */
function expoSpeechNativePresent(): boolean {
  if (process.env.NODE_ENV === 'test') return true
  try {
    const core = require('expo-modules-core') as { requireOptionalNativeModule?: (name: string) => unknown }
    return core.requireOptionalNativeModule?.('ExpoSpeech') != null
  } catch {
    return false
  }
}

function speech(): SpeechApi | null {
  if (cached !== undefined) return cached
  if (!expoSpeechNativePresent()) {
    cached = null
    return cached
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- chỉ khi native đã có, hoặc Jest mock
    cached = require('expo-speech') as SpeechApi
  } catch {
    cached = null
  }
  return cached
}

export function hasGuidanceVoice(): boolean {
  return speech() !== null
}

/** Gói TTS của máy (`expo-speech`): tách file để test mock `speak` / `stop` mà không dựng màn. */
export function speakGuidance(phrase: string, locale: Locale): void {
  const api = speech()
  if (api === null) return
  try {
    api.stop()
    api.speak(phrase, { language: locale === 'en' ? 'en-US' : 'vi-VN', rate: 0.95 })
  } catch {
    cached = null
  }
}

export function stopGuidanceVoice(): void {
  try {
    speech()?.stop()
  } catch {
    cached = null
  }
}
