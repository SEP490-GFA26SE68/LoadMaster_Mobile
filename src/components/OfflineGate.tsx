import { createContext, use, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'

import type { Feature } from '@/data/config'
import { useOfflineFor } from '@/data/network'
import { useT } from '@/lib/i18n'
import { CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { Banner } from './Banner'

const OfflineContext = createContext(false)

/**
 * Bọc các màn làm việc của một feature đọc ghi backend (tài xế, kho, tra cứu kiện): máy mất mạng thì `Screen` hiện dải "Mất kết nối" dưới
 * dải trời và mọi `Button write` trong màn (kể cả trong tờ trượt) mờ kèm lý do. Không có hàng đợi ghi: có mạng lại thì người dùng bấm lại.
 * Feature chạy trên kho mẫu thì không chặn gì — kho nằm ngay trong máy.
 */
export function OfflineGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  return <OfflineContext value={useOfflineFor(feature)}>{children}</OfflineContext>
}

/** Màn đang trong `OfflineGate` và máy mất mạng: lệnh ghi không đi được. */
export function useWritesBlocked(): boolean {
  return use(OfflineContext)
}

/** Dải "Mất kết nối" của `Screen`; không vẽ gì khi còn mạng hay màn không nằm trong `OfflineGate`. */
export function OfflineStrip() {
  const t = useT()
  if (!useWritesBlocked()) return null
  return (
    <View style={styles.strip}>
      <Banner tone="warning" icon={WifiOff}>
        {t('common.offline.banner')}
      </Banner>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space[4], paddingTop: space[3] },
})
