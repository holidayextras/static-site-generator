import fs from 'fs'
import path from 'path'

// Shorter values are too likely to match ordinary output
const MIN_CREDENTIAL_LENGTH = 8
const scannedExtensions = ['.js', '.map']

const emittedFiles = compilation => {
  const outputPath = compilation.outputOptions.path
  return Object.keys(compilation.assets).map(asset => path.join(outputPath, asset))
}

// Returns an Error naming the leaking files and credential sources (never the values), or null
const assertNoCredentials = (files = [], credentials = new Map()) => {
  const checks = [...credentials].filter(([value]) => typeof value === 'string' && value.length >= MIN_CREDENTIAL_LENGTH)
  if (!checks.length) return null

  const leaks = []
  files
    .filter(file => scannedExtensions.includes(path.extname(file)) && fs.existsSync(file))
    .forEach(file => {
      const contents = fs.readFileSync(file, 'utf8')
      checks
        .filter(([value]) => contents.includes(value))
        .forEach(([, source]) => leaks.push(`${file} (${source})`))
    })

  if (!leaks.length) return null
  return new Error(`Build credential found in browser output: ${leaks.join(', ')}`)
}

export default assertNoCredentials
export { assertNoCredentials, emittedFiles }
