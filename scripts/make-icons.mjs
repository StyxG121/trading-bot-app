import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([len, name, data, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const spark = [
  [0.18, 0.72],
  [0.34, 0.58],
  [0.46, 0.64],
  [0.58, 0.4],
  [0.72, 0.32],
  [0.84, 0.18],
]

function draw(size, pad) {
  const buf = Buffer.alloc(size * size * 4)
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    const alpha = a / 255
    buf[i] = Math.round(r * alpha + buf[i] * (1 - alpha))
    buf[i + 1] = Math.round(g * alpha + buf[i + 1] * (1 - alpha))
    buf[i + 2] = Math.round(b * alpha + buf[i + 2] * (1 - alpha))
    buf[i + 3] = 255
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) set(x, y, 5, 6, 5, 255)
  }
  const inner = size * (1 - pad * 2)
  const pts = spark.map(([x, y]) => [pad * size + x * inner, pad * size + y * inner])
  const thickness = Math.max(2, size / 28)
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1))
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps
      const x = x1 + (x2 - x1) * t
      const y = y1 + (y2 - y1) * t
      const rad = thickness
      for (let oy = -rad - 1; oy <= rad + 1; oy += 1) {
        for (let ox = -rad - 1; ox <= rad + 1; ox += 1) {
          const d = Math.hypot(ox, oy)
          if (d <= rad) set(Math.round(x + ox), Math.round(y + oy), 61, 255, 122, 255)
        }
      }
    }
  }
  const [ex, ey] = pts[pts.length - 1]
  const dot = Math.max(3, size / 42)
  for (let oy = -dot - 1; oy <= dot + 1; oy += 1) {
    for (let ox = -dot - 1; ox <= dot + 1; ox += 1) {
      if (Math.hypot(ox, oy) <= dot) set(Math.round(ex + ox), Math.round(ey + oy), 61, 255, 122, 255)
    }
  }
  return png(size, size, buf)
}

writeFileSync('public/icons/icon-192.png', draw(192, 0.16))
writeFileSync('public/icons/icon-512.png', draw(512, 0.16))
writeFileSync('public/icons/icon-512-maskable.png', draw(512, 0.28))
writeFileSync('public/icons/apple-touch-icon.png', draw(180, 0.16))
console.log('icons written')
