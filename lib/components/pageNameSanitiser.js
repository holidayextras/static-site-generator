"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var findreplace = {
  'haven-t': 'havent',
  'isn-t': 'isnt',
  'can-t': 'cant'
};
var regExp = new RegExp('(' + Object.keys(findreplace).map(function (word) {
  return word.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
}).join('|') + ')', 'g');
var regExpReplace = function regExpReplace(s) {
  return findreplace[s];
};
var pageNameSanitiser = function pageNameSanitiser(str) {
  return str.replace(regExp, regExpReplace);
};
var _default = exports.default = pageNameSanitiser;