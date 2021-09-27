"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _path = _interopRequireDefault(require("path"));

var _pageData = _interopRequireDefault(require("./components/pageData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var getHXSEOContent = function getHXSEOContent(opts) {
  return function (files, metalsmith, done) {
    if (!opts.token) throw new Error('Must provide a token for SEO api access');
    opts.token = {
      name: 'token',
      value: opts.token
    };

    opts.initSetup = function (params) {
      // Extend params needed
      if (!params.hxseo) return {};
      params.dataSource = _underscore["default"].extend({}, opts, params.hxseo);
      params.dataSource.repeater = 'data';
      params.dataSource.pageDataField = 'attributes';
      params.dataSource.pageNameField = 'pageName';
      return params;
    };

    var postQuery = files[Object.keys(files)[0]] && files[Object.keys(files)[0]].hxseo && files[Object.keys(files)[0]].hxseo.postQuery || false;
    new _pageData["default"]({
      opts: opts,
      files: files
    }).then(function (data) {
      files = data;

      if (postQuery) {
        var pathToFunc = _path["default"].join(metalsmith._directory, postQuery);

        var func = require(pathToFunc);

        if (typeof func !== 'function') return done();
        func(data).then(function (data) {
          files = data;
          done();
        })["catch"](function (err) {
          console.log(err);
          done();
        });
      } else done();
    })["catch"](function (err) {
      throw err;
    });
  };
};

var _default = getHXSEOContent;
exports["default"] = _default;