import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { useAuth } from '@/features/auth/AuthProvider'
import { NOTIFICATION_WINDOW_DAYS } from '@/features/notifications/notifications'
import { dataErrorMessage, useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

import type { DriverNotification } from './driver-model'
import { markNotificationsRead, useReadNotifications } from './notification-read'
import { tripPath } from './TripCard'
import { useDriverCapabilities, useNotificationsQuery } from './useDriverQueries'

/** Câu của một thông báo theo loại: việc của chuyến mình, xác nhận tay bị từ chối, trả lời yêu cầu hỗ trợ. */
function sentence(entry: DriverNotification, t: TFunction): string {
  if (entry.kind === 'manualRejected') return t('notifications.manualRejected')
  if (entry.kind === 'ticketReplied') return t('notifications.ticketReplied')
  return t(`notifications.driver.${entry.kind}`)
}

function targetLabel(entry: DriverNotification, t: TFunction): string {
  if (entry.kind === 'ticketReplied') return t('notifications.target.ticket', { id: entry.target.id })
  return entry.target.label === undefined
    ? t('notifications.target.trip', { id: entry.target.id })
    : t('notifications.target.tripNamed', { id: entry.target.id, name: entry.target.label })
}

const PARAM_KEYS = ['reason', 'loaded', 'returned', 'packageInstanceId', 'count', 'lateStops'] as const
type ParamKey = (typeof PARAM_KEYS)[number]
const isParamKey = (key: string): key is ParamKey => PARAM_KEYS.some((item) => item === key)

/**
 * Màn Thông báo của tài xế (chuông của web mở thành menu; điện thoại dùng một màn riêng): sự kiện trong `NOTIFICATION_WINDOW_DAYS` ngày
 * gần nhất về chuyến của mình, mới nhất trước. Dòng chưa đọc có nhãn "Chưa đọc" bằng chữ. Thông báo về một chuyến mở được chuyến đó; mở là đã đọc. Nút "Đánh dấu
 * đã đọc" đọc hết một lần.
 */
export function NotificationsScreen() {
  const t = useT()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { notifications } = useDriverCapabilities()
  const query = useNotificationsQuery(notifications)
  const read = useReadNotifications(userId)
  const rows = query.data ?? []
  const unread = rows.filter((entry) => !read.has(entry.id))

  const back = <IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={() => router.back()} />

  if (!notifications) {
    return (
      <Screen title={t('notifications.title')} leading={back}>
        <EmptyState title={t('notifications.title')} description={t('apiErrors.NOT_SUPPORTED')} />
      </Screen>
    )
  }

  return (
    <Screen
      title={t('notifications.title')}
      leading={back}
      scroll={query.isSuccess}
      refresh={{ refreshing: query.isRefetching, onRefresh: () => void query.refetch() }}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {unread.length > 0 ? (
            <View style={styles.toolbar}>
              <AppText variant="label" style={styles.flex}>
                {t('notifications.unreadCount', { count: unread.length })}
              </AppText>
              <Button
                variant="secondary"
                onPress={() =>
                  markNotificationsRead(
                    userId,
                    unread.map((entry) => entry.id),
                  )
                }>
                {t('notifications.markAllRead')}
              </Button>
            </View>
          ) : null}
          {rows.length === 0 ? (
            <AppText color={colors.text2}>{t('notifications.empty', { days: NOTIFICATION_WINDOW_DAYS })}</AppText>
          ) : (
            <View style={styles.list}>
              {rows.map((entry) => (
                <NotificationRow
                  key={entry.id}
                  entry={entry}
                  unread={!read.has(entry.id)}
                  onOpen={(tripId) => {
                    markNotificationsRead(userId, [entry.id])
                    router.push(tripPath(tripId))
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

function NotificationRow({ entry, unread, onOpen }: { entry: DriverNotification; unread: boolean; onOpen: (tripId: string) => void }) {
  const t = useT()
  const format = useFormat()
  const at = t('notifications.dateTime', { time: format.time(entry.at), date: format.date(entry.at) })
  const details = Object.entries(entry.details).flatMap(([key, value]) =>
    isParamKey(key)
      ? [t('notifications.detail', { label: t(`notifications.params.${key}`), value: typeof value === 'number' ? format.integer(value) : value })]
      : [],
  )
  const lines = [sentence(entry, t), targetLabel(entry, t), ...details]
  const body = (
    <>
      <View style={styles.rowHead}>
        <AppText color={colors.text3} style={styles.flex}>
          {at}
        </AppText>
        {unread ? <Chip tone="cyan" label={t('notifications.unread')} /> : null}
      </View>
      <AppText variant={unread ? 'label' : 'body'}>{lines[0]}</AppText>
      <AppText color={colors.text2}>{lines[1]}</AppText>
      {details.map((line) => (
        <AppText key={line} color={colors.text2}>
          {line}
        </AppText>
      ))}
    </>
  )
  const { tripId } = entry
  if (tripId === undefined) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[...(unread ? [t('notifications.unread')] : []), at, ...lines].join(', ')}>
        {body}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[...(unread ? [t('notifications.unread')] : []), at, ...lines].join(', ')}
      accessibilityHint={t('notifications.openTrip', { id: tripId })}
      onPress={() => onOpen(tripId)}
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
