const findreplace = {
  'haven-t': 'havent',
  'isn-t': 'isnt',
  'can-t': 'cant'
}
const regExp = new RegExp('(' + Object.keys(findreplace).map(word => {
  return word.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}).join('|') + ')', 'g')
const regExpReplace = s => findreplace[s]

const pageNameSanitiser = str => str.replace(regExp, regExpReplace)

export default pageNameSanitiser
