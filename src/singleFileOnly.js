const singleFileOnly = (opts) => {
  return (files, metalsmith, done) => {
    if (!process.env.srcFile && !process.env.singlePage) return done()
    if (process.env.singlePage) {
      const withSuffix = process.env.singlePage.replace(/\.html$/, '') + '.html'
      Object.keys(files).map(fileName => {
        if (fileName !== withSuffix && !fileName.endsWith('/' + withSuffix)) delete files[fileName]
        return fileName
      })
      return done()
    }
    Object.keys(files).map(fileName => {
      if (files[fileName].srcFile !== process.env.srcFile) delete files[fileName]
      return fileName
    })
    done()
  }
}

export default singleFileOnly
