/**
 * Đọc design token từ CSS cho những nơi không dùng được `var()` —
 * điển hình là màu đưa vào Three.js. Giữ `src/index.css` là nguồn duy nhất.
 */

const cache = new Map<string, string>()

export function readToken(name: `--${string}`): string {
  const cached = cache.get(name)
  if (cached) return cached

  if (typeof document === 'undefined') return ''

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

  if (value) cache.set(name, value)
  return value
}
