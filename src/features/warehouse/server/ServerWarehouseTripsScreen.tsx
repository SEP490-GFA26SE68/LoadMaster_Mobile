import { RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { SERVER_WAREHOUSE_STAGES, type ServerWarehouseStage, type ServerWarehouseTrip } from '../warehouse-server-model'
import { ServerTripCard } from './ServerTripCard'
import { useServerWarehouseTrips } from './useServerWarehouseQueries'

type TripSection = { readonly stage: ServerWarehouseStage; readonly title: string; readonly data: ServerWarehouseTrip[] }

/**
 * Tab Kho khi nguồn `warehouse` là máy chủ (như `ServerWarehouseTripsPage` của web): `GET /api/warehouse/tasks` chia nhóm Đang xếp hàng ·
 * Chờ xếp · Xếp xong — chờ xuất phát · Chờ điều phối tối ưu lại, tiêu đề nhóm kèm số chuyến; trong nhóm chuyến xuất phát sớm trước. Một nút
 * chính: chuyến đang xếp dở, không thì chuyến chờ xếp sớm nhất. Không có chuông — máy chủ chưa có thông báo cho kho. Kéo xuống để đọc lại;
 * đã có danh sách mà lần đọc lại lỗi thì giữ danh sách, nói lỗi ở đầu danh sách.
 */
export function ServerWarehouseTripsScreen() {
  const t = useT()
  const format = useFormat()
  const query = useServerWarehouseTrips()
  const rows = query.data
  const sections: TripSection[] = SERVER_WAREHOUSE_STAGES.flatMap((stage) => {
    const data = (rows ?? []).filter((row) => row.stage === stage)
    return data.length === 0 ? [] : [{ stage, title: t('warehouseTrips.section', { group: t(`serverWarehouse.groups.${stage}`), count: data.length }), data }]
  })
  const primaryId = (rows?.find((row) => row.stage === 'loading') ?? rows?.find((row) => row.stage === 'waiting'))?.id
  const today = format.date(new Date())

  return (
    <Screen
      title={t('warehouse.list.title')}
      below={<AppText color={colors.skyText2}>{rows === undefined ? today : t('warehouse.list.summary', { count: rows.length, date: today })}</AppText>}>
      {rows === undefined ? (
        query.isError ? (
          <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState />
        )
      ) : (
        <SectionList<ServerWarehouseTrip, TripSection>
          sections={sections}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => <ServerTripCard row={item} primary={item.id === primaryId} />}
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
          ListEmptyComponent={<EmptyState title={t('serverWarehouse.emptyTitle')} description={t('serverWarehouse.emptyDescription')} />}
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
