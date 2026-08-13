# Phylax browser extension

[![release](https://img.shields.io/github/v/release/praxi-labs/phylax-chrome?label=release)](https://github.com/praxi-labs/phylax-chrome/releases/latest)

Shows Phylax supply chain verdicts on npm, PyPI and GitHub pages, so you see what
an artifact looks like before you install it.

## What it does

On a package or repository page the extension asks the Phylax API for a verdict
and puts a small badge on the page. The badge reports the verdict and a count of
findings by severity. The popup shows the same result for the current tab.

Supported pages:

| Site | Reference sent |
| --- | --- |
| npmjs.com | `pkg:npm/name@1.2.3` |
| pypi.org | `pkg:pypi/name@1.2.3` |
| pkg.go.dev | `pkg:golang/host/path@v1.2.3` |
| rubygems.org | `pkg:gem/name@1.2.3` |
| nuget.org | `pkg:nuget/Name@1.2.3` |
| central.sonatype.com | `pkg:maven/group/artifact@1.2.3` |
| github.com | the repository URL |

On npm, PyPI and RubyGems search results it also puts a verdict next to each hit, in one
batched request rather than one per row.

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

## The rest of Phylax

| Tool | Where to get it |
| --- | --- |
| JavaScript SDK | [`@phyi/sdk`](https://www.npmjs.com/package/@phyi/sdk) on npm |
| Python SDK | [`phylax-sdk`](https://github.com/praxi-labs/phylax-sdk-python), PyPI release pending |
| MCP server | [`@phyi/mcp`](https://www.npmjs.com/package/@phyi/mcp) on npm |
| Agent runtime gate | [`@phyi/runtime-gate`](https://www.npmjs.com/package/@phyi/runtime-gate) on npm |
| VS Code extension | [`phylax.phylax`](https://marketplace.visualstudio.com/items?itemName=phylax.phylax) on the Marketplace |
| GitHub Action | [`praxi-labs/phylax-action`](https://github.com/praxi-labs/phylax-action) |
| Browser extension | [`praxi-labs/phylax-chrome`](https://github.com/praxi-labs/phylax-chrome/releases/latest), Web Store listing pending |

Docs live at [phyi.dev](https://phyi.dev).
