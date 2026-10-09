import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
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

/** Danh sách tài khoản của dữ liệu mẫu; chạm một dòng để điền form. Chỉ dùng khi đăng nhập chạy trên kho mẫu. */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  const t = useT()
  return (
    <View style={styles.box}>
      <AppText variant="heading">{t('auth.demo.title')}</AppText>
      <AppText color={colors.text2}>{t('auth.demo.hint')}</AppText>
      {groups().map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText variant="label" color={colors.text2}>
            {group.name ?? t('auth.demo.platform')}
          </AppText>
          {group.accounts.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              accessibilityLabel={`${t(`roles.${account.role}`)}, ${account.email}`}
              onPress={() => onPick(account.email, SEED_PASSWORD)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <AppText variant="label">{t(`roles.${account.role}`)}</AppText>
              <AppText color={colors.text2}>{account.email}</AppText>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  group: { gap: space[1], marginTop: space[2] },
  row: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.lineSoft },
  rowPressed: { backgroundColor: colors.primaryBg, borderColor: colors.focus },
})
