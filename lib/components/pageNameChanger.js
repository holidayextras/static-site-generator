"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var pageNameChanger = function pageNameChanger(pageName, fileParams) {
  var _fileParams$postPageN = fileParams.postPageNameChange,
      postPageNameChange = _fileParams$postPageN === void 0 ? '' : _fileParams$postPageN,
      _fileParams$fileNameP = fileParams.fileNamePrefix,
      fileNamePrefix = _fileParams$fileNameP === void 0 ? '' : _fileParams$fileNameP,
      _fileParams$fileNameS = fileParams.fileNameSuffix,
      fileNameSuffix = _fileParams$fileNameS === void 0 ? '' : _fileParams$fileNameS;
  if (postPageNameChange !== 'strip') return "".concat(fileNamePrefix).concat(pageName).concat(fileNameSuffix);else {
    pageName = pageName.split('/');
    pageName = pageName[pageName.length - 1].replace(/[\d]+/, '');
    var pageNames = pageName.split('-');
    var start = pageNames[0] === '' ? 1 : 0;
    pageNames = pageNames.slice(start, pageNames.length);

    if (pageNames[pageNames.length - 1] === '') {
      pageNames = pageNames.slice(0, pageNames.length - 1);
    }

    pageName = pageNames.join('-').toLowerCase().replace(/--+/, '-');
    return "".concat(fileNamePrefix).concat(pageName).concat(fileNameSuffix);
  }
};

var _default = pageNameChanger;
exports.default = _default;