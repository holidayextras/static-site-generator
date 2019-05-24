"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _pageData = _interopRequireDefault(require("./components/pageData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var apiCaller = function apiCaller(opts) {
  return function (files, metalsmith, done) {
    new _pageData.default({
      opts: opts,
      files: files
    }).then(function (data) {
      files = data;
      done();
    });
  };
};

var _default = apiCaller;
exports.default = _default;