// Genera los íconos PNG de MEXT Forge sin dependencias (Node + zlib).
// Uso: node make-icons.js   → icon-192.png, icon-512.png, icon-maskable-512.png
const fs = require("fs"), zlib = require("zlib"), path = require("path");

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function png(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Escena en coordenadas 0..1. Devuelve [r,g,b,a] para un punto.
function scene(x, y, maskable) {
  const r = maskable ? 0 : 0.2;                       // esquinas redondeadas (no en maskable)
  const inside = (() => {
    if (maskable) return true;
    const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  })();
  if (!inside) return [0, 0, 0, 0];
  // fondo: degradado rosado → ciruela (como el botón principal)
  let col = mix(hex("#f2669a"), hex("#8e1f5a"), (x + y) / 2);
  // olas seigaiha sutiles en la parte baja
  const s = maskable ? 0.8 : 1, ox = (x - 0.5) / s + 0.5, oy = (y - 0.5) / s + 0.5;
  if (oy > 0.78) {
    const W = 0.125, row = Math.floor((oy - 0.78) / (W / 2)), off = row % 2 ? W / 2 : 0;
    const cx = Math.round((ox - off) / W) * W + off, cy = 0.78 + (row + 1) * (W / 2);
    const d = Math.hypot(ox - cx, oy - cy);
    if ([0.055, 0.035, 0.015].some(rr => Math.abs(d - rr) < 0.0045)) col = mix(col, [255, 255, 255], 0.28);
  }
  // sol dorado arriba a la derecha
  if (Math.hypot(ox - 0.74, oy - 0.27) < 0.105) col = hex("#ffd166");
  // letra «E» blanca (sello)
  const E = [[0.27, 0.24, 0.39, 0.74], [0.27, 0.24, 0.60, 0.35], [0.27, 0.44, 0.55, 0.54], [0.27, 0.63, 0.62, 0.74]];
  if (E.some(([x0, y0, x1, y1]) => ox >= x0 && ox <= x1 && oy >= y0 && oy <= y1)) col = [255, 255, 255];
  return [...col, 255];
}
function render(size, maskable) {
  const SS = 4, buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = scene((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, maskable);
      acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
    }
    const i = (py * size + px) * 4, a = acc[3];
    buf[i] = a ? acc[0] / a : 0; buf[i + 1] = a ? acc[1] / a : 0; buf[i + 2] = a ? acc[2] / a : 0; buf[i + 3] = a / (SS * SS);
  }
  return png(size, size, buf);
}
const out = __dirname;
fs.writeFileSync(path.join(out, "icon-192.png"), render(192, false));
fs.writeFileSync(path.join(out, "icon-512.png"), render(512, false));
fs.writeFileSync(path.join(out, "icon-maskable-512.png"), render(512, true));
console.log("íconos listos");
