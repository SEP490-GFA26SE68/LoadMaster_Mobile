import manifest from '@/web-mirror.json'

import { findHardcodedVietnamese } from './hardcoded-strings'

/**
 * Cổng i18n, cùng cách với bản web: chữ hiển thị đi qua từ điển `vi` / `en` (AGENTS mục 8). Quét mọi file `.ts`, `.tsx` của mobile
 * trong `src/`, bỏ chú thích, báo từng dòng còn chữ có dấu tiếng Việt. Lỗi bất biến cho lập trình viên (`throw new Error(...)`, thông
 * điệp cùng dòng) được viết tiếng Việt. Không quét: file chép từ web (bản web có cổng riêng), nhánh từ điển, test. Ngoại lệ: `ALLOWED`.
 */

// Jest chạy test trên Node, nhưng tsconfig của app không nạp kiểu của Node (app chạy trên Hermes): khai đúng phần test này dùng.
declare const __dirname: string
type NodeFs = {
  existsSync(path: string): boolean
  readdirSync(path: string, options: { recursive: true }): string[]
  readFileSync(path: string, encoding: 'utf8'): string
}
const { existsSync, readdirSync, readFileSync } = jest.requireActual<NodeFs>('node:fs')
const { join } = jest.requireActual<{ join(...parts: string[]): string }>('node:path')

const ROOT = join(__dirname, '..', '..', '..')

/** File chép nguyên từ web (`src/web-mirror.json`). File mobile viết đè ở `scripts/web-overrides` vẫn là code của mobile, vẫn quét. */
const FROM_WEB = new Set(
  manifest.files.filter((path) => !existsSync(join(ROOT, 'scripts', 'web-overrides', path))).map((path) => `src/${path}`),
)

const EXCLUDED = [
  // Nhánh từ điển: nơi chữ giao diện phải nằm
  /^src\/lib\/i18n\/(vi|en)\//,
  // Test so với chữ của từ điển; `src/test/` dựng môi trường test (provider, module native giả, chuyến mẫu)
  /\.test\.tsx?$/,
  /^src\/test\//,
]

/**
 * Ngoại lệ: đoạn chữ không phải chữ giao diện, kèm lý do. Giữ một đoạn chữ chứ không cả file, để chữ giao diện thêm sau vào cùng file
 * vẫn bị chặn. Ngoại lệ không còn khớp dòng nào thì bỏ khỏi danh sách.
 */
const ALLOWED: readonly { file: string; text: string; reason: string }[] = [
  {
    file: 'src/lib/i18n/data-error.ts',
    text: "'[LoadMaster] lỗi không có mã:'",
    reason: 'dòng nhật ký cho lập trình viên, AGENTS mục 9 dặn tìm đúng chữ này trong adb logcat; người dùng thấy câu của từ điển',
  },
  {
    file: 'src/lib/i18n/locale.ts',
    text: "'Tiếng Việt'",
    reason: 'tên ngôn ngữ viết bằng chính ngôn ngữ đó (tên đọc được của nút chuyển ngôn ngữ), không dịch — như bản web',
  },
]

type Finding = { file: string; line: number; text: string }

function findAll(): Finding[] {
  return readdirSync(join(ROOT, 'src'), { recursive: true })
    .map((path) => `src/${path.split('\\').join('/')}`)
    .filter((file) => /\.tsx?$/.test(file) && !FROM_WEB.has(file) && !EXCLUDED.some((pattern) => pattern.test(file)))
    .sort()
    .flatMap((file) => findHardcodedVietnamese(readFileSync(join(ROOT, file), 'utf8')).map((found) => ({ file, ...found })))
}

const covers = (entry: (typeof ALLOWED)[number], finding: Finding) => entry.file === finding.file && finding.text.includes(entry.text)

describe('chữ tiếng Việt viết cứng ngoài từ điển', () => {
  const findings = findAll()

  test('chữ giao diện của mobile đi qua từ điển', () => {
    const offenders = findings
      .filter((finding) => !ALLOWED.some((entry) => covers(entry, finding)))
      .map(({ file, line, text }) => `${file}:${line}  ${text}`)
    expect(offenders).toStrictEqual([])
  })

  test('mỗi ngoại lệ trong ALLOWED còn khớp một dòng', () => {
    const stale = ALLOWED.filter((entry) => !findings.some((finding) => covers(entry, finding))).map(({ file, text }) => `${file}  ${text}`)
    expect(stale).toStrictEqual([])
  })
})
