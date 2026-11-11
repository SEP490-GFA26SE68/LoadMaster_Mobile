import { useRouter } from 'expo-router'
import { ArrowLeft, Navigation } from 'lucide-react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { liveTripPath } from '@/features/monitoring/live-routes'
import { dataErrorMessage, useT } from '@/lib/i18n'

import { CargoCard } from './detail/CargoCard'
import { ManualConfirmCard } from './detail/ManualConfirmCard'
import { ProgressCard } from './detail/ProgressCard'
import { RequirementsCard } from './detail/RequirementsCard'
import { RouteCard } from './detail/RouteCard'
import { ServerRouteCard } from './detail/ServerRouteCard'
import { ServerSummaryBand } from './detail/ServerSummaryBand'
import { ShortageCard } from './detail/ShortageCard'
import { TripBanners } from './detail/TripBanners'
import { TripSummaryBand } from './detail/TripSummaryBand'
import { VehicleFactsCard } from './detail/VehicleFactsCard'
import { TRIP_LIST } from './trip-routes'
import { detailPhase, type FullTripDetail, type ServerTripDetail } from './trips-model'
import { useRefreshTrip, useTripDetail, useTripsCapabilities } from './useTripsQueries'

/**
 * Chi tiết một chuyến của điều phối viên và quản lý công ty (như `TripDetailPage` của web, phần đọc), một cột cho điện thoại: banner theo
 * pha, hai thẻ chờ điều phối viên quyết (kiện kho báo thiếu, xác nhận tay — như web, đứng trước mọi thứ khác), tiến trình, sơ đồ tuyến,
 * tóm tắt hàng hoá, yêu cầu giao, phương tiện. Chỉ đọc, trừ hai thẻ chờ quyết. Chuyến đang vận chuyển và người xem có quyền giám sát thì
 * nút chính ở chân màn mở màn Giám sát chuyến; màn không có nút chính nào khác. Lỗi đọc lại khi đã có dữ liệu thì giữ dữ liệu, kèm một
 * dải lỗi ở đầu. Chuyến đọc từ máy chủ chỉ có đầu chuyến và các điểm (`ServerTripDetail`): màn vẽ phần đó cùng hai thẻ chờ quyết, không
 * vẽ thẻ nào của kho mẫu thiếu số.
 */
export function TripDetailScreen({ tripId }: { readonly tripId: string }) {
  const t = useT()
  const can = useCan()
  const router = useRouter()
  const capabilities = useTripsCapabilities()
  const detail = useTripDetail(tripId)
  const refresh = useRefreshTrip(tripId)
  const data = detail.data
  const phase = data === undefined ? undefined : detailPhase(data)
  const back = () => (router.canGoBack() ? router.back() : router.replace(TRIP_LIST))
  const monitor = data?.status === 'IN_TRANSIT' && can('monitoring.view')

  return (
    <Screen
      title={tripId}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={back} />}
      actions={<NotificationBell />}
      below={data === undefined ? undefined : data.kind === 'full' ? <TripSummaryBand detail={data} /> : <ServerSummaryBand detail={data} />}
      scroll={data !== undefined}
      refresh={refresh}
      footer={
        monitor ? (
          <Button icon={Navigation} onPress={() => router.push(liveTripPath(tripId))}>
            {t('companyTrips.detail.monitor')}
          </Button>
        ) : undefined
      }>
      {data ? (
        <>
          {detail.isError ? <Banner tone="danger">{dataErrorMessage(detail.error, t)}</Banner> : null}
          {data.kind === 'full' ? <TripBanners detail={data} /> : <ServerBanners detail={data} />}
          <ShortageCard tripId={tripId} enabled={capabilities.shortages && phase === 'loading'} />
          <ManualConfirmCard tripId={tripId} enabled={capabilities.manualConfirms && (phase === 'loading' || phase === 'delivering')} />
          {data.kind === 'full' ? <FullCards detail={data} requirements={capabilities.requirements} /> : <ServerRouteCard detail={data} />}
        </>
      ) : detail.isError ? (
        <ErrorState message={dataErrorMessage(detail.error, t)} onRetry={() => void detail.refetch()} />
      ) : (
        <LoadingState label={t('trips.detail.loading')} />
      )}
    </Screen>
  )
}

/** Các thẻ chỉ kho mẫu có số: tiến trình, sơ đồ tuyến, tóm tắt hàng, yêu cầu giao, phương tiện. */
function FullCards({ detail, requirements }: { detail: FullTripDetail; requirements: boolean }) {
  const { phase } = detail.trip
  return (
    <>
      <ProgressCard detail={detail} />
      <RouteCard detail={detail} />
      {/* Chuyến đang giao / đã giao: tóm tắt hàng nhường chỗ cho tiến độ giao ở sơ đồ tuyến (như web) */}
      {phase === 'delivering' || phase === 'completed' ? null : <CargoCard detail={detail} />}
      <RequirementsCard trip={detail.trip} enabled={requirements} />
      <VehicleFactsCard detail={detail} />
    </>
  )
}

/** Chuyến của máy chủ: một dòng nói màn chỉ có phần máy chủ trả, và lý do huỷ khi chuyến đã huỷ. */
function ServerBanners({ detail }: { detail: ServerTripDetail }) {
  const t = useT()
  return (
    <>
      {detail.cancelReason === undefined ? null : <Banner tone="danger">{t('officeServer.trips.cancelled', { reason: detail.cancelReason })}</Banner>}
      <Banner tone="info">{t('trips.backend.note')}</Banner>
    </>
  )
}
