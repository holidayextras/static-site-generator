/* global fetch, AbortController */

/**
 * Paginated fetch all data using links.next in response
 *
 * @param {string} hapiUrl - The API endpoint URL (can include query parameters)
 * @param {string} repeater - The repeater to fetch data from (default: 'data')
 * @param {number} timeout - Per-request timeout in ms (default: 10000)
 * @param {boolean} allowNonPaginatedResponse - Preserve plain-object extra feeds
 * @returns {Promise<Array|Object|null>} - Paginated results, an extra-feed object, or null
 */
async function fetchData (hapiUrl, repeater, timeout, allowNonPaginatedResponse = false) {
  const allResults = []
  let currentUrl = hapiUrl

  while (currentUrl) {
    // Create a new AbortController for each request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(currentUrl, {
        headers: { accept: 'application/json' },
        signal: controller.signal
      })

      // Clear timeout since request completed
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()

      if (!responseData) {
        throw new Error('Empty response from API')
      }

      if (responseData.message) {
        throw new Error(responseData.message)
      }

      // Extra feeds such as lastUpdated return an object without pagination metadata.
      if (allowNonPaginatedResponse && allResults.length === 0 && !responseData.meta?.page) {
        return responseData
      }

      // Expect data in response and next page in 'links.next'
      const pageData = responseData[repeater]

      if (Array.isArray(pageData)) {
        if (pageData.length === 0) {
          throw new Error('No data found in response')
        }

        for (const item of pageData) {
          allResults.push(item)
        }
      }

      // Calculate pagination request numbers from offset, limit, and total
      const pageMeta = responseData.meta.page
      const currentRequest = Math.floor(pageMeta.offset / pageMeta.limit) + 1
      const totalRequests = Math.ceil(pageMeta.total / pageMeta.limit)
      console.log(`[Pagination] Fetched ${(currentRequest / totalRequests * 100).toFixed(0)}% from ${currentUrl}`)

      // Get the next page URL
      currentUrl = responseData.links?.next
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw error
    }
  }

  return allResults.length > 0 ? allResults : null
}

function fetchWithPagination (hapiUrl, repeater = 'data', timeout = 10000) {
  return fetchData(hapiUrl, repeater, timeout)
}

async function fetchExtraData (url, repeater = 'data', timeout = 10000) {
  const data = await fetchData(url, repeater, timeout, true)
  return Array.isArray(data) ? { data } : data
}

export default fetchWithPagination
export { fetchExtraData }
