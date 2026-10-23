import { CameraView, useCameraPermissions } from 'expo-camera'
import { useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

/**
 * Camera quét mã QR trên nhãn kiện (thay `QrCamera` của web, dùng `expo-camera`). Chưa có quyền thì xin; bị từ chối hẳn thì nói cách cấp
 * quyền trong Cài đặt và gợi ý gõ mã; camera không mở được cũng nói ra. Khung hình chỉ để nhìn — trạng thái là một dòng chữ đọc được.
 * Mỗi mã đọc được gửi cho `onDetected`; nơi gọi tự bỏ mã trùng và mã đến khi đang ghi.
 */
export function QrScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const t = useT()
  const [permission, requestPermission] = useCameraPermissions()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  if (permission === null) return <AppText color={colors.text2}>{t('verify.camera.starting')}</AppText>
  if (!permission.granted) {
    return permission.canAskAgain ? (
      <View style={styles.block}>
        <AppText color={colors.text2}>{t('verify.camera.permission')}</AppText>
        <Button variant="secondary" onPress={() => void requestPermission()}>
          {t('verify.camera.allow')}
        </Button>
      </View>
    ) : (
      <View style={styles.block}>
        <Banner tone="warning">{t('verify.camera.denied')}</Banner>
        <Button variant="secondary" onPress={() => void Linking.openSettings()}>
          {t('verify.camera.openSettings')}
        </Button>
      </View>
    )
  }
  if (failed) return <Banner tone="danger">{t('verify.camera.failed')}</Banner>

  return (
    <View style={styles.block}>
      <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onDetected(data)}
          onCameraReady={() => setReady(true)}
          onMountError={() => setFailed(true)}
        />
        {/* Khung ngắm: chỉ để nhìn */}
        <View style={styles.aim} />
      </View>
      <AppText color={colors.text2} accessibilityLiveRegion="polite">
        {ready ? t('verify.camera.scanning') : t('verify.camera.starting')}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: space[3] },
  frame: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.sky },
  aim: { width: '56%', aspectRatio: 1, borderRadius: radius.md, borderWidth: 2, borderColor: colors.skyText },
})
