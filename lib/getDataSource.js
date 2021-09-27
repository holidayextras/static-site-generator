"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _metalsmithPrismic = _interopRequireDefault(require("./metalsmith-prismic"));

var _getHXSEOContent = _interopRequireDefault(require("./getHXSEOContent"));

var _apiCaller = _interopRequireDefault(require("./apiCaller"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var getDataSource = function getDataSource(opts) {
  if (!opts.dataSource) return false;
  if (typeof opts.dataSource === 'function') return opts.dataSource; // Lets work out the datasource

  if (opts.dataSource.type === 'prismic') {
    var configLinkResolver = opts.config.linkResolver instanceof Function && opts.config.linkResolver;
    return (0, _metalsmithPrismic["default"])({
      'url': opts.dataSource.url,
      'accessToken': opts.dataSource.accessToken,
      'linkResolver': configLinkResolver || function (ctx, doc) {
        if (doc.isBroken) return '';
        return '/' + doc.uid;
      }
    });
  }

  if (opts.dataSource.type === 'hxseo') {
    return (0, _getHXSEOContent["default"])(opts.dataSource.url);
  }

  if (opts.dataSource.type === 'api') {
    return (0, _apiCaller["default"])(opts.dataSource);
  }

  return false; // fallback
};

var _default = getDataSource;
exports["default"] = _default;