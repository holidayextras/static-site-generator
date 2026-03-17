'use strict'

const path = require('path')
const SSG = require('../lib/index.js').default
const singleFileOnly = require('../lib/singleFileOnly.js').default
const webpackPages = require('../lib/webpackPages.js').default

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'landing-parking')
const TMP_DIR = path.join(__dirname, 'tmp')

function injectOnePage (files, metalsmith, done) {
  Object.keys(files).forEach(k => delete files[k])
  const key = 'de/test-page.html'
  files[key] = {
    template: 'content-template.jsx',
    baseFile: 'layout.jsx',
    pagename: key,
    pageName: key,
    pageData: {},
    contents: Buffer.from('<h1>Test</h1>')
  }
  done()
}

function injectTwoPages (files, metalsmith, done) {
  Object.keys(files).forEach(k => delete files[k])
  const keys = ['de/page-a.html', 'de/page-b.html']
  keys.forEach(key => {
    files[key] = {
      template: 'content-template.jsx',
      baseFile: 'layout.jsx',
      pagename: key,
      pageName: key,
      pageData: {},
      contents: Buffer.from('<h1>Test</h1>')
    }
  })
  done()
}

function baseOpts (overrides = {}) {
  const dest = path.join(TMP_DIR, `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  return Object.assign({
    src: FIXTURE_DIR,
    clean: true,
    config: { group: 'landing-parking', domainSettings: {} },
    dataSource: injectOnePage,
    layoutDir: 'baseTemplates',
    templateDir: 'contentTemplates',
    destination: dest,
    assets: 'public',
    webpack: 'webpack.config.js',
    webpackOptions: { group: 'landing-parking', folderPrefix: '/de' },
    callback: () => {}
  }, overrides)
}

describe('simulate-request', () => {
  afterEach(() => {
    delete process.env.singlePage
    delete process.env.srcFile
  })

  describe('SSG full run', () => {
    it.skip('invokes callback with no error and a non-empty pages array', (done) => {
      const opts = baseOpts({
        callback: (err, pages) => {
          try {
            if (err) return done(err)
            if (!Array.isArray(pages) || pages.length < 1) {
              return done(new Error('Expected non-empty pages array, got: ' + JSON.stringify(pages)))
            }
            done()
          } catch (e) {
            done(e)
          }
        }
      })
      SSG(opts)
    })
  })

  describe('SSG single-page run', () => {
    it.skip('builds only the matching page', (done) => {
      process.env.singlePage = 'de/page-a'
      const opts = baseOpts({
        dataSource: injectTwoPages,
        callback: (err, pages) => {
          try {
            if (err) return done(err)
            if (!Array.isArray(pages)) return done(new Error('Expected pages array'))
            const hasPageA = pages.some(p => p === 'de/page-a' || p === 'de/page-a.html')
            const onlyOne = pages.length === 1
            if (!hasPageA || !onlyOne) {
              return done(new Error('Expected exactly one page (de/page-a), got: ' + JSON.stringify(pages)))
            }
            done()
          } catch (e) {
            done(e)
          }
        }
      })
      SSG(opts)
    })
  })

  describe('singleFileOnly', () => {
    it('keeps only the matching file when singlePage and folderPrefix are set', (done) => {
      process.env.singlePage = 'de/rom-flughafen-parken-test'
      const opts = {
        webpackOptions: { folderPrefix: '/de' }
      }
      const files = {
        'de/rom-flughafen-parken-test.html': { contents: Buffer.from('') },
        'de/other-page.html': { contents: Buffer.from('') },
        'another.html': { contents: Buffer.from('') }
      }
      const metalsmith = { _directory: FIXTURE_DIR }
      const plugin = singleFileOnly(opts)
      plugin(files, metalsmith, () => {
        try {
          const keys = Object.keys(files)
          if (keys.length !== 1 || !keys[0].includes('rom-flughafen-parken-test')) {
            return done(new Error('Expected only de/rom-flughafen-parken-test.html, got: ' + JSON.stringify(keys)))
          }
          done()
        } catch (e) {
          done(e)
        }
      })
    })

    it('keeps only matching file without folder prefix when singlePage has no prefix', (done) => {
      process.env.singlePage = 'rom-flughafen-parken-test'
      const opts = { webpackOptions: { folderPrefix: '/de' } }
      const files = {
        'rom-flughafen-parken-test.html': { contents: Buffer.from('') },
        'de/rom-flughafen-parken-test.html': { contents: Buffer.from('') },
        'other.html': { contents: Buffer.from('') }
      }
      const metalsmith = {}
      const plugin = singleFileOnly(opts)
      plugin(files, metalsmith, () => {
        try {
          const keys = Object.keys(files)
          if (keys.length !== 2) {
            return done(new Error('Expected both rom-flughafen-parken-test and de/rom-flughafen-parken-test (either matches), got: ' + JSON.stringify(keys)))
          }
          const hasMatch = keys.some(k => k.includes('rom-flughafen-parken-test'))
          if (!hasMatch) return done(new Error('Expected at least one matching file'))
          done()
        } catch (e) {
          done(e)
        }
      })
    })

    it('does nothing when singlePage is not set', (done) => {
      const opts = { webpackOptions: { folderPrefix: '/de' } }
      const files = {
        'de/a.html': {},
        'de/b.html': {}
      }
      const metalsmith = {}
      const plugin = singleFileOnly(opts)
      plugin(files, metalsmith, () => {
        try {
          if (Object.keys(files).length !== 2) {
            return done(new Error('Expected both files when singlePage not set, got: ' + Object.keys(files).length))
          }
          done()
        } catch (e) {
          done(e)
        }
      })
    })
  })

  describe('webpackPages', () => {
    it('success: files in → callback(null, page names) out', (done) => {
      const fixtureWebpack = require(path.join(FIXTURE_DIR, 'webpack.config.js'))
      const metalsmith = { _directory: FIXTURE_DIR }
      const files = {
        'de/one.html': {
          template: 'content-template.jsx',
          baseFile: 'layout.jsx',
          pagename: 'de/one.html',
          pageName: 'de/one.html',
          pageData: {},
          group: 'landing-parking'
        }
      }
      const globalOptions = {
        webpack: fixtureWebpack,
        dest: '_site/js',
        directory: 'contentTemplates',
        callback: (err, pages) => {
          try {
            if (err) return done(err)
            if (!Array.isArray(pages) || pages.length < 1) {
              return done(new Error('Expected non-empty pages array, got: ' + JSON.stringify(pages)))
            }
            done()
          } catch (e) {
            done(e)
          }
        }
      }
      const plugin = webpackPages(globalOptions)
      plugin(files, metalsmith, () => {})
    })

    it('success: multiple files in → callback(null, all page names) out', (done) => {
      const fixtureWebpack = require(path.join(FIXTURE_DIR, 'webpack.config.js'))
      const metalsmith = { _directory: FIXTURE_DIR }
      const files = {
        'de/page-a.html': {
          template: 'content-template.jsx',
          baseFile: 'layout.jsx',
          pagename: 'de/page-a.html',
          pageName: 'de/page-a.html',
          pageData: {},
          group: 'landing-parking'
        },
        'de/page-b.html': {
          template: 'content-template.jsx',
          baseFile: 'layout.jsx',
          pagename: 'de/page-b.html',
          pageName: 'de/page-b.html',
          pageData: {},
          group: 'landing-parking'
        }
      }
      const globalOptions = {
        webpack: fixtureWebpack,
        dest: '_site/js',
        directory: 'contentTemplates',
        callback: (err, pages) => {
          try {
            if (err) return done(err)
            if (!Array.isArray(pages) || pages.length !== 2) {
              return done(new Error('Expected 2 page names, got: ' + JSON.stringify(pages)))
            }
            const names = pages.sort()
            if (names[0] !== 'de/page-a' || names[1] !== 'de/page-b') {
              return done(new Error('Expected [\'de/page-a\', \'de/page-b\'], got: ' + JSON.stringify(names)))
            }
            done()
          } catch (e) {
            done(e)
          }
        }
      }
      const plugin = webpackPages(globalOptions)
      plugin(files, metalsmith, () => {})
    })
  })
})
