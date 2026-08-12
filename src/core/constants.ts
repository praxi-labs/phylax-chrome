export const DEFAULT_BASE_URL = 'https://api.phyi.dev'

export const PATHS = {
  entitlements: '/v1/account/entitlements',
  artifactVerify: '/v1/artifacts/verify',
  repositoryVerify: '/v1/repositories/verify',
} as const

export const REQUEST_TIMEOUT_MS = 15_000

export const CACHE_TTL_MS = 10 * 60 * 1000

export const CACHE_LIMIT = 500

export const STORAGE_KEYS = {
  apiKey: 'phylax.apiKey',
  baseUrl: 'phylax.baseUrl',
  enabled: 'phylax.enabled',
} as const
