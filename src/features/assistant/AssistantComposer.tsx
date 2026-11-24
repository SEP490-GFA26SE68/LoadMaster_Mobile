import { Send } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH, type as scale } from '@/theme/tokens'

import { LUMO_NAME } from './assistant-model'

/** Máy chủ nhận câu hỏi tối đa 20.000 ký tự (`ASSISTANT_MESSAGE_TOO_LONG`). */
const MAX_MESSAGE = 20_000

type AssistantComposerProps = {
  pending: boolean
  onSend: (message: string) => void
}

/**
 * Ô gõ câu hỏi và nút gửi 56 × 56 — nút chính của màn, mờ khi ô trống hay đang chờ trả lời. Dưới ô là dòng nói Lumo là trợ lý AI và có thể
 * nhầm (cùng câu với bản web). Gửi xong ô trống lại; Lumo đang trả lời thì ô vẫn gõ được câu kế tiếp.
 */
export function AssistantComposer({ pending, onSend }: AssistantComposerProps) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const blocked = pending || draft.trim() === ''
  const send = () => {
    if (blocked) return
    onSend(draft)
    setDraft('')
  }
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={t('assistant.panel.inputLabel')}
          placeholder={t('assistant.panel.placeholder')}
          placeholderTextColor={colors.text3}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={MAX_MESSAGE}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('assistant.panel.send')}
          accessibilityState={{ disabled: blocked, busy: pending }}
          disabled={blocked}
          onPress={send}
          style={({ pressed }) => [styles.send, pressed && styles.sendPressed, blocked && styles.sendDisabled]}>
          {pending ? <ActivityIndicator color={colors.onPrimary} /> : <Send color={blocked ? colors.textDisabled : colors.onPrimary} size={24} strokeWidth={1.5} />}
        </Pressable>
      </View>
      <AppText color={colors.text3}>{t('assistant.panel.disclaimerAiApp', { name: LUMO_NAME })}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  input: {
    ...scale.body,
    flex: 1,
    minHeight: TOUCH,
    maxHeight: 4 * scale.body.lineHeight + 2 * space[3],
    paddingHorizontal: space[3],
    paddingTop: space[3],
    paddingBottom: space[3],
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    color: colors.text,
    textAlignVertical: 'top',
  },
  send: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.primaryFill,
    borderColor: colors.primaryFillBorder,
  },
  sendPressed: { backgroundColor: colors.primaryFillPressed },
  sendDisabled: { backgroundColor: colors.border, borderColor: colors.border },
})
