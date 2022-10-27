"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _styledComponents = require("styled-components");

var sheet = new _styledComponents.ServerStyleSheet();

var styledComponents = function styledComponents(options) {
  return function (files, metalsmith, done) {
    Object.keys(files).forEach(function (file) {
      files[file].pageData = files[file].prismic.page.results[0].data;
      files[file].pagename = file;
      getPrismicData(files[file].pageData, file);
    });
    return done();
  };
};

var _default = styledComponents;
exports.default = _default;