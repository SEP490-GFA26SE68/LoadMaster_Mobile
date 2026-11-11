import { PackageX } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { placementLabel } from '../server-loading'
import type { ServerPlacement } from '../warehouse-server-model'
import { ServerPackageSummary } from './ServerPackageSummary'
import { useReportServerShortage } from './useServerWarehouseQueries'

type ServerShortageSheetProps = {
  readonly tripId: string
  /** Kiện đang hỏi (có mã kho kiện); `null` là tờ đóng. */
  readonly placement: ServerPlacement | null
  readonly onClose: () => void
}

/**
 * Hỏi lại trước khi báo thiếu một kiện ở bước soạn của phiên máy chủ (như `MissingPackageSheet` bản kho mẫu): máy chủ ghi báo thiếu, điều
 * phối viên quyết tìm tiếp hay bỏ kiện ở Chi tiết chuyến. Đang ghi thì tờ không đóng được; máy chủ từ chối thì tờ giữ nguyên và nói lỗi; ghi
 * xong tờ đóng — dòng của kiện chuyển sang "Đã báo thiếu — chờ điều phối" và dải "Thiếu n kiện" xuất hiện.
 */
export function ServerShortageSheet({ tripId, placement, onClose }: ServerShortageSheetProps) {
  const t = useT()
  const report = useReportServerShortage(tripId)
  const [failure, setFailure] = useState<string | null>(null)

  function close() {
    setFailure(null)
    onClose()
  }

  async function confirm(packageId: string) {
    setFailure(null)
    try {
      await report.mutateAsync(packageId)
      close()
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  if (placement?.packageId == null) return null
  const { packageId } = placement
  const id = placementLabel(placement)
  return (
    <Sheet
      open
      onClose={close}
      busy={report.isPending}
      title={t('warehouse.missingDialog.title', { id })}
      description={t('warehouse.missingDialog.description', { id })}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={report.isPending} onPress={close}>
            {t('warehouse.missingDialog.cancel')}
          </Button>
          <Button icon={PackageX} style={styles.flex} loading={report.isPending} onPress={() => void confirm(packageId)}>
            {t('warehouse.missingDialog.confirm')}
          </Button>
        </>
      }>
      <View style={styles.package}>
        <ServerPackageSummary placement={placement} />
      </View>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  package: { padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
})
