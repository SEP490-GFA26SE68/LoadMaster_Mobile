import { useCallback, useEffect, useSyncExternalStore } from 'react'

import type { Locale } from '@/lib/i18n'

import { askAssistant } from './assistant-api'
import type { AssistantPage, AssistantReply } from './assistant-model'

/** Một dòng của cuộc trò chuyện. Lỗi giữ nguyên đối tượng lỗi để màn dịch theo ngôn ngữ đang chọn. */
export type ChatEntry =
  | { readonly id: number; readonly kind: 'question'; readonly text: string }
  | { readonly id: number; readonly kind: 'answer'; readonly reply: AssistantReply }
  | { readonly id: number; readonly kind: 'error'; readonly error: unknown }

export type AssistantSession = {
  /** Người đang trò chuyện (mã người dùng); đổi người là cuộc trò chuyện mới. */
  readonly owner: string | null
  readonly conversationId: string | null
  readonly entries: readonly ChatEntry[]
  /** Đang chờ máy chủ trả lời. */
  readonly pending: boolean
}

export type SendContext = { readonly locale: Locale; readonly page: AssistantPage | null }

const EMPTY: AssistantSession = { owner: null, conversationId: null, entries: [], pending: false }

/*
 * Cuộc trò chuyện chỉ nằm trong bộ nhớ (như bản web): đóng rồi mở lại màn trợ lý vẫn còn, tắt app hay đăng xuất là mất — không lưu xuống
 * máy. `generation` tăng mỗi lần bắt đầu lại hay đổi người: câu trả lời về muộn của cuộc trò chuyện cũ bị bỏ.
 */
let session: AssistantSession = EMPTY
let generation = 0
let nextId = 1
const listeners = new Set<() => void>()

function set(next: AssistantSession): void {
  session = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function reset(owner: string | null): void {
  generation += 1
  set({ ...EMPTY, owner })
}

/** Gắn cuộc trò chuyện với người đang đăng nhập: người khác thì bắt đầu lại. */
export function bindSession(owner: string | null): void {
  if (session.owner !== owner) reset(owner)
}

/** Bắt đầu lại: bỏ cuộc trò chuyện đang có, câu hỏi kế tiếp mở hội thoại mới ở máy chủ. */
export function restartSession(): void {
  reset(session.owner)
}

/** Gửi một câu hỏi của `owner`. Đang chờ câu trước thì không gửi. */
export async function sendQuestion(owner: string | null, message: string, { locale, page }: SendContext): Promise<void> {
  const text = message.trim()
  if (text === '') return
  bindSession(owner)
  if (session.pending) return
  const mine = generation
  set({ ...session, pending: true, entries: [...session.entries, { id: nextId++, kind: 'question', text }] })
  try {
    const reply = await askAssistant({ message: text, locale, conversationId: session.conversationId, page })
    if (mine !== generation) return
    set({ ...session, pending: false, conversationId: reply.conversationId, entries: [...session.entries, { id: nextId++, kind: 'answer', reply }] })
  } catch (error) {
    if (mine !== generation) return
    set({ ...session, pending: false, entries: [...session.entries, { id: nextId++, kind: 'error', error }] })
  }
}

/** Đưa bộ nhớ về trống — chỉ cho test. */
export function resetAssistantSessionForTest(): void {
  reset(null)
}

/** Cuộc trò chuyện của người đang đăng nhập, cùng hai việc gửi câu hỏi và bắt đầu lại. */
export function useAssistantSession(owner: string | null) {
  useEffect(() => bindSession(owner), [owner])
  const current = useSyncExternalStore(subscribe, () => session)
  const shown = current.owner === owner ? current : EMPTY
  const ask = useCallback((message: string, context: SendContext) => sendQuestion(owner, message, context), [owner])
  return { session: shown, ask, restart: restartSession }
}
