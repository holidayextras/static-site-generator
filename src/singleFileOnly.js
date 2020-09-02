const singleFileOnly = (opts) => {
  return (files, metalsmith, done) => {
    if (!process.env.srcFile && !process.env.singlePage) return done()
    if (process.env.singlePage) {
      Object.keys(files).map(fileName => {
        if (files[fileName].folderPrefix && fileName !== 'index') {
          fileName = files[fileName].folderPrefix + fileName
        }
        if (fileName !== process.env.singlePage + '.html') delete files[fileName]
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
