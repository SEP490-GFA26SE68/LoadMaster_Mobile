import { PackagePlus } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { useSheetTurn } from '@/features/monitoring/useSheetTurn'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { PickupRow } from './pickup-model'
import { stopLabeler, type StopRef } from './pickup-stops'
import { PickupApproveSheet } from './PickupApproveSheet'
import { PickupFormSheet } from './PickupFormSheet'
import { PickupRejectSheet } from './PickupRejectSheet'
import { PickupRequestItem } from './PickupRequestItem'
import { useCreatePickupMutation, usePickupRowsQuery } from './usePickupQueries'

type PickupRequestsCardProps = {
  tripId: string
  /** Chuyến còn Đang vận chuyển: chỉ khi đó mới gửi, duyệt, từ chối được. */
  running: boolean
  /** Điểm của chuyến theo thứ tự tuyến, để câu của luật 2 gọi tên điểm được bảo vệ. */
  stops: readonly StopRef[]
}

/**
 * "Nhận hàng dọc đường" của một chuyến ở màn giám sát (như `PickupRequestsCard` của web): các yêu cầu kèm trạng thái và mười luật, nút
 * gửi yêu cầu (`pickups.create`; chuyến thôi chạy thì nút mờ kèm lý do ngay dưới), cặp nút Từ chối / Duyệt của điều phối viên
 * (`pickups.approve`). Người chỉ xem được một câu nói ai duyệt. Chuyến không còn chạy và chưa có yêu cầu nào thì không có thẻ.
 */
export function PickupRequestsCard({ tripId, running, stops }: PickupRequestsCardProps) {
  const t = useT()
  const can = useCan()
  const query = usePickupRowsQuery(tripId)
  const create = useCreatePickupMutation(tripId)
  const creating = useSheetTurn<true>()
  const approving = useSheetTurn<PickupRow>()
  const rejecting = useSheetTurn<PickupRow>()
  const [rejected, setRejected] = useState<string | null>(null)
  const rows = query.data ?? []
  const canCreate = can('pickups.create')
  const canDecide = can('pickups.approve') && running
  if (!running && rows.length === 0) return null
  const stopLabel = stopLabeler(stops, t)
  const waiting = rows.some((row) => row.request.status === 'PENDING' || row.request.status === 'VALIDATED')

  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
          {t('pickups.card.title')}
        </AppText>
        {rows.length > 0 ? <Chip tone="neutral" label={t('pickups.card.count', { count: rows.length })} /> : null}
      </View>
      <AppText color={colors.text2}>{t('pickups.card.description')}</AppText>
      {canCreate ? (
        <Button
          variant="secondary"
          icon={PackagePlus}
          disabled={!running}
          onPress={() => {
            setRejected(null)
            creating.show(true)
          }}>
          {t('pickups.open')}
        </Button>
      ) : null}
      {canCreate && !running ? <AppText color={colors.text3}>{t('pickups.blocked')}</AppText> : null}
      {rejected === null ? null : (
        <Banner tone="success" onDismiss={() => setRejected(null)}>
          {t('pickups.reject.done', { id: rejected })}
        </Banner>
      )}
      {query.isPending ? (
        <LoadingState label={t('pickups.card.loading')} />
      ) : query.isError && query.data === undefined ? (
        <>
          <Banner tone="danger">{t('pickupRequest.loadFailed', { message: dataErrorMessage(query.error, t) })}</Banner>
          <Button variant="secondary" onPress={() => void query.refetch()}>
            {t('common.retry')}
          </Button>
        </>
      ) : rows.length === 0 ? (
        <AppText color={colors.text3}>{t('pickups.card.empty')}</AppText>
      ) : (
        <View>
          {rows.map((row, index) => (
            <View key={row.request.id} style={index > 0 && styles.divider}>
              <PickupRequestItem
                tripId={tripId}
                row={row}
                stopLabel={stopLabel}
                canRecheck={canCreate && running}
                onApprove={canDecide ? approving.show : undefined}
                onReject={
                  canDecide
                    ? (target) => {
                        setRejected(null)
                        rejecting.show(target)
                      }
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
      {waiting && !can('pickups.approve') ? <AppText color={colors.text3}>{t('pickups.actions.readOnly')}</AppText> : null}
      {canCreate ? <PickupFormSheet key={`create-${creating.key}`} open={creating.open} onClose={creating.hide} tripCode={tripId} create={create} /> : null}
      {canDecide && approving.target !== null ? (
        <PickupApproveSheet key={`approve-${approving.key}`} tripId={tripId} row={approving.target} stopLabel={stopLabel} open={approving.open} onClose={approving.hide} />
      ) : null}
      {canDecide && rejecting.target !== null ? (
        <PickupRejectSheet
          key={`reject-${rejecting.key}`}
          tripId={tripId}
          row={rejecting.target}
          open={rejecting.open}
          onClose={rejecting.hide}
          onRejected={(id) => {
            rejecting.hide()
            setRejected(id)
          }}
        />
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
})
