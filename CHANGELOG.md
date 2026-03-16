# static-site-generator Changelog

## v9.7.0
Add `publishConfig.registry` for GitHub Packages (@holidayextras). Bump minor for publish.

## v9.6.5
Update all packages to the latest available

## v9.6.4
PageData: when `singlePage` is set, only run the API once per distinct (reduced) query so 2+ md files with the same query don’t overwrite each other and cause "No outputFiles for webpack". When a file’s API call returns no response, remove that md file from the pipeline before throwing so an orphan md file doesn’t reach webpack.

## v9.6.3
When `singlePage` is set, filter the API request so only that page is requested (hxseo and api dataSource).
