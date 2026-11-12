import { useState } from 'react'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { SealCard } from '../finished/SealCard'
import { SealSheet } from '../finished/SealSheet'
import { SessionExitButton } from '../SessionExitButton'
import { useLeaveSession } from '../useLeaveSession'
import type { ServerLoadingSession } from '../warehouse-server-model'
import { useRecordServerSeal } from './useServerWarehouseQueries'

/**
 * Phiên máy chủ đã xếp xong, chuyến chờ tài xế xuất phát (như `ServerLoadingFinished` của web): tiêu đề, số kiện hỏng bỏ lại kho, niêm
 * phong thùng. Máy chủ còn cho ghi / đổi số seal tới lúc xe rời kho — mở lại sau khi xuất phát là màn "Không mở được phiên xếp". Chân màn:
 * chưa ghi số seal thì "Ghi số seal" là nút chính, "Về danh sách chuyến" nút phụ; đã ghi thì "Về danh sách chuyến" là nút chính. Tờ nhập
 * đang mở thì chân màn ẩn. Máy chủ không trả tuyến, ngày chạy, số kiện theo điểm giao của phiên: màn không vẽ các phần đó.
 */
export function ServerFinishedView({ tripId, session }: { tripId: string; session: ServerLoadingSession }) {
  const t = useT()
  const leave = useLeaveSession()
  const record = useRecordServerSeal(tripId)
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(0)
  const [failure, setFailure] = useState<string | null>(null)
  const damaged = Object.values(session.outcomes).filter((outcome) => outcome === 'damaged').length
  const seal = session.seal ?? undefined
  const description = t('serverWarehouse.session.finishedDescription')

  function startEntry() {
    setFailure(null)
    setRound((value) => value + 1)
    setOpen(true)
  }

  async function submit(sealNumber: string) {
    setFailure(null)
    try {
      await record.mutateAsync(sealNumber)
      setOpen(false)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  const footer = open ? undefined : (
    <>
      {seal === undefined ? <Button write onPress={startEntry}>{t('warehouse.seal.submit')}</Button> : null}
      <Button variant={seal === undefined ? 'secondary' : 'primary'} onPress={leave}>
        {t('warehouse.backToList')}
      </Button>
    </>
  )

  return (
    <Screen title={session.code} leading={<SessionExitButton />} scroll footer={footer}>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          {t('serverWarehouse.session.finishedTitle', { code: session.code })}
        </AppText>
        <AppText color={colors.text2}>
          {damaged > 0 ? `${description} ${t('serverWarehouse.session.finishedDamaged', { count: damaged })}` : description}
        </AppText>
      </Card>
      <SealCard seal={seal} editable failure={open ? null : failure} onChange={startEntry} />
      <SealSheet
        key={round}
        open={open}
        initial={seal?.number ?? ''}
        pending={record.isPending}
        failure={open ? failure : null}
        onCancel={() => {
          setOpen(false)
          setFailure(null)
        }}
        onSubmit={submit}
      />
    </Screen>
  )
}
