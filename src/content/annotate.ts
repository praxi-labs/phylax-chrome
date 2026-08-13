import { siteFor, type RegistrySite } from '../core/artifact-ref.js'
import { normaliseVerdict, verdictTone } from '../core/verdict.js'
import { badgeFromResult, mountBadge, type BadgeContent } from './overlay.js'

const SETTINGS_HINT = 'Open the Phylax extension options to add your API key'
const UPGRADE_URL = 'https://phyi.dev/pricing'
const PILL_ATTR = 'data-phylax-pill'
const MAX_ON_PAGE = 25

function contentFor(outcome: Record<string, unknown>): BadgeContent | null {
  switch (outcome.status) {
    case 'ok':
      return badgeFromResult(outcome.result as Record<string, unknown>)
    case 'unauthenticated':
      return { tone: 'neutral', title: 'Sign in to Phylax', detail: SETTINGS_HINT }
    case 'upgrade_required':
      return {
        tone: 'neutral',
        title: 'Not on your plan',
        detail: String(outcome.message ?? ''),
        action: { label: 'See plans', url: UPGRADE_URL },
      }
    case 'rate_limited':
      return { tone: 'neutral', title: 'Rate limited', detail: 'Try again shortly' }
    default:
      return null
  }
}

async function checkPage(): Promise<void> {
  let response: { outcome: Record<string, unknown> } | undefined
  try {
    response = await chrome.runtime.sendMessage({ type: 'phylax.verify', url: location.href })
  } catch {
    return
  }
  if (!response?.outcome) return
  const content = contentFor(response.outcome)
  if (content) mountBadge(content)
}

function pill(verdict: string): HTMLElement {
  const el = document.createElement('span')
  el.className = `phylax-pill phylax-${verdictTone(normaliseVerdict(verdict))}`
  el.setAttribute(PILL_ATTR, '1')
  el.textContent = normaliseVerdict(verdict) === 'UNKNOWN' ? 'Phylax ?' : normaliseVerdict(verdict)
  el.title = 'Phylax verdict'
  return el
}

function searchLinks(site: RegistrySite): Map<string, HTMLAnchorElement[]> {
  const grouped = new Map<string, HTMLAnchorElement[]>()
  if (!site.searchSelector || !site.linkToPurl) return grouped

  for (const node of document.querySelectorAll<HTMLAnchorElement>(site.searchSelector)) {
    if (node.querySelector(`[${PILL_ATTR}]`)) continue
    if (node.nextElementSibling?.hasAttribute?.(PILL_ATTR)) continue

    const href = node.getAttribute('href') || ''
    const purl = site.linkToPurl(href)
    if (!purl) continue

    const existing = grouped.get(purl)
    if (existing) existing.push(node)
    else grouped.set(purl, [node])

    if (grouped.size >= MAX_ON_PAGE) break
  }
  return grouped
}

async function annotateSearch(site: RegistrySite): Promise<void> {
  const grouped = searchLinks(site)
  if (grouped.size === 0) return

  let verdicts: Record<string, Record<string, unknown>> = {}
  try {
    verdicts = await chrome.runtime.sendMessage({
      type: 'phylax.verifyMany',
      purls: [...grouped.keys()],
    })
  } catch {
    return
  }
  if (!verdicts || typeof verdicts !== 'object') return

  for (const [purl, nodes] of grouped) {
    const result = verdicts[purl]
    if (!result) continue
    for (const node of nodes) {
      if (node.nextElementSibling?.hasAttribute?.(PILL_ATTR)) continue
      node.insertAdjacentElement('afterend', pill(String(result.verdict ?? '')))
    }
  }
}

let lastUrl = location.href
let scheduled = 0

function scan(): void {
  const site = siteFor(location.href)
  if (!site) return
  void checkPage()
  void annotateSearch(site)
}

function watch(): void {
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      document.getElementById('phylax-badge')?.remove()
      for (const stale of document.querySelectorAll(`[${PILL_ATTR}]`)) stale.remove()
    }
    clearTimeout(scheduled)
    scheduled = setTimeout(scan, 400) as unknown as number
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

scan()
watch()
