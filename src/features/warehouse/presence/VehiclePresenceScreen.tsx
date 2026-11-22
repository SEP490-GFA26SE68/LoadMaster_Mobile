import { useRouter } from 'expo-router'
import { ArrowLeft, Search } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { FilterChips } from '@/components/FilterChips'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { WAREHOUSE_LIST } from '../session-routes'
import type { PresenceVehicle, PresenceWarehouse } from './presence-model'
import { CheckInSheet, PresenceEventsSheet } from './PresenceSheets'
import { PresenceVehicleCard } from './PresenceVehicleCard'
import { usePresenceVehicles, usePresenceWarehouses } from './usePresenceQueries'

type Filter = 'all' | 'here'

/** Danh mục đọc tối đa 5 trang × 100 xe; chạm trần thì màn nói để người dùng tìm theo biển số. */
const LIST_CAP = 500
const SEARCH_DELAY_MS = 300

/** Chữ tìm gửi đi sau khi ngừng gõ 300 ms; dưới 2 ký tự (máy chủ từ chối) thì coi như không tìm. */
function useSearchQuery(text: string): string {
  const [query, setQuery] = useState('')
  useEffect(() => {
    const trimmed = text.trim()
    const next = trimmed.length >= 2 ? trimmed : ''
    const timer = setTimeout(() => setQuery(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text])
  return query
}

/**
 * "Xe ở kho" của nhân viên kho (nguồn máy chủ, `/api/warehouse/vehicle-presence`): chọn kho mình được phân công (một kho thì không có ô
 * chọn), lọc mọi xe / xe đang ở kho này, tìm theo biển số; mỗi xe một thẻ kèm "Ghi nhận có ở kho" và "Lịch sử". Màn không có nút chính —
 * nút chính nằm trong tờ ghi nhận. Ghi xong: dải kết quả ở đầu danh sách (trình đọc màn hình đọc ngay). Kéo xuống để đọc lại.
 */
export function VehiclePresenceScreen() {
  const t = useT()
  const router = useRouter()
  const warehouses = usePresenceWarehouses()
  const list = warehouses.data
  const [chosen, setChosen] = useState<string | null>(null)
  const warehouse = list?.find((row) => row.id === chosen) ?? list?.[0]

  const back = <IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace(WAREHOUSE_LIST))} />
  const below = warehouse === undefined || (list?.length ?? 0) > 1 ? undefined : <AppText color={colors.skyText2}>{warehouse.name}</AppText>

  return (
    <Screen title={t('vehiclePresence.title')} leading={back} below={below}>
      {list === undefined ? (
        warehouses.isError ? (
          <ErrorState message={dataErrorMessage(warehouses.error, t)} onRetry={() => void warehouses.refetch()} />
        ) : (
          <LoadingState label={t('vehiclePresence.loadingWarehouses')} />
        )
      ) : warehouse === undefined ? (
        <EmptyState title={t('vehiclePresence.noWarehouseTitle')} description={t('vehiclePresence.noWarehouseDescription')} />
      ) : (
        <VehicleList key={warehouse.id} warehouses={list} warehouse={warehouse} onChoose={setChosen} />
      )}
    </Screen>
  )
}

type VehicleListProps = {
  readonly warehouses: readonly PresenceWarehouse[]
  readonly warehouse: PresenceWarehouse
  readonly onChoose: (warehouseId: string) => void
}

/** Danh sách xe của một kho; đổi kho là dựng lại từ đầu (bộ lọc, chữ tìm, tờ đang mở thuộc về kho cũ). */
function VehicleList({ warehouses, warehouse, onChoose }: VehicleListProps) {
  const t = useT()
  const format = useFormat()
  const [filter, setFilter] = useState<Filter>('all')
  const [text, setText] = useState('')
  const query = useSearchQuery(text)
  const vehicles = usePresenceVehicles(warehouse.id, query, filter === 'here')
  const rows = vehicles.data
  const [checking, setChecking] = useState<PresenceVehicle | null>(null)
  const [history, setHistory] = useState<PresenceVehicle | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleCheckIn = useCallback((vehicle: PresenceVehicle) => {
    setNotice(null)
    setChecking(vehicle)
  }, [])
  const handleDone = (vehicle: PresenceVehicle) => {
    setChecking(null)
    setNotice(t('vehiclePresence.checkedIn', { plate: vehicle.licensePlate, warehouse: warehouse.name }))
  }

  const header = (
    <View style={styles.header}>
      {warehouses.length > 1 ? (
        <ChoiceGroup
          label={t('vehiclePresence.warehouse')}
          choices={warehouses.map((row) => ({ value: row.id, label: row.name }))}
          value={warehouse.id}
          onChange={onChoose}
        />
      ) : null}
      <FilterChips<Filter>
        label={t('vehiclePresence.filter.label')}
        chips={[
          { value: 'all', label: t('vehiclePresence.filter.all') },
          { value: 'here', label: t('vehiclePresence.filter.here') },
        ]}
        selected={filter}
        onPress={setFilter}
        formatCount={format.integer}
      />
      <TextField label={t('vehiclePresence.search')} hint={t('vehiclePresence.searchHint')} icon={Search} value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} />
      {notice === null ? null : (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}
      {rows !== undefined && vehicles.isError ? <Banner tone="danger">{dataErrorMessage(vehicles.error, t)}</Banner> : null}
      {rows !== undefined && rows.length >= LIST_CAP ? <Banner tone="info">{t('vehiclePresence.limited', { shown: format.integer(rows.length) })}</Banner> : null}
    </View>
  )

  const empty =
    rows === undefined ? (
      vehicles.isError ? (
        <ErrorState message={dataErrorMessage(vehicles.error, t)} onRetry={() => void vehicles.refetch()} />
      ) : (
        <LoadingState label={t('vehiclePresence.loading')} />
      )
    ) : (
      <EmptyState
        title={t('vehiclePresence.emptyTitle')}
        description={
          query !== '' ? t('vehiclePresence.emptySearch', { query }) : filter === 'here' ? t('vehiclePresence.emptyHere') : t('vehiclePresence.emptyAll')
        }
      />
    )

  return (
    <>
      <FlatList
        data={rows ?? []}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <PresenceVehicleCard vehicle={item} warehouseId={warehouse.id} onCheckIn={handleCheckIn} onHistory={setHistory} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={vehicles.isRefetching} onRefresh={() => void vehicles.refetch()} tintColor={colors.primary} />}
      />
      <CheckInSheet warehouse={warehouse} vehicle={checking} onClose={() => setChecking(null)} onDone={handleDone} />
      <PresenceEventsSheet warehouse={warehouse} vehicle={history} onClose={() => setHistory(null)} />
    </>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[4], marginBottom: space[4] },
  separator: { height: space[3] },
})
