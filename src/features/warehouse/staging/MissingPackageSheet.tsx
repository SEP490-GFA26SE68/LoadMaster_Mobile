import { PackageX } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { useReportShortageMutation } from '../useWarehouseQueries'
import { PackageSummary, type StagingItem } from './StagingRow'

type MissingPackageSheetProps = {
  readonly tripId: string
  /** Kiện đang hỏi; `null` là tờ đóng. */
  readonly item: StagingItem | null
  readonly onClose: () => void
}

/**
 * Hỏi lại trước khi báo thiếu một kiện ở bước soạn hàng (như `MissingPackageDialog` của web): báo thiếu là ghi thật vào kho — điều phối
 * viên được báo và sẽ quyết tìm tiếp hay bỏ kiện khỏi chuyến — nên hỏi trước. "Quay lại" không ghi gì. Đang ghi thì tờ không đóng được;
 * kho từ chối thì tờ giữ nguyên và nói lỗi ngay trong tờ; ghi xong tờ đóng — dòng của kiện chuyển sang "Đã báo thiếu — chờ điều phối" và
 * dải "Thiếu n kiện" xuất hiện (web nói bằng toast, mobile không có toast).
 */
export function MissingPackageSheet({ tripId, item, onClose }: MissingPackageSheetProps) {
  const t = useT()
  const report = useReportShortageMutation(tripId)
  const [failure, setFailure] = useState<string | null>(null)

  function close() {
    setFailure(null)
    onClose()
  }

  async function confirm(id: string) {
    setFailure(null)
    try {
      await report.mutateAsync(id)
      close()
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  if (item === null) return null
  return (
    <Sheet
      open
      onClose={close}
      busy={report.isPending}
      title={t('warehouse.missingDialog.title', { id: item.id })}
      description={t('warehouse.missingDialog.description', { id: item.id })}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={report.isPending} onPress={close}>
            {t('warehouse.missingDialog.cancel')}
          </Button>
          <Button icon={PackageX} style={styles.flex} loading={report.isPending} onPress={() => void confirm(item.id)}>
            {t('warehouse.missingDialog.confirm')}
          </Button>
        </>
      }>
      <View style={styles.package}>
        <PackageSummary item={item} />
      </View>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  package: { padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
})
