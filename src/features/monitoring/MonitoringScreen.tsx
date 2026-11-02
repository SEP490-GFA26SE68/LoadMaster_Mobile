import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { FilterChips } from '@/components/FilterChips'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { EscalationList } from './EscalationList'
import { liveTripPath } from './live-routes'
import type { LiveMonitoring, MonitoringTrip } from './monitoring-api'
import { escalationRows, tripSummary } from './monitoring-view'
import { MonitoringTripList } from './MonitoringTripList'
import { useFleetMonitoringQuery, useMonitoringBoardQuery, useMonitoringCapabilities } from './useMonitoringQueries'
import { useBellSync, useBoardSync } from './useMonitoringSync'

type MonitoringTab = 'trips' | 'escalations'

/** Sự cố đã chuyển lên mà quản lý chưa nhập hạn mới — số trên tab của quản lý và dải báo của họ (như `EscalationCount` của web). */
const pendingEscalations = (fleet: readonly LiveMonitoring[]) =>
  fleet.flatMap((live) => live.exceptions).filter((exception) => exception.status === 'ESCALATED' && exception.renegotiation === undefined)

/**
 * Tab Giám sát của điều phối viên và quản lý công ty (như `MonitoringPage` của web, không bản đồ): một thẻ mỗi chuyến Đang vận chuyển,
 * bấm thẻ mở màn giám sát chuyến. Đọc lại theo nhịp điểm vị trí của kho (`refetchInterval`), kéo xuống để đọc lại ngay. Điều phối viên có
 * dải báo chuyến có điểm sát hạn hoặc trễ hạn dự kiến (bản web báo bằng toast); quản lý công ty có hai tab "Chuyến đang chạy" · "Sự cố cần
 * xử lý" và dải báo khi có sự cố vừa chuyển lên. Màn không có nút chính: các thẻ ngang hàng nhau.
 */
export function MonitoringScreen() {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  const router = useRouter()
  const caps = useMonitoringCapabilities()
  const board = useMonitoringBoardQuery()
  const fleet = useFleetMonitoringQuery()
  useBoardSync(board.data, fleet.data)
  useBellSync(fleet.data)
  const [tab, setTab] = useState<MonitoringTab>('trips')
  const [pulling, setPulling] = useState(false)
  // Sự cố mà quản lý đã ẩn dải báo; sự cố mới chuyển lên làm dải hiện lại
  const [dismissed, setDismissed] = useState<readonly string[]>([])
  const onOpen = useCallback((tripId: string) => router.push(liveTripPath(tripId)), [router])
  const canRenegotiate = caps.escalation && can('deadlines.renegotiate')
  const reload = () => Promise.all([board.refetch(), fleet.refetch()])

  if (board.data === undefined || fleet.data === undefined) {
    const failed = board.data === undefined && board.isError ? board.error : fleet.data === undefined && fleet.isError ? fleet.error : null
    return (
      <Screen title={t('monitoring.title')} actions={<NotificationBell />}>
        {failed === null ? <LoadingState label={t('monitoring.loading')} /> : <ErrorState message={dataErrorMessage(failed, t)} onRetry={() => void reload()} />}
      </Screen>
    )
  }

  const { trips, userNames, pendingPickups } = board.data
  const live = fleet.data
  const showTabs = canRenegotiate && trips.length > 0
  const shown: MonitoringTab = showTabs ? tab : 'trips'
  const pending = pendingEscalations(live)
  const refetchError = board.isError ? board.error : fleet.isError ? fleet.error : null
  // Kéo xuống: chỉ lần đọc người dùng xin mới có vòng quay — lần đọc theo nhịp (mỗi giây) không làm danh sách nháy
  const refresh = {
    refreshing: pulling,
    onRefresh: () => {
      setPulling(true)
      void reload().finally(() => setPulling(false))
    },
  }

  const common = (
    <>
      {showTabs ? (
        <FilterChips<MonitoringTab>
          label={t('monitoring.tabs.label')}
          chips={[
            { value: 'trips', label: t('monitoring.tabs.trips'), count: trips.length },
            { value: 'escalations', label: t('monitoring.tabs.escalations'), ...(pending.length > 0 ? { warnCount: pending.length } : { count: 0 }) },
          ]}
          selected={shown}
          onPress={setTab}
          formatCount={format.integer}
        />
      ) : null}
      {refetchError === null ? null : <Banner tone="danger">{t('liveTrip.refreshFailed', { message: dataErrorMessage(refetchError, t) })}</Banner>}
    </>
  )

  return (
    <Screen
      title={t('monitoring.title')}
      actions={<NotificationBell />}
      below={<AppText color={colors.skyText2}>{t('monitoring.count', { count: trips.length })}</AppText>}>
      {shown === 'escalations' ? (
        <EscalationList rows={escalationRows(board.data, live)} userNames={userNames} header={<View style={styles.header}>{common}</View>} refresh={refresh} />
      ) : (
        <MonitoringTripList
          trips={trips}
          fleet={live}
          pendingPickups={pendingPickups}
          header={
            <View style={styles.header}>
              {common}
              {can('exceptions.resolve') ? <EtaRiskBanner trips={trips} fleet={live} /> : null}
              {canRenegotiate && pending.some((exception) => !dismissed.includes(exception.id)) ? (
                <>
                  <Banner tone="warning" onDismiss={() => setDismissed(pending.map((exception) => exception.id))}>
                    {t('liveTrip.escalated', { count: pending.length })}
                  </Banner>
                  <Button variant="secondary" onPress={() => setTab('escalations')}>
                    {t('liveTrip.escalatedOpen')}
                  </Button>
                </>
              ) : null}
            </View>
          }
          refresh={refresh}
          onOpen={onOpen}
        />
      )}
    </Screen>
  )
}

/** Dải báo của điều phối viên: số chuyến lúc này có điểm sát hạn hoặc trễ hạn dự kiến — đỏ khi có chuyến trễ hạn dự kiến. */
function EtaRiskBanner({ trips, fleet }: { trips: readonly MonitoringTrip[]; fleet: readonly LiveMonitoring[] }) {
  const t = useT()
  const byId = new Map(fleet.map((live) => [live.tripId, live]))
  const atRisk = trips.map((trip) => tripSummary(trip, byId.get(trip.tripId))).filter((summary) => summary.lateRisk)
  if (atRisk.length === 0) return null
  return (
    <Banner tone={atRisk.some((summary) => summary.worst === 'MISSED') ? 'danger' : 'warning'}>{t('liveTrip.etaRisk', { count: atRisk.length })}</Banner>
  )
}

const styles = StyleSheet.create({
  header: { gap: space[3] },
})
