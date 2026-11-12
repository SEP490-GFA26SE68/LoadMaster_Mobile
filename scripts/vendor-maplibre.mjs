// Đóng gói MapLibre GL JS vào app: bản đồ tuyến của tài xế chạy trong WebView và không được tải thư viện từ CDN (mạng yếu là mất bản
// đồ). Script đọc bản dựng sẵn của gói `maplibre-gl` (devDependency, khoá đúng một version) và viết thành chuỗi trong
// src/features/driver/maplibre-dist.generated.ts — file sinh ra, không commit, không sửa tay.
//
//   pnpm vendor:maplibre    chạy tự động sau `pnpm install` (postinstall) và trước `pnpm check`, `pnpm start`, `pnpm android`…;
//                           pnpm bỏ qua postinstall khi node_modules đã đủ, nên các lệnh đó tự gọi lại (không đổi thì không ghi)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'features', 'driver', 'maplibre-dist.generated.ts')

const require = createRequire(join(ROOT, 'package.json'))
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'))
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
// Hermes cất chuỗi có ký tự ngoài ASCII thành UTF-16 (gấp đôi số byte): đổi mấy ký tự đó (bảng dấu câu dọc của MapLibre) sang `\uXXXX`
// — cùng nghĩa trong mã JS — để cả thư viện chỉ chiếm một byte mỗi ký tự trong bundle
const toAscii = (code) => code.replace(/[^\x00-\x7f]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
const js = toAscii(readFileSync(join(pkgDir, 'dist', 'maplibre-gl.js'), 'utf8'))
const css = readFileSync(join(pkgDir, 'dist', 'maplibre-gl.css'), 'utf8')
if (/[^\x00-\x7f]/.test(css)) throw new Error(`maplibre-gl ${version}: CSS có ký tự ngoài ASCII, cần đổi cách đóng gói`)
// Mã đã đổi vẫn phải là JS hợp lệ
new vm.Script(js)

// Chuỗi được chèn thẳng vào <script> / <style> của trang HTML: một thẻ đóng lọt vào sẽ cắt trang
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error(`maplibre-gl ${version} có thẻ đóng trong mã, không chèn thẳng được`)

const banner = `// File sinh bởi scripts/vendor-maplibre.mjs từ maplibre-gl@${version} (3-Clause BSD). Không sửa tay, không commit.\n`
const body = [
  `export const MAPLIBRE_VERSION = ${JSON.stringify(version)}`,
  `export const MAPLIBRE_JS = ${JSON.stringify(js)}`,
  `export const MAPLIBRE_CSS = ${JSON.stringify(css)}`,
].join('\n')

const content = `${banner}${body}\n`
// Không đổi thì không ghi: Metro đang chạy không phải dựng lại bundle
if (existsSync(OUT) && readFileSync(OUT, 'utf8') === content) process.exit(0)
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, content)
console.log(`maplibre-gl ${version}: ${(js.length / 1024).toFixed(0)} KB JS + ${(css.length / 1024).toFixed(0)} KB CSS → ${OUT}`)
