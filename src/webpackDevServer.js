import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'

const defaults = {
  host: 'localhost',
  port: 8081,
  noInfo: true,
  contentBase: './_site',
  publicPath: '/js/'
}

const webpackDevServer = (opts) => {
  let server

  const process = (files, metalsmith, done) => {
    // Prevent from starting webpack dev server multiple times
    if (server) {
      done()
      return
    }
    const options = Object.assign(defaults, opts, metalsmith.webpack.devServer || {})
    metalsmith.webpack.entry['webpack-hot-reload'] = `webpack-dev-server/client?http://${options.host}:${options.port}/`
    const compiler = webpack(Object.assign({}, metalsmith.webpack))

    server = new WebpackDevServer(compiler, options)

    server.listen(options.port || 8081, options.host, function () {
      console.log(`
  [metalsmith-webpack-dev-server]: Running webpack dev server at http://${options.host}:${options.port}
`)
      done()
    })
  }

  return process
}

export default webpackDevServer
