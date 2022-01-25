'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _webpackDevServer = require('webpack-dev-server');

var _webpackDevServer2 = _interopRequireDefault(_webpackDevServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaults = {
  host: 'localhost',
  port: 8081,
  noInfo: true,
  contentBase: './_site',
  publicPath: '/js/'
};

var webpackDevServer = function webpackDevServer(opts) {
  var server = void 0;

  var process = function process(files, metalsmith, done) {
    // Prevent from starting webpack dev server multiple times
    if (server) {
      done();
      return;
    }
    var options = Object.assign(defaults, opts, metalsmith.webpack.devServer || {});
    metalsmith.webpack.entry['webpack-hot-reload'] = 'webpack-dev-server/client?http://' + options.host + ':' + options.port + '/';
    var compiler = (0, _webpack2.default)(Object.assign({}, metalsmith.webpack));

    server = new _webpackDevServer2.default(compiler, options);

    server.listen(options.port || 8081, options.host, function () {
      console.log('\n  [metalsmith-webpack-dev-server]: Running webpack dev server at http://' + options.host + ':' + options.port + '\n');
      done();
    });
  };

  return process;
};

exports.default = webpackDevServer;