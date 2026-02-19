import PageData from './components/pageData'
import path from 'path'

const apiCaller = (opts) => {
  const originalInitSetup = opts?.initSetup
  const optsForPageData = originalInitSetup && process.env.singlePage
    ? Object.assign({}, opts, {
        initSetup: (params) => {
          const out = originalInitSetup(params)
          if (out?.dataSource?.query && process.env.singlePage) {
            out.dataSource.query += `&filter[pageName]=${process.env.singlePage}`
          }
          return out
        }
      })
    : opts

  return (files, metalsmith, done) => {
    const postQuery = opts?.url?.postBuild || false
    new PageData({
      opts: optsForPageData,
      files
    }).then((data) => {
      const newDone = data => {
        files = data
        done()
      }
      if (postQuery) {
        const pathToFunc = path.join(metalsmith._directory, postQuery)
        const func = require(pathToFunc)
        if (typeof func !== 'function') return newDone(data)
        func(data).then(newDone).catch(function (err) {
          console.log(err)
          newDone(data)
        })
      } else newDone(data)
    })
  }
}

export default apiCaller
