"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = _interopRequireDefault(require("path"));

var _webpack = _interopRequireDefault(require("webpack"));

var _fs = _interopRequireDefault(require("fs"));

var _underscore = _interopRequireDefault(require("underscore"));

var _rimraf = _interopRequireDefault(require("rimraf"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var outputFiles = {};

var webpackPages = function webpackPages(globalOptions) {
  /* Return to metalsmith */
  console.log('metalsmith1');
  return function (files, metalsmith, done) {
    done();
    console.log('metalsmith2');
    if (!(globalOptions.webpack && globalOptions.dest && globalOptions.directory)) return;
    globalOptions.tempDir = _path.default.join(metalsmith._directory, '_tempOutput');
    globalOptions.dest = _path.default.join(metalsmith._directory, globalOptions.dest);

    var generateOutput = function generateOutput(template, props, options) {
      var method = props.dataSource && props.dataSource.hydrate ? 'hydrate' : 'render';

      if (props.dataSource && props.dataSource.store) {
        props.store = props.dataSource.baseFolder || '';

        if (props.pagename && !props.dataSource.store.includes('../')) {
          props.store += props.pagename.split('/').map(function (i) {
            return '../';
          }).join('');
        }

        props.store += props.dataSource.store;
      }

      var templateGroups = metalsmith._directory.split('/templates');

      var templateGroup = templateGroups.length > 1 ? '/templates' + templateGroups[1] : props.group || '';
      var output = "var React = require( 'react' );\n                    var ReactDOM = require( 'react-dom' );\n                    var Element = require( '".concat(template, "' );\n                    window.ReactRoot = Element;\n                    if ( typeof Element.default === 'function' ) Element = Element.default;\n                    var props = ").concat(JSON.stringify(props), ";\n                    window.ReactRootProps = props;\n                    window.SSGTemplateGroup = '").concat(templateGroup, "';");

      if (props.store) {
        output += "var Provider = require( 'react-redux' ).Provider;\n                   var store = require( '".concat(props.store, "' );\n                   window.ReactRootProvider = Provider;\n                   window.ReactRootStore = store;\n                   var renderedElement = ReactDOM.").concat(method, "( <Provider store={ store }><Element {...props} /></Provider>, document.getElementById( 'content' ));");
      } else {
        output += "var renderedElement = ReactDOM.".concat(method, "( <Element {...props} />, document.getElementById( 'content' ));");
      }

      var destFilename = options.destFilename;

      var filename = _path.default.join(options.tempDir, destFilename);

      outputFiles[destFilename.replace('.js', '')] = filename;
      return new Promise(function (resolve, reject) {
        (0, _mkdirp.default)(_path.default.dirname(filename), function (error) {
          if (error) return reject(error);
          return _fs.default.writeFile(filename, output, function (err) {
            if (err) return reject(err);
            return resolve('done');
          });
        });
      });
    };

    var iterator = function iterator(prop, file) {
      var props = _underscore.default.extend({}, prop, metalsmith._metadata);

      props.tpl = globalOptions.noConflict ? 'rtemplate' : 'template';
      if (!props[props.tpl]) return false;
      delete props.contents;
      delete props.stats;
      delete props.mode;

      var template = _path.default.join(metalsmith._directory, globalOptions.directory, props[props.tpl]);

      globalOptions.destFilename = file.replace(_path.default.extname(file), '') + '.js';
      return generateOutput(template, props, globalOptions);
    };

    var finishAll = function finishAll() {
      console.log('finishAll function');
      if (typeof globalOptions.webpack === 'function') globalOptions.webpack = globalOptions.webpack(globalOptions);

      if (!outputFiles || Object.keys(outputFiles).length < 1) {
        console.log('no output files');
        (0, _rimraf.default)(_path.default.join(metalsmith._directory, '_tempOutput'), function () {});
        var webpackError = 'No outputFiles for webpack';
        console.log(webpackError);
        if (globalOptions.callback) return globalOptions.callback(new Error(webpackError));
      }

      globalOptions.webpack.entry = outputFiles;
      (0, _webpack.default)(globalOptions.webpack, function (err, stats) {
        if (err) {
          console.log('error in webpack script');
          console.log(err.stack || err);

          if (err.details) {
            console.log(err.details);
          }

          if (globalOptions.callback) {
            console.log('has callback option');
            return globalOptions.callback(err);
          }

          throw err;
        }

        var info = stats.toJson();

        if (stats.hasErrors()) {
          console.log('stats has errors');
          console.log(info.errors);
          return globalOptions.callback(new Error('Error building page'));
        }

        console.log('everything was fine????');
        (0, _rimraf.default)(_path.default.join(metalsmith._directory, '_tempOutput'), function () {});
        if (globalOptions.callback) globalOptions.callback(null, Object.keys(outputFiles));
      });
    };

    outputFiles = {};
    var promises = Object.keys(files).map(function (key) {
      var props = files[key];
      var file = key;
      return iterator(props, file);
    }); // Call the chain

    return Promise.all(promises).then(finishAll).catch(function (err) {
      console.log('do i get here with an error?');
      if (globalOptions.callback) globalOptions.callback(err);
      console.error(err);
    });
  };
};

var _default = webpackPages;
exports.default = _default;