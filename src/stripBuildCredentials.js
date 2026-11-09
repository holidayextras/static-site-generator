// Credentials used to fetch page data at build time. They must not reach page props,
// because props are rendered server-side and serialized into browser JavaScript.
const credentialFields = ['token', 'accessToken']

const credentialValue = value => {
  if (typeof value === 'string') return value
  if (value && typeof value.value === 'string') return value.value
  return null
}

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value)

const recordCredential = (value, source, credentials) => {
  if (value && !credentials.has(value)) credentials.set(value, source)
}

const splitRequestQuery = query => {
  const hashIndex = query.indexOf('#')
  const fragment = hashIndex < 0 ? '' : query.slice(hashIndex)
  const request = hashIndex < 0 ? query : query.slice(0, hashIndex)
  const queryIndex = request.indexOf('?')

  return {
    path: queryIndex < 0 ? '' : request.slice(0, queryIndex),
    queryString: queryIndex < 0 ? request : request.slice(queryIndex + 1),
    hasQueryPrefix: queryIndex >= 0,
    fragment
  }
}

// Only inspect build-request parameters. Preserve all other parameters verbatim.
const withoutQueryCredentials = (query, label, credentials) => {
  if (typeof query !== 'string') return query

  const { path, queryString, hasQueryPrefix, fragment } = splitRequestQuery(query)
  const parameters = queryString.split('&')
  const keptParameters = []

  for (const parameter of parameters) {
    const [name, decodedValue] = new URLSearchParams(parameter).entries().next().value || []
    if (!credentialFields.includes(name)) {
      keptParameters.push(parameter)
      continue
    }

    // The output scanner must recognise both encoded and decoded copies.
    const equalsIndex = parameter.indexOf('=')
    const encodedValue = equalsIndex < 0 ? '' : parameter.slice(equalsIndex + 1)
    recordCredential(decodedValue, `${label}.${name}`, credentials)
    recordCredential(encodedValue, `${label}.${name}`, credentials)
  }

  if (keptParameters.length === parameters.length) return query

  const remainingQuery = keptParameters.join('&')
  const separator = hasQueryPrefix && remainingQuery ? '?' : ''
  return path + separator + remainingQuery + fragment
}

// Return a copy without credential fields so shared objects (e.g. hxseo opts.token) are left intact
const withoutCredentials = (source, label, credentials) => {
  if (!isPlainObject(source)) return source
  const copy = Object.assign({ }, source)
  credentialFields.forEach(field => {
    if (!(field in copy)) return
    const value = credentialValue(copy[field])
    recordCredential(value, `${label}.${field}`, credentials)
    delete copy[field]
  })
  if (typeof copy.query === 'string') {
    copy.query = withoutQueryCredentials(copy.query, `${label}.query`, credentials)
  }
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
