import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { StopDot } from '@/components/StopDot'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import type { Trip } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

import type { TripRequirementRow } from '../trips-model'
import { useTripRequirements } from '../useTripsQueries'
import { PRIORITY_TONE, REQUIREMENT_STATUS_TONE } from './looks'

/**
 * "Yêu cầu giao của chuyến" (như `TripRequirementsCard` của web, chỉ đọc): mỗi yêu cầu đã vào chuyến một dòng, theo thứ tự điểm giao —
 * số điểm trên màu định danh, mã và điểm đến của yêu cầu, ưu tiên, trạng thái (trừ "Đã vào chuyến", như web), điểm giao, hạn, số kiện.
 * Chuyến không có yêu cầu nào thì không có thẻ; đang đọc lần đầu cũng chưa có thẻ, để thẻ không hiện rồi biến mất. Không có nút đưa
 * vào / gỡ khỏi chuyến hay lối tới danh sách yêu cầu giao: trên điện thoại màn chỉ đọc.
 */
export function RequirementsCard({ trip, enabled }: { trip: Pick<Trip, 'id' | 'stops'>; enabled: boolean }) {
  const t = useT()
  const query = useTripRequirements(trip.id, enabled)
  const rows = enabled ? (query.data ?? []) : []
  if (!enabled || (rows.length === 0 && !query.isError)) return null
  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header">
          {t('companyTrips.requirements.title')}
        </AppText>
        {rows.length > 0 ? <AppText color={colors.text3}>{t('companyTrips.requirements.count', { count: rows.length })}</AppText> : null}
      </View>
      {query.isError ? <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner> : null}
      {rows.map((row) => (
        <RequirementRow key={row.requirement.id} row={row} stopName={row.stopNumber === undefined ? undefined : trip.stops[row.stopNumber - 1]?.name} />
      ))}
    </Card>
  )
}

function RequirementRow({ row, stopName }: { row: TripRequirementRow; stopName: string | undefined }) {
  const t = useT()
  const format = useFormat()
  const { requirement, status, stopNumber } = row
  const stop = stopNumber !== undefined && stopName !== undefined ? t('companyTrips.requirements.stop', { number: stopNumber, name: stopName }) : null
  const deadline = t('companyTrips.requirements.deadline', { time: format.time(requirement.deadline), date: format.date(requirement.deadline) })
  const packages = t('companyTrips.packageCount', { count: requirement.packageIds.length })
  const priority = t(`companyTrips.priority.${requirement.priority}`)
  const statusLabel = status === 'ASSIGNED' ? null : t(`companyTrips.requirements.status.${status}`)
  const facts = [...(stop ? [stop] : []), deadline, packages].join(' · ')
  const spoken = [requirement.id, requirement.destinationName, priority, ...(statusLabel ? [statusLabel] : []), facts].join(', ')
  return (
    <View accessible accessibilityLabel={spoken} style={styles.row}>
      {stop && stopNumber !== undefined ? <StopDot number={stopNumber} /> : null}
      <View style={styles.body}>
        <AppText variant="label" style={styles.number}>
          {requirement.id}
        </AppText>
        <AppText>{requirement.destinationName}</AppText>
        <View style={styles.chips}>
          <Chip tone={PRIORITY_TONE[requirement.priority]} label={priority} />
          {statusLabel ? <Chip tone={REQUIREMENT_STATUS_TONE[status]} label={statusLabel} /> : null}
        </View>
        <AppText color={colors.text3} style={styles.number}>
          {facts}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: space[1] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  body: { flex: 1, gap: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  number: { fontVariant: ['tabular-nums'] },
})
