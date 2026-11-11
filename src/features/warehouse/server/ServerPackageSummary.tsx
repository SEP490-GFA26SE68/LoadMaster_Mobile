import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { StopDot } from '@/components/StopDot'
import { useT, type TFunction } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { placementLabel } from '../server-loading'
import type { ServerPlacement } from '../warehouse-server-model'

/**
 * Điểm giao của một kiện máy chủ trả, bằng chữ: "Điểm n · tên điểm", "Điểm n", chỉ tên điểm, hoặc chuỗi rỗng khi máy chủ không trả gì.
 */
export function serverStopText(placement: ServerPlacement, t: TFunction): string {
  const { stopSequence: number, stopName: name } = placement
  if (number === null) return name ?? ''
  return name === null ? t('common.stop', { number }) : t('warehouseServer.stopNamed', { number, name })
}

/**
 * Một kiện của phiên máy chủ (như `PackageSummary` của bản kho mẫu): mã in trên nhãn (chữ số đều), tên, và điểm giao — chấm màu mang số
 * điểm (trình đọc màn hình bỏ qua, chữ bên cạnh đã nói). Máy chủ không trả số điểm thì không có chấm; không trả gì thì không có dòng điểm.
 */
export function ServerPackageSummary({ placement }: { placement: ServerPlacement }) {
  const t = useT()
  const stop = serverStopText(placement, t)
  return (
    <View style={styles.summary}>
      <AppText variant="label" style={styles.code}>
        {placementLabel(placement)}
      </AppText>
      <AppText color={colors.text2}>{placement.name}</AppText>
      {stop === '' ? null : (
        <View style={styles.stop}>
          {placement.stopSequence === null ? null : (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <StopDot number={placement.stopSequence} />
            </View>
          )}
          <AppText variant="label" color={colors.text2} style={styles.flex}>
            {stop}
          </AppText>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { gap: space[1] },
  code: { fontVariant: ['tabular-nums'] },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
})
