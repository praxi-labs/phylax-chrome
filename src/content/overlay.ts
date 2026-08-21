import { normaliseVerdict, verdictHeadline, verdictTone, type Verdict } from '../core/verdict.js'

export const BADGE_ID = 'phylax-badge'

export interface BadgeContent {
  tone: 'safe' | 'caution' | 'danger' | 'neutral'
  title: string
  detail: string
  action?: { label: string; url: string }
}

export function badgeFromResult(result: Record<string, unknown>): BadgeContent {
  if (String(result.coverage ?? '') === 'none') {
    return {
      tone: 'neutral',
      title: 'Not evaluated',
      detail: 'The network has not analysed this artifact',
    }
  }
  const verdict: Verdict = normaliseVerdict(result.verdict)
  const counts = result.finding_counts
  const detail = summariseFindings(counts)
  return {
    tone: verdictTone(verdict),
    title: verdictHeadline(verdict),
    detail,
  }
}

function summariseFindings(counts: unknown): string {
  if (!counts || typeof counts !== 'object') return 'Checked by Phylax'
  const entries = Object.entries(counts as Record<string, unknown>)
    .map(([severity, value]) => [severity, Number(value)] as const)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
  if (entries.length === 0) return 'No findings'
  const order = ['critical', 'high', 'medium', 'low']
  entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  return entries.map(([severity, value]) => `${value} ${severity}`).join(', ')
}

export function renderBadge(content: BadgeContent): HTMLElement {
  const host = document.createElement('div')
  host.id = BADGE_ID
  host.className = `phylax-badge phylax-${content.tone}`

  const mark = document.createElement('span')
  mark.className = 'phylax-mark'
  mark.textContent = 'Phylax'

  const title = document.createElement('span')
  title.className = 'phylax-title'
  title.textContent = content.title

  const detail = document.createElement('span')
  detail.className = 'phylax-detail'
  detail.textContent = content.detail

  host.append(mark, title, detail)

  if (content.action) {
    const link = document.createElement('a')
    link.className = 'phylax-action'
    link.textContent = content.action.label
    link.href = content.action.url
    link.target = '_blank'
    link.rel = 'noreferrer noopener'
    host.append(link)
  }

  return host
}

export function mountBadge(content: BadgeContent): void {
  document.getElementById(BADGE_ID)?.remove()
  document.body.append(renderBadge(content))
}
