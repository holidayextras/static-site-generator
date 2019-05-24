"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var pageNameChanger = function pageNameChanger(pageName, fileParams) {
  if (fileParams.postPageNameChange) {
    if (fileParams.postPageNameChange === 'strip') {
      pageName = pageName.split('/');
      pageName = pageName[pageName.length - 1].replace(/[\d]+/, '');
      var pageNames = pageName.split('-');
      var start = pageNames[0] === '' ? 1 : 0;
      pageNames = pageNames.slice(start, pageNames.length);

      if (pageNames[pageNames.length - 1] === '') {
        pageNames = pageNames.slice(0, pageNames.length - 1);
      }

      pageName = pageNames.join('-').toLowerCase().replace(/--+/, '-');
    }
  }

  return pageName;
};

var _default = pageNameChanger;
exports.default = _default;