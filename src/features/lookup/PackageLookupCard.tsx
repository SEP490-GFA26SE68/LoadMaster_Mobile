import { ChevronLeft, CircleCheck } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { PackageLookup } from './lookup-api'
import { lookupActions } from './lookup-model'
import { HandlingClassChip, PackageFlagTag, PackageStatusChip } from './package-look'
import { useLookupCapabilities, useReportPackageFoundMutation } from './useLookupQueries'

type PackageLookupCardProps = {
  item: PackageLookup
  /** Kiện vừa được gỡ cờ "Không tìm thấy" trong lần tra này: hiện dòng xác nhận. */
  justFound: boolean
  onFound: (packageId: string) => void
  /** Về danh sách kiện trùng mã; vắng khi mã chỉ khớp một kiện. */
  onBack?: () => void
}

/**
 * Thẻ một kiện của tab Tra cứu kiện (như `PackageLookupCard` của web, một cột cho điện thoại): mã của bên gửi là tiêu đề — trình đọc màn
 * hình đọc "Kiện <mã>" —, trạng thái và cờ, rồi từng mục: mã của kho, mã của bên gửi, mã QR, kích thước, khối lượng, loại hàng, điểm
 * đến, chuyến và điểm giao. Kiện mang cờ "Không tìm thấy" có nút xác nhận đã tìm thấy ngay dưới tiêu đề, không ở cuối thẻ dài; câu lỗi
 * của lần xác nhận ở lại trên thẻ cả khi cờ đã được người khác gỡ. In lại nhãn, mở Kho kiện, mở chuyến, gỡ cờ của điều phối viên không
 * có trên điện thoại.
 */
export function PackageLookupCard({ item, justFound, onFound, onBack }: PackageLookupCardProps) {
  const t = useT()
  const format = useFormat()
  const capabilities = useLookupCapabilities()
  const found = useReportPackageFoundMutation()
  const actions = lookupActions(item.package, capabilities)
  const { package: pkg, trip, stop } = item
  const tripLines = pkg.tripId === undefined ? [t('lookup.fields.notInTrip')] : [pkg.tripId, ...(trip === undefined ? [] : [trip.name])]

  return (
    <View style={styles.root}>
      {onBack === undefined ? null : (
        <Button variant="secondary" icon={ChevronLeft} onPress={onBack} style={styles.back}>
          {t('lookup.many.back')}
        </Button>
      )}
      <Card>
        <View style={styles.head}>
          <AppText variant="title" accessibilityRole="header" accessibilityLabel={t('lookup.result', { code: pkg.packageCode })} style={styles.code}>
            {pkg.packageCode}
          </AppText>
          <View style={styles.chips}>
            <PackageStatusChip status={pkg.status} />
            {pkg.flags.map((flag) => (
              <PackageFlagTag key={flag} flag={flag} />
            ))}
          </View>
        </View>

        {justFound ? <Banner tone="success">{t('lookup.found.done', { code: pkg.packageCode })}</Banner> : null}

        {pkg.flags.length > 0 ? (
          <View style={styles.flags}>
            <AppText color={actions.confirmFound ? colors.text : colors.text2}>{actions.confirmFound ? t('lookup.found.prompt') : t('lookup.flagNote')}</AppText>
            {actions.confirmFound ? (
              <Button
                variant="secondary"
                icon={CircleCheck}
                loading={found.isPending}
                onPress={() => found.mutate(pkg.qrToken, { onSuccess: () => onFound(pkg.id) })}>
                {t('lookup.found.confirm')}
              </Button>
            ) : null}
          </View>
        ) : null}
        {found.isError ? <Banner tone="danger">{dataErrorMessage(found.error, t)}</Banner> : null}

        <View>
          <Fact label={t('lookup.fields.poolId')} value={pkg.id} code />
          <Fact label={t('lookup.fields.senderCode')} value={pkg.packageCode} code />
          <Fact label={t('lookup.fields.qrToken')} value={pkg.qrToken} code />
          <Fact label={t('lookup.fields.dimensions')} value={format.dimensions(pkg.lengthCm, pkg.widthCm, pkg.heightCm)} code />
          <Fact label={t('lookup.fields.weight')} value={format.weight(pkg.weightKg)} code />
          <Fact label={t('lookup.fields.handlingClass')} value={t(`common.handlingClasses.${pkg.handlingClass}`)}>
            <HandlingClassChip handlingClass={pkg.handlingClass} />
          </Fact>
          {pkg.destination === '' ? null : <Fact label={t('lookup.fields.destination')} value={pkg.destination} />}
          <Fact label={t('lookup.fields.trip')} value={tripLines.join(', ')}>
            {pkg.tripId === undefined ? (
              <AppText>{t('lookup.fields.notInTrip')}</AppText>
            ) : (
              <>
                <AppText style={styles.code}>{pkg.tripId}</AppText>
                {trip === undefined ? null : <AppText>{trip.name}</AppText>}
              </>
            )}
          </Fact>
          {stop === undefined ? null : (
            <Fact label={t('lookup.fields.stop')} value={t('lookup.fields.stopValue', { number: stop.number, name: stop.name })} />
          )}
          {pkg.flags.length === 0 ? <Fact label={t('lookup.fields.flags')} value={t('lookup.fields.noFlags')} /> : null}
        </View>
      </Card>
    </View>
  )
}

/**
 * Một mục của thẻ: nhãn trên, giá trị dưới — một phần tử đọc "nhãn: giá trị". `children` thay cách vẽ giá trị (chip, nhiều dòng); `value`
 * vẫn là chữ trình đọc màn hình đọc. `code`: mã và số đo, chữ số cùng bề rộng.
 */
function Fact({ label, value, code = false, children }: { label: string; value: string; code?: boolean; children?: ReactNode }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText color={colors.text3}>{label}</AppText>
      {children ?? <AppText style={code ? styles.code : undefined}>{value}</AppText>}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[3] },
  back: { alignSelf: 'flex-start' },
  head: { gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  flags: { gap: space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  fact: { gap: space[1], paddingVertical: space[2], borderTopWidth: 1, borderTopColor: colors.lineSoft },
})
