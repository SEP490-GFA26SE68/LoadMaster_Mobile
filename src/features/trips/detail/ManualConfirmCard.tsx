import { Check, X } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useCan } from '@/features/auth/AuthProvider'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import type { ManualConfirmRow } from '../trips-model'
import { useApproveManualConfirm, useManualConfirmations, useRejectManualConfirm } from '../useTripsQueries'
import { DecisionCard, DecisionRow, rowError, type DecisionNotice } from './decision-ui'
import { RejectSheet } from './RejectSheet'

/**
 * "Xác nhận tay chờ duyệt" ở Chi tiết chuyến (như `ManualConfirmCard` của web): các kiện kho hoặc tài xế xác nhận bằng tay vì nhãn không
 * đọc được — kiện, bước của chuyến, người gửi, thời điểm, lý do, ghi chú. Người có quyền `manualConfirm.approve` (điều phối viên) duyệt —
 * kiện giữ kết quả — hoặc từ chối kèm lý do bắt buộc (tờ trượt) — kiện phải kiểm lại, người gửi được báo. Người chỉ xem (quản lý công ty)
 * thấy danh sách và một dòng lý do, không nút. Mỗi dòng một cặp nút phụ: nút chính của màn nằm ở chân màn. Không còn dòng chờ (và không
 * còn kết quả vừa quyết) thì thẻ không hiện. `enabled`: pha của chuyến còn bước đối chiếu đang diễn ra (kho xếp, xe giao).
 */
export function ManualConfirmCard({ tripId, enabled }: { tripId: string; enabled: boolean }) {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  const query = useManualConfirmations(tripId, enabled)
  const approve = useApproveManualConfirm(tripId)
  const reject = useRejectManualConfirm(tripId)
  const [rejecting, setRejecting] = useState<ManualConfirmRow | null>(null)
  const [notice, setNotice] = useState<DecisionNotice | null>(null)
  const rows = enabled ? (query.data ?? []) : []
  const loadError = enabled && query.isError ? dataErrorMessage(query.error, t) : null
  if (rows.length === 0 && notice === null && loadError === null) return null
  const canDecide = can('manualConfirm.approve')
  const busy = approve.isPending || reject.isPending

  function handleApprove(row: ManualConfirmRow) {
    setNotice(null)
    approve.mutate(row.id, {
      onSuccess: () => setNotice({ tone: 'success', rowId: row.id, text: t('trips.manualConfirms.approved', { id: row.packageInstanceId }) }),
      onError: (error) => setNotice({ tone: 'danger', rowId: row.id, text: dataErrorMessage(error, t) }),
    })
  }

  async function handleReject(row: ManualConfirmRow, reason: string): Promise<string | null> {
    try {
      await reject.mutateAsync({ confirmationId: row.id, reason })
      setNotice({ tone: 'success', rowId: row.id, text: t('trips.manualConfirms.rejected', { id: row.packageInstanceId }) })
      return null
    } catch (error) {
      return dataErrorMessage(error, t)
    }
  }

  return (
    <DecisionCard
      title={t('trips.manualConfirms.title')}
      count={rows.length > 0 ? t('trips.manualConfirms.count', { count: rows.length }) : null}
      description={t('trips.manualConfirms.description')}
      readOnly={canDecide ? null : t('trips.manualConfirms.readOnly')}
      notice={notice}
      rowIds={rows.map((row) => row.id)}
      onDismiss={() => setNotice(null)}
      loadError={loadError}>
      {rows.map((row) => {
        const step = t(`companyTrips.verifyContexts.${row.context}`)
        const where = row.stopNumber === undefined ? step : t('trips.manualConfirms.atStop', { step, stop: row.stopNumber })
        const sentBy = t('trips.manualConfirms.sentBy', {
          name: row.senderName ?? t('trips.manualConfirms.unknownSender'),
          time: format.time(row.at),
          date: format.dayMonth(row.at),
        })
        const reason = `${t('trips.manualConfirms.reason', { reason: t(`common.manualConfirmReasons.${row.reason}`) })}${row.note ? ` — ${row.note}` : ''}`
        const approving = approve.isPending && approve.variables === row.id
        return (
          <DecisionRow
            key={row.id}
            label={[`${row.packageInstanceId} ${row.packageName}`, where, sentBy, reason].join(', ')}
            error={rowError(notice, row.id)}
            onDismissError={() => setNotice(null)}
            actions={
              canDecide ? (
                <>
                  <Button
                    variant="secondary"
                    icon={X}
                    style={styles.flex}
                    disabled={busy}
                    accessibilityLabel={t('trips.manualConfirms.rejectLabel', { id: row.packageInstanceId })}
                    onPress={() => {
                      setNotice(null)
                      setRejecting(row)
                    }}>
                    {t('trips.manualConfirms.reject')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Check}
                    style={styles.flex}
                    disabled={busy && !approving}
                    loading={approving}
                    accessibilityLabel={t('trips.manualConfirms.approveLabel', { id: row.packageInstanceId })}
                    onPress={() => handleApprove(row)}>
                    {t('trips.manualConfirms.approve')}
                  </Button>
                </>
              ) : null
            }>
            <AppText variant="label" style={styles.number}>
              {row.packageInstanceId}
            </AppText>
            {row.packageName ? <AppText>{row.packageName}</AppText> : null}
            <AppText color={colors.text2}>{where}</AppText>
            <AppText color={colors.text2} style={styles.number}>
              {sentBy}
            </AppText>
            <AppText>{reason}</AppText>
          </DecisionRow>
        )
      })}
      {canDecide ? (
        <RejectSheet
          key={rejecting?.id ?? 'closed'}
          row={rejecting}
          pending={reject.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => (rejecting ? handleReject(rejecting, reason) : Promise.resolve(null))}
        />
      ) : null}
    </DecisionCard>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  number: { fontVariant: ['tabular-nums'] },
})
