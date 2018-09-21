import _ from 'underscore'
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
    new PageData({
      opts,
      files
    }).then((data) => {
      files = data
      done()
    }).catch((err) => {
      console.log(err)
      done()
    })
  }
}

export default getHXSEOContent
