import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip, MockResultTag } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { TRIP_EXCEPTION_TYPES, type TripExceptionType } from '@/lib/mock-db'
import { dataErrorMessage, useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { MonitoringDetail, RerouteProposal, TripExceptionRow } from './monitoring-model'
import {
  useConfirmReroute,
  useEscalateException,
  useMonitoringCapabilities,
  useMonitoringTripQuery,
  useProposeReroute,
  useResolveException,
} from './useMonitoringQueries'

export function MonitoringTripScreen({ tripId }: { tripId: string }) {
  const t = useT()
  const router = useRouter()
  const query = useMonitoringTripQuery(tripId)
  const toBoard = () => router.dismissTo('/monitoring')

  if (query.isSuccess) return <TripBody detail={query.data} />

  return (
    <Screen title={t('monitoring.trip.title', { tripId })} leading={<IconButton icon={ArrowLeft} tone="sky" label={t('monitoring.trip.toBoard')} onPress={toBoard} />}>
      {query.isPending ? <LoadingState /> : <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />}
    </Screen>
  )
}

function TripBody({ detail }: { detail: MonitoringDetail }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const can = useCan()
  const caps = useMonitoringCapabilities()
  const propose = useProposeReroute(detail.tripId)
  const confirm = useConfirmReroute(detail.tripId)
  const [proposal, setProposal] = useState<RerouteProposal | null>(null)
  const location =
    detail.location === null
      ? t('monitoring.board.noLocation')
      : t('monitoring.board.location', { lat: detail.location.lat.toFixed(4), lng: detail.location.lng.toFixed(4) })
  const handle = can('exceptions.resolve') && (caps.resolve || caps.escalate || caps.reroute)

  return (
    <Screen title={t('monitoring.trip.title', { tripId: detail.tripId })} leading={<IconButton icon={ArrowLeft} tone="sky" label={t('monitoring.trip.toBoard')} onPress={() => router.dismissTo('/monitoring')} />} scroll>
      {detail.isMockResult ? <MockResultTag /> : null}
      <Card>
        <AppText variant="label">{t('monitoring.trip.location')}</AppText>
        <AppText>{location}</AppText>
      </Card>
      {detail.stops.length === 0 ? null : (
        <Card>
          <AppText variant="label">{t('monitoring.trip.stops')}</AppText>
          {detail.stops.map((stop) => (
            <AppText key={stop.id} color={colors.text2}>
              {t('common.stop', { number: stop.number })}
              {stop.eta === undefined ? '' : ` · ${t('monitoring.trip.eta', { time: format.time(stop.eta) })}`}
              {stop.deadlineStatus === undefined ? '' : ` · ${stop.deadlineStatus}`}
            </AppText>
          ))}
        </Card>
      )}
      <Card>
        <AppText variant="label">{t('monitoring.trip.exceptions')}</AppText>
        {detail.exceptions.length === 0 ? <AppText color={colors.text2}>{t('monitoring.trip.noExceptions')}</AppText> : null}
        {detail.exceptions.map((row) => (
          <ExceptionRow key={row.id} tripId={detail.tripId} row={row} canHandle={handle} />
        ))}
      </Card>
      {handle && caps.reroute ? (
        <Button
          variant="secondary"
          loading={propose.isPending}
          onPress={() => void propose.mutateAsync().then((result) => setProposal(result))}>
          {t('monitoring.trip.reroute')}
        </Button>
      ) : null}
      {propose.error === null ? null : <Banner tone="danger">{dataErrorMessage(propose.error, t)}</Banner>}
      {proposal === null ? null : (
        <Card>
          <AppText variant="label">{t('monitoring.trip.options')}</AppText>
          {proposal.isMockResult ? <MockResultTag /> : null}
          {proposal.options.map((option) => (
            <View key={option.index} style={styles.option}>
              <AppText variant="heading">{option.route}</AppText>
              <AppText color={colors.text2}>{t('monitoring.trip.distance', { km: option.distanceKm, minutes: option.durationMinutes })}</AppText>
              <Button variant="secondary" loading={confirm.isPending} onPress={() => void confirm.mutateAsync(option.index).then(() => setProposal(null))}>
                {t('monitoring.trip.confirmRoute')}
              </Button>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  )
}

function ExceptionRow({ tripId, row, canHandle }: { tripId: string; row: TripExceptionRow; canHandle: boolean }) {
  const t = useT()
  const caps = useMonitoringCapabilities()
  const resolve = useResolveException(tripId)
  const escalate = useEscalateException(tripId)
  const open = row.status === 'OPEN'
  const typeLabel = exceptionTypeLabel(row.type, t)

  return (
    <View style={styles.exception}>
      <View style={styles.head}>
        <AppText variant="label">{typeLabel}</AppText>
        <Chip tone={open ? 'warning' : row.status === 'RESOLVED' ? 'success' : 'neutral'} label={row.status} />
      </View>
      <AppText color={colors.text2}>{row.description}</AppText>
      {canHandle && open && caps.resolve ? (
        <Button variant="secondary" loading={resolve.isPending} onPress={() => void resolve.mutateAsync({ exceptionId: row.id })}>
          {t('monitoring.trip.resolve')}
        </Button>
      ) : null}
      {canHandle && open && caps.escalate ? (
        <Button variant="secondary" loading={escalate.isPending} onPress={() => void escalate.mutateAsync(row.id)}>
          {t('monitoring.trip.escalate')}
        </Button>
      ) : null}
    </View>
  )
}

function exceptionTypeLabel(type: string, t: TFunction): string {
  return TRIP_EXCEPTION_TYPES.some((item) => item === type) ? t(`common.tripExceptionTypes.${type as TripExceptionType}`) : type
}

const styles = StyleSheet.create({
  exception: { gap: space[2], paddingTop: space[2], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  option: { gap: space[2] },
})
