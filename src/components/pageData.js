import { fetchWithPagination } from './pagination.js'
import pageNameChanger from './pageNameChanger'
import pageNameSanitiser from './pageNameSanitiser'

const PageData = class PageData {
  constructor (params = { }) {
    this.params = params
    return this.init()
  }

  returnFiles () {
    return this.params.files
  }

  extractData (data, fileName, fileParams) {
    const { extraFiles, dataSource = { } } = fileParams
    const { pageDataField, pageNameField } = dataSource
    const newFiles = []
    if (!data || !data.length) {
      return {
        data,
        response: newFiles
      }
    }
    for (let i = 0; i < data.length; i++) {
      let newFile = extraFiles ? { } : JSON.parse(JSON.stringify(this.params.files[fileName]))
      let folder = fileName.split('/')
      folder = (folder && folder.length > 1) ? folder.slice(0, -1).join('/') + '/' : ''

      // Attach page data to props passed to the page
      let pageData = data[i]
      if (pageDataField) pageData = data[i][pageDataField]
      let pageName = pageData[pageNameField]
      pageName = pageNameSanitiser(pageName)
      pageName = pageNameChanger(pageName, dataSource)
      pageName = folder + pageName
      if (extraFiles) newFile = pageData
      else newFile.pageData = pageData
      newFile.pagename = newFile.pageName = pageName + '.html'

      // Create the new page in metalsmith
      newFile.srcFile = fileName
      // Filter out files that have a trailing slash. (will become something like "/foobarbaz/.html", which can't be build)
      if (/\/.html$/.test(newFile.pageName)) {
        console.log(`Page ${newFile.pageName} has a trailing slash and cannot be built`)
        continue
      }
      if (!extraFiles) this.params.files[newFile.pageName] = newFile
      data[i] = newFile
      newFiles.push({
        data: newFile,
        key: newFile.pageName
      })
    }
    return {
      data,
      response: newFiles
    }
  }

  // Helper to build the full API URL for a file's dataSource
  _buildUrl (fileParams) {
    const host = fileParams.dataSource.host
    const query = fileParams.dataSource.query
    const port = fileParams.dataSource.port || '443'

    // Use https if port is 443, otherwise use http with port
    let url = (port === '443')
      ? `https://${host}${query}`
      : `http://${host}:${port}${query}`

    const opts = this.params.opts
    if (opts && opts.token && opts.token.name && opts.token.value) {
      const delimiter = url.includes('?') ? '&' : '?'
      url += `${delimiter}${opts.token.name}=${opts.token.value}`
    }
    return url
  }

  // Call the API per markdown file and get data for each one returned.
  async callAPI (fileName, fileParams) {
    const url = this._buildUrl(fileParams)
    const data = await fetchWithPagination(url)

    if (data) {
      const response = this.extractData(data, fileName, fileParams) // removed repeater because hapi always returns 'data' (hapi responseHelper._generateResponse)... rather than whatever is in repeater field, so its useless

      delete this.params.files[fileName] // Remove the markdown file from metalsmith as its not an actual page
      if (response?.response) {
        return response.response
      }
    }
    throw new Error('No response found')
  }

  async makeExtraAPICalls (data, fileParams, callBack) {
    // Now check for additional requests per page returned from API call
    // This can be prodlib data based on an SEO object
    if (!fileParams.dataSource.extras) return callBack()
    const loop = fileParams.dataSource.extras
    return Object.keys(loop).filter(opt => loop[opt].query).map(opt => {
      loop[opt].extraFiles = true
      const option = loop[opt].query.match(/<%([^%].*)%>/)
      const extraPageData = data.map(async currentFile => {
        if (!currentFile.data.pageData[option[1]]) {
          const errorMsg = `No extra options found for ${this.params.files[currentFile.key].pageName}`
          console.log(errorMsg)
          delete this.params.files[currentFile.key]
          throw new Error(errorMsg)
        }
        const value = currentFile.data.pageData[option[1]]
        fileParams = Object.assign({}, loop[opt])
        fileParams.query = fileParams.query.replace(option[0], value)
        fileParams.dataSource = fileParams // Needs to double up for functions

        const url = this._buildUrl(fileParams)
        const paginatedData = await fetchWithPagination(url)
        if (paginatedData) {
          const response = this.extractData({ data: paginatedData }, currentFile.key, fileParams)
          this.params.files[currentFile.key][opt] = response.data
        }
      })
      Promise.all(extraPageData).then(callBack).catch(callBack)
      return opt
    })
  }

  // Remove anything in the markdown query that isn't this single page
  singlePageReduce (query) {
    if (!query) return false
    const selector = '&filter[pageName]='
    if (query.indexOf(selector) < 0) return query
    const pageList = query.split(selector)
    query = query.split(selector).slice(0, 1)
    let newQuery = ''
    pageList.filter(page => {
      return page.split('&')[0] === process.env.singlePage
    }).forEach(page => {
      newQuery += selector + page
    })
    return newQuery !== '' ? query + newQuery : false
  }

  // Loop over all the markdown files and lookup the data for the API request
  init () {
    const fetchedPageData = Object.keys(this.params.files).map(fileName => {
      return new Promise((resolve, reject) => {
        let fileParams = this.params.files[fileName]
        if (this.params.opts.initSetup) fileParams = this.params.opts.initSetup(fileParams)
        if (!fileParams.dataSource) return reject(new Error('SSG Error: no dataSource'))
        if (process.env.singlePage) fileParams.dataSource.query = this.singlePageReduce(fileParams.dataSource.query)
        if (!fileParams.dataSource.query) {
          delete this.params.files[fileName]
          return resolve()
        }
        return this.callAPI(fileName, fileParams).then(data => {
          this.makeExtraAPICalls(data, fileParams, resolve)
        }).catch(reject)
      })
    })
    return Promise.all(fetchedPageData).then(() => {
      return this.returnFiles()
    }).catch(() => {
      return this.returnFiles()
    })
  }
}

export default PageData
