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

  it('ignores files without a data source object', async () => {
    const files = { 'a.html': { title: 'A' }, 'b.html': { dataSource: 'external' } }

    await run(stripBuildCredentials({ }, new Map()), files)

    assert.deepStrictEqual(files, { 'a.html': { title: 'A' }, 'b.html': { dataSource: 'external' } })
  })
})
