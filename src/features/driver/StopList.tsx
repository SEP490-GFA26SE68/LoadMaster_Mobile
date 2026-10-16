import { ChevronDown, ChevronUp, MapPin, PackagePlus } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { StopDot } from '@/components/StopDot'
import { useT } from '@/lib/i18n'
import { colors, palette, radius, shadow, space, TOUCH } from '@/theme/tokens'

import type { StopScreen } from './driver-model'
import { EtaSourceLine, StopListTime } from './StopTimingParts'

/**
 * Danh sách các điểm của chuyến trên màn điểm giao (như `DriverStopList` của web): mỗi điểm một dòng gồm số điểm có màu điểm giao, **biểu
 * tượng và chữ** nói loại điểm — gói hàng "Điểm nhận hàng", ghim "Điểm giao hàng" —, tên điểm và trạng thái (đã xong / đang ở điểm này /
 * chưa tới). Thu gọn sẵn trong một dòng 56 px; mở ra khi cần xem cả tuyến. Màn chỉ vẽ nó khi chuyến có điểm nhận dọc đường. Điểm chưa xong
 * có dòng giờ ("Dự kiến HH:mm" hoặc "Đã đến HH:mm", mức hạn bằng chữ); cuối danh sách một dòng nguồn kèm MOCK RESULT.
 */
export function StopList({ screen }: { screen: StopScreen }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const { stops, stop: current } = screen
  const sources = [...new Set(stops.flatMap((stop) => (!stop.done && stop.timing?.arrival === undefined && stop.timing?.expected !== undefined ? [stop.timing.expected.source] : [])))]
  const Chevron = open ? ChevronUp : ChevronDown
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <AppText variant="heading" style={styles.flex}>
          {t('driver.stopList.summary', { count: stops.length })}
        </AppText>
        <Chevron color={colors.text3} size={24} strokeWidth={1.5} />
      </Pressable>
      {open ? (
        <View accessibilityLabel={t('driver.stopList.label')} style={styles.list}>
          {stops.map((stop, index) => {
            const pickup = stop.kind === 'PICKUP'
            const Icon = pickup ? PackagePlus : MapPin
            const state = stop.done ? 'done' : stop.number === current.number ? 'current' : 'waiting'
            const timing = stop.done ? undefined : stop.timing
            return (
              <View
                key={stop.number}
                accessible
                accessibilityLabel={[t('driver.stopTitle', { number: stop.number, total: stops.length }), stop.name, t(`driver.stopKinds.${stop.kind}`), t(`driver.stopList.state.${state}`)].join(', ')}
                style={[styles.row, index === stops.length - 1 && styles.last, state === 'current' && styles.current]}>
                <View style={styles.rowHead}>
                  <StopDot number={stop.number} />
                  <View style={styles.flex}>
                    <AppText variant="label">{stop.name}</AppText>
                    <View style={styles.kind}>
                      <Icon color={colors.text2} size={16} strokeWidth={1.5} />
                      <AppText color={colors.text2}>{t(`driver.stopKinds.${stop.kind}`)}</AppText>
                    </View>
                  </View>
                  <AppText color={colors.text3}>{t(`driver.stopList.state.${state}`)}</AppText>
                </View>
                {timing === undefined ? null : (
                  <View style={styles.time}>
                    <StopListTime timing={timing} />
                  </View>
                )}
              </View>
            )
          })}
          {sources.length === 0 ? null : (
            <View style={styles.sources}>
              <EtaSourceLine sources={sources} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  summary: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], borderRadius: radius.lg },
  pressed: { backgroundColor: colors.surface },
  flex: { flex: 1 },
  list: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  row: { minHeight: TOUCH, justifyContent: 'center', gap: space[1], paddingHorizontal: space[4], paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  last: { borderBottomWidth: 0 },
  current: { backgroundColor: palette.cyan[50] },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  kind: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  time: { paddingLeft: 44 },
  sources: { paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
})
