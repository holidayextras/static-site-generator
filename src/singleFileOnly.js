const singleFileOnly = (opts) => {
  return (files, metalsmith, done) => {
    if (!process.env.srcFile && !process.env.singlePage) return done()
    if (process.env.singlePage) {
      // Match the single page by name; when folderPrefix is set, accept both with and without prefix.
      // Example: folderPrefix=/de, singlePage=kaputte-email-links → keep either kaputte-email-links.html
      // or de/kaputte-email-links.html (page has no de/ in filename but we need /de for CSS).
      const singlePageName = process.env.singlePage.replace(/\.html$/, '')
      const folderPrefix = opts.webpackOptions?.folderPrefix
        ? opts.webpackOptions.folderPrefix.replace(/^\//, '') + '/'
        : null
      const match = (fileName) => {
        const withSuffix = singlePageName + '.html'
        if (fileName === withSuffix) return true
        if (folderPrefix) {
          if (fileName === folderPrefix + withSuffix) return true
        }
        if (!folderPrefix && fileName.endsWith('/' + withSuffix)) return true
        return false
      }
      Object.keys(files).map(fileName => {
        if (!match(fileName)) delete files[fileName]
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
