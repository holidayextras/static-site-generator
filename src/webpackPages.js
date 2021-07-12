import path from 'path'
import webpack from 'webpack'
import fs from 'fs'
import _ from 'underscore'
import rm from 'rimraf'
import mkdirp from 'mkdirp'

let outputFiles = { }

const webpackPages = (globalOptions) => {
  /* Return to metalsmith */
  console.log('metalsmith1')
  return (files, metalsmith, done) => {
    done()
    console.log('metalsmith2')
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
      if (props.store) {
        output += `var Provider = require( 'react-redux' ).Provider;
                   var store = require( '${props.store}' );
                   window.ReactRootProvider = Provider;
                   window.ReactRootStore = store;
                   var renderedElement = ReactDOM.${method}( <Provider store={ store }><Element {...props} /></Provider>, document.getElementById( 'content' ));`
      } else {
        output += `var renderedElement = ReactDOM.${method}( <Element {...props} />, document.getElementById( 'content' ));`
      }

      const destFilename = options.destFilename
      const filename = path.join(options.tempDir, destFilename)
      outputFiles[ destFilename.replace('.js', '') ] = filename

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
      if (!props[ props.tpl ]) return false
      delete props.contents
      delete props.stats
      delete props.mode
      const template = path.join(metalsmith._directory, globalOptions.directory, props[ props.tpl ])
      globalOptions.destFilename = file.replace(path.extname(file), '') + '.js'
      return generateOutput(template, props, globalOptions)
    }

    const finishAll = () => {
      console.log('finishAll function')
      if (typeof globalOptions.webpack === 'function') globalOptions.webpack = globalOptions.webpack(globalOptions)
      if (!outputFiles || Object.keys(outputFiles).length < 1) {
        console.log('no output files')
        rm(path.join(metalsmith._directory, '_tempOutput'), () => { })
        const webpackError = 'No outputFiles for webpack'
        console.log(webpackError)
        if (globalOptions.callback) return globalOptions.callback(new Error(webpackError))
      }
      globalOptions.webpack.entry = outputFiles
      webpack(globalOptions.webpack, (err, stats) => {
        if (err) {
          console.log('error in webpack script')
          console.log(err.stack || err)
          if (err.details) {
            console.log(err.details)
          }
          if (globalOptions.callback) {
            console.log('has callback option')
            return globalOptions.callback(err)
          }
          throw err
        }
        const info = stats.toJson()
        if (stats.hasErrors()) {
          console.log('stats has errors')
          console.log(info.errors)
          return globalOptions.callback(new Error('Error building page'))
        }
        console.log('everything was fine????')
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
        console.log('do i get here with an error?')
        if (globalOptions.callback) globalOptions.callback(err)
        console.error(err)
      })
  }
}

export default webpackPages
