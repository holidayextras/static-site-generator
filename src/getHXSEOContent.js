import _ from 'underscore'
import path from 'path'
import PageData from './components/pageData'

const getHXSEOContent = (opts) => {
  return (files, metalsmith, done) => {
    if (!opts.token) throw (new Error('Must provide a token for SEO api access'))
    opts.token = {
      name: 'token',
      value: opts.token
    }
    opts.initSetup = params => {
      // Extend params needed
      if (!params.hxseo) return { }
      params.dataSource = _.extend({ }, opts, params.hxseo)
      params.dataSource.repeater = 'data'
      params.dataSource.pageDataField = 'attributes'
      params.dataSource.pageNameField = 'pageName'
      return params
    }
    const postQuery = (files[Object.keys(files)[0]] && files[Object.keys(files)[0]].hxseo && files[Object.keys(files)[0]].hxseo.postQuery) || false
    new PageData({
      opts,
      files
    }).then(data => {
      files = data
      if (postQuery) {
        const pathToFunc = path.join(metalsmith._directory, postQuery)
        const func = require(pathToFunc)
        if (typeof func !== 'function') return done()
        func(data).then(data => {
          files = data
          done()
        }).catch(err => {
          console.log(err)
          done()
        })
      } else done()
    }).catch((err) => {
      throw err
    })
  }
}

export default getHXSEOContent
