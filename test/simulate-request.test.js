'use strict'

const assert = require('assert')
const getHXSEOContent = require('../src/getHXSEOContent.js').default
const apiCaller = require('../src/apiCaller.js').default

const TOKEN = '53000000-0000-0000-0000-000000000053'
const HAPI = { host: 'hapi.holidayextras.co.uk', port: '443', token: TOKEN }

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Build the minimal files object a plugin expects (mirrors what metalsmith
// reads from an md file — the hxseo frontmatter is what the plugins care about)
function md (key, query) {
  return { [key]: { hxseo: { query }, contents: Buffer.from('') } }
}

function run (plugin, files) {
  return new Promise((resolve, reject) => {
    plugin(files, {}, err => err ? reject(err) : resolve(files))
  })
}

// Mirrors ssg-hx-eu config/locations.js and config/partners.js initSetup.
// domainSettings.language === 'en' per ssg-hx-eu/src/config/generatedConfig.js
function euInitSetup (params) {
  params.dataSource = {
    host: HAPI.host,
    port: HAPI.port,
    query: `${params.hxseo.query}&pageLike=en/%`,
    repeater: 'data',
    pageDataField: 'attributes',
    pageNameField: 'pageName'
  }
  return params
}

// _buildUrl reads opts.token (this.params.opts.token = the apiCaller opts object),
// so token must live at the top level of the opts passed to apiCaller — not inside dataSource
const EU_OPTS = { initSetup: euInitSetup, token: { name: 'token', value: TOKEN } }

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('simulate-request', () => {
  afterEach(() => {
    delete process.env.singlePage
  })

  // ── ssg-hx-de: landing-hotels ─────────────────────────────────────────────
  // type: hxseo — getHXSEOContent reads params.hxseo and calls HAPI
  // location-airport-hotels.md: pageLike=flughafenhotel-% with noRedirect+ssg guards
  describe('ssg-hx-de: landing-hotels', function () {
    this.timeout(30000)
    let firstPage

    it('full group: returns flughafenhotel- pages', async () => {
      const files = md('location-airport-hotels.md',
        '/jsonapi/seoPages/?filter[siteCode]=DE-HX&noRedirect=true&filter[ssg]=1' +
        '&filter[pageName]=flughafenhotel-duesseldorf' +
        '&filter[pageName]=flughafenhotel-amsterdam' +
        '&filter[pageName]=flughafenhotel-frankfurt'
      )
      await run(getHXSEOContent(HAPI), files)
      const keys = Object.keys(files)
      assert.ok(keys.length >= 1, `Expected pages, got ${JSON.stringify(keys)}`)
      assert.ok(keys.every(k => k.includes('flughafenhotel')), `Unexpected page: ${JSON.stringify(keys)}`)
      firstPage = keys[0].replace('.html', '')
    })

    it('singlePage: returns only the requested page', async function () {
      if (!firstPage) return this.skip()
      process.env.singlePage = firstPage
      const files = md('location-airport-hotels.md',
        '/jsonapi/seoPages/?filter[siteCode]=DE-HX&noRedirect=true&filter[ssg]=1' +
        '&filter[pageName]=flughafenhotel-duesseldorf' +
        '&filter[pageName]=flughafenhotel-amsterdam' +
        '&filter[pageName]=flughafenhotel-frankfurt'
      )
      await run(getHXSEOContent(HAPI), files)
      const keys = Object.keys(files)
      assert.strictEqual(keys.length, 1, `Expected 1 page, got ${JSON.stringify(keys)}`)
      assert.ok(keys[0].includes(firstPage), `Expected ${firstPage}, got ${keys[0]}`)
    })
  })

  // ── ssg-hx-eu: locations ──────────────────────────────────────────────────
  // type: api — apiCaller uses a custom initSetup that appends pageLike=en/%
  // The query uses filter[menuName]=locations (not individual pageNames)
  describe('ssg-hx-eu: locations', function () {
    this.timeout(30000)
    let firstPage

    it('full group: returns en/ location pages', async () => {
      const files = md('locations.md',
        '/jsonapi/seoPages/?filter[siteCode]=HEXTRAS&filter[menuName]=locations&page[limit]=5'
      )
      await run(apiCaller(EU_OPTS), files)
      const keys = Object.keys(files)
      assert.ok(keys.length >= 1, `Expected pages, got ${JSON.stringify(keys)}`)
      assert.ok(keys.every(k => k.startsWith('en/')), `Expected en/ prefix on all, got ${JSON.stringify(keys)}`)
      firstPage = keys[0].replace('.html', '')
    })

    it('singlePage: returns only the requested page', async function () {
      if (!firstPage) return this.skip()
      process.env.singlePage = firstPage
      const files = md('locations.md',
        '/jsonapi/seoPages/?filter[siteCode]=HEXTRAS&filter[menuName]=locations&page[limit]=5'
      )
      // apiCaller must be created AFTER singlePage is set — it checks the env var at factory time
      await run(apiCaller(EU_OPTS), files)
      const keys = Object.keys(files)
      assert.strictEqual(keys.length, 1, `Expected 1 page, got ${JSON.stringify(keys)}`)
      assert.ok(keys[0].includes(firstPage.split('/').pop()), `Expected ${firstPage}, got ${keys[0]}`)
    })
  })

  // ── ssg-hx-eu: partners ───────────────────────────────────────────────────
  // Different from locations: uses filter[menuName]=partner-ssg with no filter[pageName] in the base query.
  // singlePage works because apiCaller appends &filter[pageName]=${singlePage} via its initSetup wrapper,
  // and singlePageReduce in pageData keeps only that one entry.
  describe('ssg-hx-eu: partners', function () {
    this.timeout(30000)
    let firstPage

    it('full group: returns partner pages', async () => {
      const files = md('partners.md',
        '/jsonapi/seoPages/?filter[menuName]=partner-ssg'
      )
      await run(apiCaller(EU_OPTS), files)
      const keys = Object.keys(files)
      assert.ok(keys.length >= 1, `Expected partner pages, got ${JSON.stringify(keys)}`)
      firstPage = keys[0].replace('.html', '')
    })

    it('singlePage: returns only the requested partner page', async function () {
      if (!firstPage) return this.skip()
      process.env.singlePage = firstPage
      const files = md('partners.md',
        '/jsonapi/seoPages/?filter[menuName]=partner-ssg'
      )
      await run(apiCaller(EU_OPTS), files)
      const keys = Object.keys(files)
      assert.strictEqual(keys.length, 1, `Expected 1 page, got ${JSON.stringify(keys)}`)
      assert.ok(keys[0].includes(firstPage.split('/').pop()), `Expected ${firstPage}, got ${keys[0]}`)
    })
  })

  // ── ssg-hx-uk: landing-parking ────────────────────────────────────────────
  // type: hxseo — uses explicit filter[pageName] list (no folderPrefix in UK config)
  // Pages live at bare names (e.g. manchester-airport-parking.html) with no country prefix
  describe('ssg-hx-uk: landing-parking', function () {
    this.timeout(30000)
    let firstPage

    it('full group: returns airport parking pages', async () => {
      const files = md('landing-parking.md',
        '/jsonapi/seoPages/?filter[siteCode]=HXSEO-LIVE' +
        '&filter[pageName]=manchester-airport-parking' +
        '&filter[pageName]=stansted-airport-parking' +
        '&filter[pageName]=heathrow-airport-parking' +
        '&filter[pageName]=gatwick-airport-parking' +
        '&filter[pageName]=birmingham-airport-parking'
      )
      await run(getHXSEOContent(HAPI), files)
      const keys = Object.keys(files)
      assert.ok(keys.length >= 1, `Expected pages, got ${JSON.stringify(keys)}`)
      assert.ok(keys.every(k => k.includes('airport-parking')), `Unexpected page: ${JSON.stringify(keys)}`)
      firstPage = keys[0].replace('.html', '')
    })

    it('singlePage: returns only the requested page', async function () {
      if (!firstPage) return this.skip()
      process.env.singlePage = firstPage
      const files = md('landing-parking.md',
        '/jsonapi/seoPages/?filter[siteCode]=HXSEO-LIVE' +
        '&filter[pageName]=manchester-airport-parking' +
        '&filter[pageName]=stansted-airport-parking' +
        '&filter[pageName]=heathrow-airport-parking' +
        '&filter[pageName]=gatwick-airport-parking' +
        '&filter[pageName]=birmingham-airport-parking'
      )
      await run(getHXSEOContent(HAPI), files)
      const keys = Object.keys(files)
      assert.strictEqual(keys.length, 1, `Expected 1 page, got ${JSON.stringify(keys)}`)
      assert.ok(keys[0].includes(firstPage), `Expected ${firstPage}, got ${keys[0]}`)
    })
  })
})
