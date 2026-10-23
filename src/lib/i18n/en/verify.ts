import type { Dictionary } from '../types'
import type { verify as source } from '../vi/verify'

export const verify = {
  levels: 'How to verify',
  camera: {
    starting: 'Opening the camera…',
    scanning: 'The camera is scanning. Center the QR code in the frame.',
    permission: 'Camera access is needed to scan the QR code on the label.',
    allow: 'Allow the camera',
    denied: 'Camera access is not allowed. Allow the camera for LoadMaster in the device Settings, or type the code printed under the QR image.',
    failed: 'The camera could not be opened. Type the code printed under the QR image.',
    openSettings: 'Open Settings',
  },
  codeLabel: 'QR code or sender code',
  codeHint: "The code printed under the QR image, or the sender's package code printed on the label. Case does not matter.",
  codeRequired: 'Enter a code before verifying.',
  codeSubmit: 'Verify code',
  manualIntro: 'Use this when the label is torn, missing or unreadable. The dispatcher must approve a manual confirmation before this step can finish.',
  manualPackage: 'Package',
  manualFilter: {
    label: 'Find a package',
    hint: 'Type the label code, package ID or package name. Accents are optional.',
    all: { one: '{count} package to choose from.', other: '{count} packages to choose from.' },
    allMore: {
      one: '{count} package to choose from — showing the first {shown}. Type a code or name to find another.',
      other: '{count} packages to choose from — showing the first {shown}. Type a code or name to find another.',
    },
    matches: { one: '{count} package matches.', other: '{count} packages match.' },
    matchesMore: {
      one: '{count} package matches — showing the first {shown}. Type more to narrow the list.',
      other: '{count} packages match — showing the first {shown}. Type more to narrow the list.',
    },
    none: 'No package matches. Check what you typed.',
  },
  manualReason: 'Reason',
  manualNote: 'Note',
  manualNoteHint: 'Required when you choose Other.',
  manualSubmit: 'Send manual confirmation',
  manualEmpty: 'There is no package to confirm manually at this step.',
  errors: {
    packageRequired: 'Choose the package to confirm.',
    reasonRequired: 'Choose a reason.',
    noteRequired: 'A note is required when you choose Other.',
    noteTooLong: 'The note takes at most {max} characters.',
  },
  close: 'Close',
} satisfies Dictionary<typeof source>
