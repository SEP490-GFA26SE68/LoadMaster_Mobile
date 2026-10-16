import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, palette, radius, space, TOUCH } from '@/theme/tokens'

import { useDeviceLocation, type DeviceLocationState } from './useDeviceLocation'

/**
 * Công tắc "Dùng GPS thật" trên màn điểm giao khi chuyến Đang vận chuyển (như `DriverGpsToggle` của web). Một hàng 56 px: nhãn, nhãn nguồn
 * vị trí ("GPS" khi đang gửi; "Mô phỏng" khi không — chỉ với kho mẫu, nơi có xe mô phỏng) và công tắc; cả hàng là một công tắc cho trình đọc
 * màn hình. Dưới là một dòng trạng thái — đang chờ quyền, đã gửi lúc nào, hoặc vì sao đã tắt — kèm nút mở Cài đặt khi thiếu quyền hay
 * định vị tắt. Với kho mẫu có thêm câu nói vị trí chỉ lưu trên máy này. Rời màn chuyến là dừng theo dõi (`useDeviceLocation`).
 */
export function GpsToggle({ tripId, localOnly }: { tripId: string; localOnly: boolean }) {
  const t = useT()
  const { enabled, state, toggle } = useDeviceLocation(tripId)
  const active = state.status === 'active'
  return (
    <Card accessibilityLabel={t('driver.gps.title')} style={styles.card}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t('driver.gps.toggle')}
        accessibilityState={{ checked: enabled }}
        onPress={() => toggle(!enabled)}
        style={styles.row}>
        <AppText variant="heading" style={styles.flex}>
          {t('driver.gps.toggle')}
        </AppText>
        {active || localOnly ? <Chip tone={active ? 'success' : 'neutral'} label={t(`driver.gps.sources.${active ? 'GPS' : 'SIMULATED'}`)} /> : null}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Switch
            value={enabled}
            onValueChange={toggle}
            trackColor={{ false: palette.neutral[500], true: colors.primary }}
            thumbColor={colors.bg}
            ios_backgroundColor={palette.neutral[500]}
          />
        </View>
      </Pressable>
      <GpsStatus state={state} localOnly={localOnly} />
      {localOnly ? <AppText color={colors.text3}>{t('driver.gps.localOnly')}</AppText> : null}
    </Card>
  )
}

/** Dòng trạng thái của GPS thật; chưa bật lần nào thì không có dòng nào. Đổi trạng thái thì trình đọc màn hình đọc. */
function GpsStatus({ state, localOnly }: { state: DeviceLocationState; localOnly: boolean }) {
  const t = useT()
  const format = useFormat()
  if (state.status === 'off' && state.reason === undefined) return null
  if (state.status !== 'off') {
    return (
      <AppText color={colors.text2} accessibilityLiveRegion="polite">
        {state.status === 'requesting' ? t('driver.gps.requesting') : t('driver.gps.sent', { time: format.time(state.sentAt) })}
      </AppText>
    )
  }
  const reason = state.reason ?? 'user'
  const sentence = reason === 'error' ? t('driver.gps.stopped.error', { message: dataErrorMessage(state.error, t) }) : t(`driver.gps.stopped.${reason}`)
  const message = localOnly ? `${sentence} ${t('driver.gps.simulated')}` : sentence
  if (reason === 'user') {
    return (
      <AppText color={colors.text2} accessibilityLiveRegion="polite">
        {message}
      </AppText>
    )
  }
  return (
    <View style={styles.warning} accessibilityLiveRegion="polite">
      <AppText variant="label" color={badgeTones.warning.fg}>
        {message}
      </AppText>
      {reason === 'denied' || reason === 'servicesOff' ? (
        <Button variant="secondary" onPress={() => void Linking.openSettings()}>
          {t('driver.gps.openSettings')}
        </Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space[1], paddingTop: 0 },
  row: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
  warning: {
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: badgeTones.warning.border,
    backgroundColor: badgeTones.warning.bg,
  },
})
