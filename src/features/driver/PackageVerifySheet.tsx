import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
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

import type { StopScreen } from './driver-model'
import { ManualConfirmForm } from './ManualConfirmForm'
import { QrScanner } from './QrScanner'
import type { UnloadVerify, VerifyOutcome } from './useUnloadVerify'

/** Camera đọc một nhãn nhiều lần mỗi giây: cùng một mã chỉ gửi lại khi đã rời khung hình ít nhất chừng này. */
const SCAN_REPEAT_MS = 3000

const codeSchema = z.object({ code: z.string().trim().min(1, 'codeRequired') })
type CodeInput = z.input<typeof codeSchema>
type CodeValues = z.output<typeof codeSchema>

/**
 * Tờ đối chiếu kiện ba mức khi dỡ hoặc nhận hàng (như `PackageVerify` của web): (1) quét nhãn QR bằng camera, (2) gõ mã in dưới hình QR
 * hoặc mã của bên gửi, (3) xác nhận tay kèm lý do — chỉ khi nguồn dữ liệu nhận được xác nhận tay. Ba mức là ba tab; kết quả lần đối chiếu
 * gần nhất là một vùng đọc được (thành công, cảnh báo, lỗi) thay cho toast. Tờ không biết kiện nào đúng: mã đi thẳng tới nguồn dữ liệu.
 */
export function PackageVerifySheet({ verify, screen, manualAllowed }: { verify: UnloadVerify; screen: StopScreen; manualAllowed: boolean }) {
  const t = useT()
  const [level, setLevel] = useState<VerifyMethod>('QR')
  const pickupStop = screen.stop.kind === 'PICKUP'
  const levels: VerifyMethod[] = manualAllowed ? ['QR', 'CODE', 'MANUAL'] : ['QR', 'CODE']
  const current = levels.includes(level) ? level : 'QR'
  const lastScan = useRef<{ code: string; at: number } | null>(null)
  const sending = useRef(false)

  function close() {
    lastScan.current = null
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
      title={t(pickupStop ? 'driver.pickup.scanTitle' : 'driver.scan.title', { number: screen.stop.number })}
      description={t(pickupStop ? 'driver.pickup.scanDescription' : 'driver.scan.description', {
        number: screen.stop.number,
        done: screen.doneCount,
        total: screen.total,
      })}
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
            onSubmitEditing={() => void submit()}
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
