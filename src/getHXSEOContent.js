import path from 'path'
import PageData from './components/pageData'
let cachedFiles = false

/**
 * Returns the page name without the folder prefix, for use in API filters.
 * We need folderPrefix (e.g. /de) for output paths (CSS, JS under /de) but the API
 * may store page names without the prefix. Example: folderPrefix=/de, pageName=kaputte-email-links
 * → returns "kaputte-email-links"; pageName=de/kaputte-email-links → also "kaputte-email-links".
 */
function singlePageNameForApi (singlePage, folderPrefix) {
  if (!singlePage) return null
  if (!folderPrefix) return singlePage
  const normalized = folderPrefix.replace(/^\//, '') + '/'
  return singlePage.startsWith(normalized) ? singlePage.slice(normalized.length) : singlePage
}

// coreParams: opts.dataSource.url with optional folderPrefix (from getDataSource: dataSource + webpackOptions.folderPrefix)
const getHXSEOContent = (coreParams) => {
  const opts = Object.assign({ }, coreParams)
  return (files, metalsmith, done) => {
    if (!opts.token) throw (new Error('Must provide a token for SEO api access'))
    const newDone = function (data) {
      Object.keys(files).forEach(file => {
        delete files[file]
      })
      Object.keys(data).forEach(file => {
        files[file] = data[file]
      })
      if (opts.cache) cachedFiles = data
      done()
    }
    if (cachedFiles && opts.cache) {
      return newDone(cachedFiles)
    }
    cachedFiles = Object.assign({}, files)
    opts.token = {
      name: 'token',
      value: opts.token
    }
    opts.initSetup = params => {
      // Extend params needed
      if (!params.hxseo) return { }
      params.dataSource = Object.assign({ }, opts, params.hxseo)
      params.dataSource.repeater = 'data'
      params.dataSource.pageDataField = 'attributes'
      params.dataSource.pageNameField = 'pageName'
      if (process.env.singlePage) {
        // Search for the page both with and without folder prefix so we find it either way.
        // Example: folderPrefix=/de, singlePage=kaputte-email-links → filter by both
        // "kaputte-email-links" and "de/kaputte-email-links" (page has no de/ in name but we need /de for CSS).
        const folderPrefix = opts.folderPrefix
        const bare = singlePageNameForApi(process.env.singlePage, folderPrefix)
        const prefixed = folderPrefix ? (folderPrefix.replace(/^\//, '') + '/' + bare) : bare
        params.dataSource.query += `&filter[pageName]=${bare}`
        if (folderPrefix && prefixed !== bare) params.dataSource.query += `&filter[pageName]=${prefixed}`
      }
      return params
    }
    const postQuery = (cachedFiles[Object.keys(cachedFiles)[0]] && cachedFiles[Object.keys(cachedFiles)[0]].hxseo && cachedFiles[Object.keys(cachedFiles)[0]].hxseo.postQuery) || opts.postBuild || false
    new PageData({
      opts,
      files: cachedFiles
    }).then(data => {
      if (postQuery) {
        const pathToFunc = path.join(metalsmith._directory, postQuery)
        const func = require(pathToFunc)
        if (typeof func !== 'function') return newDone(data)
        func(data).then(newDone).catch(err => {
          console.log(err)
          newDone(data)
        })
      } else newDone(data)
    }).catch((err) => {
      throw err
    })
  }
}

export default getHXSEOContent
