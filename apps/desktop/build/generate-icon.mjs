import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const iconsetDir = join(here, "icon.iconset");
const icnsPath = join(here, "icon.icns");

const iconFiles = [
  ["icon_16x16.png", 16],
  ["icon_16x16@2x.png", 32],
  ["icon_32x32.png", 32],
  ["icon_32x32@2x.png", 64],
  ["icon_128x128.png", 128],
  ["icon_128x128@2x.png", 256],
  ["icon_256x256.png", 256],
  ["icon_256x256@2x.png", 512],
  ["icon_512x512.png", 512],
  ["icon_512x512@2x.png", 1024],
];

const icnsEntries = [
  ["icp4", "icon_16x16.png"],
  ["icp5", "icon_32x32.png"],
  ["icp6", "icon_32x32@2x.png"],
  ["ic07", "icon_128x128.png"],
  ["ic08", "icon_256x256.png"],
  ["ic09", "icon_512x512.png"],
  ["ic10", "icon_512x512@2x.png"],
];

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND"),
  ]);
}

function icnsChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
}

function writeIcns() {
  const chunks = icnsEntries.map(([type, filename]) =>
    icnsChunk(type, readFileSync(join(iconsetDir, filename))),
  );
  const length = 8 + chunks.reduce((total, item) => total + item.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(length, 4);
  writeFileSync(icnsPath, Buffer.concat([header, ...chunks]));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function roundedRectAlpha(x, y, size, radius) {
  const px = Math.abs(x - 0.5) - 0.5 + radius;
  const py = Math.abs(y - 0.5) - 0.5 + radius;
  const outsideX = Math.max(px, 0);
  const outsideY = Math.max(py, 0);
  const distance = Math.hypot(outsideX, outsideY) + Math.min(Math.max(px, py), 0) - radius;
  return Math.max(0, Math.min(1, 0.5 - distance * size));
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared),
  );
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function strokeAlpha(distance, width, size) {
  return Math.max(0, Math.min(1, (width / 2 - distance) * size + 0.5));
}

function composite(base, color, alpha) {
  const nextAlpha = alpha + base[3] * (1 - alpha);
  if (nextAlpha <= 0) {
    return [0, 0, 0, 0];
  }
  return [
    (color[0] * alpha + base[0] * base[3] * (1 - alpha)) / nextAlpha,
    (color[1] * alpha + base[1] * base[3] * (1 - alpha)) / nextAlpha,
    (color[2] * alpha + base[2] * base[3] * (1 - alpha)) / nextAlpha,
    nextAlpha,
  ];
}

function markGradient(y) {
  return [
    mix(246, 139, y),
    mix(217, 199, y),
    mix(143, 163, y),
  ];
}

function render(size) {
  const data = Buffer.alloc(size * size * 4);
  const radius = 0.222;
  const mWidth = 0.071;
  const iWidth = 0.053;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const rectAlpha = roundedRectAlpha(nx, ny, size, radius);
      const tone = 0.55 * nx + 0.45 * ny;
      let pixel = [
        mix(40, 11, tone),
        mix(33, 23, tone),
        mix(25, 19, tone),
        rectAlpha,
      ];

      const mDistance = Math.min(
        segmentDistance(nx, ny, 0.246, 0.686, 0.246, 0.33),
        segmentDistance(nx, ny, 0.246, 0.33, 0.42, 0.578),
        segmentDistance(nx, ny, 0.42, 0.578, 0.594, 0.33),
        segmentDistance(nx, ny, 0.594, 0.33, 0.594, 0.686),
      );
      const mAlpha = strokeAlpha(mDistance, mWidth, size) * rectAlpha;
      pixel = composite(pixel, markGradient(ny), mAlpha);

      const iDistance = segmentDistance(nx, ny, 0.725, 0.296, 0.725, 0.686);
      const iAlpha = strokeAlpha(iDistance, iWidth, size) * rectAlpha;
      pixel = composite(pixel, [242, 237, 225], iAlpha * 0.95);

      const dotDistance = Math.hypot(nx - 0.725, ny - 0.232);
      const dotAlpha = strokeAlpha(dotDistance, 0.065, size) * rectAlpha;
      pixel = composite(pixel, [242, 237, 225], dotAlpha);

      const offset = (y * size + x) * 4;
      data[offset] = Math.round(pixel[0]);
      data[offset + 1] = Math.round(pixel[1]);
      data[offset + 2] = Math.round(pixel[2]);
      data[offset + 3] = Math.round(pixel[3] * 255);
    }
  }

  return png(size, size, data);
}

rmSync(iconsetDir, { recursive: true, force: true });
mkdirSync(iconsetDir, { recursive: true });

for (const [filename, size] of iconFiles) {
  writeFileSync(join(iconsetDir, filename), render(size));
}

writeIcns();
