import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useFormat, useT } from '@/lib/i18n'
import { ESCALATE_AFTER_MINUTES, type TripException } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

import { useMoment } from './useMoment'

/**
 * Các dòng đọc được của một sự cố cấp chuyến (như `ExceptionFacts` của web): ai báo lúc nào, chậm bao lâu, xe đang tới điểm nào; vì sao
 * lên quản lý; quản lý đã liên hệ khách và nhập hạn mới ra sao; ai xử lý, kèm ghi chú xử lý nếu có (mobile thêm). Dùng ở màn giám sát
 * một chuyến và tab "Sự cố cần xử lý" của quản lý.
 */
export function ExceptionFacts({ exception, userNames }: { exception: TripException; userNames: Readonly<Record<string, string>> }) {
  const t = useT()
  const format = useFormat()
  const moment = useMoment()
  const nameOf = (userId: string | null) => (userId === null ? t('liveTrip.system') : (userNames[userId] ?? t('monitoring.exceptions.unknownUser')))
  const { escalation, renegotiation, resolution } = exception
  const reported = [
    t('monitoring.exceptions.reported', { time: moment(exception.reportedAt), name: nameOf(exception.reportedBy) }),
    t('monitoring.exceptions.delay', { count: exception.delayMinutes }),
    ...(exception.stopNumber === undefined ? [] : [t('monitoring.exceptions.atStop', { number: format.integer(exception.stopNumber) })]),
  ].join(' · ')
  const lines = [
    reported,
    ...(escalation === undefined
      ? []
      : [t(`monitoring.exceptions.escalations.${escalation.reason}`, { time: moment(escalation.at), minutes: ESCALATE_AFTER_MINUTES })]),
    ...(renegotiation === undefined
      ? []
      : [
          t('monitoring.exceptions.contacted', { time: moment(renegotiation.at), note: renegotiation.contactNote }),
          t('monitoring.exceptions.newDeadline', {
            requirementId: renegotiation.requirementId,
            deadline: moment(renegotiation.deadline),
            previous: moment(renegotiation.previousDeadline),
          }),
        ]),
    ...(resolution === undefined
      ? []
      : [
          t('monitoring.exceptions.resolved', { time: moment(resolution.at), name: nameOf(resolution.by) }),
          ...(resolution.note === undefined ? [] : [t('liveTrip.resolutionNote', { note: resolution.note })]),
        ]),
  ]
  return (
    <View style={styles.facts}>
      {lines.map((line, index) => (
        <AppText key={index} color={colors.text2}>
          {line}
        </AppText>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  facts: { gap: space[1] },
})
