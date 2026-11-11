import { CircleCheck, Hourglass, Move3d, PackageX, ScanLine } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { PackageVerifySheet } from '@/components/verify/PackageVerifySheet'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { DamagedSheet } from '../loading/DamagedSheet'
import { placementLabel, restingCount, serverLoadingView } from '../server-loading'
import { SessionExitButton } from '../SessionExitButton'
import { StepHeader } from '../StepHeader'
import type { ServerLoadingSession } from '../warehouse-server-model'
import { ServerDeviationSheet } from './ServerDeviationSheet'
import { ServerPlacementCard, ServerPlacementList } from './ServerPlacementCard'
import { useCompleteServerLoading, useReportServerDamaged } from './useServerWarehouseQueries'
import { useServerLoadVerify, type LoadFlash } from './useServerLoadVerify'
import { useSessionRefresh } from './useSessionRefresh'

/** Màn báo vì sao phiên dừng: kiện hỏng có kiện tựa lên đưa chuyến về Đã lập kế hoạch. */
export type SessionNotice = { readonly title: string; readonly description: string }

const FLASH_TONE = { success: 'success', warning: 'warning', error: 'danger' } as const

type ServerLoadingViewProps = {
  readonly tripId: string
  readonly session: ServerLoadingSession
  /** Kiện hỏng có kiện tựa lên: máy chủ đưa chuyến về Đã lập kế hoạch, phiên không còn — màn phiên nói lý do thay cho lỗi đọc phiên. */
  readonly onStopped: (notice: SessionNotice) => void
}

/**
 * Bước Xếp của phiên máy chủ (như `SessionView` của `ServerLoadingSession` web), một thao tác mỗi màn: kiện của bước hiện tại theo thứ tự
 * xếp của phương án đã duyệt. Thân màn: lý do điều phối viên từ chối xác nhận tay (khi có), thẻ kiện cần xếp (vị trí bằng số, nút phụ "Ghi
 * sai lệch vị trí"), rồi thứ tự xếp kèm trạng thái từng kiện. Chân màn: kết quả lần ghi vừa rồi (web: toast), "Kiện hỏng" (phụ) và "Đối chiếu
 * kiện" (chính). Mọi kiện đã có kết quả thì chân màn là "Hoàn tất xếp hàng" — mờ kèm lý do khi còn xác nhận tay chờ duyệt. Kéo xuống để
 * đọc lại phiên.
 */
export function ServerLoadingView({ tripId, session, onStopped }: ServerLoadingViewProps) {
  const t = useT()
  const view = useMemo(() => serverLoadingView(session), [session])
  const { current } = view
  const [flash, setFlash] = useState<LoadFlash | null>(null)
  const verify = useServerLoadVerify(tripId, current, setFlash)
  const damaged = useReportServerDamaged(tripId)
  const complete = useCompleteServerLoading(tripId)
  const refresh = useSessionRefresh(tripId)
  // Tờ "Kiện hỏng" và tờ sai lệch gắn với một kiện: phiên đã sang kiện khác (ghi xong, máy khác vừa ghi) thì tờ không còn hỏi kiện đó
  const [asking, setAsking] = useState<string | null>(null)
  const [deviating, setDeviating] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  if (asking !== null && asking !== current?.id && !damaged.isPending) setAsking(null)
  if (deviating !== null && deviating !== current?.id) setDeviating(null)
  const busy = verify.pending || damaged.isPending
  const blocked = session.pendingManual > 0

  function start(action: () => void) {
    setFlash(null)
    setFailure(null)
    action()
  }

  async function handleDamaged() {
    if (current === undefined) return
    const id = placementLabel(current)
    setFailure(null)
    try {
      const outcome = await damaged.mutateAsync(current.id)
      setAsking(null)
      if (outcome.outcome === 'replanned') onStopped({ title: t('warehouse.damaged.replan', { id }), description: t('warehouse.damaged.replanDescription') })
      else setFlash({ tone: 'warning', message: `${t('warehouse.damaged.recorded', { id })}\n${t('warehouse.damaged.recordedDescription')}` })
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  async function handleComplete() {
    setFailure(null)
    try {
      await complete.mutateAsync()
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  const footer = (
    <>
      {flash === null ? null : (
        <Banner tone={FLASH_TONE[flash.tone]} onDismiss={() => setFlash(null)}>
          {flash.message}
        </Banner>
      )}
      {current === undefined ? (
        <>
          {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
          <Button
            disabled={blocked}
            loading={complete.isPending}
            accessibilityHint={blocked ? t('serverWarehouse.session.manualBlocked', { count: session.pendingManual }) : undefined}
            onPress={() => void handleComplete()}>
            {t('serverWarehouse.session.complete')}
          </Button>
        </>
      ) : (
        <View style={styles.row}>
          <Button variant="secondary" icon={PackageX} disabled={busy} style={styles.secondary} onPress={() => start(() => setAsking(current.id))}>
            {t('warehouse.damaged.open')}
          </Button>
          <Button icon={ScanLine} disabled={busy} style={styles.primary} onPress={() => start(() => verify.setOpen(true))}>
            {t('serverWarehouse.session.verify')}
          </Button>
        </View>
      )}
    </>
  )

  return (
    <Screen
      title={session.code}
      leading={<SessionExitButton />}
      below={<StepHeader kind="loading" step={view.step} total={view.total} recorded={view.done} />}
      scroll
      refresh={refresh}
      footer={footer}>
      {current === undefined ? (
        <Card>
          <View style={styles.line}>
            <CircleCheck color={colors.success} size={24} strokeWidth={1.5} />
            <AppText style={styles.flex}>{t(view.total === 0 ? 'serverWarehouse.session.noPlacements' : 'serverWarehouse.session.allDone')}</AppText>
          </View>
          {blocked ? (
            <View style={styles.line}>
              <Hourglass color={colors.warning} size={24} strokeWidth={1.5} />
              <AppText variant="label" style={styles.flex}>
                {t('serverWarehouse.session.manualBlocked', { count: session.pendingManual })}
              </AppText>
            </View>
          ) : null}
        </Card>
      ) : (
        <ServerPlacementCard placement={current} step={view.step} total={view.total}>
          {view.currentRejected === null ? null : (
            <Banner tone="warning">
              {view.currentRejected.rejectReason
                ? t('serverWarehouse.session.manualRejected', { reason: view.currentRejected.rejectReason })
                : t('serverWarehouse.session.manualRejectedNoReason')}
            </Banner>
          )}
          <Button variant="secondary" icon={Move3d} disabled={busy} onPress={() => start(() => setDeviating(current.id))}>
            {t('serverWarehouse.session.deviate')}
          </Button>
        </ServerPlacementCard>
      )}
      <ServerPlacementList rows={view.rows} />
      {current === undefined ? null : (
        <>
          <PackageVerifySheet
            verify={verify}
            title={t('serverWarehouse.session.verifyTitle', { step: view.step })}
            description={t('serverWarehouse.session.verifyDescription')}
            manualAllowed
          />
          <DamagedSheet
            open={asking === current.id}
            placement={{ id: placementLabel(current), name: current.name, stop: current.stopSequence }}
            resting={restingCount(session, current)}
            pending={damaged.isPending}
            failure={asking === null ? null : failure}
            onClose={() => setAsking(null)}
            onConfirm={() => void handleDamaged()}
          />
          {deviating === current.id ? (
            <ServerDeviationSheet key={current.id} tripId={tripId} placement={current} step={view.step} onClose={() => setDeviating(null)} />
          ) : null}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  secondary: { flexGrow: 1 },
  primary: { flexGrow: 1, flexBasis: 180 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flex: { flex: 1 },
})
