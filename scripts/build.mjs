import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')

const ENTRIES = [
  ['src/background/service-worker.ts', 'background/service-worker.js'],
  ['src/content/annotate.ts', 'content/annotate.js'],
  ['src/options/options.ts', 'options/options.js'],
  ['src/popup/popup.ts', 'popup/popup.js'],
]

const ASSETS = [
  ['public/manifest.json', 'manifest.json'],
  ['public/icons', 'icons'],
  ['src/content/overlay.css', 'content/overlay.css'],
  ['src/options/options.html', 'options/options.html'],
  ['src/options/options.css', 'options/options.css'],
  ['src/popup/popup.html', 'popup/popup.html'],
  ['src/popup/popup.css', 'popup/popup.css'],
]

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

for (const [entry, out] of ENTRIES) {
  await build({
    entryPoints: [join(root, entry)],
    outfile: join(dist, out),
    bundle: true,
    format: 'esm',
    target: 'chrome116',
    platform: 'browser',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
  })
}

for (const [from, to] of ASSETS) {
  const target = join(dist, to)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(join(root, from), target, { recursive: true })
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const manifestPath = join(dist, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.version !== pkg.version) {
  manifest.version = pkg.version
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

console.log(`built ${ENTRIES.length} bundles and ${ASSETS.length} assets into dist`)
