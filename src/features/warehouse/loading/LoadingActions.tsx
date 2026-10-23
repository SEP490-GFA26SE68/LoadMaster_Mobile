import { PackageX, ScanLine } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import type { VerifyController } from '@/components/verify/verify-types'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import { DamagedSheet } from './DamagedSheet'
import type { LoadingSession } from './useLoadingSession'

type LoadingActionsProps = {
  /** Kiện của bước đang hỏi. */
  readonly current: ScenePlacement
  readonly session: LoadingSession
  readonly verify: VerifyController
  /** Nguồn nhận xác nhận tay: tờ đối chiếu có mức 3. */
  readonly manualAllowed: boolean
  /** Số kiện tựa lên kiện đang hỏi trong phương án (trừ kiện đã bị bỏ lại kho). */
  readonly resting: number
}

/**
 * Chân màn của bước xếp khi còn kiện chưa có kết quả (như hàng nút của `LoadingSessionView` web): nút phụ "Kiện hỏng" mở tờ hỏi lại, nút
 * chính "Đối chiếu kiện" mở tờ đối chiếu ba mức — cả hai 56 dp, khoá khi thẻ "Đã xếp" đang hiện hay đang ghi. Dải kết quả của lần báo
 * kiện hỏng nằm ở `LoadingStepView`, trên mọi hàng nút của chân màn.
 */
export function LoadingActions({ current, session, verify, manualAllowed, resting }: LoadingActionsProps) {
  const t = useT()
  // Tờ hỏi lại gắn với một kiện: phiên đã sang kiện khác (ghi xong, máy khác vừa ghi) thì tờ không còn hỏi kiện đó
  const [asking, setAsking] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const busy = session.busy || verify.pending
  if (asking !== null && asking !== current.id && !session.reporting) setAsking(null)

  function openDamaged() {
    setFailure(null)
    setAsking(current.id)
  }

  async function handleDamaged(id: string) {
    setFailure(null)
    const error = await session.reportDamaged(id)
    if (error === null) setAsking(null)
    else setFailure(error)
  }

  return (
    <>
      <View style={styles.row}>
        <Button variant="secondary" icon={PackageX} disabled={busy} style={styles.secondary} onPress={openDamaged}>
          {t('warehouse.damaged.open')}
        </Button>
        <Button icon={ScanLine} disabled={busy} style={styles.primary} onPress={() => verify.setOpen(true)}>
          {t('warehouse.scan.open')}
        </Button>
      </View>
      <PackageVerifySheet
        verify={verify}
        title={t('warehouse.scan.title', { step: current.step })}
        description={t('warehouse.scan.description', { id: current.id, name: current.name })}
        manualAllowed={manualAllowed}
      />
      <DamagedSheet
        open={asking === current.id}
        placement={current}
        resting={resting}
        pending={session.reporting}
        failure={failure}
        onClose={() => setAsking(null)}
        onConfirm={(id) => void handleDamaged(id)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  secondary: { flexGrow: 1 },
  primary: { flexGrow: 1, flexBasis: 180 },
})
