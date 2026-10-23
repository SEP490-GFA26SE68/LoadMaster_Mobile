import { RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { WarehouseTripCard } from './trips/WarehouseTripCard'
import { useWarehouseTrips } from './useWarehouseQueries'
import { warehouseGroups, type WarehouseStage, type WarehouseTripRow } from './warehouse-trips'

type TripSection = { readonly stage: WarehouseStage; readonly title: string; readonly data: WarehouseTripRow[] }

/**
 * Tab Kho của nhân viên kho (như `WarehouseTripsPage` của web): chuyến cần xếp chia nhóm theo trạng thái và dòng phụ (`warehouseGroups`) —
 * Đang xếp hàng (tiến độ) · Chờ soạn · Xếp xong — chờ xuất phát (còn ghi được số seal) · Chờ điều phối tối ưu lại (không bắt đầu được);
 * tiêu đề nhóm kèm số chuyến. Một nút chính: chuyến nên làm trước — đang xếp dở, không thì chuyến chờ soạn sớm nhất; mọi nút khác là nút
 * phụ. Dưới tiêu đề là số chuyến và ngày hôm nay; chuông ở mép phải dải trời. Kéo xuống để đọc lại; đã có danh sách mà lần đọc lại lỗi
 * thì giữ danh sách, nói lỗi ở đầu danh sách.
 */
export function WarehouseTripsScreen() {
  const t = useT()
  const format = useFormat()
  const query = useWarehouseTrips()
  const rows = query.data
  const groups = rows === undefined ? [] : warehouseGroups(rows)
  const sections: TripSection[] = groups.map(({ stage, rows: data }) => ({
    stage,
    title: t('warehouseTrips.section', { group: t(`warehouse.list.groups.${stage}`), count: data.length }),
    data: [...data],
  }))
  // Nhóm theo thứ tự `WAREHOUSE_STAGES` (đang xếp trước chờ soạn), trong nhóm chuyến sớm nhất đứng trước
  const primaryId = groups.find((group) => group.stage === 'loading' || group.stage === 'waiting')?.rows[0]?.id
  const today = format.date(new Date())

  return (
    <Screen
      title={t('warehouse.list.title')}
      actions={<NotificationBell />}
      below={<AppText color={colors.skyText2}>{rows === undefined ? today : t('warehouse.list.summary', { count: rows.length, date: today })}</AppText>}>
      {rows === undefined ? (
        query.isError ? (
          <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState />
        )
      ) : (
        <SectionList<WarehouseTripRow, TripSection>
          sections={sections}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => <WarehouseTripCard row={item} primary={item.id === primaryId} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="heading" accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          ListHeaderComponent={
            query.isError ? (
              <View style={styles.failure}>
                <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner>
              </View>
            ) : null
          }
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState title={t('warehouse.list.emptyTitle')} description={t('warehouse.list.emptyDescription')} />}
        />
      )}
    </Screen>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  sectionTitle: { marginTop: space[4], marginBottom: space[3] },
  failure: { marginTop: space[2] },
  separator: { height: space[3] },
})
