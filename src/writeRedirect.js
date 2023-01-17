import fs from 'fs'
import _ from 'lodash'

const writeRedirect = (documentData) => {
  // Prismic custom field with redirect value
  const redirectValue = documentData?.redirect?.json?.value
  // Prismic custom field for slug or UID which every document has by default
  const pageUrl = documentData?.slug?.json?.value || documentData.uid
  if (!redirectValue || !pageUrl || !redirectValue.includes('https://')) return

  try {
    const redirectCommand = `
aws s3 cp s3://$BUCKET/${pageUrl}.html s3://$BUCKET/${pageUrl}.html --website-redirect ${redirectValue}
aws s3 cp s3://$BUCKET/${pageUrl} s3://$BUCKET/${pageUrl} --website-redirect ${redirectValue}`
    if (!fs.existsSync('./bin')) fs.mkdirSync('./bin')
    fs.appendFileSync('./bin/redirects.sh', redirectCommand, { mode: 0o755 })
    console.log(`Added redirect for ${pageUrl} to ${redirectValue}`)
  } catch (err) {
    console.log(`Writing redirect to bash file for ${pageUrl} has failed.`, err)
  }
}

export default writeRedirect
