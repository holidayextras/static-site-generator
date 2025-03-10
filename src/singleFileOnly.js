const singleFileOnly = (opts) => {
  return (files, metalsmith, done) => {
    if (!process.env.srcFile && !process.env.singlePage) return done()
    if (process.env.singlePage) {
      Object.keys(files).map(fileName => {
        const folderPrefix = opts.webpackOptions.folderPrefix ? `${opts.webpackOptions.folderPrefix.replace(/^\//, '')}/` : null
        const pagePrefix = folderPrefix && !process.env.singlePage.startsWith(folderPrefix) ? folderPrefix : ''
        const singlePage = `${pagePrefix}${process.env.singlePage}.html`
        if (fileName !== singlePage) delete files[fileName]
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
