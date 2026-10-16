import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'

import type { DriverTripScreen } from './driver-model'
import { StopView } from './StopView'
import { TripSummaryView } from './TripSummaryView'
import { useTripScreenQuery } from './useDriverQueries'

/**
 * Màn một chuyến của tài xế (như `DriverStopPage` của web): đọc chuyến từ nguồn dữ liệu rồi chọn màn — điểm đang giao (`StopView`), tổng
 * kết khi đã giao xong, hoặc một thông báo khi chuyến không giao được (đã huỷ, chưa có phương án đã duyệt, quay về lập kế hoạch, không có
 * điểm giao). Mọi màn đều có lối về danh sách chuyến.
 */
export function TripScreen({ tripId }: { tripId: string }) {
  const t = useT()
  const router = useRouter()
  const query = useTripScreenQuery(tripId)
  const toTrips = () => router.dismissTo('/trips')

  if (query.isSuccess) return <TripContent data={query.data} />

  return (
    <Screen
      title={query.isError ? t('driver.loadErrorTitle') : t('driver.loading')}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('driver.toTrips')} onPress={toTrips} />}>
      {query.isError ? <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} /> : <LoadingState />}
    </Screen>
  )
}

function TripContent({ data }: { data: DriverTripScreen }) {
  const t = useT()
  const code = data.trip.code
  switch (data.kind) {
    case 'stop':
      return <StopView trip={data.trip} screen={data.screen} />
    case 'completed':
      return <TripSummaryView trip={data.trip} summary={data.summary} />
    case 'cancelled':
      return <TripNotice title={t('driver.cancelledTitle')} tone="danger" description={t('driver.cancelledDescription', { tripId: code, reason: data.reason })} />
    case 'noPlan':
      return <TripNotice title={t('driver.emptyTitle')} tone="info" description={t('driver.emptyTripDescription', { tripId: code })} />
    case 'planning':
      return data.replan === undefined ? (
        <TripNotice title={t('driver.planningTitle')} tone="info" description={t('driver.planningDescription', { tripId: code })} />
      ) : (
        <TripNotice title={t('driver.replan.title')} tone="warning" description={t(`driver.replan.${data.replan}`, { tripId: code })} />
      )
    case 'noStops':
      return <TripNotice title={code} tone="info" description={t('driver.noItems')} />
  }
}

/** Chuyến không giao được: tiêu đề, một câu lý do, và nút chính về danh sách chuyến (lối thoát luôn nhìn thấy). */
function TripNotice({ title, tone, description }: { title: string; tone: 'info' | 'warning' | 'danger'; description: string }) {
  const t = useT()
  const router = useRouter()
  const toTrips = () => router.dismissTo('/trips')
  return (
    <Screen
      title={title}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('driver.toTrips')} onPress={toTrips} />}
      scroll
      footer={<Button onPress={toTrips}>{t('driver.toTrips')}</Button>}>
      <Banner tone={tone}>{description}</Banner>
    </Screen>
  )
}
