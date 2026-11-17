import { dataConfig } from '@/data/config'
import { api } from '@/data/http'
import { getMockDb } from '@/data/mock-db'

export type UpdateProfileInput = {
  readonly fullName: string
  readonly phoneNumber?: string
}

export type ChangePasswordInput = {
  readonly currentPassword: string
  readonly newPassword: string
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<void> {
  const isHttp = dataConfig.sources.auth === 'http' || dataConfig.mode === 'http'
  if (isHttp) {
    await api().put('/api/users/me', {
      body: {
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber?.trim() || null,
      },
    })
    return
  }
  await getMockDb().updateProfile({
    fullName: input.fullName.trim(),
    phone: input.phoneNumber?.trim(),
  })
}

export async function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  const isHttp = dataConfig.sources.auth === 'http' || dataConfig.mode === 'http'
  if (isHttp) {
    await api().post('/api/users/me/change-password', {
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      },
    })
    return
  }
  await getMockDb().changePassword(input.currentPassword, input.newPassword)
}
