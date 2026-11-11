import { useMemo, useState } from 'react'
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { FilterChips, type FilterChip } from '@/components/FilterChips'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { useCan } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { TripCard } from './list/TripCard'
import { TripSectionHeader } from './list/TripSectionHeader'
import { tripDateSections, tripListView, type TripDateSection } from './list/trip-sections'
import { todayInVietnam } from './trip-dates'
import { needsAction, TRIP_LIST_TABS, tripTabCounts, type TripListTab, type TripRow } from './trip-list'
import { useTripRows, useTripsCapabilities } from './useTripsQueries'

/**
 * Tab Chuyến hàng của điều phối viên và quản lý công ty (như `TripListPage` của web), chỉ để xem: dưới tiêu đề là dòng số đếm trên cả
 * kho — tổng chuyến · đang vận chuyển, và "cần bạn xử lý" (phương án chờ duyệt hoặc lỗi thời) chỉ với người duyệt được phương án; quản lý
 * công ty chỉ thấy các số thường. Đầu danh sách là ô tìm (bỏ dấu, như web) và hàng tab trạng thái (Tất cả + sáu trạng thái, số theo ô
 * tìm; tab Đã lập kế hoạch có số hổ phách "cần bạn xử lý" cho người duyệt). Chuyến nhóm theo ngày chạy, mới nhất trước; bấm một chuyến mở
 * chi tiết. Không lọc theo ngày, xe, tài xế và không tạo / sửa chuyến — việc của bản web. Kéo xuống để đọc lại; đã có danh sách mà lần
 * đọc lại lỗi thì giữ danh sách, nói lỗi ở đầu danh sách. Chưa có chuyến nào khác với không chuyến nào khớp bộ lọc (kèm nút Xoá lọc).
 */
export function TripListScreen() {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  // "Cần bạn xử lý" là việc của người duyệt phương án (điều phối viên); quản lý công ty chỉ đọc. Nguồn không trả phương án của chuyến
  // (máy chủ) thì không có số đó: không vẽ 0 như thể đã đếm được
  const { planStatus } = useTripsCapabilities()
  const canAct = can('plans.approve') && planStatus
  const query = useTripRows()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TripListTab>('all')
  const trips = query.data
  const view = useMemo(() => (trips === undefined ? null : tripListView(trips, search, tab)), [trips, search, tab])
  const sections = useMemo(() => (view === null ? [] : tripDateSections(view.rows)), [view])
  const hasTrips = trips !== undefined && trips.length > 0
  const today = todayInVietnam()

  // Vòng quay chỉ cho lần kéo của người dùng: lần làm mới ngầm sau một lệnh ghi ở màn khác không làm nó hiện lên
  const [refreshing, setRefreshing] = useState(false)
  function handleRefresh() {
    setRefreshing(true)
    void query.refetch().finally(() => setRefreshing(false))
  }

  function clearFilters() {
    setSearch('')
    setTab('all')
  }

  const chips: FilterChip<TripListTab>[] =
    view === null
      ? []
      : TRIP_LIST_TABS.map(({ key }) => ({
          value: key,
          label: key === 'all' ? t('trips.list.tabs.all') : t(`status.${key}`),
          count: view.tabCounts[key],
          ...(key === 'PLANNED' && canAct && view.needAction > 0
            ? { warnCount: view.needAction, warnLabel: t('trips.list.tabs.needAction', { count: view.needAction }) }
            : {}),
        }))

  return (
    <Screen
      title={t('companyTrips.title')}
      actions={<NotificationBell />}
      below={hasTrips ? <TripStats trips={trips} canAct={canAct} /> : undefined}>
      {trips === undefined ? (
        query.isError ? (
          <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState label={t('companyTrips.list.loading')} />
        )
      ) : (
        <SectionList<TripRow, TripDateSection>
          sections={sections}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => <TripCard row={item} />}
          renderSectionHeader={({ section }) => <TripSectionHeader date={section.date} count={section.count} today={today} />}
          ListHeaderComponent={
            <View style={styles.header}>
              {query.isError ? <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner> : null}
              {hasTrips ? (
                <>
                  <TextField
                    label={t('companyTrips.list.search')}
                    placeholder={t('trips.list.search')}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                  <FilterChips label={t('trips.list.tabs.label')} chips={chips} selected={tab} onPress={setTab} formatCount={format.integer} />
                </>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            hasTrips ? (
              <View style={styles.empty}>
                <EmptyState title={t('companyTrips.list.noMatchTitle')} description={t('companyTrips.list.noMatchDescription')} />
                <Button variant="secondary" onPress={clearFilters}>
                  {t('companyTrips.list.clearFilters')}
                </Button>
              </View>
            ) : (
              <EmptyState title={t('trips.list.emptyTitle')} description={t('companyTrips.list.emptyDescription')} />
            )
          }
        />
      )}
    </Screen>
  )
}

/**
 * Dòng số dưới tiêu đề, đếm trên cả kho (không theo ô tìm hay tab): tổng chuyến · đang vận chuyển · cần bạn xử lý. `canAct` vắng thì
 * không có phần "cần bạn xử lý" — việc đó không chờ người chỉ đọc.
 */
function TripStats({ trips, canAct }: { trips: readonly TripRow[]; canAct: boolean }) {
  const t = useT()
  const format = useFormat()
  const counts = tripTabCounts(trips)
  const review = trips.filter(needsAction).length
  const parts = [
    `${format.integer(counts.all)} ${t('trips.list.stats.total', { count: counts.all })}`,
    `${format.integer(counts.IN_TRANSIT)} ${t('trips.list.stats.transit')}`,
    ...(canAct ? [`${format.integer(review)} ${t('trips.list.stats.review')}`] : []),
  ]
  return <AppText color={colors.skyText2}>{parts.join(' · ')}</AppText>
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[3] },
  empty: { flex: 1, gap: space[4], paddingBottom: space[4] },
  separator: { height: space[3] },
})
