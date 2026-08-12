import { CACHE_LIMIT, CACHE_TTL_MS } from '../core/constants.js'

interface Entry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  readonly #entries = new Map<string, Entry<T>>()
  readonly #ttlMs: number
  readonly #limit: number
  readonly #now: () => number

  constructor(ttlMs = CACHE_TTL_MS, limit = CACHE_LIMIT, now: () => number = Date.now) {
    this.#ttlMs = ttlMs
    this.#limit = limit
    this.#now = now
  }

  get(key: string): T | null {
    const entry = this.#entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key)
      return null
    }
    this.#entries.delete(key)
    this.#entries.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    if (this.#entries.has(key)) this.#entries.delete(key)
    this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs })
    while (this.#entries.size > this.#limit) {
      const oldest = this.#entries.keys().next()
      if (oldest.done) break
      this.#entries.delete(oldest.value)
    }
  }

  clear(): void {
    this.#entries.clear()
  }

  get size(): number {
    return this.#entries.size
  }
}
