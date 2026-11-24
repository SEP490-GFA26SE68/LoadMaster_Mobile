import { useRouter } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { answerBlocks } from '@/features/marketing/assistant/assistant-text'
import { useT } from '@/lib/i18n'
import type { Role } from '@/types/user'
import { colors, space } from '@/theme/tokens'

import { appLinksOf } from './app-links'
import type { AssistantReply } from './assistant-model'

type AssistantAnswerProps = {
  reply: AssistantReply
  role: Role
  /** Câu trả lời mới nhất: chỉ nó còn mời chuyển cho đội hỗ trợ. */
  last: boolean
  /** Đang chờ câu trả lời khác: hai nút chuyển cho đội hỗ trợ mờ đi. */
  pending: boolean
  onSend: (message: string) => void
}

/**
 * Một câu trả lời của mô hình: chữ thành đoạn / danh sách (`answerBlocks`, chép từ web — không bao giờ vẽ Markdown thô), nút mở màn liên quan
 * của app (`appLinksOf`: route web không có màn tương ứng trên app bị bỏ), mã yêu cầu hỗ trợ đã tạo, và — ở câu mới nhất — hai nút trả lời
 * lời mời chuyển cho đội hỗ trợ. Lệnh cho khung 3D (`uiActions`) không có ở đây: app không có khung đó.
 */
export function AssistantAnswer({ reply, role, last, pending, onSend }: AssistantAnswerProps) {
  const t = useT()
  const router = useRouter()
  const links = appLinksOf(reply.links, role)
  const ticket = reply.handoff.ticketCode
  const askHandoff = last && reply.handoff.offered && ticket === null
  return (
    <View style={styles.root}>
      {answerBlocks(reply.text).map((block, index) =>
        block.kind === 'paragraph' ? (
          <AppText key={index}>{block.text}</AppText>
        ) : (
          <View key={index} style={styles.list}>
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <AppText color={colors.text2}>{block.kind === 'steps' ? `${itemIndex + 1}.` : '•'}</AppText>
                <AppText style={styles.itemText}>{item}</AppText>
              </View>
            ))}
          </View>
        ),
      )}
      {links.length === 0 ? null : (
        <View style={styles.actions}>
          <AppText variant="meta" color={colors.text3}>
            {t('assistant.ai.links')}
          </AppText>
          {links.map((link) => (
            <Button key={String(link.href)} variant="secondary" trailingIcon={ArrowRight} onPress={() => router.push(link.href)}>
              {link.label}
            </Button>
          ))}
        </View>
      )}
      {ticket === null ? null : (
        <AppText variant="label" color={colors.success} accessibilityLiveRegion="polite">
          {t('lumo.ticket', { code: ticket })}
        </AppText>
      )}
      {askHandoff ? (
        <View style={styles.actions}>
          <AppText variant="label">{t('assistant.ai.handoffQuestion')}</AppText>
          <Button variant="secondary" disabled={pending} onPress={() => onSend(t('assistant.ai.handoffYesMessage'))}>
            {t('assistant.ai.handoffYes')}
          </Button>
          <Button variant="secondary" disabled={pending} onPress={() => onSend(t('assistant.ai.handoffNoMessage'))}>
            {t('assistant.ai.handoffNo')}
          </Button>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[3] },
  list: { gap: space[1] },
  item: { flexDirection: 'row', gap: space[2] },
  itemText: { flex: 1 },
  actions: { gap: space[2] },
})
