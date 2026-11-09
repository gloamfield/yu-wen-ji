import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    raw[offset] = 0;
    rgba.copy(raw, offset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value, edge = 0.006) {
  return clamp(0.5 - value / edge);
}

function roundedRectDistance(x, y, cx, cy, halfWidth, halfHeight, radius) {
  const dx = Math.abs(x - cx) - halfWidth + radius;
  const dy = Math.abs(y - cy) - halfHeight + radius;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const length = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / length);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function blendPixel(buffer, width, x, y, color, alpha) {
  if (alpha <= 0) return;
  const index = (y * width + x) * 4;
  const a = clamp(alpha);
  const current = buffer[index + 3] / 255;
  const out = a + current * (1 - a);
  if (out <= 0) return;
  for (let channel = 0; channel < 3; channel += 1) {
    buffer[index + channel] = Math.round((color[channel] * a + buffer[index + channel] * current * (1 - a)) / out);
  }
  buffer[index + 3] = Math.round(out * 255);
}

function makeIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const points = [
    [0.44, 0.59],
    [0.47, 0.54],
    [0.50, 0.53],
    [0.53, 0.56],
    [0.56, 0.60]
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const bgDistance = roundedRectDistance(px, py, 0.5, 0.5, 0.5, 0.5, 0.23);
      const bgAlpha = smooth(bgDistance, 0.012);
      if (bgAlpha > 0) {
        const t = clamp((px + py) / 2);
        const glow = clamp(1 - Math.hypot(px - 0.3, py - 0.18) / 0.8) ** 2 * 0.28;
        const start = [247, 228, 223];
        const middle = [216, 154, 159];
        const end = [141, 97, 120];
        const first = t < 0.52 ? start : middle;
        const second = t < 0.52 ? middle : end;
        const local = t < 0.52 ? t / 0.52 : (t - 0.52) / 0.48;
        const color = first.map((value, index) => Math.round(value + (second[index] - value) * local + (255 - value) * glow));
        blendPixel(buffer, size, x, y, color, bgAlpha);
      }
      const phone = roundedRectDistance(px, py, 0.5, 0.5, 0.195, 0.32, 0.08);
      const phoneLine = Math.abs(phone) - 0.019;
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(phoneLine, 0.008) * 0.94);
      const speaker = roundedRectDistance(px, py, 0.5, 0.255, 0.073, 0.008, 0.008);
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(speaker, 0.006) * 0.86);
      let waveDistance = Infinity;
      for (let index = 0; index < points.length - 1; index += 1) {
        waveDistance = Math.min(waveDistance, segmentDistance(px, py, points[index][0], points[index][1], points[index + 1][0], points[index + 1][1]));
      }
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(waveDistance - 0.018, 0.008) * 0.96);
      const home = Math.hypot(px - 0.5, py - 0.725) - 0.017;
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(home, 0.006) * 0.9);
      const sparkleOne = Math.abs(px - 0.235) + Math.abs(py - 0.255);
      const sparkleTwo = Math.abs(px - 0.765) + Math.abs(py - 0.735);
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(sparkleOne - 0.025, 0.008) * 0.3);
      blendPixel(buffer, size, x, y, [255, 248, 241], smooth(sparkleTwo - 0.025, 0.008) * 0.3);
    }
  }
  return png(size, size, buffer);
}

for (const size of [192, 512]) {
  const output = join(root, `icon-${size}.png`);
  writeFileSync(output, makeIcon(size));
  console.log(`wrote ${output}`);
}
