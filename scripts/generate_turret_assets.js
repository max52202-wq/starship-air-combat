// ============================================================================
// scripts/generate_turret_assets.js
// Zero-dependency Node.js 8-Bit 3D Rasterizer + Turret Cockpit Pixel-Art Renderer
// Generates:
//   1. assets/turrets_8bit/icons/01_...png .. 10_...png (512x512 transparent 8-bit 3D)
//      + turrets_3d_8bit_overview.png (2x5 labeled overview)
//   2. assets/turrets_8bit/actions/01_..._actions.png .. 10_..._actions.png (1920x240, 8 frames)
//      + turrets_actions_showcase.png (10x8 labeled showcase)
//   3. assets/turrets_8bit/cockpits/01_..._cockpit.png .. 10_..._cockpit.png (640x400 8-bit)
//      + turrets_cockpits_overview.png (2x5 labeled overview)
// ============================================================================

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const TurretModels = require("../js/turret_models.js");

const ROOT = path.resolve(__dirname, "..");
const OUT_ICONS = path.join(ROOT, "assets", "turrets_8bit", "icons");
const OUT_ACTIONS = path.join(ROOT, "assets", "turrets_8bit", "actions");
const OUT_COCKPITS = path.join(ROOT, "assets", "turrets_8bit", "cockpits");

for (const dir of [OUT_ICONS, OUT_ACTIONS, OUT_COCKPITS]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ============================================================================
// Pure-JS PNG Encoder (RGBA8, built-in zlib)
// ============================================================================
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, data])), 0);
  return Buffer.concat([len, tBuf, data, crcBuf]);
}
function writePNG(filePath, w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  const png = Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

// ============================================================================
// Pixel Buffer Drawing Primitives & 5x7 Crisp 8-Bit Bitmap Font
// ============================================================================
function createSurface(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}

function hexToRgb(hex) {
  const s = hex.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function setPx(surf, x, y, r, g, b, a = 255) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= surf.w || iy < 0 || iy >= surf.h) return;
  const i = (iy * surf.w + ix) * 4;
  if (a >= 255) {
    surf.data[i] = r; surf.data[i + 1] = g; surf.data[i + 2] = b; surf.data[i + 3] = 255;
  } else if (a > 0) {
    const sa = a / 255;
    const da = surf.data[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA > 0) {
      surf.data[i] = Math.round((r * sa + surf.data[i] * da * (1 - sa)) / outA);
      surf.data[i + 1] = Math.round((g * sa + surf.data[i + 1] * da * (1 - sa)) / outA);
      surf.data[i + 2] = Math.round((b * sa + surf.data[i + 2] * da * (1 - sa)) / outA);
      surf.data[i + 3] = Math.round(outA * 255);
    }
  }
}

function fillRect(surf, x, y, rw, rh, r, g, b, a = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(surf.w, Math.floor(x + rw));
  const y1 = Math.min(surf.h, Math.floor(y + rh));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) setPx(surf, px, py, r, g, b, a);
  }
}

function strokeRect(surf, x, y, rw, rh, r, g, b, t = 1) {
  fillRect(surf, x, y, rw, t, r, g, b);
  fillRect(surf, x, y + rh - t, rw, t, r, g, b);
  fillRect(surf, x, y, t, rh, r, g, b);
  fillRect(surf, x + rw - t, y, t, rh, r, g, b);
}

function drawLine(surf, x0, y0, x1, y1, r, g, b, a = 255, thick = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const rad = Math.floor(thick / 2);
  while (true) {
    if (thick <= 1) {
      setPx(surf, x0, y0, r, g, b, a);
    } else {
      fillRect(surf, x0 - rad, y0 - rad, thick, thick, r, g, b, a);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function fillCircle(surf, cx, cy, rad, r, g, b, a = 255) {
  const r2 = rad * rad;
  const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad);
  const y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(surf, x, y, r, g, b, a);
    }
  }
}

function strokeCircle(surf, cx, cy, rad, r, g, b, a = 255) {
  const steps = Math.max(16, Math.round(rad * 7));
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    setPx(surf, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, r, g, b, a);
  }
}

function fillPoly(surf, pts, r, g, b, a = 255) {
  let minY = surf.h, maxY = -1;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(surf.h - 1, Math.ceil(maxY));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
        xs.push(p1[0] + ((y - p1[1]) / (p2[1] - p1[1])) * (p2[0] - p1[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length - 1; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k]));
      const xb = Math.min(surf.w - 1, Math.floor(xs[k + 1]));
      for (let x = xa; x <= xb; x++) setPx(surf, x, y, r, g, b, a);
    }
  }
}

function blitNearest(dst, src, dx, dy, scale = 1) {
  for (let sy = 0; sy < src.h; sy++) {
    for (let sx = 0; sx < src.w; sx++) {
      const si = (sy * src.w + sx) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;
      const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          setPx(dst, dx + sx * scale + ox, dy + sy * scale + oy, r, g, b, a);
        }
      }
    }
  }
}

// 3x5 / 5x7 crisp bitmap font for overview labels
const FONT5 = {
  "0": ["01110","10011","10101","11001","01110"],
  "1": ["00100","01100","00100","00100","01110"],
  "2": ["01110","10001","00110","01000","11111"],
  "3": ["11110","00001","01110","00001","11110"],
  "4": ["10010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","11110"],
  "6": ["01110","10000","11110","10001","01110"],
  "7": ["11111","00010","00100","01000","01000"],
  "8": ["01110","10001","01110","10001","01110"],
  "9": ["01110","10001","01111","00001","01110"],
  "A": ["01110","10001","11111","10001","10001"],
  "B": ["11110","10001","11110","10001","11110"],
  "C": ["01111","10000","10000","10000","01111"],
  "D": ["11110","10001","10001","10001","11110"],
  "E": ["11111","10000","11110","10000","11111"],
  "F": ["11111","10000","11110","10000","10000"],
  "G": ["01111","10000","10111","10001","01110"],
  "H": ["10001","10001","11111","10001","10001"],
  "I": ["01110","00100","00100","00100","01110"],
  "J": ["00111","00010","00010","10010","01100"],
  "K": ["10001","10010","11100","10010","10001"],
  "L": ["10000","10000","10000","10000","11111"],
  "M": ["10001","11011","10101","10001","10001"],
  "N": ["10001","11001","10101","10011","10001"],
  "O": ["01110","10001","10001","10001","01110"],
  "P": ["11110","10001","11110","10000","10000"],
  "Q": ["01110","10001","10101","10010","01101"],
  "R": ["11110","10001","11110","10010","10001"],
  "S": ["01111","10000","01110","00001","11110"],
  "T": ["11111","00100","00100","00100","00100"],
  "U": ["10001","10001","10001","10001","01110"],
  "V": ["10001","10001","10001","01010","00100"],
  "W": ["10001","10001","10101","11011","10001"],
  "X": ["10001","01010","00100","01010","10001"],
  "Y": ["10001","01010","00100","00100","00100"],
  "Z": ["11111","00010","00100","01000","11111"],
  ".": ["00000","00000","00000","00000","00100"],
  "-": ["00000","00000","01110","00000","00000"],
  "/": ["00001","00010","00100","01000","10000"],
  ":": ["00000","00100","00000","00100","00000"],
  " ": ["00000","00000","00000","00000","00000"],
};

function drawText(surf, str, x, y, scale, r, g, b, align = "left") {
  const s = str.toUpperCase();
  const charW = 6 * scale;
  const totalW = s.length * charW - scale;
  let ox = Math.round(align === "center" ? x - totalW * 0.5 : (align === "right" ? x - totalW : x));
  for (let i = 0; i < s.length; i++) {
    const glyph = FONT5[s[i]] || FONT5[" "];
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] === "1") {
          fillRect(surf, ox + gx * scale, y + gy * scale, scale, scale, r, g, b);
        }
      }
    }
    ox += charW;
  }
}

// ============================================================================
// 8-Bit 3D Software Z-Buffer Rasterizer (with Bayer Dithering & Pixel Outline)
// ============================================================================
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function makeCamera(pos, target, fovDeg = 38) {
  const fwd = norm3([target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]]);
  const right = norm3(cross3(fwd, [0, 1, 0]));
  const up = cross3(right, fwd);
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  return { pos, fwd, right, up, tanHalf };
}

function projectPoint(cam, p, w, h) {
  const rx = p[0] - cam.pos[0];
  const ry = p[1] - cam.pos[1];
  const rz = p[2] - cam.pos[2];
  const cz = rx * cam.fwd[0] + ry * cam.fwd[1] + rz * cam.fwd[2];
  if (cz <= 0.2) return null;
  const cx = rx * cam.right[0] + ry * cam.right[1] + rz * cam.right[2];
  const cy = rx * cam.up[0] + ry * cam.up[1] + rz * cam.up[2];
  const fY = 1 / cam.tanHalf;
  const fX = fY / (w / h);
  return [
    w * 0.5 + (cx / cz) * fX * (w * 0.5),
    h * 0.5 - (cy / cz) * fY * (h * 0.5),
    cz,
  ];
}

function renderTurret3D(model, w, h, pose, vfxMode = "none") {
  const surf = createSurface(w, h);
  const zbuf = new Float32Array(w * h).fill(1e9);

  // Isometric-style 3/4 high camera with generous framing for long barrels & skyward fire!
  const cam = makeCamera([-8.0, 6.5, 9.2], [0.2, 2.35, 0.45], 40);
  const lightDir = norm3([-0.55, 0.78, 0.45]);

  // Subtle dark contact ground shadow disk beneath turret foundation
  const shadowRad = 3.25;
  for (let s = 0; s < 16; s++) {
    const a0 = (s / 16) * Math.PI * 2;
    const a1 = ((s + 1) / 16) * Math.PI * 2;
    const pc = projectPoint(cam, [0, 0.01, 0], w, h);
    const p1 = projectPoint(cam, [Math.cos(a0) * shadowRad, 0.01, Math.sin(a0) * shadowRad], w, h);
    const p2 = projectPoint(cam, [Math.cos(a1) * shadowRad, 0.01, Math.sin(a1) * shadowRad], w, h);
    if (pc && p1 && p2) {
      fillPoly(surf, [[pc[0], pc[1]], [p1[0], p1[1]], [p2[0], p2[1]]], 8, 14, 28, 120);
    }
  }

  // Transform without vertex-stretching explode; explode cleanly per-face instead!
  const explodeAmt = pose.explode || 0;
  const cleanPose = explodeAmt > 0 ? { ...pose, explode: 0 } : pose;
  const verts = TurretModels.transformTurretVerts(model, cleanPose);

  const heatTint = vfxMode === "overheat" ? 0.45 : (vfxMode === "damaged" ? 0.28 : 0);
  const chargeBoost = vfxMode === "charge" ? 1.28 : 1.0;

  for (let fi = 0; fi < model.faces.length; fi++) {
    const f = model.faces[fi];
    const [ia, ib, ic] = f.i;
    let va = verts[ia], vb = verts[ib], vc = verts[ic];

    // Clean per-face flying armor plate chunks on explosion (no polygon stretching!)
    if (explodeAmt > 0 && model.vTags[ia] !== "base") {
      const ang = fi * 2.39996;
      const spd = 0.55 + (fi % 5) * 0.28;
      const dx = Math.cos(ang) * explodeAmt * spd * 1.45;
      const dy = (0.35 + ((fi * 7) % 10) * 0.14) * explodeAmt * 1.65;
      const dz = Math.sin(ang) * explodeAmt * spd * 1.45;
      const cx = (va[0] + vb[0] + vc[0]) / 3;
      const cy = (va[1] + vb[1] + vc[1]) / 3;
      const cz = (va[2] + vb[2] + vc[2]) / 3;
      const shrink = 0.72;
      va = [cx + (va[0] - cx) * shrink + dx, cy + (va[1] - cy) * shrink + dy, cz + (va[2] - cz) * shrink + dz];
      vb = [cx + (vb[0] - cx) * shrink + dx, cy + (vb[1] - cy) * shrink + dy, cz + (vb[2] - cz) * shrink + dz];
      vc = [cx + (vc[0] - cx) * shrink + dx, cy + (vc[1] - cy) * shrink + dy, cz + (vc[2] - cz) * shrink + dz];
    }

    const pa = projectPoint(cam, va, w, h);
    const pb = projectPoint(cam, vb, w, h);
    const pc = projectPoint(cam, vc, w, h);
    if (!pa || !pb || !pc) continue;

    // Backface cull in world space
    const ab = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const ac = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
    const n = norm3(cross3(ab, ac));
    const view = [cam.pos[0] - va[0], cam.pos[1] - va[1], cam.pos[2] - va[2]];
    if (dot3(n, view) < -0.05) continue;

    // 8-bit stepped cel lighting + subtle rim
    let lum = 1.0;
    if (!f.e) {
      const ndl = Math.max(0, dot3(n, lightDir));
      const hemi = Math.max(0, n[1]) * 0.16;
      lum = 0.36 + ndl * 0.68 + hemi;
    } else {
      lum = 1.12 * chargeBoost;
    }

    // Bounding box rasterization with Z-buffer & Bayer 4x4 8-bit quantization
    const minX = Math.max(0, Math.floor(Math.min(pa[0], pb[0], pc[0])));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(pa[0], pb[0], pc[0])));
    const minY = Math.max(0, Math.floor(Math.min(pa[1], pb[1], pc[1])));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(pa[1], pb[1], pc[1])));

    const denom = (pb[1] - pc[1]) * (pa[0] - pc[0]) + (pc[0] - pb[0]) * (pa[1] - pc[1]);
    if (Math.abs(denom) < 1e-4) continue;
    const invD = 1 / denom;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const w1 = ((pb[1] - pc[1]) * (px + 0.5 - pc[0]) + (pc[0] - pb[0]) * (py + 0.5 - pc[1])) * invD;
        const w2 = ((pc[1] - pa[1]) * (px + 0.5 - pc[0]) + (pa[0] - pc[0]) * (py + 0.5 - pc[1])) * invD;
        const w3 = 1 - w1 - w2;
        if (w1 < -0.002 || w2 < -0.002 || w3 < -0.002) continue;
        const z = w1 * pa[2] + w2 * pb[2] + w3 * pc[2];
        const idx = py * w + px;
        if (z < zbuf[idx]) {
          zbuf[idx] = z;
          const bayer = (BAYER4[py & 3][px & 3] / 16 - 0.5) * 0.14;
          const qLum = Math.max(0.24, Math.min(1.3, Math.round((lum + bayer) * 5) / 5));
          let r = f.c[0] * qLum;
          let g = f.c[1] * qLum;
          let b = f.c[2] * qLum;
          if (heatTint > 0 && model.vTags[ia] !== "base") {
            r = r * (1 - heatTint) + 255 * heatTint;
            g = g * (1 - heatTint) + 86 * heatTint;
            b = b * (1 - heatTint) + 38 * heatTint;
          }
          // Quantize channels slightly for crisp retro 8-bit palette look
          r = Math.min(255, Math.max(0, Math.round(r / 12) * 12));
          g = Math.min(255, Math.max(0, Math.round(g / 12) * 12));
          b = Math.min(255, Math.max(0, Math.round(b / 12) * 12));
          setPx(surf, px, py, r, g, b, 255);
        }
      }
    }
  }

  // Crisp 1px 8-bit pixel-art outline around solid turret silhouette!
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (zbuf[i] < 1e8) mask[i] = 1;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      if (mask[i - 1] || mask[i + 1] || mask[i - w] || mask[i + w]) {
        setPx(surf, x, y, 10, 14, 24, 255);
      }
    }
  }

  // Action-Specific 8-Bit Combat VFX overlays (projected accurately from 3D muzzle!)
  const m0 = TurretModels.getMuzzleWorld(model, pose, 0);
  const m1 = model.muzzles.length > 1 ? TurretModels.getMuzzleWorld(model, pose, 1) : m0;
  const pM0 = projectPoint(cam, m0, w, h);
  const pM1 = projectPoint(cam, m1, w, h);
  const yaw = pose.yaw || 0;
  const pitch = pose.pitch || 0;
  // Aim forward direction in world space
  const aimDir = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const far0 = projectPoint(cam, [m0[0] + aimDir[0] * 4.8, m0[1] + aimDir[1] * 4.8, m0[2] + aimDir[2] * 4.8], w, h);
  const far1 = projectPoint(cam, [m1[0] + aimDir[0] * 4.8, m1[1] + aimDir[1] * 4.8, m1[2] + aimDir[2] * 4.8], w, h);
  const [fr, fg, fb] = hexToRgb(model.fireColor);
  const [cr, cg, cb] = hexToRgb(model.coreColor);

  if (vfxMode === "track" || vfxMode === "elevate") {
    // Laser lock-on sight line + targeting diamond
    if (pM0 && far0) {
      drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], cr, cg, cb, 130, 1);
      if (vfxMode === "elevate") {
        strokeCircle(surf, far0[0], far0[1], 4, 255, 232, 92, 230);
        setPx(surf, far0[0], far0[1], 255, 80, 96, 255);
      }
    }
  } else if (vfxMode === "fire" || vfxMode === "recoil") {
    const isRecoil = vfxMode === "recoil";
    const style = model.weaponStyle;
    const drawMuzzleStar = (pt, sz) => {
      if (!pt) return;
      fillCircle(surf, pt[0], pt[1], sz, fr, fg, fb, 235);
      fillCircle(surf, pt[0], pt[1], Math.max(1.5, sz * 0.55), 255, 255, 255, 255);
      drawLine(surf, pt[0] - sz * 1.8, pt[1], pt[0] + sz * 1.8, pt[1], fr, fg, fb, 220, 1);
      drawLine(surf, pt[0], pt[1] - sz * 1.8, pt[0], pt[1] + sz * 1.8, fr, fg, fb, 220, 1);
    };

    if (style === "gatling") {
      drawMuzzleStar(pM0, isRecoil ? 3.5 : 4.5);
      drawMuzzleStar(pM1, isRecoil ? 4.5 : 3.2);
      if (pM0 && far0) drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 235, 120, 240, 2);
      if (pM1 && far1) drawLine(surf, pM1[0], pM1[1], far1[0], far1[1], 255, 190, 60, 240, 2);
    } else if (style === "flak") {
      drawMuzzleStar(isRecoil ? pM1 : pM0, 5.2);
      const tgt = isRecoil ? far1 : far0;
      const src = isRecoil ? pM1 : pM0;
      if (src && tgt) {
        drawLine(surf, src[0], src[1], tgt[0], tgt[1], 255, 180, 70, 220, 2);
        // Classic flak airburst cloud!
        fillCircle(surf, tgt[0], tgt[1], 5.5, 48, 48, 56, 220);
        fillCircle(surf, tgt[0] - 2, tgt[1] - 1, 3.2, 255, 154, 48, 250);
        fillCircle(surf, tgt[0] + 2, tgt[1] + 1, 2.2, 255, 244, 140, 255);
      }
    } else if (style === "missile") {
      for (const [sp, fp, off] of [[pM0, far0, -3], [pM1, far1, 3]]) {
        if (!sp || !fp) continue;
        // Smoke trail & glowing red-white missile!
        const mx = (sp[0] + fp[0]) * 0.5 + off;
        const my = (sp[1] + fp[1]) * 0.5 - 3;
        drawLine(surf, sp[0], sp[1], mx, my, 210, 225, 240, 190, 2);
        drawLine(surf, mx, my, fp[0], fp[1], 255, 120, 70, 240, 2);
        fillCircle(surf, sp[0], sp[1], 3.0, 255, 165, 65, 230);
        fillCircle(surf, fp[0], fp[1], 2.2, 255, 255, 255, 255);
      }
    } else if (style === "laser" || style === "ion_beam") {
      const beamW = style === "ion_beam" ? (isRecoil ? 7 : 5) : (isRecoil ? 4 : 3);
      if (pM0 && far0) {
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], fr, fg, fb, 210, beamW + 2);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], cr, cg, cb, 255, beamW);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 255, 255, 255, Math.max(1, beamW - 2));
        drawMuzzleStar(pM0, style === "ion_beam" ? 5.5 : 3.8);
      }
    } else if (style === "railgun") {
      if (pM0 && far0) {
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 92, 196, 255, 235, 3);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 255, 255, 255, 1);
        // Supersonic shockwave rings along trajectory!
        for (const t of [0.28, 0.62, 0.90]) {
          const rx = pM0[0] + (far0[0] - pM0[0]) * t;
          const ry = pM0[1] + (far0[1] - pM0[1]) * t;
          strokeCircle(surf, rx, ry, 2.5 + t * 3.5, 150, 235, 255, 230);
        }
      }
    } else if (style === "tesla") {
      if (pM0 && far0) {
        // Jagged chaining electric lightning forks!
        const drawBolt = (sx, sy, ex, ey, seed) => {
          let px = sx, py = sy;
          for (let k = 1; k <= 5; k++) {
            const t = k / 5;
            const nx = sx + (ex - sx) * t + (k < 5 ? Math.sin(k * 9 + seed) * 5 : 0);
            const ny = sy + (ey - sy) * t + (k < 5 ? Math.cos(k * 7 + seed) * 4 : 0);
            drawLine(surf, px, py, nx, ny, 168, 128, 255, 230, 2);
            drawLine(surf, px, py, nx, ny, 180, 250, 255, 255, 1);
            px = nx; py = ny;
          }
        };
        drawBolt(pM0[0], pM0[1], far0[0], far0[1], isRecoil ? 2.1 : 0.4);
        drawBolt(pM0[0], pM0[1], far0[0] - 8, far0[1] + 5, isRecoil ? 5.2 : 3.3);
        fillCircle(surf, pM0[0], pM0[1], 4.2, 155, 240, 255, 220);
      }
    } else if (style === "plasma") {
      if (pM0 && far0) {
        drawMuzzleStar(pM0, 4.5);
        const bx = pM0[0] + (far0[0] - pM0[0]) * (isRecoil ? 0.85 : 0.55);
        const by = pM0[1] + (far0[1] - pM0[1]) * (isRecoil ? 0.85 : 0.55) - 3;
        fillCircle(surf, bx, by, 5.5, 255, 110, 28, 235);
        fillCircle(surf, bx, by, 3.3, 255, 224, 92, 255);
        fillCircle(surf, bx, by, 1.5, 255, 255, 255, 255);
      }
    } else if (style === "emp") {
      if (pM0 && far0) {
        for (const t of [0.22, 0.52, 0.85]) {
          const rx = pM0[0] + (far0[0] - pM0[0]) * t;
          const ry = pM0[1] + (far0[1] - pM0[1]) * t;
          strokeCircle(surf, rx, ry, 3 + t * 9, 64, 255, 170, 245);
          strokeCircle(surf, rx, ry, 2 + t * 9, 200, 255, 235, 210);
        }
      }
    } else if (style === "cryo") {
      if (pM0 && far0) {
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 110, 235, 255, 210, 4);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 230, 252, 255, 255, 2);
        for (let k = 0; k < 6; k++) {
          const t = 0.25 + k * 0.14;
          const cx = pM0[0] + (far0[0] - pM0[0]) * t + Math.sin(k * 5) * 4;
          const cy = pM0[1] + (far0[1] - pM0[1]) * t + Math.cos(k * 7) * 4;
          fillRect(surf, cx - 1, cy - 1, 2, 2, 220, 252, 255, 255);
        }
      }
    }
  } else if (vfxMode === "charge") {
    // Glowing charging aura rings around turret & muzzle
    const ctr = projectPoint(cam, [0, model.pivotY, 0], w, h);
    if (ctr) {
      strokeCircle(surf, ctr[0], ctr[1], 19, cr, cg, cb, 220);
      strokeCircle(surf, ctr[0], ctr[1], 14, fr, fg, fb, 180);
    }
    if (pM0) {
      fillCircle(surf, pM0[0], pM0[1], 4.2, fr, fg, fb, 225);
      fillCircle(surf, pM0[0], pM0[1], 2.2, 255, 255, 255, 255);
    }
  } else if (vfxMode === "overheat") {
    // Rising white-orange thermal steam puffs!
    for (let k = 0; k < 7; k++) {
      const sx = w * 0.34 + (k % 3) * (w * 0.16) + Math.sin(k * 4) * 3;
      const sy = h * 0.36 - k * 3.2;
      fillCircle(surf, sx, sy, 3.5 + (k % 2), 235, 240, 250, 175);
      fillCircle(surf, sx - 1, sy + 1, 2.0, 255, 165, 80, 160);
    }
  } else if (vfxMode === "damaged") {
    // Explosive blast fireballs & sparks!
    const ctr = projectPoint(cam, [0, 2.2, 0.2], w, h) || [w * 0.5, h * 0.5];
    fillCircle(surf, ctr[0], ctr[1], 13, 255, 88, 36, 225);
    fillCircle(surf, ctr[0] - 4, ctr[1] - 3, 8, 255, 198, 58, 240);
    fillCircle(surf, ctr[0] + 5, ctr[1] + 2, 7, 255, 130, 42, 230);
    fillCircle(surf, ctr[0], ctr[1] - 1, 4.5, 255, 255, 235, 255);
    // Flying dark smoke & spark pixels
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.3;
      const r = 13 + (k % 3) * 5;
      fillCircle(surf, ctr[0] + Math.cos(a) * r, ctr[1] + Math.sin(a) * r, 2.2, k % 2 ? 255 : 50, k % 2 ? 220 : 50, k % 2 ? 80 : 60, 230);
    }
  }

  return surf;
}

// ============================================================================
// 8-Bit Sitting-Inside Gunner Cockpit Renderer (160x100 native -> 640x400!)
// Each of the 10 turrets has a bespoke interior, canopy, barrel view & controls!
// ============================================================================
function renderTurretCockpit(model) {
  const W = 160, H = 100;
  const s = createSurface(W, H);
  const cp = model.cockpit;
  const [fr, fg, fb] = hexToRgb(cp.frameCol);
  const [hr, hg, hb] = hexToRgb(cp.frameHi);
  const [tr, tg, tb] = hexToRgb(cp.trimCol);
  const [ur, ug, ub] = hexToRgb(cp.hudCol);
  const [wr, wg, wb] = hexToRgb(model.fireColor);

  // 1. Varied Atmospheric Defense Sky Outside Armored Canopy Glass
  const SKY_THEMES = {
    olive_bunker: [[18, 32, 62], [68, 118, 152]],
    iron_flak:    [[34, 24, 48], [136, 78, 56]], // fiery dusk flak sky!
    aegis_navy:   [[10, 22, 54], [38, 86, 148]],
    prism_white:  [[14, 44, 78], [72, 168, 206]],
    rail_sniper:  [[8, 14, 34],  [26, 52, 102]],
    tesla_brass:  [[24, 16, 48], [68, 44, 118]], // storm violet sky!
    magma_dome:   [[36, 16, 20], [122, 52, 34]], // volcanic ash sky!
    ew_emerald:   [[8, 28, 36],  [26, 94, 88]],  // radar night vision sky!
    arctic_cryo:  [[12, 38, 66], [84, 172, 208]],// aurora glacier sky!
    royal_citadel:[[10, 20, 52], [44, 96, 164]],
  };
  const [skyTop, skyBot] = SKY_THEMES[cp.theme] || [[10, 18, 44], [38, 80, 136]];
  for (let y = 0; y < 68; y++) {
    const t = y / 68;
    fillRect(
      s, 0, y, W, 1,
      Math.round(skyTop[0] + (skyBot[0] - skyTop[0]) * t),
      Math.round(skyTop[1] + (skyBot[1] - skyTop[1]) * t),
      Math.round(skyTop[2] + (skyBot[2] - skyTop[2]) * t)
    );
  }
  // Distant stars at upper sky + low cloud streaks + planetary horizon
  for (const [sx, sy] of [[24, 14], [48, 10], [72, 16], [108, 12], [134, 15], [60, 22], [122, 20]]) {
    setPx(s, sx, sy, 215, 240, 255);
  }
  // Pixel clouds
  for (const [cx, cy, cw] of [[28, 42, 22], [110, 38, 28], [68, 52, 18]]) {
    fillRect(s, cx, cy, cw, 3, 145, 192, 224, 160);
    fillRect(s, cx + 3, cy - 2, cw - 6, 2, 195, 228, 248, 175);
  }
  // Distant city/mountain defense horizon at bottom of glass
  fillPoly(s, [[0, 66], [18, 58], [36, 62], [58, 56], [82, 62], [108, 57], [132, 61], [160, 56], [160, 72], [0, 72]], 22, 34, 48);

  // 2. Incoming Aerial Zerg Targets in the Upper Sky (leaving huge depth corridor for cannon fire!)
  const drawMiniZerg = (zx, zy, sc, locked, exploding = false) => {
    // Winged crimson/purple Zerg silhouette
    fillRect(s, zx - 4 * sc, zy - 1, 3 * sc, 2, 168, 38, 52);
    fillRect(s, zx + 2 * sc, zy - 1, 3 * sc, 2, 168, 38, 52);
    fillRect(s, zx - 1, zy - 2, 3, 4, 214, 62, 74);
    setPx(s, zx, zy, 120, 255, 110);
    if (exploding) {
      // Impact hit flash & blast cloud on target!
      fillCircle(s, zx, zy, 5.5, wr, wg, wb, 210);
      fillCircle(s, zx, zy, 3.0, 255, 245, 180, 245);
      fillCircle(s, zx + 4, zy - 2, 2.5, 255, 110, 42, 210);
      setPx(s, zx - 6, zy - 4, 255, 232, 120);
      setPx(s, zx + 6, zy + 3, 255, 180, 72);
    }
    if (locked) {
      const r = 8;
      drawLine(s, zx - r, zy - r, zx - r + 3, zy - r, 255, 232, 86);
      drawLine(s, zx - r, zy - r, zx - r, zy - r + 3, 255, 232, 86);
      drawLine(s, zx + r, zy - r, zx + r - 3, zy - r, 255, 232, 86);
      drawLine(s, zx + r, zy - r, zx + r, zy - r + 3, 255, 232, 86);
      drawLine(s, zx - r, zy + r, zx - r + 3, zy + r, 255, 232, 86);
      drawLine(s, zx - r, zy + r, zx - r, zy + r - 3, 255, 232, 86);
      drawLine(s, zx + r, zy + r, zx + r - 3, zy + r, 255, 232, 86);
      drawLine(s, zx + r, zy + r, zx + r, zy + r - 3, 255, 232, 86);
    }
  };
  const tgtX = 80, tgtY = 23;
  drawMiniZerg(tgtX, tgtY, 2, true, true);
  drawMiniZerg(42, 24, 1, false, false);
  drawMiniZerg(120, 21, 1, false, false);

  // Helper: dramatic 8-bit starburst muzzle blast
  const drawBlastStar = (mx, my, rad, r, g, b) => {
    fillCircle(s, mx, my, rad * 1.45, r, g, b, 90);
    fillCircle(s, mx, my, rad, r, g, b, 230);
    fillCircle(s, mx, my, rad * 0.55, 255, 255, 235, 255);
    // Starburst spikes
    drawLine(s, mx - rad * 2.3, my, mx + rad * 2.3, my, r, g, b, 220, 1);
    drawLine(s, mx, my - rad * 2.1, mx, my + rad * 1.8, r, g, b, 220, 1);
    drawLine(s, mx - rad * 1.5, my - rad * 1.5, mx + rad * 1.5, my + rad * 1.5, 255, 245, 190, 200, 1);
    drawLine(s, mx + rad * 1.5, my - rad * 1.5, mx - rad * 1.5, my + rad * 1.5, 255, 245, 190, 200, 1);
  };

  // 3. MASSIVE 3D-Foreshortened Turret Barrels & Active Outbound Fire Right Outside Glass!
  const bs = cp.barrelStyle;
  if (bs === "gatling") {
    // Huge twin 6-barrel rotary gatling cannons mounted right outside left/right canopy!
    for (const side of [-1, 1]) {
      const bx0 = side < 0 ? 10 : 150;
      const bx1 = side < 0 ? 34 : 126;
      const mx = side < 0 ? 54 : 106;
      const my = 41;
      // Heavy armored breech housing & spinning barrel cluster tapered in 3D perspective
      fillPoly(s, [[bx0, 68], [bx1, 68], [mx + side * -5, my + 2], [mx + side * 5, my - 3]], 34, 40, 48);
      fillPoly(s, [[bx0 + side * -4, 66], [bx1 - side * -4, 66], [mx + side * -3, my + 1], [mx + side * 3, my - 2]], 72, 82, 96);
      // Individual rotary sub-barrels catching light
      drawLine(s, (bx0 + bx1) * 0.5 - 3, 66, mx - 2, my, 128, 140, 156, 255, 2);
      drawLine(s, (bx0 + bx1) * 0.5 + 3, 66, mx + 2, my + 1, 92, 104, 118, 255, 1);
      // Yellow/black hazard barrel clamps (two depth rings)
      drawLine(s, bx0 * 0.65 + mx * 0.35 - 3, 56, bx1 * 0.65 + mx * 0.35 + 3, 59, 245, 184, 48, 255, 3);
      drawLine(s, bx0 * 0.25 + mx * 0.75 - 2, 46, bx1 * 0.25 + mx * 0.75 + 2, 48, 212, 168, 68, 255, 2);
      // Red-hot barrel tips
      fillCircle(s, mx, my, 3.2, 255, 110, 36, 210);
      // Drifting muzzle gunsmoke puff
      fillCircle(s, mx + side * 6, my - 4, 5.5, 165, 178, 195, 95);
      // Blazing starburst muzzle flash!
      drawBlastStar(mx, my, side < 0 ? 5.6 : 4.2, 255, 200, 56);
      // Staggered outbound glowing tracer bullets shrinking toward sky target!
      for (const t of [0.18, 0.45, 0.72, 0.94]) {
        const px0 = mx + (tgtX - mx) * t;
        const py0 = my + (tgtY - my) * t;
        const px1 = mx + (tgtX - mx) * Math.min(1, t + 0.14);
        const py1 = my + (tgtY - my) * Math.min(1, t + 0.14);
        drawLine(s, px0, py0, px1, py1, 255, 232, 92, 245, t < 0.5 ? 2 : 1);
        setPx(s, px1, py1, 255, 255, 255);
      }
      // Flying hot brass shell casings ejecting outward past the side glass!
      fillRect(s, mx + side * 12, my + 11, 3, 2, 248, 204, 72);
      fillRect(s, mx + side * 19, my + 16, 2, 2, 218, 168, 52);
    }
  } else if (bs === "twin_heavy") {
    // Giant heavy 120mm twin barrels: LEFT barrel slammed back in recoil firing huge blast, RIGHT barrel forward!
    for (const side of [-1, 1]) {
      const recoil = side < 0 ? 5 : 0; // Left firing!
      const bx0 = 80 + side * 48;
      const bx1 = 80 + side * 24;
      const mx = 80 + side * (16 + recoil * 0.6);
      const my = 40 + recoil * 1.4;
      // Hydraulic brass recoil cylinder underneath
      drawLine(s, 80 + side * 34, 67, 80 + side * 22, 52 + recoil, 204, 158, 62, 255, 4);
      // Thick tapered steel cannon barrel
      fillPoly(s, [[bx0, 68], [bx1, 68], [mx + side * -5, my + 3], [mx + side * 6, my - 3]], 46, 52, 62);
      fillPoly(s, [[bx0 - side * 5, 68], [bx1 + side * 4, 68], [mx + side * -2, my + 1], [mx + side * 3, my - 2]], 116, 128, 144);
      drawLine(s, (bx0 + bx1) * 0.5, 67, mx, my, 178, 192, 208, 255, 2);
      // Heavy slotted muzzle brake
      fillRect(s, mx - 4, my - 3, 9, 6, 40, 46, 56);
      fillRect(s, mx - 3, my - 1, 7, 2, side < 0 ? 255 : 90, side < 0 ? 160 : 98, side < 0 ? 50 : 110);
      if (side < 0) {
        // Huge fiery concussion muzzle blast + smoke ring + outbound flak shell!
        fillCircle(s, mx - 5, my - 4, 8, 82, 84, 96, 125);
        strokeCircle(s, mx, my, 9, 255, 198, 92, 180);
        drawBlastStar(mx, my, 6.8, 255, 148, 38);
        drawLine(s, mx, my, tgtX, tgtY, 255, 214, 96, 230, 2);
        // Dark-gold flak airburst cloud exploding around Zerg!
        fillCircle(s, tgtX - 5, tgtY - 2, 6, 44, 44, 52, 210);
        fillCircle(s, tgtX + 5, tgtY + 1, 5, 58, 56, 64, 195);
        fillCircle(s, tgtX, tgtY, 4.5, 255, 162, 46, 240);
      } else {
        // Wispy cooling smoke rising from right barrel
        fillCircle(s, mx + 2, my - 5, 3.5, 180, 190, 205, 95);
      }
    }
  } else if (bs === "missile_pods") {
    // Huge angled 4-cell SAM missile launcher bays visible outside BOTH left and right glass!
    for (const side of [-1, 1]) {
      const px = side < 0 ? 12 : 118;
      fillRect(s, px, 38, 30, 29, 36, 58, 92);
      strokeRect(s, px, 38, 30, 29, 86, 134, 186, 1);
      fillRect(s, px + 2, 40, 26, 25, 20, 32, 52);
      for (const ox of [7, 20]) for (const oy of [7, 18]) {
        fillCircle(s, px + ox, 38 + oy, 4.5, 12, 20, 34);
        fillCircle(s, px + ox, 38 + oy, 2.2, 238, 66, 76);
      }
    }
    // Massive billowing launch smoke pouring out of Left Top-Inner cell as missile rockets into the sky!
    fillCircle(s, 32, 45, 10, 205, 218, 232, 165);
    fillCircle(s, 26, 52, 8, 170, 185, 205, 140);
    drawBlastStar(33, 44, 6.2, 255, 164, 52);
    // Thick curved white smoke trail streaking right from pod into target!
    drawLine(s, 33, 44, 52, 34, 225, 236, 248, 225, 4);
    drawLine(s, 52, 34, 72, 25, 255, 192, 118, 235, 3);
    drawLine(s, 35, 44, 76, 24, 255, 255, 255, 245, 1);
    // Visible missile silhouette mid-flight!
    fillRect(s, 62, 27, 6, 3, 240, 248, 255);
    fillRect(s, 68, 27, 2, 3, 255, 72, 72);
    // Second missile igniting on right pod!
    drawBlastStar(125, 45, 4.5, 255, 150, 50);
    drawLine(s, 125, 45, 104, 33, 220, 234, 248, 195, 3);
    fillRect(s, 100, 31, 5, 3, 240, 248, 255);
  } else if (bs === "prism_prongs") {
    // Huge sleek ceramic-white emitter prongs converging from lower corners around floating diamond prism!
    for (const side of [-1, 1]) {
      fillPoly(s, [[80 + side * 56, 68], [80 + side * 34, 68], [80 + side * 14, 41], [80 + side * 24, 39]], 192, 212, 234);
      fillPoly(s, [[80 + side * 48, 68], [80 + side * 37, 68], [80 + side * 16, 41], [80 + side * 21, 40]], 235, 246, 255);
      drawLine(s, 80 + side * 37, 66, 80 + side * 15, 41, 68, 248, 255, 255, 3);
    }
    // Blinding converging energy beams into floating crystal prism -> sky-searing mega laser!
    drawLine(s, 65, 42, 80, 44, 120, 255, 255, 240, 2);
    drawLine(s, 95, 42, 80, 44, 120, 255, 255, 240, 2);
    fillPoly(s, [[80, 36], [87, 44], [80, 52], [73, 44]], 168, 255, 255);
    drawBlastStar(80, 42, 6.2, 76, 248, 255);
    // Colossal perspective laser beam piercing through sky target!
    fillPoly(s, [[74, 42], [86, 42], [83, 12], [77, 12]], 64, 238, 255, 170);
    drawLine(s, 80, 42, 80, 12, 148, 255, 255, 250, 5);
    drawLine(s, 80, 42, 80, 12, 255, 255, 255, 255, 2);
  } else if (bs === "railgun") {
    // Massive dark-steel parallel magnetic accelerator rails with glowing cobalt induction coils!
    for (const side of [-1, 1]) {
      fillPoly(s, [[80 + side * 52, 68], [80 + side * 26, 68], [80 + side * 7, 39], [80 + side * 16, 38]], 62, 74, 94);
      fillPoly(s, [[80 + side * 44, 68], [80 + side * 31, 68], [80 + side * 9, 39], [80 + side * 13, 39]], 124, 142, 168);
      // Glowing electric inner rail edge
      drawLine(s, 80 + side * 28, 66, 80 + side * 7, 39, 76, 188, 255, 255, 3);
      // Induction coil ribs along rail
      for (const t of [0.25, 0.55, 0.82]) {
        const rx = 80 + side * (28 + (7 - 28) * t);
        const ry = 66 + (39 - 66) * t;
        fillRect(s, rx - 3, ry - 1, 6, 2, 160, 236, 255);
      }
    }
    // Blinding hypersonic rail slug beam + 3 shrinking 3D perspective Mach shockwave rings!
    drawBlastStar(80, 42, 6.0, 96, 206, 255);
    drawLine(s, 80, 62, 80, 14, 84, 192, 255, 230, 6);
    drawLine(s, 80, 62, 80, 14, 255, 255, 255, 255, 2);
    strokeCircle(s, 80, 46, 12, 130, 224, 255, 220);
    strokeCircle(s, 80, 35, 8, 175, 240, 255, 235);
    strokeCircle(s, 80, 25, 5, 255, 255, 255, 245);
  } else if (bs === "tesla_prongs") {
    // Huge copper-bronze twin discharge spires flanking outside the brass Faraday glass!
    for (const side of [-1, 1]) {
      fillPoly(s, [[80 + side * 56, 68], [80 + side * 38, 68], [80 + side * 22, 41], [80 + side * 30, 40]], 142, 86, 40);
      drawLine(s, 80 + side * 46, 67, 80 + side * 26, 41, 226, 148, 76, 255, 3);
      // Glowing insulator coil bands
      drawLine(s, 80 + side * 42, 58, 80 + side * 33, 56, 164, 132, 255, 255, 2);
      drawLine(s, 80 + side * 36, 49, 80 + side * 28, 48, 164, 132, 255, 255, 2);
      drawBlastStar(80 + side * 26, 41, 5.2, 154, 136, 255);
      // Multi-segment jagged high-voltage lightning bolts leaping from spires into target!
      const p1x = 80 + side * 18, p1y = 33;
      const p2x = 80 + side * 8, p2y = 29;
      drawLine(s, 80 + side * 26, 41, p1x, p1y, 168, 120, 255, 235, 3);
      drawLine(s, p1x, p1y, p2x, p2y, 168, 120, 255, 235, 3);
      drawLine(s, p2x, p2y, tgtX, tgtY, 168, 120, 255, 235, 3);
      drawLine(s, 80 + side * 26, 41, p1x, p1y, 210, 252, 255, 255, 1);
      drawLine(s, p1x, p1y, p2x, p2y, 210, 252, 255, 255, 1);
      drawLine(s, p2x, p2y, tgtX, tgtY, 210, 252, 255, 255, 1);
    }
    // Secondary arc chaining to upper-right Zerg!
    drawLine(s, tgtX, tgtY, 102, 24, 164, 124, 255, 210, 2);
    drawLine(s, 102, 24, 120, 21, 180, 248, 255, 230, 1);
  } else if (bs === "mortar_bore") {
    // Colossal wide-bore furnace cannon barrel right outside bottom-center glass erupting a sun-fireball!
    fillPoly(s, [[46, 68], [114, 68], [100, 44], [60, 44]], 56, 40, 44);
    fillPoly(s, [[54, 68], [106, 68], [95, 45], [65, 45]], 136, 44, 42);
    drawLine(s, 55, 66, 64, 46, 255, 134, 38, 255, 2);
    drawLine(s, 105, 66, 96, 46, 255, 134, 38, 255, 2);
    // Blazing molten muzzle eruption!
    fillCircle(s, 80, 46, 12, 255, 114, 26, 180);
    drawBlastStar(80, 45, 7.2, 255, 152, 38);
    // Giant climbing solar plasma orb & trailing fire embers!
    drawLine(s, 80, 44, 80, 26, 255, 150, 42, 210, 5);
    fillCircle(s, 80, 31, 7.5, 255, 108, 24, 235);
    fillCircle(s, 80, 31, 4.8, 255, 224, 78, 255);
    fillCircle(s, 80, 31, 2.2, 255, 255, 235, 255);
    for (const [ex, ey] of [[68, 39], [92, 38], [73, 33], [89, 28], [64, 45], [96, 44]]) {
      fillRect(s, ex, ey, 2, 2, 255, 224, 96);
    }
  } else if (bs === "emp_dish") {
    // Giant hexagonal EMP collector dish rim framing the windshield + concentric pulse rings blasting outward!
    strokeCircle(s, 80, 45, 29, 132, 178, 186, 225);
    strokeCircle(s, 80, 45, 27, 64, 255, 168, 215);
    for (const a of [0.65, 2.49, 3.85, 5.55]) {
      drawLine(s, 80 + Math.cos(a) * 29, 45 + Math.sin(a) * 29, 80, 45, 148, 188, 194, 235, 2);
    }
    drawBlastStar(80, 45, 5.5, 64, 255, 168);
    // Perspective-shrinking emerald EMP shockwave rings blasting up toward the Zerg!
    strokeCircle(s, 80, 42, 16, 64, 255, 168, 220);
    strokeCircle(s, 80, 35, 12, 130, 255, 205, 235);
    strokeCircle(s, 80, 28, 9, 188, 255, 232, 245);
    strokeCircle(s, 80, 23, 11, 64, 255, 168, 220);
  } else if (bs === "cryo_nozzle") {
    // Massive frosted hexagonal liquid-nitrogen nozzle + blasting sub-zero frost cone & ice shards!
    fillPoly(s, [[48, 68], [112, 68], [97, 44], [63, 44]], 184, 226, 248);
    fillPoly(s, [[58, 68], [102, 68], [90, 46], [70, 46]], 78, 172, 224);
    drawLine(s, 54, 66, 65, 45, 240, 252, 255, 255, 2);
    drawLine(s, 106, 66, 95, 45, 240, 252, 255, 255, 2);
    // Wide roaring sub-zero frost cone & core ray!
    fillPoly(s, [[72, 46], [88, 46], [96, 16], [64, 16]], 110, 232, 255, 110);
    drawLine(s, 80, 46, 80, 18, 148, 248, 255, 245, 6);
    drawLine(s, 80, 46, 80, 18, 255, 255, 255, 255, 2);
    drawBlastStar(80, 45, 5.8, 148, 248, 255);
    // Tumbling diamond ice shards flying up the beam!
    for (const [ix, iy] of [[70, 36], [91, 33], [74, 26], [87, 22], [68, 24], [93, 27]]) {
      fillRect(s, ix, iy, 3, 3, 225, 252, 255);
      setPx(s, ix + 1, iy + 1, 110, 232, 255);
    }
    // Frost crystals creeping onto armored glass corners!
    for (const [fx, fy] of [[18, 12], [140, 12], [23, 18], [134, 17], [17, 52], [141, 52], [25, 57], [132, 57]]) {
      fillRect(s, fx, fy, 4, 2, 215, 248, 255, 215);
      fillRect(s, fx + 1, fy - 1, 2, 4, 145, 236, 255, 215);
    }
  } else if (bs === "ion_petals") {
    // 4 Colossal unfolded gilded navy-gold blast petals framing the entire windshield around mega ion beam!
    for (const [sx, sy, ex, ey] of [
      [20, 66, 62, 43], [140, 66, 98, 43],
      [26, 26, 64, 37], [134, 26, 96, 37],
    ]) {
      drawLine(s, sx, sy, ex, ey, 46, 82, 134, 255, 7);
      drawLine(s, sx, sy - 1, ex, ey - 1, 242, 196, 68, 255, 2);
    }
    // Sky-piercing golden-cyan Orbital Ion Mega-Beam!
    fillPoly(s, [[70, 52], [90, 52], [85, 10], [75, 10]], 255, 224, 92, 145);
    drawLine(s, 80, 52, 80, 10, 102, 248, 255, 250, 7);
    drawLine(s, 80, 52, 80, 10, 255, 255, 255, 255, 3);
    drawBlastStar(80, 44, 8.2, 255, 224, 92);
    strokeCircle(s, 80, 44, 15, 102, 248, 255, 200);
  }

  // Subtle armored windshield glass reflection streaks (sells "sitting behind thick blast glass"!)
  drawLine(s, 26, 12, 42, 34, 220, 244, 255, 32, 2);
  drawLine(s, 33, 12, 46, 30, 220, 244, 255, 22, 1);
  drawLine(s, 118, 14, 132, 34, 220, 244, 255, 26, 2);

  // 4. Holographic Turret Gunner Targeting HUD on Glass (aligned on active target!)
  const cx = tgtX, cy = tgtY;
  // Elevation pitch ladder ticks
  for (const dy of [-10, -5, 5, 10, 16]) {
    drawLine(s, cx - 22, cy + dy, cx - 16, cy + dy, ur, ug, ub, 155, 1);
    drawLine(s, cx + 16, cy + dy, cx + 22, cy + dy, ur, ug, ub, 155, 1);
  }
  // Azimuth compass bar at top of glass
  drawLine(s, 46, 12, 114, 12, ur, ug, ub, 175, 1);
  for (let tx = 50; tx <= 110; tx += 10) drawLine(s, tx, 12, tx, 14, ur, ug, ub, 190, 1);
  fillPoly(s, [[80, 15], [77, 18], [83, 18]], tr, tg, tb, 230);

  // Active locked targeting reticle
  strokeCircle(s, cx, cy, 9, ur, ug, ub, 215);
  drawLine(s, cx - 14, cy, cx - 6, cy, ur, ug, ub, 235, 1);
  drawLine(s, cx + 6, cy, cx + 14, cy, ur, ug, ub, 235, 1);
  drawLine(s, cx, cy - 11, cx, cy - 6, ur, ug, ub, 235, 1);
  drawLine(s, cx, cy + 6, cx, cy + 12, ur, ug, ub, 235, 1);
  setPx(s, cx, cy, 255, 255, 255, 255);

  // 5. Armored Canopy Pillars & Overhead Roll-Cage (distinct per turret!)
  const dr = Math.max(0, fr - 22), dg = Math.max(0, fg - 22), db = Math.max(0, fb - 22);
  // Top overhead armored visor beam
  fillRect(s, 0, 0, W, 9, dr, dg, db);
  fillRect(s, 0, 7, W, 2, hr, hg, hb);
  fillRect(s, 42, 2, 76, 4, fr, fg, fb);
  // Status indicator lamps on overhead bar
  fillRect(s, 50, 3, 4, 2, 64, 255, 140);
  fillRect(s, 58, 3, 4, 2, tr, tg, tb);
  fillRect(s, 102, 3, 4, 2, 255, 86, 86);
  fillRect(s, 110, 3, 4, 2, ur, ug, ub);

  // Left & Right heavy angled canopy struts (bespoke window shape per turret!)
  const strutW = cp.theme === "olive_bunker" || cp.theme === "iron_flak" ? 21 : (cp.theme === "magma_dome" ? 24 : 15);
  fillPoly(s, [[0, 0], [strutW + 8, 0], [strutW, 66], [0, 66]], fr, fg, fb);
  fillPoly(s, [[W, 0], [W - strutW - 8, 0], [W - strutW, 66], [W, 66]], fr, fg, fb);
  // Bevel highlight & signature accent stripe along canopy pillars!
  drawLine(s, strutW + 8, 8, strutW, 66, hr, hg, hb, 255, 2);
  drawLine(s, W - strutW - 8, 8, W - strutW, 66, hr, hg, hb, 255, 2);
  drawLine(s, strutW + 5, 10, strutW - 2, 64, tr, tg, tb, 255, 1);
  drawLine(s, W - strutW - 5, 10, W - strutW + 2, 64, tr, tg, tb, 255, 1);
  // Bespoke canopy arch / visor / Faraday cage variations per turret!
  if (cp.theme === "tesla_brass") {
    drawLine(s, 38, 9, 28, 66, 184, 118, 56, 200, 2);
    drawLine(s, 122, 9, 132, 66, 184, 118, 56, 200, 2);
    drawLine(s, 28, 22, 132, 22, 184, 118, 56, 140, 1);
  } else if (cp.theme === "iron_flak") {
    fillRect(s, 0, 9, W, 4, 48, 54, 62);
    drawLine(s, 80, 9, 80, 18, 90, 100, 112, 220, 2);
  } else if (cp.theme === "olive_bunker") {
    // Narrow armored bunker top-corner gussets
    fillPoly(s, [[20, 9], [46, 9], [20, 24]], dr, dg, db);
    fillPoly(s, [[140, 9], [114, 9], [140, 24]], dr, dg, db);
  } else if (cp.theme === "rail_sniper") {
    // Tactical narrow top/bottom sniper visor hood
    fillRect(s, 0, 9, W, 5, 22, 28, 38);
    drawLine(s, 20, 14, 140, 14, 72, 168, 255, 220, 1);
  } else if (cp.theme === "magma_dome") {
    // Heavy chamfered furnace dome corners
    fillPoly(s, [[24, 9], [52, 9], [24, 28]], fr, fg, fb);
    fillPoly(s, [[136, 9], [108, 9], [136, 28]], fr, fg, fb);
    drawLine(s, 52, 9, 24, 28, tr, tg, tb, 255, 1);
    drawLine(s, 108, 9, 136, 28, tr, tg, tb, 255, 1);
  } else if (cp.theme === "royal_citadel") {
    // Imperial gilded cathedral canopy arches
    drawLine(s, 22, 9, 44, 18, 242, 196, 68, 230, 2);
    drawLine(s, 138, 9, 116, 18, 242, 196, 68, 230, 2);
    drawLine(s, 44, 18, 116, 18, 242, 196, 68, 175, 1);
  }
  // Rivets on canopy pillars
  for (let ry = 16; ry < 62; ry += 10) {
    setPx(s, 5, ry, hr, hg, hb); setPx(s, W - 6, ry, hr, hg, hb);
    setPx(s, 6, ry + 1, 10, 14, 20); setPx(s, W - 5, ry + 1, 10, 14, 20);
  }

  // 6. Lower Armored Gunner Console & Dashboard (Y = 64..100)
  fillPoly(s, [[0, 100], [0, 66], [28, 61], [132, 61], [160, 66], [160, 100]], dr, dg, db);
  fillPoly(s, [[6, 100], [6, 68], [30, 63], [130, 63], [154, 68], [154, 100]], fr, fg, fb);
  drawLine(s, 0, 66, 28, 61, hr, hg, hb, 255, 2);
  drawLine(s, 28, 61, 132, 61, hr, hg, hb, 255, 2);
  drawLine(s, 132, 61, 160, 66, hr, hg, hb, 255, 2);
  // Signature accent trim under brow
  drawLine(s, 30, 64, 130, 64, tr, tg, tb, 255, 1);

  // Left CRT Monitor: Weapon Heat, Charge & Ammo Bars
  fillRect(s, 12, 70, 36, 24, 6, 18, 16);
  strokeRect(s, 12, 70, 36, 24, hr, hg, hb, 1);
  // Heat / Power / Ammo segmented pixel bars
  fillRect(s, 15, 74, 28, 3, 24, 48, 42);
  fillRect(s, 15, 74, 22, 3, ur, ug, ub);
  fillRect(s, 15, 80, 28, 3, 48, 28, 22);
  fillRect(s, 15, 80, 18, 3, wr, wg, wb);
  fillRect(s, 15, 86, 28, 4, 22, 38, 46);
  for (let b = 0; b < 6; b++) {
    fillRect(s, 16 + b * 4, 87, 3, 2, b < 5 ? tr : 50, b < 5 ? tg : 50, b < 5 ? tb : 60);
  }

  // Center CRT Scope: Live Ground AA Circular Air-Defense Radar!
  fillRect(s, 54, 68, 52, 28, 6, 20, 18);
  strokeRect(s, 54, 68, 52, 28, tr, tg, tb, 1);
  const radX = 80, radY = 82;
  fillCircle(s, radX, radY, 11, 8, 34, 28);
  strokeCircle(s, radX, radY, 11, ur, ug, ub, 230);
  strokeCircle(s, radX, radY, 6, ur, ug, ub, 130);
  drawLine(s, radX - 11, radY, radX + 11, radY, ur, ug, ub, 110, 1);
  drawLine(s, radX, radY - 11, radX, radY + 11, ur, ug, ub, 110, 1);
  // Sweeping phosphor radar beam + enemy blips
  drawLine(s, radX, radY, radX + 7, radY - 8, 140, 255, 220, 230, 1);
  fillRect(s, radX - 1, radY - 1, 2, 2, 255, 255, 255);
  fillRect(s, radX + 3, radY - 6, 2, 2, 255, 72, 86);
  fillRect(s, radX - 5, radY - 4, 2, 2, 255, 72, 86);
  fillRect(s, radX + 5, radY + 3, 2, 2, 255, 220, 72);
  // Left & Right micro gauges flanking radar
  for (let i = 0; i < 5; i++) {
    fillRect(s, 57, 72 + i * 4, 5, 2, i > 1 ? ur : 255, i > 1 ? ug : 90, i > 1 ? ub : 80);
    fillRect(s, 98, 72 + i * 4, 5, 2, i > 0 ? tr : 255, i > 0 ? tg : 255, i > 0 ? tb : 255);
  }

  // Right CRT Monitor: Turret Elevation / Azimuth Schematic Diagram
  fillRect(s, 112, 70, 36, 24, 6, 18, 24);
  strokeRect(s, 112, 70, 36, 24, hr, hg, hb, 1);
  // Mini pixel turret side-profile schematic showing barrel elevation angle!
  fillRect(s, 120, 88, 18, 3, ur, ug, ub);
  fillRect(s, 124, 83, 10, 5, ur, ug, ub);
  drawLine(s, 131, 84, 143, 74, tr, tg, tb, 255, 2);
  // Elevation arc ticks
  strokeCircle(s, 130, 85, 11, ur, ug, ub, 120);
  fillRect(s, 115, 73, 6, 2, 255, 224, 86);
  fillRect(s, 115, 77, 9, 2, ur, ug, ub);

  // 7. Gunner's Gloved Hands & Bespoke Turret Controls (Sitting Inside!)
  const drawGlovedHand = (hx, hy, side) => {
    // Armored flight-suit forearm reaching in from bottom-left / bottom-right
    const ax = side < 0 ? hx - 16 : hx + 16;
    fillPoly(s, [[ax - 5, 100], [ax + 5, 100], [hx + 4, hy + 6], [hx - 4, hy + 6]], 44, 54, 68);
    fillPoly(s, [[ax - 2, 100], [ax + 3, 100], [hx + 2, hy + 6], [hx - 2, hy + 6]], 72, 86, 104);
    // Cuff stripe
    fillRect(s, hx - 4, hy + 4, 8, 2, tr, tg, tb);
    // Gloved hand gripping control handle
    fillRect(s, hx - 5, hy - 3, 10, 8, 32, 38, 46);
    fillRect(s, hx - 4, hy - 2, 8, 5, 58, 68, 82);
    // Armored knuckle highlights
    for (let k = -3; k <= 3; k += 2) setPx(s, hx + k, hy - 2, 130, 146, 166);
  };

  // Draw turret-specific control grips / yokes / wheel behind hands
  if (cp.controlType === "wheel_levers") {
    // Classic flak brass elevation wheel on left + hydraulic trigger lever on right
    strokeCircle(s, 42, 84, 8, 224, 180, 76, 255);
    drawLine(s, 34, 84, 50, 84, 180, 140, 56, 255, 1);
    drawLine(s, 42, 76, 42, 92, 180, 140, 56, 255, 1);
    fillRect(s, 114, 76, 4, 16, 120, 130, 144);
    fillRect(s, 111, 74, 10, 4, 235, 76, 62);
    drawGlovedHand(44, 86, -1);
    drawGlovedHand(116, 82, 1);
  } else if (cp.controlType === "flight_stick") {
    // Center-right tactical missile flight-stick + left throttle/arming deck
    fillRect(s, 36, 78, 12, 10, 40, 56, 78);
    fillRect(s, 38, 76, 8, 3, 235, 64, 72); // Red arming trigger
    drawLine(s, 118, 96, 116, 74, 58, 78, 104, 255, 5);
    fillRect(s, 114, 72, 5, 4, 88, 242, 255);
    drawGlovedHand(42, 84, -1);
    drawGlovedHand(116, 82, 1);
  } else {
    // Twin AA gunner grips / yokes with glowing fire triggers!
    for (const side of [-1, 1]) {
      const gx = side < 0 ? 40 : 120;
      // Yoke stalk & twin handle frame
      drawLine(s, gx + side * 6, 98, gx, 74, 48, 58, 74, 255, 5);
      drawLine(s, gx + side * 5, 97, gx, 74, hr, hg, hb, 255, 2);
      // Glowing fire thumb button on top of grip
      fillRect(s, gx - 2, 71, 4, 3, wr, wg, wb);
      drawGlovedHand(gx, 83, side);
    }
    // Connecting crossbar for sniper/citadel yoke
    if (cp.controlType === "sniper_yoke" || cp.controlType === "citadel_yoke") {
      fillRect(s, 44, 88, 72, 3, hr, hg, hb);
      fillRect(s, 72, 87, 16, 5, tr, tg, tb);
    }
  }

  // 8. Muzzle-Flash Interior Bounce Lighting! (Reflects weapon blast back onto inner canopy pillars, brow & hands!)
  drawLine(s, strutW + 8, 9, strutW, 65, wr, wg, wb, 140, 2);
  drawLine(s, W - strutW - 8, 9, W - strutW, 65, wr, wg, wb, 140, 2);
  drawLine(s, 28, 61, 132, 61, wr, wg, wb, 165, 2);
  drawLine(s, 36, 9, 124, 9, wr, wg, wb, 95, 1);
  // Subtle glow highlight on top of dashboard & gloved knuckles from muzzle blast outside!
  fillRect(s, 38, 80, 10, 2, wr, wg, wb, 110);
  fillRect(s, 112, 80, 10, 2, wr, wg, wb, 110);

  // Crisp outer 1px dark bezel
  strokeRect(s, 0, 0, W, H, 8, 12, 20, 1);
  return s;
}

// ============================================================================
// Generate All Assets!
// ============================================================================
const turrets = TurretModels.TURRET_LIST;
console.log(`Generating 8-bit 3D icons, 8-action sprite sheets, and cockpits for ${turrets.length} turrets...`);

// ---- 1. 8-Bit 3D Turret Icons (512x512) + 2x5 Overview ----
const iconSmallList = [];
for (const t of turrets) {
  const native = renderTurret3D(t, 80, 80, {
    yaw: 0.18, pitch: 0.36, recoilL: 0, recoilR: 0, spinAngle: 0.3, radarAngle: 0.4, petalOpen: 0.15,
  }, "none");
  iconSmallList.push(native);

  const out512 = createSurface(512, 512);
  blitNearest(out512, native, 16, 16, 6); // 80*6 = 480 centered in 512x512
  writePNG(path.join(OUT_ICONS, `${t.no}_${t.id}.png`), 512, 512, out512.data);
}

// Build 2x5 Overview Image (1540x680)
{
  const cols = 5, rows = 2;
  const cellW = 280, cellH = 304, pad = 20, topH = 44;
  const ovW = pad + cols * (cellW + pad);
  const ovH = topH + pad + rows * (cellH + pad);
  const ov = createSurface(ovW, ovH);
  fillRect(ov, 0, 0, ovW, ovH, 6, 11, 24);
  drawText(ov, "GROUND AA TURRETS - 10 TYPES 8-BIT 3D MODELS", ovW / 2, 16, 3, 110, 244, 255, "center");

  turrets.forEach((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = pad + col * (cellW + pad);
    const y = topH + pad + row * (cellH + pad);
    fillRect(ov, x, y, cellW, cellH, 10, 18, 36);
    const [ar, ag, ab] = hexToRgb(t.accentHex);
    strokeRect(ov, x, y, cellW, cellH, ar, ag, ab, 2);
    blitNearest(ov, iconSmallList[idx], x + 20, y + 12, 3); // 80*3 = 240
    drawText(ov, `${t.no}. ${t.en}`, x + cellW / 2, y + 262, 2, 235, 246, 255, "center");
    drawText(ov, t.weaponStyle.toUpperCase(), x + cellW / 2, y + 282, 2, ar, ag, ab, "center");
  });

  writePNG(path.join(OUT_ICONS, "turrets_3d_8bit_overview.png"), ovW, ovH, ov.data);
}

// ---- 2. Turret Action Sprite Sheets (8 frames x 240x240 = 1920x240) + 10x8 Showcase ----
const ACTION_POSES = [
  { key: "idle",     label: "01 IDLE",   pose: { yaw: 0.15,  pitch: 0.22, recoilL: 0,    recoilR: 0,    spinAngle: 0.0, radarAngle: 0.2, petalOpen: 0.0, explode: 0,    shake: 0 },    vfx: "none" },
  { key: "track",    label: "02 TRACK",  pose: { yaw: -0.62, pitch: 0.38, recoilL: 0,    recoilR: 0,    spinAngle: 0.4, radarAngle: 1.3, petalOpen: 0.1, explode: 0,    shake: 0 },    vfx: "track" },
  { key: "elevate",  label: "03 ELEV",   pose: { yaw: 0.22,  pitch: 0.88, recoilL: 0,    recoilR: 0,    spinAngle: 0.8, radarAngle: 2.4, petalOpen: 0.2, explode: 0,    shake: 0 },    vfx: "elevate" },
  { key: "fire",     label: "04 FIRE",   pose: { yaw: 0.22,  pitch: 0.52, recoilL: 0.55, recoilR: 0.10, spinAngle: 1.4, radarAngle: 3.1, petalOpen: 0.65, explode: 0,   shake: 0.5 },  vfx: "fire" },
  { key: "recoil",   label: "05 RECOIL", pose: { yaw: 0.22,  pitch: 0.60, recoilL: 0.15, recoilR: 0.62, spinAngle: 2.3, radarAngle: 4.0, petalOpen: 0.85, explode: 0,   shake: 0.8 },  vfx: "recoil" },
  { key: "charge",   label: "06 CHARGE", pose: { yaw: 0.18,  pitch: 0.72, recoilL: 0.18, recoilR: 0.18, spinAngle: 3.1, radarAngle: 5.0, petalOpen: 1.0,  explode: 0,   shake: 0.35 }, vfx: "charge" },
  { key: "overheat", label: "07 HEAT",   pose: { yaw: -0.15, pitch: 0.16, recoilL: 0.10, recoilR: 0.10, spinAngle: 0.2, radarAngle: 0.8, petalOpen: 0.5,  explode: 0,   shake: 0.25 }, vfx: "overheat" },
  { key: "damaged",  label: "08 BLAST",  pose: { yaw: 0.45,  pitch: 0.28, recoilL: 0.3,  recoilR: 0.3,  spinAngle: 0.0, radarAngle: 1.2, petalOpen: 0.9,  explode: 0.85, shake: 0.9 }, vfx: "damaged" },
];

const allActionFrames = []; // [turretIdx][actionIdx] = 80x80 surface
for (let ti = 0; ti < turrets.length; ti++) {
  const t = turrets[ti];
  const strip = createSurface(240 * 8, 240);
  const frames = [];
  for (let ai = 0; ai < ACTION_POSES.length; ai++) {
    const ap = ACTION_POSES[ai];
    const native = renderTurret3D(t, 80, 80, ap.pose, ap.vfx);
    frames.push(native);
    blitNearest(strip, native, ai * 240, 0, 3); // 80*3 = 240
  }
  allActionFrames.push(frames);
  writePNG(path.join(OUT_ACTIONS, `${t.no}_${t.id}_actions.png`), strip.w, strip.h, strip.data);
}

// Build Complete 10x8 Turret Actions Showcase (1560x1820)
{
  const cellW = 168, cellH = 168, gap = 8, leftW = 112, topH = 68;
  const sw = leftW + ACTION_POSES.length * (cellW + gap) + 12;
  const sh = topH + turrets.length * (cellH + gap) + 16;
  const sc = createSurface(sw, sh);
  fillRect(sc, 0, 0, sw, sh, 6, 11, 22);
  drawText(sc, "10 GROUND AA TURRETS X 8 ACTIONS - 8-BIT 3D ACTION SHEET", sw / 2, 14, 3, 110, 244, 255, "center");

  // Column headers
  for (let ai = 0; ai < ACTION_POSES.length; ai++) {
    const cx = leftW + ai * (cellW + gap) + cellW / 2;
    drawText(sc, ACTION_POSES[ai].label, cx, 44, 2, 255, 224, 112, "center");
  }

  for (let ti = 0; ti < turrets.length; ti++) {
    const t = turrets[ti];
    const ry = topH + ti * (cellH + gap);
    const [ar, ag, ab] = hexToRgb(t.accentHex);
    fillRect(sc, 10, ry, leftW - 18, cellH, 10, 18, 36);
    strokeRect(sc, 10, ry, leftW - 18, cellH, ar, ag, ab, 1);
    drawText(sc, `NO.${t.no}`, 10 + (leftW - 18) / 2, ry + 56, 2, ar, ag, ab, "center");
    drawText(sc, t.id.split("_")[0].toUpperCase(), 10 + (leftW - 18) / 2, ry + 92, 2, 225, 242, 255, "center");

    for (let ai = 0; ai < ACTION_POSES.length; ai++) {
      const cx = leftW + ai * (cellW + gap);
      fillRect(sc, cx, ry, cellW, cellH, 9, 16, 30);
      strokeRect(sc, cx, ry, cellW, cellH, 32, 92, 116, 1);
      blitNearest(sc, allActionFrames[ti][ai], cx + 4, ry + 4, 2); // 80*2 = 160 inside 168
    }
  }
  writePNG(path.join(OUT_ACTIONS, "turrets_actions_showcase.png"), sw, sh, sc.data);
}

// ---- 3. 10 Sitting-Inside Gunner Cockpits (640x400) + 2x5 Overview ----
const cockpitNativeList = [];
for (const t of turrets) {
  const native = renderTurretCockpit(t);
  cockpitNativeList.push(native);
  const out640 = createSurface(640, 400);
  blitNearest(out640, native, 0, 0, 4); // 160*4 x 100*4 = 640x400
  writePNG(path.join(OUT_COCKPITS, `${t.no}_${t.id}_cockpit.png`), 640, 400, out640.data);
}

// Build 2x5 Cockpits Overview (1740x560)
{
  const cols = 5, rows = 2;
  const cellW = 328, cellH = 236, pad = 16, topH = 46;
  const cw = pad + cols * (cellW + pad);
  const ch = topH + pad + rows * (cellH + pad);
  const ov = createSurface(cw, ch);
  fillRect(ov, 0, 0, cw, ch, 6, 11, 24);
  drawText(ov, "10 GROUND AA TURRET GUNNER COCKPITS - FIRST-PERSON 8-BIT VIEW", cw / 2, 16, 3, 110, 244, 255, "center");

  turrets.forEach((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = pad + col * (cellW + pad);
    const y = topH + pad + row * (cellH + pad);
    const [ar, ag, ab] = hexToRgb(t.accentHex);
    fillRect(ov, x, y, cellW, cellH, 10, 18, 36);
    strokeRect(ov, x, y, cellW, cellH, ar, ag, ab, 2);
    blitNearest(ov, cockpitNativeList[idx], x + 4, y + 4, 2); // 160*2 x 100*2 = 320x200
    drawText(ov, `${t.no}. ${t.en}`, x + cellW / 2, y + 214, 2, 238, 248, 255, "center");
  });

  writePNG(path.join(OUT_COCKPITS, "turrets_cockpits_overview.png"), cw, ch, ov.data);
}

console.log("Done! Exported:");
console.log(" - 10 8-bit 3D turret icons + overview -> assets/turrets_8bit/icons/");
console.log(" - 10 8-action sprite sheets + 10x8 showcase -> assets/turrets_8bit/actions/");
console.log(" - 10 seated gunner cockpit PNGs + overview -> assets/turrets_8bit/cockpits/");
