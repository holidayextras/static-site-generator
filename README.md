# Static Site Generator

This is using metalsmith and react to create a static site given params.

```
git clone git@github.com:holidayextras/static-site-generator.git
cd static-site-generator
npm i
npm run build
```

- `src` src param provided for the .md file directory
- `dataSource` the source to pull the content from as a function (or object as described below)
- `dataSource.type` This can currently be either hxseo or prismic
- `dataSource.url` This is the endpoint url for hxseo or prismic api
- `dataSource.token` This is the token to pass in if the endpoint is private
- `templateDir` templateDir param provided for the template directory
- `layoutDir` layoutDir param provided for the layouts directory
- `destination` destination param provided for the output directory
- `assets` assets param provided for the assets directory

*Optional*
You can pass in a `config` param too setup an object used in pages (domain, default agents etc)
`webpack` is optional if you want to create a common js for the site and page specific js files for isomorphic pages. (This will be a link to the webpack.config.js file)

## Publishing
This repoistory is available on npm [here](https://www.npmjs.com/package/@holidayextras/static-site-generator), if you wish to release a new version simply bump the package.json version number and the build process will take care of the rest.

## Redux
To add a store to the SSG build when using a React as a template, you can either pass in a store to the `src/*.md` files or you can pass in a global store into the main SSG setup.
```
SSG.default({
  src: path.join( __dirname, '..' ),
  clean: clean,
  config: config,
  dataSource: {
    type: 'hxseo',
    url: {
      host: 'hapi.holidayextras.co.uk',
      port: '80',
      token: token,
      store: '../stores/mainState.js'
    }
  },
  layoutDir: '_layouts',
  templateDir: '_layouts/_templates',
  destination: '_site',
  assets: 'public',
  webpack: 'webpack.config.js'
});
```
*or*
```
---
template: mainTemplate.jsx
baseFile: baseTemplate.jsx
permalink: false
store: '../stores/mainStore.js'
dataSource:
  host: 'api1.example.com'
  port: '80'
  type: 'api1'
  query: '/getPagesFromHere?pages=test/'
  repeater: 'data'
  pageDataField: 'attributes'
  pageNameField: 'pageName'
```

## Building multiple endpoints
You can now build multiple API endpoints within a single app / template group, please see this example on how you can do this.

*app/index.js*
```
import config from '../config/'
import initSetup from '../config/initSetup'
const token = '0123456789'

SSG({
  src: path.join( __dirname, '..' ),
  clean: clean,
  config: config,
  showReactIDs: true,
  dataSource: {
    type: 'api',
    token: token,
    initSetup: initSetup
  },
  layoutDir: '_layouts',
  templateDir: '_layouts/_templates',
  destination: '_site',
  assets: 'public',
  webpack: 'webpack.config.js'
})
```

*config/initSetup.js*
```
const token = process.env.HAPI_TOKEN || '9876543210'

const initSetup = params => {
  if ( !params.dataSource.type === 'api1' ) return params
  params.dataSource.query += '&token=' + token
  return params
}

export initSetup
```

*src/api1.md*
```
---
template: mainTemplate.jsx
baseFile: baseTemplate.jsx
permalink: false
dataSource:
  host: 'api1.example.com'
  port: '80'
  type: 'api1'
  query: '/getPagesFromHere?pages=test/'
  repeater: 'data'
  pageDataField: 'attributes'
  pageNameField: 'pageName'
```

*src/api2.md*
```
---
template: mainTemplate.jsx
baseFile: baseTemplate.jsx
permalink: false
dataSource:
  host: 'api2.example.com'
  query: '/getPagesFromThere?thePages=anotherTest/'
  repeater: 'articles'
  pageNameField: 'html_url'
  postPageNameChange: 'strip'
```

