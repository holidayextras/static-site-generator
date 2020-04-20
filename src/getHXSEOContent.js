import path from 'path'
import PageData from './components/pageData'
let cachedFiles = false

const getHXSEOContent = (coreParams) => {
  const opts = Object.assign({ }, coreParams)
  return (files, metalsmith, done) => {
    if (!opts.token) throw (new Error('Must provide a token for SEO api access'))
    var newDone = function (data) {
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
        params.dataSource.query += `&filter[pageName]=${process.env.singlePage}`
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
