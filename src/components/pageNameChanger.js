const pageNameChanger = (pageName, fileParams) => {
  const { postPageNameChange = '', fileNamePrefix = '', fileNameSuffix = '' } = fileParams
  if (!postPageNameChange) return `${fileNamePrefix}${pageName}${fileNameSuffix}`
  if (postPageNameChange === 'strip') {
    pageName = pageName.split('/')
    pageName = pageName[pageName.length - 1].replace(/[\d]+/, '')
    let pageNames = pageName.split('-')
    const start = pageNames[0] === '' ? 1 : 0
    pageNames = pageNames.slice(start, pageNames.length)
    if (pageNames[pageNames.length - 1] === '') {
      pageNames = pageNames.slice(0, pageNames.length - 1)
    }
    pageName = pageNames.join('-').toLowerCase().replace(/--+/, '-')
  }
  return `${fileNamePrefix}${pageName}${fileNameSuffix}`
}

export default pageNameChanger
