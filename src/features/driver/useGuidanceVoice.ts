import { useEffect } from 'react'

import { useLocale } from '@/lib/i18n'

import { speakGuidance, stopGuidanceVoice } from './guidance-voice'

/**
 * Đọc to bước chỉ đường khi câu đổi. Tắt bằng `enabled === false` (nút loa trên HUD). Không bằng giọng Google Maps — chỉ TTS máy.
 */
export function useGuidanceVoice(phrase: string | undefined, enabled: boolean): void {
  const { locale } = useLocale()

  useEffect(() => {
    if (!enabled || phrase === undefined || phrase.trim() === '') {
      stopGuidanceVoice()
      return
    }
    speakGuidance(phrase, locale)
    return () => {
      stopGuidanceVoice()
    }
  }, [phrase, enabled, locale])
}
