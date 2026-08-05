import fs from 'fs'
import { Shescape } from 'shescape'

const shescape = new Shescape({ shell: 'bash' })

// Prismic content editors control this value - it must be a genuine https URL,
// not just shell-safe, so a redirect can't be pointed at an arbitrary scheme.
const isSafeRedirectUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const writeRedirect = (documentData) => {
  // Prismic custom field with redirect value
  const redirectValue = documentData?.redirect?.json?.value
  // Prismic custom field for slug or UID which every document has by default
  const pageUrl = documentData?.slug?.json?.value || documentData.uid
  if (!redirectValue || !pageUrl) return

  if (!isSafeRedirectUrl(redirectValue)) {
    console.log(`Skipping redirect for ${pageUrl}: redirect value "${redirectValue}" is not a valid https URL`)
    return
  }

  try {
    // $BUCKET must stay unescaped so bash still expands it at deploy time - only
    // the Prismic-controlled segments are quoted/escaped, then concatenated
    // alongside the literal parts (adjacent shell quotes concatenate with no gap).
    const safePageUrl = shescape.quote(pageUrl)
    const safeRedirectValue = shescape.quote(redirectValue)
    const redirectCommand = `
aws s3 cp "s3://$BUCKET/"${safePageUrl}".html" "s3://$BUCKET/"${safePageUrl}".html" --website-redirect ${safeRedirectValue}
aws s3 cp "s3://$BUCKET/"${safePageUrl} "s3://$BUCKET/"${safePageUrl} --website-redirect ${safeRedirectValue}`
    if (!fs.existsSync('./bin')) fs.mkdirSync('./bin')
    fs.appendFileSync('./bin/redirects.sh', redirectCommand, { mode: 0o755 })
    console.log(`Added redirect for ${pageUrl} to ${redirectValue}`)
  } catch (err) {
    console.log(`Writing redirect to bash file for ${pageUrl} has failed.`, err)
  }
}

export default writeRedirect
