import { DEFAULT_BASE_URL, STORAGE_KEYS } from './constants.js'

export interface Config {
  apiKey: string
  baseUrl: string
  enabled: boolean
}

export async function readConfig(): Promise<Config> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.apiKey,
    STORAGE_KEYS.baseUrl,
    STORAGE_KEYS.enabled,
  ])
  const baseUrl = String(stored[STORAGE_KEYS.baseUrl] ?? '').trim()
  return {
    apiKey: String(stored[STORAGE_KEYS.apiKey] ?? '').trim(),
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    enabled: stored[STORAGE_KEYS.enabled] !== false,
  }
}

export async function writeConfig(patch: Partial<Config>): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.apiKey !== undefined) update[STORAGE_KEYS.apiKey] = patch.apiKey.trim()
  if (patch.baseUrl !== undefined) update[STORAGE_KEYS.baseUrl] = patch.baseUrl.trim()
  if (patch.enabled !== undefined) update[STORAGE_KEYS.enabled] = patch.enabled
  await chrome.storage.local.set(update)
}

export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.apiKey)
}
