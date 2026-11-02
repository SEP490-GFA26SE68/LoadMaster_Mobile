import { ArrowUpRight, CalendarClock, CircleCheck, Route } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useT } from '@/lib/i18n'
import { isActiveException, type TripException } from '@/lib/mock-db'
import { colors, radius, space } from '@/theme/tokens'

import { ExceptionFacts } from './ExceptionFacts'
import { ExceptionStatusChip } from './monitoring-chips'

/** Việc của điều phối viên trên một sự cố còn mở; vắng khi người xem không xử lý được (hoặc chuyến thôi chạy). */
export type ExceptionActions = {
  /** Vắng khi nguồn dữ liệu chưa tìm được tuyến khác. */
  readonly onReroute: (() => void) | undefined
  /** Vắng khi nguồn dữ liệu chưa chuyển được sự cố cho quản lý. */
  readonly onEscalate: ((exceptionId: string) => void) | undefined
  readonly onResolve: (exceptionId: string) => void
  /** Đang chuyển một sự cố cho quản lý: các nút chờ. */
  readonly busy: boolean
}

type LiveExceptionItemProps = {
  exception: TripException
  userNames: Readonly<Record<string, string>>
  actions: ExceptionActions | undefined
  /** Quản lý công ty gia hạn được sự cố đã chuyển lên mình; vắng với người khác. */
  onRenegotiate: ((exceptionId: string) => void) | undefined
}

/**
 * Một sự cố cấp chuyến ở màn giám sát một chuyến (như một dòng của `TripExceptionList` của web): mã, loại, trạng thái bằng chữ, mô tả và
 * các dòng của sự cố. Điều phối viên có ba nút phụ cho sự cố còn mở — "Tìm tuyến khác", "Không có tuyến khả thi — chuyển quản lý" (chỉ khi
 * chưa chuyển), "Đã xử lý"; quản lý công ty có "Nhập hạn mới" cho sự cố đã chuyển lên. Nút chính của màn là "Báo sự cố" ở chân màn.
 */
export function LiveExceptionItem({ exception, userNames, actions, onRenegotiate }: LiveExceptionItemProps) {
  const t = useT()
  const active = isActiveException(exception)
  return (
    <View style={styles.item}>
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
      {actions !== undefined && active ? (
        <View style={styles.actions}>
          {actions.onReroute === undefined ? null : (
            <Button variant="secondary" icon={Route} disabled={actions.busy} onPress={actions.onReroute}>
              {t('monitoring.exceptions.actions.reroute')}
            </Button>
          )}
          {actions.onEscalate !== undefined && exception.status === 'OPEN' ? (
            <Button variant="secondary" icon={ArrowUpRight} disabled={actions.busy} onPress={() => actions.onEscalate?.(exception.id)}>
              {t('monitoring.exceptions.actions.escalate')}
            </Button>
          ) : null}
          <Button variant="secondary" icon={CircleCheck} disabled={actions.busy} onPress={() => actions.onResolve(exception.id)}>
            {t('monitoring.exceptions.actions.resolve')}
          </Button>
        </View>
      ) : null}
      {onRenegotiate !== undefined && exception.status === 'ESCALATED' ? (
        <>
          <Button variant="secondary" icon={CalendarClock} onPress={() => onRenegotiate(exception.id)}>
            {t('monitoring.escalations.renegotiate')}
          </Button>
          {exception.renegotiation === undefined ? null : <AppText color={colors.text2}>{t('monitoring.escalations.waiting')}</AppText>}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  item: { gap: space[2], padding: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  actions: { gap: space[2] },
})
