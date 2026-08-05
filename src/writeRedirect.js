import fs from 'fs'

// Both fields below come from Prismic and are editable by content authors, so
// they must be strictly allowlisted before being written into a shell script.
// Only safe path characters - no shell metacharacters (;, `, $, (, ), quotes, spaces, ...).
const SAFE_PAGE_URL = /^\/?[\w-]+(?:[/.][\w-]+)*\/?$/
// Only a plain https URL - no query string, no shell metacharacters.
const SAFE_REDIRECT_URL = /^https:\/\/[\w-]+(?:\.[\w-]+)+(?::\d+)?(?:\/[\w\-./]*)?$/

const writeRedirect = (documentData) => {
  // Prismic custom field with redirect value
  const redirectValue = documentData?.redirect?.json?.value
  // Prismic custom field for slug or UID which every document has by default
  const pageUrl = documentData?.slug?.json?.value || documentData.uid
  if (!redirectValue || !pageUrl) return

  if (!SAFE_REDIRECT_URL.test(redirectValue)) {
    console.log(`Skipping redirect for ${pageUrl}: redirect value "${redirectValue}" failed validation`)
    return
  }
  if (!SAFE_PAGE_URL.test(pageUrl)) {
    console.log(`Skipping redirect for "${pageUrl}": page url failed validation`)
    return
  }

  try {
    const redirectCommand = `
aws s3 cp "s3://$BUCKET/${pageUrl}.html" "s3://$BUCKET/${pageUrl}.html" --website-redirect "${redirectValue}"
aws s3 cp "s3://$BUCKET/${pageUrl}" "s3://$BUCKET/${pageUrl}" --website-redirect "${redirectValue}"`
    if (!fs.existsSync('./bin')) fs.mkdirSync('./bin')
    fs.appendFileSync('./bin/redirects.sh', redirectCommand, { mode: 0o755 })
    console.log(`Added redirect for ${pageUrl} to ${redirectValue}`)
  } catch (err) {
    console.log(`Writing redirect to bash file for ${pageUrl} has failed.`, err)
  }
}

export default writeRedirect
