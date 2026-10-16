import { ArrowRight, MapPinCheck } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import { CompleteStopSheet } from './CompleteStopSheet'
import type { DriverCapabilities, StopScreen } from './driver-model'
import type { StopActions } from './useStopActions'

type StopFooterProps = {
  screen: StopScreen
  actions: StopActions
  capabilities: DriverCapabilities
  /** Tờ đối chiếu đang ghi một kiện: chưa hoàn tất điểm được. */
  verifyPending: boolean
}

/** Bước của nút chính ở chân màn. */
export type FooterStep = 'depart' | 'arrive' | 'complete'

/** Nút chính của chân màn theo bước; `null` khi không có nút nào — xem trước, hoặc nguồn dữ liệu không làm được bước đó. */
export function footerStep({ mode, arrived }: StopScreen, capabilities: DriverCapabilities): FooterStep | null {
  if (mode === 'preview') return null
  if (mode === 'ready') return capabilities.depart ? 'depart' : null
  if (!arrived) return capabilities.arrive ? 'arrive' : null
  return 'complete'
}

/**
 * Chân màn điểm giao (như `StopFooter` của web): **đúng một nút chính** theo bước (`footerStep`) — "Xuất phát" khi kho đã xếp xong; đang
 * vận chuyển thì "Đã đến điểm n" (ghi giờ đến thật), rồi "Hoàn tất điểm giao" / "Hoàn tất điểm nhận". Còn xác nhận tay chờ duyệt thì nút
 * mờ, lý do ngay trên nút. Bấm hoàn tất mở tờ hỏi lại; tờ gắn với điểm đang hỏi nên điểm đổi hoặc hết hoàn tất được (điều phối viên vừa
 * từ chối một xác nhận tay) thì tờ tự đóng và không tự mở lại. Câu báo của lần ghi vừa rồi (`actions.flash`) nằm ngay trên nút — app
 * không có toast.
 */
export function StopFooter({ screen, actions, capabilities, verifyPending }: StopFooterProps) {
  const t = useT()
  const [asking, setAsking] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const { stop, arrived, remaining, pendingConfirms } = screen
  const pickupStop = stop.kind === 'PICKUP'
  const completable = arrived && remaining === 0 && pendingConfirms === 0 && !verifyPending
  const asked = completable && asking === stop.ref
  // Tờ đã tự đóng: quên câu hỏi, để tờ không tự mở lại khi điểm hoàn tất được trở lại
  if (asking !== null && !asked && !actions.completing) setAsking(null)

  async function handleConfirm() {
    setFailure(null)
    const error = await actions.completeStop()
    if (error === null) setAsking(null)
    else setFailure(error)
  }

  const flash = actions.flash
  const next = footerStep(screen, capabilities)
  const step =
    next === null ? null : next === 'depart' ? (
      <Button loading={actions.starting} onPress={actions.startDelivery}>
        {t('driver.start')}
      </Button>
    ) : next === 'arrive' ? (
      <Button icon={MapPinCheck} loading={actions.arriving} onPress={actions.arrive}>
        {t('driver.arrive', { number: stop.number })}
      </Button>
    ) : (
      <>
        {pendingConfirms > 0 ? (
          <Banner tone="warning">{t(pickupStop ? 'driver.pickup.blocked' : 'driver.confirms.blocked', { count: pendingConfirms })}</Banner>
        ) : null}
        <Button
          trailingIcon={ArrowRight}
          disabled={!completable || actions.completing}
          onPress={() => {
            setFailure(null)
            setAsking(stop.ref)
          }}>
          {t(pickupStop ? 'driver.pickup.complete' : 'driver.complete')}
        </Button>
      </>
    )

  if (step === null && flash === null) return null
  return (
    <View style={styles.footer}>
      {flash === null ? null : (
        <View accessibilityRole={flash.tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion={flash.tone === 'danger' ? 'assertive' : 'polite'}>
          <Banner tone={flash.tone} onDismiss={actions.dismissFlash}>
            {flash.message}
          </Banner>
        </View>
      )}
      {step}
      <CompleteStopSheet
        open={asked}
        onClose={() => setAsking(null)}
        screen={screen}
        pending={actions.completing}
        failure={failure}
        onConfirm={() => void handleConfirm()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  footer: { gap: space[2] },
})
