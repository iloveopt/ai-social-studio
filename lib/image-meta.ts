// 从图像 buffer 头部解析宽高，无外部依赖
// 支持 PNG / JPEG / WEBP / GIF；解析失败返回 null
// 不读完整像素数据，只看文件 header，几十字节就够

export interface ImageDimensions {
  width: number
  height: number
}

export function parseImageDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24) return null

  // PNG: 8字节签名 \x89PNG\r\n\x1a\n + IHDR chunk(width 16-19, height 20-23, big-endian)
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }

  // GIF: GIF87a / GIF89a，width/height 在 6-9 (little-endian)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  }

  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return parseWebp(buf)
  }

  // JPEG: \xff\xd8 开头，扫 SOFn marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return parseJpeg(buf)
  }

  return null
}

function parseWebp(buf: Buffer): ImageDimensions | null {
  // VP8 / VP8L / VP8X 三种子格式
  const fourcc = buf.toString('ascii', 12, 16)
  if (fourcc === 'VP8 ') {
    // lossy: width/height 在 frame tag 之后 26-29
    if (buf.length < 30) return null
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    }
  }
  if (fourcc === 'VP8L') {
    if (buf.length < 25) return null
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    }
  }
  if (fourcc === 'VP8X') {
    if (buf.length < 30) return null
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    }
  }
  return null
}

function parseJpeg(buf: Buffer): ImageDimensions | null {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null
    // 跳过填充 0xff
    while (buf[i] === 0xff && i < buf.length) i++
    const marker = buf[i]
    i++
    // SOI/EOI/RSTn 没有长度字段
    if (marker === 0xd8 || marker === 0xd9) continue
    if (marker >= 0xd0 && marker <= 0xd7) continue
    if (i + 2 > buf.length) return null
    const segLen = buf.readUInt16BE(i)
    // SOFn (除了 DHT=0xc4, DAC=0xcc, JPG=0xc8)
    const isSof =
      (marker >= 0xc0 && marker <= 0xcf) &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      if (i + 7 > buf.length) return null
      return {
        height: buf.readUInt16BE(i + 3),
        width: buf.readUInt16BE(i + 5),
      }
    }
    i += segLen
  }
  return null
}
