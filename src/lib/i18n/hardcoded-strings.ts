/**
 * Phát hiện chuỗi tiếng Việt viết cứng ngoài từ điển (LM-070, LM-071). Hàm thuần: nhận mã nguồn, bỏ chú thích (giữ nguyên
 * chuỗi, kể cả chuỗi chứa `//`), rồi trả các dòng còn ký tự có dấu tiếng Việt — tức nằm trong chuỗi hoặc chữ JSX.
 * Dòng `new Error(...)` bỏ qua: đó là lỗi bất biến cho lập trình viên, không hiện cho người dùng.
 */

const VIETNAMESE = /[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/

const DEVELOPER_ERROR = /\bnew Error\(/

export type HardcodedLine = { readonly line: number; readonly text: string }

export function stripComments(source: string): string {
  let out = ''
  let i = 0
  let quote: string | null = null
  while (i < source.length) {
    const ch = source[i]!
    const next = source[i + 1]
    if (quote) {
      out += ch
      if (ch === '\\') { out += next ?? ''; i += 2; continue }
      if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? source.length : end + 2
      // Giữ số dòng để báo đúng vị trí.
      out += source.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch
    out += ch
    i++
  }
  return out
}

export function findHardcodedVietnamese(source: string): HardcodedLine[] {
  return stripComments(source)
    .split('\n')
    .flatMap((text, index) => (VIETNAMESE.test(text) && !DEVELOPER_ERROR.test(text) ? [{ line: index + 1, text: text.trim() }] : []))
}
