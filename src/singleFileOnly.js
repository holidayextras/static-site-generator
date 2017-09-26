const singleFileOnly = (opts) => {
  return (files, metalsmith, done) => {
    if (!process.env.srcFile && !process.env.srcPage) done()
    if (process.env.srcPage) {
      Object.keys(files).map(fileName => {
        if (fileName !== process.env.srcPage) delete files[fileName]
      })
      return done()
    }
    Object.keys(files).map(fileName => {
      if (files[fileName].srcFile !== process.env.srcFile) delete files[fileName]
    })
    done()
  }
}

export default singleFileOnly
