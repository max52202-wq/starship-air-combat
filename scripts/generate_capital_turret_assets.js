// ============================================================================
// scripts/generate_capital_turret_assets.js
// Zero-dependency Node.js 8-Bit 3D Rasterizer + Capital Starship Deck Scene
// + Seated Starship Turret Cockpit Pixel-Art Renderer
// Generates:
//   1. assets/capital_turrets_8bit/icons/01_...png .. 10_...png (512x512 8-bit 3D)
//      + capital_turrets_3d_8bit_overview.png (2x5 labeled overview)
//   2. assets/capital_turrets_8bit/actions/01_..._actions.png .. 10_..._actions.png (1920x240, 8 frames)
//      + capital_turrets_actions_showcase.png (10x8 labeled action matrix)
//      + capital_ship_deck_battle_actions.png (4-frame macro Capital Ship Deck + Multi-Turret Battle!)
//   3. assets/capital_turrets_8bit/cockpits/01_..._cockpit.png .. 10_..._cockpit.png (640x400 8-bit)
//      + capital_cockpits_overview.png (2x5 labeled overview)
//      + capital_cockpit_actions_showcase.png (4-frame Seated Cockpit Operation Action Strip!)
// ============================================================================

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const CapTurrets = require("../js/capital_turret_models.js");

const ROOT = path.resolve(__dirname, "..");
const OUT_ICONS = path.join(ROOT, "assets", "capital_turrets_8bit", "icons");
const OUT_ACTIONS = path.join(ROOT, "assets", "capital_turrets_8bit", "actions");
const OUT_COCKPITS = path.join(ROOT, "assets", "capital_turrets_8bit", "cockpits");

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
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
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
// Pixel Buffer Drawing Primitives & 5x5 Crisp 8-Bit Bitmap Font
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
  "+": ["00000","00100","01110","00100","00000"],
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

function makeCamera(pos, target, fovDeg = 40) {
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

function rasterizeModelInto(surf, zbuf, cam, model, pose, offset = [0, 0, 0], scale = 1, vfxMode = "none", lightDir) {
  const w = surf.w, h = surf.h;
  const explodeAmt = pose.explode || 0;
  const cleanPose = explodeAmt > 0 ? { ...pose, explode: 0 } : pose;
  const verts = CapTurrets.transformTurretVerts(model, cleanPose);

  const heatTint = vfxMode === "overheat" ? 0.44 : (vfxMode === "damaged" ? 0.26 : 0);
  const chargeBoost = vfxMode === "charge" ? 1.28 : 1.0;

  for (let fi = 0; fi < model.faces.length; fi++) {
    const f = model.faces[fi];
    const [ia, ib, ic] = f.i;
    const tag = model.vTags[ia];
    let va = [verts[ia][0] * scale + offset[0], verts[ia][1] * scale + offset[1], verts[ia][2] * scale + offset[2]];
    let vb = [verts[ib][0] * scale + offset[0], verts[ib][1] * scale + offset[1], verts[ib][2] * scale + offset[2]];
    let vc = [verts[ic][0] * scale + offset[0], verts[ic][1] * scale + offset[1], verts[ic][2] * scale + offset[2]];

    if (explodeAmt > 0 && tag !== "deck" && tag !== "base") {
      const ang = fi * 2.39996;
      const spd = 0.55 + (fi % 5) * 0.26;
      const dx = Math.cos(ang) * explodeAmt * spd * 1.4 * scale;
      const dy = (0.35 + ((fi * 7) % 10) * 0.14) * explodeAmt * 1.55 * scale;
      const dz = Math.sin(ang) * explodeAmt * spd * 1.4 * scale;
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

    const ab = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const ac = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
    const n = norm3(cross3(ab, ac));
    const view = [cam.pos[0] - va[0], cam.pos[1] - va[1], cam.pos[2] - va[2]];
    if (dot3(n, view) < -0.05) continue;

    let lum = 1.0;
    if (!f.e) {
      const ndl = Math.max(0, dot3(n, lightDir));
      const hemi = Math.max(0, n[1]) * 0.18;
      lum = 0.34 + ndl * 0.70 + hemi;
    } else {
      lum = 1.14 * chargeBoost;
    }

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
          const qLum = Math.max(0.24, Math.min(1.32, Math.round((lum + bayer) * 5) / 5));
          let r = f.c[0] * qLum;
          let g = f.c[1] * qLum;
          let b = f.c[2] * qLum;
          if (heatTint > 0 && tag !== "deck" && tag !== "base") {
            r = r * (1 - heatTint) + 255 * heatTint;
            g = g * (1 - heatTint) + 84 * heatTint;
            b = b * (1 - heatTint) + 38 * heatTint;
          }
          r = Math.min(255, Math.max(0, Math.round(r / 12) * 12));
          g = Math.min(255, Math.max(0, Math.round(g / 12) * 12));
          b = Math.min(255, Math.max(0, Math.round(b / 12) * 12));
          setPx(surf, px, py, r, g, b, 255);
        }
      }
    }
  }
}

function drawTurretVFX(surf, cam, model, pose, vfxMode, offset = [0, 0, 0], scale = 1) {
  const w = surf.w, h = surf.h;
  const getM = (idx) => {
    const p = CapTurrets.getMuzzleWorld(model, pose, idx);
    return [p[0] * scale + offset[0], p[1] * scale + offset[1], p[2] * scale + offset[2]];
  };
  const m0 = getM(0);
  const m1 = model.muzzles.length > 1 ? getM(1) : m0;
  const m2 = model.muzzles.length > 2 ? getM(2) : null;
  const pM0 = projectPoint(cam, m0, w, h);
  const pM1 = projectPoint(cam, m1, w, h);
  const pM2 = m2 ? projectPoint(cam, m2, w, h) : null;

  const yaw = pose.yaw || 0;
  const pitch = pose.pitch || 0;
  const aimDir = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const rayLen = 5.0 * scale;
  const far0 = projectPoint(cam, [m0[0] + aimDir[0] * rayLen, m0[1] + aimDir[1] * rayLen, m0[2] + aimDir[2] * rayLen], w, h);
  const far1 = projectPoint(cam, [m1[0] + aimDir[0] * rayLen, m1[1] + aimDir[1] * rayLen, m1[2] + aimDir[2] * rayLen], w, h);
  const far2 = m2 ? projectPoint(cam, [m2[0] + aimDir[0] * rayLen, m2[1] + aimDir[1] * rayLen, m2[2] + aimDir[2] * rayLen], w, h) : null;

  const [fr, fg, fb] = hexToRgb(model.fireColor);
  const [cr, cg, cb] = hexToRgb(model.coreColor);

  const drawMuzzleStar = (pt, sz) => {
    if (!pt) return;
    fillCircle(surf, pt[0], pt[1], sz, fr, fg, fb, 235);
    fillCircle(surf, pt[0], pt[1], Math.max(1.5, sz * 0.55), 255, 255, 255, 255);
    drawLine(surf, pt[0] - sz * 1.8, pt[1], pt[0] + sz * 1.8, pt[1], fr, fg, fb, 220, 1);
    drawLine(surf, pt[0], pt[1] - sz * 1.8, pt[0], pt[1] + sz * 1.8, fr, fg, fb, 220, 1);
  };

  if (vfxMode === "track" || vfxMode === "elevate") {
    if (pM0 && far0) {
      drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], cr, cg, cb, 145, 1);
      if (vfxMode === "elevate") {
        strokeCircle(surf, far0[0], far0[1], 4, 255, 232, 92, 235);
        setPx(surf, far0[0], far0[1], 255, 76, 92, 255);
      }
    }
  } else if (vfxMode === "fire" || vfxMode === "recoil") {
    const isRecoil = vfxMode === "recoil";
    const style = model.weaponStyle;
    if (style === "quad_laser") {
      drawMuzzleStar(pM0, isRecoil ? 3.0 : 4.2);
      drawMuzzleStar(pM1, isRecoil ? 4.2 : 3.2);
      if (pM0 && far0) {
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 72, 240, 255, 235, 3);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 255, 255, 255, 1);
      }
      if (pM1 && far1) {
        drawLine(surf, pM1[0], pM1[1], far1[0], far1[1], 72, 240, 255, 235, 3);
        drawLine(surf, pM1[0], pM1[1], far1[0], far1[1], 255, 255, 255, 255, 1);
      }
    } else if (style === "turbolaser") {
      const sp = isRecoil ? pM1 : pM0;
      const fp = isRecoil ? far1 : far0;
      drawMuzzleStar(sp, 5.0);
      if (sp && fp) {
        drawLine(surf, sp[0], sp[1], fp[0], fp[1], 255, 168, 42, 230, 5);
        drawLine(surf, sp[0], sp[1], fp[0], fp[1], 255, 248, 175, 255, 2);
      }
    } else if (style === "triple_macro") {
      for (const [sp, fp, sz] of [[pM0, far0, isRecoil ? 3.2 : 4.6], [pM1, far1, isRecoil ? 4.8 : 3.4], [pM2, far2, isRecoil ? 4.4 : 4.0]]) {
        if (!sp || !fp) continue;
        drawMuzzleStar(sp, sz);
        drawLine(surf, sp[0], sp[1], fp[0], fp[1], 255, 130, 48, 225, 3);
        drawLine(surf, sp[0], sp[1], fp[0], fp[1], 255, 242, 160, 255, 1);
      }
    } else if (style === "ciws_gatling") {
      drawMuzzleStar(pM0, isRecoil ? 3.2 : 4.4);
      drawMuzzleStar(pM1, isRecoil ? 4.4 : 3.2);
      if (pM0 && far0) drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 235, 110, 240, 2);
      if (pM1 && far1) drawLine(surf, pM1[0], pM1[1], far1[0], far1[1], 255, 190, 62, 240, 2);
    } else if (style === "broadside_plasma") {
      for (const [sp, fp, t] of [[pM0, far0, isRecoil ? 0.85 : 0.55], [pM1, far1, isRecoil ? 0.55 : 0.85]]) {
        if (!sp || !fp) continue;
        drawMuzzleStar(sp, 4.0);
        const bx = sp[0] + (fp[0] - sp[0]) * t;
        const by = sp[1] + (fp[1] - sp[1]) * t;
        fillCircle(surf, bx, by, 4.8, 255, 110, 28, 235);
        fillCircle(surf, bx, by, 2.8, 255, 224, 92, 255);
        fillCircle(surf, bx, by, 1.3, 255, 255, 255, 255);
      }
    } else if (style === "railgun") {
      if (pM0 && far0) {
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 92, 206, 255, 235, 4);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 255, 255, 255, 2);
        for (const t of [0.25, 0.58, 0.88]) {
          const rx = pM0[0] + (far0[0] - pM0[0]) * t;
          const ry = pM0[1] + (far0[1] - pM0[1]) * t;
          strokeCircle(surf, rx, ry, 2.4 + t * 3.8, 150, 238, 255, 235);
        }
      }
    } else if (style === "photon_torpedo") {
      for (const [sp, fp, off] of [[pM0, far0, -4], [pM1, far1, 4]]) {
        if (!sp || !fp) continue;
        const mx = (sp[0] + fp[0]) * 0.5 + off;
        const my = (sp[1] + fp[1]) * 0.5 - 3;
        drawLine(surf, sp[0], sp[1], mx, my, 255, 112, 134, 210, 2);
        drawLine(surf, mx, my, fp[0], fp[1], 255, 210, 225, 240, 2);
        fillCircle(surf, sp[0], sp[1], 3.2, 255, 88, 112, 235);
        fillCircle(surf, fp[0], fp[1], 3.2, 255, 96, 128, 245);
        fillCircle(surf, fp[0], fp[1], 1.5, 255, 255, 255, 255);
      }
    } else if (style === "space_flak") {
      const sp = isRecoil ? pM1 : pM0;
      const fp = isRecoil ? far1 : far0;
      drawMuzzleStar(sp, 4.8);
      if (sp && fp) {
        drawLine(surf, sp[0], sp[1], fp[0], fp[1], 255, 186, 76, 225, 2);
        fillCircle(surf, fp[0], fp[1], 5.6, 46, 50, 62, 225);
        fillCircle(surf, fp[0] - 2, fp[1] - 1, 3.4, 255, 152, 48, 250);
        fillCircle(surf, fp[0] + 2, fp[1] + 1, 2.2, 255, 244, 145, 255);
      }
    } else if (style === "aegis_arc") {
      if (pM0 && far0) {
        const drawBolt = (sx, sy, ex, ey, seed) => {
          let px = sx, py = sy;
          for (let k = 1; k <= 5; k++) {
            const t = k / 5;
            const nx = sx + (ex - sx) * t + (k < 5 ? Math.sin(k * 9 + seed) * 5 : 0);
            const ny = sy + (ey - sy) * t + (k < 5 ? Math.cos(k * 7 + seed) * 4 : 0);
            drawLine(surf, px, py, nx, ny, 168, 128, 255, 235, 3);
            drawLine(surf, px, py, nx, ny, 180, 252, 255, 255, 1);
            px = nx; py = ny;
          }
        };
        drawBolt(pM0[0], pM0[1], far0[0], far0[1], isRecoil ? 2.4 : 0.6);
        drawBolt(pM0[0], pM0[1], far0[0] - 7, far0[1] + 5, isRecoil ? 5.1 : 3.2);
        fillCircle(surf, pM0[0], pM0[1], 4.5, 154, 245, 255, 230);
      }
    } else if (style === "yamato_nova") {
      if (pM0 && far0) {
        const bw = isRecoil ? 8 : 6;
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 218, 86, 200, bw + 3);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 88, 246, 255, 255, bw);
        drawLine(surf, pM0[0], pM0[1], far0[0], far0[1], 255, 255, 255, 255, Math.max(2, bw - 3));
        drawMuzzleStar(pM0, 6.2);
      }
    }
  } else if (vfxMode === "charge") {
    const ctr = projectPoint(cam, [offset[0], offset[1] + model.pivotY * scale, offset[2]], w, h);
    if (ctr) {
      strokeCircle(surf, ctr[0], ctr[1], 19, cr, cg, cb, 225);
      strokeCircle(surf, ctr[0], ctr[1], 14, fr, fg, fb, 190);
    }
    if (pM0) {
      fillCircle(surf, pM0[0], pM0[1], 4.8, fr, fg, fb, 230);
      fillCircle(surf, pM0[0], pM0[1], 2.5, 255, 255, 255, 255);
    }
  } else if (vfxMode === "overheat") {
    for (let k = 0; k < 7; k++) {
      const sx = w * 0.34 + (k % 3) * (w * 0.16) + Math.sin(k * 4) * 3;
      const sy = h * 0.36 - k * 3.2;
      fillCircle(surf, sx, sy, 3.6 + (k % 2), 232, 242, 252, 175);
      fillCircle(surf, sx - 1, sy + 1, 2.0, 255, 152, 72, 165);
    }
  } else if (vfxMode === "damaged") {
    const ctr = projectPoint(cam, [offset[0], offset[1] + 2.2 * scale, offset[2] + 0.2 * scale], w, h) || [w * 0.5, h * 0.5];
    // Shattering cyan starship shield arc + hull impact blast!
    strokeCircle(surf, ctr[0], ctr[1], 22, 86, 232, 255, 190);
    fillCircle(surf, ctr[0], ctr[1], 13, 255, 88, 36, 225);
    fillCircle(surf, ctr[0] - 4, ctr[1] - 3, 8, 255, 198, 58, 240);
    fillCircle(surf, ctr[0] + 5, ctr[1] + 2, 7, 255, 130, 42, 230);
    fillCircle(surf, ctr[0], ctr[1] - 1, 4.5, 255, 255, 235, 255);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.3;
      const r = 13 + (k % 3) * 5;
      fillCircle(surf, ctr[0] + Math.cos(a) * r, ctr[1] + Math.sin(a) * r, 2.2, k % 2 ? 255 : 70, k % 2 ? 220 : 190, k % 2 ? 80 : 255, 230);
    }
  }
}

function renderTurret3D(model, w, h, pose, vfxMode = "none") {
  const surf = createSurface(w, h);
  const zbuf = new Float32Array(w * h).fill(1e9);
  const cam = makeCamera([-8.3, 6.6, 9.5], [0.2, 2.15, 0.45], 40);
  const lightDir = norm3([-0.55, 0.78, 0.45]);

  rasterizeModelInto(surf, zbuf, cam, model, pose, [0, 0, 0], 1.0, vfxMode, lightDir);

  // Crisp 1px dark pixel-art outline around solid silhouette
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (zbuf[i] < 1e8) mask[i] = 1;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      if (mask[i - 1] || mask[i + 1] || mask[i - w] || mask[i + w]) {
        setPx(surf, x, y, 8, 12, 24, 255);
      }
    }
  }

  drawTurretVFX(surf, cam, model, pose, vfxMode, [0, 0, 0], 1.0);
  return surf;
}

// ============================================================================
// BONUS MACRO SCENE: Large Capital Starship Armored Deck w/ 3 Active Turrets!
// Renders a 4-frame 8-bit 3D action sequence of turrets firing ON a starship!
// ============================================================================
function renderCapitalDeckBattleFrame(stage) {
  // Native 180x110 -> scaled 2x to 360x220 per frame!
  const W = 180, H = 110;
  const surf = createSurface(W, H);
  const zbuf = new Float32Array(W * H).fill(1e9);

  // 1. Deep space nebula + planet + starfield backdrop
  for (let y = 0; y < H; y++) {
    const t = y / H;
    fillRect(surf, 0, y, W, 1, Math.round(5 + t * 8), Math.round(9 + t * 14), Math.round(22 + t * 24));
  }
  // Glowing blue planet horizon in upper left
  fillCircle(surf, 28, 22, 16, 26, 78, 148, 255);
  fillCircle(surf, 24, 18, 13, 46, 134, 206, 255);
  fillCircle(surf, 22, 15, 7, 94, 198, 242, 200);
  strokeCircle(surf, 28, 22, 17, 110, 232, 255, 160);
  // Crisp stars
  for (const [sx, sy, c] of [
    [12, 8, 255], [56, 12, 220], [74, 6, 255], [96, 15, 190], [118, 9, 255],
    [142, 14, 210], [164, 7, 255], [64, 28, 180], [134, 24, 220], [170, 29, 240],
    [48, 40, 200], [156, 44, 210], [10, 48, 180],
  ]) {
    setPx(surf, sx, sy, c, c, 255);
  }

  // Incoming Space Zerg Flyers on upper-right!
  const zergOff = stage === 0 ? 12 : (stage === 1 ? 6 : (stage === 2 ? 0 : -4));
  const drawSpaceZerg = (zx, zy, big = false) => {
    const s = big ? 2 : 1;
    fillRect(surf, zx - 4 * s, zy - s, 3 * s, 2 * s, 164, 34, 62);
    fillRect(surf, zx + 2 * s, zy - s, 3 * s, 2 * s, 164, 34, 62);
    fillRect(surf, zx - s, zy - 2 * s, 3 * s, 4 * s, 212, 56, 84);
    fillRect(surf, zx, zy, s, s, 118, 255, 110);
  };
  drawSpaceZerg(138 + zergOff, 22, true);
  drawSpaceZerg(118 + zergOff, 14, false);
  drawSpaceZerg(158 + zergOff, 34, false);
  if (stage >= 2) {
    // Explosion burst on Zerg hit!
    fillCircle(surf, 138 + zergOff, 22, stage === 3 ? 9 : 6, 255, 124, 42, 235);
    fillCircle(surf, 138 + zergOff, 22, stage === 3 ? 5 : 3, 255, 248, 165, 255);
  }

  // 2. Massive Capital Starship Hull Deck Geometry (in 3D perspective!)
  const cam = makeCamera([-12.5, 9.2, 13.5], [1.2, 1.8, -0.5], 38);
  const lightDir = norm3([-0.55, 0.78, 0.45]);

  // Draw huge angled Federation Capital Starship hull slab beneath the 3 turrets!
  const drawDeckQuad3D = (pts3d, r, g, b) => {
    const p2 = pts3d.map((p) => projectPoint(cam, p, W, H));
    if (p2.some((p) => !p)) return;
    fillPoly(surf, p2.map((p) => [p[0], p[1]]), r, g, b, 255);
  };
  // Giant Starship Hull Outer Armor Wing & Deck
  drawDeckQuad3D([[-14, -0.3, -9], [14, -0.3, -9], [16, -0.3, 9], [-12, -0.3, 9]], 30, 44, 68);
  drawDeckQuad3D([[-11, 0.0, -7], [11, 0.0, -7], [13, 0.0, 7], [-9, 0.0, 7]], 48, 68, 98);
  // Gold Fleet Hull Trim Bands
  drawDeckQuad3D([[-10, 0.04, 5.2], [11, 0.04, 5.2], [11.4, 0.04, 6.2], [-9.6, 0.04, 6.2]], 224, 178, 58);
  drawDeckQuad3D([[-10, 0.04, -5.8], [10.5, 0.04, -5.8], [10.5, 0.04, -4.9], [-10, 0.04, -4.9]], 224, 178, 58);
  // Glowing Cyan Reactor Spine Trench running between turrets!
  drawDeckQuad3D([[-10.5, 0.05, -0.45], [11.5, 0.05, -0.45], [11.5, 0.05, 0.45], [-10.5, 0.05, 0.45]], 74, 238, 255);
  // Distant Capital Ship Bridge Tower at rear-left!
  drawDeckQuad3D([[-11.5, 0.0, -4.2], [-7.5, 0.0, -4.2], [-7.5, 4.6, -4.2], [-11.5, 4.6, -4.2]], 56, 78, 110);
  drawDeckQuad3D([[-11.5, 4.6, -4.2], [-7.5, 4.6, -4.2], [-7.5, 4.6, -1.5], [-11.5, 4.6, -1.5]], 104, 134, 168);
  drawDeckQuad3D([[-8.2, 2.8, -1.4], [-7.5, 2.8, -1.4], [-7.5, 3.6, -1.4], [-8.2, 3.6, -1.4]], 94, 246, 255);

  // 3. Three Distinct 3D Starship Turrets Mounted on the Capital Ship Deck!
  const tQuad   = CapTurrets.getTurret("quad_laser_dome");
  const tMacro  = CapTurrets.getTurret("triple_macro_cannon");
  const tYamato = CapTurrets.getTurret("yamato_nova_citadel");

  const yawBase = stage === 0 ? 0.15 : (stage === 1 ? 0.85 : 1.05);
  const pitchBase = stage === 0 ? 0.18 : (stage === 1 ? 0.48 : (stage === 2 ? 0.56 : 0.64));
  const vfxQuad   = stage === 0 ? "none" : (stage === 1 ? "track" : "fire");
  const vfxMacro  = stage === 0 ? "none" : (stage === 1 ? "elevate" : (stage === 2 ? "recoil" : "fire"));
  const vfxYamato = stage === 0 ? "none" : (stage === 1 ? "track" : (stage === 2 ? "charge" : "none"));

  const placements = [
    { m: tYamato, pos: [-3.2, 0.05, -2.5], sc: 0.92, vfx: vfxYamato, pose: { yaw: yawBase, pitch: pitchBase, recoilL: stage === 3 ? 0.45 : 0, recoilR: 0, petalOpen: stage >= 2 ? 0.95 : 0.1, corePulse: stage >= 2 ? 0.85 : 0.1, radarAngle: stage * 1.2 } },
    { m: tMacro,  pos: [ 2.6, 0.05, -1.8], sc: 0.86, vfx: vfxMacro,  pose: { yaw: yawBase + 0.12, pitch: pitchBase + 0.05, recoilL: stage === 2 ? 0.5 : 0, recoilM: stage === 3 ? 0.6 : 0, recoilR: stage === 2 ? 0.2 : 0.4, radarAngle: stage * 1.5 } },
    { m: tQuad,   pos: [ 5.8, 0.05,  2.4], sc: 0.82, vfx: vfxQuad,   pose: { yaw: yawBase + 0.18, pitch: pitchBase + 0.10, recoilL: stage === 2 ? 0.5 : 0.1, recoilR: stage === 3 ? 0.5 : 0.1, radarAngle: stage * 2.0 } },
  ];

  for (const pl of placements) {
    rasterizeModelInto(surf, zbuf, cam, pl.m, pl.pose, pl.pos, pl.sc, pl.vfx, lightDir);
  }
  for (const pl of placements) {
    drawTurretVFX(surf, cam, pl.m, pl.pose, pl.vfx, pl.pos, pl.sc);
  }

  // Stage 3 dramatic single Yamato Nova beam flare straight into the Zerg boss!
  if (stage === 3) {
    const mY = CapTurrets.getMuzzleWorld(tYamato, placements[0].pose, 0);
    const pStart = projectPoint(cam, [mY[0] * 0.92 - 3.2, mY[1] * 0.92 + 0.05, mY[2] * 0.92 - 2.5], W, H);
    if (pStart) {
      drawLine(surf, pStart[0], pStart[1], 138 + zergOff, 22, 255, 224, 92, 210, 9);
      drawLine(surf, pStart[0], pStart[1], 138 + zergOff, 22, 92, 248, 255, 255, 5);
      drawLine(surf, pStart[0], pStart[1], 138 + zergOff, 22, 255, 255, 255, 255, 2);
      fillCircle(surf, pStart[0], pStart[1], 6.5, 92, 248, 255, 240);
      fillCircle(surf, pStart[0], pStart[1], 3.2, 255, 255, 255, 255);
    }
  }

  strokeRect(surf, 0, 0, W, H, 12, 22, 42, 1);
  return surf;
}

// ============================================================================
// 8-Bit Sitting-Inside Starship Turret Gunner Cockpit Renderer (160x100 -> 640x400!)
// Shows: Deep Space + Giant Federation Capital Starship Hull outside the glass
// + Turret Barrels Firing + Bespoke Space Dome Canopy + Gloved Hands on Yokes
// + Capital Ship Tactical Radar!
// Supports optional `actionState`: "combat" (default), "scan", "lock", "fire", "overheat"
// ============================================================================
function renderCapitalTurretCockpit(model, actionState = "combat") {
  const W = 160, H = 100;
  const s = createSurface(W, H);
  const cp = model.cockpit;
  const [fr, fg, fb] = hexToRgb(cp.frameCol);
  const [hr, hg, hb] = hexToRgb(cp.frameHi);
  const [tr, tg, tb] = hexToRgb(cp.trimCol);
  const [ur, ug, ub] = hexToRgb(cp.hudCol);
  const [wr, wg, wb] = hexToRgb(model.fireColor);

  const isScan = actionState === "scan";
  const isLock = actionState === "lock";
  const isFire = actionState === "combat" || actionState === "fire";
  const isOverheat = actionState === "overheat";
  const aimX = isScan ? 66 : (isOverheat ? 88 : 80);
  const aimY = isScan ? 30 : (isOverheat ? 36 : 33);

  // 1. Deep Space Starfield + Solar System Planet / Nebula Outside Canopy!
  const SPACE_THEMES = {
    earth_orbit:        { top: [4, 10, 28],  bot: [12, 34, 72],  pCol: [38, 124, 210], pHi: [108, 214, 255], px: 118, py: 38, pr: 24, ring: false },
    mars_orbit:         { top: [14, 8, 22],  bot: [46, 22, 28],  pCol: [188, 76, 48],  pHi: [242, 134, 88],  px: 42,  py: 36, pr: 20, ring: false },
    jupiter_storm:      { top: [12, 10, 26], bot: [42, 30, 44],  pCol: [198, 136, 86], pHi: [242, 198, 140], px: 122, py: 42, pr: 28, ring: false },
    asteroid_belt:      { top: [6, 10, 22],  bot: [20, 28, 48],  pCol: [104, 112, 126],pHi: [162, 174, 192], px: 46,  py: 30, pr: 12, ring: false },
    venus_nebula:       { top: [18, 10, 28], bot: [64, 34, 42],  pCol: [218, 166, 72], pHi: [255, 222, 132], px: 116, py: 36, pr: 22, ring: false },
    deep_void:          { top: [3, 6, 18],   bot: [12, 24, 56],  pCol: [58, 92, 168],  pHi: [124, 196, 255], px: 38,  py: 28, pr: 16, ring: false },
    saturn_rings:       { top: [8, 10, 28],  bot: [28, 30, 62],  pCol: [210, 178, 114],pHi: [248, 224, 168], px: 116, py: 34, pr: 15, ring: true },
    carrier_launch:     { top: [6, 12, 30],  bot: [20, 40, 74],  pCol: [48, 148, 212], pHi: [142, 232, 255], px: 44,  py: 34, pr: 18, ring: false },
    neptune_aurora:     { top: [8, 12, 36],  bot: [26, 24, 72],  pCol: [58, 112, 232], pHi: [132, 238, 255], px: 118, py: 34, pr: 20, ring: false },
    earth_final_battle: { top: [6, 10, 32],  bot: [26, 36, 78],  pCol: [42, 132, 222], pHi: [126, 228, 255], px: 80,  py: 48, pr: 30, ring: false },
  };
  const sp = SPACE_THEMES[cp.spaceTheme] || SPACE_THEMES.earth_orbit;
  for (let y = 0; y < 68; y++) {
    const t = y / 68;
    fillRect(
      s, 0, y, W, 1,
      Math.round(sp.top[0] + (sp.bot[0] - sp.top[0]) * t),
      Math.round(sp.top[1] + (sp.bot[1] - sp.top[1]) * t),
      Math.round(sp.top[2] + (sp.bot[2] - sp.top[2]) * t)
    );
  }
  // Distant Starfield
  for (const [sx, sy, br] of [
    [22, 14, 255], [34, 22, 180], [48, 12, 240], [62, 19, 200], [74, 11, 255],
    [92, 16, 210], [108, 12, 255], [128, 15, 220], [138, 24, 185], [56, 36, 175],
    [98, 28, 230], [32, 38, 210], [134, 42, 190], [84, 22, 170],
  ]) {
    setPx(s, sx, sy, br, br, 255);
  }
  // Planet / Saturn Ring visible in space!
  fillCircle(s, sp.px, sp.py, sp.pr, sp.pCol[0], sp.pCol[1], sp.pCol[2]);
  fillCircle(s, sp.px - Math.round(sp.pr * 0.25), sp.py - Math.round(sp.pr * 0.2), Math.round(sp.pr * 0.72), sp.pHi[0], sp.pHi[1], sp.pHi[2], 145);
  strokeCircle(s, sp.px, sp.py, sp.pr + 1, sp.pHi[0], sp.pHi[1], sp.pHi[2], 120);
  if (sp.ring) {
    drawLine(s, sp.px - 28, sp.py + 8, sp.px + 28, sp.py - 8, 236, 206, 146, 210, 3);
    drawLine(s, sp.px - 26, sp.py + 7, sp.px + 26, sp.py - 7, 255, 242, 202, 230, 1);
  }

  // 2. MASSIVE FEDERATION CAPITAL STARSHIP HULL DECK OUTSIDE THE COCKPIT WINDOW!
  // This makes it unmistakably clear you are sitting INSIDE a turret ON a huge starship!
  const hs = cp.hullStyle;
  if (hs === "broadside_flank") {
    // Huge starship dorsal hull flank stretching along the left side!
    fillPoly(s, [[0, 68], [0, 26], [34, 44], [54, 68]], 46, 62, 88);
    fillPoly(s, [[0, 68], [0, 34], [28, 48], [44, 68]], 76, 100, 134);
    drawLine(s, 0, 30, 48, 65, 232, 186, 68, 255, 2); // Gold hull flank stripe
    drawLine(s, 0, 38, 38, 66, 82, 240, 255, 240, 2); // Glowing cyan flank conduit
  } else if (hs === "flagship_wings") {
    // Iconic Capital Ship Golden Wings & Twin Prow extending into space below!
    fillPoly(s, [[14, 68], [32, 50], [54, 52], [44, 68]], 54, 80, 122);
    fillPoly(s, [[146, 68], [128, 50], [106, 52], [116, 68]], 54, 80, 122);
    drawLine(s, 22, 56, 52, 53, 244, 196, 68, 255, 2);
    drawLine(s, 138, 56, 108, 53, 244, 196, 68, 255, 2);
    // Glowing flagship reactor vents on deck wings
    fillRect(s, 36, 56, 8, 3, 86, 246, 255);
    fillRect(s, 116, 56, 8, 3, 86, 246, 255);
  } else {
    // Panoramic Capital Starship Armored Fore-Deck / Runway / Prow stretching toward the horizon!
    fillPoly(s, [[0, 68], [18, 54], [62, 58], [98, 58], [142, 54], [160, 68]], 42, 58, 84);
    fillPoly(s, [[16, 68], [30, 56], [66, 59], [94, 59], [130, 56], [144, 68]], 68, 92, 126);
    // Perspective gold deck markings & cyan runway/conduit strips converging forward!
    drawLine(s, 26, 66, 46, 57, 232, 186, 68, 235, 1);
    drawLine(s, 134, 66, 114, 57, 232, 186, 68, 235, 1);
    drawLine(s, 42, 66, 58, 58, 82, 240, 255, 225, 1);
    drawLine(s, 118, 66, 102, 58, 82, 240, 255, 225, 1);
    // Distant sister turret silhouette on the starboard capital deck firing a tiny laser!
    fillRect(s, 122, 51, 8, 4, 88, 114, 148);
    drawLine(s, 126, 51, 134, 42, 118, 148, 182, 255, 1);
    if (isFire) drawLine(s, 134, 42, 144, 28, 88, 242, 255, 185, 1);
  }
  // Distant Friendly Federation Escort Fighter flying past!
  fillRect(s, 34, 24, 5, 2, 148, 186, 224);
  setPx(s, 36, 25, 92, 246, 255);

  // 3. Incoming Space Zerg Enemies (Brood Lord + Mutalisk Escorts!)
  const drawSpaceZerg = (zx, zy, sc, locked) => {
    fillRect(s, zx - 4 * sc, zy - 1, 3 * sc, 2, 168, 36, 62);
    fillRect(s, zx + 2 * sc, zy - 1, 3 * sc, 2, 168, 36, 62);
    fillRect(s, zx - 1, zy - 2, 3, 4, 214, 62, 82);
    setPx(s, zx, zy, 126, 255, 112);
    if (locked) {
      const r = 7;
      const lc = isLock || isFire ? [255, 86, 98] : [255, 232, 86];
      drawLine(s, zx - r, zy - r, zx - r + 3, zy - r, lc[0], lc[1], lc[2]);
      drawLine(s, zx - r, zy - r, zx - r, zy - r + 3, lc[0], lc[1], lc[2]);
      drawLine(s, zx + r, zy - r, zx + r - 3, zy - r, lc[0], lc[1], lc[2]);
      drawLine(s, zx + r, zy - r, zx + r, zy - r + 3, lc[0], lc[1], lc[2]);
      drawLine(s, zx - r, zy + r, zx - r + 3, zy + r, lc[0], lc[1], lc[2]);
      drawLine(s, zx - r, zy + r, zx - r, zy + r - 3, lc[0], lc[1], lc[2]);
      drawLine(s, zx + r, zy + r, zx + r - 3, zy + r, lc[0], lc[1], lc[2]);
      drawLine(s, zx + r, zy + r, zx + r, zy + r - 3, lc[0], lc[1], lc[2]);
    }
  };
  drawSpaceZerg(80, 33, 2, !isScan);
  drawSpaceZerg(48, 25, 1, isScan);
  drawSpaceZerg(114, 24, 1, false);

  // 4. Turret's OWN Weapon Barrels & Live Space Fire Outside the Dome!
  const bs = cp.barrelStyle;
  const rec = isFire ? 2 : 0;
  if (bs === "quad_laser") {
    // 4 Quad Laser Barrels flanking the bubble turret (upper & lower pairs!)
    for (const side of [-1, 1]) {
      for (const dy of [-8, 4]) {
        const bx = side < 0 ? 18 : 142;
        const ex = side < 0 ? 48 + rec : 112 - rec;
        const by = 56 + dy;
        const ey = 38 + dy * 0.45;
        drawLine(s, bx, by, ex, ey, 68, 90, 122, 255, 4);
        drawLine(s, bx, by - 1, ex, ey - 1, 134, 166, 202, 255, 2);
        // Gold cooling collar
        drawLine(s, (bx + ex) * 0.5, (by + ey) * 0.5 - 1, (bx + ex) * 0.5 + side * 2, (by + ey) * 0.5 + 1, 232, 186, 68, 255, 3);
        if (isFire) {
          fillCircle(s, ex, ey, 3.6, 82, 246, 255, 235);
          fillCircle(s, ex, ey, 1.6, 255, 255, 255, 255);
          drawLine(s, ex, ey, aimX, aimY, 82, 246, 255, 235, 2);
          drawLine(s, ex, ey, aimX, aimY, 255, 255, 255, 255, 1);
        } else if (isOverheat) {
          fillCircle(s, ex, ey, 3.2, 255, 112, 48, 210);
          fillCircle(s, ex + side * 2, ey - 4, 2.5, 230, 238, 250, 170);
        }
      }
    }
  } else if (bs === "twin_turbolaser") {
    for (const side of [-1, 1]) {
      const bx = 80 + side * 38;
      const ex = 80 + side * 15;
      drawLine(s, bx, 68, ex, 42 + rec, 56, 74, 102, 255, 8);
      drawLine(s, bx, 67, ex, 41 + rec, 124, 152, 188, 255, 3);
      drawLine(s, (bx + ex) * 0.5, 53, (bx + ex) * 0.5 + side * 3, 55, 238, 186, 64, 255, 3);
    }
    if (isFire) {
      fillCircle(s, 65, 41, 5.2, 255, 174, 48, 235);
      fillCircle(s, 65, 41, 2.5, 255, 255, 220, 255);
      drawLine(s, 65, 41, 80, 33, 255, 198, 72, 240, 3);
      drawLine(s, 65, 41, 80, 33, 255, 255, 255, 255, 1);
    }
  } else if (bs === "triple_macro") {
    for (const [bx, ex, ey] of [[34, 60, 44], [80, 80, 46], [126, 100, 44]]) {
      drawLine(s, bx, 68, ex, ey, 54, 68, 92, 255, 7);
      drawLine(s, bx, 67, ex, ey - 1, 124, 148, 180, 255, 3);
      fillRect(s, ex - 3, ey - 2, 6, 4, 232, 184, 64);
    }
    if (isFire) {
      for (const [ex, ey] of [[60, 44], [80, 46], [100, 44]]) {
        fillCircle(s, ex, ey, 4.4, 255, 134, 48, 235);
        fillCircle(s, ex, ey, 2.0, 255, 255, 220, 255);
        drawLine(s, ex, ey, 80, 33, 255, 186, 72, 225, 2);
      }
    }
  } else if (bs === "ciws_gatling") {
    for (const side of [-1, 1]) {
      const bx = side < 0 ? 22 : 138;
      const ex = side < 0 ? 52 : 108;
      drawLine(s, bx, 64, ex, 42, 54, 66, 84, 255, 7);
      drawLine(s, bx, 62, ex, 40, 118, 138, 166, 255, 3);
      drawLine(s, (bx + ex) * 0.5 - 2, 50, (bx + ex) * 0.5 + 2, 54, 244, 198, 62, 255, 3);
      if (isFire) {
        fillCircle(s, ex, 41, 4.2, 255, 218, 72, 235);
        fillCircle(s, ex, 41, 2.0, 255, 255, 255, 255);
        drawLine(s, ex, 41, 80, 33, 255, 236, 112, 235, 1);
      }
    }
  } else if (bs === "broadside_plasma") {
    for (const side of [-1, 1]) {
      const bx = 80 + side * 42;
      const ex = 80 + side * 18;
      drawLine(s, bx, 68, ex, 43, 66, 76, 106, 255, 8);
      drawLine(s, bx, 66, ex, 42, 255, 132, 48, 255, 2);
      if (isFire) {
        fillCircle(s, ex, 42, 4.6, 255, 118, 32, 235);
        fillCircle(s, ex, 42, 2.2, 255, 240, 120, 255);
      }
    }
    if (isFire) {
      fillCircle(s, 72, 37, 4.2, 255, 124, 38, 240);
      fillCircle(s, 72, 37, 2.0, 255, 246, 165, 255);
      fillCircle(s, 88, 35, 3.6, 255, 124, 38, 230);
    }
  } else if (bs === "railgun") {
    fillPoly(s, [[40, 68], [56, 68], [76, 40], [72, 40]], 116, 146, 184);
    fillPoly(s, [[120, 68], [104, 68], [84, 40], [88, 40]], 116, 146, 184);
    drawLine(s, 54, 65, 76, 40, 88, 212, 255, 255, 2);
    drawLine(s, 106, 65, 84, 40, 88, 212, 255, 255, 2);
    if (isFire) {
      drawLine(s, 80, 58, 80, 33, 128, 224, 255, 255, 4);
      drawLine(s, 80, 58, 80, 33, 255, 255, 255, 255, 2);
      strokeCircle(s, 80, 44, 6, 150, 238, 255, 230);
    }
  } else if (bs === "torpedo_pods") {
    for (const side of [-1, 1]) {
      const px = side < 0 ? 14 : 122;
      fillRect(s, px, 41, 24, 24, 48, 74, 114);
      strokeRect(s, px, 41, 24, 24, 232, 186, 68);
      for (const ox of [6, 16]) for (const oy of [6, 15]) {
        fillCircle(s, px + ox, 41 + oy, 3, 22, 34, 52);
        fillCircle(s, px + ox, 41 + oy, 1.6, 255, 86, 112);
      }
    }
    if (isFire) {
      drawLine(s, 28, 46, 56, 38, 255, 110, 142, 225, 2);
      drawLine(s, 56, 38, 78, 33, 255, 220, 235, 250, 2);
      fillCircle(s, 28, 46, 4.2, 255, 110, 128, 235);
      fillCircle(s, 78, 33, 3.0, 255, 255, 255, 255);
    }
  } else if (bs === "quad_flak") {
    for (const side of [-1, 1]) {
      for (const dy of [-7, 3]) {
        const bx = 80 + side * 40;
        const ex = 80 + side * 18;
        drawLine(s, bx, 64 + dy, ex, 42 + dy * 0.5, 76, 90, 110, 255, 5);
        drawLine(s, bx, 63 + dy, ex, 41 + dy * 0.5, 142, 158, 178, 255, 2);
      }
    }
    if (isFire) {
      fillCircle(s, 62, 39, 4.5, 255, 166, 54, 235);
      fillCircle(s, 80, 33, 6.0, 48, 52, 66, 210);
      fillCircle(s, 79, 32, 3.5, 255, 154, 48, 245);
      fillCircle(s, 81, 33, 1.8, 255, 248, 165, 255);
    }
  } else if (bs === "aegis_prongs") {
    for (const side of [-1, 1]) {
      fillPoly(s, [[80 + side * 46, 68], [80 + side * 34, 68], [80 + side * 15, 42], [80 + side * 21, 40]], 204, 226, 252);
      drawLine(s, 80 + side * 36, 65, 80 + side * 16, 42, 124, 248, 255, 255, 2);
    }
    fillCircle(s, 80, 44, 4.5, 134, 248, 255, 245);
    if (isFire) {
      drawLine(s, 80, 42, 74, 37, 174, 130, 255, 240, 2);
      drawLine(s, 74, 37, 80, 33, 180, 252, 255, 255, 1);
      drawLine(s, 80, 42, 87, 36, 174, 130, 255, 240, 2);
      drawLine(s, 87, 36, 80, 33, 180, 252, 255, 255, 1);
    }
  } else if (bs === "yamato_petals") {
    for (const [ox, oy] of [[-24, -12], [24, -12], [-28, 14], [28, 14]]) {
      drawLine(s, 80 + ox * 1.4, 58 + oy * 0.6, 80 + ox * 0.55, 42 + oy * 0.35, 62, 94, 146, 255, 5);
      drawLine(s, 80 + ox * 1.3, 57 + oy * 0.6, 80 + ox * 0.55, 42 + oy * 0.35, 244, 196, 68, 255, 2);
    }
    if (isFire) {
      drawLine(s, 80, 46, 80, 20, 255, 224, 88, 225, 7);
      drawLine(s, 80, 46, 80, 20, 96, 248, 255, 255, 4);
      drawLine(s, 80, 46, 80, 20, 255, 255, 255, 255, 2);
    }
  }

  // Overheat / Shield Impact glass effect for Cockpit Action Strip!
  if (isOverheat) {
    strokeCircle(s, 80, 34, 24, 86, 232, 255, 180);
    strokeCircle(s, 80, 34, 18, 255, 96, 72, 165);
    fillRect(s, 18, 10, 124, 52, 255, 64, 48, 28);
  } else if (actionState === "fire") {
    // Subtle cyan muzzle glow illuminating the canopy glass!
    fillRect(s, 18, 10, 124, 52, 92, 240, 255, 22);
  }

  // 5. Holographic Starship Gunner Targeting HUD on Glass
  const hudR = isOverheat ? 255 : (isLock ? 255 : ur);
  const hudG = isOverheat ? 86 : (isLock ? 216 : ug);
  const hudB = isOverheat ? 72 : (isLock ? 72 : ub);
  for (const dy of [-13, -6, 6, 13]) {
    drawLine(s, aimX - 21, aimY + dy, aimX - 15, aimY + dy, hudR, hudG, hudB, 160, 1);
    drawLine(s, aimX + 15, aimY + dy, aimX + 21, aimY + dy, hudR, hudG, hudB, 160, 1);
  }
  // Top Azimuth Bearing Bar
  drawLine(s, 46, 13, 114, 13, hudR, hudG, hudB, 180, 1);
  for (let tx = 50; tx <= 110; tx += 10) drawLine(s, tx, 13, tx, 15, hudR, hudG, hudB, 195, 1);
  fillPoly(s, [[aimX, 16], [aimX - 3, 19], [aimX + 3, 19]], tr, tg, tb, 235);

  strokeCircle(s, aimX, aimY, 9, hudR, hudG, hudB, 225);
  drawLine(s, aimX - 14, aimY, aimX - 5, aimY, hudR, hudG, hudB, 240, 1);
  drawLine(s, aimX + 5, aimY, aimX + 14, aimY, hudR, hudG, hudB, 240, 1);
  drawLine(s, aimX, aimY - 12, aimX, aimY - 5, hudR, hudG, hudB, 240, 1);
  drawLine(s, aimX, aimY + 5, aimX, aimY + 12, hudR, hudG, hudB, 240, 1);
  setPx(s, aimX, aimY, 255, 255, 255, 255);

  // 6. Bespoke Starship Turret Canopy Frame & Glass Bubble Ribs!
  const dr = Math.max(0, fr - 20), dg = Math.max(0, fg - 20), db = Math.max(0, fb - 20);
  // Top overhead armored visor beam
  fillRect(s, 0, 0, W, 9, dr, dg, db);
  fillRect(s, 0, 7, W, 2, hr, hg, hb);
  fillRect(s, 42, 2, 76, 4, fr, fg, fb);
  fillRect(s, 50, 3, 4, 2, isOverheat ? 255 : 64, isOverheat ? 64 : 255, isOverheat ? 64 : 140);
  fillRect(s, 58, 3, 4, 2, tr, tg, tb);
  fillRect(s, 102, 3, 4, 2, 255, 86, 86);
  fillRect(s, 110, 3, 4, 2, ur, ug, ub);

  // Iconic Millennium-Falcon-style Octagonal Bubble Struts for Quad Laser Ball Turret!
  if (cp.theme === "ball_bubble") {
    drawLine(s, 16, 9, 44, 24, hr, hg, hb, 185, 2);
    drawLine(s, 144, 9, 116, 24, hr, hg, hb, 185, 2);
    drawLine(s, 44, 24, 116, 24, hr, hg, hb, 160, 1);
    drawLine(s, 44, 24, 34, 62, hr, hg, hb, 165, 1);
    drawLine(s, 116, 24, 126, 62, hr, hg, hb, 165, 1);
  } else if (cp.theme === "battleship_cupola" || cp.theme === "dreadnought_bunker") {
    // Heavy battleship armored brow + center glass mullion stub
    fillRect(s, 0, 9, W, 4, dr, dg, db);
    fillPoly(s, [[18, 12], [46, 12], [18, 26]], fr, fg, fb);
    fillPoly(s, [[142, 12], [114, 12], [142, 26]], fr, fg, fb);
    drawLine(s, 46, 12, 18, 26, tr, tg, tb, 255, 1);
    drawLine(s, 114, 12, 142, 26, tr, tg, tb, 255, 1);
  } else if (cp.theme === "yamato_flagship") {
    // Royal Gilded Flagship Cathedral Arches!
    drawLine(s, 20, 9, 46, 18, 244, 196, 68, 240, 2);
    drawLine(s, 140, 9, 114, 18, 244, 196, 68, 240, 2);
    drawLine(s, 46, 18, 114, 18, 244, 196, 68, 185, 1);
  } else if (cp.theme === "sniper_rail") {
    fillRect(s, 0, 9, W, 5, 18, 26, 40);
    drawLine(s, 18, 14, 142, 14, 92, 208, 255, 230, 1);
  }

  // Left & Right Heavy Canopy Side Pillars + Seated Gunner Armored Seat Side Bolsters!
  const strutW = cp.theme === "dreadnought_bunker" || cp.theme === "flak_wall" ? 20 : 15;
  fillPoly(s, [[0, 0], [strutW + 7, 0], [strutW, 66], [0, 66]], fr, fg, fb);
  fillPoly(s, [[W, 0], [W - strutW - 7, 0], [W - strutW, 66], [W, 66]], fr, fg, fb);
  drawLine(s, strutW + 7, 8, strutW, 66, hr, hg, hb, 255, 2);
  drawLine(s, W - strutW - 7, 8, W - strutW, 66, hr, hg, hb, 255, 2);
  drawLine(s, strutW + 4, 10, strutW - 2, 64, tr, tg, tb, 255, 1);
  drawLine(s, W - strutW - 4, 10, W - strutW + 2, 64, tr, tg, tb, 255, 1);
  for (let ry = 16; ry < 62; ry += 10) {
    setPx(s, 5, ry, hr, hg, hb); setPx(s, W - 6, ry, hr, hg, hb);
    setPx(s, 6, ry + 1, 10, 14, 22); setPx(s, W - 5, ry + 1, 10, 14, 22);
  }

  // 7. Lower Armored Starship Gunnery Console & Dashboard (Y = 64..100)
  fillPoly(s, [[0, 100], [0, 66], [28, 61], [132, 61], [160, 66], [160, 100]], dr, dg, db);
  fillPoly(s, [[6, 100], [6, 68], [30, 63], [130, 63], [154, 68], [154, 100]], fr, fg, fb);
  drawLine(s, 0, 66, 28, 61, hr, hg, hb, 255, 2);
  drawLine(s, 28, 61, 132, 61, hr, hg, hb, 255, 2);
  drawLine(s, 132, 61, 160, 66, hr, hg, hb, 255, 2);
  drawLine(s, 30, 64, 130, 64, tr, tg, tb, 255, 1);

  // Left CRT Monitor: Starship Reactor Energy, Shield & Barrel Heat Bars
  fillRect(s, 12, 70, 36, 24, 6, 16, 26);
  strokeRect(s, 12, 70, 36, 24, hr, hg, hb, 1);
  // Shield Bar (Cyan)
  fillRect(s, 15, 74, 28, 3, 18, 40, 56);
  fillRect(s, 15, 74, isOverheat ? 14 : 24, 3, 82, 242, 255);
  // Barrel Heat Bar (Gold -> Red on overheat)
  fillRect(s, 15, 80, 28, 3, 48, 24, 24);
  fillRect(s, 15, 80, isOverheat ? 27 : (isFire ? 20 : 10), 3, isOverheat ? 255 : wr, isOverheat ? 66 : wg, isOverheat ? 56 : wb);
  // Capacitor Cells
  fillRect(s, 15, 86, 28, 4, 20, 34, 48);
  const cells = isLock ? 6 : (isFire ? 4 : 5);
  for (let b = 0; b < 6; b++) {
    fillRect(s, 16 + b * 4, 87, 3, 2, b < cells ? tr : 46, b < cells ? tg : 46, b < cells ? tb : 60);
  }

  // Center CRT Scope: CAPITAL STARSHIP SPACE TACTICAL RADAR!
  // Shows the Federation Capital Starship silhouette in the center + turret firing cone + red Zerg blips!
  fillRect(s, 54, 68, 52, 28, 6, 16, 28);
  strokeRect(s, 54, 68, 52, 28, tr, tg, tb, 1);
  const radX = 80, radY = 82;
  fillCircle(s, radX, radY, 11, 8, 26, 44);
  strokeCircle(s, radX, radY, 11, ur, ug, ub, 220);
  strokeCircle(s, radX, radY, 6, ur, ug, ub, 120);
  // Turret firing arc cone sweeping outward from capital ship!
  const coneShift = isScan ? -4 : 0;
  fillPoly(s, [[radX, radY], [radX - 5 + coneShift, radY - 10], [radX + 5 + coneShift, radY - 10]], ur, ug, ub, 65);
  // Mini Capital Starship Silhouette right in the center of the radar!
  fillRect(s, radX - 1, radY - 4, 3, 8, 232, 246, 255);
  fillRect(s, radX - 3, radY, 7, 2, 232, 186, 68);
  // Incoming Red Zerg Contacts around Capital Ship!
  fillRect(s, radX + 2 + coneShift, radY - 7, 2, 2, 255, 72, 86);
  fillRect(s, radX - 6, radY - 5, 2, 2, 255, 72, 86);
  fillRect(s, radX + 6, radY + 2, 2, 2, 255, 220, 72);
  for (let i = 0; i < 5; i++) {
    fillRect(s, 57, 72 + i * 4, 5, 2, i > 1 ? ur : 255, i > 1 ? ug : 86, i > 1 ? ub : 82);
    fillRect(s, 98, 72 + i * 4, 5, 2, i > 0 ? tr : 255, i > 0 ? tg : 255, i > 0 ? tb : 255);
  }

  // Right CRT Monitor: Starship Hull + Turret Elevation Schematic!
  fillRect(s, 112, 70, 36, 24, 6, 16, 26);
  strokeRect(s, 112, 70, 36, 24, hr, hg, hb, 1);
  // Mini Starship Deck Hull profile + Mounted Turret elevation angle!
  fillRect(s, 115, 88, 30, 3, 76, 108, 146);
  fillRect(s, 124, 83, 10, 5, ur, ug, ub);
  drawLine(s, 130, 84, 142, isScan ? 78 : 73, tr, tg, tb, 255, 2);
  strokeCircle(s, 129, 85, 10, ur, ug, ub, 120);
  fillRect(s, 115, 73, 7, 2, 255, 224, 86);
  fillRect(s, 115, 77, 10, 2, ur, ug, ub);

  // 8. Gunner's Gloved Space-Suit Hands & Bespoke Starship Turret Controls!
  const handShiftX = isScan ? -3 : (isOverheat ? 2 : 0);
  const handShiftY = isFire ? 2 : 0; // Yoke recoils slightly back during salvo!

  const drawGlovedHand = (hx, hy, side) => {
    const ax = side < 0 ? hx - 16 : hx + 16;
    // Federation Space-Gunner Flight Suit Forearm (navy-steel + gold cuff!)
    fillPoly(s, [[ax - 5, 100], [ax + 5, 100], [hx + 4, hy + 6], [hx - 4, hy + 6]], 36, 52, 78);
    fillPoly(s, [[ax - 2, 100], [ax + 3, 100], [hx + 2, hy + 6], [hx - 2, hy + 6]], 68, 94, 132);
    fillRect(s, hx - 4, hy + 4, 8, 2, 232, 186, 68);
    // Armored Glove gripping space-gunnery handle
    fillRect(s, hx - 5, hy - 3, 10, 8, 28, 36, 50);
    fillRect(s, hx - 4, hy - 2, 8, 5, 58, 74, 98);
    for (let k = -3; k <= 3; k += 2) setPx(s, hx + k, hy - 2, 144, 170, 202);
  };

  if (cp.controlType === "wheel_levers") {
    strokeCircle(s, 42 + handShiftX, 84 + handShiftY, 8, 232, 186, 68, 255);
    drawLine(s, 34 + handShiftX, 84 + handShiftY, 50 + handShiftX, 84 + handShiftY, 180, 140, 56, 255, 1);
    drawLine(s, 42 + handShiftX, 76 + handShiftY, 42 + handShiftX, 92 + handShiftY, 180, 140, 56, 255, 1);
    fillRect(s, 114 + handShiftX, 76 + handShiftY, 4, 16, 120, 136, 158);
    fillRect(s, 111 + handShiftX, 74 + handShiftY, 10, 4, 240, 76, 66);
    drawGlovedHand(44 + handShiftX, 86 + handShiftY, -1);
    drawGlovedHand(116 + handShiftX, 82 + handShiftY, 1);
  } else if (cp.controlType === "flight_stick") {
    fillRect(s, 36 + handShiftX, 78 + handShiftY, 12, 10, 42, 60, 88);
    fillRect(s, 38 + handShiftX, 76 + handShiftY, 8, 3, 245, 72, 92);
    drawLine(s, 118 + handShiftX, 96, 116 + handShiftX, 74 + handShiftY, 58, 82, 114, 255, 5);
    fillRect(s, 114 + handShiftX, 72 + handShiftY, 5, 4, 88, 242, 255);
    drawGlovedHand(42 + handShiftX, 84 + handShiftY, -1);
    drawGlovedHand(116 + handShiftX, 82 + handShiftY, 1);
  } else {
    for (const side of [-1, 1]) {
      const gx = (side < 0 ? 40 : 120) + handShiftX;
      const gy = 83 + handShiftY;
      drawLine(s, gx + side * 6, 98, gx, gy - 9, 44, 58, 82, 255, 5);
      drawLine(s, gx + side * 5, 97, gx, gy - 9, hr, hg, hb, 255, 2);
      // Glowing fire thumb trigger (flashes bright white-gold during fire!)
      fillRect(s, gx - 2, gy - 12, 4, 3, isFire ? 255 : wr, isFire ? 255 : wg, isFire ? 200 : wb);
      drawGlovedHand(gx, gy, side);
    }
    if (cp.controlType === "sniper_yoke" || cp.controlType === "citadel_yoke" || cp.controlType === "gyro_yoke") {
      fillRect(s, 44 + handShiftX, 88 + handShiftY, 72, 3, hr, hg, hb);
      fillRect(s, 72 + handShiftX, 87 + handShiftY, 16, 5, tr, tg, tb);
    }
  }

  strokeRect(s, 0, 0, W, H, 8, 12, 22, 1);
  return s;
}

// ============================================================================
// Generate All Capital Starship Turret Assets!
// ============================================================================
const turrets = CapTurrets.TURRET_LIST;
console.log(`Generating 8-bit 3D Starship Turret icons, 8-action sheets, Deck Battle Scene & Seated Cockpits for ${turrets.length} turrets...`);

// ---- 1. 8-Bit 3D Starship Turret Icons (512x512) + 2x5 Overview ----
const iconSmallList = [];
for (const t of turrets) {
  const native = renderTurret3D(t, 80, 80, {
    yaw: 0.20, pitch: 0.34, recoilL: 0, recoilR: 0, recoilM: 0, spinAngle: 0.3, radarAngle: 0.4, petalOpen: 0.18, corePulse: 0.2,
  }, "none");
  iconSmallList.push(native);

  const out512 = createSurface(512, 512);
  blitNearest(out512, native, 16, 16, 6);
  writePNG(path.join(OUT_ICONS, `${t.no}_${t.id}.png`), 512, 512, out512.data);
}

// Short clean labels guaranteed to fit crisply inside every overview card!
const SHORT_EN = {
  quad_laser_dome:     "QUAD LASER DOME",
  twin_turbolaser:     "TWIN TURBOLASER",
  triple_macro_cannon: "TRIPLE MACRO CANNON",
  pd_ciws_rotary:      "PD-CIWS GATLING",
  broadside_plasma:    "BROADSIDE PLASMA",
  spinal_railgun:      "CRUISER RAILGUN",
  photon_torpedo_pod:  "PHOTON TORPEDO",
  carrier_flak_quad:   "CARRIER FLAK QUAD",
  aegis_arc_turret:    "AEGIS ARC TURRET",
  yamato_nova_citadel: "YAMATO NOVA CITADEL",
};

// 2x5 Overview (1680x680)
{
  const cols = 5, rows = 2;
  const cellW = 308, cellH = 304, pad = 20, topH = 44;
  const ovW = pad + cols * (cellW + pad);
  const ovH = topH + pad + rows * (cellH + pad);
  const ov = createSurface(ovW, ovH);
  fillRect(ov, 0, 0, ovW, ovH, 6, 11, 24);
  drawText(ov, "CAPITAL STARSHIP TURRETS - 10 TYPES 8-BIT 3D MODELS", ovW / 2, 16, 3, 110, 244, 255, "center");

  turrets.forEach((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = pad + col * (cellW + pad);
    const y = topH + pad + row * (cellH + pad);
    fillRect(ov, x, y, cellW, cellH, 10, 18, 36);
    const [ar, ag, ab] = hexToRgb(t.accentHex);
    strokeRect(ov, x, y, cellW, cellH, ar, ag, ab, 2);
    blitNearest(ov, iconSmallList[idx], x + 34, y + 12, 3);
    drawText(ov, `${t.no}. ${SHORT_EN[t.id] || t.en}`, x + cellW / 2, y + 262, 2, 235, 246, 255, "center");
    drawText(ov, t.weaponStyle.replace("_", " ").toUpperCase(), x + cellW / 2, y + 282, 2, ar, ag, ab, "center");
  });

  writePNG(path.join(OUT_ICONS, "capital_turrets_3d_8bit_overview.png"), ovW, ovH, ov.data);
}

// ---- 2. 10 Starship Turret Action Sprite Sheets (1920x240, 8 frames) + 10x8 Showcase ----
const ACTION_POSES = [
  { key: "standby",  label: "01 STANDBY", pose: { yaw: 0.16,  pitch: 0.20, recoilL: 0,    recoilR: 0,    recoilM: 0,    spinAngle: 0.0, radarAngle: 0.2, petalOpen: 0.0,  corePulse: 0.0, explode: 0,    shake: 0 },    vfx: "none" },
  { key: "track",    label: "02 TRACK",   pose: { yaw: -0.62, pitch: 0.36, recoilL: 0,    recoilR: 0,    recoilM: 0,    spinAngle: 0.4, radarAngle: 1.3, petalOpen: 0.12, corePulse: 0.1, explode: 0,    shake: 0 },    vfx: "track" },
  { key: "elevate",  label: "03 ELEV",    pose: { yaw: 0.22,  pitch: 0.86, recoilL: 0,    recoilR: 0,    recoilM: 0,    spinAngle: 0.8, radarAngle: 2.4, petalOpen: 0.22, corePulse: 0.2, explode: 0,    shake: 0 },    vfx: "elevate" },
  { key: "fire",     label: "04 SALVO",   pose: { yaw: 0.22,  pitch: 0.50, recoilL: 0.55, recoilR: 0.12, recoilM: 0.35, spinAngle: 1.4, radarAngle: 3.1, petalOpen: 0.72, corePulse: 0.6, explode: 0,    shake: 0.5 },  vfx: "fire" },
  { key: "recoil",   label: "05 RECOIL",  pose: { yaw: 0.22,  pitch: 0.58, recoilL: 0.14, recoilR: 0.62, recoilM: 0.68, spinAngle: 2.3, radarAngle: 4.0, petalOpen: 0.88, corePulse: 0.8, explode: 0,    shake: 0.8 },  vfx: "recoil" },
  { key: "charge",   label: "06 CHARGE",  pose: { yaw: 0.18,  pitch: 0.70, recoilL: 0.16, recoilR: 0.16, recoilM: 0.16, spinAngle: 3.1, radarAngle: 5.0, petalOpen: 1.0,  corePulse: 1.0, explode: 0,    shake: 0.35 }, vfx: "charge" },
  { key: "overheat", label: "07 VENT",    pose: { yaw: -0.15, pitch: 0.14, recoilL: 0.10, recoilR: 0.10, recoilM: 0.10, spinAngle: 0.2, radarAngle: 0.8, petalOpen: 0.55, corePulse: 0.1, explode: 0,    shake: 0.25 }, vfx: "overheat" },
  { key: "damaged",  label: "08 IMPACT",  pose: { yaw: 0.45,  pitch: 0.26, recoilL: 0.30, recoilR: 0.30, recoilM: 0.30, spinAngle: 0.0, radarAngle: 1.2, petalOpen: 0.90, corePulse: 0.0, explode: 0.85, shake: 0.9 },  vfx: "damaged" },
];

const allActionFrames = [];
for (let ti = 0; ti < turrets.length; ti++) {
  const t = turrets[ti];
  const strip = createSurface(240 * 8, 240);
  const frames = [];
  for (let ai = 0; ai < ACTION_POSES.length; ai++) {
    const ap = ACTION_POSES[ai];
    const native = renderTurret3D(t, 80, 80, ap.pose, ap.vfx);
    frames.push(native);
    blitNearest(strip, native, ai * 240, 0, 3);
  }
  allActionFrames.push(frames);
  writePNG(path.join(OUT_ACTIONS, `${t.no}_${t.id}_actions.png`), strip.w, strip.h, strip.data);
}

// Complete 10x8 Starship Turrets Action Showcase
{
  const cellW = 168, cellH = 168, gap = 8, leftW = 136, topH = 68;
  const sw = leftW + ACTION_POSES.length * (cellW + gap) + 12;
  const sh = topH + turrets.length * (cellH + gap) + 16;
  const sc = createSurface(sw, sh);
  fillRect(sc, 0, 0, sw, sh, 6, 11, 22);
  drawText(sc, "10 CAPITAL STARSHIP TURRETS X 8 ACTIONS - 8-BIT 3D SHEET", sw / 2, 14, 3, 110, 244, 255, "center");

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
    const shortTag = (t.id === "pd_ciws_rotary" ? "CIWS" : (t.id === "broadside_plasma" ? "PLASMA" : t.id.split("_")[0])).toUpperCase();
    drawText(sc, shortTag, 10 + (leftW - 18) / 2, ry + 92, 2, 225, 242, 255, "center");

    for (let ai = 0; ai < ACTION_POSES.length; ai++) {
      const cx = leftW + ai * (cellW + gap);
      fillRect(sc, cx, ry, cellW, cellH, 9, 16, 30);
      strokeRect(sc, cx, ry, cellW, cellH, 32, 92, 128, 1);
      blitNearest(sc, allActionFrames[ti][ai], cx + 4, ry + 4, 2);
    }
  }
  writePNG(path.join(OUT_ACTIONS, "capital_turrets_actions_showcase.png"), sw, sh, sc.data);
}

// ---- BONUS: Macro Capital Starship Armored Deck Battle 4-Frame Action Sheet! ----
{
  const labels = ["01 DECK DEPLOY", "02 SWARM TRACK", "03 BROADSIDE SALVO", "04 YAMATO NOVA"];
  const fw = 360, fh = 220, pad = 16, topH = 48, botH = 34;
  const dw = pad + 4 * (fw + pad);
  const dh = topH + fh + botH + pad;
  const deckOv = createSurface(dw, dh);
  fillRect(deckOv, 0, 0, dw, dh, 5, 10, 22);
  drawText(deckOv, "LARGE CAPITAL STARSHIP DECK TURRETS - 8-BIT 3D BATTLE ACTIONS", dw / 2, 16, 3, 255, 224, 112, "center");

  for (let i = 0; i < 4; i++) {
    const x = pad + i * (fw + pad);
    const y = topH;
    const frame = renderCapitalDeckBattleFrame(i);
    blitNearest(deckOv, frame, x, y, 2); // 180*2 x 110*2 = 360x220
    strokeRect(deckOv, x - 1, y - 1, fw + 2, fh + 2, 82, 224, 255, 2);
    drawText(deckOv, labels[i], x + fw / 2, y + fh + 10, 2, 238, 248, 255, "center");
  }
  writePNG(path.join(OUT_ACTIONS, "capital_ship_deck_battle_actions.png"), dw, dh, deckOv.data);
}

// ---- 3. 10 Sitting-Inside Starship Turret Cockpits (640x400) + 2x5 Overview ----
const cockpitNativeList = [];
for (const t of turrets) {
  const native = renderCapitalTurretCockpit(t, "combat");
  cockpitNativeList.push(native);
  const out640 = createSurface(640, 400);
  blitNearest(out640, native, 0, 0, 4);
  writePNG(path.join(OUT_COCKPITS, `${t.no}_${t.id}_cockpit.png`), 640, 400, out640.data);
}

// 2x5 Starship Cockpits Overview (1740x560)
{
  const cols = 5, rows = 2;
  const cellW = 328, cellH = 236, pad = 16, topH = 46;
  const cw = pad + cols * (cellW + pad);
  const ch = topH + pad + rows * (cellH + pad);
  const ov = createSurface(cw, ch);
  fillRect(ov, 0, 0, cw, ch, 6, 11, 24);
  drawText(ov, "10 CAPITAL STARSHIP TURRET COCKPITS - SEATED FIRST-PERSON 8-BIT", cw / 2, 16, 3, 110, 244, 255, "center");

  turrets.forEach((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = pad + col * (cellW + pad);
    const y = topH + pad + row * (cellH + pad);
    const [ar, ag, ab] = hexToRgb(t.accentHex);
    fillRect(ov, x, y, cellW, cellH, 10, 18, 36);
    strokeRect(ov, x, y, cellW, cellH, ar, ag, ab, 2);
    blitNearest(ov, cockpitNativeList[idx], x + 4, y + 4, 2);
    drawText(ov, `${t.no}. ${SHORT_EN[t.id] || t.en}`, x + cellW / 2, y + 214, 2, 238, 248, 255, "center");
  });
  writePNG(path.join(OUT_COCKPITS, "capital_cockpits_overview.png"), cw, ch, ov.data);
}

// ---- BONUS: 4-Frame Seated Cockpit Operation Action Strip! ----
{
  const heroTurret = CapTurrets.getTurret("quad_laser_dome");
  const states = [
    { key: "scan",     label: "01 SCAN / TRACK",    col: [110, 244, 255] },
    { key: "lock",     label: "02 TARGET LOCK",     col: [255, 224, 96] },
    { key: "fire",     label: "03 QUAD SALVO FIRE", col: [118, 255, 192] },
    { key: "overheat", label: "04 HEAT / SHIELD",   col: [255, 102, 86] },
  ];
  const fw = 320, fh = 200, pad = 16, topH = 48, botH = 34;
  const cw = pad + 4 * (fw + pad);
  const ch = topH + fh + botH + pad;
  const actOv = createSurface(cw, ch);
  fillRect(actOv, 0, 0, cw, ch, 6, 11, 24);
  drawText(actOv, "SEATED IN STARSHIP TURRET COCKPIT - 4-STAGE COMBAT ACTIONS", cw / 2, 16, 3, 110, 244, 255, "center");

  states.forEach((st, i) => {
    const x = pad + i * (fw + pad);
    const y = topH;
    const frame = renderCapitalTurretCockpit(heroTurret, st.key);
    blitNearest(actOv, frame, x, y, 2);
    strokeRect(actOv, x - 1, y - 1, fw + 2, fh + 2, st.col[0], st.col[1], st.col[2], 2);
    drawText(actOv, st.label, x + fw / 2, y + fh + 10, 2, st.col[0], st.col[1], st.col[2], "center");
  });
  writePNG(path.join(OUT_COCKPITS, "capital_cockpit_actions_showcase.png"), cw, ch, actOv.data);
}

console.log("Done! Exported:");
console.log(" - 10 8-bit 3D capital starship turret icons + overview -> assets/capital_turrets_8bit/icons/");
console.log(" - 10 8-action sprite sheets + 10x8 showcase + 4-frame deck battle sheet -> assets/capital_turrets_8bit/actions/");
console.log(" - 10 seated starship turret cockpits + overview + 4-stage cockpit action strip -> assets/capital_turrets_8bit/cockpits/");
