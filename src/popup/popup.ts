import { badgeFromResult } from '../content/overlay.js'

const subjectEl = document.getElementById('subject') as HTMLElement
const bodyEl = document.getElementById('body') as HTMLElement

function show(title: string, detail: string, tone = 'neutral'): void {
  bodyEl.className = `body phylax-${tone}`
  bodyEl.textContent = ''
  const heading = document.createElement('strong')
  heading.textContent = title
  const text = document.createElement('span')
  text.textContent = detail
  bodyEl.append(heading, text)
}

document.getElementById('settings')?.addEventListener('click', (event) => {
  event.preventDefault()
  chrome.runtime.openOptionsPage()
})

async function run(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''
  if (!url) {
    show('Nothing to check', 'Open an npm, PyPI or GitHub page')
    return
  }

  const response = await chrome.runtime.sendMessage({ type: 'phylax.verify', url })
  const subject = response?.subject
  subjectEl.textContent = subject?.label ?? ''

  const outcome = response?.outcome
  if (!outcome) {
    show('Check failed', 'Try reloading the page')
    return
  }

  switch (outcome.status) {
    case 'ok': {
      const content = badgeFromResult(outcome.result)
      show(content.title, content.detail, content.tone)
      break
    }
    case 'unauthenticated':
      show('Sign in to Phylax', 'Add your API key in settings')
      break
    case 'upgrade_required':
      show('Not on your plan', String(outcome.message ?? ''))
      break
    case 'rate_limited':
      show('Rate limited', 'Try again shortly')
      break
    default:
      show('Unavailable', String(outcome.message ?? ''))
  }
}

void run()
