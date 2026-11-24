import { useRouter } from 'expo-router'
import { ArrowLeft, RotateCcw } from 'lucide-react-native'
import { useRef } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Banner } from '@/components/Banner'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLocale, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { AssistantComposer } from './AssistantComposer'
import { AssistantLog } from './AssistantLog'
import type { AssistantPage } from './assistant-model'
import { useAssistantSession } from './assistant-session'
import { assistantShown } from './assistant-visibility'

export type AssistantScreenProps = {
  /** Màn đã mở trợ lý (route web + tên màn trên app), gửi kèm mọi câu hỏi; vắng khi mở thẳng route. */
  page: AssistantPage | null
}

/**
 * Màn trò chuyện với trợ lý AI Lumo (tài xế, nhân viên kho), mở chồng lên màn chính từ nút trên dải trời. Toàn màn hình trên điện thoại: dải
 * trời có nút quay lại và "Bắt đầu lại"; giữa là cuộc trò chuyện tự cuộn xuống câu mới nhất; dưới cùng là ô gõ và nút gửi, đẩy lên trên bàn
 * phím (`KeyboardAvoidingView`). Cuộc trò chuyện nằm trong bộ nhớ (`assistant-session.ts`): quay lại rồi mở lại vẫn còn.
 */
export function AssistantScreen({ page }: AssistantScreenProps) {
  const t = useT()
  const router = useRouter()
  const { locale } = useLocale()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { session, ask, restart } = useAssistantSession(user?.id ?? null)
  const scroll = useRef<ScrollView>(null)
  const shown = assistantShown(user)

  const back = <IconButton icon={ArrowLeft} tone="sky" label={t('assistant.panel.close')} onPress={() => router.back()} />
  if (user === null || !shown) {
    return (
      <Screen title={t('assistant.launcher.labelApp')} leading={back} scroll>
        <Banner tone="info">{t('lumo.unavailable')}</Banner>
      </Screen>
    )
  }

  const send = (message: string) => void ask(message, { locale, page })
  const restartButton =
    session.entries.length === 0 ? undefined : <IconButton icon={RotateCcw} tone="sky" label={t('assistant.panel.restart')} onPress={restart} />

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen title={t('assistant.launcher.labelApp')} leading={back} actions={restartButton}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <View style={styles.column}>
            <AssistantLog entries={session.entries} pending={session.pending} role={user.role} onSend={send} />
          </View>
        </ScrollView>
        <View style={[styles.composer, { paddingBottom: insets.bottom + space[3] }]}>
          <View style={styles.column}>
            <AssistantComposer pending={session.pending} onSend={send} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const COLUMN = { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space[4] } as const

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: space[4], paddingBottom: space[6] },
  column: COLUMN,
  composer: { paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.bg },
})
