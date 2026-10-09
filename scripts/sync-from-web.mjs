// Chép phần logic thuần của bản web sang app mobile. Bản web là nguồn chuẩn: file liệt kê ở `src/web-mirror.json` KHÔNG sửa ở mobile.
//
//   pnpm sync:web           chép lại từ ../LoadMaster/src (hoặc biến WEB_SRC)
//   pnpm sync:web:check     chỉ so với bản web, thoát mã 1 khi bản web đã khác bản đang có
//   pnpm sync:web:verify    không cần repo web: thoát mã 1 khi có file trong danh sách bị sửa tay (chạy trong `pnpm check` và CI)
//
// File mobile phải viết riêng (web dùng `import.meta`, Web Worker, BroadcastChannel) nằm ở scripts/web-overrides/<cùng đường dẫn>
// và được chép đè sau cùng.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WEB_SRC = resolve(process.env.WEB_SRC ?? join(ROOT, '..', 'LoadMaster', 'src'))
const OVERRIDES = join(ROOT, 'scripts', 'web-overrides')
const MANIFEST = join(ROOT, 'src', 'web-mirror.json')

/** Thư mục chép nguyên từ web, đường dẫn tính từ `src/`. */
const MIRRORED_DIRS = ['domain', 'types', 'services/optimization', 'lib/mock-db']

/** File lẻ: logic thuần nằm trong một feature của web mà mobile dùng lại nguyên văn. */
const MIRRORED_FILES = [
  'features/auth/permissions.ts',
  'features/driver/my-trips.ts',
  'lib/i18n/types.ts',
  ...['dataErrors', 'issues', 'language', 'roles', 'status'].flatMap((branch) => [`lib/i18n/vi/${branch}.ts`, `lib/i18n/en/${branch}.ts`]),
]

/** Không chép: test, bench và phần chỉ chạy được trong trình duyệt. */
const SKIPPED_NAMES = [/\.test\.tsx?$/, /\.test-d\.ts$/, /\.bench\.ts$/, /^__snapshots__$/]
const SKIPPED_FILES = new Set([
  'services/optimization/index.ts',
  'services/optimization/create-service.ts',
  'services/optimization/WorkerOptimizationService.ts',
  'services/optimization/optimization.worker.ts',
  'services/optimization/worker-protocol.ts',
  'lib/mock-db/app-db.ts',
  'lib/mock-db/tab-sync.ts',
  'lib/mock-db/tab-sync-tables.ts',
])

/** File chép kèm một sửa đổi nhỏ, tất định: bỏ dòng xuất phần chỉ có ở trình duyệt. */
const TRANSFORMS = {
  'lib/mock-db/index.ts': (text) =>
    text
      .split('\n')
      .filter((line) => !line.includes("from './app-db'"))
      .join('\n'),
}

const slash = (path) => path.split('\\').join('/')
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

function listFiles(dir, base = dir) {
  const found = []
  for (const name of readdirSync(dir)) {
    if (SKIPPED_NAMES.some((pattern) => pattern.test(name))) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) found.push(...listFiles(full, base))
    else found.push(slash(relative(base, full)))
  }
  return found
}

/** Mọi file sẽ có ở mobile: đường dẫn (tính từ `src/`) → nội dung, xuống dòng kiểu LF. */
function plan() {
  const files = new Map()
  const fromWeb = (path) => {
    const text = read(join(WEB_SRC, path))
    files.set(path, TRANSFORMS[path]?.(text) ?? text)
  }
  for (const dir of MIRRORED_DIRS) {
    for (const file of listFiles(join(WEB_SRC, dir))) if (!SKIPPED_FILES.has(`${dir}/${file}`)) fromWeb(`${dir}/${file}`)
  }
  for (const path of MIRRORED_FILES) fromWeb(path)
  for (const path of existsSync(OVERRIDES) ? listFiles(OVERRIDES) : []) files.set(path, read(join(OVERRIDES, path)))
  return files
}

/**
 * Thứ bộ máy JavaScript của điện thoại (Hermes) không có và app không bù (`src/polyfills.ts`): code chép từ web dùng tới là app hỏng
 * trên máy, trong khi test trên Node vẫn xanh. Đo trên Android, bản APK của SDK 57.
 */
const UNSUPPORTED = /Object\.groupBy|Map\.groupBy|Array\.fromAsync|Intl\.(PluralRules|ListFormat|RelativeTimeFormat|Segmenter)/

function assertRunsOnDevice(files) {
  const offenders = [...files].flatMap(([path, text]) => {
    const found = text.match(UNSUPPORTED)
    return found ? [`${path}: ${found[0]}`] : []
  })
  if (offenders.length === 0) return
  console.error('Code chép từ web dùng thứ điện thoại không có:')
  for (const offender of offenders) console.error(`  ${offender}`)
  console.error('Đổi cách viết ở bản web, hoặc thêm bản bù vào src/polyfills.ts rồi bỏ nó khỏi UNSUPPORTED.')
  process.exit(1)
}

/** Dấu của nội dung, không phụ thuộc kiểu xuống dòng của máy. */
function digest(files) {
  const hash = createHash('sha256')
  for (const path of [...files.keys()].sort()) hash.update(`${path}\n${files.get(path)}\n`)
  return hash.digest('hex')
}

// Không cần repo web: tính lại dấu từ chính file của mobile. Lệch nghĩa là có file trong danh sách đã bị sửa tay.
if (process.argv.includes('--verify')) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const local = new Map(manifest.files.map((path) => [path, read(join(ROOT, 'src', path))]))
  assertRunsOnDevice(local)
  if (digest(local) === manifest.digest) {
    console.log(`File chép từ bản web còn nguyên: ${local.size} file.`)
    process.exit(0)
  }
  console.error('Có file chép từ bản web đã bị sửa ở mobile (danh sách: src/web-mirror.json). Sửa ở bản web rồi chạy `pnpm sync:web`.')
  process.exit(1)
}

if (!existsSync(WEB_SRC)) {
  console.error(`Không thấy mã nguồn bản web ở ${WEB_SRC}. Đặt biến WEB_SRC trỏ tới thư mục src của repo web.`)
  process.exit(1)
}

const files = plan()
assertRunsOnDevice(files)
const next = digest(files)

if (process.argv.includes('--check')) {
  const current = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null
  if (current?.digest === next) {
    console.log(`Khớp bản web: ${files.size} file.`)
    process.exit(0)
  }
  console.error('Bản web đã đổi so với bản đang có ở mobile. Chạy `pnpm sync:web`, rồi lint, kiểm kiểu và test.')
  process.exit(1)
}

for (const dir of MIRRORED_DIRS) rmSync(join(ROOT, 'src', dir), { recursive: true, force: true })
for (const [path, text] of files) {
  const target = join(ROOT, 'src', path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
}
const manifest = { syncedOn: new Date().toISOString().slice(0, 10), digest: next, files: [...files.keys()].sort() }
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Đã chép ${files.size} file từ ${WEB_SRC}.`)
