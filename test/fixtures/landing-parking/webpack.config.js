const path = require('path')

module.exports = function (globalOptions) {
  return {
    entry: {},
    output: {
      path: globalOptions.dest || path.join(__dirname, '_site/js'),
      filename: '[name].js'
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: { presets: ['@babel/preset-react'] }
          }
        }
      ]
    }
  }
}
