import { expoSpeech } from '@/test/native-mocks'

import { hasGuidanceVoice, speakGuidance, stopGuidanceVoice } from './guidance-voice'

test('speakGuidance đọc tiếng Việt rồi stopGuidanceVoice dừng', () => {
  expect(hasGuidanceVoice()).toBe(true)
  speakGuidance('Còn 300 m · Rẽ phải', 'vi')
  expect(expoSpeech.stop).toHaveBeenCalled()
  expect(expoSpeech.speak).toHaveBeenCalledWith('Còn 300 m · Rẽ phải', { language: 'vi-VN', rate: 0.95 })

  stopGuidanceVoice()
  expect(expoSpeech.stop.mock.calls.length).toBeGreaterThan(1)
})

test('gọi native ném ExpoSpeech thì không tuột ra màn chuyến', () => {
  expoSpeech.speak.mockImplementation(() => {
    throw new Error("Cannot find native module 'ExpoSpeech'")
  })
  expect(() => speakGuidance('Còn 300 m · Rẽ phải', 'vi')).not.toThrow()
})
