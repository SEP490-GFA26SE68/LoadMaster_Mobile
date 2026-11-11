import { PackageX, Search } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useCan } from '@/features/auth/AuthProvider'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import type { ShortageRow } from '../trips-model'
import { useResolveShortage, useStagingShortages } from '../useTripsQueries'
import { DecisionCard, DecisionRow, rowError, type DecisionNotice } from './decision-ui'
import { DropSheet } from './DropSheet'

/**
 * "Kiện kho báo thiếu" ở Chi tiết chuyến (như `MissingPackagesCard` của web): các kiện kho không tìm thấy lúc soạn hàng — kiện, điểm giao,
 * người báo, thời điểm. Người sửa được chuyến (`trips.edit`, điều phối viên) quyết từng kiện: **Tìm tiếp** — báo thiếu đóng lại — hoặc
 * **Bỏ kiện khỏi chuyến**, hỏi lại trong tờ trượt vì chuyến quay về Đã lập kế hoạch. Người chỉ xem thấy danh sách và một dòng lý do. Mã
 * của bên gửi hiện cạnh tên khi khác mã kiện của chuyến (như thẻ kiện kho kiện của web). Bỏ kiện xong chuyến rời bước soạn nhưng thẻ còn
 * giữ kết quả tới khi người dùng ẩn nó. `enabled`: chuyến đang ở kho.
 */
export function ShortageCard({ tripId, enabled }: { tripId: string; enabled: boolean }) {
  const t = useT()
  const format = useFormat()
  const can = useCan()
  const query = useStagingShortages(tripId, enabled)
  const resolve = useResolveShortage(tripId)
  const [dropping, setDropping] = useState<ShortageRow | null>(null)
  const [notice, setNotice] = useState<DecisionNotice | null>(null)
  const rows = enabled ? (query.data ?? []) : []
  const loadError = enabled && query.isError ? dataErrorMessage(query.error, t) : null
  if (rows.length === 0 && notice === null && loadError === null) return null
  const canDecide = can('trips.edit')

  function handleKeep(row: ShortageRow) {
    setNotice(null)
    resolve.mutate(
      { shortageId: row.id, decision: 'KEEP_SEARCHING' },
      {
        onSuccess: () => setNotice({ tone: 'success', rowId: row.id, text: t('trips.shortages.kept', { id: row.packageInstanceId }) }),
        onError: (error) => setNotice({ tone: 'danger', rowId: row.id, text: dataErrorMessage(error, t) }),
      },
    )
  }

  async function handleDrop(row: ShortageRow): Promise<string | null> {
    try {
      await resolve.mutateAsync({ shortageId: row.id, decision: 'DROP' })
      const text = `${t('trips.shortages.dropped', { id: row.packageInstanceId })} ${t('trips.shortages.droppedDescription')}`
      setNotice({ tone: 'success', rowId: row.id, text })
      return null
    } catch (error) {
      return dataErrorMessage(error, t)
    }
  }

  return (
    <DecisionCard
      title={t('trips.shortages.title')}
      count={rows.length > 0 ? t('trips.shortages.count', { count: rows.length }) : null}
      description={t('trips.shortages.description')}
      readOnly={canDecide ? null : t('trips.shortages.readOnly')}
      notice={notice}
      rowIds={rows.map((row) => row.id)}
      onDismiss={() => setNotice(null)}
      loadError={loadError}>
      {rows.map((row) => {
        const id = row.packageInstanceId
        const code = row.packageCode === id ? null : row.packageCode
        const stop = row.stopNumber === undefined ? null : t('common.stop', { number: row.stopNumber })
        const reportedBy = t('trips.shortages.reportedBy', {
          name: row.reporterName ?? t('trips.shortages.unknownReporter'),
          time: format.time(row.at),
          date: format.dayMonth(row.at),
        })
        const keeping = resolve.isPending && resolve.variables?.shortageId === row.id && resolve.variables.decision === 'KEEP_SEARCHING'
        return (
          <DecisionRow
            key={row.id}
            label={[`${id} ${row.packageName}`, ...(code ? [code] : []), ...(stop ? [stop] : []), reportedBy].join(', ')}
            error={rowError(notice, row.id)}
            onDismissError={() => setNotice(null)}
            actions={
              canDecide ? (
                <>
                  <Button
                    variant="secondary"
                    icon={PackageX}
                    style={styles.flex}
                    disabled={resolve.isPending}
                    accessibilityLabel={t('trips.shortages.dropLabel', { id })}
                    onPress={() => {
                      setNotice(null)
                      setDropping(row)
                    }}>
                    {t('trips.shortages.drop')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Search}
                    style={styles.flex}
                    disabled={resolve.isPending && !keeping}
                    loading={keeping}
                    accessibilityLabel={t('trips.shortages.keepLabel', { id })}
                    onPress={() => handleKeep(row)}>
                    {t('trips.shortages.keep')}
                  </Button>
                </>
              ) : null
            }>
            <AppText variant="label" style={styles.number}>
              {id}
            </AppText>
            {row.packageName ? <AppText>{row.packageName}</AppText> : null}
            {code ? (
              <AppText color={colors.text3} style={styles.number}>
                {code}
              </AppText>
            ) : null}
            {stop ? <AppText color={colors.text2}>{stop}</AppText> : null}
            <AppText color={colors.text2} style={styles.number}>
              {reportedBy}
            </AppText>
          </DecisionRow>
        )
      })}
      {canDecide ? (
        <DropSheet
          key={dropping?.id ?? 'closed'}
          row={dropping}
          pending={resolve.isPending}
          onClose={() => setDropping(null)}
          onConfirm={() => (dropping ? handleDrop(dropping) : Promise.resolve(null))}
        />
      ) : null}
    </DecisionCard>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  number: { fontVariant: ['tabular-nums'] },
})
