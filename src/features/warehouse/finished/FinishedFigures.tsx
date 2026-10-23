import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { StopDot } from '@/components/StopDot'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, shadow, space } from '@/theme/tokens'

import type { StopTally } from '../loading-session'

/*
 * Số liệu của màn Xếp xong (như `LoadingFinished` của web): mọi số đọc từ phương án kho đã xếp theo và các bước xếp đã ghi
 * (`loadingProgress`, `stopTallies`) — không số nào nghĩ ra.
 */

/**
 * Hai ô số: đã xếp trên tổng kiện của phương án, và kiện hỏng bị bỏ lại kho (nền hổ phách khi có — chữ vẫn nói đủ). Mỗi ô là một phần tử
 * đọc, tên nói đủ số và đơn vị.
 */
export function FinishedTiles({ loaded, total, left }: { loaded: number; total: number; left: number }) {
  const t = useT()
  const format = useFormat()
  const warn = left > 0
  const muted = warn ? badgeTones.warning.fg : colors.text3
  return (
    <View style={styles.tiles}>
      <View style={styles.tile} accessible accessibilityLabel={t('warehouse.finished.loaded', { loaded: format.integer(loaded), total: format.integer(total) })}>
        <AppText color={colors.text3}>{t('warehouse.finished.tiles.loaded')}</AppText>
        <View style={styles.figureRow}>
          <AppText variant="display" style={styles.code}>
            {format.integer(loaded)}
          </AppText>
          <AppText color={colors.text3}>{t('warehouse.finished.tiles.ofTotal', { total: format.integer(total) })}</AppText>
        </View>
      </View>
      <View style={[styles.tile, warn && styles.tileWarn]} accessible accessibilityLabel={t('warehouseFinished.leftOut', { count: left })}>
        <AppText color={muted}>{t('warehouse.finished.tiles.left')}</AppText>
        <View style={styles.figureRow}>
          <AppText variant="display" color={warn ? badgeTones.warning.fg : colors.text} style={styles.code}>
            {format.integer(left)}
          </AppText>
          <AppText color={muted}>{t('warehouse.finished.tiles.unit')}</AppText>
        </View>
      </View>
    </View>
  )
}

/** Kiện hỏng lúc xếp bị bỏ lại kho, theo thứ tự xếp: mã kiện, tên, điểm giao — kho để riêng các kiện này. Không có thì một câu nói vậy. */
export function DamagedList({ damaged }: { damaged: readonly ScenePlacement[] }) {
  const t = useT()
  if (damaged.length === 0) return <AppText color={colors.text2}>{t('warehouse.finished.noDamaged')}</AppText>
  return (
    <Section title={t('warehouse.finished.damagedTitle', { count: damaged.length })}>
      <View style={[styles.list, styles.warnList]}>
        {damaged.map((placement, index) => {
          const where = `${placement.name} · ${t('common.stop', { number: placement.stop })}`
          return (
            <View
              key={placement.id}
              accessible
              accessibilityLabel={`${placement.id}, ${where}`}
              style={[styles.damaged, index === damaged.length - 1 && styles.last]}>
              <AppText variant="label" style={styles.code}>
                {placement.id}
              </AppText>
              <AppText color={colors.text2}>{where}</AppText>
            </View>
          )
        })}
      </View>
    </Section>
  )
}

/**
 * "Theo điểm giao": mỗi điểm có kiện của phương án một dòng — số điểm trên màu điểm giao, tên, kiện đã lên xe trên tổng kiện của điểm, và
 * số kiện bỏ lại khi có. Trình đọc màn hình đọc mỗi dòng thành một câu (màu luôn đi kèm số).
 */
export function StopTallyList({ tallies }: { tallies: readonly StopTally[] }) {
  const t = useT()
  const format = useFormat()
  if (tallies.length === 0) return null
  return (
    <Section title={t('warehouse.finished.byStop.title')}>
      <View style={styles.list}>
        {tallies.map((tally, index) => {
          const loaded = tally.total - tally.left
          const left = tally.left > 0 ? t('warehouse.finished.byStop.left', { count: tally.left }) : undefined
          const spoken = [t('common.stop', { number: tally.stop }), tally.name, t('warehouseFinished.stopLoaded', { loaded, total: tally.total })]
          return (
            <View
              key={tally.stop}
              accessible
              accessibilityLabel={[...spoken, ...(left === undefined ? [] : [left])].join(', ')}
              style={[styles.stop, index === tallies.length - 1 && styles.last]}>
              <StopDot number={tally.stop} />
              <AppText style={styles.stopName}>{tally.name}</AppText>
              <View style={styles.stopCount}>
                <AppText variant="label" style={styles.code}>
                  {format.integer(loaded)}
                  <AppText color={colors.text3}>{` / ${format.integer(tally.total)}`}</AppText>
                </AppText>
                {left === undefined ? null : (
                  <AppText variant="label" color={badgeTones.warning.fg}>
                    {left}
                  </AppText>
                )}
              </View>
            </View>
          )
        })}
      </View>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    flexGrow: 1,
    flexBasis: '40%',
    gap: space[1],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    ...shadow.card,
  },
  tileWarn: { borderColor: badgeTones.warning.border, backgroundColor: badgeTones.warning.bg },
  figureRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space[1] },
  code: { fontVariant: ['tabular-nums'] },
  section: { gap: space[2] },
  list: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  warnList: { borderColor: badgeTones.warning.border, backgroundColor: badgeTones.warning.bg },
  damaged: { gap: space[1], paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: badgeTones.warning.border },
  stop: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  stopName: { flex: 1, minWidth: 0 },
  stopCount: { alignItems: 'flex-end' },
  last: { borderBottomWidth: 0 },
})
