import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { MockResultTag } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { LiveMonitoring } from './monitoring-api'
import { SourceTag } from './monitoring-chips'

/**
 * "Vị trí xe" của màn giám sát một chuyến (như `LiveLocationBar` của web, chưa có bản đồ): nguồn của vị trí — "Mô phỏng" hay "GPS" —, giờ
 * của điểm vị trí, xe đang chạy hay đứng, nhãn **MOCK RESULT** vì giờ đến tính từ vị trí là kết quả của công thức mock, và câu nói giờ đến
 * tính thế nào. Chuyến đang chạy mà chưa có vị trí (tuyến còn điểm chưa có toạ độ) thì nói vậy; chuyến thôi chạy và không còn vị trí thì
 * không có thẻ.
 */
export function LiveLocationCard({ tripId, live, running }: { tripId: string; live: LiveMonitoring; running: boolean }) {
  const t = useT()
  const format = useFormat()
  const { location } = live
  if (location === null && !running) return null
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('monitoring.location.title')}
      </AppText>
      {location === null ? (
        <AppText color={colors.text2}>{t('monitoring.map.noPosition', { id: tripId })}</AppText>
      ) : (
        <>
          <View style={styles.row}>
            <SourceTag source={location.source} />
            {live.isMockResult ? <MockResultTag /> : null}
          </View>
          <AppText>
            {location.speedKmh > 0
              ? t('monitoring.location.moving', { time: format.time(location.recordedAt), speed: format.integer(location.speedKmh) })
              : t('monitoring.location.standing', { time: format.time(location.recordedAt) })}
          </AppText>
          <AppText color={colors.text3}>{t('monitoring.location.basis')}</AppText>
        </>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
})
