'use strict'

/* global describe, it */

const assert = require('assert')
const { stripBuildCredentials } = require('../src/stripBuildCredentials.js')

const run = (plugin, files) => new Promise(resolve => plugin(files, { }, () => resolve(files)))

describe('stripBuildCredentials', () => {
  it('removes data source credentials from page props and records them', async () => {
    const sharedToken = { name: 'token', value: 'CANARY_SHARED_TOKEN' }
    const credentials = new Map()
    const files = {
      'index.html': {
        title: 'Home',
        dataSource: {
          host: 'hapi.example.test',
          hydrate: true,
          store: 'stores/',
          token: sharedToken,
          accessToken: 'CANARY_ACCESS_TOKEN',
          url: { host: 'hapi.example.test', token: 'CANARY_URL_TOKEN' }
        }
      },
      'about.html': { title: 'About', dataSource: { host: 'hapi.example.test', token: sharedToken } }
    }

    await run(stripBuildCredentials({ }, credentials), files)

    assert.deepStrictEqual(files['index.html'].dataSource, {
      host: 'hapi.example.test',
      hydrate: true,
      store: 'stores/',
      url: { host: 'hapi.example.test' }
    })
    assert.deepStrictEqual(files['about.html'].dataSource, { host: 'hapi.example.test' })
    assert.ok(!JSON.stringify(files).includes('CANARY_'))
    assert.strictEqual(sharedToken.value, 'CANARY_SHARED_TOKEN')
    assert.deepStrictEqual([...credentials], [
      ['CANARY_SHARED_TOKEN', 'dataSource.token'],
      ['CANARY_ACCESS_TOKEN', 'dataSource.accessToken'],
      ['CANARY_URL_TOKEN', 'dataSource.url.token']
    ])
  })

  it('records generator option credentials without modifying the options', () => {
    const opts = {
      dataSource: {
        type: 'hxseo',
        accessToken: 'CANARY_PRISMIC_TOKEN',
        url: { host: 'hapi.example.test', token: 'CANARY_OPTIONS_TOKEN' }
      }
    }
    const credentials = new Map()

    stripBuildCredentials(opts, credentials)

    assert.strictEqual(opts.dataSource.url.token, 'CANARY_OPTIONS_TOKEN')
    assert.strictEqual(opts.dataSource.accessToken, 'CANARY_PRISMIC_TOKEN')
    assert.deepStrictEqual([...credentials], [
      ['CANARY_PRISMIC_TOKEN', 'options.dataSource.accessToken'],
      ['CANARY_OPTIONS_TOKEN', 'options.dataSource.url.token']
    ])
  })

  it('leaves page content and other properties unchanged', async () => {
    const page = {
      html: '<a href="/go?token=x">Continue</a>',
      text: 'Your token=x is ready',
      designToken: 'brand-primary',
      csrfToken: 'form-value',
      passwordResetToken: 'reset-value',
      generatedAt: '2026-10-22T10:30:00.000Z',
      pageData: { token: 'page-data-field' }
    }
    const files = { 'page.html': Object.assign({ dataSource: { host: 'hapi.example.test' } }, page) }

    await run(stripBuildCredentials({ }, new Map()), files)

    assert.deepStrictEqual(files['page.html'], Object.assign({ dataSource: { host: 'hapi.example.test' } }, page))
  })

  it('strips query-only credentials, including repeated and encoded parameters, without changing other parameters', async () => {
    const query = '/pages?filter[name]=a%20b&%74oken=CANARY%2BQUERY&token=SECOND_CANARY&accessToken=ACCESS_CANARY&empty=&flag#section'
    const dataSource = { query, url: { query: 'token=URL_CANARY&limit=2' } }
    const credentials = new Map()
    const files = { 'index.html': { dataSource } }

    await run(stripBuildCredentials({}, credentials), files)

    assert.strictEqual(files['index.html'].dataSource.query, '/pages?filter[name]=a%20b&empty=&flag#section')
    assert.strictEqual(files['index.html'].dataSource.url.query, 'limit=2')
    assert.strictEqual(dataSource.query, query)
    assert.strictEqual(dataSource.url.query, 'token=URL_CANARY&limit=2')
    for (const value of ['CANARY+QUERY', 'CANARY%2BQUERY', 'SECOND_CANARY', 'ACCESS_CANARY', 'URL_CANARY']) {
      assert.ok(credentials.has(value), `Missing credential representation: ${value}`)
    }
  })

  it('records option query credentials and handles empty or credential-only queries', async () => {
    const opts = { dataSource: { query: '/pages?token=OPTIONS_CANARY' } }
    const credentials = new Map()
    const files = {
      'a.html': { dataSource: { query: '/pages?token=#section' } },
      'b.html': { dataSource: { query: 'accessToken=ONLY_CANARY' } },
      'c.html': { dataSource: { query: '/pages?token&limit=1' } }
    }

    await run(stripBuildCredentials(opts, credentials), files)

    assert.strictEqual(opts.dataSource.query, '/pages?token=OPTIONS_CANARY')
    assert.strictEqual(credentials.get('OPTIONS_CANARY'), 'options.dataSource.query.token')
    assert.strictEqual(files['a.html'].dataSource.query, '/pages#section')
    assert.strictEqual(files['b.html'].dataSource.query, '')
    assert.strictEqual(files['c.html'].dataSource.query, '/pages?limit=1')
  })

  it('ignores files without a data source object', async () => {
    const files = { 'a.html': { title: 'A' }, 'b.html': { dataSource: 'external' } }

    await run(stripBuildCredentials({ }, new Map()), files)

    assert.deepStrictEqual(files, { 'a.html': { title: 'A' }, 'b.html': { dataSource: 'external' } })
  })
})
