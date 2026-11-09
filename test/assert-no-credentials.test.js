'use strict'

/* global describe, it, beforeEach, afterEach */

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { assertNoCredentials, emittedFiles } = require('../src/assertNoCredentials.js')

describe('assertNoCredentials', () => {
  let dir
  const write = (name, contents) => {
    const file = path.join(dir, name)
    fs.writeFileSync(file, contents)
    return file
  }
  const credentials = new Map([['CANARY_BUILD_TOKEN', 'dataSource.token']])

  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-credentials-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('passes when the output does not contain a credential', () => {
    const file = write('index.js', 'var props = {"title":"Home"};')

    assert.strictEqual(assertNoCredentials([file], credentials), null)
  })

  it('fails on a credential in JavaScript or a source map without revealing it', () => {
    const js = write('index.js', 'var props = {"token":"CANARY_BUILD_TOKEN"};')
    const map = write('index.js.map', '{"sourcesContent":["CANARY_BUILD_TOKEN"]}')

    const error = assertNoCredentials([js, map], credentials)

    assert.ok(error instanceof Error)
    assert.ok(error.message.includes(js))
    assert.ok(error.message.includes(map))
    assert.ok(error.message.includes('dataSource.token'))
    assert.ok(!error.message.includes('CANARY_BUILD_TOKEN'))
  })

  it('ignores non-script files, missing files and short values', () => {
    const html = write('index.html', 'CANARY_BUILD_TOKEN')
    const js = write('index.js', 'var short = "abc";')

    assert.strictEqual(assertNoCredentials([html, path.join(dir, 'missing.js')], credentials), null)
    assert.strictEqual(assertNoCredentials([js], new Map([['abc', 'dataSource.token']])), null)
    assert.strictEqual(assertNoCredentials([js]), null)
  })

  it('lists the files webpack emitted', () => {
    const compilation = { outputOptions: { path: dir }, assets: { 'index.js': { }, 'index.js.map': { } } }

    assert.deepStrictEqual(emittedFiles(compilation), [path.join(dir, 'index.js'), path.join(dir, 'index.js.map')])
  })
})
