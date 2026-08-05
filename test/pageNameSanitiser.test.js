'use strict'

const assert = require('assert')
const pageNameSanitiser = require('../src/components/pageNameSanitiser.js').default

describe('pageNameSanitiser', () => {
  it('passes through a normal page name unchanged', () => {
    assert.strictEqual(pageNameSanitiser('holiday-offers'), 'holiday-offers')
  })

  it('still applies the existing word substitutions', () => {
    assert.strictEqual(pageNameSanitiser('resort-transfers/haven-t-arrived'), 'resort-transfers/havent-arrived')
  })

  it('preserves intentional sub-folder structure', () => {
    assert.strictEqual(pageNameSanitiser('sub-folder/nested-page'), 'sub-folder/nested-page')
  })

  // Regression test for H26-319: a CMS-controlled page name containing `../`
  // must not survive into the Metalsmith output file key.
  it('strips ../ path-traversal segments (H26-319)', () => {
    const result = pageNameSanitiser('../../../../shared-builds/other-team-site/index')
    assert.strictEqual(result, 'shared-builds/other-team-site/index')
    assert.ok(!result.includes('..'), 'sanitised output must not contain ".."')
  })

  it('strips a leading slash', () => {
    assert.strictEqual(pageNameSanitiser('/leading-slash-page'), 'leading-slash-page')
  })

  it('strips a trailing slash', () => {
    assert.strictEqual(pageNameSanitiser('trailing-slash-page/'), 'trailing-slash-page')
  })

  it('collapses doubled slashes', () => {
    assert.strictEqual(pageNameSanitiser('double//slash//page'), 'double/slash/page')
  })

  it('normalises backslashes and still strips traversal expressed with them', () => {
    assert.strictEqual(pageNameSanitiser('..\\..\\windows-style-traversal'), 'windows-style-traversal')
  })

  it('strips null bytes', () => {
    assert.strictEqual(pageNameSanitiser('page-name\0.html'), 'page-name.html')
  })

  it('strips a bare "." segment', () => {
    assert.strictEqual(pageNameSanitiser('./page-name'), 'page-name')
  })
})
