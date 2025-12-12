/* global fetch, AbortController */

/**
 * Paginated fetch all data using links.next in response
 *
 * @param {string} hapiUrl - The API endpoint URL (can include query parameters)
 * @param {number} timeout - Per-request timeout in ms (default: 10000)
 * @returns {Promise<Array|null>} - Flattened array of all paginated data, or null if no results found
 */
async function fetchWithPagination (hapiUrl, timeout = 10000) {
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

      // Always expect 'data' in response and next page in 'links.next'
      const pageData = responseData.data

      if (Array.isArray(pageData)) {
        for (const item of pageData) {
          allResults.push(item)
        }
      }

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

export { fetchWithPagination }
