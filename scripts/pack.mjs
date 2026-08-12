import { createWriteStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')

if (!existsSync(dist)) {
  console.error('dist is missing; run npm run build first')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const outPath = join(root, `phylax-chrome-${pkg.version}.zip`)

function walk(dir) {
  const found = []
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) found.push(...walk(full))
    else found.push(full)
  }
  return found
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const files = walk(dist)
const chunks = []
const central = []
let offset = 0

for (const file of files) {
  const name = relative(dist, file).split(sep).join('/')
  const raw = readFileSync(file)
  const deflated = deflateRawSync(raw)
  const useStore = deflated.length >= raw.length
  const body = useStore ? raw : deflated
  const method = useStore ? 0 : 8
  const nameBuf = Buffer.from(name, 'utf8')
  const sum = crc32(raw)

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0, 6)
  local.writeUInt16LE(method, 8)
  local.writeUInt16LE(0, 10)
  local.writeUInt16LE(0x21, 12)
  local.writeUInt32LE(sum, 14)
  local.writeUInt32LE(body.length, 18)
  local.writeUInt32LE(raw.length, 22)
  local.writeUInt16LE(nameBuf.length, 26)
  local.writeUInt16LE(0, 28)

  chunks.push(local, nameBuf, body)

  const entry = Buffer.alloc(46)
  entry.writeUInt32LE(0x02014b50, 0)
  entry.writeUInt16LE(20, 4)
  entry.writeUInt16LE(20, 6)
  entry.writeUInt16LE(0, 8)
  entry.writeUInt16LE(method, 10)
  entry.writeUInt16LE(0, 12)
  entry.writeUInt16LE(0x21, 14)
  entry.writeUInt32LE(sum, 16)
  entry.writeUInt32LE(body.length, 20)
  entry.writeUInt32LE(raw.length, 24)
  entry.writeUInt16LE(nameBuf.length, 28)
  entry.writeUInt32LE(offset, 42)
  central.push(entry, nameBuf)

  offset += local.length + nameBuf.length + body.length
}

const centralBuf = Buffer.concat(central)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(centralBuf.length, 12)
end.writeUInt32LE(offset, 16)

const stream = createWriteStream(outPath)
stream.write(Buffer.concat([...chunks, centralBuf, end]))
stream.end()

console.log(`packed ${files.length} files into ${relative(root, outPath)}`)
