# Phylax browser extension

Shows Phylax supply chain verdicts on npm, PyPI and GitHub pages, so you see what
an artifact looks like before you install it.

## What it does

On a package or repository page the extension asks the Phylax API for a verdict
and puts a small badge on the page. The badge reports the verdict and a count of
findings by severity. The popup shows the same result for the current tab.

Supported pages:

| Site | Page | Reference sent |
| --- | --- | --- |
| npmjs.com | `/package/name`, `/package/name/v/1.2.3` | `pkg:npm/name@1.2.3` |
| pypi.org | `/project/name`, `/project/name/1.2.3` | `pkg:pypi/name@1.2.3` |
| github.com | `/owner/repo` | the repository URL |

## Install for development

```bash
npm install
npm run build
```

Then load `dist/` through `chrome://extensions` with developer mode on.

`npm run package` produces `phylax-chrome-<version>.zip` for the Chrome Web Store.

## Configuration

Open the extension options and paste a Phylax API key. The key is held in
`chrome.storage.local` and is read only by the background service worker, which
is the only component that talks to the API. Content scripts never see it.

Verification requires a paid plan. Without one the API answers with a payment or
permission error and the badge says the call is not on your plan rather than
showing a verdict.

The API base URL can be pointed at another host for self hosted deployments. It
must be https.

## Layout

```
public/manifest.json      extension manifest
scripts/                  build and packaging
src/background/           service worker, request cache
src/content/              page badge and its styles
src/core/                 API client, storage, reference parsing, verdicts
src/options/              settings page
src/popup/                toolbar popup
test/unit/                unit tests
```

## Notes

The extension carries its own small API client rather than depending on
`@phyi/sdk`, because the SDK entry point pulls in `node:crypto` for webhook
signature checks, which does not belong in a browser bundle.
