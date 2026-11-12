import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import { useStartDeliveryMutation } from './useDriverQueries'

/**
 * "Xuất phát" ở thẻ chuyến Đang xếp hàng khi nguồn là máy chủ (`departFromList`, như `DepartButton` của web): máy chủ không mở màn điểm
 * giao trước khi xe chạy, nên xuất phát ngay ở thẻ. Kho chưa xếp xong thì nút mờ, lý do (`blockedReason`) nằm ở dòng ngay trên nút và được
 * đọc kèm nút. Máy chủ vẫn từ chối thì dải lỗi trong thẻ nói lý do, không đổi gì; xong thì mở điểm giao đầu tiên.
 */
export function DepartButton({
  tripId,
  tripCode,
  primary,
  blockedReason,
  href,
}: {
  tripId: string
  tripCode: string
  primary: boolean
  blockedReason: string | undefined
  href: { readonly pathname: '/trip/[tripId]'; readonly params: { readonly tripId: string } }
}) {
  const t = useT()
  const router = useRouter()
  const start = useStartDeliveryMutation(tripId)
  const label = t('driver.start')

  function handleDepart() {
    start.mutate(undefined, { onSuccess: () => router.push(href) })
  }

  return (
    <View style={styles.wrap}>
      {start.isError ? (
        <Banner tone="danger" onDismiss={() => start.reset()}>
          {dataErrorMessage(start.error, t)}
        </Banner>
      ) : null}
      <Button write
        variant={primary ? 'primary' : 'secondary'}
        loading={start.isPending}
        disabled={blockedReason !== undefined}
        accessibilityLabel={t('driver.myTrips.openLabel', { action: label, tripId: tripCode })}
        accessibilityHint={blockedReason}
        onPress={handleDepart}>
        {label}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({ wrap: { gap: space[3] } })
