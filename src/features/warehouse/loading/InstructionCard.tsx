import { Package, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { StopDot } from '@/components/StopDot'
import type { VehicleObstacle } from '@/domain/models'
import type { ScenePlacement, ViewerSceneModel } from '@/features/viewer3d/scene-input'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import { measureStep, nearestObstacle, stepNote, zonePlace, type StepMeasurements } from '../describe-step'
import { HoldSketch } from './HoldSketch'
import { OrientationBlock } from './OrientationBlock'

type InstructionCardProps = {
  /** Kiện của bước đang hỏi. */
  readonly placement: ScenePlacement
  readonly model: Pick<ViewerSceneModel, 'vehicle' | 'placements' | 'stops' | 'zones'>
  /** Kiện kho đã ghi "đã xếp" — sơ đồ thùng vẽ chúng nhạt. */
  readonly loadedIds: ReadonlySet<string>
}

/**
 * Thẻ hướng dẫn xếp một kiện (như `PackageInstructionCard` của web, bố cục điện thoại một cột): mã kiện thật lớn, tên, vùng của kiện
 * trong thùng ("Vùng <điểm giao> — sát cửa"; phương án không chia vùng thì không có dòng này), điểm giao (số trên màu điểm kèm tên);
 * sơ đồ thùng nhìn từ trên thay khung 3D; vị trí và khối lượng; hướng đặt kèm hình; ghi chú; khoảng cách tới vách, sàn, kiện phía dưới
 * và vật cản gần nhất (trong `ADJACENT_OBSTACLE_CM`). Mọi số cm, kg theo ngôn ngữ đang chọn.
 */
export function InstructionCard({ placement, model, loadedIds }: InstructionCardProps) {
  const t = useT()
  const format = useFormat()
  const stopName = model.stops.find((stop) => stop.number === placement.stop)?.name ?? ''
  const zone = zonePlace(model.zones, placement.zoneId)
  const measured = measureStep(placement, model.placements, model.vehicle)
  const position = t('warehouse.layer', { layer: format.integer(measured.layer), rear: format.length(measured.rearCm) })
  const weight = format.weight(placement.weightKg)
  const stop = t('warehouse.card.stop', { number: placement.stop, name: stopName })
  return (
    <Card>
      <View style={styles.identity}>
        <AppText color={colors.text3}>{t('warehouse.card.title')}</AppText>
        <AppText variant="display" accessibilityRole="header" style={styles.code}>
          {placement.id}
        </AppText>
        <AppText color={colors.text2}>{placement.name}</AppText>
        {zone === undefined ? null : (
          <AppText variant="label">{t('warehouse.card.zone', { name: zone.name, place: t(`warehouse.card.zonePlace.${zone.place}`) })}</AppText>
        )}
        {/* Một lượt đọc: số trên chấm màu đã có trong câu */}
        <View accessible accessibilityLabel={stop} style={styles.stop}>
          <StopDot number={placement.stop} />
          <AppText variant="label" style={styles.flex}>
            {stop}
          </AppText>
        </View>
      </View>

      <HoldSketch vehicle={model.vehicle} placements={model.placements} loadedIds={loadedIds} currentId={placement.id} />

      <View style={styles.tiles}>
        <Tile label={t('warehouse.tiles.position')} value={position} grow={1.7} />
        <Tile label={t('warehouse.tiles.weight')} value={weight} grow={1} code />
      </View>

      <OrientationBlock placement={placement} />
      <StepNote placement={placement} placements={model.placements} />
      <Distances placement={placement} measured={measured} obstacles={model.vehicle.obstacles} />
    </Card>
  )
}

/** Một ô số: nhãn và giá trị đọc liền một lượt với trình đọc màn hình. */
function Tile({ label, value, grow, code = false }: { label: string; value: string; grow: number; code?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={[styles.tile, { flexGrow: grow }]}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="heading" style={code ? styles.code : undefined}>
        {value}
      </AppText>
    </View>
  )
}

/** Ghi chú của bước: dễ vỡ (hổ phách, kèm icon cảnh báo), nặng, đặt nằm hoặc lời nhắc mặc định. */
function StepNote({ placement, placements }: { placement: ScenePlacement; placements: readonly ScenePlacement[] }) {
  const t = useT()
  const note = stepNote(placement, placements)
  const warning = note.tone === 'warning'
  const fg = warning ? badgeTones.warning.fg : colors.text2
  const Icon = warning ? TriangleAlert : Package
  return (
    <View style={[styles.note, warning ? styles.noteWarning : styles.noteNeutral]}>
      <Icon color={fg} size={24} strokeWidth={1.5} />
      <AppText variant="heading" color={warning ? badgeTones.warning.fg : colors.text} style={styles.flex}>
        {t(`warehouse.notes.${note.code}`)}
      </AppText>
    </View>
  )
}

/** Khoảng cách cm tới vách, cửa, sàn; kiện ngay phía dưới; vật cản sát bên khi có. Mỗi dòng một lượt đọc "nhãn, giá trị". */
function Distances({ placement, measured, obstacles }: { placement: ScenePlacement; measured: StepMeasurements; obstacles: readonly VehicleObstacle[] }) {
  const t = useT()
  const format = useFormat()
  const obstacle = nearestObstacle(placement, obstacles)
  const rows: [string, string][] = [
    [t('warehouse.distances.front'), format.length(measured.frontCm)],
    [t('warehouse.distances.left'), format.length(measured.leftCm)],
    [t('warehouse.distances.right'), format.length(measured.rightCm)],
    [t('warehouse.distances.rear'), format.length(measured.rearCm)],
    [t('warehouse.distances.floor'), format.length(measured.floorCm)],
    [t('warehouse.distances.below'), measured.belowId ?? t('warehouse.distances.noneBelow')],
  ]
  if (obstacle !== undefined) {
    rows.push([
      t('warehouse.distances.obstacle'),
      t('warehouse.distances.obstacleValue', {
        type: t(`common.obstacleTypes.${obstacle.obstacle.type}`),
        id: obstacle.obstacle.id,
        gap: format.length(obstacle.gapCm),
      }),
    ])
  }
  return (
    <View style={styles.distances}>
      {rows.map(([label, value], index) => (
        <View key={label} accessible accessibilityLabel={`${label}, ${value}`} style={[styles.row, index > 0 && styles.divider]}>
          <AppText color={colors.text3} style={styles.rowLabel}>
            {label}
          </AppText>
          <AppText variant="label" style={styles.rowValue}>
            {value}
          </AppText>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  identity: { gap: space[1] },
  code: { fontVariant: ['tabular-nums'] },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: space[3] },
  tile: { flexBasis: 0, gap: space[1], padding: space[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.surface },
  note: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg, borderWidth: 1 },
  noteWarning: { backgroundColor: badgeTones.warning.bg, borderColor: badgeTones.warning.border },
  noteNeutral: { backgroundColor: colors.surface, borderColor: colors.lineSoft },
  distances: { paddingHorizontal: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space[3], paddingVertical: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  rowLabel: { flexShrink: 1 },
  rowValue: { flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
})
