import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/StateView'
import { tripDetailPath } from '@/features/trips/trip-routes'
import { useT } from '@/lib/i18n'
import { ESCALATE_AFTER_MINUTES } from '@/lib/mock-db'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { EscalationItem } from './EscalationItem'
import type { EscalationRow } from './monitoring-view'
import { RenegotiateSheet } from './RenegotiateSheet'
import { useSheetTurn } from './useSheetTurn'

type EscalationListProps = {
  /** `escalationRows` của bảng giám sát và lần đọc giám sát mới nhất: sự cố đã chuyển quản lý, cũ trước. */
  rows: readonly EscalationRow[]
  userNames: Readonly<Record<string, string>>
  /** Tab của màn, đứng đầu danh sách. */
  header: ReactNode
  refresh: { readonly refreshing: boolean; readonly onRefresh: () => void }
}

/**
 * Tab "Sự cố cần xử lý" của quản lý công ty (như `EscalationTab` của web): sự cố điều phối viên đã chuyển lên hoặc kho tự chuyển sau 30
 * phút. Mỗi dòng một nút phụ "Nhập hạn mới" mở tờ liên hệ khách; các dòng ngang hàng nhau nên tab không có nút chính. Lưu xong, tờ đóng
 * và đầu danh sách nói hạn mới đã ghi (bản web báo bằng toast).
 */
export function EscalationList({ rows, userNames, header, refresh }: EscalationListProps) {
  const t = useT()
  const router = useRouter()
  const sheet = useSheetTurn<EscalationRow>()
  const [saved, setSaved] = useState<string | null>(null)
  // Tờ đang mở đọc dòng của lần đọc mới nhất (giờ đến của các điểm còn đổi); sự cố đã rời danh sách thì giữ dòng cuối cùng đã thấy
  const opened = sheet.target
  const target = opened === null ? null : (rows.find((row) => row.exception.id === opened.exception.id) ?? opened)

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.exception.id}
        renderItem={({ item }) => (
          <EscalationItem
            row={item}
            userNames={userNames}
            onRenegotiate={(row) => {
              setSaved(null)
              sheet.show(row)
            }}
            onOpenTrip={(tripId) => router.push(tripDetailPath(tripId))}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            {header}
            {saved === null ? null : (
              <Banner tone="success" onDismiss={() => setSaved(null)}>
                {t('monitoring.renegotiate.done', { requirementId: saved })}
              </Banner>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('monitoring.escalations.empty.title')}
            description={t('monitoring.escalations.empty.description', { minutes: ESCALATE_AFTER_MINUTES })}
          />
        }
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.primary} />}
      />
      {target === null ? null : (
        <RenegotiateSheet
          key={sheet.key}
          row={target}
          open={sheet.open}
          onClose={sheet.hide}
          onDone={(requirementId) => {
            sheet.hide()
            setSaved(requirementId)
          }}
        />
      )}
    </>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[3], marginBottom: space[3] },
  separator: { height: space[3] },
})
