# Test suite

Tests live in `simulate-request.test.js` and run with:

```bash
npm test
```

Fixtures are under `fixtures/landing-parking/` (minimal `.md`, templates, and webpack config).

---

## What each test does

### SSG full run (skipped)

- **Invokes callback with no error and a non-empty pages array**  
  Runs the full SSG pipeline (default export) with one group and no `singlePage`. Asserts the callback is called with no error and a non-empty list of page names.  
  *Skipped:* depends on React/metalsmith-react-tpl versions matching; enable when the full pipeline runs in this repo.

### SSG single-page run (skipped)

- **Builds only the matching page**  
  Sets `process.env.singlePage = 'de/page-a'`, runs the full SSG with two pages in the dataSource, and asserts the callback receives exactly one page name (`de/page-a`).  
  *Skipped:* same as above; enable when the full pipeline runs.

### singleFileOnly

Plugin that, when `singlePage` is set, keeps only the file(s) matching that page so the rest of the pipeline only builds one page.

- **Keeps only the matching file when singlePage and folderPrefix are set**  
  Passes three files and `singlePage=de/rom-flughafen-parken-test` with `folderPrefix=/de`. Asserts only `de/rom-flughafen-parken-test.html` remains.

- **Keeps only matching file without folder prefix when singlePage has no prefix**  
  Passes three files and `singlePage=rom-flughafen-parken-test` (no `de/`). Asserts both `rom-flughafen-parken-test.html` and `de/rom-flughafen-parken-test.html` remain (plugin accepts either when prefix is used).

- **Does nothing when singlePage is not set**  
  Passes two files and no `singlePage`. Asserts both files are still there (no filtering).

### webpackPages

Plugin that generates per-page JS entry files, runs webpack, cleans the temp dir, and calls the callback with the list of built page names.

- **Success: files in → callback(null, page names) out**  
  Passes one file with a template. Asserts the callback is called with `(null, pages)` and `pages` is a non-empty array (one page name).

- **Success: multiple files in → callback(null, all page names) out**  
  Passes two files with templates. Asserts the callback is called with `(null, pages)` and `pages` is exactly `['de/page-a', 'de/page-b']`.

---

## Single-page mode

When running the real SSG (e.g. from ssg-hx-de), single-page mode is driven by the **`singlePage`** environment variable. Set it to the page path (e.g. `de/rom-flughafen-parken-test`) so only that page is built:

```bash
singlePage=de/rom-flughafen-parken-test npm run start landing-parking
```

The tests clear `process.env.singlePage` in `afterEach` so they don’t leak into each other.
