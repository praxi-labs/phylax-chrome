import { describe, expect, it } from 'vitest'
import { subjectFor } from '../../src/core/artifact-ref.js'

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
