import { Phone } from 'lucide-react-native'
import { Linking, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { StopInfo, StopScreen } from './driver-model'
import { EtaSourceLine, TimingChip, useMoment } from './StopTimingParts'

/**
 * Điểm đang tới (như `StopContactCard` của web): tên, địa chỉ, người nhận và số điện thoại; giữa là giờ đến và hạn giao của điểm; dưới là
 * nút phụ "Gọi" (chỉ khi điểm có số). Chỉ đường nằm trong app (`DriverNavigation`), không mở Google Maps.
 */
export function StopContactCard({ screen }: { screen: StopScreen }) {
  const t = useT()
  const { stop } = screen
  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="title">{stop.name}</AppText>
        <AppText color={colors.text2}>{stop.address}</AppText>
        {stop.phone === undefined ? null : (
          <AppText color={colors.text2}>{stop.contactName === undefined ? stop.phone : t('driver.contact', { name: stop.contactName, phone: stop.phone })}</AppText>
        )}
      </View>
      <StopEta screen={screen} />
      <ContactButtons stop={stop} />
    </Card>
  )
}

function ContactButtons({ stop }: { stop: StopInfo }) {
  const t = useT()
  const { phone } = stop
  if (phone === undefined) return null
  return (
    <View style={styles.buttons}>
      <Button
        variant="secondary"
        icon={Phone}
        style={styles.flex}
        accessibilityLabel={t('driver.call', { name: stop.contactName ?? stop.name })}
        onPress={() => void Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)}>
        {t('driver.callLabel')}
      </Button>
    </View>
  )
}

function StopEta({ screen }: { screen: StopScreen }) {
  const t = useT()
  const moment = useMoment()
  const { timing } = screen
  if (timing === undefined) return null
  const { deadline, arrival, expected } = timing
  return (
    <View style={styles.eta}>
      {arrival !== undefined ? <Fact label={t('driver.timing.arrived')} value={moment(arrival.at)} /> : null}
      {arrival === undefined && expected !== undefined ? <Fact label={t('driver.timing.expected')} value={moment(expected.eta)} /> : null}
      <View style={styles.fact}>
        <AppText color={colors.text3} style={styles.factLabel}>
          {t('driver.timing.deadline')}
        </AppText>
        <View style={styles.factValue}>
          {deadline === undefined ? (
            <AppText color={colors.text2}>{t('driver.timing.noDeadline')}</AppText>
          ) : (
            <AppText variant="label" style={styles.time}>
              {moment(deadline)}
            </AppText>
          )}
          <TimingChip timing={timing} />
        </View>
      </View>
      <EtaSourceLine sources={arrival === undefined && expected !== undefined ? [expected.source] : []} />
    </View>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText color={colors.text3} style={styles.factLabel}>
        {label}
      </AppText>
      <AppText variant="label" style={[styles.flex, styles.time]}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: space[1] },
  buttons: { flexDirection: 'row', gap: space[2] },
  eta: { gap: space[2], paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  factLabel: { width: 112 },
  factValue: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  time: { fontVariant: ['tabular-nums'] },
})
