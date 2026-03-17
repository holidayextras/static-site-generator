# static-site-generator Changelog

## v9.6.9
Tests run against source (`src/`) via `@babel/register` so CI does not need a prior build of `lib/`. Full SSG and single-page pipeline tests added and enabled. webpackPages uses named import `rimraf` (compatible with rimraf 6.x). React and react-dom pinned to ^16.6.0 (react-redux to ^7) to match metalsmith-react-tpl so the full pipeline tests pass.

## v9.6.8
Replace `mkdirp` with Node built-in `fs.mkdir(..., { recursive: true })` in webpackPages to fix "mkdirp.default is not a function" when consumed (mkdirp 3.x has no default export). Remove mkdirp dependency.

## v9.6.7
PageData: use Promise.allSettled so all files are processed before returning (avoids returning early on first failure and losing successful results). Delete md file when no dataSource or on API error. Add [pageData] logging for API result and each md-file removal reason.

## v9.6.6
Add `publishConfig.registry` for GitHub Packages (@holidayextras).

## v9.6.5
Update all packages to the latest available

## v9.6.4
PageData: when `singlePage` is set, only run the API once per distinct (reduced) query so 2+ md files with the same query don’t overwrite each other and cause "No outputFiles for webpack". When a file’s API call returns no response, remove that md file from the pipeline before throwing so an orphan md file doesn’t reach webpack.

## v9.6.3
When `singlePage` is set, filter the API request so only that page is requested (hxseo and api dataSource).
