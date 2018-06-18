import http from 'http'
import https from 'https'
import clone from 'clone'
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
    const newFiles = [ ]
    if (repeater) data = data[repeater]
    if (!data || !data.length) {
      return {
        data,
        response: newFiles
      }
    }
    for (let i = 0; i < data.length; i++) {
      let newFile = extraFiles ? { } : clone(this.params.files[ fileName ])
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
      if (!extraFiles) this.params.files[ newFile.pageName ] = newFile
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
          delete this.params.files[ fileName ]
          if (fileData.response) return resolve(fileData.response)
          return reject(new Error('No response found'))
        }).catch(reject)
      })
    })
  }

  makeExtraAPICalls (data, fileParams, callBack) {
    // Now check for additional requests per page returned from API call
    // This can be prodlib data based on an SEO object
    if (!fileParams.dataSource.extras) return callBack()
    const loop = fileParams.dataSource.extras
    return Object.keys(loop).map(opt => {
      if (!loop[ opt ].query) return
      loop[ opt ].extraFiles = true
      const option = loop[ opt ].query.match(/<%([^%].*)%>/)
      const extraPageData = data.map(currentFile => {
        return new Promise((resolve, reject) => {
          if (!currentFile.data.pageData[option[1]]) return reject(new Error('No extra options found'))
          const value = currentFile.data.pageData[option[1]]
          fileParams = Object.assign({}, loop[ opt ])
          fileParams.query = fileParams.query.replace(option[0], value)
          fileParams.dataSource = fileParams // Needs to double up for functions
          const request = this.prepareRequest(fileParams)
          const requestMethod = request.port === '443' ? https : http
          return requestMethod.get(request, res => {
            this.getDataForPage(res, currentFile.key, fileParams).then(newFiles => {
              this.params.files[ currentFile.key ][ opt ] = newFiles.data
              resolve()
            }).catch(reject)
          })
        })
      })
      Promise.all(extraPageData).then(callBack)
    })
  }

  prepareRequest (fileParams) {
    const { opts } = this.params
    const request = {
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

  // Loop over all the markdown files and lookup the data for the API request
  init () {
    const fetchedPageData = Object.keys(this.params.files).map(fileName => {
      return new Promise((resolve, reject) => {
        let fileParams = this.params.files[fileName]
        if (this.params.opts.initSetup) fileParams = this.params.opts.initSetup(fileParams)
        if (!fileParams.dataSource) return reject(new Error('SSG Error: no dataSource'))
        return this.callAPI(fileName, fileParams).then(data => {
          this.makeExtraAPICalls(data, fileParams, resolve)
        }).catch(reject)
      })
    })
    return Promise.all(fetchedPageData).then(() => {
      return this.returnFiles()
    }).catch(e => {
      throw e
    })
  }
}

export default PageData
