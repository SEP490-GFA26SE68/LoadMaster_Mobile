import { CalendarClock, ChevronRight } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { ExceptionFacts } from './ExceptionFacts'
import { DeadlineChip, ExceptionStatusChip } from './monitoring-chips'
import type { EscalationRow } from './monitoring-view'
import { useMoment } from './useMoment'

type EscalationItemProps = {
  row: EscalationRow
  userNames: Readonly<Record<string, string>>
  onRenegotiate: (row: EscalationRow) => void
  onOpenTrip: (tripId: string) => void
}

/**
 * Một sự cố đã chuyển lên quản lý công ty (như `EscalationItem` của web): loại và trạng thái, mô tả, các dòng của sự cố, chuyến của nó (nút
 * mở Chi tiết chuyến thay liên kết của web), các điểm chưa giao có hạn kèm giờ đến dự kiến, hạn và mức hạn. Nút phụ "Nhập hạn mới" mở tờ
 * liên hệ khách; sự cố đã nhập hạn mới ở lại kèm câu chờ điều phối viên xử lý tiếp.
 */
export function EscalationItem({ row, userNames, onRenegotiate, onOpenTrip }: EscalationItemProps) {
  const t = useT()
  const format = useFormat()
  const moment = useMoment()
  const { exception, trip, stops } = row
  return (
    <Card>
      <View style={styles.row}>
        <AppText variant="label" color={colors.text2} style={styles.code}>
          {exception.id}
        </AppText>
        <ExceptionStatusChip status={exception.status} />
      </View>
      <AppText variant="heading" accessibilityRole="header">
        {t(`common.tripExceptionTypes.${exception.type}`)}
      </AppText>
      <AppText>{exception.description}</AppText>
      <ExceptionFacts exception={exception} userNames={userNames} />
      <AppText color={colors.text2}>{[trip.name, trip.vehicleName].filter((part) => part !== '').join(' · ')}</AppText>
      <Button variant="secondary" trailingIcon={ChevronRight} onPress={() => onOpenTrip(trip.tripId)}>
        {t('monitoring.escalations.trip', { id: trip.tripId })}
      </Button>
      {stops.length === 0 ? (
        <AppText color={colors.text3}>{t('monitoring.escalations.noStop')}</AppText>
      ) : (
        <View style={styles.stops}>
          {stops.map((stop) => (
            <View key={stop.stopId} style={styles.stop}>
              <AppText variant="label">{t('monitoring.escalations.stop', { number: format.integer(stop.number), name: stop.name })}</AppText>
              <AppText color={colors.text2}>
                {[
                  t(stop.arrived ? 'monitoring.list.arrived' : 'monitoring.escalations.eta', { time: moment(stop.eta) }),
                  ...(stop.deadline === undefined ? [] : [t('monitoring.escalations.deadline', { time: moment(stop.deadline) })]),
                ].join(' · ')}
              </AppText>
              <View style={styles.row}>
                <DeadlineChip status={stop.deadlineStatus ?? null} />
              </View>
            </View>
          ))}
        </View>
      )}
      <Button variant="secondary" icon={CalendarClock} onPress={() => onRenegotiate(row)}>
        {t('monitoring.escalations.renegotiate')}
      </Button>
      {exception.renegotiation === undefined ? null : <AppText color={colors.text2}>{t('monitoring.escalations.waiting')}</AppText>}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  stops: { gap: space[3] },
  stop: { gap: space[1] },
})
