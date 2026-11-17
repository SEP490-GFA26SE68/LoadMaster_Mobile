import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { RoleBadge } from '@/components/RoleBadge'
import { useT } from '@/lib/i18n'
import { QUICK_LOGIN_ACCOUNTS, SEED_COMPANIES, SEED_PASSWORD, type DemoAccount } from '@/lib/mock-db'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

type Group = { readonly key: string; readonly name: string | null; readonly accounts: readonly DemoAccount[] }

/** Nhóm tài khoản dùng thử: nền tảng trước, rồi từng công ty theo thứ tự trong dữ liệu mẫu. */
function groups(): Group[] {
  const platform = QUICK_LOGIN_ACCOUNTS.filter((account) => account.companyId === undefined)
  const companies = SEED_COMPANIES.map((company) => ({
    key: company.id,
    name: company.name,
    accounts: QUICK_LOGIN_ACCOUNTS.filter((account) => account.companyId === company.id),
  }))
  return [{ key: 'platform', name: null, accounts: platform }, ...companies].filter((group) => group.accounts.length > 0)
}

/** Danh sách tài khoản của dữ liệu mẫu; chạm một dòng để điền form (chuẩn Web V2.3). */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  const t = useT()

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <AppText variant="heading" color={colors.text} style={styles.title}>
          {t('auth.demo.title')}
        </AppText>
        <View style={styles.passwordPill}>
          <AppText variant="meta" color={colors.primary} style={styles.passwordText}>
            {t('auth.demo.password', { password: SEED_PASSWORD })}
          </AppText>
        </View>
      </View>

      <AppText variant="meta" color={colors.text2}>
        {t('auth.demo.hint')}
      </AppText>

      {groups().map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText variant="label" color={colors.text3} style={styles.groupLabel}>
            {group.name ?? t('auth.demo.platform')}
          </AppText>

          <View style={styles.accountList}>
            {group.accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                accessibilityLabel={`${t(`roles.${account.role}`)}, ${account.email}`}
                onPress={() => onPick(account.email, SEED_PASSWORD)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <View style={styles.badgeWrapper}>
                  <RoleBadge role={account.role} />
                </View>
                <View style={styles.emailWrapper}>
                  <AppText variant="body" color={colors.text2} style={styles.emailText} numberOfLines={1}>
                    {account.email}
                  </AppText>
                  <ChevronRight size={18} color={colors.text3} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    gap: 10,
    padding: space[4],
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 195, 212, 0.35)',
    backgroundColor: 'rgba(240, 253, 255, 0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space[2],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  passwordPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 195, 212, 0.12)',
  },
  passwordText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  group: {
    gap: 6,
    marginTop: 6,
  },
  groupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: space[1],
  },
  accountList: {
    gap: 6,
  },
  row: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(0, 195, 212, 0.15)',
    gap: space[2],
  },
  rowPressed: {
    backgroundColor: 'rgba(0, 195, 212, 0.08)',
    borderColor: colors.primary,
  },
  badgeWrapper: {
    flexShrink: 0,
  },
  emailWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  emailText: {
    fontSize: 13,
    fontFamily: 'Courier',
    flexShrink: 1,
  },
})
