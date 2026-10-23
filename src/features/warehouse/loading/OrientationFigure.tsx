import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Polygon, Polyline } from 'react-native-svg'

import { AppText } from '@/components/AppText'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { boxFaces, createProjector } from '@/lib/isometric'
import { stopColor } from '@/lib/stops'
import { colors, space } from '@/theme/tokens'

import { orientationHint } from '../describe-step'

/*
 * Số của hình chép đúng `OrientationFigure` của web để hai bản vẽ cùng một hình: khung 260 × 180 đơn vị, gốc phép chiếu ở (110, 112).
 */
const SCALE = 34
/** 1 m thật = 4 đơn vị hình để kiện 40 cm hiện to rõ… */
const UNITS_PER_CM = 4 / 100
/** …nhưng cạnh dài nhất không quá 3 đơn vị để kiện dựng đứng vẫn nằm trong khung. */
const MAX_EDGE_UNITS = 3
const ARROW_UNITS = 0.9
const VIEW_WIDTH = 260
const VIEW_HEIGHT = 180
const ORIGIN = { x: 110, y: 112 } as const
/** Viền mặt kiện: màu chữ đậm nhất ở độ đậm 25 %, như viền `rgba(0,0,0,.25)` của web. */
const FACE_STROKE_OPACITY = 0.25

type Point = [number, number, number]
type FigureInput = Pick<ScenePlacement, 'lengthCm' | 'widthCm' | 'heightCm' | 'stop' | 'orientation'>

/** Hình học của minh hoạ (chuỗi điểm SVG), tính một lần cho mỗi kiện. */
function figureOf(placement: FigureInput) {
  const project = createProjector(SCALE)
  const k = Math.min(UNITS_PER_CM, MAX_EDGE_UNITS / Math.max(placement.lengthCm, placement.widthCm, placement.heightCm))
  const l = placement.lengthCm * k
  const w = placement.widthCm * k
  const h = placement.heightCm * k
  const at = (point: Point) => project(...point)

  const floor = [at([-0.6, -0.6, 0]), at([l + 1.6, -0.6, 0]), at([l + 1.6, w + 0.6, 0]), at([-0.6, w + 0.6, 0])].join(' ')
  const faces = boxFaces({ x: 0, y: 0, z: 0, length: l, width: w, height: h, color: stopColor(placement.stop) }, project, {
    stroke: colors.text,
    strokeWidth: 0.8,
    topTint: 0.08,
  })
  const ax = l + 0.25
  const ay = w / 2
  const door = [at([ax, ay, 0.02]), at([ax + 1.1, ay, 0.02])].join(' ')
  const doorHead = [at([ax + 1.1, ay - 0.18, 0.02]), at([ax + 1.4, ay, 0.02]), at([ax + 1.1, ay + 0.18, 0.02])].join(' ')

  // Mũi tên xanh mọc từ mặt trên gốc của kiện: ba mặt thấy được của phép chiếu là +X, +Y và mặt trên
  const axis = orientationHint(placement.orientation).heightAxis
  const start: Point = axis === 'z' ? [l / 2, w / 2, h] : axis === 'y' ? [l / 2, w, h / 2] : [l, w / 2, h / 2]
  const [sx, sy, sz] = start
  const end: Point = axis === 'z' ? [sx, sy, sz + ARROW_UNITS] : axis === 'y' ? [sx, sy + ARROW_UNITS, sz] : [sx + ARROW_UNITS, sy, sz]
  const tip = at(end)
  const [tipX = '0', tipY = '0'] = tip.split(',')

  return { floor, faces, door, doorHead, top: `${at(start)} ${tip}`, tipX, tipY }
}

/**
 * Minh hoạ hướng đặt theo mã Spec (như `OrientationFigure` của web): kiện đúng tỉ lệ kích thước đã xoay, mang màu điểm giao của nó;
 * mũi tên đen trên sàn chỉ ra cửa sau, mũi tên xanh mọc từ mặt trên gốc — lên trên với LWH/WLH, sang vách bên với LHW/WHL, dọc thùng
 * với HLW/HWL. Chữ "Vách trước", "Cửa sau" và mã hướng đặt nằm ngoài hình (chữ của app, theo cỡ chữ của máy) thay vì vẽ trong SVG.
 * Trình đọc màn hình đọc cả khối là một hình kèm câu mô tả; danh sách bên dưới nói lại từng ý bằng chữ.
 */
export function OrientationFigure({ placement }: { placement: FigureInput }) {
  const t = useT()
  const figure = useMemo(() => figureOf(placement), [placement])
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t('warehouse.figure.label', { code: placement.orientation })} style={styles.root}>
      <View style={styles.row}>
        <AppText color={colors.text3}>{t('warehouse.figure.front')}</AppText>
        <AppText variant="label" style={styles.code}>
          {placement.orientation}
        </AppText>
      </View>
      <View style={styles.frame}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
          <G transform={`translate(${ORIGIN.x},${ORIGIN.y})`}>
            <Polygon points={figure.floor} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
            {figure.faces.map((face, index) => (
              <Polygon
                key={index}
                points={face.points}
                fill={face.fill}
                stroke={face.stroke}
                strokeOpacity={FACE_STROKE_OPACITY}
                strokeWidth={face.strokeWidth}
                strokeLinejoin="round"
              />
            ))}
            <Polyline points={figure.door} fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Polygon points={figure.doorHead} fill={colors.text} />
            <Polyline points={figure.top} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={figure.tipX} cy={figure.tipY} r={5} fill={colors.primary} />
          </G>
        </Svg>
      </View>
      <AppText variant="label" style={styles.door}>
        {t('warehouse.figure.door')}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { width: '100%', maxWidth: VIEW_WIDTH, alignSelf: 'center', gap: space[1] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  frame: { width: '100%', aspectRatio: VIEW_WIDTH / VIEW_HEIGHT },
  door: { alignSelf: 'flex-end' },
})
