var each = require('async').each;
var prismic = require('prismic.io').Prismic;
var debug = require('debug')('metalsmith-prismic');
var _ = require('underscore');
var clone = require('clone');
/**
 * Expose `plugin`.
 */

/**
 * Metalsmith plugin to retrieve content from Prismic.io and place in the file's metadata.
 *
 * @param {Object} options
 *   @property {String} url
 *   @property {String} accessToken (optional)
 * @return {Function}
 */

function plugin(config) {

  function checkProperty(object, property) {
    if ((object[property]) === null) {
      throw new TypeError('Missing property \'' + property + '\'. Please update the configuration settings appropriately.');
    }
  }

  checkProperty(config, 'url');

  return function(files, metalsmith, done) {

    function getLinkResolver(ctx) {
      return function(doc, isBroken) {
        if (config.linkResolver !== undefined) return config.linkResolver(ctx, doc);
        if (isBroken) return false;
        return '/' + doc.type + '/' + doc.id + '/' + doc.slug + (ctx.maybeRef ? '?ref=' + ctx.maybeRef : '');
      };
    }

    // if any of the queries are designated the collection query, then generate a file for each of the results
    function generateCollectionFiles(fileName, collectionQuery, callback, ctx) {
      if (collectionQuery !== null) {
        var file = files[fileName];
        var newFiles = {};
        var fileExtension = file.prismic[collectionQuery].collection.fileExtension;
        var fileSuffix = (fileExtension !== undefined && fileExtension !== '') ? '.' + fileExtension : '';
        // for every result in the collection query
        for (var i = 0; i < file.prismic[collectionQuery].results.length; i++) {

          // clone the file and replace the original collectionQuery results with the current result
          var newFile = clone(file);
          newFile.prismic[collectionQuery].results = [file.prismic[collectionQuery].results[i]];

          // add the filename to the ctx object to make it available for use in the linkResolver function
          ctx.path = fileName;

          // use the linkResolver to generate the filename removing the leading slash if present
          newFiles[(ctx.linkResolver(file.prismic[collectionQuery].results[i]) + fileSuffix).replace(/^\//g, '')] = newFile;
        }

        delete files[fileName];
        _.extend(files, newFiles);
      }

      callback();
    }

    // processes the retrieved content and adds it to the metadata
    function processRetrievedContent(content, filePrismicMetadata, queryKey, ctx) {
      if (content.results !== null && content.results.length > 0) {
        for (var i = 0; i < content.results.length; i++) {

          // add the complete result except for the data fragments
          var result = _.omit(content.results[i], 'fragments');
          result.data = {};

          // process the data fragments, invoking helpers to make the data more usable
          if (content.results[i].fragments !== null && Object.keys(content.results[i].fragments).length > 0) {
            for (var fragmentFullName in content.results[i].fragments) {

              // strip the document type from the fragment name
              var fragmentName = fragmentFullName.substr(fragmentFullName.lastIndexOf('.') + 1);

              result.data[fragmentName] = {};
              result.data[fragmentName].json = content.results[i].get(fragmentFullName);
              result.data[fragmentName].html = [];
              if (typeof result.data[fragmentName].json.value !== 'object') {
                result.data[fragmentName].html = result.data[fragmentName].json.asHtml(ctx.linkResolver);
              } else {
                for (var val in result.data[fragmentName].json.value) {
                  result.data[fragmentName].html.push(result.data[fragmentName].json.value[val].asHtml(ctx.linkResolver));
                }
              }
            }
          }
          filePrismicMetadata[queryKey].results.push(result);
        }
      }
    }

    // retrieves and processes the content for the given filename
    function retrieveContentForFile(fileName, callback, ctx) {
      var file = files[fileName];
      if (file.prismic) {
        debug('Pulling in content for file: %s', fileName);
        var queryKeys = {};
        var collectionQuery;

        // create associative array of query keys and their query & formName
        for (var queryKey in file.prismic) {
          debug('processing %s', queryKey);
          file.prismic[queryKey].results = [];
          var queryString = file.prismic[queryKey].query;
          var orderings = file.prismic[queryKey].orderings;
          var pageSize = file.prismic[queryKey].pageSize;
          var allPages = file.prismic[queryKey].allPages;
          var formName = file.prismic[queryKey].formName;
          if (!formName) {
            formName = 'everything';
          }
          var collectionMetaData = file.prismic[queryKey].collection;
          if (collectionMetaData) {
            if (collectionQuery) {
              throw new TypeError('Only one query can be designated the collection query. Please update the configuration settings appropriately.');
            } else if (typeof collectionMetaData !== 'boolean' && !file.prismic[queryKey].collection.fileExtension) {
              throw new TypeError('The file extension to use when generating the files for the collection must be specified.');
            } else if (collectionMetaData || typeof collectionMetaData !== 'boolean') {
              collectionQuery = queryKey;
            }
          }
          queryKeys[queryKey] = {
            'queryString': queryString,
            'pageSize': pageSize,
            'allPages': allPages,
            'orderings': orderings,
            'formName': formName
          };
        }

        // asynchronously retrieve and process each query
        each(Object.keys(queryKeys), function(currentQueryKey, queriedAndProcessedCallback) {
          var totalPages;
          var page = 1;

          var queryNextPage = function() {
            ctx.api.form(queryKeys[currentQueryKey].formName)
              .query(queryKeys[currentQueryKey].queryString)
              .pageSize(queryKeys[currentQueryKey].pageSize)
              .page(page)
              .orderings(queryKeys[currentQueryKey].orderings)
              .ref(ctx.ref).submit(prismicCallback); //eslint-disable-line no-use-before-define
          };

          var prismicCallback = function(err, d) {
            if (err) {
              queriedAndProcessedCallback(err);
            } else {
              processRetrievedContent(d, file.prismic, currentQueryKey, ctx);
              totalPages = d.total_pages;
              if (queryKeys[currentQueryKey].allPages &&
                page < totalPages) {
                page++;
                queryNextPage();
              } else {
                queriedAndProcessedCallback();
              }
            }
          };

          queryNextPage();

        }, function(err) {
          if (err !== null) {
            console.log(err);
            callback(err);
            return;
          }
          generateCollectionFiles(fileName, collectionQuery, callback, ctx);
        });
      } else {
        callback();
      }
    }

    function retrieveContent(err, api) {
      if (err) {
        console.error('Could not initialize API: ' + err);
      } else {

        // obtain the reference
        var release = config.release;
        var ref;
        var ctx = {};
        for (var currentRef in api.data.refs) {
          if ((!release || release.toLowerCase() === 'master') && (api.data.refs[currentRef].isMaster)) {
            ref = api.data.refs[currentRef].ref;
          } else if (release === api.data.refs[currentRef].label) {
            ref = api.data.refs[currentRef].ref;
          }
        }

        // user release as reference if no reference found
        if (!ref) {
          ref = release || 'master';
        }

        // setup the context object
        ctx.api = api;
        ctx.linkResolver = getLinkResolver(ctx);
        ctx.ref = ref;
        ctx.OAuth = config.accessToken;

        each(Object.keys(files), function(fileName, callback) {
          retrieveContentForFile(fileName, callback, ctx);
        }, function(error) {
          debug('metalsmith-prismic done!');
          done(error);
        });
      }
    }

    // initialize the API
    prismic.Api(config.url, retrieveContent, config.accessToken); //eslint-disable-line new-cap

  };
}

module.exports = plugin;
