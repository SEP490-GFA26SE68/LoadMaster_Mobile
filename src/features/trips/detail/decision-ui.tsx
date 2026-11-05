import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { colors, palette, space } from '@/theme/tokens'

/**
 * Kết quả của lần quyết gần nhất trên một thẻ chờ duyệt: câu thành công, hoặc câu lỗi của kho kèm dòng người dùng đã bấm. Màn không có
 * toast: kết quả nằm ngay trong thẻ, trình đọc màn hình đọc nó (Banner thành công và lỗi đều là vùng đọc).
 */
export type DecisionNotice = { readonly tone: 'success' | 'danger'; readonly rowId: string; readonly text: string }

/** Lỗi nằm ngay dưới dòng đã bấm khi dòng đó còn; thành công, hoặc dòng đã đi (người khác vừa quyết), thì nằm ở đầu thẻ. */
export function rowError(notice: DecisionNotice | null, rowId: string): string | null {
  return notice?.tone === 'danger' && notice.rowId === rowId ? notice.text : null
}

/**
 * Vỏ chung của hai thẻ chờ điều phối viên quyết ở Chi tiết chuyến ("Kiện kho báo thiếu", "Xác nhận tay chờ duyệt"), như web: viền hổ
 * phách, tiêu đề, chip số dòng còn chờ, câu nói vì sao các dòng này chặn kho / tài xế, các dòng, rồi dòng lý do khi người xem chỉ xem.
 * Hết dòng mà còn kết quả vừa quyết thì thẻ chỉ còn tiêu đề và kết quả, tới khi người dùng ẩn nó.
 */
export function DecisionCard({ title, count, description, readOnly, notice, rowIds, onDismiss, loadError, children }: {
  title: string
  /** Chip số dòng còn chờ; `null` khi hết dòng. */
  count: string | null
  description: string
  /** Câu cho người chỉ xem; `null` khi người xem quyết được. */
  readOnly: string | null
  notice: DecisionNotice | null
  rowIds: readonly string[]
  onDismiss: () => void
  /** Lỗi đọc danh sách (lần đầu hoặc lần đọc lại). */
  loadError: string | null
  children: ReactNode
}) {
  const top = notice && (notice.tone === 'success' || !rowIds.includes(notice.rowId)) ? notice : null
  const hasRows = rowIds.length > 0
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {count ? <Chip tone="warning" label={count} /> : null}
        </View>
        {hasRows ? <AppText color={colors.text2}>{description}</AppText> : null}
      </View>
      {top ? (
        <Banner tone={top.tone} onDismiss={onDismiss}>
          {top.text}
        </Banner>
      ) : null}
      {loadError ? <Banner tone="danger">{loadError}</Banner> : null}
      {children}
      {hasRows && readOnly ? <AppText color={colors.text3}>{readOnly}</AppText> : null}
    </Card>
  )
}

/**
 * Một dòng chờ quyết: phần chữ là một phần tử đọc (`label` nói đủ những gì hiện ra), rồi hàng nút (khi người xem quyết được), rồi lỗi
 * của lần bấm trên dòng này.
 */
export function DecisionRow({ label, actions, error, onDismissError, children }: {
  label: string
  actions: ReactNode
  error: string | null
  onDismissError: () => void
  children: ReactNode
}) {
  return (
    <View style={styles.row}>
      <View accessible accessibilityLabel={label} style={styles.info}>
        {children}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {error ? (
        <Banner tone="danger" onDismiss={onDismissError}>
          {error}
        </Banner>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderColor: palette.amber[200] },
  header: { gap: space[1] },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  title: { flexShrink: 1 },
  row: { gap: space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  info: { gap: 2 },
  actions: { flexDirection: 'row', gap: space[3] },
})
