import { Ellipsis, type LucideIcon } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useWritesBlocked } from '@/components/OfflineGate'
import { useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

/** Một mục của menu "..." ở góc thẻ. `write`: mục gửi lệnh ghi lên máy chủ, mờ khi máy mất mạng (như `Button write`). */
export type CardMenuItem = {
  readonly key: string
  readonly label: string
  readonly icon: LucideIcon
  readonly iconColor?: string
  readonly write?: boolean
  readonly disabled?: boolean
  readonly onPress: () => void
}

/**
 * Nút 3 chấm ở góc phải trên của thẻ, mở danh sách việc của thẻ ngay dưới nút (cùng kiểu menu của thẻ ở "Chuyến của tôi").
 * Không có mục nào thì không vẽ nút.
 */
export function CardActionMenu({ items }: { readonly items: readonly CardMenuItem[] }) {
  const t = useT()
  const writesBlocked = useWritesBlocked()
  const buttonRef = useRef<View>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 50, right: 16 })

  if (items.length === 0) return null

  function handleOpen() {
    buttonRef.current?.measureInWindow?.((x, y, width, height) => {
      if (typeof y === 'number' && typeof height === 'number') {
        const win = Dimensions.get('window')
        const rawTop = y + height + 4
        const top = Math.min(Math.max(12, win.height - 200), Math.max(12, rawTop))
        const right = Math.max(12, win.width - (x + width))
        setCoords({ top, right })
      }
    })
    setOpen(true)
  }

  return (
    <View ref={buttonRef}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('driver.myTrips.actionsMenu')}
        onPress={handleOpen}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        hitSlop={8}>
        <Ellipsis color={colors.text2} size={20} />
      </Pressable>
      {open ? (
        <Modal transparent animationType="none" visible={open} onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <View style={[styles.menu, { top: coords.top, right: coords.right }]}>
              {items.map((item) => {
                const disabled = item.disabled === true || (item.write === true && writesBlocked)
                const Icon = item.icon
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ disabled }}
                    accessibilityHint={item.write === true && writesBlocked ? t('common.offline.writeBlocked') : undefined}
                    disabled={disabled}
                    style={({ pressed }) => [styles.item, disabled && styles.itemDisabled, pressed && !disabled && styles.itemPressed]}
                    onPress={() => {
                      setOpen(false)
                      item.onPress()
                    }}>
                    <Icon size={18} color={disabled ? colors.textDisabled : (item.iconColor ?? colors.primary)} />
                    <AppText variant="label" color={disabled ? colors.textDisabled : colors.text}>
                      {item.label}
                    </AppText>
                  </Pressable>
                )
              })}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnPressed: { backgroundColor: colors.lineSoft },
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  menu: {
    position: 'absolute',
    minWidth: 220,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[2],
    gap: space[1],
    ...shadow.card,
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.sm,
  },
  itemPressed: { backgroundColor: colors.surface },
  itemDisabled: { opacity: 0.5 },
})
