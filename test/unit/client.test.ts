import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifySubject } from '../../src/core/client.js'
import type { Config } from '../../src/core/storage.js'
import type { Subject } from '../../src/core/artifact-ref.js'

const config: Config = {
  apiKey: 'phy_test_key',
  baseUrl: 'https://api.phyi.dev',
  enabled: true,
}

const pkg: Subject = { kind: 'package', purl: 'pkg:npm/express@4.18.2', label: 'express' }
const repo: Subject = {
  kind: 'repository',
  url: 'https://github.com/praxi-labs/phylax-server',
  label: 'praxi-labs/phylax-server',
}

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async () =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifySubject', () => {
  it('refuses to call the API without a key', async () => {
    const fetchMock = respond(200, {})
    vi.stubGlobal('fetch', fetchMock)
    const outcome = await verifySubject({ ...config, apiKey: '' }, pkg)
    expect(outcome).toEqual({ status: 'unauthenticated' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the purl to the artifact endpoint with a bearer token', async () => {
    const fetchMock = respond(200, { artifact: pkg.purl, verdict: 'ALLOW' })
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await verifySubject(config, pkg)

    expect(outcome.status).toBe('ok')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.phyi.dev/v1/artifacts/verify')
    expect(JSON.parse(String(init.body))).toEqual({ artifact: pkg.purl })
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer phy_test_key')
    expect(init.credentials).toBe('omit')
  })

  it('sends a repository to the repository endpoint', async () => {
    const fetchMock = respond(200, { verdict: 'WARN' })
    vi.stubGlobal('fetch', fetchMock)

    await verifySubject(config, repo)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.phyi.dev/v1/repositories/verify')
    expect(JSON.parse(String(init.body))).toEqual({ url: repo.url })
  })

  it('reports an expired or missing key as unauthenticated', async () => {
    vi.stubGlobal('fetch', respond(401, { detail: 'bad key' }))
    expect(await verifySubject(config, pkg)).toEqual({ status: 'unauthenticated' })
  })

  it('reports a plan that does not cover the call', async () => {
    vi.stubGlobal('fetch', respond(402, { detail: 'upgrade to scan packages' }))
    expect(await verifySubject(config, pkg)).toEqual({
      status: 'upgrade_required',
      message: 'upgrade to scan packages',
    })
  })

  it('treats a forbidden call as needing an upgrade', async () => {
    vi.stubGlobal('fetch', respond(403, {}))
    const outcome = await verifySubject(config, pkg)
    expect(outcome.status).toBe('upgrade_required')
  })

  it('surfaces the retry window when rate limited', async () => {
    vi.stubGlobal('fetch', respond(429, {}, { 'retry-after': '30' }))
    expect(await verifySubject(config, pkg)).toEqual({
      status: 'rate_limited',
      retryAfterSeconds: 30,
    })
  })

  it('does not throw when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    const outcome = await verifySubject(config, pkg)
    expect(outcome.status).toBe('unavailable')
  })
})
