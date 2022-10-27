"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _pageData = _interopRequireDefault(require("./components/pageData"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var apiCaller = function apiCaller(opts) {
  return function (files, metalsmith, done) {
    var _opts$url;

    var postQuery = (opts === null || opts === void 0 ? void 0 : (_opts$url = opts.url) === null || _opts$url === void 0 ? void 0 : _opts$url.postBuild) || false;
    new _pageData.default({
      opts: opts,
      files: files
    }).then(function (data) {
      var newDone = function newDone(data) {
        files = data;
        done();
      };

      if (postQuery) {
        var pathToFunc = _path.default.join(metalsmith._directory, postQuery);

        var func = require(pathToFunc);

        if (typeof func !== 'function') return newDone(data);
        func(data).then(newDone).catch(function (err) {
          console.log(err);
          newDone(data);
        });
      } else newDone(data);
    });
  };
};

var _default = apiCaller;
exports.default = _default;