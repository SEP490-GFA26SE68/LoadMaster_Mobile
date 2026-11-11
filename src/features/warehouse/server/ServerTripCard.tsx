import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TripStatusChip } from '@/components/TripStatus'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import { loadingPath } from '../session-routes'
import { Fact, Warning } from '../trips/WarehouseTripCard'
import type { ServerWarehouseTrip } from '../warehouse-server-model'
import { useStartServerLoading } from './useServerWarehouseQueries'

/**
 * Một chuyến ở tab Kho khi nguồn là máy chủ (như `ServerWarehouseTripCard` của web), cỡ điện thoại: mã chuyến cùng chip trạng thái, giờ
 * xuất phát · số kiện, xe ở dòng riêng, và một nút 56 rộng hết thẻ theo nhóm — "Bắt đầu soạn hàng" (máy chủ mở phiên kèm bước soạn rồi màn
 * mở phiên đó), "Tiếp tục soạn / xếp" (mở lại phiên của máy chủ, ở máy nào cũng được), "Xem chuyến đã xếp". Chuyến chờ điều phối tối ưu lại
 * chỉ có một khung lý do, không nút. Máy chủ không trả tên tuyến, tiến độ, số seal của danh sách: thẻ không vẽ các phần đó.
 */
export function ServerTripCard({ row, primary }: { row: ServerWarehouseTrip; primary: boolean }) {
  const t = useT()
  const format = useFormat()
  const unknown = t('serverWarehouse.unknown')
  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="label" accessibilityRole="header" style={styles.code}>
          {row.code}
        </AppText>
        <TripStatusChip status={row.status} />
      </View>
      <View style={styles.facts}>
        <Fact label={t('serverWarehouse.departure')} code>
          {row.departureAt === null ? unknown : `${format.time(row.departureAt)} · ${format.date(row.departureAt)}`}
        </Fact>
        <Fact label={t('serverWarehouse.packages')} code>
          {row.packageCount === null ? unknown : format.integer(row.packageCount)}
        </Fact>
        {/* Tên xe có biển số: dòng riêng rộng hết thẻ để biển số không bị ngắt */}
        <Fact label={t('serverWarehouse.vehicle')} wide>
          {row.vehicle === '' ? unknown : row.vehicle}
        </Fact>
      </View>
      {row.stage === 'stale' ? (
        <Warning tone="warning">{t(`serverWarehouse.replan.${row.replanReason ?? 'unknown'}`)}</Warning>
      ) : row.stage === 'waiting' ? (
        <StartButton row={row} primary={primary} />
      ) : (
        <OpenButton row={row} primary={primary} label={t(row.stage === 'loading' ? 'serverWarehouse.resume' : 'serverWarehouse.openLoaded')} />
      )}
    </Card>
  )
}

function OpenButton({ row, primary, label }: { row: ServerWarehouseTrip; primary: boolean; label: string }) {
  const t = useT()
  const router = useRouter()
  return (
    <Button
      variant={primary ? 'primary' : 'secondary'}
      accessibilityLabel={t('warehouseTrips.openLabel', { action: label, tripId: row.code })}
      onPress={() => router.push(loadingPath(row.id))}>
      {label}
    </Button>
  )
}

/**
 * Bắt đầu soạn hàng: máy chủ chuyển chuyến sang Đang xếp hàng và trả phiên — màn mở phiên đó (đã có trong cache, không đọc lại). Máy chủ
 * từ chối thì câu lỗi nằm ngay trên nút (web nói bằng toast), bấm lại là thử lại.
 */
function StartButton({ row, primary }: { row: ServerWarehouseTrip; primary: boolean }) {
  const t = useT()
  const router = useRouter()
  const start = useStartServerLoading(row.id)
  const [failure, setFailure] = useState<string | null>(null)
  const label = t('serverWarehouse.start')

  async function handleStart() {
    setFailure(null)
    try {
      await start.mutateAsync()
      router.push(loadingPath(row.id))
    } catch (error) {
      setFailure(t('warehouseServer.startFailed', { reason: dataErrorMessage(error, t) }))
    }
  }

  return (
    <>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
      <Button
        variant={primary ? 'primary' : 'secondary'}
        loading={start.isPending}
        accessibilityLabel={t('warehouseTrips.openLabel', { action: label, tripId: row.code })}
        onPress={() => void handleStart()}>
        {label}
      </Button>
    </>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[3] },
})
