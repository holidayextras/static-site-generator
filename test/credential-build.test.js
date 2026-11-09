'use strict'

/* global describe, it, beforeEach, afterEach */

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const vm = require('vm')
const generate = require('../src/index').default

describe('credential build boundary', function () {
  this.timeout(30000)
  let dir
  const token = 'CANARY_BUILD_CREDENTIAL'
  const queryToken = 'CANARY_QUERY_CREDENTIAL'
  const write = (name, contents) => fs.writeFileSync(path.join(dir, name), contents)

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-build-'))
    for (const folder of ['pages', 'templates', 'layouts', 'public']) fs.mkdirSync(path.join(dir, folder))
    fs.symlinkSync(path.resolve('node_modules'), path.join(dir, 'node_modules'), 'dir')
    write('templates/page.js', `
      const React = require('react')
      module.exports = props => React.createElement('pre', null, JSON.stringify({ title: props.title, dataSource: props.dataSource }))
    `)
    write('layouts/layout.jsx', `
      const React = require('react')
      module.exports = props => React.createElement('html', null,
        React.createElement('body', null, React.createElement('div', { id: 'content', dangerouslySetInnerHTML: { __html: props.children } })))
    `)
    write('webpack.config.js', `
      const path = require('path')
      module.exports = {
        mode: 'development',
        devtool: 'source-map',
        output: { path: path.join(__dirname, '_site/js'), filename: '[name].js' },
        externals: { react: 'React', 'react-dom': 'ReactDOM' },
        module: { rules: [{ test: /\\.js$/, exclude: /node_modules/, use: {
          loader: require.resolve('babel-loader'),
          options: { babelrc: false, configFile: false, presets: [require.resolve('@babel/preset-react')] }
        } }] }
      }
    `)
  })

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const build = (mode = 'clean') => new Promise(resolve => {
    const calls = []
    const sharedToken = { name: 'token', value: token }
    generate({
      src: dir,
      markDownSource: 'pages',
      clean: false,
      dataSource: (files, metalsmith, done) => {
        // Stand in for asynchronous fetching/postQuery; credentials must still exist here.
        setImmediate(() => {
          assert.strictEqual(sharedToken.value, token)
          for (const name of ['index', 'about']) {
            files[`${name}.html`] = {
              contents: Buffer.from(''),
              template: 'page.js',
              title: name,
              html: '<a href="/reset?token=page-content">Reset</a>',
              dataSource: {
                token: sharedToken,
                query: `/pages?limit=2&token=${queryToken}`,
                hydrate: true
              }
            }
            if (mode === 'leak') files[`${name}.html`].otherProp = queryToken
          }
          done()
        })
      },
      templateDir: 'templates',
      layoutDir: 'layouts',
      destination: '_site',
      assets: 'public',
      webpack: 'webpack.config.js',
      callback: (error, pages) => {
        calls.push({ error, pages, tempExists: fs.existsSync(path.join(dir, '_tempOutput')) })
        // Let a mistaken second success callback run before checking the count.
        setTimeout(() => resolve({ calls, sharedToken }), 50)
      }
    })
  })

  it('renders and hydrates stripped props, preserves content, and keeps build credentials intact', async () => {
    const { calls, sharedToken } = await build()
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].error, null)
    assert.strictEqual(calls[0].tempExists, false)
    assert.deepStrictEqual(calls[0].pages.sort(), ['about', 'index'])
    assert.strictEqual(sharedToken.value, token)
    assert.ok(!fs.existsSync(path.join(dir, '_tempOutput')))
    for (const name of ['index', 'about']) {
      const html = fs.readFileSync(path.join(dir, `_site/${name}.html`), 'utf8')
      assert.ok(html.includes(name))
      assert.ok(html.includes('/pages?limit=2'))
      assert.ok(!html.includes(token))
      assert.ok(!html.includes(queryToken))
      const script = fs.readFileSync(path.join(dir, `_site/js/${name}.js`), 'utf8')
      const sourceMap = fs.readFileSync(path.join(dir, `_site/js/${name}.js.map`), 'utf8')
      for (const output of [script, sourceMap]) {
        assert.ok(!output.includes(token))
        assert.ok(!output.includes(queryToken))
      }
      let hydrated
      const context = {
        window: {},
        document: { getElementById: () => ({}) },
        React: { createElement: (component, props) => ({ component, props }) },
        ReactDOM: { hydrate: element => { hydrated = element.props } }
      }
      vm.runInNewContext(script, context)
      assert.strictEqual(hydrated, context.window.ReactRootProps)
      assert.strictEqual(hydrated.dataSource.query, '/pages?limit=2')
      assert.ok(!('token' in hydrated.dataSource))
      assert.strictEqual(hydrated.html, '<a href="/reset?token=page-content">Reset</a>')
    }
  })

  it('rejects a query credential copied elsewhere in emitted output and cleans up before the error callback', async () => {
    const { calls } = await build('leak')
    assert.strictEqual(calls.length, 1)
    assert.match(calls[0].error.message, /Build credential found in browser output/)
    assert.ok(calls[0].error.message.includes('dataSource.query.token'))
    assert.ok(!calls[0].error.message.includes(queryToken))
    assert.strictEqual(calls[0].tempExists, false)
    assert.ok(!fs.existsSync(path.join(dir, '_tempOutput')))
  })

  it('reports webpack compilation errors once, cleans up, and never reports success', async () => {
    // Only webpack sees this entry; the server-rendered template remains valid.
    fs.appendFileSync(path.join(dir, 'webpack.config.js'), `
      module.exports.plugins = [new (require('webpack').NormalModuleReplacementPlugin)(
        /page[.]js$/, './missing-module.js'
      )]
    `)
    const { calls } = await build()
    assert.strictEqual(calls.length, 1)
    assert.ok(calls[0].error)
    assert.match(calls[0].error.message, /missing-module/)
    assert.strictEqual(calls[0].tempExists, false)
    assert.ok(!fs.existsSync(path.join(dir, '_tempOutput')))
  })

  it('reports fatal webpack configuration errors once and cleans up', async () => {
    fs.appendFileSync(path.join(dir, 'webpack.config.js'), '\nmodule.exports.mode = "invalid-mode"\n')
    const { calls } = await build()
    assert.strictEqual(calls.length, 1)
    assert.match(calls[0].error.message, /Invalid configuration/)
    assert.strictEqual(calls[0].tempExists, false)
  })
})
