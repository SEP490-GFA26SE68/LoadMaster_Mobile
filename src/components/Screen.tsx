import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, CONTENT_MAX_WIDTH, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

export type ScreenProps = {
  title: string
  /** Điều khiển ở mép phải dải trời (nút nền đặc 56). */
  actions?: ReactNode
  /** Nội dung dài: màn tự cuộn và giữ lề. Màn có danh sách riêng (`SectionList`) thì không bật. */
  scroll?: boolean
  children: ReactNode
}

/**
 * Khung của một màn: dải trời nền tối mang tiêu đề (`<h1>` của màn — chỉ chứa chữ tiêu đề), dưới đó là vùng làm việc nền `app`.
 * Dải trời tự chừa tai thỏ / thanh trạng thái.
 */
export function Screen({ title, actions, scroll = false, children }: ScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      <View style={[styles.sky, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.skyRow}>
          <AppText variant="title" color={colors.skyText} accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {actions}
        </View>
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.app },
  sky: { backgroundColor: colors.sky, paddingBottom: space[3] },
  // Cột nội dung rộng tối đa CONTENT_MAX_WIDTH, lề 16 nằm trong cột: tiêu đề và thẻ bên dưới thẳng một mép trên máy tính bảng
  skyRow: { minHeight: TOUCH, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  title: { flex: 1 },
  body: { flex: 1 },
  scroll: { paddingTop: space[4], paddingBottom: space[8] },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space[4], gap: space[4] },
})
