import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { MockResultTag } from '@/components/Chip'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { Sheet } from '@/components/Sheet'
import { LoadingState } from '@/components/StateView'
import type { RerouteRoute } from '@/domain/routing'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { useConfirmRerouteMutation, useRequestRerouteMutation } from './useMonitoringQueries'

type RerouteSheetProps = {
  tripId: string
  /** Tên điểm theo số điểm (1-based) của chuyến. */
  stopName: (stopNumber: number) => string
  open: boolean
  onClose: () => void
  /** Kho đã ghi tuyến `route` cho chuyến: tờ đóng, thẻ nói chuyến đi tuyến nào. */
  onConfirmed: (route: RerouteRoute) => void
}

/**
 * Tờ "Tìm tuyến khác" của điều phối viên (như `RerouteDialog` của web): mở tờ là một lần tìm mới — mock đưa ra 2–3 tuyến tới **điểm kế
 * tiếp** từ vị trí xe (tên, quãng đường, thời gian, giờ đến điểm đó) kèm nhãn **MOCK RESULT**. Chọn một tuyến thì xe thôi đứng chờ sự cố
 * và giờ đến tính lại theo vị trí; thứ tự điểm giao không đổi — tờ nói rõ điều đó. Kho không tìm được tuyến thì tờ nói lý do. Nơi gọi đổi
 * `key` mỗi lần mở.
 */
export function RerouteSheet({ tripId, stopName, open, onClose, onConfirmed }: RerouteSheetProps) {
  const t = useT()
  const format = useFormat()
  const { mutate: search, data: proposal, error, isPending } = useRequestRerouteMutation(tripId)
  const confirm = useConfirmRerouteMutation(tripId)
  const [chosen, setChosen] = useState<string | undefined>(undefined)
  const [failure, setFailure] = useState<string | null>(null)
  // Tìm đúng một lần mỗi lượt mở (tờ dựng lại theo `key` của nơi gọi)
  const searched = useRef(false)
  useEffect(() => {
    if (!open || searched.current) return
    searched.current = true
    search()
  }, [open, search])

  const handleConfirm = async () => {
    const option = proposal?.options.find((item) => String(item.index) === chosen)
    if (option === undefined) return
    setFailure(null)
    try {
      await confirm.mutateAsync(option.index)
      onConfirmed(option.route)
    } catch (caught) {
      setFailure(dataErrorMessage(caught, t))
    }
  }

  const found = proposal !== undefined && error === null
  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={confirm.isPending}
      title={t('monitoring.reroute.title', { id: tripId })}
      description={
        proposal === undefined
          ? t('monitoring.reroute.note')
          : t('monitoring.reroute.description', { number: proposal.stopNumber, name: stopName(proposal.stopNumber), time: format.time(proposal.requestedAt) })
      }
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={confirm.isPending} onPress={onClose}>
            {t('monitoring.reroute.close')}
          </Button>
          {found ? (
            <Button style={styles.flex} disabled={chosen === undefined} loading={confirm.isPending} onPress={() => void handleConfirm()}>
              {t('monitoring.reroute.confirm')}
            </Button>
          ) : null}
        </>
      }>
      {error !== null ? (
        <Banner tone="warning">{dataErrorMessage(error, t)}</Banner>
      ) : isPending || proposal === undefined ? (
        <LoadingState label={t('monitoring.reroute.loading')} />
      ) : (
        <>
          <ChoiceGroup
            label={t('monitoring.reroute.options')}
            choices={proposal.options.map((option) => ({
              value: String(option.index),
              label: t(`monitoring.reroute.routes.${option.route}`),
              description: [
                t('monitoring.reroute.measure', { km: format.decimal(option.distanceKm), minutes: format.integer(option.durationMinutes) }),
                t('monitoring.reroute.eta', { number: proposal.stopNumber, time: format.time(option.eta) }),
              ].join(' · '),
            }))}
            value={chosen}
            onChange={setChosen}
          />
          {proposal.isMockResult ? (
            <View style={styles.row}>
              <MockResultTag />
            </View>
          ) : null}
          <AppText color={colors.text3}>{t('monitoring.reroute.note')}</AppText>
        </>
      )}
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space[2] },
})
