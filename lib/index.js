"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = _interopRequireDefault(require("path"));

var _metalsmith = _interopRequireDefault(require("metalsmith"));

var _metalsmithMarkdown = _interopRequireDefault(require("metalsmith-markdown"));

var _metalsmithReactTpl = _interopRequireDefault(require("metalsmith-react-tpl"));

var _getDataSource = _interopRequireDefault(require("./getDataSource"));

var _metalsmithAssetsImproved = _interopRequireDefault(require("metalsmith-assets-improved"));

var _getPrismicContent = _interopRequireDefault(require("./getPrismicContent"));

var _singleFileOnly = _interopRequireDefault(require("./singleFileOnly"));

var _webpackPages = _interopRequireDefault(require("./webpackPages"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MetalSmithLoader = function MetalSmithLoader(opts) {
  var isStatic = true;
  if (!opts.src) throw new Error('No src param provided for the .md file directory');
  if (!opts.dataSource) throw new Error('No dataSource param provided for the content endpoint');
  if (!opts.templateDir) throw new Error('No templateDir param provided for the template directory');
  if (!opts.layoutDir) throw new Error('No layoutDir param provided for the layouts directory');
  if (!opts.destination) throw new Error('No destination param provided for the output directory');
  if (!opts.assets) throw new Error('No assets param provided for the assets directory');
  if (opts.showReactIDs) isStatic = false;

  if (opts.devMode) {
    opts.config = Object.assign({}, opts.config, {
      devMode: true
    });
  }

  var dataSource = (0, _getDataSource.default)(opts);
  var metalSmith = new _metalsmith.default(opts.src).clean(opts.clean).metadata(opts.config || {}).use(dataSource).use((0, _singleFileOnly.default)(opts));

  if (opts.dataSource && opts.dataSource.type === 'prismic') {
    metalSmith.use((0, _getPrismicContent.default)());
  }

  metalSmith.use((0, _metalsmithMarkdown.default)()).use((0, _metalsmithReactTpl.default)({
    babel: true,
    noConflict: false,
    isStatic: isStatic,
    baseFile: 'layout.jsx',
    baseFileDirectory: opts.layoutDir,
    directory: opts.templateDir
  })).destination(opts.destination).use((0, _metalsmithAssetsImproved.default)({
    src: './' + opts.assets,
    dest: './'
  })).use((0, _webpackPages.default)({
    directory: opts.templateDir,
    options: opts.webpackOptions,
    noConflict: false,
    dest: opts.destination + '/js',
    webpack: require(_path.default.join(opts.src, opts.webpack)),
    callback: opts.callback
  }));

  if (opts.markDownSource) {
    metalSmith.source(opts.markDownSource);
  }

  metalSmith.build(function (err) {
    if (err && opts.callback) return opts.callback(err);
    if (err) throw err;
  });
};

var _default = MetalSmithLoader;
exports.default = _default;