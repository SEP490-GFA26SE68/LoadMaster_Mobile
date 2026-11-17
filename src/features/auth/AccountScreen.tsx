import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { dataConfig, FEATURES } from '@/data/config'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'
import { initialsOf } from '@/types/user'

import { changeMyPassword, updateMyProfile } from './account-api'
import { useAuth } from './AuthProvider'
import { ForgotPasswordFlow } from './ForgotPasswordFlow'
import { scopeNote } from './landing'
import type { PasswordResetApi } from './password-reset-api'
import { usePasswordReset } from './usePasswordReset'

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.row}>
      <AppText color={colors.text2}>{label}</AppText>
      <AppText variant="label" style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  )
}

type PasswordMode = 'idle' | 'changing' | 'changed'

/**
 * Màn hình Tài khoản:
 * - Thông tin định danh: Avatar, họ tên, vai trò, trạng thái, loại tài khoản.
 * - Thông tin cá nhân: Chỉ cho phép chỉnh sửa Họ và tên, Số điện thoại (Email chỉ xem).
 * - Thông tin công ty: Chỉ xem (Read-only), hiển thị tên công ty, mã công ty, MST, email thanh toán, trạng thái.
 * - Đổi mật khẩu: Đổi trực tiếp hoặc qua OTP email khi quên mật khẩu cũ.
 * - Cài đặt hệ thống: Ngôn ngữ, nguồn dữ liệu, đăng xuất.
 */
export function AccountScreen({ passwordReset }: { readonly passwordReset?: PasswordResetApi } = {}) {
  const t = useT()
  const format = useFormat()
  const { user, signOut, updateUser } = useAuth()
  const reset = usePasswordReset(passwordReset)
  const [password, setPassword] = useState<PasswordMode>('idle')

  // Trạng thái sửa thông tin cá nhân
  const [isEditing, setIsEditing] = useState(false)
  const [fullNameInput, setFullNameInput] = useState(user?.fullName ?? '')
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null)

  // Trạng thái đổi mật khẩu trực tiếp
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null)
  const [passwordError, setPasswordError] = useState<string | undefined>()

  const backToAccount = useCallback(() => setPassword('idle'), [])

  if (user === null) return null

  if (password === 'changing' && reset !== null) {
    return (
      <Screen title={t('account.changePassword')} scroll>
        <ForgotPasswordFlow
          api={reset}
          initialEmail={user.email}
          onDone={() => setPassword('changed')}
          onCancel={backToAccount}
          cancelLabel={t('account.backToAccount')}
        />
      </Screen>
    )
  }

  const handleStartEdit = () => {
    setFullNameInput(user.fullName)
    setPhoneInput(user.phone)
    setProfileFeedback(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setFullNameInput(user.fullName)
    setPhoneInput(user.phone)
    setProfileFeedback(null)
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!fullNameInput.trim()) return
    setIsSavingProfile(true)
    setProfileFeedback(null)
    try {
      await updateMyProfile({
        fullName: fullNameInput.trim(),
        phoneNumber: phoneInput.trim(),
      })
      updateUser({
        fullName: fullNameInput.trim(),
        phone: phoneInput.trim(),
      })
      setIsEditing(false)
      setProfileFeedback({ tone: 'success', message: t('account.profileUpdated') })
    } catch {
      setProfileFeedback({ tone: 'danger', message: t('account.updateProfileError') })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleDirectChangePassword = async () => {
    setPasswordFeedback(null)
    setPasswordError(undefined)

    if (newPassword.length < 8) {
      setPasswordError(t('account.passwordLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'))
      return
    }

    setIsChangingPassword(true)
    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsEditingPassword(false)
      setPasswordFeedback({ tone: 'success', message: t('account.passwordChanged') })
    } catch {
      setPasswordFeedback({ tone: 'danger', message: t('account.changePasswordError') })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const note = scopeNote(user.role)
  const onHttp = FEATURES.filter((feature) => dataConfig.sources[feature] === 'http')
  const url = dataConfig.apiUrl ?? ''
  const source =
    dataConfig.mode === 'mock'
      ? t('account.dataSource.mock')
      : dataConfig.mode === 'http'
        ? t('account.dataSource.http', { url })
        : t('account.dataSource.mixed', { url, features: format.list(onHttp) })

  const statusTone = user.status === 'active' ? 'success' : user.status === 'flagged' ? 'warning' : 'danger'

  return (
    <Screen title={t('account.title')} scroll>
      {/* 1. Hero Identity Card */}
      <View style={styles.card}>
        <View style={styles.identity}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText variant="heading" color={colors.onPrimary}>
              {initialsOf(user.fullName)}
            </AppText>
          </View>
          <View style={styles.identityText}>
            <AppText variant="heading">{user.fullName}</AppText>
            <View style={styles.badgesRow}>
              <Chip tone="cyan" label={t(`roles.${user.role}`)} />
              <Chip tone={statusTone} label={t(`account.statusLabel.${user.status}`)} />
              {user.userType ? (
                <Chip tone="azure" label={t(`account.userType.${user.userType === 'TRIAL' ? 'trial' : 'official'}`)} />
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* 2. Personal Information Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="heading">{t('account.personalInfo')}</AppText>
          {!isEditing ? (
            <Button variant="secondary" onPress={handleStartEdit}>
              {t('account.edit')}
            </Button>
          ) : null}
        </View>

        {profileFeedback ? (
          <Banner tone={profileFeedback.tone} onDismiss={() => setProfileFeedback(null)}>
            {profileFeedback.message}
          </Banner>
        ) : null}

        {!isEditing ? (
          <>
            <Row label={t('account.fullName')} value={user.fullName} />
            <Row label={t('account.phone')} value={user.phone || '--'} />
            <View style={styles.row}>
              <AppText color={colors.text2}>{t('account.email')}</AppText>
              <View style={styles.readOnlyContainer}>
                <AppText variant="label" style={styles.rowValue}>
                  {user.email}
                </AppText>
                <Chip tone="neutral" label={t('account.readOnlyNotice')} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.formGap}>
            <TextField
              label={t('account.fullName')}
              value={fullNameInput}
              onChangeText={setFullNameInput}
            />
            <TextField
              label={t('account.phone')}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
            />
            <View style={styles.row}>
              <AppText color={colors.text2}>{t('account.email')}</AppText>
              <View style={styles.readOnlyContainer}>
                <AppText variant="label" style={styles.rowValue}>
                  {user.email}
                </AppText>
                <Chip tone="neutral" label={t('account.readOnlyNotice')} />
              </View>
            </View>
            <View style={styles.formActions}>
              <Button variant="secondary" onPress={handleCancelEdit} disabled={isSavingProfile}>
                {t('account.cancel')}
              </Button>
              <Button onPress={() => void handleSaveProfile()} disabled={isSavingProfile}>
                {isSavingProfile ? t('account.saving') : t('account.save')}
              </Button>
            </View>
          </View>
        )}
      </View>

      {/* 3. Company Information Card (Read-Only) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="heading">{t('account.companyInfo')}</AppText>
          <Chip tone="neutral" label={t('account.readOnlyNotice')} />
        </View>
        <AppText color={colors.text3}>{t('account.companyManaged')}</AppText>
        <Row label={t('account.companyName')} value={user.companyName ?? '--'} />
        <Row label={t('account.companyCode')} value={user.companyCode ?? '--'} />
        <Row label={t('account.taxCode')} value={user.companyTaxCode ?? '--'} />
        <Row label={t('account.billingEmail')} value={user.companyBillingEmail ?? '--'} />
        <Row label={t('account.companyStatus')} value={user.companyStatus ?? '--'} />
        {user.depot !== undefined && <Row label={t('account.depot')} value={user.depot} />}
      </View>

      {/* 4. Password Management Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="heading">{t('account.passwordSection')}</AppText>
          {!isEditingPassword ? (
            <Button
              variant="secondary"
              onPress={() => {
                setIsEditingPassword(true)
                setPasswordFeedback(null)
                setPasswordError(undefined)
              }}>
              {t('account.editPassword')}
            </Button>
          ) : null}
        </View>

        {passwordFeedback ? (
          <Banner tone={passwordFeedback.tone} onDismiss={() => setPasswordFeedback(null)}>
            {passwordFeedback.message}
          </Banner>
        ) : null}

        {password === 'changed' ? (
          <Banner tone="success" onDismiss={backToAccount}>
            {t('account.passwordChanged')}
          </Banner>
        ) : null}

        {!isEditingPassword ? (
          <Row label={t('account.passwordSection')} value="••••••••" />
        ) : (
          <View style={styles.formGap}>
            <TextField
              label={t('account.currentPassword')}
              secure
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextField
              label={t('account.newPassword')}
              secure
              value={newPassword}
              onChangeText={setNewPassword}
              error={passwordError}
            />
            <TextField
              label={t('account.confirmPassword')}
              secure
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.formActions}>
              <Button
                variant="secondary"
                onPress={() => {
                  setIsEditingPassword(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError(undefined)
                }}
                disabled={isChangingPassword}>
                {t('account.cancel')}
              </Button>
              <Button
                onPress={() => void handleDirectChangePassword()}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
                {isChangingPassword ? t('account.saving') : t('account.changePasswordDirect')}
              </Button>
            </View>
          </View>
        )}

        {reset !== null ? (
          <Button variant="secondary" onPress={() => setPassword('changing')}>
            {t('account.changePassword')}
          </Button>
        ) : null}
      </View>

      {note !== null && <Banner tone="info">{t(`account.scope.${note}`)}</Banner>}

      {/* 5. System Settings & Actions */}
      <View style={styles.card}>
        <AppText variant="label">{t('language.label')}</AppText>
        <LanguageSwitch />
      </View>

      <View style={styles.card}>
        <AppText variant="label">{t('account.dataSource.title')}</AppText>
        <AppText color={colors.text2}>{source}</AppText>
      </View>

      <Button variant="secondary" onPress={() => void signOut()}>
        {t('account.signOut')}
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  identityText: {
    flex: 1,
    gap: space[1],
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    flexWrap: 'wrap',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFill,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  formGap: {
    gap: space[3],
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[2],
    marginTop: space[2],
  },
})
