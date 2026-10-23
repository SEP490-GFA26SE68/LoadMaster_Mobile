import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import type { VerifyMethod } from '@/lib/mock-db'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { ManualConfirmForm } from './ManualConfirmForm'
import { QrScanner } from './QrScanner'
import type { VerifyController, VerifyOutcome } from './verify-types'

/** Camera đọc một nhãn nhiều lần mỗi giây: cùng một mã chỉ gửi lại khi đã rời khung hình ít nhất chừng này. */
const SCAN_REPEAT_MS = 3000

const codeSchema = z.object({ code: z.string().trim().min(1, 'codeRequired') })
type CodeInput = z.input<typeof codeSchema>
type CodeValues = z.output<typeof codeSchema>

type PackageVerifySheetProps = {
  verify: VerifyController
  /** Header của tờ, nơi gọi dịch sẵn: việc và nơi đối chiếu ("Đối chiếu kiện dỡ tại điểm 1"). */
  title: string
  /** Dòng dưới header, nơi gọi dịch sẵn: cách làm và tiến độ của bước. */
  description?: string
  /** Nguồn dữ liệu nhận được xác nhận tay: thêm mức 3. */
  manualAllowed: boolean
}

/**
 * Tờ đối chiếu kiện ba mức (như `PackageVerify` của web) cho mọi bước có đối chiếu — tài xế dỡ, nhận dọc đường; kho soạn, xếp: (1) quét
 * nhãn QR bằng camera, (2) gõ mã in dưới hình QR hoặc mã của bên gửi, (3) xác nhận tay kèm lý do — chỉ khi `manualAllowed`. Ba mức là ba
 * tab; kết quả lần đối chiếu gần nhất là một vùng đọc được (thành công, cảnh báo, lỗi) thay cho toast. Tờ không biết kiện nào đúng: mã đi
 * thẳng tới `verify` của nơi gọi, và nơi gọi quyết khi nào tờ đóng (`VerifyController`).
 */
export function PackageVerifySheet({ verify, title, description, manualAllowed }: PackageVerifySheetProps) {
  const t = useT()
  const [level, setLevel] = useState<VerifyMethod>('QR')
  // Mỗi lần tờ mở là một lượt đối chiếu mới, như web (nội dung hộp thoại dựng lại mỗi lần mở): về mức quét QR — kể cả khi chính nơi gọi
  // đóng tờ (`verify.setOpen(false)` sau một lần ghi) rồi mở lại
  const [shownOpen, setShownOpen] = useState(verify.open)
  if (shownOpen !== verify.open) {
    setShownOpen(verify.open)
    if (verify.open) setLevel('QR')
  }
  const levels: VerifyMethod[] = manualAllowed ? ['QR', 'CODE', 'MANUAL'] : ['QR', 'CODE']
  const current = levels.includes(level) ? level : 'QR'
  const lastScan = useRef<{ code: string; at: number } | null>(null)
  const sending = useRef(false)

  // Tờ đóng — bằng nút Đóng hay do nơi gọi — thì quên nhãn camera vừa thấy: mở lại là quét được ngay cả nhãn đó
  useEffect(() => {
    if (!verify.open) lastScan.current = null
  }, [verify.open])

  function close() {
    verify.setOpen(false)
  }

  function handleScan(raw: string) {
    const code = raw.trim()
    if (code === '' || sending.current) return
    const now = Date.now()
    const last = lastScan.current
    lastScan.current = { code, at: now }
    // Nhãn còn trong khung hình: không gửi lại
    if (last !== null && last.code === code && now - last.at < SCAN_REPEAT_MS) return
    sending.current = true
    void verify.verify('QR', code).finally(() => {
      sending.current = false
    })
  }

  return (
    <Sheet
      open={verify.open}
      onClose={close}
      busy={verify.pending}
      title={title}
      description={description}
      footer={
        <Button variant="secondary" style={styles.flex} disabled={verify.pending} onPress={close}>
          {t('verify.close')}
        </Button>
      }>
      <View accessibilityRole="tablist" accessibilityLabel={t('verify.levels')} style={styles.tabs}>
        {levels.map((item) => {
          const selected = item === current
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setLevel(item)}
              style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && !selected && styles.tabPressed]}>
              <AppText variant="label" color={selected ? colors.primary : colors.text2} style={styles.tabText}>
                {t(`common.verifyMethods.${item}`)}
              </AppText>
            </Pressable>
          )
        })}
      </View>
      <VerifyResult result={verify.result} />
      {current === 'QR' ? <QrScanner onDetected={handleScan} /> : null}
      {current === 'CODE' ? <CodeForm pending={verify.pending} onSubmit={(code) => verify.verify('CODE', code)} /> : null}
      {current === 'MANUAL' ? (
        <ManualConfirmForm
          key={verify.candidates.map((candidate) => candidate.id).join(',')}
          candidates={verify.candidates}
          pending={verify.pending}
          onSubmit={verify.confirmManually}
        />
      ) : null}
    </Sheet>
  )
}

/** Kết quả lần đối chiếu gần nhất: lỗi là `alert` (đọc ngay), thành công và cảnh báo là vùng `polite`. */
function VerifyResult({ result }: { result: VerifyOutcome | null }) {
  if (result === null) return null
  const error = result.tone === 'error'
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion={error ? 'assertive' : 'polite'}>
      <Banner tone={error ? 'danger' : result.tone}>{result.message}</Banner>
    </View>
  )
}

/** Mức 2: gõ mã in dưới hình QR, hoặc mã của bên gửi khi nó duy nhất trong chuyến. Ghi được thì ô trống lại cho kiện kế tiếp. */
function CodeForm({ pending, onSubmit }: { pending: boolean; onSubmit: (code: string) => Promise<boolean> }) {
  const t = useT()
  const form = useForm<CodeInput, unknown, CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const submit = form.handleSubmit(async ({ code }) => {
    if (await onSubmit(code)) form.reset({ code: '' })
  })
  // Phím "Xong" của bàn phím không bị khoá như nút: đang ghi thì bỏ qua, không gửi mã thêm lần nữa
  const submitFromKeyboard = () => {
    if (!pending) void submit()
  }
  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label={t('verify.codeLabel')}
            hint={t('verify.codeHint')}
            error={fieldState.error === undefined ? undefined : t('verify.codeRequired')}
            code
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={submitFromKeyboard}
          />
        )}
      />
      <Button loading={pending} onPress={() => void submit()}>
        {t('verify.codeSubmit')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: space[4] },
  tabs: { flexDirection: 'row', gap: space[1], padding: space[1], borderRadius: radius.md, backgroundColor: colors.lineSoft },
  tab: { flex: 1, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2], borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
  tabSelected: { backgroundColor: colors.bg, borderColor: colors.primary },
  tabPressed: { backgroundColor: colors.surface },
  tabText: { textAlign: 'center' },
})
