import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useRouter, type Href } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { useAuth, useCan } from '@/features/auth/AuthProvider'
import {
  useDriverCapabilities,
  useMarkNotificationsReadMutation as useMarkDriverRead,
  useNotificationsQuery,
} from '@/features/driver/useDriverQueries'
import { useMonitoringCapabilities, useOfficeNotificationsQuery } from '@/features/monitoring/useMonitoringQueries'
import { NOTIFICATION_WINDOW_DAYS } from '@/features/notifications/notifications'
import {
  useMarkNotificationsReadMutation as useMarkWarehouseRead,
  useWarehouseCapabilities,
  useWarehouseNotifications,
} from '@/features/warehouse/useWarehouseQueries'
import type { Formatter } from '@/lib/format'
import { dataErrorMessage, useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

import { driverRow, warehouseRow, type BellRow } from './bell-rows'
import { markNotificationsRead, useReadNotifications } from './notification-read'
import { officeRow } from './office-rows'

/**
 * Màn Thông báo (chuông của web mở thành menu; điện thoại dùng một màn riêng), theo vai trò người đọc: tài xế đọc việc của chuyến mình,
 * nhân viên kho đọc việc của kho, điều phối viên và quản lý công ty đọc việc của văn phòng — sự kiện trong `NOTIFICATION_WINDOW_DAYS` ngày
 * gần nhất, mới nhất trước. Dòng chưa đọc có nhãn "Chưa đọc" bằng chữ. Thông báo về một chuyến mở chuyến đó ở màn của vai trò (với văn
 * phòng: Chi tiết chuyến, hoặc màn giám sát chuyến khi việc phải làm nằm ở đó); mở là đã đọc. Nút "Đánh dấu đã đọc" đọc hết một lần —
 * nguồn là máy chủ thì "đã đọc" ghi ở máy chủ (theo người, mọi máy), kho mẫu thì giữ trong bộ nhớ của lần mở app. Vai
 * trò không có thông báo, hoặc nguồn dữ liệu của vai trò chưa có, thì màn nói không hỗ trợ.
 */
export function NotificationsScreen() {
  const can = useCan()
  if (can('driver.operate')) return <DriverNotifications />
  if (can('warehouse.operate')) return <WarehouseNotifications />
  if (can('trips.view')) return <OfficeNotifications />
  return <NotificationsUnsupported />
}

function OfficeNotifications() {
  const can = useCan()
  const { notifications } = useMonitoringCapabilities()
  const query = useOfficeNotificationsQuery()
  return notifications ? (
    <NotificationList query={query} describe={(entry, t, format) => officeRow(entry, t, format, can)} />
  ) : (
    <NotificationsUnsupported />
  )
}

function DriverNotifications() {
  const { notifications } = useDriverCapabilities()
  const query = useNotificationsQuery(notifications)
  const mark = useMarkDriverRead()
  return notifications ? <NotificationList query={query} describe={driverRow} mark={mark} /> : <NotificationsUnsupported />
}

function WarehouseNotifications() {
  const { notifications } = useWarehouseCapabilities()
  const query = useWarehouseNotifications()
  const mark = useMarkWarehouseRead()
  return notifications ? <NotificationList query={query} describe={warehouseRow} mark={mark} /> : <NotificationsUnsupported />
}

function BackButton() {
  const t = useT()
  const router = useRouter()
  return <IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={() => router.back()} />
}

function NotificationsUnsupported() {
  const t = useT()
  return (
    <Screen title={t('notifications.title')} leading={<BackButton />}>
      <EmptyState title={t('notifications.title')} description={t('apiErrors.NOT_SUPPORTED')} />
    </Screen>
  )
}

type ListProps<Entry> = {
  readonly query: UseQueryResult<Entry[]>
  /** Dịch một thông báo của vai trò thành dòng của màn (`bell-rows.ts`). */
  readonly describe: (entry: Entry, t: TFunction, format: Formatter) => BellRow
  /** Ghi "đã đọc" ở nguồn, cho dòng mang `read` (máy chủ); vắng thì mọi dấu đã đọc giữ trong bộ nhớ. */
  readonly mark?: UseMutationResult<unknown, Error, readonly string[]>
}

function NotificationList<Entry>({ query, describe, mark }: ListProps<Entry>) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const { user } = useAuth()
  const read = useReadNotifications(user)
  const rows = (query.data ?? []).map((entry) => describe(entry, t, format))
  const isRead = (row: BellRow) => row.read ?? read.has(row.id)
  const unread = rows.filter((row) => !isRead(row))
  /** Dòng của nguồn giữ "đã đọc" ghi ở nguồn; dòng còn lại đánh dấu trong bộ nhớ. */
  const markRead = (targets: readonly BellRow[]) => {
    const server = targets.filter((row) => row.read !== undefined).map((row) => row.id)
    const local = targets.filter((row) => row.read === undefined).map((row) => row.id)
    if (local.length > 0) markNotificationsRead(user, local)
    if (server.length > 0) mark?.mutate(server)
  }

  return (
    <Screen
      title={t('notifications.title')}
      leading={<BackButton />}
      scroll={query.isSuccess}
      refresh={{ refreshing: query.isRefetching, onRefresh: () => void query.refetch() }}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {mark?.isError ? (
            <Banner tone="danger" onDismiss={() => mark.reset()}>
              {dataErrorMessage(mark.error, t)}
            </Banner>
          ) : null}
          {unread.length > 0 ? (
            <View style={styles.toolbar}>
              <AppText variant="label" style={styles.flex}>
                {t('notifications.unreadCount', { count: unread.length })}
              </AppText>
              <Button variant="secondary" loading={mark?.isPending ?? false} onPress={() => markRead(unread)}>
                {t('notifications.markAllRead')}
              </Button>
            </View>
          ) : null}
          {rows.length === 0 ? (
            <AppText color={colors.text2}>{t('notifications.empty', { days: NOTIFICATION_WINDOW_DAYS })}</AppText>
          ) : (
            <View style={styles.list}>
              {rows.map((row) => (
                <NotificationRow
                  key={row.id}
                  row={row}
                  unread={!isRead(row)}
                  onOpen={(href) => {
                    if (!isRead(row)) markRead([row])
                    router.push(href)
                  }}
                />
              ))}
            </View>
          )}
          <AppText color={colors.text3}>{t('notifications.scope', { days: NOTIFICATION_WINDOW_DAYS })}</AppText>
        </>
      )}
    </Screen>
  )
}

function NotificationRow({ row, unread, onOpen }: { row: BellRow; unread: boolean; onOpen: (href: Href) => void }) {
  const t = useT()
  const format = useFormat()
  const at = t('notifications.dateTime', { time: format.time(row.at), date: format.date(row.at) })
  const label = [...(unread ? [t('notifications.unread')] : []), at, row.sentence, row.target, ...row.details].join(', ')
  const body = (
    <>
      <View style={styles.rowHead}>
        <AppText color={colors.text3} style={styles.flex}>
          {at}
        </AppText>
        {unread ? <Chip tone="cyan" label={t('notifications.unread')} /> : null}
      </View>
      <AppText variant={unread ? 'label' : 'body'}>{row.sentence}</AppText>
      <AppText color={colors.text2}>{row.target}</AppText>
      {row.details.map((line) => (
        <AppText key={line} color={colors.text2}>
          {line}
        </AppText>
      ))}
    </>
  )
  const { open } = row
  if (open === undefined) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {body}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={open.hint ?? t('notifications.openTrip', { id: open.tripId })}
      onPress={() => onOpen(open.href)}
      style={({ pressed }) => [styles.row, styles.pressable, pressed && styles.pressed]}>
      <View style={styles.flexColumn}>{body}</View>
      <ChevronRight color={colors.text3} size={24} strokeWidth={1.5} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
  flexColumn: { flex: 1, gap: space[1] },
  list: { gap: space[3] },
  row: { gap: space[1], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  pressable: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56 },
  pressed: { backgroundColor: colors.surface },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
})
