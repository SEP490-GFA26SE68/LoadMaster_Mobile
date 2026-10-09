import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { connectAuth } from '@/data/http'
import { readStored, writeStored } from '@/lib/storage'
import type { User } from '@/types/user'

import type { AuthAdapter } from './auth-adapter'
import { authAdapter } from './auth-api'
import { can, type Permission } from './permissions'

/** Khoá cất phiên trong kho khoá của máy (`@/lib/storage`). */
const SESSION_KEY = 'phien'

type AuthState = { readonly status: 'restoring' } | { readonly status: 'signedOut' } | { readonly status: 'signedIn'; readonly user: User }

type AuthValue = {
  readonly status: AuthState['status']
  readonly user: User | null
  /** Kiểu đăng nhập của nguồn hiện tại: màn đăng nhập vẽ form mật khẩu hay nút mở trang đăng nhập của máy chủ. */
  readonly kind: AuthAdapter['kind']
  /** Kiểu `password` truyền email và mật khẩu; kiểu `redirect` gọi không tham số. Thất bại thì ném lỗi có mã. */
  signIn(email?: string, password?: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Giữ phiên đăng nhập của app. Mở app: đọc phiên đã cất và hỏi adapter có mở lại được không. Đăng nhập và đăng xuất đều **xoá sạch
 * cache truy vấn**: dữ liệu đã lọc cho người trước không hiện cho người sau trên cùng máy (như bản web).
 * `adapter` chỉ truyền trong test.
 */
export function AuthProvider({ children, adapter: injected }: { children: ReactNode; adapter?: AuthAdapter }) {
  const queryClient = useQueryClient()
  const adapter = useMemo(() => injected ?? authAdapter(), [injected])
  const [state, setState] = useState<AuthState>({ status: 'restoring' })

  const signOut = useCallback(async () => {
    setState({ status: 'signedOut' })
    queryClient.clear()
    await writeStored(SESSION_KEY, null)
    // Phiên phía nguồn dữ liệu đóng sau cùng: người dùng đã ra khỏi app dù lượt gọi này có lỗi.
    await adapter.signOut().catch(() => undefined)
  }, [adapter, queryClient])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const saved = await readStored(SESSION_KEY)
      const session = saved === null ? null : await adapter.restore(saved).catch(() => null)
      if (cancelled) return
      if (session === null && saved !== null) await writeStored(SESSION_KEY, null)
      setState(session === null ? { status: 'signedOut' } : { status: 'signedIn', user: session.user })
    })()
    return () => {
      cancelled = true
    }
  }, [adapter])

  useEffect(() => {
    connectAuth({ accessToken: () => adapter.accessToken(), onUnauthenticated: () => void signOut() })
  }, [adapter, signOut])

  const value = useMemo<AuthValue>(
    () => ({
      status: state.status,
      user: state.status === 'signedIn' ? state.user : null,
      kind: adapter.kind,
      async signIn(email = '', password = '') {
        const session = adapter.kind === 'password' ? await adapter.signIn(email, password) : await adapter.signIn()
        queryClient.clear()
        await writeStored(SESSION_KEY, session.saved)
        setState({ status: 'signedIn', user: session.user })
      },
      signOut,
    }),
    [adapter, queryClient, signOut, state],
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
