import { Hourglass, ScanLine } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import { useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { serverStagingView, type ServerStagingRow as Row } from '../server-loading'
import { SessionExitButton } from '../SessionExitButton'
import { StepHeader } from '../StepHeader'
import type { ServerLoadingSession } from '../warehouse-server-model'
import { ServerShortageSheet } from './ServerShortageSheet'
import { ServerStagingRow } from './ServerStagingRow'
import { useSessionRefresh } from './useSessionRefresh'
import { useServerStagingVerify } from './useServerStagingVerify'

/**
 * Bước Soạn hàng của phiên máy chủ (như `ServerStagingStep` của web, dáng của `StagingStepView` bản kho mẫu): kho đưa mọi kiện của phương án
 * vào khu chờ và đối chiếu từng kiện, không cần thứ tự. Dải trời mang lối thoát, mã chuyến và "Đã soạn x / y". Thân màn là danh sách ảo các
 * kiện **chưa soạn**; dải "Thiếu n kiện" và dải xác nhận tay chờ duyệt nằm ở đầu danh sách. Mỗi kiện có "Báo thiếu" (tờ hỏi lại). Nút chính
 * duy nhất "Đối chiếu kiện" mở tờ đối chiếu ba mức. Soạn đủ thì máy chủ cho xếp và phiên tự sang bước Xếp. Kéo xuống để đọc lại phiên.
 */
export function ServerStagingView({ tripId, session }: { tripId: string; session: ServerLoadingSession }) {
  const t = useT()
  const view = useMemo(() => serverStagingView(session), [session])
  const verify = useServerStagingVerify(tripId, session, view)
  const refresh = useSessionRefresh(tripId)
  const [target, setTarget] = useState<Row | null>(null)
  const count = view.pending.length

  return (
    <Screen
      title={session.code}
      leading={<SessionExitButton />}
      below={<StepHeader kind="staging" staged={view.staged} total={view.total} />}
      footer={
        <Button write icon={ScanLine} disabled={verify.pending} onPress={() => verify.setOpen(true)}>
          {t('warehouse.scan.open')}
        </Button>
      }>
      <FlatList
        data={view.pending}
        keyExtractor={keyOf}
        renderItem={({ item, index }) => <ServerStagingRow row={item} first={index === 0} last={index === count - 1} onReport={setTarget} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {view.openShortages > 0 ? (
              <Banner tone="warning" icon={Hourglass}>
                {t('warehouse.staging.shortages', { count: view.openShortages })}
              </Banner>
            ) : null}
            {view.manualPending > 0 ? (
              <Banner tone="warning" icon={Hourglass}>
                {t('serverWarehouse.staging.manualPendingBanner', { count: view.manualPending })}
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
      <ServerShortageSheet tripId={tripId} placement={target?.placement ?? null} onClose={() => setTarget(null)} />
      <PackageVerifySheet
        verify={verify}
        title={t('warehouse.staging.scanTitle')}
        description={t('warehouse.staging.scanDescription', { done: view.staged, total: view.total })}
        manualAllowed
      />
    </Screen>
  )
}

function keyOf(row: Row): string {
  return row.placement.id
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[4], paddingBottom: space[3] },
  heading: { gap: space[1] },
})
