export type Subject =
  | { kind: 'package'; purl: string; label: string }
  | { kind: 'repository'; url: string; label: string }

export interface RegistrySite {
  host: (hostname: string) => boolean
  detail: (pathname: string) => Subject | null
  searchSelector?: string
  linkToPurl?: (href: string) => string | null
}

const NPM_PATH = /^\/package\/((?:@[^/]+\/)?[^/@]+)(?:\/v\/([^/]+))?\/?$/
const PYPI_PATH = /^\/project\/([^/]+)(?:\/([^/]+))?\/?$/
const GO_PATH = /^\/([^@?]+?)(?:@([^/]+))?\/?$/
const GEM_PATH = /^\/gems\/([^/]+)(?:\/versions\/([^/]+))?\/?$/
const NUGET_PATH = /^\/packages\/([^/]+)(?:\/([^/]+))?\/?$/
const MAVEN_PATH = /^\/artifact\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/
const GITHUB_PATH = /^\/([^/]+)\/([^/]+)\/?$/

const GITHUB_RESERVED = new Set([
  'about', 'account', 'apps', 'blog', 'codespaces', 'collections', 'contact',
  'customer-stories', 'dashboard', 'explore', 'features', 'issues', 'login',
  'logout', 'marketplace', 'new', 'notifications', 'orgs', 'pricing', 'pulls',
  'search', 'security', 'settings', 'sponsors', 'stars', 'topics', 'trending',
])

const GO_RESERVED = new Set(['search', 'about', 'license-policy', 'badge', 'sub'])

function pkg(purl: string, label: string): Subject {
  return { kind: 'package', purl, label }
}

export const SITES: RegistrySite[] = [
  {
    host: (h) => h === 'www.npmjs.com' || h === 'npmjs.com',
    detail: (p) => {
      const m = NPM_PATH.exec(p)
      const name = m?.[1]
      if (!name) return null
      const version = m[2]
      return pkg(
        version ? `pkg:npm/${name}@${version}` : `pkg:npm/${name}`,
        version ? `${name}@${version}` : name,
      )
    },
    searchSelector: 'a[href^="/package/"]',
    linkToPurl: (href) => {
      const m = NPM_PATH.exec(href)
      return m?.[1] ? `pkg:npm/${m[1]}` : null
    },
  },
  {
    host: (h) => h === 'pypi.org',
    detail: (p) => {
      const m = PYPI_PATH.exec(p)
      const name = m?.[1]
      if (!name) return null
      const version = m[2]
      return pkg(
        version ? `pkg:pypi/${name}@${version}` : `pkg:pypi/${name}`,
        version ? `${name} ${version}` : name,
      )
    },
    searchSelector: 'a[href^="/project/"]',
    linkToPurl: (href) => {
      const m = PYPI_PATH.exec(href)
      return m?.[1] ? `pkg:pypi/${m[1]}` : null
    },
  },
  {
    host: (h) => h === 'pkg.go.dev',
    detail: (p) => {
      const m = GO_PATH.exec(p)
      const name = m?.[1]
      if (!name || GO_RESERVED.has(name.split('/')[0] ?? '')) return null
      if (!name.includes('/')) return null
      const version = m[2]
      return pkg(
        version ? `pkg:golang/${name}@${version}` : `pkg:golang/${name}`,
        version ? `${name}@${version}` : name,
      )
    },
  },
  {
    host: (h) => h === 'rubygems.org',
    detail: (p) => {
      const m = GEM_PATH.exec(p)
      const name = m?.[1]
      if (!name) return null
      const version = m[2]
      return pkg(
        version ? `pkg:gem/${name}@${version}` : `pkg:gem/${name}`,
        version ? `${name} ${version}` : name,
      )
    },
    searchSelector: 'a[href^="/gems/"]',
    linkToPurl: (href) => {
      const m = GEM_PATH.exec(href)
      return m?.[1] ? `pkg:gem/${m[1]}` : null
    },
  },
  {
    host: (h) => h === 'www.nuget.org' || h === 'nuget.org',
    detail: (p) => {
      const m = NUGET_PATH.exec(p)
      const name = m?.[1]
      if (!name) return null
      const version = m[2]
      return pkg(
        version ? `pkg:nuget/${name}@${version}` : `pkg:nuget/${name}`,
        version ? `${name} ${version}` : name,
      )
    },
  },
  {
    host: (h) => h === 'central.sonatype.com',
    detail: (p) => {
      const m = MAVEN_PATH.exec(p)
      const group = m?.[1]
      const artifact = m?.[2]
      if (!group || !artifact) return null
      const version = m[3]
      const base = `pkg:maven/${group}/${artifact}`
      return pkg(
        version ? `${base}@${version}` : base,
        version ? `${group}:${artifact}:${version}` : `${group}:${artifact}`,
      )
    },
  },
  {
    host: (h) => h === 'github.com',
    detail: (p) => {
      const m = GITHUB_PATH.exec(p)
      const owner = m?.[1]
      const repo = m?.[2]
      if (!owner || !repo) return null
      if (GITHUB_RESERVED.has(owner.toLowerCase())) return null
      if (repo.endsWith('.git')) return null
      return {
        kind: 'repository',
        url: `https://github.com/${owner}/${repo}`,
        label: `${owner}/${repo}`,
      }
    },
  },
]

export function siteFor(rawUrl: string): RegistrySite | null {
  try {
    const url = new URL(rawUrl)
    return SITES.find((site) => site.host(url.hostname)) ?? null
  } catch {
    return null
  }
}

export function subjectFor(rawUrl: string): Subject | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  const site = SITES.find((candidate) => candidate.host(url.hostname))
  return site ? site.detail(url.pathname) : null
}
