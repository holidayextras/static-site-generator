import PageData from './components/pageData'
import path from 'path'

const apiCaller = (opts) => {
  return (files, metalsmith, done) => {
    const postQuery = opts.url && opts.url.postBuild || false
    new PageData({
      opts,
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
