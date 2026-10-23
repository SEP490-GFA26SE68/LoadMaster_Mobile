/** Tab Tra cứu kiện của nhân viên kho: quét hoặc gõ mã để xem một kiện (`PackageLookupScreen`). */
import type { Dictionary } from '../types'
import type { packageLookup as source } from '../vi/packageLookup'

export const packageLookup = {
  scan: {
    manualLabel: 'Enter code',
    manualHint: 'The code is printed right under the QR image. Case and spaces do not matter.',
    manualRequired: 'Enter a code before confirming.',
    submit: 'Confirm code',
  },
} satisfies Dictionary<typeof source>
