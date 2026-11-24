import { useLocalSearchParams } from 'expo-router'

import { AssistantScreen } from '@/features/assistant/AssistantScreen'

/** Màn trò chuyện với trợ lý AI; `page`, `title` là màn đã mở trợ lý (nút trên dải trời gửi kèm). */
export default function AssistantRoute() {
  const { page, title } = useLocalSearchParams<{ page?: string; title?: string }>()
  return <AssistantScreen page={typeof page === 'string' && page !== '' ? { path: page, title: typeof title === 'string' ? title : '' } : null} />
}
