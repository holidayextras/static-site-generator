const findreplace = {
  'haven-t': 'havent',
  'isn-t': 'isnt',
  'can-t': 'cant'
}
const regExp = new RegExp('(' + Object.keys(findreplace).map(word => {
  return word.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}).join('|') + ')', 'g')
const regExpReplace = s => findreplace[s]

// Strips path-traversal segments (`..`, `.`, empty segments from leading/trailing/
// doubled slashes) and normalises backslashes/null bytes, since this value is used
// directly as a file output path.
const stripPathTraversal = str => str
  .replace(/\0/g, '')
  .replace(/\\/g, '/')
  .split('/')
  .filter(segment => segment !== '' && segment !== '.' && segment !== '..')
  .join('/')

const pageNameSanitiser = str => stripPathTraversal(str.replace(regExp, regExpReplace))

export default pageNameSanitiser
