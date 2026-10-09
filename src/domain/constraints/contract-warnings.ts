import { CONSTRAINT_CODES, type ConstraintCode, type ConstraintIssue } from './issues'

export type ContractWarning = { kind: 'known'; code: ConstraintCode } | { kind: 'unknown'; raw: string }

const KNOWN_CODES: ReadonlySet<string> = new Set(CONSTRAINT_CODES)

function isConstraintCode(value: string): value is ConstraintCode {
  return KNOWN_CODES.has(value)
}

export function toContractWarnings(issues: readonly ConstraintIssue[]): ConstraintCode[] {
  return [...new Set(issues.map(({ code }) => code))]
}

export function fromContractWarnings(warnings: readonly string[]): ContractWarning[] {
  return warnings.map((raw): ContractWarning => (isConstraintCode(raw) ? { kind: 'known', code: raw } : { kind: 'unknown', raw }))
}
