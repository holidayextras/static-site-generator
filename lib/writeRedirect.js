"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var writeRedirect = function writeRedirect(documentData) {
  var _documentData$redirec, _documentData$slug;
  // Prismic custom field with redirect value
  var redirectValue = documentData === null || documentData === void 0 || (_documentData$redirec = documentData.redirect) === null || _documentData$redirec === void 0 || (_documentData$redirec = _documentData$redirec.json) === null || _documentData$redirec === void 0 ? void 0 : _documentData$redirec.value;
  // Prismic custom field for slug or UID which every document has by default
  var pageUrl = (documentData === null || documentData === void 0 || (_documentData$slug = documentData.slug) === null || _documentData$slug === void 0 || (_documentData$slug = _documentData$slug.json) === null || _documentData$slug === void 0 ? void 0 : _documentData$slug.value) || documentData.uid;
  if (!redirectValue || !pageUrl || !redirectValue.includes('https://')) return;
  try {
    var redirectCommand = "\naws s3 cp s3://$BUCKET/".concat(pageUrl, ".html s3://$BUCKET/").concat(pageUrl, ".html --website-redirect ").concat(redirectValue, "\naws s3 cp s3://$BUCKET/").concat(pageUrl, " s3://$BUCKET/").concat(pageUrl, " --website-redirect ").concat(redirectValue);
    if (!_fs.default.existsSync('./bin')) _fs.default.mkdirSync('./bin');
    _fs.default.appendFileSync('./bin/redirects.sh', redirectCommand, {
      mode: 493
    });
    console.log("Added redirect for ".concat(pageUrl, " to ").concat(redirectValue));
  } catch (err) {
    console.log("Writing redirect to bash file for ".concat(pageUrl, " has failed."), err);
  }
};
var _default = exports.default = writeRedirect;