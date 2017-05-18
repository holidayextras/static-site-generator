import PageData from './components/pageData'

const apiCaller = (opts) => {
  return (files, metalsmith, done) => {
    new PageData({
      opts,
      files
    }).then((data) => {
      files = data
      done()
    })
  }
}

export default apiCaller
