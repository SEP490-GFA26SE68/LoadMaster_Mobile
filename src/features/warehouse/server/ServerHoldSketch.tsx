import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { stopColor, stopForegroundToken } from '@/lib/stops'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import type { ServerLoadingSession, ServerPlacement } from '../warehouse-server-model'
import { serverHoldSketch, type SketchView, type StopRect } from './server-hold-sketch'

/** Nét viền theo cm: 1/300 cạnh dài của hình — khoảng 1 dp khi hình chiếm bề ngang điện thoại. */
const LINE_RATIO = 1 / 300
/** Kiện không có điểm giao (máy chủ không trả): xám, không trùng màu điểm nào. */
const NO_STOP_FILL = colors.skySolid

/** Chữ trên màu điểm giao: tối, trừ điểm 5 và 8 (như `stopForegroundToken` của web). */
const stopText = (stop: number) => (stopForegroundToken(stop) === '--bg' ? colors.bg : colors.text)

type ServerHoldSketchProps = { readonly session: ServerLoadingSession; readonly current: ServerPlacement | undefined }

/**
 * Sơ đồ lòng thùng của bước Xếp ở phiên máy chủ, đúng tỉ lệ: nhìn từ trên xuống (vách trước bên trái, cửa sau bên phải — vạch cyan ở mép)
 * và nhìn từ cửa sau vào. Kiện đã lên xe và kiện đang xếp tô theo màu điểm giao, số điểm in trên kiện đủ lớn; kiện đang xếp có viền trắng
 * dày. Chú giải liệt kê từng điểm bằng số và tên, nên màu không bao giờ đứng một mình. Hình chỉ giúp nhìn nhanh chỗ đặt — vị trí đã có bằng số
 * trên thẻ kiện — nên ẩn với trình đọc màn hình. Phiên không có kích thước lòng thùng thì không vẽ gì.
 */
export function ServerHoldSketch({ session, current }: ServerHoldSketchProps) {
  const t = useT()
  const sketch = useMemo(() => serverHoldSketch(session, current), [session, current])
  if (sketch === null) return null
  return (
    <Card>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.root}>
        <AppText variant="heading">{t('warehouseServer.sketch.title')}</AppText>
        <AppText color={colors.text2}>{t('warehouseServer.sketch.top')}</AppText>
        <View style={styles.ends}>
          <AppText color={colors.text3}>{t('warehouse.figure.front')}</AppText>
          <AppText variant="label">{t('warehouse.figure.door')}</AppText>
        </View>
        <Figure view={sketch.top} door />
        <AppText color={colors.text2} style={styles.gap}>
          {t('warehouseServer.sketch.rear')}
        </AppText>
        <View style={styles.ends}>
          <AppText color={colors.text3}>{t('warehouseServer.sketch.left')}</AppText>
          <AppText color={colors.text3}>{t('warehouseServer.sketch.right')}</AppText>
        </View>
        <Figure view={sketch.rear} />
        <View style={styles.legend}>
          <View style={styles.key}>
            <View style={[styles.swatch, styles.current]} />
            <AppText color={colors.text2}>{t('warehouseServer.sketch.current')}</AppText>
          </View>
          {sketch.stops.map(({ number, name }) => (
            <View key={number} style={styles.key}>
              <View style={[styles.swatch, { backgroundColor: stopColor(number) }]}>
                <AppText variant="label" color={stopText(number)}>
                  {number}
                </AppText>
              </View>
              <AppText color={colors.text2} style={styles.flex}>
                {name === null ? t('warehouseServer.sketch.stop', { number }) : t('warehouseServer.stopNamed', { number, name })}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </Card>
  )
}

function Figure({ view, door = false }: { view: SketchView; door?: boolean }) {
  const scale = Math.max(view.width, view.height)
  const line = scale * LINE_RATIO
  const box = (rect: StopRect, isCurrent: boolean) => {
    const side = Math.min(rect.width, rect.height)
    const fontSize = Math.min(side * 0.6, scale / 12)
    return [
      <Rect
        key={rect.id}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={rect.stop === null ? NO_STOP_FILL : stopColor(rect.stop)}
        stroke={isCurrent ? colors.bg : colors.sky}
        strokeWidth={isCurrent ? line * 4 : line}
      />,
      rect.stop === null || side < scale / 16 ? null : (
        <SvgText
          key={`${rect.id}-n`}
          x={rect.x + rect.width / 2}
          y={rect.y + rect.height / 2 + fontSize * 0.35}
          fontSize={fontSize}
          fontWeight="600"
          textAnchor="middle"
          fill={stopText(rect.stop)}>
          {rect.stop}
        </SvgText>
      ),
    ]
  }
  return (
    <View style={[styles.frame, { aspectRatio: view.width / view.height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${view.width} ${view.height}`}>
        {view.loaded.map((rect) => box(rect, false))}
        {box(view.current, true)}
        {door ? <Rect x={view.width - line * 3} y={0} width={line * 3} height={view.height} fill={colors.primaryFill} /> : null}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  gap: { marginTop: space[2] },
  ends: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  frame: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sky },
  legend: { gap: space[2], marginTop: space[1] },
  key: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  swatch: { width: space[6], height: space[6], borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  current: { backgroundColor: colors.sky, borderWidth: 3, borderColor: colors.bg },
  flex: { flex: 1 },
})
