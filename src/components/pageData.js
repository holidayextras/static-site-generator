import http from 'http'
import https from 'https'
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
    const { repeater, pageDataField, pageNameField } = dataSource
    const newFiles = []
    if (repeater) data = data[repeater]
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

  // Make request to the API endpoint in the markdown file
  getDataForPage (res, fileName, fileParams) {
    return new Promise((resolve, reject) => {
      let data = ''
      res.on('data', d => {
        data += d
      })
      res.on('end', () => {
        try {
          const newData = data.split('').map(char => char.charCodeAt(0).toString().length < 4 ? char : `&#${char.charCodeAt(0)};`).join('').replace(/(\\u|\\x|\\d)\d{4}/gm, '').replace(/&#822[0-1];/gm, '\\"').replace(/&#821[6-7];/gm, '\'')
          data = newData
        } catch (e) {
          console.log(e, 'Can\'t convert charCodeAt')
        }
        try {
          console.log('data===>', data)
          data = JSON.parse(data)
          if (!data) return reject(new Error('Nothing returned'))
          if (data.message) return reject(data.message)
          const response = this.extractData(data, fileName, fileParams)
          return resolve(response)
        } catch (e) {
          return reject(e)
        }
      })
    })
  }

  // Call the API per markdown file and get data for each one returned.
  callAPI (fileName, fileParams) {
    return new Promise((resolve, reject) => {
      const request = this.prepareRequest(fileParams)
      const requestMethod = request.port === '443' ? https : http
      requestMethod.get(request, res => {
        this.getDataForPage(res, fileName, fileParams).then(fileData => {
          // Remove the markdown file from metalsmith as its not an actual page
          delete this.params.files[fileName]
          if (fileData.response) return resolve(fileData.response)
          return reject(new Error('No response found'))
        }).catch(reject)
      })
    })
  }

  makeExtraAPICalls (data, fileParams, callBack) {
    // Now check for additional requests per page returned from API call
    // This can be prodlib data based on an SEO object
    console.log('making extra calls')
    if (!fileParams.dataSource.extras) return callBack()
    const loop = fileParams.dataSource.extras
    return Object.keys(loop).filter(opt => loop[opt].query).map(opt => {
      loop[opt].extraFiles = true
      const option = loop[opt].query.match(/<%([^%].*)%>/)
      const extraPageData = data.map(currentFile => {
        return new Promise((resolve, reject) => {
          if (!currentFile.data.pageData[option[1]]) {
            const errorMsg = `No extra options found for ${this.params.files[currentFile.key].pageName}`
            console.log(errorMsg)
            reject(new Error(errorMsg))
            return delete this.params.files[currentFile.key]
          }
          const value = currentFile.data.pageData[option[1]]
          fileParams = Object.assign({}, loop[opt])
          fileParams.query = fileParams.query.replace(option[0], value)
          fileParams.dataSource = fileParams // Needs to double up for functions
          const request = this.prepareRequest(fileParams)
          const requestMethod = request.port === '443' ? https : http
          return requestMethod.get(request, res => {
            this.getDataForPage(res, currentFile.key, fileParams).then(newFiles => {
              this.params.files[currentFile.key][opt] = newFiles.data
              resolve()
            }).catch(reject)
          })
        })
      })
      console.log('here1?')
      Promise.all(extraPageData).then(callBack).catch(callBack)
      console.log('here12')
      return opt
    })
  }

  prepareRequest (fileParams) {
    const { opts } = this.params
    const request = {
      timeout: 10000,
      host: fileParams.dataSource.host,
      port: fileParams.dataSource.port || '443',
      headers: {
        accept: '*/*'
      }
    }
    request.path = fileParams.dataSource.query.replace(/\s+/gm, '')
    if (opts.token && opts.token.name && opts.token.value) {
      request.path += request.path.indexOf('?') > -1 ? '&' : '?'
      request.path += opts.token.name + '=' + opts.token.value
    }
    return request
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
          console.log('got result from api')
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
