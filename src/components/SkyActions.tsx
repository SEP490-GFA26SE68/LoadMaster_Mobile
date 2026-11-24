import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { space } from '@/theme/tokens'

/** Nhiều nút 56 ở mép phải dải trời (`Screen.actions`), cách nhau 8: trợ lý AI và chuông. */
export function SkyActions({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space[2] } })
