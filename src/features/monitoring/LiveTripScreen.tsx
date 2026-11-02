import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight, TriangleAlert } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { TripExceptionSheet } from '@/features/driver/TripExceptionSheet'
import { PickupRequestsCard } from '@/features/pickups/PickupRequestsCard'
import { tripDetailPath } from '@/features/trips/trip-routes'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { MONITORING_LIST } from './live-routes'
import { LiveExceptionsCard, type LiveNotice } from './LiveExceptionsCard'
import { LiveLocationCard } from './LiveLocationCard'
import { LiveStopList } from './LiveStopList'
import { useLiveTripQuery, useMonitoringCapabilities, useReportExceptionMutation } from './useMonitoringQueries'
import { useBellSync } from './useMonitoringSync'
import { useSheetTurn } from './useSheetTurn'

/**
 * Giám sát một chuyến của điều phối viên và quản lý công ty (như `MonitoringTripPanel` của web, chưa có bản đồ): vị trí xe bằng chữ, giờ
 * đến từng điểm so với hạn, sự cố của chuyến, yêu cầu nhận hàng dọc đường, và lối sang Chi tiết chuyến. Đọc lại theo nhịp điểm vị trí của
 * kho (`refetchInterval`), kéo xuống để đọc lại ngay; chuyến thôi chạy thì màn nói vậy và thôi đọc theo nhịp. Nút chính duy nhất là "Báo
 * sự cố" ở chân màn, của người có `exceptions.report` (điều phối viên); quản lý công ty chỉ xem, trừ việc nhập hạn mới.
 */
export function LiveTripScreen({ tripId }: { readonly tripId: string }) {
  const t = useT()
  const router = useRouter()
  const can = useCan()
  const caps = useMonitoringCapabilities()
  const query = useLiveTripQuery(tripId)
  const data = query.data
  useBellSync(data === undefined ? undefined : [data.live])
  const report = useReportExceptionMutation(tripId)
  const reporting = useSheetTurn<true>()
  const [notice, setNotice] = useState<LiveNotice | null>(null)
  const [pulling, setPulling] = useState(false)
  const back = (
    <IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.dismissTo(MONITORING_LIST))} />
  )

  if (data === undefined) {
    return (
      <Screen title={tripId} leading={back} actions={<NotificationBell />}>
        {query.isError ? (
          <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState label={t('monitoring.loading')} />
        )}
      </Screen>
    )
  }

  const { trip, running, userNames, live } = data
  const canReport = running && caps.exceptions && can('exceptions.report')
  const facts = [trip.vehicleName, trip.driverName === null ? t('monitoring.list.noDriver') : t('monitoring.list.driver', { name: trip.driverName })]

  return (
    <Screen
      title={tripId}
      leading={back}
      actions={<NotificationBell />}
      below={
        <View style={styles.below}>
          {trip.name === '' ? null : <AppText color={colors.skyText}>{trip.name}</AppText>}
          <AppText color={colors.skyText2}>{facts.join(' · ')}</AppText>
        </View>
      }
      scroll
      refresh={{
        refreshing: pulling,
        onRefresh: () => {
          setPulling(true)
          void query.refetch().finally(() => setPulling(false))
        },
      }}
      footer={
        canReport ? (
          <Button
            icon={TriangleAlert}
            onPress={() => {
              setNotice(null)
              reporting.show(true)
            }}>
            {t('monitoring.exceptions.report')}
          </Button>
        ) : undefined
      }>
      {query.isError ? <Banner tone="danger">{t('liveTrip.refreshFailed', { message: dataErrorMessage(query.error, t) })}</Banner> : null}
      {running ? null : <Banner tone="info">{t('liveTrip.notRunning', { id: tripId })}</Banner>}
      <LiveLocationCard tripId={tripId} live={live} running={running} />
      <Button variant="secondary" trailingIcon={ChevronRight} onPress={() => router.push(tripDetailPath(tripId))}>
        {t('liveTrip.openDetail')}
      </Button>
      <LiveStopList trip={trip} live={live} />
      <LiveExceptionsCard trip={trip} live={live} userNames={userNames} running={running} notice={notice} onNotice={setNotice} />
      {caps.pickups ? <PickupRequestsCard tripId={tripId} running={running} stops={trip.stops.map(({ id, name }) => ({ id, name }))} /> : null}
      {canReport ? (
        <TripExceptionSheet
          key={`report-${reporting.key}`}
          open={reporting.open}
          onClose={reporting.hide}
          tripCode={tripId}
          report={report}
          onReported={(id) => {
            reporting.hide()
            setNotice({ tone: 'success', message: t('monitoring.exceptions.done.reported', { id }) })
          }}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  below: { gap: space[1] },
})
