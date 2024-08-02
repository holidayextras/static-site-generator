"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var getPrismicContent = function getPrismicContent() {
  return function (files, metalsmith, done) {
    // Adjusts the pageData from prismic to return the value of the fragment instead of the whole entity
    var getFragmentValues = function getFragmentValues(fragment, file, data) {
      Object.keys(fragment.json.fragments).forEach(function (child) {
        if (typeof fragment[child].value === 'string') {
          var newName = child.replace(fragment.json.type + '.', '');
          files[file].pageData[data][newName] = fragment[child].value;
        }
      });
    }; // Sort out the pageData from prismic, into an easier props way


    var getPrismicData = function getPrismicData(pageData, file) {
      Object.keys(pageData).forEach(function (data) {
        if (typeof pageData[data].json.value === 'string') {
          files[file].pageData[data] = pageData[data].json.value;
        } // Get the data from fetchLinks fragments to save the html


        if (pageData[data].json && pageData[data].json.fragments) getFragmentValues(pageData[data], file, data); // Delete old data now

        delete files[file].prismic.page.results[0].data[data].json;
      });
    };

    Object.keys(files).forEach(function (file) {
      files[file].pageData = files[file].prismic.page.results[0].data;
      files[file].pagename = file;
      getPrismicData(files[file].pageData, file);
    });
    return done();
  };
};

var _default = getPrismicContent;
exports.default = _default;