// Expo Router 57 trên Android: Promise `getInitialURL` gọi `onUnhandledLinking` (setState) trước khi NavigationContainer
// commit — React 19 báo "Can't perform a React state update on a component that hasn't mounted yet" (expo/expo#49378).
// SDK 58 bỏ callback này. Giữ bản vá tới khi lên SDK 58: hoãn setState tới effect sau mount. Idempotent.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MARKER = 'LOADMASTER: defer onUnhandledLinking until mount (expo/expo#49378)'

const FILES = [
  {
    relative: join('build', 'fork', 'useLinking.native.js'),
    extract: '(0, extractPathFromURL_1.extractExpoPathFromURL)',
    react: 'react_1',
  },
  {
    relative: join('build', 'react-navigation', 'native', 'useLinking.native.js'),
    extract: '(0, extractPathFromURL_1.extractPathFromURL)',
    react: 'React',
  },
]

function patch(source, extract, react) {
  if (source.includes(MARKER)) return source
  const needle = `                    return url.then((url) => {
                        const state = getStateFromURL(url);
                        if (typeof url === 'string') {
                            // If the link were handled, it gets cleared in NavigationContainer
                            onUnhandledLinking(${extract}(prefixes, url));
                        }
                        return state;
                    });`
  if (!source.includes(needle)) return null
  const ref = react === 'React' ? 'React.useRef' : '(0, react_1.useRef)'
  const effect = react === 'React' ? 'React.useEffect' : '(0, react_1.useEffect)'
  const hook = `
    const linkingMounted = ${ref}(false);
    const pendingUnhandledLink = ${ref}(null);
    ${effect}(() => {
        linkingMounted.current = true;
        if (pendingUnhandledLink.current !== null) {
            const pending = pendingUnhandledLink.current;
            pendingUnhandledLink.current = null;
            onUnhandledLinking(pending);
        }
        return () => {
            linkingMounted.current = false;
        };
    }, [onUnhandledLinking]);
`
  const withHook = source.replace(
    '    const getStateFromURL =',
    `${hook}\n    const getStateFromURL =`,
  )
  const replacement = `                    return url.then((url) => {
                        const state = getStateFromURL(url);
                        if (typeof url === 'string') {
                            // ${MARKER}
                            const path = ${extract}(prefixes, url);
                            if (linkingMounted.current) onUnhandledLinking(path);
                            else pendingUnhandledLink.current = path;
                        }
                        return state;
                    });`
  return withHook.replace(needle, replacement)
}

const require = createRequire(join(ROOT, 'package.json'))
const pkgDir = dirname(require.resolve('expo-router/package.json'))

for (const file of FILES) {
  const path = join(pkgDir, file.relative)
  if (!existsSync(path)) {
    console.warn(`patch-expo-router-linking: không thấy ${file.relative}`)
    continue
  }
  const before = readFileSync(path, 'utf8')
  const after = patch(before, file.extract, file.react)
  if (after === null) {
    console.warn(`patch-expo-router-linking: ${file.relative} không khớp bản Expo Router 57 — bỏ qua`)
    continue
  }
  if (after === before) continue
  writeFileSync(path, after)
}
