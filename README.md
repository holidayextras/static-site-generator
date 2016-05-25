# Static Site Generator

This is using metalsmith and react to create a static site given params.

```
git clone git@github.com:holidayextras/static-site-generator.git
cd static-site-generator
npm i
npm run build
```

`src` src param provided for the .md file directory
`dataSource` the source to pull the content from as a function (or object as described below)
`dataSource.type` This can currently be either hxseo or prismic
`dataSource.url` This is the endpoint url for hxseo or prismic api
`dataSource.token` This is the token to pass in if the endpoint is private
`templateDir` templateDir param provided for the template directory
`layoutDir` layoutDir param provided for the layouts directory
`destination` destination param provided for the output directory
`assets` assets param provided for the assets directory

*Optional*
You can pass in a `config` param too setup an object used in pages (domain, default agents etc)
`webpack` is optional if you want to create a common js for the site and page specific js files for isomorphic pages. (This will be a link to the webpack.config.js file)

## Publishing
This repoistory is available on npm [here](https://www.npmjs.com/package/@holidayextras/static-site-generator), if you wish to release a new version simply bump the package.json version number and the build process will take care of the rest.

