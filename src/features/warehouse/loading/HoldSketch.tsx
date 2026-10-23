import { useMemo } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Svg, { Rect } from 'react-native-svg'

import { AppText } from '@/components/AppText'
import type { ScenePlacement, ViewerSceneModel } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { colors, palette, radius, space } from '@/theme/tokens'

import { holdSketch, type SketchRect } from './hold-sketch'

/*
 * Kiện đang xếp: màu kiện "Hiện tại" trên nền 3D của web (`colors.highlight`). Không chữ nào nằm trên màu này. Viền trắng tách kiện khỏi
 * kiện đã lên xe và nền tối bên cạnh (4,1:1 với viền, 12:1 với thân kiện đã lên xe); ô chú giải viền tối (11,6:1).
 */
const CURRENT_FILL = colors.highlight
/** Vật cản trong thùng: xám trung tính, không trùng màu điểm giao (web: `--obstacle`). */
const OBSTACLE_FILL = palette.neutral[500]
/** Nét viền theo cm của hình: 1/300 chiều dài thùng — khoảng 1 dp khi thùng chiếm bề ngang điện thoại. */
const LINE_RATIO = 1 / 300

type HoldSketchProps = {
  readonly vehicle: ViewerSceneModel['vehicle']
  readonly placements: readonly ScenePlacement[]
  /** Kiện kho đã ghi "đã xếp" (kiện hỏng bị bỏ lại kho không có ở đây). */
  readonly loadedIds: ReadonlySet<string>
  readonly currentId: string | undefined
}

/**
 * Sơ đồ lòng thùng nhìn từ trên xuống, đúng tỉ lệ — bản điện thoại thay khung 3D của web (app chưa có Three.js): vách trước bên trái,
 * cửa sau bên phải (vạch cyan ở mép), kiện đã lên xe nhạt, kiện đang xếp nổi màu, vật cản xám. Hình chỉ giúp nhìn nhanh chỗ đặt; mọi ý
 * của nó thẻ hướng dẫn đã nói bằng chữ và số, nên cả khối ẩn với trình đọc màn hình. Không có màu điểm giao: màu định danh điểm luôn phải
 * đi kèm số, mà số không đọc được trên hình nhỏ.
 */
export function HoldSketch({ vehicle, placements, loadedIds, currentId }: HoldSketchProps) {
  const t = useT()
  const sketch = useMemo(() => holdSketch(vehicle, placements, loadedIds, currentId), [vehicle, placements, loadedIds, currentId])
  const line = sketch.lengthCm * LINE_RATIO
  const box = (rect: SketchRect, fill: string, stroke: string, width: number) => (
    <Rect key={rect.id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={fill} stroke={stroke} strokeWidth={width} />
  )
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.root}>
      <View style={styles.ends}>
        <AppText color={colors.text3}>{t('warehouse.figure.front')}</AppText>
        <AppText variant="label">{t('warehouse.figure.door')}</AppText>
      </View>
      <View style={[styles.frame, { aspectRatio: sketch.lengthCm / sketch.widthCm }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${sketch.lengthCm} ${sketch.widthCm}`}>
          {sketch.obstacles.map((rect) => box(rect, OBSTACLE_FILL, OBSTACLE_FILL, 0))}
          {sketch.loaded.map((rect) => box(rect, colors.skySolid, colors.skySolidBorder, line))}
          {sketch.current === undefined ? null : box(sketch.current, CURRENT_FILL, colors.skyText, line * 2)}
          <Rect x={sketch.lengthCm - line * 3} y={0} width={line * 3} height={sketch.widthCm} fill={colors.primaryFill} />
        </Svg>
      </View>
      <View style={styles.legend}>
        <Key swatch={styles.current} label={t('warehouseLoading.sketch.current')} />
        <Key swatch={styles.loaded} label={t('warehouseLoading.sketch.loaded')} />
        {sketch.obstacles.length > 0 ? <Key swatch={styles.obstacle} label={t('warehouseLoading.sketch.obstacle')} /> : null}
      </View>
    </View>
  )
}

function Key({ swatch, label }: { swatch: ViewStyle; label: string }) {
  return (
    <View style={styles.key}>
      <View style={[styles.swatch, swatch]} />
      <AppText color={colors.text2}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  ends: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  frame: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sky },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[1] },
  key: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  swatch: { width: space[4], height: space[4], borderRadius: radius.sm, borderWidth: 1 },
  current: { backgroundColor: CURRENT_FILL, borderColor: colors.text },
  loaded: { backgroundColor: colors.skySolid, borderColor: colors.skySolidBorder },
  obstacle: { backgroundColor: OBSTACLE_FILL, borderColor: OBSTACLE_FILL },
})
