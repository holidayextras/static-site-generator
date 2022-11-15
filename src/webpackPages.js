import path from 'path'
import webpack from 'webpack'
import fs from 'fs'
import _ from 'underscore'
import rm from 'rimraf'
import mkdirp from 'mkdirp'

let outputFiles = { }

const webpackPages = (globalOptions) => {
  /* Return to metalsmith */
  return (files, metalsmith, done) => {
    done()
    if (!(globalOptions.webpack && globalOptions.dest && globalOptions.directory)) return

    globalOptions.tempDir = path.join(metalsmith._directory, '_tempOutput')
    globalOptions.dest = path.join(metalsmith._directory, globalOptions.dest)

    const generateOutput = (template, props, options) => {
      const method = props.dataSource && props.dataSource.hydrate ? 'hydrate' : 'render'
      if (props.dataSource && props.dataSource.store) {
        props.store = props.dataSource.baseFolder || ''
        if (props.pagename && !props.dataSource.store.includes('../')) {
          props.store += props.pagename.split('/').map(i => '../').join('')
        }
        props.store += props.dataSource.store
      }
      const templateGroups = metalsmith._directory.split('/templates')
      const templateGroup = templateGroups.length > 1 ? '/templates' + templateGroups[1] : (props.group || '')
      let output = `var React = require( 'react' );
                    var ReactDOM = require( 'react-dom' );
                    var Element = require( '${template}' );
                    window.ReactRoot = Element;
                    if ( typeof Element.default === 'function' ) Element = Element.default;
                    var props = ${JSON.stringify(props)};
                    window.ReactRootProps = props;
                    window.SSGTemplateGroup = '${templateGroup}';`

      const providers = [] // functions that take children and wrap in each provider

      const theme = {
        name: 'holidayextras',
        fonts: {
          body: {
            family: 'Nunito',
            formats: [
              {
                url: 'https://d17s4kc6349e5h.cloudfront.net/holidayextras/assets/fonts/HolidayExtrasSans-Regular.woff',
                format: 'woff'
              },
              {
                url: 'https://d17s4kc6349e5h.cloudfront.net/holidayextras/assets/fonts/HolidayExtrasSans-Regular.woff2',
                format: 'woff2'
              },
              {
                url: 'https://d17s4kc6349e5h.cloudfront.net/holidayextras/assets/fonts/HolidayExtrasSans-Regular.ttf',
                format: 'truetype'
              }
            ],
            weightBold: 800,
            weightRegular: 400
          },
          headers: {
            family: 'Nunito',
            weight: 900
          }
        },
        borders: {
          xl: {
            width: 2,
            radius: 12
          },
          xs: {
            width: 1,
            radius: 8
          },
          lrg: {
            width: 2,
            radius: 8
          },
          sml: {
            width: 1,
            radius: 8
          },
          xxl: {
            width: 2,
            radius: 12
          },
          base: {
            width: 1,
            radius: 8
          }
        },
        shadows: {
          xl: {
            boxShadow: '0px 16px 48px -12px rgba(0, 0, 0, 0.15)'
          },
          xs: {
            boxShadow: '0px 2px 4px -12px rgba(0, 0, 0, 0.15)'
          },
          lrg: {
            boxShadow: '0px 8px 16px -12px rgba(0, 0, 0, 0.15)'
          },
          base: {
            boxShadow: '0px 4px 8px -12px rgba(0, 0, 0, 0.15)'
          }
        },
        palettes: {
          red: {
            main: '#FF5F68',
            muted: '#FFDFE1',
            active: '#E44B53'
          },
          blue: {
            main: '#3AA6FF',
            muted: '#D8EDFF',
            active: '#0082E1'
          },
          pink: {
            main: '#FF6DA2',
            muted: '#FFE2EC',
            active: '#D95D8A'
          },
          green: {
            main: '#00B0A6',
            muted: '#CCEFED',
            active: '#00968D'
          },
          orange: {
            main: '#FFB55F',
            muted: '#FFF0DF',
            active: '#E3A155'
          },
          purple: {
            main: '#925FFF',
            muted: '#E9DFFF',
            active: '#794FD4'
          },
          primary: {
            main: '#542E91',
            muted: '#EEEAF4',
            active: '#3E226A'
          },
          secondary: {
            main: '#FDD506',
            muted: '#FEF5B4',
            active: '#F0C900'
          },
          greys: {
            black: '#232323',
            grey: '#DBDDDF',
            greyDark: '#232323',
            white: '#FFFFFF'
          }
        }
      }

      const themes = JSON.stringify(theme)

      if (props.store) {
        output += `
                  var Provider = require( 'react-redux' ).Provider;
                  var store = require( '${props.store}' );
                  window.ReactRootProvider = Provider;
                  window.ReactRootStore = store;
                `
        providers.push((children) => `<Provider store={ store }>${children}</Provider>`)
      }

      if (props.dataSource?.compLibEnabled) {
        output += `
          var ComponentProvider = require( '@holidayextras/component-library' ).ComponentProvider;
        `
        providers.push((children) => `<ComponentProvider theme={ ${themes} }>${children}</ComponentProvider>`)
      }

      let componentString = '<Element {...props} />'
      providers.forEach((provider) => {
        componentString = provider(componentString)
      })

      output += `var renderedElement = ReactDOM.${method}(${componentString}, document.getElementById( 'content' ))`

      const destFilename = options.destFilename
      const filename = path.join(options.tempDir, destFilename)
      outputFiles[destFilename.replace('.js', '')] = filename

      return new Promise((resolve, reject) => {
        mkdirp(path.dirname(filename), error => {
          if (error) return reject(error)
          return fs.writeFile(filename, output, (err) => {
            if (err) return reject(err)
            return resolve('done')
          })
        })
      })
    }

    const iterator = (prop, file) => {
      const props = _.extend({ }, prop, metalsmith._metadata)
      props.tpl = (globalOptions.noConflict) ? 'rtemplate' : 'template'
      if (!props[props.tpl]) return false
      delete props.contents
      delete props.stats
      delete props.mode
      const template = path.join(metalsmith._directory, globalOptions.directory, props[props.tpl])
      globalOptions.destFilename = file.replace(path.extname(file), '') + '.js'
      return generateOutput(template, props, globalOptions)
    }

    const finishAll = () => {
      if (typeof globalOptions.webpack === 'function') globalOptions.webpack = globalOptions.webpack(globalOptions)
      if (!outputFiles || Object.keys(outputFiles).length < 1) {
        rm(path.join(metalsmith._directory, '_tempOutput'), () => { })
        const webpackError = 'No outputFiles for webpack'
        console.log(webpackError)
        if (globalOptions.callback) return globalOptions.callback(new Error(webpackError))
      }
      globalOptions.webpack.entry = outputFiles
      webpack(globalOptions.webpack, (err, stats) => {
        if (err) {
          console.log(err.stack || err)
          if (err.details) {
            console.log(err.details)
          }
          if (globalOptions.callback) return globalOptions.callback(err)
          throw err
        }
        const info = stats.toJson()
        if (stats.hasErrors()) {
          console.log(info.errors)
          globalOptions.callback(new Error(info.errors[0]))
        }
        rm(path.join(metalsmith._directory, '_tempOutput'), () => { })
        if (globalOptions.callback) globalOptions.callback(null, Object.keys(outputFiles))
      })
    }

    outputFiles = { }
    const promises = Object.keys(files).map(function (key) {
      const props = files[key]
      const file = key
      return iterator(props, file)
    })

    // Call the chain
    return Promise
      .all(promises)
      .then(finishAll)
      .catch(function (err) {
        if (globalOptions.callback) globalOptions.callback(err)
        console.error(err)
      })
  }
}

export default webpackPages
