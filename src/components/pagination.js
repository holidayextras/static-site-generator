async function fetchHapiPaginated(url, timeout = 10000) {
  const newUrl = new URL(url)
  const originalLimit = parseInt(newUrl.searchParams.get('page[limit]'), 10) || 1000 // default to 1000 as thats current HAPI limit...
  newUrl.searchParams.set('page[limit]', 1000) // bit of tech debt to force a limit of 1000 as hapi bug expects 1000
  
  return await fetchWithPagination(newUrl.toString(), originalLimit, timeout)
}

/**
 * Pagination utility that fetches all data from a cursor-based API endpoint using links.next.
 *
 * @param {string} baseUrl - The API endpoint URL (can include query parameters)
 * @param {number} pageLimit - Maximum number of items to fetch
 * @param {number} timeout - Request timeout in ms (default: 10000)
 * @returns {Promise<Array>} - Flattened array of all paginated results
 */
async function fetchWithPagination(hapiUrl, pageLimit, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let allResults = []
  let currentUrl = hapiUrl

  try {
    while (currentUrl && allResults.length < pageLimit) {
      const response = await fetch(currentUrl, {
        headers: { accept: 'application/json' },
        signal: controller.signal
      })

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

      // Always expect 'data' in response and next page in 'links.next'
      const pageData = responseData.data

      if (Array.isArray(pageData) && pageData.length > 0) {
        for (const item of pageData) {
          if (allResults.length >= pageLimit) break
          allResults.push(item)
        }
      }

      // Get the next page URL
      currentUrl = responseData.links?.next
    }

    return allResults.length > 0 ? allResults : null
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}



export { fetchHapiPaginated }