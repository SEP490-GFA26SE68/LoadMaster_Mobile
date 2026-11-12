import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert } from 'react-native'

import { connectAuth } from '@/data/http'
import { useT } from '@/lib/i18n'
import type { User } from '@/types/user'

import type { AuthAdapter } from './auth-adapter'
import { authAdapter } from './auth-api'
import { can, type Permission } from './permissions'
import { clearSession, onSessionStoreProblem, readSession, saveSession } from './session-store'

type AuthState = { readonly status: 'restoring' } | { readonly status: 'signedOut' } | { readonly status: 'signedIn'; readonly user: User }

type AuthValue = {
  readonly status: AuthState['status']
  readonly user: User | null
  /** `unreadable`: mở app không đọc được phiên đã cất trên máy — màn đăng nhập nói vì sao phải đăng nhập lại. */
  readonly sessionNotice: 'unreadable' | null
  dismissSessionNotice(): void
  /** Thất bại thì ném lỗi có mã (`dataErrorMessage`); không cất gì. */
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Giữ phiên đăng nhập của app. Mở app: đọc phiên đã cất và hỏi adapter có mở lại được không. Đăng nhập và đăng xuất đều **xoá sạch
 * cache truy vấn**: dữ liệu đã lọc cho người trước không hiện cho người sau trên cùng máy (như bản web).
 * Kho khoá của máy từ chối (`session-store.ts`) thì báo người dùng: không đọc được → câu trên màn đăng nhập; không cất được → hộp báo một
 * lần, vì phiên chỉ sống tới khi đóng app.
 * `adapter` chỉ truyền trong test.
 */
export function AuthProvider({ children, adapter: injected }: { children: ReactNode; adapter?: AuthAdapter }) {
  const t = useT()
  const queryClient = useQueryClient()
  const adapter = useMemo(() => injected ?? authAdapter(), [injected])
  const [state, setState] = useState<AuthState>({ status: 'restoring' })
  const [sessionNotice, setSessionNotice] = useState<'unreadable' | null>(null)

  useEffect(
    () =>
      onSessionStoreProblem((problem) => {
        if (problem === 'unreadable') setSessionNotice('unreadable')
        else Alert.alert(t('auth.sessionStore.notSavedTitle'), t('auth.sessionStore.notSaved'))
      }),
    [t],
  )

  const signOut = useCallback(async () => {
    setState({ status: 'signedOut' })
    queryClient.clear()
    // Adapter quên phiên ngay trong phần chạy đồng bộ của nó: lượt làm mới token đang dở không cất lại phiên vừa xoá dưới đây
    const closing = adapter.signOut().catch(() => undefined)
    await clearSession()
    // Phiên phía nguồn dữ liệu đóng sau cùng: người dùng đã ra khỏi app dù lượt gọi này có lỗi.
    await closing
  }, [adapter, queryClient])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const saved = await readSession()
      const session = saved === null ? null : await adapter.restore(saved).catch(() => null)
      if (cancelled) return
      // Phiên đã cất hết hiệu lực thì xoá; mở lại được thì cất bản adapter trả (token làm mới lúc mở app có thể đã đổi)
      if (saved !== null && session?.saved !== saved) {
        if (session === null) await clearSession()
        else await saveSession(session.saved)
      }
      setState(session === null ? { status: 'signedOut' } : { status: 'signedIn', user: session.user })
    })()
    return () => {
      cancelled = true
    }
  }, [adapter])

  useEffect(() => {
    connectAuth({
      accessToken: () => adapter.accessToken(),
      renewAccessToken: (rejected) => adapter.renewAccessToken(rejected),
      onUnauthenticated: () => void signOut(),
      // Đọc thẳng từ adapter, không từ state: màn mở ngay sau khi đăng nhập gọi backend trước khi effect này kịp chạy lại
      userId: () => adapter.backendUserId(),
    })
  }, [adapter, signOut])

  const value = useMemo<AuthValue>(
    () => ({
      status: state.status,
      user: state.status === 'signedIn' ? state.user : null,
      sessionNotice,
      dismissSessionNotice: () => setSessionNotice(null),
      async signIn(email, password) {
        const session = await adapter.signIn(email, password)
        queryClient.clear()
        setSessionNotice(null)
        await saveSession(session.saved)
        setState({ status: 'signedIn', user: session.user })
      },
      signOut,
    }),
    [adapter, queryClient, sessionNotice, signOut, state],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth phải nằm trong <AuthProvider>')
  return value
}

/** Hỏi quyền của người đang đăng nhập theo ma trận quyền chép từ web. Backend vẫn kiểm lại ở máy chủ. */
export function useCan(): (permission: Permission) => boolean {
  const { user } = useAuth()
  return useCallback((permission: Permission) => can(user?.role, permission), [user?.role])
}
