import { TtlCache } from './cache.js'
import { verifySubject, type Outcome } from '../core/client.js'
import { readConfig } from '../core/storage.js'
import { subjectFor, type Subject } from '../core/artifact-ref.js'
import { STORAGE_KEYS } from '../core/constants.js'

export interface VerifyRequest {
  type: 'phylax.verify'
  url: string
}

export interface VerifyResponse {
  outcome: Outcome
  subject: Subject | null
}

const cache = new TtlCache<Outcome>()
const inflight = new Map<string, Promise<Outcome>>()

function cacheKey(subject: Subject): string {
  return subject.kind === 'package' ? `p:${subject.purl}` : `r:${subject.url}`
}

async function resolve(url: string): Promise<VerifyResponse> {
  const subject = subjectFor(url)
  if (!subject) return { outcome: { status: 'unavailable', message: 'Nothing to check here' }, subject: null }

  const config = await readConfig()
  if (!config.enabled) {
    return { outcome: { status: 'unavailable', message: 'Phylax is turned off' }, subject }
  }

  const key = cacheKey(subject)
  const cached = cache.get(key)
  if (cached) return { outcome: cached, subject }

  const pending = inflight.get(key)
  if (pending) return { outcome: await pending, subject }

  const request = verifySubject(config, subject)
  inflight.set(key, request)
  try {
    const outcome = await request
    if (outcome.status === 'ok' || outcome.status === 'upgrade_required') {
      cache.set(key, outcome)
    }
    return { outcome, subject }
  } finally {
    inflight.delete(key)
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false
  if ((message as VerifyRequest).type !== 'phylax.verify') return false
  const url = String((message as VerifyRequest).url ?? '')
  resolve(url).then(sendResponse, () =>
    sendResponse({ outcome: { status: 'unavailable', message: 'Check failed' }, subject: null }),
  )
  return true
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (STORAGE_KEYS.apiKey in changes || STORAGE_KEYS.baseUrl in changes) cache.clear()
})
