"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = _interopRequireDefault(require("path"));

var _pageData = _interopRequireDefault(require("./components/pageData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cachedFiles = false;

var getHXSEOContent = function getHXSEOContent(coreParams) {
  var opts = Object.assign({}, coreParams);
  return function (files, metalsmith, done) {
    if (!opts.token) throw new Error('Must provide a token for SEO api access');

    var newDone = function newDone(data) {
      Object.keys(files).forEach(function (file) {
        delete files[file];
      });
      Object.keys(data).forEach(function (file) {
        files[file] = data[file];
      });
      if (opts.cache) cachedFiles = data;
      done();
    };

    if (cachedFiles && opts.cache) {
      return newDone(cachedFiles);
    }

    cachedFiles = Object.assign({}, files);
    opts.token = {
      name: 'token',
      value: opts.token
    };

    opts.initSetup = function (params) {
      // Extend params needed
      if (!params.hxseo) return {};
      params.dataSource = Object.assign({}, opts, params.hxseo);
      params.dataSource.repeater = 'data';
      params.dataSource.pageDataField = 'attributes';
      params.dataSource.pageNameField = 'pageName';

      if (process.env.singlePage) {
        params.dataSource.query += "&filter[pageName]=".concat(process.env.singlePage);
      }

      return params;
    };

    var postQuery = cachedFiles[Object.keys(cachedFiles)[0]] && cachedFiles[Object.keys(cachedFiles)[0]].hxseo && cachedFiles[Object.keys(cachedFiles)[0]].hxseo.postQuery || opts.postBuild || false;
    new _pageData.default({
      opts: opts,
      files: cachedFiles
    }).then(function (data) {
      if (postQuery) {
        var pathToFunc = _path.default.join(metalsmith._directory, postQuery);

        var func = require(pathToFunc);

        if (typeof func !== 'function') return newDone(data);
        func(data).then(newDone).catch(function (err) {
          console.log(err);
          newDone(data);
        });
      } else newDone(data);
    }).catch(function (err) {
      throw err;
    });
  };
};

var _default = getHXSEOContent;
exports.default = _default;