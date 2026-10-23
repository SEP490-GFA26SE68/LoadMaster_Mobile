import type { VerifyCandidate } from './verify-types'

/** Tới chừng này kiện, mỗi kiện là một ô chọn; nhiều hơn thì có ô tìm. */
export const MAX_PLAIN_CHOICES = 8

/** Ô chọn vẽ tối đa khi có ô tìm: thân tờ trượt là `ScrollView` (không ảo hoá), vài trăm ô chọn cùng lúc là chậm. */
export const MAX_SHOWN_CHOICES = 20

/**
 * Dấu tiếng Việt sau khi tách NFD là ký tự kết hợp trong khoảng U+0300–U+036F (huyền, sắc, hỏi, ngã, nặng, mũ, trăng, móc). Hai biểu thức
 * dưới dựng từ mã ký tự, như bản web: file không chứa ký tự kết hợp trần hay chữ có dấu (cổng i18n quét cả mã, không chỉ chữ hiển thị).
 */
const COMBINING_MARKS = new RegExp(`[${String.fromCodePoint(0x300)}-${String.fromCodePoint(0x36f)}]`, 'g')

/** Đ, đ (U+0110, U+0111) là chữ riêng, NFD không tách ra D + dấu. */
const D_WITH_STROKE = new RegExp(`[${String.fromCodePoint(0x110, 0x111)}]`, 'g')

const WHITESPACE = /\s+/g

/** Chữ để so khi tìm, như `normalizeSearchText` của web: bỏ dấu, đ → d, chữ thường, gộp khoảng trắng. */
export function searchText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').replace(D_WITH_STROKE, 'd').toLowerCase().replace(WHITESPACE, ' ').trim()
}

export type CandidateFilter = {
  /** Ô chọn để vẽ: tối đa `MAX_SHOWN_CHOICES` kiện khớp đầu tiên, cộng kiện đang chọn (đứng đầu) khi nó không nằm trong số đó. */
  readonly shown: readonly VerifyCandidate[]
  /** Số kiện khớp ô tìm; ô tìm trống là mọi kiện. */
  readonly matches: number
  /** Ô tìm có chữ. */
  readonly searching: boolean
}

/**
 * Kiện khớp khi **mọi** từ của ô tìm có trong mã nguồn, mã trên nhãn hoặc tên kiện, không kể thứ tự và không phân biệt dấu, hoa thường:
 * "keo 07" khớp "PKG-001-07 · Băng keo". Kiện đang chọn luôn nằm trong `shown`, để thứ gửi đi là thứ đang thấy chọn.
 */
export function filterCandidates(candidates: readonly VerifyCandidate[], query: string, selectedId: string): CandidateFilter {
  const terms = searchText(query).split(' ').filter((term) => term !== '')
  const matched =
    terms.length === 0
      ? candidates
      : candidates.filter((candidate) => {
          const text = searchText(`${candidate.id} ${candidate.label} ${candidate.name}`)
          return terms.every((term) => text.includes(term))
        })
  const first = matched.slice(0, MAX_SHOWN_CHOICES)
  const selected = candidates.find((candidate) => candidate.id === selectedId)
  return {
    shown: selected === undefined || first.includes(selected) ? first : [selected, ...first],
    matches: matched.length,
    searching: terms.length > 0,
  }
}
