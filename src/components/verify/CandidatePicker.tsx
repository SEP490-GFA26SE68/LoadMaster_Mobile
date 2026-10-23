import { useState } from 'react'
import { Keyboard, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { TextField } from '@/components/TextField'
import { useT, type TFunction } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { filterCandidates, MAX_PLAIN_CHOICES, MAX_SHOWN_CHOICES, type CandidateFilter } from './candidate-filter'
import type { VerifyCandidate } from './verify-types'

type CandidatePickerProps = {
  candidates: readonly VerifyCandidate[]
  /** Mã nguồn của kiện đang chọn; `''` là chưa chọn. */
  value: string
  onChange: (id: string) => void
  error: string | undefined
}

/**
 * Chọn kiện ở mức xác nhận tay. Tới 8 kiện: mỗi kiện một ô chọn. Nhiều hơn (kho soạn hàng: tới vài trăm kiện chờ): ô tìm phía trên —
 * khớp mã nguồn, mã trên nhãn, tên kiện, không phân biệt dấu và hoa thường —, chỉ vẽ 20 kiện khớp đầu tiên, và một dòng đếm ngay dưới ô
 * tìm (còn thấy được khi bàn phím đang mở). Kiện đang chọn luôn có trong danh sách, đứng đầu khi ô tìm không khớp nó: thứ gửi đi là thứ
 * đang thấy chọn, gõ tìm tiếp không làm mất lựa chọn. Chọn một kiện thì bàn phím đóng, lộ ra phần lý do và nút gửi.
 */
export function CandidatePicker({ candidates, value, onChange, error }: CandidatePickerProps) {
  const t = useT()
  const [query, setQuery] = useState('')

  const group = (list: readonly VerifyCandidate[], select: (id: string) => void) => (
    <ChoiceGroup
      label={t('verify.manualPackage')}
      choices={list.map((candidate) => ({ value: candidate.id, label: candidate.label, description: `${candidate.name} · ${candidate.description}` }))}
      value={value === '' ? undefined : value}
      onChange={select}
      error={error}
      codeLabels
    />
  )

  if (candidates.length <= MAX_PLAIN_CHOICES) return group(candidates, onChange)

  const filter = filterCandidates(candidates, query, value)
  return (
    <View style={styles.picker}>
      <TextField
        label={t('verify.manualFilter.label')}
        hint={t('verify.manualFilter.hint')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
      />
      <AppText color={colors.text2} accessibilityLiveRegion="polite">
        {countLine(filter, t)}
      </AppText>
      {group(filter.shown, (id) => {
        Keyboard.dismiss()
        onChange(id)
      })}
    </View>
  )
}

/** Dòng đếm: bao nhiêu kiện (khớp), và khi danh sách bị cắt thì đang hiện bao nhiêu kiện đầu kèm gợi ý gõ thêm. */
function countLine({ matches, searching }: CandidateFilter, t: TFunction): string {
  const shown = Math.min(matches, MAX_SHOWN_CHOICES)
  if (!searching) return matches > shown ? t('verify.manualFilter.allMore', { count: matches, shown }) : t('verify.manualFilter.all', { count: matches })
  if (matches === 0) return t('verify.manualFilter.none')
  return matches > shown ? t('verify.manualFilter.matchesMore', { count: matches, shown }) : t('verify.manualFilter.matches', { count: matches })
}

const styles = StyleSheet.create({
  picker: { gap: space[3] },
})
