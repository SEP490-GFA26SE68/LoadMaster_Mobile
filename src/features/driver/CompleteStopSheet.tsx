import { ArrowRight, CircleCheck, Flag, PackageCheck, PackageOpen, TriangleAlert, Undo2, type LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import type { StopScreen } from './driver-model'

type CompleteStopSheetProps = {
  open: boolean
  onClose: () => void
  screen: StopScreen
  pending: boolean
  /** Lỗi của lần hoàn tất vừa rồi, đã dịch. */
  failure: string | null
  onConfirm: () => void
}

/**
 * Hỏi lại trước khi hoàn tất điểm giao hoặc điểm nhận (như `CompleteStopDialog` của web): hoàn tất là ghi thật và không mở lại được. Tờ
 * nói điều sẽ xảy ra với từng nhóm kiện — đã dỡ thành Đã giao, chưa dỡ ở lại xe thành Hoàn trả (bằng chữ, kèm mã từng kiện), kiện nhận lên
 * xe thành Đang vận chuyển —, số sự cố đã báo, và điểm kế tiếp hay đây là điểm cuối (nguồn không biết thì nói màn sẽ tự chuyển). Đang ghi
 * thì không đóng được; lỗi thì tờ giữ nguyên và nói lỗi; ghi xong màn sang điểm kế tiếp hoặc tổng kết chuyến.
 */
export function CompleteStopSheet({ open, onClose, screen, pending, failure, onConfirm }: CompleteStopSheetProps) {
  const t = useT()
  const { delivered, returned, picked, issues, next, nextKnown } = screen.completion
  const nothing = delivered + returned.length + picked === 0
  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={pending}
      title={t('driver.completeConfirm.title', { number: screen.stop.number, name: screen.stop.name })}
      description={t('driver.completeConfirm.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
            {t('driver.completeConfirm.cancel')}
          </Button>
          <Button style={styles.flex} loading={pending} onPress={onConfirm}>
            {t('driver.completeConfirm.confirm')}
          </Button>
        </>
      }>
      <View style={styles.lines}>
        {nothing ? <Line icon={PackageOpen}>{t('driver.noItems')}</Line> : null}
        {delivered > 0 ? (
          <Line icon={CircleCheck} done>
            {t('driver.completeConfirm.delivered', { count: delivered })}
          </Line>
        ) : null}
        {picked > 0 ? (
          <Line icon={PackageCheck} done>
            {t('driver.completeConfirm.picked', { count: picked })}
          </Line>
        ) : null}
        {returned.length > 0 ? (
          // Hoàn trả nói bằng chữ và mã kiện; nền hổ phách chỉ để nhấn
          <View style={styles.returned}>
            <View style={styles.line}>
              <Undo2 color={badgeTones.warning.fg} size={20} strokeWidth={1.5} />
              <AppText variant="label" color={badgeTones.warning.fg} style={styles.flex}>
                {t('driver.completeConfirm.returned', { count: returned.length })}
              </AppText>
            </View>
            {returned.map((item) => (
              <AppText key={item.id} style={styles.returnedItem}>
                <AppText variant="label" style={styles.code}>
                  {item.label}
                </AppText>
                {` · ${item.name}`}
              </AppText>
            ))}
          </View>
        ) : null}
        {issues > 0 ? <Line icon={TriangleAlert}>{t('driver.completeConfirm.issues', { count: issues })}</Line> : null}
      </View>
      <View style={styles.line}>
        {next !== undefined || !nextKnown ? <ArrowRight color={colors.text3} size={20} strokeWidth={1.5} /> : <Flag color={colors.text3} size={20} strokeWidth={1.5} />}
        <AppText color={colors.text2} style={styles.flex}>
          {next !== undefined
            ? t('driver.completeConfirm.next', { number: next.number, name: next.name })
            : nextKnown
              ? t('driver.completeConfirm.last')
              : t('driver.completeConfirm.nextUnknown')}
        </AppText>
      </View>
      {failure === null ? null : (
        <View accessibilityRole="alert">
          <Banner tone="danger">{failure}</Banner>
        </View>
      )}
    </Sheet>
  )
}

/** Một dòng của tờ hỏi lại; `done` tô icon xanh lá — chữ vẫn nói đủ. */
function Line({ icon: Icon, done = false, children }: { icon: LucideIcon; done?: boolean; children: ReactNode }) {
  return (
    <View style={styles.line}>
      <Icon color={done ? badgeTones.success.fg : colors.text3} size={20} strokeWidth={1.5} />
      <AppText variant="label" style={styles.flex}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lines: { gap: space[3] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  returned: {
    gap: space[1],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: badgeTones.warning.border,
    backgroundColor: badgeTones.warning.bg,
  },
  returnedItem: { paddingLeft: space[6] + space[1] },
  code: { fontVariant: ['tabular-nums'] },
})
