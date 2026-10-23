import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { QrScanner } from '@/components/verify/QrScanner'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { normalizeQrToken } from '@/lib/mock-db'
import { space } from '@/theme/tokens'

import { isUnknownPackage, type PackageLookup } from './lookup-api'
import { lookupActions } from './lookup-model'
import { useLookupCapabilities, useReportPackageFoundMutation, useScanPackageMutation } from './useLookupQueries'

/** Camera đọc một nhãn nhiều lần mỗi giây: cùng một mã chỉ gửi lại khi đã rời khung hình ít nhất chừng này (như tờ đối chiếu kiện). */
const SCAN_REPEAT_MS = 3000

const manualSchema = z.object({ token: z.string().refine((value) => normalizeQrToken(value) !== '', 'packageLookup.scan.manualRequired') })
type ManualInput = z.input<typeof manualSchema>
type ManualValues = z.output<typeof manualSchema>

type ScanPackageSheetProps = {
  open: boolean
  onClose: () => void
  /** Mã là một kiện của công ty. `cleared`: kiện mang cờ "Không tìm thấy" và kho vừa gỡ cờ đó. */
  onScanned: (item: PackageLookup, cleared: boolean) => void
}

/**
 * Tờ quét mã QR của tab Tra cứu kiện (như `QrScanDialog` của web): camera, và ô nhập mã in dưới hình QR — luôn có, camera dùng được hay
 * không. Mã (đã chuẩn hoá) tra theo mã QR; kiện mang cờ "Không tìm thấy" được gỡ cờ ngay — đọc được nhãn là đang cầm kiện. Có kiện thì
 * nơi gọi đóng tờ; mã không phải kiện nào của công ty, hay lỗi khác, nói ngay trong tờ và tờ ở lại. Nơi gọi đổi `key` mỗi lần mở để tờ
 * bắt đầu trống.
 */
export function ScanPackageSheet({ open, onClose, onScanned }: ScanPackageSheetProps) {
  const t = useT()
  const capabilities = useLookupCapabilities()
  const scan = useScanPackageMutation()
  const found = useReportPackageFoundMutation()
  const [error, setError] = useState<string | null>(null)
  const lastScan = useRef<{ code: string; at: number } | null>(null)
  const sending = useRef(false)
  const pending = scan.isPending || found.isPending

  /** Tra một mã QR đã chuẩn hoá; mã đến khi lượt trước chưa xong thì bỏ. */
  async function lookUp(token: string) {
    if (sending.current) return
    sending.current = true
    setError(null)
    try {
      const item = await scan.mutateAsync(token)
      const cleared = lookupActions(item.package, capabilities).confirmFound
      if (cleared) await found.mutateAsync(item.package.qrToken)
      onScanned(item, cleared)
    } catch (caught) {
      setError(isUnknownPackage(caught) ? t('lookup.notFound.description', { code: token }) : dataErrorMessage(caught, t))
    } finally {
      sending.current = false
    }
  }

  function handleDetected(raw: string) {
    const token = normalizeQrToken(raw)
    // Tờ đang khép lại sau một lần tra được: camera còn thấy nhãn nhưng không tra lại
    if (!open || token === '' || sending.current) return
    const now = Date.now()
    const last = lastScan.current
    lastScan.current = { code: token, at: now }
    // Nhãn còn trong khung hình: không gửi lại
    if (last !== null && last.code === token && now - last.at < SCAN_REPEAT_MS) return
    void lookUp(token)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={pending}
      title={t('lookup.scanTitle')}
      description={t('lookup.scanDescription')}
      footer={
        <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
          {t('common.close')}
        </Button>
      }>
      <QrScanner onDetected={handleDetected} />
      {error === null ? null : <Banner tone="danger">{error}</Banner>}
      <ManualCodeForm pending={pending} onSubmit={lookUp} />
    </Sheet>
  )
}

/** Ô nhập mã in dưới hình QR: gửi đi như một lần quét, mã đã chuẩn hoá (chữ hoa hay thường, có khoảng trắng đều được). */
function ManualCodeForm({ pending, onSubmit }: { pending: boolean; onSubmit: (token: string) => Promise<void> }) {
  const t = useT()
  const form = useForm<ManualInput, unknown, ManualValues>({ resolver: zodResolver(manualSchema), defaultValues: { token: '' } })
  const submit = form.handleSubmit(({ token }) => onSubmit(normalizeQrToken(token)))
  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="token"
        render={({ field, fieldState }) => (
          <TextField
            label={t('packageLookup.scan.manualLabel')}
            hint={t('packageLookup.scan.manualHint')}
            error={fieldState.error === undefined ? undefined : t('packageLookup.scan.manualRequired')}
            code
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            returnKeyType="done"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Button loading={pending} onPress={() => void submit()}>
        {t('packageLookup.scan.submit')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: space[4] },
})
