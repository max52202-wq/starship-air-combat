// ============================================================================
// models.js — Procedural Low-Poly 3D Starship & Space Fleet Models
// Each model: { verts: [[x,y,z]...], faces: [{ i:[a,b,c], c:[r,g,b], e?:bool }...] }
// Local coordinates: +Z forward (nose), +Y up, +X right
// ============================================================================

window.Models = (function () {
  function builder() {
    const verts = [];
    const vTags = [];
    const faces = [];
    let curTag = "body";

    function setTag(tag) {
      curTag = tag || "body";
    }

    function addV(x, y, z) {
      verts.push([x, y, z]);
      vTags.push(curTag);
      return verts.length - 1;
    }

    function addTri(a, b, c, color, emissive = false) {
      faces.push({ i: [a, b, c], c: color, e: emissive });
    }

    function addQuad(a, b, c, d, color, emissive = false) {
      faces.push({ i: [a, b, c], c: color, e: emissive });
      faces.push({ i: [a, c, d], c: color, e: emissive });
    }

    // Add a tapered 3D box centered at (cx,cy,cz)
    function addBox(cx, cy, cz, sx, sy, sz, color, emissive = false, taperFront = 1.0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const fx = hx * taperFront, fy = hy * taperFront;
      // Back 4 (-z)
      const b0 = addV(cx - hx, cy - hy, cz - hz);
      const b1 = addV(cx + hx, cy - hy, cz - hz);
      const b2 = addV(cx + hx, cy + hy, cz - hz);
      const b3 = addV(cx - hx, cy + hy, cz - hz);
      // Front 4 (+z)
      const f0 = addV(cx - fx, cy - fy, cz + hz);
      const f1 = addV(cx + fx, cy - fy, cz + hz);
      const f2 = addV(cx + fx, cy + fy, cz + hz);
      const f3 = addV(cx - fx, cy + fy, cz + hz);

      // Faces (outward winding)
      addQuad(b3, b2, f2, f3, color, emissive); // top
      addQuad(b0, f0, f1, b1, color, emissive); // bottom
      addQuad(b1, f1, f2, b2, color, emissive); // right
      addQuad(b0, b3, f3, f0, color, emissive); // left
      addQuad(f0, f3, f2, f1, color, emissive); // front
      addQuad(b0, b1, b2, b3, color, emissive); // back
    }

    // Add a flat/thin wing prism (mirrored automatically if mirror=true)
    function addWing(x0, y0, z0, x1, y1, z1, z0b, z1b, thick, color, mirror = true) {
      const sides = mirror ? [1, -1] : [1];
      for (const s of sides) {
        const ax = x0 * s, bx = x1 * s;
        const t = thick * 0.5;
        const p0t = addV(ax, y0 + t, z0);
        const p1t = addV(bx, y1 + t, z1);
        const p2t = addV(bx, y1 + t, z1b);
        const p3t = addV(ax, y0 + t, z0b);
        const p0b = addV(ax, y0 - t, z0);
        const p1b = addV(bx, y1 - t, z1);
        const p2b = addV(bx, y1 - t, z1b);
        const p3b = addV(ax, y0 - t, z0b);
        if (s > 0) {
          addQuad(p0t, p1t, p2t, p3t, color);
          addQuad(p0b, p3b, p2b, p1b, color);
          addQuad(p0t, p0b, p1b, p1t, color);
          addQuad(p2t, p2b, p3b, p3t, color);
          addQuad(p1t, p1b, p2b, p2t, color);
        } else {
          addQuad(p0t, p3t, p2t, p1t, color);
          addQuad(p0b, p1b, p2b, p3b, color);
          addQuad(p0t, p1t, p1b, p0b, color);
          addQuad(p2t, p3t, p3b, p2b, color);
          addQuad(p1t, p2t, p2b, p1b, color);
        }
      }
    }

    // Organic rounded geodesic/faceted blob (for gas sacs, brood eggs, venom glands, hunched carapaces)
    function addBlob(cx, cy, cz, rx, ry, rz, color, emissive = false, lonSegs = 6, latSegs = 4) {
      const topIdx = addV(cx, cy + ry, cz);
      const botIdx = addV(cx, cy - ry, cz);
      const rings = [];
      for (let lat = 1; lat < latSegs; lat++) {
        const theta = (lat / latSegs) * Math.PI;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);
        const ring = [];
        for (let lon = 0; lon < lonSegs; lon++) {
          const phi = (lon / lonSegs) * Math.PI * 2;
          ring.push(addV(
            cx + Math.cos(phi) * sinT * rx,
            cy + cosT * ry,
            cz + Math.sin(phi) * sinT * rz
          ));
        }
        rings.push(ring);
      }
      // Top cap
      const r0 = rings[0];
      for (let lon = 0; lon < lonSegs; lon++) {
        const next = (lon + 1) % lonSegs;
        addTri(topIdx, r0[next], r0[lon], color, emissive);
      }
      // Middle bands
      for (let r = 0; r < rings.length - 1; r++) {
        const a = rings[r], b = rings[r + 1];
        for (let lon = 0; lon < lonSegs; lon++) {
          const next = (lon + 1) % lonSegs;
          addQuad(a[lon], a[next], b[next], b[lon], color, emissive);
        }
      }
      // Bottom cap
      const rLast = rings[rings.length - 1];
      for (let lon = 0; lon < lonSegs; lon++) {
        const next = (lon + 1) % lonSegs;
        addTri(botIdx, rLast[lon], rLast[next], color, emissive);
      }
    }

    // Sharp organic 4-sided pyramid spike / horn / fang / tentacle segment
    function addSpike(bx, by, bz, tx, ty, tz, rad, color, emissive = false) {
      const dx = tx - bx, dy = ty - by, dz = tz - bz;
      const d = Math.hypot(dx, dy, dz) || 1;
      const fx = dx / d, fy = dy / d, fz = dz / d;
      // Pick perpendicular basis
      let ux = 0, uy = 1, uz = 0;
      if (Math.abs(fy) > 0.85) { ux = 1; uy = 0; uz = 0; }
      // right = cross(up, fwd)
      let rx = uy * fz - uz * fy;
      let ry = uz * fx - ux * fz;
      let rz = ux * fy - uy * fx;
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      // trueUp = cross(fwd, right)
      const tux = fy * rz - fz * ry;
      const tuy = fz * rx - fx * rz;
      const tuz = fx * ry - fy * rx;

      const tip = addV(tx, ty, tz);
      const p0 = addV(bx + rx * rad, by + ry * rad, bz + rz * rad);
      const p1 = addV(bx + tux * rad, by + tuy * rad, bz + tuz * rad);
      const p2 = addV(bx - rx * rad, by - ry * rad, bz - rz * rad);
      const p3 = addV(bx - tux * rad, by - tuy * rad, bz - tuz * rad);

      addTri(p0, p1, tip, color, emissive);
      addTri(p1, p2, tip, color, emissive);
      addTri(p2, p3, tip, color, emissive);
      addTri(p3, p0, tip, color, emissive);
      addQuad(p0, p3, p2, p1, color, emissive);
    }

    // Scalloped double-sided bat/dragon membrane triangle (mirrored X)
    function addMembraneTri(p0, p1, p2, color, mirror = true) {
      const sides = mirror ? [1, -1] : [1];
      for (const s of sides) {
        const a = addV(p0[0] * s, p0[1], p0[2]);
        const b = addV(p1[0] * s, p1[1], p1[2]);
        const c = addV(p2[0] * s, p2[1], p2[2]);
        // Double-sided so thin bat membranes are visible from both top and underside!
        addTri(a, b, c, color, false);
        addTri(a, c, b, color, false);
      }
    }

    return { verts, vTags, faces, setTag, addV, addTri, addQuad, addBox, addWing, addBlob, addSpike, addMembraneTri };
  }

  // 1. Player Starfleet Interceptor (聯邦星際突擊艦)
  function buildPlayerShip() {
    const m = builder();
    const hull = [215, 228, 244];
    const trim = [72, 138, 212];
    const dark = [58, 74, 102];
    const canopy = [72, 232, 255];
    const glow = [86, 245, 255];
    const thruster = [255, 192, 76];

    // Forward spearhead saucer/fuselage
    m.addBox(0, 0, 1.3, 1.25, 0.42, 2.5, hull, false, 0.28);
    // Mid armored core
    m.addBox(0, -0.04, -0.7, 1.45, 0.56, 2.1, hull, false, 0.85);
    // Blue fleet stripe along spine
    m.addBox(0, 0.25, 0.2, 0.42, 0.14, 2.2, trim, false, 0.65);
    // Glowing starfleet bridge canopy
    m.addBox(0, 0.34, 0.55, 0.62, 0.28, 1.2, canopy, true, 0.55);

    // Swept Starfleet delta wings
    m.addWing(0.65, -0.05, 0.65, 2.95, -0.22, -0.85, -1.45, -1.65, 0.16, hull, true);
    m.addWing(0.75, 0.02, 0.1, 2.2, -0.1, -0.9, -1.25, -1.45, 0.12, trim, true);

    // Twin elevated Warp Nacelles on wingtips (signature Starship look!)
    for (const s of [-1, 1]) {
      m.addBox(s * 2.55, 0.18, -0.95, 0.46, 0.44, 2.35, dark, false, 0.85);
      // Glowing cyan warp plasma coils
      m.addBox(s * 2.55, 0.22, -0.9, 0.52, 0.16, 1.75, glow, true, 0.95);
      // Nacelle exhaust glow
      m.addBox(s * 2.55, 0.18, -2.18, 0.34, 0.3, 0.22, glow, true, 1.0);
    }

    // Twin canted dorsal stabilizer fins
    for (const s of [-1, 1]) {
      m.addBox(s * 0.72, 0.56, -1.35, 0.14, 0.72, 1.15, dark, false, 0.65);
    }

    // Main impulse engine core
    m.addBox(0, 0.0, -1.85, 0.85, 0.36, 0.3, thruster, true, 1.0);

    return { verts: m.verts, faces: m.faces, radius: 3.2 };
  }

  // 2. Friendly Starfleet Wingman (友軍護衛星艦)
  function buildFriendlyFighter() {
    const m = builder();
    const hull = [196, 224, 245];
    const blue = [48, 178, 245];
    const glow = [80, 245, 255];

    m.addBox(0, 0, 0.9, 1.05, 0.38, 2.3, hull, false, 0.25);
    m.addBox(0, 0, -0.8, 1.15, 0.44, 1.6, blue, false, 0.9);
    m.addBox(0, 0.28, 0.3, 0.5, 0.24, 0.9, glow, true, 0.6);
    m.addWing(0.5, 0, 0.5, 2.5, 0.15, -0.8, -1.3, -1.5, 0.14, hull, true);
    for (const s of [-1, 1]) {
      m.addBox(s * 2.2, 0.2, -1.0, 0.36, 0.34, 1.6, blue, false, 0.85);
      m.addBox(s * 2.2, 0.2, -1.85, 0.28, 0.26, 0.2, glow, true, 1.0);
    }
    return { verts: m.verts, faces: m.faces, radius: 2.8 };
  }

  // 3. Friendly Orbital Cruiser (友軍星際巡洋艦 — huge saucer + twin warp nacelles)
  function buildFriendlyCruiser() {
    const m = builder();
    const hull = [208, 222, 238];
    const mid = [142, 168, 198];
    const accent = [54, 148, 228];
    const glow = [72, 238, 255];

    // Iconic Starfleet Primary Saucer Section (layered octo-box)
    m.addBox(0, 2.2, 14.0, 18.0, 2.6, 16.0, hull, false, 0.62);
    m.addBox(0, 2.2, 6.0, 16.5, 2.4, 8.0, hull, false, 1.15);
    m.addBox(0, 3.8, 11.5, 6.5, 1.6, 6.5, mid, false, 0.72);
    // Bridge glowing dome
    m.addBox(0, 4.9, 11.5, 3.0, 1.0, 3.0, glow, true, 0.7);
    // Saucer accent stripes
    m.addBox(0, 3.55, 15.0, 4.0, 0.4, 10.0, accent, false, 0.6);

    // Connecting Neck & Secondary Engineering Hull
    m.addBox(0, -0.2, 2.5, 4.5, 4.2, 8.0, mid, false, 0.85);
    m.addBox(0, -2.2, -6.0, 6.8, 4.8, 22.0, hull, false, 0.75);
    // Main Deflector Dish (bright cyan glow!)
    m.addBox(0, -2.0, 5.2, 3.8, 3.0, 0.9, glow, true, 0.8);

    // Pylons + Massive Twin Elevated Warp Nacelles
    for (const s of [-1, 1]) {
      m.addBox(s * 7.2, 1.6, -10.5, 9.2, 1.2, 4.2, mid, false, 0.9);
      // Nacelle body
      m.addBox(s * 12.2, 4.4, -12.0, 3.4, 3.4, 25.0, hull, false, 0.92);
      // Glowing cyan warp strips along outer & top nacelle
      m.addBox(s * 12.2, 4.6, -12.0, 3.8, 1.2, 20.5, glow, true, 0.95);
      // Bussard collector front cap (warm orange-cyan)
      m.addBox(s * 12.2, 4.4, 0.8, 3.0, 2.8, 1.6, [255, 150, 72], true, 0.75);
      // Rear impulse glow
      m.addBox(s * 12.2, 4.4, -24.8, 2.4, 2.4, 1.0, glow, true, 1.0);
    }

    return { verts: m.verts, faces: m.faces, radius: 26.0 };
  }

  // 4. Enemy Raider Starfighter (敵軍紅刃星際戰機)
  function buildEnemyFighter() {
    const m = builder();
    const dark = [66, 62, 78];
    const red = [214, 48, 66];
    const core = [255, 110, 62];

    // Sharp needle hull
    m.addBox(0, 0, 1.0, 0.95, 0.45, 2.6, dark, false, 0.22);
    m.addBox(0, 0, -0.7, 1.2, 0.55, 1.5, red, false, 0.9);
    // Glowing amber visor cockpit
    m.addBox(0, 0.3, 0.4, 0.52, 0.26, 0.95, core, true, 0.55);

    // Forward-swept predator wings (iconic villain starfighter!)
    m.addWing(0.55, 0.0, 0.3, 2.8, -0.25, 1.75, -1.0, -0.35, 0.16, dark, true);
    m.addWing(0.55, 0.08, 0.0, 2.1, -0.1, 1.2, -0.9, -0.2, 0.12, red, true);

    // Engine glow
    m.addBox(0, 0, -1.55, 0.78, 0.34, 0.25, core, true, 1.0);
    return { verts: m.verts, faces: m.faces, radius: 3.1 };
  }

  // 5. Enemy Atmospheric Assault Corvette (敵軍強襲護衛艦)
  function buildEnemyCorvette() {
    const m = builder();
    const armor = [84, 78, 96];
    const crimson = [196, 44, 62];
    const glow = [255, 92, 56];

    // Heavy twin-prow gunship hull
    m.addBox(0, 0, 0.5, 3.6, 1.5, 6.2, armor, false, 0.55);
    m.addBox(0, 0.95, -0.4, 1.8, 0.9, 3.0, crimson, false, 0.7);
    m.addBox(0, 1.05, 1.1, 1.3, 0.55, 0.8, glow, true, 0.85);
    // Side armored sponsons
    for (const s of [-1, 1]) {
      m.addBox(s * 2.7, -0.15, -0.4, 1.4, 1.0, 4.6, crimson, false, 0.65);
      m.addBox(s * 2.7, -0.15, -2.85, 1.0, 0.7, 0.45, glow, true, 1.0);
    }
    m.addBox(0, 0, -2.75, 2.0, 0.85, 0.5, glow, true, 1.0);
    return { verts: m.verts, faces: m.faces, radius: 5.5 };
  }

  // 6. Enemy Star Destroyer (敵軍星際驅逐艦 — Classic Wedge Capital Ship)
  function buildEnemyDestroyer() {
    const m = builder();
    const hull = [96, 98, 114];
    const dark = [58, 60, 74];
    const red = [198, 46, 66];
    const glow = [255, 86, 56];

    // Massive dagger wedge hull (layered tiers)
    m.addBox(0, 0, 2.0, 19.0, 4.2, 34.0, hull, false, 0.14);
    m.addBox(0, 2.8, -4.0, 12.5, 2.4, 20.0, dark, false, 0.25);
    m.addBox(0, 4.6, -8.5, 7.2, 2.0, 10.0, hull, false, 0.5);
    // Tall command bridge tower
    m.addBox(0, 7.6, -11.0, 9.0, 2.8, 3.6, dark, false, 0.9);
    m.addBox(0, 7.8, -9.1, 7.2, 1.0, 0.6, glow, true, 1.0);
    // Crimson broadside armor stripes
    for (const s of [-1, 1]) {
      m.addBox(s * 4.8, 1.2, -3.0, 2.4, 1.2, 18.0, red, false, 0.4);
      // Glowing engine banks
      m.addBox(s * 5.2, 0.0, -15.4, 3.4, 2.6, 1.2, glow, true, 1.0);
    }
    m.addBox(0, 0.0, -15.5, 4.2, 3.0, 1.4, glow, true, 1.0);
    return { verts: m.verts, faces: m.faces, radius: 22.0 };
  }

  // 7. Boss Flagship Dreadnought (敵軍殲星旗艦・破滅者號)
  function buildBossFlagship() {
    const m = builder();
    const obs = [62, 58, 76];
    const steel = [110, 108, 128];
    const crimson = [212, 38, 66];
    const coreGlow = [255, 64, 148];
    const engGlow = [255, 118, 48];

    // Colossal main backbone hull
    m.addBox(0, 0, -6.0, 28.0, 8.0, 42.0, obs, false, 0.55);
    // Twin massive armored forward mandibles flanking the superweapon core
    for (const s of [-1, 1]) {
      m.addBox(s * 10.5, 0.0, 22.0, 9.5, 5.2, 24.0, steel, false, 0.35);
      m.addBox(s * 10.5, 2.8, 16.0, 4.2, 1.6, 20.0, crimson, false, 0.45);
      // Broadside wing fortress batteries
      m.addBox(s * 21.0, -0.5, -6.0, 14.0, 4.0, 26.0, obs, false, 0.55);
      m.addBox(s * 21.0, 2.0, -7.0, 6.5, 2.0, 14.0, crimson, false, 0.7);
      // Glowing plasma trench
      m.addBox(s * 16.5, 0.6, 2.0, 1.6, 1.6, 26.0, coreGlow, true, 0.9);
      // Twin massive engines each side
      m.addBox(s * 8.5, 0.0, -27.8, 6.2, 5.2, 2.0, engGlow, true, 1.0);
      m.addBox(s * 19.5, -0.5, -19.8, 5.0, 3.2, 1.8, engGlow, true, 1.0);
    }

    // Central Superweapon Core Reactor (pulsing magenta/crimson target!)
    m.addBox(0, 0.8, 18.0, 7.6, 5.6, 11.0, coreGlow, true, 0.82);

    // Towering Citadel Command Bridge
    m.addBox(0, 7.2, -10.0, 14.0, 6.2, 14.0, steel, false, 0.75);
    m.addBox(0, 12.2, -13.0, 16.0, 4.2, 6.5, obs, false, 0.9);
    m.addBox(0, 12.4, -9.6, 12.5, 1.6, 0.9, coreGlow, true, 1.0);

    return { verts: m.verts, faces: m.faces, radius: 38.0 };
  }

  // ============================================================================
  // 蟲族生物階層 3D 有機模型（完全去除飛機方盒造型！以球囊、骨刺、彎曲節肢與鋸齒蝙蝠翼重製）
  // ============================================================================

  // 8. 飛螳 MUTALISK (#5) — 高聳弓背、下捲蠍尾、鋸齒高拱蝙蝠雙翼＋青白刃蟲爪芒
  function buildBugDrone() {
    const m = builder();
    const indigo = [74, 62, 146];     // 深藍紫有機甲殼
    const crest = [118, 108, 194];    // 背甲骨刺高光
    const leather = [128, 66, 62];    // 暗褐紅蝙蝠翼膜
    const darkMem = [84, 42, 52];     // 翼膜陰影
    const bone = [184, 162, 134];     // 翼指骨爪
    const glaive = [108, 250, 255];   // 青白刃蟲電漿
    const eye = [255, 224, 88];

    // Hunched arched organic torso + curved armored head (blob segments, NOT rectangular jet!)
    m.addBlob(0, 0.35, 0.45, 0.85, 0.88, 1.15, indigo, false, 6, 4);
    m.addBlob(0, 0.65, 1.35, 0.62, 0.58, 0.85, crest, false, 6, 4);
    // Spiky jaw & glowing cyan glaive mouth + golden eyes
    m.addSpike(0, 0.48, 1.95, 0, 0.2, 2.85, 0.32, glaive, true);
    for (const s of [-1, 1]) {
      m.addBlob(s * 0.34, 0.78, 1.85, 0.16, 0.14, 0.16, eye, true, 4, 3);
      // Curved forward scythe arms holding glowing cyan glaive blades
      m.addSpike(s * 0.68, 0.05, 0.95, s * 1.15, -0.75, 1.65, 0.22, indigo, false);
      m.addSpike(s * 1.15, -0.75, 1.65, s * 0.65, -0.55, 2.85, 0.18, glaive, true);
    }
    // Dorsal spiky bone ridge along back
    m.addSpike(0, 1.05, 1.1, 0, 1.65, 0.65, 0.22, bone, false);
    m.addSpike(0, 1.08, 0.35, 0, 1.55, -0.25, 0.20, bone, false);

    // Classic downward-curled C-shaped shrimp/scorpion tail underneath!
    m.addBlob(0, -0.28, -0.45, 0.68, 0.62, 0.82, indigo, false, 6, 4);
    m.addBlob(0, -0.95, -0.95, 0.52, 0.54, 0.68, crest, false, 5, 4);
    m.addBlob(0, -1.55, -0.65, 0.42, 0.45, 0.56, indigo, false, 5, 3);
    m.addSpike(0, -1.75, -0.45, 0, -1.55, 0.55, 0.28, glaive, true);

    // High-arched jagged 3-fingered BAT WINGS (rising UP like a demon/bat, NOT flat airplane wings!)
    for (const s of [-1, 1]) {
      // Thick bone shoulder -> high elbow -> outer wingtip
      m.addSpike(s * 0.65, 0.65, 0.55, s * 2.25, 2.15, 0.75, 0.22, bone, false);
      m.addSpike(s * 2.25, 2.15, 0.75, s * 4.45, 1.45, -0.45, 0.18, bone, false);
      // Pointed bat thumb-claw at elbow
      m.addSpike(s * 2.25, 2.15, 0.75, s * 2.55, 2.75, 1.35, 0.14, bone, false);
      // Ribbed wing fingers radiating down-back
      m.addSpike(s * 2.25, 2.15, 0.75, s * 3.35, 0.25, -1.45, 0.12, bone, false);
      m.addSpike(s * 2.25, 2.15, 0.75, s * 1.95, -0.35, -1.35, 0.12, bone, false);
    }
    // Scalloped bat wing membrane webs (double-sided)
    m.addMembraneTri([0.65, 0.65, 0.55], [2.25, 2.15, 0.75], [1.95, -0.35, -1.35], darkMem, true);
    m.addMembraneTri([0.65, 0.2, -0.3], [0.65, 0.65, 0.55], [1.95, -0.35, -1.35], darkMem, true);
    m.addMembraneTri([2.25, 2.15, 0.75], [3.35, 0.25, -1.45], [1.95, -0.35, -1.35], leather, true);
    m.addMembraneTri([2.25, 2.15, 0.75], [4.45, 1.45, -0.45], [3.35, 0.25, -1.45], leather, true);

    return {
      verts: m.verts,
      faces: m.faces,
      radius: 4.5,
      anim: { type: "flap", xMin: 0.75, amp: 1.55, speed: 9.0, tailZ: -0.2 },
    };
  }

  // 9. 王蟲 OVERLORD (#8) — 巨大漂浮半透明青綠發光水母氣囊＋6 條垂掛擺動蜘蛛觸鬚（零機翼！）
  function buildBugMantis() {
    const m = builder();
    const sacOuter = [72, 206, 192];  // 標誌性發光青綠氣囊（#8 王蟲）
    const sacCore = [172, 255, 236];  // 內核發光生物氣體
    const carapace = [58, 44, 76];    // 暗紫甲殼頭甲
    const bone = [138, 120, 146];     // 甲殼骨刺
    const tendril = [78, 54, 96];     // 下垂蜘蛛觸鬚

    // Huge bulbous jellyfish/balloon floating gas sac dome (rounded multi-lobed blob!)
    m.addBlob(0, 2.25, 0.0, 2.75, 2.85, 2.85, sacOuter, true, 8, 5);
    m.addBlob(0, 2.65, -0.2, 1.75, 1.95, 1.85, sacCore, true, 6, 4);
    m.addBlob(0, 1.65, 1.35, 1.55, 1.55, 1.45, sacOuter, true, 6, 4);

    // Dark chitinous spider head & armored collar slung underneath the sac
    m.addBlob(0, -0.35, 0.45, 1.85, 1.05, 2.15, carapace, false, 6, 4);
    for (const s of [-1, 1]) {
      m.addSpike(s * 1.45, 0.25, 0.8, s * 2.45, 0.95, 1.35, 0.35, bone, false);
      m.addSpike(s * 1.65, 0.15, -0.6, s * 2.55, 0.75, -1.1, 0.32, bone, false);
      // Glowing cyan eyes on lower spider head
      m.addBlob(s * 0.65, -0.25, 2.25, 0.28, 0.22, 0.24, sacCore, true, 4, 3);

      // 3 pairs of long curving dangling spider-legs / tentacles hanging WAY down!
      // Front pair
      m.addSpike(s * 1.15, -0.85, 1.25, s * 2.05, -2.55, 1.65, 0.32, carapace, false);
      m.addSpike(s * 2.05, -2.55, 1.65, s * 1.25, -4.65, 1.35, 0.22, tendril, false);
      // Mid pair (longest swaying tentacles)
      m.addSpike(s * 1.45, -0.85, 0.0, s * 2.55, -2.85, -0.1, 0.34, carapace, false);
      m.addSpike(s * 2.55, -2.85, -0.1, s * 1.85, -5.35, -0.35, 0.24, tendril, false);
      // Rear pair
      m.addSpike(s * 1.1, -0.85, -1.15, s * 1.85, -2.65, -1.75, 0.30, carapace, false);
      m.addSpike(s * 1.85, -2.65, -1.75, s * 0.95, -4.55, -2.05, 0.20, tendril, false);
    }
    // Central dangling glowing brood-tendril
    m.addSpike(0, -1.0, 0.0, 0, -4.2, -0.2, 0.35, sacCore, true);

    return {
      verts: m.verts,
      faces: m.faces,
      radius: 5.8,
      anim: { type: "overlord", ySac: 0.5, yLeg: -1.2, amp: 0.42, speed: 3.4 },
    };
  }

  // 10. 感染蟲母艦 INFESTOR / SWARM HOST LEVIATHAN (#9 + #6) — 巨型弓背蟲軀、7 顆脈動螢光綠毒液巨囊、利爪口器與 8 條蟲足（完全不像戰艦/飛機！）
  function buildBugHiveCruiser() {
    const m = builder();
    const armor = [82, 58, 52];       // 暗褐厚甲（#6 百生蟲 / #9 感染蟲）
    const dark = [46, 32, 44];        // 暗紫腹甲
    const bone = [158, 134, 106];     // 骨刺脊甲
    const gland = [98, 255, 68];      // 標誌性螢光綠感染毒囊
    const glandHot = [196, 255, 148]; // 毒囊脈動亮心

    // Segmented bloated bio-slug carapace (4 overlapping organic domes!)
    m.addBlob(0, 0.8, 9.0, 7.2, 5.2, 8.5, armor, false, 7, 4);
    m.addBlob(0, 1.8, 0.0, 8.8, 6.4, 9.5, armor, false, 7, 4);
    m.addBlob(0, 0.9, -9.5, 7.6, 5.4, 8.8, dark, false, 7, 4);
    m.addBlob(0, -0.6, -18.5, 5.2, 3.8, 7.2, dark, false, 6, 4);

    // 7 HUGE bulging glowing neon-green Infestor venom sacs erupting along back & flanks!
    m.addBlob(0, 6.2, 1.5, 4.4, 3.4, 5.4, gland, true, 6, 4);
    m.addBlob(0, 7.5, 1.5, 2.4, 1.9, 3.0, glandHot, true, 5, 3);
    m.addBlob(0, 5.4, -7.5, 3.8, 3.0, 4.6, gland, true, 6, 4);
    for (const s of [-1, 1]) {
      m.addBlob(s * 6.8, 3.4, 5.5, 3.2, 2.6, 4.2, gland, true, 6, 4);
      m.addBlob(s * 7.6, 2.8, -3.5, 3.6, 2.8, 4.8, gland, true, 6, 4);
      // Dorsal bone spines jutting out of carapace
      m.addSpike(s * 3.8, 4.8, 9.5, s * 5.8, 8.2, 11.2, 1.1, bone, false);
      m.addSpike(s * 4.5, 5.2, -11.5, s * 6.8, 8.4, -14.0, 1.1, bone, false);
      // Massive curved front fang mandibles around glowing acid maw
      m.addSpike(s * 4.5, -0.5, 14.5, s * 7.2, -1.8, 22.5, 1.8, bone, false);
      m.addSpike(s * 2.8, -2.5, 15.0, s * 4.2, -4.5, 21.0, 1.3, bone, false);
      // 4 pairs of splayed spiky insectoid legs + writhing tail tentacles!
      const legZ = [10.0, 2.5, -5.5, -13.0];
      for (let k = 0; k < legZ.length; k++) {
        const lz = legZ[k];
        m.addSpike(s * 7.2, -1.8, lz, s * 13.8, -5.5, lz + 1.5, 1.4, dark, false);
        m.addSpike(s * 13.8, -5.5, lz + 1.5, s * 15.5, -10.5, lz - 1.0, 0.9, bone, false);
      }
      // Writhing rear tentacles
      m.addSpike(s * 3.2, -1.2, -23.0, s * 6.5, -2.8, -32.5, 1.4, dark, false);
    }
    // Central pulsing acid maw in front
    m.addBlob(0, -0.8, 17.5, 3.4, 2.8, 2.8, glandHot, true, 6, 4);
    m.addSpike(0, -0.6, -24.0, 0, -1.8, -35.0, 1.8, gland, true);

    return {
      verts: m.verts,
      faces: m.faces,
      radius: 23.0,
      anim: { type: "overlord", ySac: 2.2, yLeg: -3.5, amp: 1.25, speed: 4.0 },
    };
  }

  // 11. 蟲巢領主 BROOD LORD (#10) — 遮天巨型高拱鋸齒蝙蝠翼、彎角魔首、雙巨爪懷抱螢光蟲卵群（絕對霸氣生物巨獸！）
  function buildBugOverlordBoss() {
    const m = builder();
    const carapace = [92, 54, 48];    // 暗褐紅甲殼軀幹
    const darkMem = [74, 38, 36];     // 深褐巨翼膜
    const leather = [126, 70, 52];    // 翼膜褐紅亮面
    const bone = [194, 166, 132];     // 巨型骨刺、頭冠角、翼指骨
    const eggGreen = [116, 255, 84];  // 下腹螢光孵化卵囊
    const coreGlow = [174, 255, 224]; // 核心強光

    // Massive curved hunched gargoyle body (rounded organic blobs!)
    m.addBlob(0, 2.5, 2.0, 9.5, 8.2, 13.5, carapace, false, 7, 5);
    m.addBlob(0, 5.2, 12.5, 6.2, 5.5, 7.5, carapace, false, 6, 4);
    // Fierce horned Brood Lord head & glowing maw
    m.addBlob(0, 3.8, 19.5, 3.6, 3.0, 3.2, coreGlow, true, 6, 4);
    // Towering dorsal bone spines & crown horns
    m.addSpike(0, 9.5, 11.0, 0, 17.5, 6.5, 2.6, bone, false);
    m.addSpike(0, 9.0, 2.0, 0, 15.5, -3.5, 2.4, bone, false);
    for (const s of [-1, 1]) {
      // Huge forward-curving Ultralisk-style horn tusks
      m.addSpike(s * 4.8, 5.8, 16.0, s * 10.5, 9.5, 26.5, 2.2, bone, false);
      m.addSpike(s * 5.2, 1.5, 16.5, s * 9.8, -3.5, 26.0, 2.0, bone, false);
      // Giant lower raptorial talons cradling the brood egg cluster!
      m.addSpike(s * 6.5, -2.5, 8.0, s * 9.5, -10.5, 11.5, 2.2, carapace, false);
      m.addSpike(s * 9.5, -10.5, 11.5, s * 4.2, -14.0, 14.5, 1.6, bone, false);
    }

    // Glowing Brood Egg Cluster hanging underneath belly (spawns Mutalisks!)
    m.addBlob(0, -6.5, 5.0, 5.2, 4.8, 6.2, eggGreen, true, 6, 4);
    m.addBlob(3.8, -8.5, 7.5, 2.8, 2.8, 3.2, coreGlow, true, 5, 3);
    m.addBlob(-3.8, -8.5, 7.5, 2.8, 2.8, 3.2, coreGlow, true, 5, 3);
    m.addBlob(0, -10.5, 4.0, 3.2, 3.2, 3.5, eggGreen, true, 5, 3);

    // Curled scorpion/dragon tail curving down behind
    m.addBlob(0, -0.5, -11.5, 5.8, 5.0, 7.5, carapace, false, 6, 4);
    m.addBlob(0, -4.5, -19.5, 4.2, 3.8, 6.0, darkMem, false, 5, 4);
    m.addSpike(0, -6.5, -23.5, 0, -3.5, -33.0, 2.6, eggGreen, true);

    // COLOSSAL HIGH-ARCHED MULTI-FINGERED BAT/DRAGON WINGS (true Brood Lord #10 silhouette!)
    for (const s of [-1, 1]) {
      // Shoulder -> towering elbow crest -> colossal outer wingtip
      m.addSpike(s * 7.5, 5.5, 6.0, s * 22.0, 19.5, 8.5, 2.4, bone, false);
      m.addSpike(s * 22.0, 19.5, 8.5, s * 44.0, 12.5, -6.0, 1.9, bone, false);
      // Huge bone wing-thumb claw
      m.addSpike(s * 22.0, 19.5, 8.5, s * 24.5, 25.5, 14.0, 1.5, bone, false);
      // 3 sweeping wing-finger ribs fanning downward-back
      m.addSpike(s * 22.0, 19.5, 8.5, s * 35.0, -1.5, -16.0, 1.4, bone, false);
      m.addSpike(s * 22.0, 19.5, 8.5, s * 23.0, -6.5, -17.5, 1.4, bone, false);
      m.addSpike(s * 22.0, 19.5, 8.5, s * 13.0, -4.5, -13.0, 1.3, bone, false);
    }
    // Jagged scalloped giant bat-wing membranes (double-sided!)
    m.addMembraneTri([7.5, 5.5, 6.0], [22.0, 19.5, 8.5], [13.0, -4.5, -13.0], darkMem, true);
    m.addMembraneTri([7.5, 0.5, -7.0], [7.5, 5.5, 6.0], [13.0, -4.5, -13.0], darkMem, true);
    m.addMembraneTri([22.0, 19.5, 8.5], [23.0, -6.5, -17.5], [13.0, -4.5, -13.0], leather, true);
    m.addMembraneTri([22.0, 19.5, 8.5], [35.0, -1.5, -16.0], [23.0, -6.5, -17.5], darkMem, true);
    m.addMembraneTri([22.0, 19.5, 8.5], [44.0, 12.5, -6.0], [35.0, -1.5, -16.0], leather, true);

    return {
      verts: m.verts,
      faces: m.faces,
      radius: 43.0,
      anim: { type: "flap", xMin: 8.5, amp: 10.5, speed: 3.1, tailZ: -8.0 },
    };
  }

  // ============================================================================
  // 全 9 款聯邦 8-BIT 風格 3D 立體星艦模型（含分部動畫標籤 vTags 與武器／推進器掛點 hardpoints）
  // Local coordinates: +Z forward (nose), +Y up, +X right
  // ============================================================================

  // 01. 主力艦 CAPITAL SHIP — 巨型雙叉旗艦＋金邊金屬天使雙翼＋青光核心艦脊
  function buildStarshipCapitalShip() {
    const m = builder();
    const hull = [194, 214, 238];
    const steel = [106, 134, 174];
    const dark = [46, 62, 92];
    const gold = [242, 192, 68];
    const cyan = [66, 244, 255];

    m.setTag("body");
    // Central armored spine & split dual-prong forward hull
    m.addBox(0, 0.0, -0.3, 2.2, 1.05, 4.4, steel, false, 0.78);
    m.addBox(0, 0.38, -0.8, 1.75, 0.65, 3.0, hull, false, 0.85);
    // Split twin forward armored prongs (+Z)
    for (const s of [-1, 1]) {
      m.addBox(s * 0.72, 0.02, 2.35, 0.86, 0.78, 2.9, hull, false, 0.34);
      m.addBox(s * 0.72, -0.35, 2.0, 0.74, 0.34, 2.4, dark, false, 0.45);
      // Glowing cyan inner prong vents
      m.addBox(s * 0.34, 0.05, 2.45, 0.16, 0.24, 1.8, cyan, true, 0.7);
      // Side armored engine/shield pods
      m.addBox(s * 1.55, -0.05, -0.95, 0.85, 0.66, 2.1, steel, false, 0.8);
      m.addBox(s * 1.58, 0.02, -0.25, 0.62, 0.24, 0.65, cyan, true, 0.9);
      m.addBox(s * 1.55, -0.4, -0.95, 0.68, 0.14, 1.4, gold, false, 0.85);
    }
    // Glowing cyan central dorsal core trench & gold royal crest
    m.addBox(0, 0.64, 0.85, 0.44, 0.24, 2.35, cyan, true, 0.45);
    m.addBox(0, 0.92, -0.45, 0.62, 0.36, 1.8, gold, false, 0.65);
    m.addBox(0, 1.12, -1.15, 0.95, 0.42, 1.15, hull, false, 0.75);
    m.addBox(0, 1.18, -0.52, 0.65, 0.16, 0.26, cyan, true, 1.0);

    // Signature Royal Gold-Trimmed Angel Wings (animated on boost & overdrive!)
    m.setTag("wing");
    // Upper primary feathered wing blades
    m.addWing(0.75, 0.78, -0.15, 4.35, 1.48, -1.55, -1.55, -2.25, 0.18, hull, true);
    m.addWing(0.85, 0.88, -0.05, 4.55, 1.56, -1.45, -0.42, -1.78, 0.12, gold, true);
    // Mid secondary wing feather tier
    m.addWing(0.85, 0.52, -0.75, 3.65, 0.92, -2.05, -1.75, -2.65, 0.16, steel, true);
    m.addWing(0.95, 0.56, -0.82, 3.78, 0.98, -2.02, -1.12, -2.28, 0.10, gold, true);
    // Lower feather accent tier
    m.addWing(0.9, 0.22, -1.15, 2.75, 0.42, -2.35, -1.95, -2.75, 0.14, hull, true);

    // Broadside heavy cannon turrets
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.18, 0.18, 1.55, 0.26, 0.22, 1.35, dark, false, 0.65);
      m.addBox(s * 0.72, 0.24, 3.55, 0.20, 0.18, 0.85, dark, false, 0.6);
    }

    // Ventral missile launch bays
    m.setTag("bay");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.88, -0.46, 0.45, 0.48, 0.22, 0.95, gold, false, 0.85);
    }

    // Triple heavy stern thruster nozzles
    m.setTag("engine");
    m.addBox(0, 0.05, -2.65, 1.15, 0.62, 0.45, cyan, true, 1.0);
    for (const s of [-1, 1]) {
      m.addBox(s * 1.48, -0.04, -2.18, 0.68, 0.48, 0.38, cyan, true, 1.0);
    }

    return {
      id: "capital_ship",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.9,
      shieldRadius: 5.5,
      beamColor: "#5ef6ff",
      beamCore: "#fff5b8",
      signatureName: "天使光翼展開・聖輝齊射",
      signatureDesc: "雙翼展開並釋放金青光羽能量，四聯主砲與天使光翼同步齊射！",
      hardpoints: {
        lasers: [[-0.72, 0.24, 4.0], [0.72, 0.24, 4.0], [-1.18, 0.18, 2.3], [1.18, 0.18, 2.3]],
        missiles: [[-0.88, -0.55, 1.0], [0.88, -0.55, 1.0], [-1.55, -0.35, 0.2], [1.55, -0.35, 0.2]],
        engines: [
          { pos: [0, 0.05, -2.85], size: 1.35, color: "#5ef6ff" },
          { pos: [-1.48, -0.04, -2.38], size: 0.95, color: "#5ef6ff" },
          { pos: [1.48, -0.04, -2.38], size: 0.95, color: "#5ef6ff" },
        ],
        retroNozzles: [[-0.95, 0.0, 3.6], [0.95, 0.0, 3.6]],
        flarePorts: [[-1.3, -0.3, -1.9], [1.3, -0.3, -1.9]],
      },
    };
  }

  // 02. 戰列艦 BATTLESHIP — 重裝方正雙砲門艦首＋青銅金裝甲指揮塔＋雙側重型推進莢艙
  function buildStarshipBattleship() {
    const m = builder();
    const hull = [194, 212, 232];
    const steel = [118, 146, 184];
    const dark = [44, 56, 82];
    const bronze = [204, 158, 76];
    const cyan = [64, 240, 255];

    m.setTag("body");
    // Heavy elongated rectangular main hull
    m.addBox(0, 0.0, 0.2, 2.15, 1.15, 5.2, steel, false, 0.88);
    // Heavy forward twin armored slabs flanking central railgun channel
    for (const s of [-1, 1]) {
      m.addBox(s * 0.78, 0.12, 2.05, 0.86, 0.92, 3.1, hull, false, 0.72);
      m.addBox(s * 0.78, -0.32, 1.6, 0.78, 0.36, 3.4, dark, false, 0.8);
      m.addBox(s * 1.12, -0.06, 0.9, 0.16, 0.22, 2.4, cyan, true, 0.95);
    }
    // Bronze-gold armored dorsal command superstructure
    m.addBox(0, 0.78, -0.95, 1.48, 0.68, 2.35, bronze, false, 0.78);
    m.addBox(0, 1.18, -1.25, 1.05, 0.42, 1.35, bronze, false, 0.82);
    m.addBox(0, 1.20, -0.52, 0.72, 0.18, 0.24, cyan, true, 1.0);
    // Rear twin armored engine blocks
    for (const s of [-1, 1]) {
      m.addBox(s * 0.82, 0.08, -2.15, 0.95, 0.95, 1.75, hull, false, 0.95);
    }

    // Heavy outboard wing engine sponsons
    m.setTag("wing");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.85, 0.02, -1.45, 1.18, 0.82, 2.05, hull, false, 0.92);
      m.addBox(s * 1.85, 0.05, -0.38, 0.78, 0.38, 0.22, cyan, true, 1.0);
    }

    // Recessed twin mega-railgun barrels + sponson cannons
    m.setTag("gun");
    m.addBox(0, 0.05, 2.85, 0.56, 0.42, 2.1, dark, false, 0.82);
    m.addBox(0, 0.05, 3.92, 0.38, 0.28, 0.22, cyan, true, 1.0);
    for (const s of [-1, 1]) {
      m.addBox(s * 1.85, 0.36, -0.45, 0.24, 0.22, 1.5, dark, false, 0.7);
    }

    // Side VLS missile silos
    m.setTag("bay");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.92, 0.62, -0.1, 0.38, 0.24, 1.1, bronze, false, 0.9);
    }

    // Quad rear heavy thrusters
    m.setTag("engine");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.82, 0.06, -3.12, 0.68, 0.58, 0.32, cyan, true, 1.0);
      m.addBox(s * 1.85, 0.02, -2.55, 0.76, 0.52, 0.32, cyan, true, 1.0);
    }

    return {
      id: "battleship",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.5,
      shieldRadius: 5.1,
      beamColor: "#ffd166",
      beamCore: "#ffffff",
      signatureName: "軌道重砲齊射模式",
      signatureDesc: "艦艏雙聯巨砲與側翼砲塔同時超載，發射震懾戰場的金色重型軌道齊射！",
      hardpoints: {
        lasers: [[-0.25, 0.05, 4.1], [0.25, 0.05, 4.1], [-1.85, 0.36, 0.4], [1.85, 0.36, 0.4]],
        missiles: [[-0.92, 0.75, 0.4], [0.92, 0.75, 0.4], [-1.85, -0.35, -0.5], [1.85, -0.35, -0.5]],
        engines: [
          { pos: [-0.82, 0.06, -3.28], size: 1.05, color: "#5ef2ff" },
          { pos: [0.82, 0.06, -3.28], size: 1.05, color: "#5ef2ff" },
          { pos: [-1.85, 0.02, -2.72], size: 0.95, color: "#5ef2ff" },
          { pos: [1.85, 0.02, -2.72], size: 0.95, color: "#5ef2ff" },
        ],
        retroNozzles: [[-1.0, 0.0, 3.6], [1.0, 0.0, 3.6]],
        flarePorts: [[-1.5, -0.35, -2.3], [1.5, -0.35, -2.3]],
      },
    };
  }

  // 03. 巡洋艦 CRUISER — 修長流線銀藍雙叉艦首＋後掠穩定翼＋巨型尾部反應爐推進器
  function buildStarshipCruiser() {
    const m = builder();
    const hull = [176, 202, 232];
    const steel = [96, 126, 168];
    const dark = [44, 60, 88];
    const cyan = [68, 244, 255];

    m.setTag("body");
    // Streamlined central fuselage
    m.addBox(0, 0.0, -0.1, 1.48, 0.78, 4.8, hull, false, 0.65);
    m.addBox(0, 0.44, -0.55, 0.88, 0.38, 2.5, steel, false, 0.68);
    m.addBox(0, 0.56, 0.45, 0.52, 0.22, 0.85, cyan, true, 0.65);
    // Split twin forward prongs
    for (const s of [-1, 1]) {
      m.addBox(s * 0.56, -0.02, 2.35, 0.48, 0.52, 2.35, hull, false, 0.28);
      m.addBox(s * 0.56, -0.22, 1.95, 0.44, 0.22, 1.8, dark, false, 0.35);
    }

    // Swept angular side stabilizer wings + tip winglets
    m.setTag("wing");
    m.addWing(0.68, -0.04, 0.35, 3.15, -0.18, -1.15, -1.65, -2.05, 0.16, hull, true);
    m.addWing(0.75, 0.04, -0.1, 2.55, -0.08, -1.2, -1.45, -1.85, 0.12, steel, true);
    for (const s of [-1, 1]) {
      m.addBox(s * 3.12, 0.06, -1.55, 0.16, 0.52, 1.15, hull, false, 0.65);
    }

    // Prong tip cannons & underwing pulse guns
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.56, 0.12, 3.45, 0.16, 0.16, 0.85, dark, false, 0.6);
      m.addBox(s * 2.15, -0.22, -0.55, 0.22, 0.18, 1.15, dark, false, 0.7);
    }

    // Ventral missile bay
    m.setTag("bay");
    m.addBox(0, -0.44, 0.55, 0.88, 0.22, 1.15, dark, false, 0.85);

    // Oversized glowing cyan rear reactor core + side exhausts
    m.setTag("engine");
    m.addBox(0, 0.0, -2.65, 1.18, 0.72, 0.55, dark, false, 0.9);
    m.addBlob(0, 0.0, -2.95, 0.56, 0.42, 0.48, cyan, true, 6, 4);
    for (const s of [-1, 1]) {
      m.addBox(s * 0.95, 0.0, -2.35, 0.34, 0.28, 0.35, cyan, true, 1.0);
    }

    return {
      id: "cruiser",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.1,
      shieldRadius: 4.7,
      beamColor: "#48e5ff",
      beamCore: "#ffffff",
      signatureName: "全頻巡航超載陣",
      signatureDesc: "主反應爐全功率輸出，雙翼後掠進入高機動巡航並連續齊射脈衝雷射！",
      hardpoints: {
        lasers: [[-0.56, 0.12, 3.9], [0.56, 0.12, 3.9], [-2.15, -0.22, 0.1], [2.15, -0.22, 0.1]],
        missiles: [[-0.35, -0.52, 1.1], [0.35, -0.52, 1.1]],
        engines: [
          { pos: [0, 0, -3.22], size: 1.35, color: "#48e5ff" },
          { pos: [-0.95, 0, -2.55], size: 0.65, color: "#48e5ff" },
          { pos: [0.95, 0, -2.55], size: 0.65, color: "#48e5ff" },
        ],
        retroNozzles: [[-0.7, 0, 3.3], [0.7, 0, 3.3]],
        flarePorts: [[-1.1, -0.25, -2.1], [1.1, -0.25, -2.1]],
      },
    };
  }

  // 04. 驅逐艦 DESTROYER — 鋒利匕首尖銳艦艏＋金銅裝甲背脊＋巨型雙聯青焰推進引擎
  function buildStarshipDestroyer() {
    const m = builder();
    const hull = [208, 224, 242];
    const steel = [102, 128, 166];
    const dark = [42, 54, 80];
    const gold = [214, 166, 72];
    const cyan = [66, 245, 255];

    m.setTag("body");
    // Sharp spearhead hull + split nose
    m.addBox(0, 0.0, 0.1, 1.55, 0.76, 4.4, steel, false, 0.42);
    for (const s of [-1, 1]) {
      m.addBox(s * 0.42, 0.04, 2.25, 0.52, 0.56, 2.3, hull, false, 0.22);
      m.addBox(s * 0.85, -0.08, -0.3, 0.45, 0.34, 1.6, dark, false, 0.7);
      m.addBox(s * 0.92, -0.04, -0.1, 0.24, 0.16, 0.7, cyan, true, 1.0);
    }
    // Glowing cyan central accelerator channel & gold dorsal armor ridge
    m.addBox(0, 0.34, 1.45, 0.28, 0.18, 1.75, cyan, true, 0.5);
    m.addBox(0, 0.56, -0.65, 0.72, 0.38, 2.45, gold, false, 0.45);
    m.addBox(0, 0.42, -1.75, 1.32, 0.26, 0.65, gold, false, 0.9);

    // Compact angular rear assault fins
    m.setTag("wing");
    m.addWing(0.75, -0.04, -0.65, 2.35, -0.14, -1.45, -1.95, -2.25, 0.18, steel, true);
    for (const s of [-1, 1]) {
      m.addBox(s * 1.65, 0.0, -1.55, 0.72, 0.44, 1.2, hull, false, 0.82);
      m.addBox(s * 1.68, 0.0, -0.92, 0.44, 0.18, 0.18, cyan, true, 1.0);
    }

    // Forward high-velocity twin autocannons
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.42, 0.18, 3.2, 0.16, 0.16, 1.15, dark, false, 0.6);
    }

    // Dorsal torpedo launcher pod
    m.setTag("bay");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.55, -0.36, 0.4, 0.34, 0.22, 0.95, gold, false, 0.8);
    }

    // Massive twin glowing cyan rear engines
    m.setTag("engine");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.58, 0.06, -2.35, 0.68, 0.54, 0.48, cyan, true, 1.0);
    }

    return {
      id: "destroyer",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 3.9,
      shieldRadius: 4.5,
      beamColor: "#38f8ff",
      beamCore: "#ffe680",
      signatureName: "穿甲突擊超載衝鋒",
      signatureDesc: "雙聯渦輪引擎爆燃加速，前置穿甲連發砲進入高速連射突擊狀態！",
      hardpoints: {
        lasers: [[-0.42, 0.18, 3.85], [0.42, 0.18, 3.85], [-1.65, 0.0, -0.75], [1.65, 0.0, -0.75]],
        missiles: [[-0.55, -0.45, 0.95], [0.55, -0.45, 0.95]],
        engines: [
          { pos: [-0.58, 0.06, -2.62], size: 1.15, color: "#42f5ff" },
          { pos: [0.58, 0.06, -2.62], size: 1.15, color: "#42f5ff" },
        ],
        retroNozzles: [[-0.6, 0, 3.1], [0.6, 0, 3.1]],
        flarePorts: [[-1.15, -0.2, -2.1], [1.15, -0.2, -2.1]],
      },
    };
  }

  // 05. 巡防艦 FRIGATE — 緊湊堅固雙肋楔形護衛艦＋暖金艦橋＋雙側模組推進艙
  function buildStarshipFrigate() {
    const m = builder();
    const hull = [190, 210, 234];
    const steel = [110, 136, 174];
    const dark = [44, 58, 84];
    const gold = [202, 168, 102];
    const cyan = [64, 242, 255];

    m.setTag("body");
    // Compact wedge main body
    m.addBox(0, 0.0, 0.0, 1.95, 0.84, 3.8, steel, false, 0.56);
    // Armored twin-ribbed forward bow
    for (const s of [-1, 1]) {
      m.addBox(s * 0.56, 0.05, 1.55, 0.68, 0.62, 2.15, hull, false, 0.38);
      m.addBox(s * 0.85, -0.18, 0.9, 0.24, 0.16, 1.1, cyan, true, 0.8);
    }
    // Central cyan sensor/core emitter between ribs
    m.addBox(0, 0.05, 2.25, 0.36, 0.32, 0.55, cyan, true, 0.75);
    // Warm gold armored bridge module
    m.addBox(0, 0.62, -0.45, 1.05, 0.44, 1.45, gold, false, 0.75);
    m.addBox(0, 0.58, -1.35, 1.38, 0.42, 1.15, hull, false, 0.88);

    // Twin side escort pods
    m.setTag("wing");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.55, -0.02, -0.85, 0.88, 0.58, 1.55, hull, false, 0.85);
      m.addBox(s * 1.12, 0.14, -0.85, 0.42, 0.32, 0.85, gold, false, 0.9);
      m.addBox(s * 1.58, -0.02, -0.05, 0.52, 0.24, 0.18, cyan, true, 1.0);
    }

    // Point-defense turrets
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.56, 0.24, 2.55, 0.16, 0.16, 0.65, dark, false, 0.65);
      m.addBox(s * 1.55, 0.32, -0.45, 0.18, 0.16, 0.85, dark, false, 0.7);
    }

    // Ventral quick-response missile pod
    m.setTag("bay");
    m.addBox(0, -0.44, 0.35, 0.85, 0.22, 0.95, dark, false, 0.85);

    // Stern engines
    m.setTag("engine");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.55, 0.02, -2.05, 0.52, 0.42, 0.32, cyan, true, 1.0);
      m.addBox(s * 1.55, -0.02, -1.72, 0.54, 0.38, 0.3, cyan, true, 1.0);
    }

    return {
      id: "frigate",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 3.5,
      shieldRadius: 4.2,
      beamColor: "#5ef2ff",
      beamCore: "#ffffff",
      signatureName: "全向點防禦護衛陣",
      signatureDesc: "開啟防禦感測陣列，自動向周圍發射點防禦攔截光束並強化護盾回覆！",
      hardpoints: {
        lasers: [[-0.56, 0.24, 2.95], [0.56, 0.24, 2.95], [-1.55, 0.32, 0.05], [1.55, 0.32, 0.05]],
        missiles: [[-0.35, -0.5, 0.85], [0.35, -0.5, 0.85]],
        engines: [
          { pos: [-0.55, 0.02, -2.22], size: 0.82, color: "#5ef2ff" },
          { pos: [0.55, 0.02, -2.22], size: 0.82, color: "#5ef2ff" },
          { pos: [-1.55, -0.02, -1.88], size: 0.72, color: "#5ef2ff" },
          { pos: [1.55, -0.02, -1.88], size: 0.72, color: "#5ef2ff" },
        ],
        retroNozzles: [[-0.75, 0, 2.55], [0.75, 0, 2.55]],
        flarePorts: [[-1.1, -0.2, -1.7], [1.1, -0.2, -1.7]],
      },
    };
  }

  // 06. 航空母艦 CARRIER — 寬闊雙體飛行甲板＋雙前開式發光青色戰機彈射機庫＋金甲航管艦橋
  function buildStarshipCarrier() {
    const m = builder();
    const hull = [186, 208, 234];
    const steel = [98, 124, 164];
    const dark = [44, 56, 82];
    const gold = [214, 168, 76];
    const cyan = [72, 248, 255];

    m.setTag("body");
    // Broad central carrier core
    m.addBox(0, 0.0, -0.6, 2.8, 1.1, 3.8, steel, false, 0.92);
    // Massive bronze-gold rear aviation command island
    m.addBox(0, 0.88, -1.25, 1.75, 0.78, 2.1, gold, false, 0.82);
    m.addBox(0, 1.38, -1.45, 1.18, 0.42, 1.2, hull, false, 0.88);
    m.addBox(0, 1.35, -0.82, 0.85, 0.18, 0.22, cyan, true, 1.0);

    // Broad twin forward catamaran flight-deck hulls & glowing open hangar bays!
    m.setTag("bay");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.05, 0.05, 1.65, 1.15, 0.92, 2.85, hull, false, 0.9);
      m.addBox(s * 1.05, -0.35, 1.65, 1.05, 0.26, 2.95, dark, false, 0.94);
      // Giant bright electric-cyan glowing front fighter launch hangar openings!
      m.addBox(s * 1.05, 0.02, 3.08, 0.76, 0.56, 0.22, cyan, true, 1.0);
    }
    // Recessed central bridge deck between twin hangars
    m.setTag("body");
    m.addBox(0, -0.05, 1.35, 1.05, 0.65, 2.2, dark, false, 0.92);
    m.addBox(0, 0.0, 2.48, 0.72, 0.26, 0.2, cyan, true, 1.0);

    // Wide side wing-deck sponsons
    m.setTag("wing");
    for (const s of [-1, 1]) {
      m.addBox(s * 2.15, 0.02, -0.95, 1.45, 0.58, 1.95, hull, false, 0.86);
      m.addBox(s * 1.65, 0.34, -0.95, 0.75, 0.22, 1.25, gold, false, 0.9);
      m.addBox(s * 2.15, 0.02, 0.05, 0.75, 0.22, 0.18, cyan, true, 1.0);
    }

    // Defensive deck turrets
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.48, 0.56, 1.85, 0.22, 0.18, 0.85, dark, false, 0.7);
      m.addBox(s * 2.45, 0.34, -0.35, 0.20, 0.18, 0.85, dark, false, 0.7);
    }

    // Quad heavy stern thrusters
    m.setTag("engine");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.88, 0.0, -2.65, 0.78, 0.56, 0.36, cyan, true, 1.0);
      m.addBox(s * 2.12, 0.02, -2.02, 0.72, 0.42, 0.32, cyan, true, 1.0);
    }

    return {
      id: "carrier",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.5,
      shieldRadius: 5.2,
      beamColor: "#66f7ff",
      beamCore: "#ffffff",
      signatureName: "蜂群戰機彈射出擊",
      signatureDesc: "雙前開機庫全開，彈射高速微型無人戰機中隊盤旋護航並自動集火敵機！",
      hardpoints: {
        lasers: [[-1.48, 0.56, 2.35], [1.48, 0.56, 2.35], [-2.45, 0.34, 0.15], [2.45, 0.34, 0.15]],
        missiles: [[-1.05, 0.02, 3.2], [1.05, 0.02, 3.2], [-2.15, -0.25, -0.1], [2.15, -0.25, -0.1]],
        engines: [
          { pos: [-0.88, 0, -2.85], size: 1.15, color: "#66f7ff" },
          { pos: [0.88, 0, -2.85], size: 1.15, color: "#66f7ff" },
          { pos: [-2.12, 0.02, -2.2], size: 0.88, color: "#66f7ff" },
          { pos: [2.12, 0.02, -2.2], size: 0.88, color: "#66f7ff" },
        ],
        retroNozzles: [[-1.45, 0, 3.0], [1.45, 0, 3.0]],
        flarePorts: [[-1.5, -0.35, -2.2], [1.5, -0.35, -2.2]],
      },
    };
  }

  // 07. 科學艦 SCIENCE SHIP — 稜面青／翠綠／洋紅發光晶體多面體核心＋3 枚環繞太陽能感測探針
  function buildStarshipScienceShip() {
    const m = builder();
    const steel = [104, 134, 176];
    const silver = [174, 200, 232];
    const cyan = [66, 246, 255];
    const emerald = [58, 238, 148];
    const magenta = [214, 74, 236];

    // Central geodesic crystal sphere core (slowly rotates independently!)
    m.setTag("crystal");
    m.addBlob(0, 0, 0, 1.52, 1.52, 1.52, steel, false, 8, 5);
    // Protruding crystalline facets in cyan, emerald green, and magenta-purple!
    const crystalDirs = [
      [0, 1, 0.45, emerald],
      [0.85, 0.6, 0.55, cyan],
      [-0.85, 0.6, 0.55, cyan],
      [0, 0.15, 1.05, cyan],
      [0.95, -0.15, 0.15, magenta],
      [-0.95, -0.15, 0.15, emerald],
      [0.65, -0.75, 0.45, magenta],
      [-0.65, -0.75, 0.45, emerald],
      [0, -1.0, 0.0, magenta],
      [0.7, 0.55, -0.75, emerald],
      [-0.7, 0.55, -0.75, magenta],
      [0, -0.25, -1.0, cyan],
    ];
    for (const [dx, dy, dz, col] of crystalDirs) {
      const l = Math.hypot(dx, dy, dz) || 1;
      const nx = dx / l, ny = dy / l, nz = dz / l;
      m.addSpike(nx * 1.15, ny * 1.15, nz * 1.15, nx * 2.15, ny * 2.15, nz * 2.15, 0.46, col, true);
    }

    // 3 Orbiting Solar-Panel Satellite Probes connected by thin glowing cyan tethers!
    m.setTag("probe");
    const probes = [
      [-3.15, -0.65, 0.45],
      [3.15, -0.35, -0.35],
      [-2.35, 1.55, -0.95],
    ];
    for (const [px, py, pz] of probes) {
      // Glowing tether struts from core to probe
      m.addSpike(px * 0.45, py * 0.45, pz * 0.45, px, py, pz, 0.055, cyan, true);
      // Probe central hub
      m.addBox(px, py, pz, 0.36, 0.36, 0.44, silver, false, 0.9);
      m.addBox(px, py, pz + 0.24, 0.22, 0.22, 0.14, emerald, true, 1.0);
      // Twin solar-panel wings on each satellite probe
      m.addBox(px, py + 0.62, pz, 0.16, 0.95, 0.42, steel, false, 1.0);
      m.addBox(px, py - 0.62, pz, 0.16, 0.95, 0.42, steel, false, 1.0);
      m.addBox(px, py + 0.62, pz, 0.20, 0.85, 0.12, cyan, true, 1.0);
      m.addBox(px, py - 0.62, pz, 0.20, 0.85, 0.12, cyan, true, 1.0);
    }

    m.setTag("engine");
    m.addBlob(0, 0, -1.75, 0.52, 0.52, 0.45, cyan, true, 6, 4);

    return {
      id: "science_ship",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.1,
      shieldRadius: 4.8,
      beamColor: "#42ffb8",
      beamCore: "#ff9ef6",
      signatureName: "量子晶格掃描共振",
      signatureDesc: "三枚感測探針高速軌道旋轉，發射三色量子共振光波並瞬間回復護盾！",
      hardpoints: {
        lasers: [[0, 0.15, 2.2], [-3.15, -0.65, 0.7], [3.15, -0.35, -0.1]],
        missiles: [[-1.1, 0.8, 1.2], [1.1, 0.8, 1.2], [-1.1, -0.8, 1.2], [1.1, -0.8, 1.2]],
        engines: [
          { pos: [0, 0, -2.05], size: 1.05, color: "#42ffb8" },
          { pos: [-3.15, -0.65, 0.15], size: 0.45, color: "#66f7ff" },
          { pos: [3.15, -0.35, -0.65], size: 0.45, color: "#d64aec" },
        ],
        retroNozzles: [[-1.0, 0, 1.8], [1.0, 0, 1.8]],
        flarePorts: [[-1.2, -0.6, -1.4], [1.2, -0.6, -1.4]],
      },
    };
  }

  // 08. 微型戰機 TINY FIGHTER — 緊湊十字翼攔截機＋雙翼尖光束砲＋高聳垂直尾翼＋青光駕駛艙＆雙側核心
  function buildStarshipTinyFighter() {
    const m = builder();
    const hull = [198, 222, 246];
    const steel = [98, 134, 180];
    const dark = [42, 56, 86];
    const cyan = [64, 248, 255];

    m.setTag("body");
    // Pointed needle interceptor fuselage
    m.addBox(0, 0.0, 1.35, 0.92, 0.54, 2.45, hull, false, 0.16);
    m.addBox(0, 0.0, -0.65, 1.05, 0.62, 1.95, steel, false, 0.88);
    // Iconic bright electric-cyan teardrop canopy dome
    m.addBox(0, 0.42, 0.42, 0.62, 0.34, 1.25, cyan, true, 0.58);
    // Twin side glowing cyan reactor intake pods flanking cockpit!
    for (const s of [-1, 1]) {
      m.addBox(s * 0.84, 0.02, -0.15, 0.48, 0.52, 1.75, hull, false, 0.85);
      m.addBox(s * 0.84, 0.05, 0.78, 0.36, 0.36, 0.24, cyan, true, 0.95);
    }

    // Iconic tall central vertical dorsal tail fin
    m.setTag("fin");
    m.addBox(0, 1.15, -1.05, 0.16, 1.65, 1.35, hull, false, 0.48);
    m.addBox(0, 1.35, -0.95, 0.20, 0.75, 0.45, steel, false, 0.6);

    // Straight horizontal main cross-wings
    m.setTag("wing");
    m.addWing(0.95, 0.0, 0.25, 3.05, 0.0, 0.05, -0.95, -0.78, 0.18, hull, true);
    m.addWing(1.05, 0.06, 0.05, 2.75, 0.04, -0.05, -0.68, -0.62, 0.12, steel, true);

    // Wingtip twin laser cannon / thruster pods
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 3.12, 0.0, -0.15, 0.38, 0.38, 1.45, hull, false, 0.88);
      m.addBox(s * 3.12, 0.0, 1.05, 0.18, 0.18, 1.35, dark, false, 0.55);
      m.addBox(s * 3.12, 0.0, 1.74, 0.14, 0.14, 0.16, cyan, true, 1.0);
    }

    // Ventral micro-missile rails
    m.setTag("bay");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.45, -0.22, -0.1, 0.28, 0.18, 0.85, dark, false, 0.8);
    }

    // Triple rear cyan engines
    m.setTag("engine");
    m.addBox(0, 0.0, -1.72, 0.68, 0.44, 0.3, cyan, true, 1.0);
    for (const s of [-1, 1]) {
      m.addBox(s * 0.84, 0.02, -1.12, 0.36, 0.32, 0.26, cyan, true, 1.0);
    }

    return {
      id: "tiny_fighter",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 3.4,
      shieldRadius: 4.0,
      beamColor: "#44f8ff",
      beamCore: "#ffffff",
      signatureName: "超機動殘影連斬",
      signatureDesc: "翼尖雙砲超頻連射並拉出高速電漿殘影，瞬間爆發最高纏鬥機動！",
      hardpoints: {
        lasers: [[-3.12, 0, 1.85], [3.12, 0, 1.85], [0, -0.1, 2.6]],
        missiles: [[-1.45, -0.3, 0.35], [1.45, -0.3, 0.35]],
        engines: [
          { pos: [0, 0, -1.88], size: 0.95, color: "#44f8ff" },
          { pos: [-0.84, 0.02, -1.28], size: 0.62, color: "#44f8ff" },
          { pos: [0.84, 0.02, -1.28], size: 0.62, color: "#44f8ff" },
        ],
        retroNozzles: [[-0.84, 0.05, 0.92], [0.84, 0.05, 0.92]],
        flarePorts: [[-0.75, -0.25, -1.5], [0.75, -0.25, -1.5]],
      },
    };
  }

  // 09. 隱形艦 STEALTH VESSEL — 暗影黑曜石幽影斗篷匿蹤艦＋冰青紫雙瞳感測器＋鋸齒暗翼
  function buildStarshipStealthVessel() {
    const m = builder();
    const obs = [28, 32, 46];
    const charcoal = [48, 54, 78];
    const rim = [98, 112, 148];
    const indigo = [72, 74, 126];
    const eyeCyan = [96, 236, 255];
    const eyeViolet = [184, 114, 255];

    m.setTag("body");
    // Menacing faceted hooded stealth cowl & central obsidian dagger body
    m.addBox(0, 0.15, 0.85, 1.35, 0.86, 3.0, obs, false, 0.25);
    m.addBox(0, 0.58, 0.25, 1.12, 0.62, 1.95, charcoal, false, 0.35);
    // Pointed stealth crest ridge (rim-lit for crisp dark readability!)
    m.addSpike(0, 0.82, -0.4, 0, 1.25, 1.35, 0.34, rim, false);
    m.addBox(0, 0.0, -1.15, 1.55, 0.72, 2.2, obs, false, 0.82);

    // Eerie glowing twin ice-cyan & violet stealth sensor eyes under hood!
    for (const s of [-1, 1]) {
      m.addBox(s * 0.28, 0.34, 1.98, 0.24, 0.12, 0.18, eyeCyan, true, 0.8);
      m.addBox(s * 0.42, 0.34, 1.92, 0.12, 0.10, 0.16, eyeViolet, true, 0.8);
    }

    // Sweeping draped phantom cloak stealth wings (flutter/ripple on cloak & overdrive!)
    m.setTag("cloak");
    m.addWing(0.58, 0.25, 0.85, 3.65, -0.25, -1.15, -1.45, -2.55, 0.14, obs, true);
    m.addWing(0.65, 0.34, 0.65, 3.45, -0.18, -1.05, -0.85, -1.75, 0.10, rim, true);
    // Secondary jagged lower shadow wing folds (double-sided cloak membranes!)
    m.addMembraneTri([0.65, 0.18, 0.2], [3.65, -0.25, -1.15], [1.95, -0.78, -2.45], charcoal, true);
    m.addMembraneTri([0.65, -0.1, -0.85], [1.95, -0.78, -2.45], [0.55, -0.45, -2.15], indigo, true);
    // Razor stealth wingtips
    for (const s of [-1, 1]) {
      m.addSpike(s * 2.55, -0.15, -1.15, s * 4.15, -0.35, -1.65, 0.18, rim, false);
      m.addSpike(s * 1.45, -0.38, -1.55, s * 2.15, -0.92, -2.75, 0.16, rim, false);
    }

    // Hidden internal plasma emitters
    m.setTag("gun");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.25, -0.12, 0.55, 0.22, 0.16, 0.95, indigo, false, 0.6);
    }

    // Shadow torpedo bay
    m.setTag("bay");
    m.addBox(0, -0.38, 0.45, 0.68, 0.22, 1.05, charcoal, false, 0.8);

    // Silent violet-cyan vector engines
    m.setTag("engine");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.52, -0.02, -2.28, 0.44, 0.28, 0.28, eyeViolet, true, 1.0);
    }

    return {
      id: "stealth_vessel",
      verts: m.verts,
      vTags: m.vTags,
      faces: m.faces,
      radius: 4.1,
      shieldRadius: 4.6,
      beamColor: "#b872ff",
      beamCore: "#8cf8ff",
      signatureName: "幽影相位分身奇襲",
      signatureDesc: "披風進入全息匿蹤相位，拉出雙重幽影分身並發射穿甲紫青暗影電漿！",
      hardpoints: {
        lasers: [[-1.25, -0.12, 1.1], [1.25, -0.12, 1.1], [0, 0.12, 2.55]],
        missiles: [[-0.25, -0.46, 1.0], [0.25, -0.46, 1.0]],
        engines: [
          { pos: [-0.52, -0.02, -2.46], size: 0.85, color: "#b872ff" },
          { pos: [0.52, -0.02, -2.46], size: 0.85, color: "#b872ff" },
        ],
        retroNozzles: [[-0.8, 0, 1.8], [0.8, 0, 1.8]],
        flarePorts: [[-0.95, -0.25, -1.9], [0.95, -0.25, -1.9]],
      },
    };
  }

  // Geodesic 3D Energy Shield Dome (reusable wireframe/faceted dome for Shield Overcharge!)
  function buildShieldDome() {
    const m = builder();
    m.addBlob(0, 0, 0, 1.0, 1.0, 1.0, [86, 242, 255], true, 10, 6);
    return { verts: m.verts, faces: m.faces, radius: 1.0 };
  }

  // Target Drone 3D Model (for 3D Action Showcase firing & homing missile target!)
  function buildTargetDrone() {
    const m = builder();
    const dark = [58, 42, 68];
    const red = [235, 64, 92];
    const core = [255, 224, 92];
    m.addBlob(0, 0, 0, 1.3, 1.3, 1.3, dark, false, 6, 4);
    m.addBox(0, 0, 0, 3.2, 0.38, 0.38, red, false, 1.0);
    m.addBox(0, 0, 0, 0.38, 3.2, 0.38, red, false, 1.0);
    m.addBox(0, 0, 0, 0.38, 0.38, 3.2, red, false, 1.0);
    m.addBlob(0, 0, 0, 0.65, 0.65, 0.65, core, true, 5, 3);
    return { verts: m.verts, faces: m.faces, radius: 2.0 };
  }

  const STARSHIP_MODELS = {
    capital_ship: buildStarshipCapitalShip(),
    battleship: buildStarshipBattleship(),
    cruiser: buildStarshipCruiser(),
    destroyer: buildStarshipDestroyer(),
    frigate: buildStarshipFrigate(),
    carrier: buildStarshipCarrier(),
    science_ship: buildStarshipScienceShip(),
    tiny_fighter: buildStarshipTinyFighter(),
    stealth_vessel: buildStarshipStealthVessel(),
  };

  function getStarship(id) {
    return STARSHIP_MODELS[id] || STARSHIP_MODELS.tiny_fighter;
  }

  // Future Asset Registry hook: allows binding custom uploaded Starship / Bug PNG sprites later!
  window.AssetRegistry = {
    sprites: {},
    registerSprite(key, img) {
      this.sprites[key] = img;
    },
    getSprite(key) {
      return this.sprites[key] || null;
    },
  };

  return {
    playerShip: buildPlayerShip(),
    friendlyFighter: buildFriendlyFighter(),
    friendlyCruiser: buildFriendlyCruiser(),
    enemyFighter: buildEnemyFighter(),
    enemyCorvette: buildEnemyCorvette(),
    enemyDestroyer: buildEnemyDestroyer(),
    bossFlagship: buildBossFlagship(),
    bugDrone: buildBugDrone(),
    bugMantis: buildBugMantis(),
    bugHiveCruiser: buildBugHiveCruiser(),
    bugOverlordBoss: buildBugOverlordBoss(),
    starships: STARSHIP_MODELS,
    getStarship,
    shieldDome: buildShieldDome(),
    targetDrone: buildTargetDrone(),
  };
})();
