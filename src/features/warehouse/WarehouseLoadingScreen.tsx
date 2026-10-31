import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { isApiError } from '@/data/http'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { LoadingSession } from './warehouse-model'
import { useCompleteLoading, useConfirmPlacement, useLoadingQuery, useRecordDeviation, useStartLoading, useWarehouseCapabilities } from './useWarehouseQueries'

export function WarehouseLoadingScreen({ tripId }: { tripId: string }) {
  const t = useT()
  const router = useRouter()
  const query = useLoadingQuery(tripId)
  const start = useStartLoading()
  const toTasks = () => router.dismissTo('/warehouse')

  if (query.isSuccess) return <LoadingBody session={query.data} />

  const missing = query.isError && isApiError(query.error) && query.error.code === 'LOADING_NOT_STARTED'
  return (
    <Screen title={t('warehouse.loading.title', { tripId })} leading={<IconButton icon={ArrowLeft} tone="sky" label={t('warehouse.loading.toTasks')} onPress={toTasks} />}>
      {query.isPending ? (
        <LoadingState />
      ) : missing ? (
        <View style={styles.pad}>
          <Button loading={start.isPending} onPress={() => void start.mutateAsync(tripId)}>
            {t('warehouse.tasks.start')}
          </Button>
        </View>
      ) : (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      )}
    </Screen>
  )
}

function LoadingBody({ session }: { session: LoadingSession }) {
  const t = useT()
  const router = useRouter()
  const caps = useWarehouseCapabilities()
  const confirm = useConfirmPlacement(session.tripId)
  const deviate = useRecordDeviation(session.tripId)
  const finish = useCompleteLoading(session.tripId)
  const [deviating, setDeviating] = useState(false)
  const current = session.placements.find((item) => item.id === session.nextId) ?? session.placements.find((item) => !item.confirmed)
  const done = current === undefined
  const mutationError = confirm.error ?? deviate.error ?? finish.error

  return (
    <Screen
      title={t('warehouse.loading.title', { tripId: session.tripCode })}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('warehouse.loading.toTasks')} onPress={() => router.dismissTo('/warehouse')} />}
      scroll
      footer={
        done ? (
          <Button loading={finish.isPending} onPress={() => void finish.mutateAsync().then(() => router.dismissTo('/warehouse'))}>
            {t('warehouse.loading.complete')}
          </Button>
        ) : (
          <Button loading={confirm.isPending} onPress={() => void confirm.mutateAsync(current.id)}>
            {t('warehouse.loading.confirm')}
          </Button>
        )
      }>
      {session.vehicleInfo === '' ? null : <AppText color={colors.text2}>{session.vehicleInfo}</AppText>}
      {mutationError === null ? null : <Banner tone="danger">{dataErrorMessage(mutationError, t)}</Banner>}
      {done ? (
        <Banner tone="success">{t('warehouse.loading.completed', { tripId: session.tripCode })}</Banner>
      ) : (
        <Card>
          <AppText variant="label">{t('warehouse.loading.next')}</AppText>
          <AppText variant="heading">{current.packageName}</AppText>
          {current.barcode === undefined ? null : <AppText color={colors.text2}>{current.barcode}</AppText>}
          {current.posX === undefined ? null : (
            <AppText color={colors.text3}>{t('warehouse.loading.position', { x: current.posX, y: current.posY ?? 0, z: current.posZ ?? 0 })}</AppText>
          )}
          {caps.deviation ? (
            <Button variant="secondary" onPress={() => setDeviating((open) => !open)}>
              {t('warehouse.loading.deviate')}
            </Button>
          ) : null}
          {deviating && caps.deviation ? <DeviationForm placementId={current.id} tripId={session.tripId} onDone={() => setDeviating(false)} /> : null}
        </Card>
      )}
    </Screen>
  )
}

function DeviationForm({ tripId, placementId, onDone }: { tripId: string; placementId: string; onDone: () => void }) {
  const t = useT()
  const deviate = useRecordDeviation(tripId)
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [z, setZ] = useState('')
  const [reason, setReason] = useState('')

  return (
    <View style={styles.form}>
      <AppText variant="label">{t('warehouse.loading.deviation.title')}</AppText>
      <TextField label={t('warehouse.loading.deviation.x')} keyboardType="number-pad" value={x} onChangeText={setX} />
      <TextField label={t('warehouse.loading.deviation.y')} keyboardType="number-pad" value={y} onChangeText={setY} />
      <TextField label={t('warehouse.loading.deviation.z')} keyboardType="number-pad" value={z} onChangeText={setZ} />
      <TextField label={t('warehouse.loading.deviation.reason')} value={reason} onChangeText={setReason} />
      <Button
        variant="secondary"
        loading={deviate.isPending}
        disabled={reason.trim() === ''}
        onPress={() =>
          void deviate
            .mutateAsync({
              placementId,
              input: { actualPosX: Number(x), actualPosY: Number(y), actualPosZ: Number(z), reason: reason.trim() },
            })
            .then(onDone)
        }>
        {t('warehouse.loading.deviation.submit')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space[4] },
  form: { gap: space[3] },
})
