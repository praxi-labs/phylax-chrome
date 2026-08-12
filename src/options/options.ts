import { clearApiKey, readConfig, writeConfig } from '../core/storage.js'
import { DEFAULT_BASE_URL } from '../core/constants.js'

const apiKey = document.getElementById('apiKey') as HTMLInputElement
const baseUrl = document.getElementById('baseUrl') as HTMLInputElement
const enabled = document.getElementById('enabled') as HTMLInputElement
const status = document.getElementById('status') as HTMLParagraphElement

function announce(text: string): void {
  status.textContent = text
  setTimeout(() => {
    if (status.textContent === text) status.textContent = ''
  }, 4000)
}

async function load(): Promise<void> {
  const config = await readConfig()
  apiKey.value = config.apiKey
  baseUrl.value = config.baseUrl
  baseUrl.placeholder = DEFAULT_BASE_URL
  enabled.checked = config.enabled
}

function validBase(value: string): boolean {
  if (!value) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

document.getElementById('save')?.addEventListener('click', async () => {
  if (!validBase(baseUrl.value.trim())) {
    announce('The base URL must be https')
    return
  }
  await writeConfig({
    apiKey: apiKey.value,
    baseUrl: baseUrl.value.trim() || DEFAULT_BASE_URL,
    enabled: enabled.checked,
  })
  announce('Saved')
})

document.getElementById('forget')?.addEventListener('click', async () => {
  await clearApiKey()
  apiKey.value = ''
  announce('Key removed from this browser')
})

void load()
