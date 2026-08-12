export type Subject =
  | { kind: 'package'; purl: string; label: string }
  | { kind: 'repository'; url: string; label: string }

const NPM_PATH = /^\/package\/((?:@[^/]+\/)?[^/@]+)(?:\/v\/([^/]+))?\/?$/
const PYPI_PATH = /^\/project\/([^/]+)(?:\/([^/]+))?\/?$/
const GITHUB_PATH = /^\/([^/]+)\/([^/]+)\/?$/

const GITHUB_RESERVED = new Set([
  'about', 'account', 'apps', 'blog', 'codespaces', 'collections', 'contact',
  'customer-stories', 'dashboard', 'explore', 'features', 'issues', 'login',
  'logout', 'marketplace', 'new', 'notifications', 'orgs', 'pricing', 'pulls',
  'search', 'security', 'settings', 'sponsors', 'stars', 'topics', 'trending',
])

export function subjectFor(rawUrl: string): Subject | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.hostname === 'www.npmjs.com' || url.hostname === 'npmjs.com') {
    const match = NPM_PATH.exec(url.pathname)
    const name = match?.[1]
    if (!name) return null
    const version = match[2]
    return {
      kind: 'package',
      purl: version ? `pkg:npm/${name}@${version}` : `pkg:npm/${name}`,
      label: version ? `${name}@${version}` : name,
    }
  }

  if (url.hostname === 'pypi.org') {
    const match = PYPI_PATH.exec(url.pathname)
    const name = match?.[1]
    if (!name) return null
    const version = match[2]
    return {
      kind: 'package',
      purl: version ? `pkg:pypi/${name}@${version}` : `pkg:pypi/${name}`,
      label: version ? `${name} ${version}` : name,
    }
  }

  if (url.hostname === 'github.com') {
    const match = GITHUB_PATH.exec(url.pathname)
    const owner = match?.[1]
    const repo = match?.[2]
    if (!owner || !repo) return null
    if (GITHUB_RESERVED.has(owner.toLowerCase())) return null
    if (repo.endsWith('.git')) return null
    return {
      kind: 'repository',
      url: `https://github.com/${owner}/${repo}`,
      label: `${owner}/${repo}`,
    }
  }

  return null
}
