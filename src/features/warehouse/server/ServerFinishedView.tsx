import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { VehiclePresenceCheck } from '../presence/VehiclePresenceCheck'
import { SessionExitButton } from '../SessionExitButton'
import { useLeaveSession } from '../useLeaveSession'
import type { ServerLoadingSession } from '../warehouse-server-model'

/**
 * Phiên máy chủ đã xếp xong, chuyến chờ tài xế xuất phát (như `ServerLoadingFinished` của web): tiêu đề, số kiện hỏng bỏ lại kho. Chân
 * màn: "Về danh sách chuyến" là nút chính duy nhất. Dưới thẻ là khối xác nhận xe có ở kho xuất phát (`VehiclePresenceCheck`), vì tài xế chỉ
 * xuất phát được khi xe đã được ghi nhận ở đó. Máy chủ không trả tuyến, ngày chạy, số kiện theo điểm giao của phiên: màn không vẽ
 * các phần đó.
 */
export function ServerFinishedView({ session }: { session: ServerLoadingSession }) {
  const t = useT()
  const leave = useLeaveSession()
  const damaged = Object.values(session.outcomes).filter((outcome) => outcome === 'damaged').length
  const description = t('serverWarehouse.session.finishedDescription')

  return (
    <Screen title={session.code} leading={<SessionExitButton />} scroll footer={<Button onPress={leave}>{t('warehouse.backToList')}</Button>}>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          {t('serverWarehouse.session.finishedTitle', { code: session.code })}
        </AppText>
        <AppText color={colors.text2}>
          {damaged > 0 ? `${description} ${t('serverWarehouse.session.finishedDamaged', { count: damaged })}` : description}
        </AppText>
      </Card>
      <VehiclePresenceCheck tripId={session.tripId} licensePlate={session.licensePlate} />
    </Screen>
  )
}
