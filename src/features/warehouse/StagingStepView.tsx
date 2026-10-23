import { useQueryClient } from '@tanstack/react-query'
import { Hourglass, ScanLine } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import { useT } from '@/lib/i18n'
import type { Revision, Trip } from '@/lib/mock-db'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { ConfirmNotices } from './ConfirmNotices'
import { stagingProgress } from './loading-session'
import { PlanNotices } from './PlanNotices'
import { SessionExitButton } from './SessionExitButton'
import { MissingPackageSheet } from './staging/MissingPackageSheet'
import { StagingRow, type StagingItem } from './staging/StagingRow'
import { useStagingVerify } from './staging/useStagingVerify'
import { StepHeader } from './StepHeader'
import { useSessionScene } from './useSessionScene'
import { useWarehouseCapabilities, warehouseKeys } from './useWarehouseQueries'

export type StagingStepViewProps = {
  /** Chuyến đang ở bước Soạn hàng (pha `loading`, còn kiện của phương án chưa soạn). */
  readonly trip: Trip
  /** Phương án kho chốt lúc bắt đầu (`warehousePlan`). */
  readonly plan: Revision
}

/**
 * Bước Soạn hàng của phiên kho (như `StagingStepPage` của web, FE-6-02): trước khi xếp, kho đưa mọi kiện của phương án vào khu chờ và
 * đối chiếu từng kiện, không cần thứ tự — kiện thiếu lộ ra khi xe còn trống. Dải trời mang lối thoát, mã chuyến và tiến độ "Đã soạn x / y".
 * Thân màn là danh sách ảo các kiện **chưa soạn** (vài trăm dòng); nhãn của phương án, dải xác nhận tay, dải "Thiếu n kiện" và tiêu đề
 * nằm ở đầu danh sách nên cuộn đi cùng nó, chừa chỗ cho kiện. Mỗi dòng có nút phụ "Báo thiếu" (khi nguồn nhận báo thiếu) mở tờ hỏi lại;
 * kiện đã báo thiếu ở lại danh sách kèm dòng "chờ điều phối" — điều phối viên quyết tìm tiếp hay bỏ kiện. Nút chính duy nhất ở chân màn,
 * "Đối chiếu kiện", mở tờ đối chiếu ba mức; tờ ở lại cho kiện kế tiếp tới khi hết kiện chờ. Soạn đủ thì `LoadingSessionScreen` tự sang
 * bước Xếp — màn này và các tờ của nó rời đi cùng lúc. Kéo danh sách xuống để đọc lại chuyến (máy khác có thể vừa soạn).
 */
export function StagingStepView({ trip, plan }: StagingStepViewProps) {
  const t = useT()
  const capabilities = useWarehouseCapabilities()
  const model = useSessionScene(trip, plan)
  // Chỉ tính lại khi kho đổi tiến độ soạn: mở, đóng tờ không dựng lại danh sách
  const progress = useMemo(() => stagingProgress(model.placements, trip.loading), [model.placements, trip.loading])
  const verify = useStagingVerify({ tripId: trip.id, placements: model.placements, pending: progress.pending })
  const refresh = useTripRefresh(trip.id)
  const [target, setTarget] = useState<StagingItem | null>(null)
  const onReport = capabilities.shortages ? setTarget : undefined
  const count = progress.pending.length
  const shortages = progress.shortageIds.size

  return (
    <Screen
      title={trip.id}
      leading={<SessionExitButton />}
      below={<StepHeader kind="staging" staged={progress.staged} total={progress.total} />}
      footer={
        <Button icon={ScanLine} disabled={verify.pending} onPress={() => verify.setOpen(true)}>
          {t('warehouse.scan.open')}
        </Button>
      }>
      <FlatList
        data={progress.pending}
        keyExtractor={keyOf}
        extraData={progress.shortageIds}
        renderItem={({ item, index }) => (
          <StagingRow item={item} reported={progress.shortageIds.has(item.id)} first={index === 0} last={index === count - 1} onReport={onReport} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <PlanNotices model={model} />
            <ConfirmNotices trip={trip} />
            {shortages > 0 ? (
              <Banner tone="warning" icon={Hourglass}>
                {t('warehouse.staging.shortages', { count: shortages })}
              </Banner>
            ) : null}
            <View style={styles.heading}>
              <AppText variant="heading" accessibilityRole="header">
                {t('warehouse.staging.title', { count })}
              </AppText>
              <AppText color={colors.text2}>{t('warehouse.staging.hint')}</AppText>
            </View>
          </View>
        }
        accessibilityRole="list"
        accessibilityLabel={t('warehouse.staging.listLabel')}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.primary} />}
      />
      <MissingPackageSheet tripId={trip.id} item={target} onClose={() => setTarget(null)} />
      <PackageVerifySheet
        verify={verify}
        title={t('warehouse.staging.scanTitle')}
        description={t('warehouse.staging.scanDescription', { done: progress.staged, total: progress.total })}
        manualAllowed={capabilities.manualConfirm}
      />
    </Screen>
  )
}

function keyOf(item: StagingItem): string {
  return item.id
}

/**
 * Kéo xuống để đọc lại chuyến. Vòng quay chỉ cho lần kéo của người dùng: lần đọc lại sau mỗi lần ghi (mọi lệnh ghi của kho tự đọc lại)
 * không làm vòng quay hiện lên đầu danh sách.
 */
function useTripRefresh(tripId: string) {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void client.refetchQueries({ queryKey: warehouseKeys.trip(tripId) }).finally(() => setRefreshing(false))
  }, [client, tripId])
  return { refreshing, onRefresh }
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[4], paddingBottom: space[3] },
  heading: { gap: space[1] },
})
