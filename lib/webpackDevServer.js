"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _webpack = _interopRequireDefault(require("webpack"));

var _webpackDevServer = _interopRequireDefault(require("webpack-dev-server"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var defaults = {
  host: 'localhost',
  port: 8081,
  noInfo: true,
  contentBase: './_site',
  publicPath: '/js/'
};

var webpackDevServer = function webpackDevServer(opts) {
  var server;

  var process = function process(files, metalsmith, done) {
    // Prevent from starting webpack dev server multiple times
    if (server) {
      done();
      return;
    }

    var options = Object.assign(defaults, opts, metalsmith.webpack.devServer || {});
    metalsmith.webpack.entry['webpack-hot-reload'] = "webpack-dev-server/client?http://".concat(options.host, ":").concat(options.port, "/");
    var compiler = (0, _webpack["default"])(Object.assign({}, metalsmith.webpack));
    server = new _webpackDevServer["default"](compiler, options);
    server.listen(options.port || 8081, options.host, function () {
      console.log("\n  [metalsmith-webpack-dev-server]: Running webpack dev server at http://".concat(options.host, ":").concat(options.port, "\n"));
      done();
    });
  };

  return process;
};

var _default = webpackDevServer;
exports["default"] = _default;