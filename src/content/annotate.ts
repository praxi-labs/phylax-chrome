import { badgeFromResult, mountBadge, type BadgeContent } from './overlay.js'

const SETTINGS_HINT = 'Open the Phylax extension options to add your API key'
const UPGRADE_URL = 'https://phyi.dev/pricing'

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

async function check(): Promise<void> {
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

let lastUrl = location.href

function watchNavigation(): void {
  const observer = new MutationObserver(() => {
    if (location.href === lastUrl) return
    lastUrl = location.href
    document.getElementById('phylax-badge')?.remove()
    void check()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

void check()
watchNavigation()
