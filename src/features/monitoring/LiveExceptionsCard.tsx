import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner, type BannerTone } from '@/components/Banner'
import { Card } from '@/components/Card'
import { MockResultTag } from '@/components/Chip'
import { useCan } from '@/features/auth/AuthProvider'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { isActiveException } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

import { LiveExceptionItem, type ExceptionActions } from './LiveExceptionItem'
import type { LiveMonitoring, MonitoringTrip } from './monitoring-api'
import { escalationRows } from './monitoring-view'
import { RenegotiateSheet } from './RenegotiateSheet'
import { RerouteSheet } from './RerouteSheet'
import { ResolveSheet } from './ResolveSheet'
import { useEscalateExceptionMutation, useMonitoringCapabilities } from './useMonitoringQueries'
import { useSheetTurn } from './useSheetTurn'

/** Câu kết quả của một việc vừa làm trên màn (không toast): đúng một câu, ẩn được. */
export type LiveNotice = { readonly tone: Extract<BannerTone, 'success' | 'danger'>; readonly message: string }

type LiveExceptionsCardProps = {
  trip: MonitoringTrip
  live: LiveMonitoring
  userNames: Readonly<Record<string, string>>
  /** Chuyến còn Đang vận chuyển: chỉ khi đó mới xử lý, chuyển hay gia hạn được. */
  running: boolean
  notice: LiveNotice | null
  onNotice: (notice: LiveNotice | null) => void
}

/**
 * "Sự cố của chuyến" ở màn giám sát một chuyến (như thẻ sự cố của `MonitoringTripPanel` web): tuyến thay thế đã chọn gần nhất (MOCK RESULT),
 * các sự cố mới nhất trước. Điều phối viên (`exceptions.resolve`) tìm tuyến khác, chuyển quản lý, đánh dấu đã xử lý; quản lý công ty
 * (`deadlines.renegotiate`) nhập hạn mới cho sự cố đã chuyển lên; người chỉ xem được một câu nói ai xử lý. Câu kết quả của mọi việc trên
 * sự cố — kể cả "Báo sự cố" ở chân màn — hiện ở đầu thẻ, nơi sự cố mới xuất hiện.
 */
export function LiveExceptionsCard({ trip, live, userNames, running, notice, onNotice }: LiveExceptionsCardProps) {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  const caps = useMonitoringCapabilities()
  const escalate = useEscalateExceptionMutation(trip.tripId)
  const resolving = useSheetTurn<string>()
  const rerouting = useSheetTurn<true>()
  const renegotiating = useSheetTurn<string>()
  const exceptions = [...live.exceptions].reverse()
  const canResolve = caps.exceptions && can('exceptions.resolve')
  const canRenegotiate = running && caps.escalation && can('deadlines.renegotiate')
  const stopName = (stopNumber: number) => trip.stops.find((stop) => stop.number === stopNumber)?.name ?? ''
  const renegotiateRow = canRenegotiate
    ? escalationRows({ trips: [trip], userNames, pendingPickups: {} }, [live]).find((row) => row.exception.id === renegotiating.target)
    : undefined

  const actions: ExceptionActions | undefined =
    canResolve && running
      ? {
          onReroute: caps.reroute
            ? () => {
                onNotice(null)
                rerouting.show(true)
              }
            : undefined,
          onEscalate: caps.escalation
            ? (exceptionId) => {
                onNotice(null)
                escalate.mutate(exceptionId, {
                  onSuccess: () => onNotice({ tone: 'success', message: t('monitoring.exceptions.done.escalated', { id: exceptionId }) }),
                  onError: (error) => onNotice({ tone: 'danger', message: dataErrorMessage(error, t) }),
                })
              }
            : undefined,
          onResolve: (exceptionId) => {
            onNotice(null)
            resolving.show(exceptionId)
          },
          busy: escalate.isPending,
        }
      : undefined

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('monitoring.exceptions.title')}
      </AppText>
      {notice === null ? null : (
        <Banner tone={notice.tone} onDismiss={() => onNotice(null)}>
          {notice.message}
        </Banner>
      )}
      {live.reroute === undefined ? null : (
        <View style={styles.reroute}>
          <AppText color={colors.text2}>
            {t('monitoring.reroute.current', {
              time: format.time(live.reroute.confirmedAt),
              route: t(`monitoring.reroute.routes.${live.reroute.route}`),
              km: format.decimal(live.reroute.distanceKm),
              minutes: format.integer(live.reroute.durationMinutes),
              number: format.integer(live.reroute.stopNumber),
            })}
          </AppText>
          <View style={styles.row}>
            <MockResultTag />
          </View>
        </View>
      )}
      {!can('exceptions.resolve') && exceptions.some(isActiveException) ? <AppText color={colors.text3}>{t('monitoring.exceptions.readOnly')}</AppText> : null}
      {exceptions.length === 0 ? (
        <AppText color={colors.text3}>{t('monitoring.exceptions.none')}</AppText>
      ) : (
        exceptions.map((exception) => (
          <LiveExceptionItem
            key={exception.id}
            exception={exception}
            userNames={userNames}
            actions={actions}
            onRenegotiate={
              canRenegotiate
                ? (exceptionId) => {
                    onNotice(null)
                    renegotiating.show(exceptionId)
                  }
                : undefined
            }
          />
        ))
      )}
      {actions !== undefined && resolving.target !== null ? (
        <ResolveSheet
          key={`resolve-${resolving.key}`}
          tripId={trip.tripId}
          exceptionId={resolving.target}
          open={resolving.open}
          onClose={resolving.hide}
          onResolved={(exceptionId) => {
            resolving.hide()
            onNotice({ tone: 'success', message: t('monitoring.exceptions.done.resolved', { id: exceptionId }) })
          }}
        />
      ) : null}
      {actions?.onReroute === undefined ? null : (
        <RerouteSheet
          key={`reroute-${rerouting.key}`}
          tripId={trip.tripId}
          stopName={stopName}
          open={rerouting.open}
          onClose={rerouting.hide}
          onConfirmed={(route) => {
            rerouting.hide()
            onNotice({ tone: 'success', message: t('monitoring.reroute.done', { id: trip.tripId, route: t(`monitoring.reroute.routes.${route}`) }) })
          }}
        />
      )}
      {renegotiateRow === undefined ? null : (
        <RenegotiateSheet
          key={`renegotiate-${renegotiating.key}`}
          row={renegotiateRow}
          open={renegotiating.open}
          onClose={renegotiating.hide}
          onDone={(requirementId) => {
            renegotiating.hide()
            onNotice({ tone: 'success', message: t('monitoring.renegotiate.done', { requirementId }) })
          }}
        />
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  reroute: { gap: space[1] },
  row: { flexDirection: 'row', gap: space[2] },
})
