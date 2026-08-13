import { describe, expect, it } from 'vitest'
import { siteFor, subjectFor } from '../../src/core/artifact-ref.js'

describe('subjectFor', () => {
  it('reads an npm package page', () => {
    expect(subjectFor('https://www.npmjs.com/package/express')).toEqual({
      kind: 'package',
      purl: 'pkg:npm/express',
      label: 'express',
    })
  })

  it('reads a pinned npm version', () => {
    expect(subjectFor('https://www.npmjs.com/package/express/v/4.18.2')).toEqual({
      kind: 'package',
      purl: 'pkg:npm/express@4.18.2',
      label: 'express@4.18.2',
    })
  })

  it('keeps the scope on a scoped package', () => {
    const subject = subjectFor('https://www.npmjs.com/package/@types/node')
    expect(subject).toEqual({
      kind: 'package',
      purl: 'pkg:npm/@types/node',
      label: '@types/node',
    })
  })

  it('reads a PyPI project page', () => {
    expect(subjectFor('https://pypi.org/project/requests/2.31.0/')).toEqual({
      kind: 'package',
      purl: 'pkg:pypi/requests@2.31.0',
      label: 'requests 2.31.0',
    })
  })

  it('reads a GitHub repository page', () => {
    expect(subjectFor('https://github.com/praxi-labs/phylax-server')).toEqual({
      kind: 'repository',
      url: 'https://github.com/praxi-labs/phylax-server',
      label: 'praxi-labs/phylax-server',
    })
  })

  it('ignores GitHub pages that are not repositories', () => {
    expect(subjectFor('https://github.com/settings/profile')).toBeNull()
    expect(subjectFor('https://github.com/marketplace/actions')).toBeNull()
  })

  it('ignores unrelated pages and bad input', () => {
    expect(subjectFor('https://example.com/package/express')).toBeNull()
    expect(subjectFor('https://www.npmjs.com/')).toBeNull()
    expect(subjectFor('not a url')).toBeNull()
  })
})

describe('the registries Socket covers', () => {
  it('reads a Go module page', () => {
    expect(subjectFor('https://pkg.go.dev/github.com/gin-gonic/gin@v1.10.0')).toEqual({
      kind: 'package',
      purl: 'pkg:golang/github.com/gin-gonic/gin@v1.10.0',
      label: 'github.com/gin-gonic/gin@v1.10.0',
    })
  })

  it('ignores Go pages that are not modules', () => {
    expect(subjectFor('https://pkg.go.dev/search?q=gin')).toBeNull()
    expect(subjectFor('https://pkg.go.dev/about')).toBeNull()
  })

  it('reads a RubyGems page', () => {
    expect(subjectFor('https://rubygems.org/gems/rails/versions/7.1.3')).toEqual({
      kind: 'package',
      purl: 'pkg:gem/rails@7.1.3',
      label: 'rails 7.1.3',
    })
  })

  it('reads a NuGet page', () => {
    expect(subjectFor('https://www.nuget.org/packages/Newtonsoft.Json/13.0.3')).toEqual({
      kind: 'package',
      purl: 'pkg:nuget/Newtonsoft.Json@13.0.3',
      label: 'Newtonsoft.Json 13.0.3',
    })
  })

  it('reads a Maven Central page', () => {
    expect(subjectFor('https://central.sonatype.com/artifact/com.google.guava/guava/33.0.0')).toEqual({
      kind: 'package',
      purl: 'pkg:maven/com.google.guava/guava@33.0.0',
      label: 'com.google.guava:guava:33.0.0',
    })
  })
})

describe('search result links', () => {
  it('turns an npm search link into a package URL', () => {
    const site = siteFor('https://www.npmjs.com/search?q=express')
    expect(site?.linkToPurl?.('/package/express')).toBe('pkg:npm/express')
    expect(site?.linkToPurl?.('/package/@types/node')).toBe('pkg:npm/@types/node')
  })

  it('turns a PyPI search link into a package URL', () => {
    const site = siteFor('https://pypi.org/search/?q=requests')
    expect(site?.linkToPurl?.('/project/requests/')).toBe('pkg:pypi/requests')
  })

  it('has no search selector for registries without one', () => {
    expect(siteFor('https://pkg.go.dev/x/y')?.searchSelector).toBeUndefined()
  })

  it('returns no site for an unrelated host', () => {
    expect(siteFor('https://example.com/package/express')).toBeNull()
  })
})
