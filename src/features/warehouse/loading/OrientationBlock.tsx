import { ArrowRight, ArrowUp, Box, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { OrientationFigure } from './OrientationFigure'

/**
 * Khối "Hướng đặt" của thẻ hướng dẫn (như khối cùng tên trong `PackageInstructionCard` của web): mã hướng đặt kèm câu đọc mã, hình
 * minh hoạ, rồi ba dòng nói bằng chữ điều hình vẽ — kích thước đã xoay, mũi tên đen, mũi tên xanh. Trên điện thoại hình và ba dòng xếp
 * dọc (web đặt cạnh nhau).
 */
export function OrientationBlock({ placement }: { placement: ScenePlacement }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <AppText color={colors.text3}>{t('warehouse.tiles.orientation')}</AppText>
        <AppText variant="heading">{`${placement.orientation} · ${t(`warehouse.orientations.${placement.orientation}`)}`}</AppText>
      </View>
      <OrientationFigure placement={placement} />
      <View style={styles.list}>
        <Line icon={Box} color={colors.text2} text={format.dimensions(placement.lengthCm, placement.widthCm, placement.heightCm)} code />
        <Line icon={ArrowRight} color={colors.text} text={t('warehouse.figure.doorArrow')} />
        <Line icon={ArrowUp} color={colors.primary} text={t('warehouse.figure.topArrow')} />
      </View>
    </View>
  )
}

function Line({ icon: Icon, color, text, code = false }: { icon: LucideIcon; color: string; text: string; code?: boolean }) {
  return (
    <View style={styles.line}>
      <Icon color={color} size={20} strokeWidth={1.5} style={styles.icon} />
      <AppText color={colors.text2} style={[styles.text, code && styles.code]}>
        {text}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.surface },
  head: { gap: space[1] },
  list: { gap: space[2] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { marginTop: 2 },
  text: { flex: 1 },
  code: { fontVariant: ['tabular-nums'] },
})
