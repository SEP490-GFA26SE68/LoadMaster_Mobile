import { useRouter } from 'expo-router'
import { QrCode } from 'lucide-react-native'
import { FlatList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { TripStatusChip } from '@/components/TripStatus'
import { useCan } from '@/features/auth/AuthProvider'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { WarehouseTask } from './warehouse-model'
import { useStartLoading, useWarehouseTasksQuery } from './useWarehouseQueries'

export function warehousePath(tripId: string) {
  return { pathname: '/warehouse/[tripId]', params: { tripId } } as const
}

export function WarehouseTasksScreen() {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  const router = useRouter()
  const query = useWarehouseTasksQuery()

  return (
    <Screen
      title={t('warehouse.tasks.title')}
      actions={
        can('packages.lookup') ? (
          <IconButton icon={QrCode} tone="sky" label={t('warehouse.tasks.scan')} onPress={() => router.push('/scan')} />
        ) : undefined
      }>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={[...query.data]}
          keyExtractor={(task) => task.id}
          renderItem={({ item }) => <TaskCard task={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={<EmptyState title={t('warehouse.tasks.empty.title')} description={t('warehouse.tasks.empty.description')} />}
          ListHeaderComponent={query.data.length > 0 ? <AppText color={colors.text2}>{format.date(new Date())}</AppText> : null}
        />
      )}
    </Screen>
  )
}

function TaskCard({ task }: { task: WarehouseTask }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const start = useStartLoading()
  const action = task.inProgress ? t('warehouse.tasks.resume') : t('warehouse.tasks.start')
  const facts = [
    ...(task.departureAt === undefined ? [] : [format.date(task.departureAt)]),
    t('warehouse.tasks.packages', { count: task.packageCount }),
  ]

  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="label" style={styles.code}>
          {task.code}
        </AppText>
        <TripStatusChip status={task.status} />
      </View>
      {task.vehicleInfo === '' ? null : <AppText color={colors.text3}>{task.vehicleInfo}</AppText>}
      <AppText color={colors.text2}>{facts.join(' · ')}</AppText>
      <Button
        variant="primary"
        loading={start.isPending}
        accessibilityLabel={t('warehouse.tasks.openLabel', { action, tripId: task.code })}
        onPress={() => {
          if (task.inProgress) {
            router.push(warehousePath(task.id))
            return
          }
          void start.mutateAsync(task.id).then(() => router.push(warehousePath(task.id)))
        }}>
        {action}
      </Button>
    </Card>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8], gap: space[3] },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  separator: { height: space[3] },
})
