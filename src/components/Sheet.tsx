import { useEffect, useState, type ReactNode } from 'react'
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, CONTENT_MAX_WIDTH, radius, space } from '@/theme/tokens'

import { AppText } from './AppText'

type SheetProps = {
  open: boolean
  /** Người dùng muốn đóng: nút Back của Android, chạm lớp phủ. Không gọi khi `busy`. */
  onClose: () => void
  title: string
  description?: string
  /** Đang ghi: tờ không đóng được, để kết quả của lần ghi không rơi mất. */
  busy?: boolean
  /** Hàng nút dính đáy tờ, luôn trong tầm ngón cái. */
  footer?: ReactNode
  children?: ReactNode
}

/**
 * Tờ trượt từ đáy (như `DialogContent sheet` của web): lớp phủ, tiêu đề là header của tờ, nội dung cuộn bên trong, hàng nút dính đáy và
 * chừa vùng an toàn. Bàn phím ảo đẩy tờ lên để không che ô đang nhập. Hiện bằng mờ dần ngắn; máy bật giảm chuyển động thì hiện ngay.
 */
export function Sheet({ open, onClose, title, description, busy = false, footer, children }: SheetProps) {
  const insets = useSafeAreaInsets()
  const reduceMotion = useReduceMotion()
  const close = () => {
    if (!busy) onClose()
  }
  return (
    <Modal visible={open} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        {/* Lớp phủ chỉ để chạm đóng; trình đọc màn hình đóng tờ bằng nút ở chân tờ hoặc cử chỉ quay lại */}
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={close} accessible={false} importantForAccessibility="no" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.head}>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {description === undefined ? null : <AppText color={colors.text2}>{description}</AppText>}
            </View>
            {children}
          </ScrollView>
          {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** Cài đặt "giảm chuyển động" của máy, đọc lại khi người dùng đổi. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduce(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      alive = false
      subscription.remove()
    }
  }, [])
  return reduce
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    maxHeight: '92%',
    alignSelf: 'center',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, marginTop: space[2], borderRadius: radius.pill, backgroundColor: colors.border },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { gap: space[4], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[4] },
  head: { gap: space[1] },
  footer: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.surface },
})
