# Static Site Generator

This is using Metalsmith and React to create a static site given params.

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
To add a store to the SSG build when using `React` as a template, you can either pass in a store to the `src/*.md` files or you can pass in a global store into the main SSG setup.
```
SSG({
  src: path.join( __dirname, '..' ),
  clean: clean,
  config: config,
  showReactIDs: true,
  dataSource: {
    type: 'api',
    token: token,
    initSetup: initSetup,
    state: '../stores/mainStore.js'
  },
  layoutDir: '_layouts',
  templateDir: '_layouts/_templates',
  destination: '_site',
  assets: 'public',
  webpack: 'webpack.config.js'
})
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

## Pagination Support

**Pagination is now enabled by default** to handle API endpoints that limit the number of entities returned per request (like the hapi `/seo` routes).

### Basic Usage

Pagination works automatically with default settings. Your existing markdown files will work as-is:

```
---
template: mainTemplate.jsx
baseFile: baseTemplate.jsx
permalink: false
dataSource:
  host: 'api.example.com'
  port: '443'
  query: '/seo/pages?site=example'
  repeater: 'data'
  pageDataField: 'attributes'
  pageNameField: 'pageName'
```

The SSG will automatically fetch all pages using offset-based pagination with a limit of 100 items per request.

### Customizing Pagination

You can customize pagination behavior by adding a `pagination` object to your `dataSource`:

```
dataSource:
  host: 'api.example.com'
  query: '/seo/pages?site=example'
  repeater: 'data'
  pageNameField: 'pageName'
  pagination:
    limit: 50
    type: 'offset'
```

### Pagination Configuration Options

- `enabled` (boolean, default: `true`): Set to `false` to disable pagination (not recommended)
- `limit` (number, default: 100): Number of items to fetch per request

### How Pagination Works

Pagination uses offset-based requests:

```
pagination:
  limit: 100
```

Generates requests like: `?page[offset]=0&page[limit]=100`, `?page[offset]=100&page[limit]=100`, etc.

### How It Works

1. The SSG makes an initial request to fetch the first page of data
2. It checks if more pages are available by comparing the number of items returned to the limit
3. If a full page is returned, it automatically fetches the next page
4. This continues until all data is retrieved (or fewer items than the limit are returned)
5. All pages are merged together before processing

### Query Parameters

The SSG automatically adds offset-based pagination parameters to your API requests:

`?page[offset]=0&page[limit]=100`, `?page[offset]=100&page[limit]=100`, etc.

These parameter names (`offset` and `limit`) are fixed and match hapi's standard. If your API uses different parameter names in the future, we can add that flexibility.

### Testing Pagination

To test pagination with a small page size, set the `SSG_PAGINATION_LIMIT` environment variable in an SSG repo:

This will force the SSG to fetch only 10 items per request, making it easier to verify that pagination is working correctly across multiple pages. You'll see console output showing the progress:

```
Fetching next page for api.md... (10 items so far)
Fetching next page for api.md... (20 items so far)
Fetching next page for api.md... (30 items so far)
Finished fetching all pages for api.md. Total items: 35
```

### Disabling Pagination

If you need to disable pagination for a specific endpoint (not recommended):

```
dataSource:
  host: 'api.example.com'
  query: '/seo/pages'
  repeater: 'data'
  pageNameField: 'pageName'
  pagination:
    enabled: false
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
