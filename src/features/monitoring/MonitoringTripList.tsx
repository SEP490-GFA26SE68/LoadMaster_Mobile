import type { ReactNode } from 'react'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { FilterChips } from '@/components/FilterChips'
import { EmptyState } from '@/components/StateView'
import { useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { LiveMonitoring, MonitoringTrip } from './monitoring-api'
import { matchesFilter, tripSummary, type MonitoringFilter } from './monitoring-view'
import { MonitoringTripCard } from './MonitoringTripCard'

type FilterName = keyof MonitoringFilter
const FILTERS: readonly FilterName[] = ['late', 'incidents']

type MonitoringTripListProps = {
  trips: readonly MonitoringTrip[]
  fleet: readonly LiveMonitoring[]
  pendingPickups: Readonly<Record<string, number>>
  /** Phần đầu danh sách của màn: tab của quản lý, dải cảnh báo. */
  header: ReactNode
  refresh: { readonly refreshing: boolean; readonly onRefresh: () => void }
  onOpen: (tripId: string) => void
}

/**
 * Tab "Chuyến đang chạy" (như `MonitoringBoard` + `MonitoringTripList` của web, không bản đồ): hai công tắc lọc "Có nguy cơ trễ" và "Có sự
 * cố" kèm số chuyến của từng loại, rồi một thẻ mỗi chuyến qua bộ lọc. Bộ lọc là state của màn (bản web giữ trên URL); không chuyến nào
 * khớp thì nói vậy kèm nút "Bỏ lọc". Không chuyến nào đang chạy thì chỉ còn câu rỗng như web, vẫn kéo xuống để đọc lại được.
 */
export function MonitoringTripList({ trips, fleet, pendingPickups, header, refresh, onOpen }: MonitoringTripListProps) {
  const t = useT()
  const format = useFormat()
  const [active, setActive] = useState<readonly FilterName[]>([])
  const byId = new Map(fleet.map((live) => [live.tripId, live]))
  const summaries = trips.map((trip) => ({ trip, summary: tripSummary(trip, byId.get(trip.tripId)) }))
  const filter: MonitoringFilter = { late: active.includes('late'), incidents: active.includes('incidents') }
  const visible = summaries.filter(({ summary }) => matchesFilter(summary, filter)).map(({ trip }) => trip)
  const counts: Readonly<Record<FilterName, number>> = {
    late: summaries.filter(({ summary }) => summary.lateRisk).length,
    incidents: summaries.filter(({ summary }) => summary.activeExceptions > 0).length,
  }
  const toggle = (name: FilterName) => setActive((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))

  return (
    <FlatList
      data={visible}
      keyExtractor={(trip) => trip.tripId}
      renderItem={({ item }) => (
        <MonitoringTripCard trip={item} live={byId.get(item.tripId)} pendingPickups={pendingPickups[item.tripId] ?? 0} onOpen={onOpen} />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {trips.length === 0 ? null : (
            <FilterChips
              label={t('monitoring.list.filters.label')}
              chips={FILTERS.map((name) => ({ value: name, label: t(`monitoring.list.filters.${name}`), count: counts[name] }))}
              selected={active}
              onPress={toggle}
              formatCount={format.integer}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        trips.length === 0 ? (
          <EmptyState title={t('monitoring.empty.title')} description={t('monitoring.empty.description')} />
        ) : (
          <View style={styles.noMatch}>
            <AppText color={colors.text2}>{t('monitoring.list.noMatch')}</AppText>
            <Button variant="secondary" onPress={() => setActive([])}>
              {t('monitoring.list.clear')}
            </Button>
          </View>
        )
      }
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.primary} />}
    />
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[3], marginBottom: space[3] },
  noMatch: { alignItems: 'flex-start', gap: space[3] },
  separator: { height: space[3] },
})
