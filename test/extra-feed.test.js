/* global describe, it, beforeEach, afterEach */

const assert = require('assert')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const PageData = require('../src/components/pageData').default
const { fetchExtraData } = require('../src/components/pagination')

describe('extra feed responses', () => {
  let originalFetch
  let requests

  beforeEach(() => {
    originalFetch = global.fetch
    requests = []
  })

  afterEach(() => { global.fetch = originalFetch })

  const paginated = (data, offset = 0, total = data.length, next) => ({
    data,
    meta: { page: { offset, limit: data.length, total } },
    links: next ? { next } : {}
  })

  const serve = responses => {
    global.fetch = async url => {
      requests.push(url)
      assert.ok(Object.prototype.hasOwnProperty.call(responses, url), `Unexpected request: ${url}`)
      return { ok: true, json: async () => responses[url] }
    }
  }

  const buildPageData = () => new PageData({
    opts: {},
    files: {
      'pages.md': {
        contents: Buffer.from(''),
        dataSource: {
          host: 'content.example.test',
          query: '/pages',
          pageNameField: 'pageName',
          extras: {
            lastUpdated: { host: 'feeds.example.test', query: '/updated?page=<%pageName%>' }
          }
        }
      }
    }
  })

  it('passes each plain-object extra feed through to its rendered page', async () => {
    serve({
      'https://content.example.test/pages': paginated([{ pageName: 'newsletter' }], 0, 2, 'https://content.example.test/pages?offset=1'),
      'https://content.example.test/pages?offset=1': paginated([{ pageName: 'privacy' }], 1, 2),
      'https://feeds.example.test/updated?page=newsletter': { updateddate: '2026-01-01' },
      'https://feeds.example.test/updated?page=privacy': { updateddate: '2026-02-01' }
    })

    const files = await buildPageData()
    const Template = ({ lastUpdated: { updateddate } }) => React.createElement('time', null, updateddate)
    for (const [name, date] of [['newsletter', '2026-01-01'], ['privacy', '2026-02-01']]) {
      assert.deepStrictEqual(files[`${name}.html`].lastUpdated, { updateddate: date })
      assert.strictEqual(renderToStaticMarkup(React.createElement(Template, files[`${name}.html`])), `<time>${date}</time>`)
    }
    assert.strictEqual(requests.length, 4)
  })

  it('preserves the data wrapper and all pages of a paginated extra feed', async () => {
    serve({
      'https://content.example.test/pages': paginated([{ pageName: 'newsletter' }]),
      'https://feeds.example.test/updated?page=newsletter': paginated([{ name: 'first' }], 0, 2, 'https://feeds.example.test/next'),
      'https://feeds.example.test/next': paginated([{ name: 'second' }], 1, 2)
    })

    const files = await buildPageData()
    assert.deepStrictEqual(files['newsletter.html'].lastUpdated, { data: [{ name: 'first' }, { name: 'second' }] })
    assert.strictEqual(requests.length, 3)
  })

  it('preserves a non-paginated object that itself contains a data array', async () => {
    const response = { data: [{ name: 'item' }], updateddate: '2026-01-01' }
    serve({ 'https://feeds.example.test/plain': response })
    assert.deepStrictEqual(await fetchExtraData('https://feeds.example.test/plain'), response)
  })

  it('still rejects unsuccessful extra-feed requests', async () => {
    global.fetch = async () => ({ ok: false, status: 503, statusText: 'Service Unavailable' })
    await assert.rejects(fetchExtraData('https://feeds.example.test/unavailable'), /API request failed: 503/)
  })
})
