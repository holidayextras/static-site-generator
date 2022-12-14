"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _http = _interopRequireDefault(require("http"));
var _https = _interopRequireDefault(require("https"));
var _pageNameChanger = _interopRequireDefault(require("./pageNameChanger"));
var _pageNameSanitiser = _interopRequireDefault(require("./pageNameSanitiser"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var PageData = /*#__PURE__*/function () {
  function PageData() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, PageData);
    this.params = params;
    return this.init();
  }
  _createClass(PageData, [{
    key: "returnFiles",
    value: function returnFiles() {
      return this.params.files;
    }
  }, {
    key: "extractData",
    value: function extractData(data, fileName, fileParams) {
      var extraFiles = fileParams.extraFiles,
        _fileParams$dataSourc = fileParams.dataSource,
        dataSource = _fileParams$dataSourc === void 0 ? {} : _fileParams$dataSourc;
      var repeater = dataSource.repeater,
        pageDataField = dataSource.pageDataField,
        pageNameField = dataSource.pageNameField;
      var newFiles = [];
      if (repeater) data = data[repeater];
      if (!data || !data.length) {
        return {
          data: data,
          response: newFiles
        };
      }
      for (var i = 0; i < data.length; i++) {
        var newFile = extraFiles ? {} : JSON.parse(JSON.stringify(this.params.files[fileName]));
        var folder = fileName.split('/');
        folder = folder && folder.length > 1 ? folder.slice(0, -1).join('/') + '/' : '';

        // Attach page data to props passed to the page
        var pageData = data[i];
        if (pageDataField) pageData = data[i][pageDataField];
        var pageName = pageData[pageNameField];
        pageName = (0, _pageNameSanitiser.default)(pageName);
        pageName = (0, _pageNameChanger.default)(pageName, dataSource);
        pageName = folder + pageName;
        if (extraFiles) newFile = pageData;else newFile.pageData = pageData;
        newFile.pagename = newFile.pageName = pageName + '.html';

        // Create the new page in metalsmith
        newFile.srcFile = fileName;
        if (!extraFiles) this.params.files[newFile.pageName] = newFile;
        data[i] = newFile;
        newFiles.push({
          data: newFile,
          key: newFile.pageName
        });
      }
      return {
        data: data,
        response: newFiles
      };
    }

    // Make request to the API endpoint in the markdown file
  }, {
    key: "getDataForPage",
    value: function getDataForPage(res, fileName, fileParams) {
      var _this = this;
      return new Promise(function (resolve, reject) {
        var data = '';
        res.on('data', function (d) {
          data += d;
        });
        res.on('end', function () {
          try {
            var newData = data.split('').map(function (char) {
              return char.charCodeAt(0).toString().length < 4 ? char : "&#".concat(char.charCodeAt(0), ";");
            }).join('').replace(/(\\u|\\x|\\d)\d{4}/gm, '').replace(/&#822[0-1];/gm, '\\"').replace(/&#821[6-7];/gm, '\'');
            data = newData;
          } catch (e) {
            console.log(e, 'Can\'t convert charCodeAt');
          }
          try {
            data = JSON.parse(data);
            if (!data) return reject(new Error('Nothing returned'));
            if (data.message) return reject(data.message);
            var response = _this.extractData(data, fileName, fileParams);
            return resolve(response);
          } catch (e) {
            return reject(e);
          }
        });
      });
    }

    // Call the API per markdown file and get data for each one returned.
  }, {
    key: "callAPI",
    value: function callAPI(fileName, fileParams) {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        var request = _this2.prepareRequest(fileParams);
        var requestMethod = request.port === '443' ? _https.default : _http.default;
        requestMethod.get(request, function (res) {
          _this2.getDataForPage(res, fileName, fileParams).then(function (fileData) {
            // Remove the markdown file from metalsmith as its not an actual page
            delete _this2.params.files[fileName];
            if (fileData.response) return resolve(fileData.response);
            return reject(new Error('No response found'));
          }).catch(reject);
        });
      });
    }
  }, {
    key: "makeExtraAPICalls",
    value: function makeExtraAPICalls(data, fileParams, callBack) {
      var _this3 = this;
      // Now check for additional requests per page returned from API call
      // This can be prodlib data based on an SEO object
      if (!fileParams.dataSource.extras) return callBack();
      var loop = fileParams.dataSource.extras;
      return Object.keys(loop).filter(function (opt) {
        return loop[opt].query;
      }).map(function (opt) {
        loop[opt].extraFiles = true;
        var option = loop[opt].query.match(/<%([^%].*)%>/);
        var extraPageData = data.map(function (currentFile) {
          return new Promise(function (resolve, reject) {
            if (!currentFile.data.pageData[option[1]]) {
              var errorMsg = "No extra options found for ".concat(_this3.params.files[currentFile.key].pageName);
              console.log(errorMsg);
              reject(new Error(errorMsg));
              return delete _this3.params.files[currentFile.key];
            }
            var value = currentFile.data.pageData[option[1]];
            fileParams = Object.assign({}, loop[opt]);
            fileParams.query = fileParams.query.replace(option[0], value);
            fileParams.dataSource = fileParams; // Needs to double up for functions
            var request = _this3.prepareRequest(fileParams);
            var requestMethod = request.port === '443' ? _https.default : _http.default;
            return requestMethod.get(request, function (res) {
              _this3.getDataForPage(res, currentFile.key, fileParams).then(function (newFiles) {
                _this3.params.files[currentFile.key][opt] = newFiles.data;
                resolve();
              }).catch(reject);
            });
          });
        });
        Promise.all(extraPageData).then(callBack).catch(callBack);
        return opt;
      });
    }
  }, {
    key: "prepareRequest",
    value: function prepareRequest(fileParams) {
      var opts = this.params.opts;
      var request = {
        timeout: 10000,
        host: fileParams.dataSource.host,
        port: fileParams.dataSource.port || '443',
        headers: {
          accept: '*/*'
        }
      };
      request.path = fileParams.dataSource.query.replace(/\s+/gm, '');
      if (opts.token && opts.token.name && opts.token.value) {
        request.path += request.path.indexOf('?') > -1 ? '&' : '?';
        request.path += opts.token.name + '=' + opts.token.value;
      }
      return request;
    }

    // Remove anything in the markdown query that isn't this single page
  }, {
    key: "singlePageReduce",
    value: function singlePageReduce(query) {
      if (!query) return false;
      var selector = '&filter[pageName]=';
      if (query.indexOf(selector) < 0) return query;
      var pageList = query.split(selector);
      query = query.split(selector).slice(0, 1);
      var newQuery = '';
      pageList.filter(function (page) {
        return page.split('&')[0] === process.env.singlePage;
      }).forEach(function (page) {
        newQuery += selector + page;
      });
      return newQuery !== '' ? query + newQuery : false;
    }

    // Loop over all the markdown files and lookup the data for the API request
  }, {
    key: "init",
    value: function init() {
      var _this4 = this;
      var fetchedPageData = Object.keys(this.params.files).map(function (fileName) {
        return new Promise(function (resolve, reject) {
          var fileParams = _this4.params.files[fileName];
          if (_this4.params.opts.initSetup) fileParams = _this4.params.opts.initSetup(fileParams);
          if (!fileParams.dataSource) return reject(new Error('SSG Error: no dataSource'));
          if (process.env.singlePage) fileParams.dataSource.query = _this4.singlePageReduce(fileParams.dataSource.query);
          if (!fileParams.dataSource.query) {
            delete _this4.params.files[fileName];
            return resolve();
          }
          return _this4.callAPI(fileName, fileParams).then(function (data) {
            _this4.makeExtraAPICalls(data, fileParams, resolve);
          }).catch(reject);
        });
      });
      return Promise.all(fetchedPageData).then(function () {
        return _this4.returnFiles();
      }).catch(function () {
        return _this4.returnFiles();
      });
    }
  }]);
  return PageData;
}();
var _default = PageData;
exports.default = _default;