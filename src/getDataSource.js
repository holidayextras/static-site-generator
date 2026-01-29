import prismic from './metalsmith-prismic'
import hxseo from './getHXSEOContent'
import writeRedirect from './writeRedirect'
import apiCaller from './apiCaller'
import _ from 'lodash'

const getDataSource = (opts) => {
  if (!opts.dataSource) return false

  if (typeof opts.dataSource === 'function') return opts.dataSource

  // Lets work out the datasource
  if (opts.dataSource.type === 'prismic') {
    const configLinkResolver = opts.config.linkResolver instanceof Function && opts.config.linkResolver
    return prismic({
      url: opts.dataSource.url,
      accessToken: opts.dataSource.accessToken,
      linkResolver: configLinkResolver || function (ctx, doc) {
        if (doc.isBroken) return ''

        // create redirect script if needed
        writeRedirect(doc.data)

        // Page url
        if (_.has(doc, 'data.slug.json.value')) {
          const regExpDomain = new RegExp(`.*${opts.config.domainSettings.domainLive}`)
          // Strip domain (+ everything before it) off of the slug in case it was added by mistake
          const slug = doc.data.slug.json.value
          return slug.replace(regExpDomain, '')
        }

        return '/' + doc.uid
      }
    })
  }
  if (opts.dataSource.type === 'hxseo') {
    // Pass dataSource plus folderPrefix. folderPrefix is used for single-page API filter
    // (e.g. folderPrefix=/de, pageName=kaputte-email-links — page has no de/ but we need /de).
    return hxseo(Object.assign({}, opts.dataSource.url, { folderPrefix: opts.webpackOptions?.folderPrefix }))
  }
  if (opts.dataSource.type === 'api') {
    return apiCaller(opts.dataSource)
  }
  return false // fallback
}

export default getDataSource
