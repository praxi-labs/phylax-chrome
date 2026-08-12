export type Verdict = 'ALLOW' | 'WARN' | 'BLOCK' | 'UNKNOWN'

const KNOWN: Record<string, Verdict> = {
  ALLOW: 'ALLOW',
  PASS: 'ALLOW',
  OK: 'ALLOW',
  WARN: 'WARN',
  WARNING: 'WARN',
  REVIEW: 'WARN',
  BLOCK: 'BLOCK',
  DENY: 'BLOCK',
  FAIL: 'BLOCK',
}

export function normaliseVerdict(raw: unknown): Verdict {
  if (typeof raw !== 'string') return 'UNKNOWN'
  return KNOWN[raw.trim().toUpperCase()] ?? 'UNKNOWN'
}

export function verdictTone(verdict: Verdict): 'safe' | 'caution' | 'danger' | 'neutral' {
  switch (verdict) {
    case 'ALLOW':
      return 'safe'
    case 'WARN':
      return 'caution'
    case 'BLOCK':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function verdictHeadline(verdict: Verdict): string {
  switch (verdict) {
    case 'ALLOW':
      return 'No blocking issues'
    case 'WARN':
      return 'Review before installing'
    case 'BLOCK':
      return 'Do not install'
    default:
      return 'Not evaluated'
  }
}
