import path from 'path'
import Metalsmith from 'metalsmith'
import markdown from 'metalsmith-markdown'
import template from 'metalsmith-react-tpl'
import getDataSource from './getDataSource'
import assets from 'metalsmith-assets'
import getPrismicContent from './getPrismicContent'
import singleFileOnly from './singleFileOnly'
import webpackPages from './webpackPages'

const MetalSmithLoader = (opts) => {
  let isStatic = true
  if (!opts.src) throw new Error('No src param provided for the .md file directory')
  if (!opts.dataSource) throw new Error('No dataSource param provided for the content endpoint')
  if (!opts.templateDir) throw new Error('No templateDir param provided for the template directory')
  if (!opts.layoutDir) throw new Error('No layoutDir param provided for the layouts directory')
  if (!opts.destination) throw new Error('No destination param provided for the output directory')
  if (!opts.assets) throw new Error('No assets param provided for the assets directory')
  if (opts.showReactIDs) isStatic = false

  const dataSource = getDataSource(opts)

  const metalSmith = new Metalsmith(opts.src)
    .clean(opts.clean)
    .metadata(opts.config || { })
    .use(dataSource)
    .use(singleFileOnly())

  if (opts.dataSource && opts.dataSource.type === 'prismic') {
    metalSmith.use(getPrismicContent())
  }

  metalSmith
    .use(markdown())
    .use(template({
      babel: true,
      noConflict: false,
      isStatic,
      baseFile: 'layout.jsx',
      baseFileDirectory: opts.layoutDir,
      directory: opts.templateDir
    }))
    .destination(opts.destination)
    .use(assets({
      source: './' + opts.assets,
      destination: './'
    }))
    .use(webpackPages({
      directory: opts.templateDir,
      noConflict: false,
      dest: opts.destination + '/js',
      webpack: require(path.join(opts.src, opts.webpack))
    }))

  metalSmith.build(function (err) {
    if (err) throw err
    if (opts.callback) opts.callback()
  })
}

export default MetalSmithLoader
