import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { appStartersFor } from '@/features/marketing/assistant/app-starters'
import { dataErrorMessage, useT } from '@/lib/i18n'
import type { Role } from '@/types/user'
import { colors, radius, space } from '@/theme/tokens'

import { AssistantAnswer } from './AssistantAnswer'
import { LUMO_NAME } from './assistant-model'
import type { ChatEntry } from './assistant-session'
import { LUMO_EXPLAIN_BASE64 } from './lumo-faces'

const EXPLAIN = { uri: `data:image/webp;base64,${LUMO_EXPLAIN_BASE64}` }

type AssistantLogProps = {
  entries: readonly ChatEntry[]
  pending: boolean
  role: Role
  onSend: (message: string) => void
}

/** Ảnh Lumo cạnh câu trả lời và ở màn chào — chỉ để nhìn. */
function Face({ size }: { size: number }) {
  return (
    <Image
      source={EXPLAIN}
      style={[styles.face, { width: size, height: size }]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  )
}

/**
 * Cuộc trò chuyện: chưa hỏi gì thì là màn chào (Lumo, một câu chào, câu hỏi gợi ý theo vai trò — cùng bộ với bản web); sau đó là các lượt
 * hỏi / đáp, dòng "Lumo đang trả lời…" khi chờ, và câu lỗi (dịch từ mã) khi một lượt không trả lời được.
 */
export function AssistantLog({ entries, pending, role, onSend }: AssistantLogProps) {
  const t = useT()
  const lastAnswer = entries.findLast((entry) => entry.kind === 'answer')?.id
  if (entries.length === 0) {
    return (
      <View style={styles.welcome}>
        <View style={styles.greeting}>
          <Face size={64} />
          <View style={styles.flex}>
            <AppText variant="heading">{t('assistant.panel.greeting', { name: LUMO_NAME })}</AppText>
            <AppText color={colors.text2}>{t('assistant.panel.introHintApp')}</AppText>
          </View>
        </View>
        <AppText variant="label" accessibilityRole="header">
          {t('assistant.panel.starters')}
        </AppText>
        {appStartersFor(role).map((id) => (
          <Button key={id} variant="secondary" disabled={pending} onPress={() => onSend(t(`assistant.panel.appStarters.${id}`))}>
            {t(`assistant.panel.appStarters.${id}`)}
          </Button>
        ))}
      </View>
    )
  }
  return (
    <View style={styles.log}>
      {entries.map((entry) => {
        if (entry.kind === 'question') {
          return (
            <View key={entry.id} style={styles.question}>
              <AppText>{entry.text}</AppText>
            </View>
          )
        }
        if (entry.kind === 'error') {
          return (
            <Banner key={entry.id} tone="danger">
              {dataErrorMessage(entry.error, t)}
            </Banner>
          )
        }
        return (
          <View key={entry.id} style={styles.answer}>
            <Face size={32} />
            <View style={styles.flex}>
              <AppText variant="meta" color={colors.text3}>
                {t('assistant.panel.says', { name: LUMO_NAME })}
              </AppText>
              <AssistantAnswer reply={entry.reply} role={role} last={entry.id === lastAnswer} pending={pending} onSend={onSend} />
            </View>
          </View>
        )
      })}
      {pending ? (
        <View style={styles.typing} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText color={colors.text2}>{t('assistant.panel.typing', { name: LUMO_NAME })}</AppText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space[1] },
  welcome: { gap: space[3] },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  log: { gap: space[4] },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryBg,
  },
  answer: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  typing: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  face: { borderRadius: radius.md },
})
