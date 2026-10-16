import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, CONTENT_MAX_WIDTH, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

export type ScreenProps = {
  title: string
  /** Điều khiển ở mép trái dải trời, trước tiêu đề: nút quay lại (56), số điểm giao. */
  leading?: ReactNode
  /** Điều khiển ở mép phải dải trời (nút nền đặc 56). */
  actions?: ReactNode
  /** Phần dưới hàng tiêu đề, vẫn trong dải trời (dải tiến độ theo điểm giao). */
  below?: ReactNode
  /** Nội dung dài: màn tự cuộn và giữ lề. Màn có danh sách riêng (`SectionList`) thì không bật. */
  scroll?: boolean
  /** Kéo xuống để đọc lại — chỉ khi `scroll`. */
  refresh?: { readonly refreshing: boolean; readonly onRefresh: () => void }
  /** Chân màn dính đáy (nút chính của bước), chừa vùng an toàn dưới đáy máy. */
  footer?: ReactNode
  children: ReactNode
}

/**
 * Khung của một màn: dải trời nền tối mang tiêu đề (header của màn — chỉ chứa chữ tiêu đề), dưới đó là vùng làm việc nền `app`, và chân
 * màn khi có. Dải trời tự chừa tai thỏ / thanh trạng thái.
 */
export function Screen({ title, leading, actions, below, scroll = false, refresh, footer, children }: ScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      <View style={[styles.sky, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.skyRow}>
          {leading}
          <AppText variant="title" color={colors.skyText} accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {actions}
        </View>
        {below === undefined ? null : <View style={styles.below}>{below}</View>}
      </View>
      {scroll ? (
        // Lần chạm đi theo cây React, xuyên qua `Modal`: thiếu "handled" thì khi bàn phím đang mở, mọi nút của màn và của tờ trượt
        // (`Sheet`) đặt trong màn đều phải bấm hai lần — lần đầu chỉ đóng bàn phím
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={refresh === undefined ? undefined : <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.primary} />}>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
      {footer === undefined ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
          <View style={styles.footerColumn}>{footer}</View>
        </View>
      )}
    </View>
  )
}

/** Cột nội dung rộng tối đa CONTENT_MAX_WIDTH, lề 16 nằm trong cột: tiêu đề, thẻ và chân màn thẳng một mép trên máy tính bảng. */
const COLUMN = { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space[4] } as const

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.app },
  sky: { backgroundColor: colors.sky, paddingBottom: space[3] },
  skyRow: { ...COLUMN, minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  title: { flex: 1 },
  below: { ...COLUMN, paddingTop: space[3] },
  body: { flex: 1 },
  scroll: { paddingTop: space[4], paddingBottom: space[8] },
  column: { ...COLUMN, gap: space[4] },
  footer: { paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.bg },
  footerColumn: { ...COLUMN, gap: space[2] },
})
