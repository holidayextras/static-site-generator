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

  // Get pagination limit from config or environment
  getPaginationLimit (pagination = {}) {
    return pagination.limit || process.env.SSG_PAGINATION_LIMIT || 100
  }

  // Get length of data array accounting for repeater
  getDataArrayLength (data, repeater) {
    const array = this.getDataArray(data, repeater)
    return Array.isArray(array) ? array.length : 0
  }

  // Get HTTP/HTTPS module based on port
  getHttpModule (port) {
    return port === '443' ? https : http
  }

  // Get query separator (? or &)
  getQuerySeparator (path) {
    return path.indexOf('?') > -1 ? '&' : '?'
  }

  // Extract data array from response (with or without repeater)
  getDataArray (data, repeater) {
    return repeater ? data[repeater] : data
  }

  // Update data with new array (respecting repeater)
  updateDataArray (data, repeater, newArray) {
    if (repeater) {
      data[repeater] = newArray
    } else {
      data = newArray
    }
    return data
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
          data = JSON.parse(data)
          if (!data) return reject(new Error('Nothing returned'))
          if (data.message) return reject(data.message)
          return resolve(data)
        } catch (e) {
          return reject(e)
        }
      })
    })
  }

  fetchAllPages (fileName, fileParams, initialData) {
    const { dataSource = {} } = fileParams
    const { repeater, pagination = {} } = dataSource
    return new Promise((resolve, reject) => {
    
      let dataArray = this.getDataArray(initialData, repeater)
      
      // Check if pagination metadata exists
      // Support both meta.pagination (standard) and meta.page (hapi JSON:API format)
      const hasPaginationMeta = !!(initialData.meta && (initialData.meta.pagination || initialData.meta.page));
      const requiresPagination = (pagination.enabled !== false) && hasPaginationMeta;
      let totalPages = 0
      let currentPage = 1
      let paginationFormat = 'standard' // 'standard' or 'jsonapi'
      let pageLimit = this.getPaginationLimit(pagination)
    
      
      if (requiresPagination) {
        // Check for standard pagination format
        if (initialData.meta.pagination) {
          totalPages = initialData.meta.pagination.totalPages || 0
          currentPage = initialData.meta.pagination.currentPage || 1
          paginationFormat = 'standard'
        } 
        // Check for hapi JSON:API format (meta.page with total, limit, offset)
        else if (initialData.meta.page) {
          const pageInfo = initialData.meta.page
          const total = pageInfo.total || 0
          // pageLimit = pageInfo.limit || 300
          totalPages = Math.ceil(total / pageLimit)
          currentPage = Math.floor((pageInfo.offset || 0) / pageLimit) + 1
          paginationFormat = 'jsonapi'
        }
      }
      
      const hasMorePages = totalPages > 1
      
      if (!hasMorePages) {
        // No pagination, return the initial data
        const response = this.extractData(initialData, fileName, fileParams)
        console.log('Extracted', response.response ? response.response.length : 0, 'files from single page')
        return resolve(response)
      }
      
      console.log(`PAGINATION DETECTED! Fetching page ${currentPage} of ${totalPages} for ${fileName}`)
      console.log('Will fetch pages:', Array.from({ length: totalPages - currentPage }, (_, i) => currentPage + 1 + i))
      
      // Create array of promises for remaining pages
      const pagePromises = []
      for (let page = currentPage + 1; page <= totalPages; page++) {
        pagePromises.push(this.fetchPage(fileName, fileParams, page, paginationFormat))
      }
      
      console.log('Fetching', pagePromises.length, 'additional pages in parallel')
      
      // Fetch all remaining pages
      Promise.all(pagePromises).then(additionalPages => {
        console.log('All additional pages fetched, count:', additionalPages.length)
        
        // Helper function to get unique ID from an item
        const getItemId = (item) => {
          return item.id || item.pageName || (item.attributes && item.attributes.pageName) || null
        }
        
        // Track unique IDs we've already seen (to handle API that ignores limit and returns duplicates)
        const seenIds = new Set()
        if (Array.isArray(dataArray)) {
          dataArray.forEach(item => {
            const id = getItemId(item)
            if (id) seenIds.add(id)
          })
        }
        
        // Track IDs from each page for comparison
        const pageIdsMap = {}
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          pageIdsMap[1] = dataArray.map(item => getItemId(item)).filter(id => id !== null)
        }
        
        // Combine all data with deduplication
        additionalPages.forEach((pageData, index) => {
          const actualPageNumber = currentPage + 1 + index
          console.log('Processing additional page', index + 1, 'of', additionalPages.length, '(page', actualPageNumber, 'from API)')
          const pageArrayLength = this.getDataArrayLength(pageData, repeater)
          
          // Skip if no items
          if (pageArrayLength === 0) return
          
          const pageArray = this.getDataArray(pageData, repeater)
          
          // Deduplicate: only add items we haven't seen before
          const uniqueItems = pageArray.filter(item => {
              const id = getItemId(item)
              if (!id) return true // Include items without IDs (shouldn't happen but safer)
              if (seenIds.has(id)) {
                return false
              }
              seenIds.add(id)
              return true
            })
            
            if (uniqueItems.length < pageArray.length) {
              console.log('Deduplicated page', actualPageNumber, '- removed', pageArray.length - uniqueItems.length, 'duplicates')
            }
            
            if (uniqueItems && uniqueItems.length) {
              const beforeLength = this.getDataArrayLength(initialData, repeater)
              dataArray = dataArray.concat(uniqueItems)
              console.log('Combined page', actualPageNumber, '- before:', beforeLength, 'after:', dataArray.length, '(added', uniqueItems.length, 'unique items)')
            } else {
              console.log('Page', actualPageNumber, '- all items were duplicates, nothing added')
            }
        })
        
        // Update the data with combined results
        initialData = this.updateDataArray(initialData, repeater, dataArray)
        
        const totalItems = this.getDataArrayLength(initialData, repeater)
        console.log(`Updated data with ${totalItems} items`)
        console.log(`✅ Fetched all ${totalPages} pages, total items: ${totalItems}`)
        
        const response = this.extractData(initialData, fileName, fileParams)
        return resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  }

  fetchPage (fileName, fileParams, pageNumber, paginationFormat) {
    return new Promise((resolve, reject) => {
      const request = this.prepareRequest(fileParams)
      const pageLimit = this.getPaginationLimit(fileParams.dataSource.pagination)
      // Add page parameter to the request based on format
      const separator = this.getQuerySeparator(request.path)
      if (paginationFormat === 'jsonapi') {
        // JSON:API uses page[offset] and page[limit]
        // Remove existing page[limit] if present (prepareRequest may have added it)
        request.path = request.path.replace(/[&?]page\[limit\]=\d+/g, '')
        const offset = (pageNumber - 1) * pageLimit
        request.path += `${separator}page[offset]=${offset}&page[limit]=${pageLimit}`
      } else {
        // Standard format uses page parameter
        request.path += `${separator}page=${pageNumber}`
      }
      
      console.log('Requesting page', pageNumber)
      
      const requestMethod = this.getHttpModule(request.port)
      requestMethod.get(request, res => {
        this.getDataForPage(res, fileName, fileParams).then(data => {
          return resolve(data)
        }).catch(error => {
          reject(error)
        })
      }).on('error', error => {
        reject(error)
      })
    })
  }

  // Call the API per markdown file and get data for each one returned.
  callAPI (fileName, fileParams) {
    return new Promise((resolve, reject) => {
      const request = this.prepareRequest(fileParams)
      
      const requestMethod = this.getHttpModule(request.port)
      requestMethod.get(request, res => {
        this.getDataForPage(res, fileName, fileParams).then(initialData => {
          // Handle pagination first (before deleting file, as extractData needs it)
          return this.fetchAllPages(fileName, fileParams, initialData)
        }).then(fileData => {
          // Remove the markdown file from metalsmith as its not an actual page (after extraction is complete)
          delete this.params.files[fileName]
          if (fileData.response) {
            return resolve(fileData.response)
          }
          return reject(new Error('No response found'))
        }).catch(error => {
          reject(error)
        })
      }).on('error', error => {
        reject(error)
      })
    })
  }

  makeExtraAPICalls (data, fileParams, callBack) {
    // Now check for additional requests per page returned from API call
    // This can be prodlib data based on an SEO object
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
          const requestMethod = this.getHttpModule(request.port)
          return requestMethod.get(request, res => {
            this.getDataForPage(res, currentFile.key, fileParams).then(initialData => {
              // Handle pagination for extra API calls
              return this.fetchAllPages(currentFile.key, fileParams, initialData)
            }).then(newFiles => {
              this.params.files[currentFile.key][opt] = newFiles.data
              resolve()
            }).catch(reject)
          })
        })
      })
      Promise.all(extraPageData).then(callBack).catch(callBack)
      return opt
    })
  }

  prepareRequest (fileParams) {
    const { opts } = this.params
    const { dataSource = {} } = fileParams
    const { pagination = {} } = dataSource
    
    const request = {
      timeout: 10000,
      host: dataSource.host,
      port: dataSource.port || '443',
      headers: {
        accept: '*/*'
      }
    }
    request.path = dataSource.query.replace(/\s+/gm, '')
    
    if (opts.token && opts.token.name && opts.token.value) {
      const separator = this.getQuerySeparator(request.path)
      request.path += separator + opts.token.name + '=' + opts.token.value
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
