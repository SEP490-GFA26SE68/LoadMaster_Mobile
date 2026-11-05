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
import { ShortageCard } from './detail/ShortageCard'
import { TripBanners } from './detail/TripBanners'
import { TripSummaryBand } from './detail/TripSummaryBand'
import { VehicleFactsCard } from './detail/VehicleFactsCard'
import { TRIP_LIST } from './trip-routes'
import { useRefreshTrip, useTripDetail, useTripsCapabilities } from './useTripsQueries'

/**
 * Chi tiết một chuyến của điều phối viên và quản lý công ty (như `TripDetailPage` của web, phần đọc), một cột cho điện thoại: banner theo
 * pha, hai thẻ chờ điều phối viên quyết (kiện kho báo thiếu, xác nhận tay — như web, đứng trước mọi thứ khác), tiến trình, sơ đồ tuyến,
 * tóm tắt hàng hoá, yêu cầu giao, phương tiện. Chỉ đọc, trừ hai thẻ chờ quyết. Chuyến đang vận chuyển và người xem có quyền giám sát thì
 * nút chính ở chân màn mở màn Giám sát chuyến; màn không có nút chính nào khác. Lỗi đọc lại khi đã có dữ liệu thì giữ dữ liệu, kèm một
 * dải lỗi ở đầu.
 */
export function TripDetailScreen({ tripId }: { readonly tripId: string }) {
  const t = useT()
  const can = useCan()
  const router = useRouter()
  const capabilities = useTripsCapabilities()
  const detail = useTripDetail(tripId)
  const refresh = useRefreshTrip(tripId)
  const data = detail.data
  const phase = data?.trip.phase
  const back = () => (router.canGoBack() ? router.back() : router.replace(TRIP_LIST))
  const monitor = data?.status === 'IN_TRANSIT' && can('monitoring.view')

  return (
    <Screen
      title={tripId}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={back} />}
      actions={<NotificationBell />}
      below={data ? <TripSummaryBand detail={data} /> : undefined}
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
          <TripBanners detail={data} />
          <ShortageCard tripId={tripId} enabled={capabilities.shortages && phase === 'loading'} />
          <ManualConfirmCard tripId={tripId} enabled={capabilities.manualConfirms && (phase === 'loading' || phase === 'delivering')} />
          <ProgressCard detail={data} />
          <RouteCard detail={data} />
          {/* Chuyến đang giao / đã giao: tóm tắt hàng nhường chỗ cho tiến độ giao ở sơ đồ tuyến (như web) */}
          {phase === 'delivering' || phase === 'completed' ? null : <CargoCard detail={data} />}
          <RequirementsCard trip={data.trip} enabled={capabilities.requirements} />
          <VehicleFactsCard detail={data} />
        </>
      ) : detail.isError ? (
        <ErrorState message={dataErrorMessage(detail.error, t)} onRetry={() => void detail.refetch()} />
      ) : (
        <LoadingState label={t('trips.detail.loading')} />
      )}
    </Screen>
  )
}
