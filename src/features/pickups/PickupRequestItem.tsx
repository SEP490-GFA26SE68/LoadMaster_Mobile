import { Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { PICKUP_STATUS_LOOK } from './pickup-look'
import type { PickupRow } from './pickup-model'
import { PickupRulesList } from './PickupRulesList'
import { useValidatePickupMutation } from './usePickupQueries'

type PickupRequestItemProps = {
  tripId: string
  row: PickupRow
  stopLabel: (stopId: string) => string
  /** Người xem gửi được yêu cầu (`pickups.create`): kiểm lại mười luật của yêu cầu còn chờ — xe đã đi tiếp từ lúc gửi. */
  canRecheck: boolean
  /** Có mặt khi người xem duyệt được (`pickups.approve`, chuyến đang chạy): cặp nút Từ chối / Duyệt của yêu cầu còn chờ. */
  onApprove?: ((row: PickupRow) => void) | undefined
  onReject?: ((row: PickupRow) => void) | undefined
}

/**
 * Một yêu cầu nhận hàng dọc đường của chuyến (như `PickupRequestItem` của web): mã, trạng thái bằng chữ, điểm nhận → điểm giao, số kiện
 * và khối lượng, hạn, người gửi; lý do vượt luật hoặc từ chối nếu có; số luật đạt và mười luật mở ra được. Không có lối in nhãn — in nhãn
 * là việc của bản web.
 */
export function PickupRequestItem({ tripId, row, stopLabel, canRecheck, onApprove, onReject }: PickupRequestItemProps) {
  const t = useT()
  const format = useFormat()
  const validate = useValidatePickupMutation(tripId)
  const [showRules, setShowRules] = useState(false)
  const { request } = row
  const results = request.validationResults
  const passed = results.filter((result) => result.passed).length
  const weightKg = request.packages.reduce((sum, pkg) => sum + pkg.weightKg, 0)
  const waiting = request.status === 'PENDING' || request.status === 'VALIDATED'
  const moment = { time: format.time(request.createdAt), date: format.dayMonth(request.createdAt) }
  const facts = [
    t('pickups.card.packages', { count: request.packages.length, weight: format.weight(weightKg) }),
    ...(request.deadline === undefined ? [] : [t('pickups.card.deadline', { time: format.time(request.deadline), date: format.dayMonth(request.deadline) })]),
    row.createdByName === null ? t('pickups.card.sentBy', moment) : t('pickups.card.sentByName', { ...moment, name: row.createdByName }),
  ]

  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <AppText variant="label" style={styles.code}>
          {request.id}
        </AppText>
        <Chip tone={PICKUP_STATUS_LOOK[request.status].tone} label={t(`pickups.status.${request.status}`)} />
      </View>
      <AppText>{`${t('pickups.card.from', { name: request.pickup.name })} → ${t('pickups.card.to', { name: request.delivery.name })}`}</AppText>
      <AppText color={colors.text2}>{facts.join(' · ')}</AppText>
      {request.overrideReason === undefined ? null : <AppText>{t('pickups.card.override', { reason: request.overrideReason })}</AppText>}
      {request.rejectReason === undefined ? null : <AppText>{t('pickups.card.rejected', { reason: request.rejectReason })}</AppText>}
      <AppText variant="label" color={colors.text2}>
        {results.length === 0 ? t('pickups.card.rulesNotChecked') : t('pickups.card.rulesPassed', { passed, total: results.length })}
      </AppText>
      {validate.isError ? <Banner tone="danger">{dataErrorMessage(validate.error, t)}</Banner> : null}
      {waiting && canRecheck ? (
        <Button
          variant="secondary"
          icon={RefreshCw}
          loading={validate.isPending}
          accessibilityLabel={t('pickups.card.recheckLabel', { id: request.id })}
          onPress={() => validate.mutate(request.id)}>
          {t('pickups.card.recheck')}
        </Button>
      ) : null}
      {waiting && onApprove !== undefined && onReject !== undefined ? (
        <View style={styles.decide}>
          <Button variant="secondary" icon={X} style={styles.flex} accessibilityLabel={t('pickups.actions.rejectLabel', { id: request.id })} onPress={() => onReject(row)}>
            {t('pickups.actions.reject')}
          </Button>
          <Button variant="secondary" icon={Check} style={styles.flex} accessibilityLabel={t('pickups.actions.approveLabel', { id: request.id })} onPress={() => onApprove(row)}>
            {t('pickups.actions.approve')}
          </Button>
        </View>
      ) : null}
      {results.length === 0 ? null : (
        <>
          <Button
            variant="secondary"
            trailingIcon={showRules ? ChevronUp : ChevronDown}
            accessibilityState={{ expanded: showRules }}
            onPress={() => setShowRules((shown) => !shown)}>
            {showRules ? t('pickupRequest.hideRules') : t('pickups.card.showRules')}
          </Button>
          {showRules ? <PickupRulesList results={results} stopLabel={stopLabel} /> : null}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  item: { gap: space[2], paddingVertical: space[3] },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  decide: { flexDirection: 'row', gap: space[2] },
  flex: { flex: 1 },
})
