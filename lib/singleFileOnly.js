"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var singleFileOnly = function singleFileOnly(opts) {
  return function (files, metalsmith, done) {
    if (!process.env.srcFile && !process.env.singlePage) return done();

    if (process.env.singlePage) {
      Object.keys(files).map(function (fileName) {
        if (fileName !== process.env.singlePage + '.html') delete files[fileName];
        return fileName;
      });
      return done();
    }

    Object.keys(files).map(function (fileName) {
      if (files[fileName].srcFile !== process.env.srcFile) delete files[fileName];
      return fileName;
    });
    done();
  };
};

var _default = singleFileOnly;
exports.default = _default;