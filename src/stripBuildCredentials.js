// Credentials used to fetch page data at build time. They must not reach page props,
// because props are rendered server-side and serialized into browser JavaScript.
const credentialFields = ['token', 'accessToken']

const credentialValue = value => {
  if (typeof value === 'string') return value
  if (value && typeof value.value === 'string') return value.value
  return null
}

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value)

// Return a copy without credential fields so shared objects (e.g. hxseo opts.token) are left intact
const withoutCredentials = (source, label, credentials) => {
  if (!isPlainObject(source)) return source
  const copy = Object.assign({ }, source)
  credentialFields.forEach(field => {
    if (!(field in copy)) return
    const value = credentialValue(copy[field])
    if (value && !credentials.has(value)) credentials.set(value, `${label}.${field}`)
    delete copy[field]
  })
  return copy
}

const stripDataSource = (dataSource, label, credentials) => {
  const stripped = withoutCredentials(dataSource, label, credentials)
  if (isPlainObject(stripped) && isPlainObject(stripped.url)) {
    stripped.url = withoutCredentials(stripped.url, `${label}.url`, credentials)
  }
  return stripped
}

// Records every removed value in `credentials` (value -> source field) for the build output check
const stripBuildCredentials = (opts = { }, credentials = new Map()) => {
  stripDataSource(opts.dataSource, 'options.dataSource', credentials)

  return (files, metalsmith, done) => {
    Object.keys(files).forEach(fileName => {
      const file = files[fileName]
      if (!file || !isPlainObject(file.dataSource)) return
      file.dataSource = stripDataSource(file.dataSource, 'dataSource', credentials)
    })
    done()
  }
}

export default stripBuildCredentials
export { stripBuildCredentials }
