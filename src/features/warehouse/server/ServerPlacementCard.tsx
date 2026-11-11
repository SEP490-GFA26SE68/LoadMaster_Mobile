import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { StopDot } from '@/components/StopDot'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, space } from '@/theme/tokens'

import type { ServerLoadingRow, ServerPlacementState } from '../server-loading'
import type { ServerPlacement } from '../warehouse-server-model'
import { serverStopText } from './ServerPackageSummary'

/**
 * Thẻ kiện cần xếp của phiên máy chủ (như `ServerPlacementCard` của web), một cột ở 360 dp: tên, mã vạch, mã kho kiện, điểm giao, kích thước
 * khi đặt (cm), khối lượng (kg, khi máy chủ trả) và vị trí đặt bằng số kèm cách đo. Việc phụ của bước (ghi sai lệch vị trí, lý do bị từ
 * chối xác nhận tay) truyền làm `children`. App không có khung 3D vị trí kiện ở bản máy chủ: vị trí là số.
 */
export function ServerPlacementCard({ placement, step, total, children }: { placement: ServerPlacement; step: number; total: number; children: ReactNode }) {
  const t = useT()
  const format = useFormat()
  const cm = (value: number) => format.lengthValue(value)
  const unknown = t('serverWarehouse.unknown')
  const stop = serverStopText(placement, t)
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('serverWarehouse.session.current', { step, total })}
      </AppText>
      <Fact label={t('serverWarehouse.session.name')}>{placement.name}</Fact>
      <View style={styles.pair}>
        <Fact label={t('serverWarehouse.session.barcode')} code>
          {placement.barcode ?? unknown}
        </Fact>
        <Fact label={t('serverWarehouse.session.packageId')} code>
          {placement.packageId ?? unknown}
        </Fact>
      </View>
      {stop === '' ? null : (
        <View accessible accessibilityLabel={`${t('serverWarehouse.session.stop')}: ${stop}`} style={styles.fact}>
          <AppText color={colors.text3}>{t('serverWarehouse.session.stop')}</AppText>
          <View style={styles.stop}>
            {placement.stopSequence === null ? null : <StopDot number={placement.stopSequence} />}
            <AppText variant="label" style={styles.flex}>
              {stop}
            </AppText>
          </View>
        </View>
      )}
      <View style={styles.pair}>
        <Fact label={t('serverWarehouse.session.size')} code>
          {t('serverWarehouse.session.sizeValue', { length: cm(placement.lengthCm), width: cm(placement.widthCm), height: cm(placement.heightCm) })}
        </Fact>
        {placement.weightKg === null ? null : (
          <Fact label={t('serverWarehouse.session.weight')} code>
            {format.weight(placement.weightKg)}
          </Fact>
        )}
      </View>
      <View style={styles.fact}>
        <AppText color={colors.text3}>{t('serverWarehouse.session.position')}</AppText>
        <AppText variant="heading" style={styles.code}>
          {t('serverWarehouse.session.positionValue', { x: cm(placement.x), y: cm(placement.y), z: cm(placement.z) })}
        </AppText>
        <AppText color={colors.text2}>{t('serverWarehouse.session.positionHint')}</AppText>
      </View>
      {children}
    </Card>
  )
}

const OUTCOME_TONE = { confirmed: 'success', deviation: 'warning', damaged: 'danger', current: 'azure', pending: 'neutral' } as const satisfies Record<
  ServerPlacementState,
  keyof typeof badgeTones
>

/** Thứ tự xếp của phiên kèm trạng thái từng kiện bằng chữ (không chỉ màu); kiện đang xếp in đậm. */
export function ServerPlacementList({ rows }: { rows: readonly ServerLoadingRow[] }) {
  const t = useT()
  if (rows.length === 0) return null
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('serverWarehouse.session.list')}
      </AppText>
      <View accessibilityRole="list">
        {rows.map(({ placement, state, manualPending }, index) => (
          <View key={placement.id} style={[styles.row, index === rows.length - 1 && styles.lastRow]}>
            <AppText color={colors.text3} style={[styles.code, styles.step]}>
              {t('serverWarehouse.session.stepLabel', { step: index + 1 })}
            </AppText>
            <View style={styles.flex}>
              <AppText variant={state === 'current' ? 'label' : 'body'} numberOfLines={2}>
                {placement.name}
              </AppText>
              {manualPending ? (
                <AppText variant="label" color={badgeTones.warning.fg}>
                  {t('serverWarehouse.session.manualPending')}
                </AppText>
              ) : null}
            </View>
            <Chip tone={OUTCOME_TONE[state]} label={t(`serverWarehouse.session.outcomes.${state}`)} />
          </View>
        ))}
      </View>
    </Card>
  )
}

function Fact({ label, code = false, children }: { label: string; code?: boolean; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="label" style={code ? styles.code : undefined}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[3] },
  fact: { flexGrow: 1, flexBasis: '40%', minWidth: 0, gap: 2 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  lastRow: { borderBottomWidth: 0 },
  step: { width: 64 },
})
