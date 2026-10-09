import { Redirect } from 'expo-router'

import { useAuth } from '@/features/auth/AuthProvider'
import { landingOf } from '@/features/auth/landing'

/** Gốc của nhóm đã đăng nhập: chuyển tới màn chính của vai trò. */
export default function Landing() {
  const { user } = useAuth()
  if (user === null) return null
  return <Redirect href={landingOf(user.role)} />
}
