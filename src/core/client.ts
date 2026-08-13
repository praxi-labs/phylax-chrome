import { PATHS, REQUEST_TIMEOUT_MS } from './constants.js'
import type { Config } from './storage.js'
import type { Subject } from './artifact-ref.js'

export type Outcome =
  | { status: 'ok'; result: Record<string, unknown> }
  | { status: 'unauthenticated' }
  | { status: 'upgrade_required'; message: string }
  | { status: 'rate_limited'; retryAfterSeconds: number | null }
  | { status: 'unavailable'; message: string }

const UPGRADE_STATUSES = new Set([402, 403])

export const MAX_BATCH = 25

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const detail = (body as Record<string, unknown>).detail
    if (typeof detail === 'string' && detail) return detail
    const message = (body as Record<string, unknown>).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export async function verifyMany(
  config: Config,
  purls: string[],
): Promise<Record<string, Record<string, unknown>>> {
  if (!config.apiKey || purls.length === 0) return {}

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(new URL(PATHS.artifactVerify, config.baseUrl).toString(), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ artifacts: purls.slice(0, MAX_BATCH) }),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
    if (!response.ok) return {}
    const body = await response.json()
    if (!Array.isArray(body)) return {}

    const out: Record<string, Record<string, unknown>> = {}
    for (const entry of body) {
      if (entry && typeof entry === 'object') {
        const key = String((entry as Record<string, unknown>).artifact ?? '')
        if (key) out[key] = entry as Record<string, unknown>
      }
    }
    return out
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}

export async function verifySubject(config: Config, subject: Subject): Promise<Outcome> {
  if (!config.apiKey) return { status: 'unauthenticated' }

  const path = subject.kind === 'package' ? PATHS.artifactVerify : PATHS.repositoryVerify
  const payload =
    subject.kind === 'package' ? { artifact: subject.purl } : { url: subject.url }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(new URL(path, config.baseUrl).toString(), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch {
    return { status: 'unavailable', message: 'Could not reach Phylax' }
  } finally {
    clearTimeout(timer)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (response.ok) {
    if (body && typeof body === 'object') {
      return { status: 'ok', result: body as Record<string, unknown> }
    }
    return { status: 'unavailable', message: 'Unexpected response from Phylax' }
  }

  if (response.status === 401) return { status: 'unauthenticated' }

  if (UPGRADE_STATUSES.has(response.status)) {
    return {
      status: 'upgrade_required',
      message: messageFrom(body, 'Your plan does not include this'),
    }
  }

  if (response.status === 429) {
    const header = response.headers.get('retry-after')
    const parsed = header ? Number.parseInt(header, 10) : Number.NaN
    return {
      status: 'rate_limited',
      retryAfterSeconds: Number.isFinite(parsed) ? parsed : null,
    }
  }

  return {
    status: 'unavailable',
    message: messageFrom(body, `Phylax returned ${response.status}`),
  }
}
