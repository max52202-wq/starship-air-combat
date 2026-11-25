// ============================================================================
// turret_models.js — 10 Distinct Ground Anti-Aircraft (AA) Turret 3D Models
// Works in both Browser (window.TurretModels) and Node.js (module.exports)
// Coordinate system: +Y up (sky), +Z forward (barrel aim at 0° pitch), +X right
// Vertex part tags control real-time 3D articulated animations:
//   "base"   : anchored concrete/steel ground foundation (stationary)
//   "yaw"    : rotating turret ring / housing (rotates around Y axis)
//   "pitch"  : elevating gun cradle / launcher (rotates around local X axis)
//   "barrel" : primary weapon barrel (elevates + recoils along local -Z)
//   "barrelL": left alternating barrel (alternating recoil / spin)
//   "barrelR": right alternating barrel (alternating recoil / spin)
//   "spinL"  : left rotary barrel cluster (spins around barrel Z axis)
//   "spinR"  : right rotary barrel cluster (spins around barrel Z axis)
//   "radar"  : top rotating radar dish / crystal prism (continuous Y spin)
//   "petal"  : unfolding citadel armor petals / vents (expands on fire/charge)
//   "core"   : glowing energy core / plasma orb (pulses & brightens on charge)
// ============================================================================

(function (root) {
  function builder() {
    const verts = [];
    const vTags = [];
    const faces = [];
    let curTag = "base";

    function setTag(tag) {
      curTag = tag || "base";
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

    function addBox(cx, cy, cz, sx, sy, sz, color, emissive = false, taperTop = 1.0, taperFront = 1.0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const b0 = addV(cx - hx, cy - hy, cz - hz);
      const b1 = addV(cx + hx, cy - hy, cz - hz);
      const b2 = addV(cx + hx * taperTop, cy + hy, cz - hz * taperTop);
      const b3 = addV(cx - hx * taperTop, cy + hy, cz - hz * taperTop);

      const f0 = addV(cx - hx * taperFront, cy - hy * taperFront, cz + hz);
      const f1 = addV(cx + hx * taperFront, cy - hy * taperFront, cz + hz);
      const f2 = addV(cx + hx * taperTop * taperFront, cy + hy * taperFront, cz + hz * taperTop);
      const f3 = addV(cx - hx * taperTop * taperFront, cy + hy * taperFront, cz + hz * taperTop);

      addQuad(b3, b2, f2, f3, color, emissive); // top
      addQuad(b0, f0, f1, b1, color, emissive); // bottom
      addQuad(b1, f1, f2, b2, color, emissive); // right
      addQuad(b0, b3, f3, f0, color, emissive); // left
      addQuad(f0, f3, f2, f1, color, emissive); // front
      addQuad(b0, b1, b2, b3, color, emissive); // back
    }

    // Vertical cylinder / frustum along Y axis
    function addCylY(cx, y0, y1, r0, r1, segs, color, emissive = false) {
      const bot = [], top = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2 + Math.PI / segs;
        const ca = Math.cos(a), sa = Math.sin(a);
        bot.push(addV(cx + ca * r0, y0, sa * r0));
        top.push(addV(cx + ca * r1, y1, sa * r1));
      }
      const cBot = addV(cx, y0, 0);
      const cTop = addV(cx, y1, 0);
      for (let s = 0; s < segs; s++) {
        const n = (s + 1) % segs;
        addQuad(bot[s], bot[n], top[n], top[s], color, emissive);
        addTri(cTop, top[s], top[n], color, emissive);
        addTri(cBot, bot[n], bot[s], color, emissive);
      }
    }

    // Offset vertical cylinder around (cx, cz)
    function addCylYAt(cx, cz, y0, y1, r0, r1, segs, color, emissive = false) {
      const bot = [], top = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2 + Math.PI / segs;
        const ca = Math.cos(a), sa = Math.sin(a);
        bot.push(addV(cx + ca * r0, y0, cz + sa * r0));
        top.push(addV(cx + ca * r1, y1, cz + sa * r1));
      }
      const cBot = addV(cx, y0, cz);
      const cTop = addV(cx, y1, cz);
      for (let s = 0; s < segs; s++) {
        const n = (s + 1) % segs;
        addQuad(bot[s], bot[n], top[n], top[s], color, emissive);
        addTri(cTop, top[s], top[n], color, emissive);
        addTri(cBot, bot[n], bot[s], color, emissive);
      }
    }

    // Horizontal cylinder / barrel along +Z axis
    function addCylZ(cx, cy, z0, z1, r0, r1, segs, color, emissive = false) {
      const back = [], front = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        back.push(addV(cx + ca * r0, cy + sa * r0, z0));
        front.push(addV(cx + ca * r1, cy + sa * r1, z1));
      }
      const cBack = addV(cx, cy, z0);
      const cFront = addV(cx, cy, z1);
      for (let s = 0; s < segs; s++) {
        const n = (s + 1) % segs;
        addQuad(back[s], front[s], front[n], back[n], color, emissive);
        addTri(cFront, front[n], front[s], color, emissive);
        addTri(cBack, back[s], back[n], color, emissive);
      }
    }

    // Octahedron / Faceted Sphere / Crystal
    function addBlob(cx, cy, cz, rx, ry, rz, color, emissive = false, lonSegs = 6, latSegs = 4) {
      const topIdx = addV(cx, cy + ry, cz);
      const botIdx = addV(cx, cy - ry, cz);
      const rings = [];
      for (let lat = 1; lat < latSegs; lat++) {
        const theta = (lat / latSegs) * Math.PI;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        const ring = [];
        for (let lon = 0; lon < lonSegs; lon++) {
          const phi = (lon / lonSegs) * Math.PI * 2;
          ring.push(addV(cx + Math.cos(phi) * sinT * rx, cy + cosT * ry, cz + Math.sin(phi) * sinT * rz));
        }
        rings.push(ring);
      }
      const r0 = rings[0];
      for (let lon = 0; lon < lonSegs; lon++) {
        const n = (lon + 1) % lonSegs;
        addTri(topIdx, r0[n], r0[lon], color, emissive);
      }
      for (let r = 0; r < rings.length - 1; r++) {
        const a = rings[r], b = rings[r + 1];
        for (let lon = 0; lon < lonSegs; lon++) {
          const n = (lon + 1) % lonSegs;
          addQuad(a[lon], a[n], b[n], b[lon], color, emissive);
        }
      }
      const rL = rings[rings.length - 1];
      for (let lon = 0; lon < lonSegs; lon++) {
        const n = (lon + 1) % lonSegs;
        addTri(botIdx, rL[lon], rL[n], color, emissive);
      }
    }

    // Angled strut / leg from (x0,y0,z0) to (x1,y1,z1)
    function addStrut(x0, y0, z0, x1, y1, z1, r0, r1, color, emissive = false) {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      const l = Math.hypot(dx, dy, dz) || 1;
      const fx = dx / l, fy = dy / l, fz = dz / l;
      let ux = 0, uy = 1, uz = 0;
      if (Math.abs(fy) > 0.9) { ux = 1; uy = 0; uz = 0; }
      // right = cross(up, fwd)
      let rx = uy * fz - uz * fy;
      let ry = uz * fx - ux * fz;
      let rz = ux * fy - uy * fx;
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      // true up = cross(fwd, right)
      const tx = fy * rz - fz * ry;
      const ty = fz * rx - fx * rz;
      const tz = fx * ry - fy * rx;

      const ring0 = [], ring1 = [];
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + Math.PI * 0.25;
        const ca = Math.cos(a), sa = Math.sin(a);
        ring0.push(addV(x0 + (rx * ca + tx * sa) * r0, y0 + (ry * ca + ty * sa) * r0, z0 + (rz * ca + tz * sa) * r0));
        ring1.push(addV(x1 + (rx * ca + tx * sa) * r1, y1 + (ry * ca + ty * sa) * r1, z1 + (rz * ca + tz * sa) * r1));
      }
      for (let s = 0; s < 4; s++) {
        const n = (s + 1) % 4;
        addQuad(ring0[s], ring1[s], ring1[n], ring0[n], color, emissive);
      }
      addQuad(ring0[0], ring0[3], ring0[2], ring0[1], color, emissive);
      addQuad(ring1[0], ring1[1], ring1[2], ring1[3], color, emissive);
    }

    // Shared heavy ground foundation helper with 4 corner stabilizers
    function addGroundFoundation(mainCol, trimCol, hazardCol, radius = 2.6, height = 1.05) {
      setTag("base");
      addCylY(0, 0.0, 0.28, radius * 1.08, radius * 1.02, 8, trimCol);
      addCylY(0, 0.28, height, radius * 0.96, radius * 0.80, 8, mainCol);
      // 4 armored outrigger legs anchored to ground
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + Math.PI / 4;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        addStrut(ca * radius * 0.70, height * 0.85, sa * radius * 0.70, ca * radius * 1.25, 0.14, sa * radius * 1.25, 0.42, 0.34, trimCol);
        addBox(ca * radius * 1.24, 0.14, sa * radius * 1.24, 0.75, 0.28, 0.75, mainCol);
        if (hazardCol) {
          addBox(ca * radius * 1.12, 0.30, sa * radius * 1.12, 0.38, 0.10, 0.38, hazardCol, true);
        }
      }
      // Turret bearing ring
      addCylY(0, height, height + 0.24, radius * 0.68, radius * 0.68, 8, trimCol);
    }

    return { verts, vTags, faces, setTag, addV, addTri, addQuad, addBox, addCylY, addCylYAt, addCylZ, addBlob, addStrut, addGroundFoundation };
  }

  // --------------------------------------------------------------------------
  // 01. VULCAN GATLING AA — 火神六管防空機砲塔
  // --------------------------------------------------------------------------
  function buildVulcanGatling() {
    const m = builder();
    const olive = [88, 108, 72];
    const oliveDark = [54, 68, 46];
    const steel = [110, 122, 134];
    const gunmetal = [62, 70, 80];
    const hazard = [245, 184, 48];
    const brass = [212, 168, 68];
    const visor = [96, 245, 210];

    m.addGroundFoundation(olive, oliveDark, hazard, 2.55, 1.0);

    // Rotating armored turret body
    m.setTag("yaw");
    m.addBox(0, 1.85, -0.15, 2.55, 1.35, 2.5, olive, false, 0.88, 0.92);
    // Armored gunner dome & visor slit on front
    m.addBox(0, 2.68, -0.1, 1.45, 0.52, 1.55, oliveDark, false, 0.78);
    m.addBox(0, 2.10, 1.05, 1.18, 0.34, 0.28, visor, true);
    // Rear twin rotary ammo drums
    for (const s of [-1, 1]) {
      m.addCylYAt(s * 0.78, -1.45, 1.35, 2.45, 0.56, 0.56, 8, brass);
      m.addBox(s * 1.35, 1.85, -0.1, 0.45, 0.95, 1.3, oliveDark);
    }

    // Small spinning rangefinder on roof
    m.setTag("radar");
    m.addCylY(0, 2.94, 3.35, 0.16, 0.14, 6, steel);
    m.addBox(0, 3.42, 0.0, 1.1, 0.28, 0.28, hazard);
    m.addBox(0, 3.42, 0.16, 0.42, 0.16, 0.12, visor, true);

    // Elevating gun mounts
    m.setTag("pitch");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.65, 2.15, 0.45, 0.65, 0.78, 1.55, gunmetal);
      m.addBox(s * 1.65, 2.58, 0.3, 0.48, 0.14, 0.9, hazard, true);
    }

    // Twin 6-barrel rotary gatling clusters
    for (const side of [-1, 1]) {
      m.setTag(side < 0 ? "spinL" : "spinR");
      const cx = side * 1.65, cy = 2.15;
      // Central axle & clamp rings
      m.addCylZ(cx, cy, 1.0, 4.15, 0.16, 0.14, 6, steel);
      m.addCylZ(cx, cy, 2.1, 2.32, 0.36, 0.36, 6, brass);
      m.addCylZ(cx, cy, 3.5, 3.74, 0.36, 0.36, 6, hazard);
      for (let b = 0; b < 6; b++) {
        const a = (b / 6) * Math.PI * 2;
        m.addCylZ(cx + Math.cos(a) * 0.22, cy + Math.sin(a) * 0.22, 1.15, 4.35, 0.075, 0.068, 5, gunmetal);
      }
    }

    return {
      id: "vulcan_gatling",
      no: "01",
      name: "火神六管機砲塔",
      en: "VULCAN GATLING AA",
      role: "高速彈幕・近程防空攔截",
      desc: "雙側搭載六管高速旋轉火神機砲與自動彈鼓，能瞬間織出密不透風的曳光防空火網，專門絞殺成群低空飛螳。",
      weaponStyle: "gatling",
      fireColor: "#ffd447",
      coreColor: "#ff922b",
      accentHex: "#f5b830",
      pivotY: 2.15,
      pivotZ: 0.2,
      muzzles: [[-1.65, 2.15, 4.45], [1.65, 2.15, 4.45]],
      stats: { dmg: 76, rof: 98, rng: 68, arm: 82 },
      cockpit: {
        theme: "olive_bunker",
        frameCol: "#34422c",
        frameHi: "#5c704c",
        trimCol: "#f5b830",
        hudCol: "#68ffbe",
        glassTint: "rgba(32, 68, 52, 0.18)",
        reticle: "gatling",
        controlType: "dual_grips",
        barrelStyle: "gatling",
        label: "M61-X 火神雙聯防空座艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.5,
    };
  }

  // --------------------------------------------------------------------------
  // 02. TWIN FLAK CANNON — 雙聯重型高射砲塔
  // --------------------------------------------------------------------------
  function buildTwinFlak() {
    const m = builder();
    const armor = [132, 144, 158];
    const armorDark = [74, 84, 98];
    const iron = [54, 60, 70];
    const brass = [224, 180, 76];
    const glow = [255, 134, 52];

    m.addGroundFoundation(armor, armorDark, null, 2.75, 1.15);

    // Sloped fortress turret turret house
    m.setTag("yaw");
    m.addBox(0, 1.95, -0.25, 3.0, 1.45, 3.1, armor, false, 0.78, 0.90);
    m.addBox(0, 2.82, -0.55, 1.75, 0.56, 1.65, armorDark, false, 0.72);
    // Side stowage boxes & armor plates
    for (const s of [-1, 1]) {
      m.addBox(s * 1.52, 1.85, -0.45, 0.36, 0.78, 1.9, armorDark);
      m.addBox(s * 1.56, 1.95, 0.45, 0.18, 0.25, 0.5, brass);
    }
    // Armored slit window
    m.addBox(0, 2.78, 0.26, 0.95, 0.24, 0.18, [120, 232, 255], true);

    // Commander cupola optical sight
    m.setTag("radar");
    m.addCylYAt(0.45, -0.65, 3.1, 3.55, 0.38, 0.32, 6, iron);
    m.addBox(0.45, 3.45, -0.35, 0.35, 0.18, 0.24, glow, true);

    // Gun mantlet cradle
    m.setTag("pitch");
    m.addBox(0, 2.2, 1.05, 1.95, 0.92, 0.85, armorDark, false, 0.9);
    // Hydraulic recoil recuperators under barrels
    for (const s of [-1, 1]) {
      m.addCylZ(s * 0.55, 1.92, 0.9, 2.55, 0.18, 0.16, 6, brass);
    }

    // Twin heavy 120mm alternating flak barrels with slotted muzzle brakes
    for (const side of [-1, 1]) {
      m.setTag(side < 0 ? "barrelL" : "barrelR");
      const bx = side * 0.55, by = 2.34;
      m.addCylZ(bx, by, 0.9, 2.6, 0.27, 0.23, 8, iron);
      m.addCylZ(bx, by, 2.6, 4.65, 0.21, 0.17, 8, armor);
      // Heavy slotted muzzle brake
      m.addBox(bx, by, 4.78, 0.46, 0.42, 0.62, iron);
      m.addBox(bx, by, 4.78, 0.50, 0.14, 0.30, glow, true);
    }

    return {
      id: "twin_flak",
      no: "02",
      name: "雙聯高射防空砲塔",
      en: "TWIN FLAK 120MM",
      role: "空爆榴彈・中程區域壓制",
      desc: "經典重裝雙聯 120mm 高射砲，交替後座射擊發射近炸空爆彈，炸開大範圍金色破片雲摧毀中空蟲群編隊。",
      weaponStyle: "flak",
      fireColor: "#ffaa33",
      coreColor: "#ff5c26",
      accentHex: "#e0b44c",
      pivotY: 2.25,
      pivotZ: 0.9,
      muzzles: [[-0.55, 2.34, 5.15], [0.55, 2.34, 5.15]],
      stats: { dmg: 88, rof: 74, rng: 84, arm: 94 },
      cockpit: {
        theme: "iron_flak",
        frameCol: "#3a424d",
        frameHi: "#6d7b8c",
        trimCol: "#e0b44c",
        hudCol: "#ffd866",
        glassTint: "rgba(65, 52, 24, 0.16)",
        reticle: "flak",
        controlType: "wheel_levers",
        barrelStyle: "twin_heavy",
        label: "MK-IV 雙聯高射砲裝甲座艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 5.0,
    };
  }

  // --------------------------------------------------------------------------
  // 03. AEGIS SAM BATTERY — 神盾防空飛彈塔
  // --------------------------------------------------------------------------
  function buildSamMissile() {
    const m = builder();
    const navy = [62, 96, 138];
    const navyDark = [34, 54, 84];
    const sand = [184, 174, 148];
    const red = [235, 64, 72];
    const white = [230, 240, 250];
    const cyan = [88, 242, 255];

    m.addGroundFoundation(navy, navyDark, cyan, 2.65, 1.05);

    // Central armored command pedestal
    m.setTag("yaw");
    m.addBox(0, 1.92, -0.05, 1.95, 1.48, 2.3, sand, false, 0.88);
    m.addBox(0, 2.15, 1.12, 1.15, 0.42, 0.16, cyan, true); // Gunner visor
    // Blast deflector plate at back
    m.addBox(0, 1.65, -1.35, 2.4, 0.9, 0.25, navyDark);

    // Rotating top phased-array radar bar
    m.setTag("radar");
    m.addCylY(0, 2.66, 3.18, 0.22, 0.18, 6, navyDark);
    m.addBox(0, 3.45, 0.0, 2.35, 0.62, 0.34, navy);
    m.addBox(0, 3.45, 0.19, 2.05, 0.38, 0.08, cyan, true);

    // Twin 4-cell missile launch pods (8 warheads visible!)
    m.setTag("pitch");
    for (const s of [-1, 1]) {
      const px = s * 1.72;
      m.addBox(px, 2.25, 0.15, 1.25, 1.25, 2.55, navy, false, 0.96);
      m.addBox(px, 2.25, 0.15, 1.32, 0.18, 2.2, navyDark);
      // 4 missile nose cones poking out front
      for (const ox of [-0.28, 0.28]) {
        for (const oy of [-0.28, 0.28]) {
          m.addCylZ(px + ox, 2.25 + oy, 1.32, 1.62, 0.17, 0.15, 6, white);
          m.addCylZ(px + ox, 2.25 + oy, 1.62, 1.92, 0.15, 0.02, 6, red, true);
        }
      }
    }

    // Recoiling launch blast vents
    m.setTag("barrel");
    for (const s of [-1, 1]) {
      m.addBox(s * 1.72, 2.25, -1.18, 1.0, 1.0, 0.22, [255, 140, 50], true);
    }

    return {
      id: "sam_missile",
      no: "03",
      name: "神盾防空飛彈塔",
      en: "AEGIS SAM BATTERY",
      role: "八連發追蹤・超視距攔截",
      desc: "雙聯四艙共八枚主動雷達追蹤防空飛彈，配裝頂部旋轉相控陣雷達，可同時多目標鎖定並齊射曲線導引飛彈！",
      weaponStyle: "missile",
      fireColor: "#ff6b6b",
      coreColor: "#58f2ff",
      accentHex: "#58f2ff",
      pivotY: 2.25,
      pivotZ: 0.1,
      muzzles: [[-1.72, 2.5, 2.05], [1.72, 2.5, 2.05], [-1.72, 2.0, 2.05], [1.72, 2.0, 2.05]],
      stats: { dmg: 92, rof: 66, rng: 96, arm: 80 },
      cockpit: {
        theme: "aegis_navy",
        frameCol: "#1e304a",
        frameHi: "#486e9e",
        trimCol: "#58f2ff",
        hudCol: "#58f2ff",
        glassTint: "rgba(18, 52, 88, 0.18)",
        reticle: "missile",
        controlType: "flight_stick",
        barrelStyle: "missile_pods",
        label: "AEGIS-8 防空飛彈火控座艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.2,
    };
  }

  // --------------------------------------------------------------------------
  // 04. PRISM LASER TURRET — 稜鏡高能雷射塔
  // --------------------------------------------------------------------------
  function buildPrismLaser() {
    const m = builder();
    const ceramic = [224, 236, 248];
    const silver = [148, 168, 192];
    const cobalt = [44, 78, 138];
    const cyan = [76, 248, 255];
    const crystal = [160, 255, 255];

    m.addGroundFoundation(ceramic, cobalt, cyan, 2.5, 1.0);

    // Sleek futuristic turret housing
    m.setTag("yaw");
    m.addCylY(0, 1.24, 2.15, 1.55, 1.22, 8, ceramic);
    m.addBox(0, 1.85, -0.85, 1.75, 0.95, 1.65, cobalt, false, 0.85);
    // Glowing cyan cooling fins
    for (const s of [-1, 1]) {
      m.addBox(s * 1.15, 1.85, -0.85, 0.26, 0.72, 1.35, cyan, true);
    }
    m.addBox(0, 2.05, 1.08, 1.05, 0.36, 0.3, cyan, true);

    // Elevating twin focusing emitter prongs
    m.setTag("pitch");
    for (const s of [-1, 1]) {
      m.addBox(s * 0.72, 2.45, 1.45, 0.34, 0.42, 3.15, ceramic, false, 0.9, 0.65);
      m.addBox(s * 0.56, 2.45, 1.65, 0.12, 0.18, 2.55, cyan, true);
    }
    m.addBox(0, 2.02, 1.15, 1.25, 0.3, 2.2, silver, false, 0.85, 0.75);

    // Floating rotating focusing crystal prism inside prongs!
    m.setTag("core");
    m.addBlob(0, 2.45, 2.25, 0.46, 0.46, 0.92, crystal, true, 6, 4);
    m.setTag("barrel");
    m.addCylZ(0, 2.45, 2.85, 3.55, 0.32, 0.14, 6, cyan, true);

    // Top optical mirror dome
    m.setTag("radar");
    m.addBlob(0, 2.85, -0.45, 0.52, 0.58, 0.52, cyan, true, 6, 4);

    return {
      id: "prism_laser",
      no: "04",
      name: "稜鏡高能雷射塔",
      en: "PRISM LASER TURRET",
      role: "光速聚焦・零彈道延遲",
      desc: "以高純度光子稜鏡聚焦連續電漿雷射，光束瞬發直貫雲霄，無視敵機閃避機動並持續熔穿蟲族甲殼。",
      weaponStyle: "laser",
      fireColor: "#5ef8ff",
      coreColor: "#ffffff",
      accentHex: "#4cf8ff",
      pivotY: 2.45,
      pivotZ: 0.4,
      muzzles: [[0, 2.45, 3.65]],
      stats: { dmg: 85, rof: 92, rng: 88, arm: 72 },
      cockpit: {
        theme: "prism_white",
        frameCol: "#cddae8",
        frameHi: "#ffffff",
        trimCol: "#36e4ff",
        hudCol: "#5ef8ff",
        glassTint: "rgba(40, 220, 255, 0.13)",
        reticle: "prism",
        controlType: "holo_sticks",
        barrelStyle: "prism_prongs",
        label: "PRISM-IX 光子稜鏡操控艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.2,
    };
  }

  // --------------------------------------------------------------------------
  // 05. HYPERION RAILGUN — 電磁軌道狙擊砲塔
  // --------------------------------------------------------------------------
  function buildRailgunAA() {
    const m = builder();
    const slate = [64, 74, 92];
    const dark = [36, 42, 54];
    const steel = [142, 158, 178];
    const electric = [72, 168, 255];
    const core = [150, 232, 255];

    m.addGroundFoundation(slate, dark, electric, 2.85, 1.05);

    // Sleek angular sniper turret breech
    m.setTag("yaw");
    m.addBox(0, 1.95, -0.55, 2.25, 1.32, 3.45, slate, false, 0.80, 0.88);
    // Heavy rear capacitor counterweight
    m.addBox(0, 2.05, -2.35, 1.85, 1.15, 1.15, dark);
    for (const s of [-1, 1]) {
      m.addBox(s * 0.98, 2.05, -2.25, 0.22, 0.72, 0.85, electric, true);
    }
    // Sniper visor
    m.addBox(0, 2.48, 0.75, 0.88, 0.34, 0.55, core, true);

    // Elevating breech & optics
    m.setTag("pitch");
    m.addBox(0, 2.38, 0.65, 1.55, 0.85, 1.65, dark);
    // Long optical railgun sniper scope on side
    m.addCylZ(0.96, 2.75, -0.25, 1.85, 0.22, 0.18, 6, steel);
    m.addCylZ(0.96, 2.75, 1.85, 1.98, 0.16, 0.16, 6, core, true);

    // Ultra-long split twin parallel magnetic rail barrels with glowing coils
    m.setTag("barrel");
    for (const sy of [-0.34, 0.34]) {
      m.addBox(0, 2.38 + sy, 3.25, 0.54, 0.26, 4.75, steel, false, 0.95, 0.88);
      m.addBox(0, 2.38 + sy, 3.25, 0.24, 0.12, 4.55, electric, true);
    }
    // 4 electromagnetic induction ring collars along barrel
    for (const rz of [1.9, 2.9, 3.9, 4.9]) {
      m.addBox(0, 2.38, rz, 0.88, 0.96, 0.22, dark);
      m.addBox(0, 2.38, rz, 0.94, 0.24, 0.14, core, true);
    }
    // Plasma accelerator gap core
    m.setTag("core");
    m.addBox(0, 2.38, 3.35, 0.18, 0.22, 4.4, core, true);

    return {
      id: "railgun_aa",
      no: "05",
      name: "電磁軌道狙擊砲塔",
      en: "HYPERION RAILGUN",
      role: "超音速貫穿・重甲巨獸剋星",
      desc: "雙軌並列電磁線圈將穿甲彈加速至 12 馬赫，一擊貫穿大型王蟲與巢母厚重甲殼，並拉出高能藍白音爆激波環。",
      weaponStyle: "railgun",
      fireColor: "#78c8ff",
      coreColor: "#ffffff",
      accentHex: "#48a8ff",
      pivotY: 2.38,
      pivotZ: 0.4,
      muzzles: [[0, 2.38, 5.7]],
      stats: { dmg: 100, rof: 48, rng: 100, arm: 86 },
      cockpit: {
        theme: "rail_sniper",
        frameCol: "#222936",
        frameHi: "#4c5b75",
        trimCol: "#48a8ff",
        hudCol: "#82d4ff",
        glassTint: "rgba(24, 64, 128, 0.18)",
        reticle: "railgun",
        controlType: "sniper_yoke",
        barrelStyle: "railgun",
        label: "HYPERION-12M 軌道狙擊艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 5.7,
    };
  }

  // --------------------------------------------------------------------------
  // 06. TESLA ARC TOWER — 特斯拉電弧防空塔
  // --------------------------------------------------------------------------
  function buildTeslaCoil() {
    const m = builder();
    const bronze = [184, 118, 56];
    const copper = [226, 146, 74];
    const iron = [58, 62, 74];
    const arc = [148, 124, 255];
    const spark = [132, 242, 255];

    m.addGroundFoundation(iron, [38, 42, 52], arc, 2.65, 1.05);

    // Heavy dynamo base with 4 vertical capacitor pylons
    m.setTag("yaw");
    m.addCylY(0, 1.24, 2.15, 1.68, 1.38, 8, iron);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      m.addCylYAt(Math.cos(a) * 1.45, Math.sin(a) * 1.45, 1.15, 2.55, 0.34, 0.28, 6, bronze);
      m.addBlob(Math.cos(a) * 1.45, 2.68, Math.sin(a) * 1.45, 0.28, 0.28, 0.28, spark, true, 5, 3);
    }
    // Armored brass front cockpit porthole
    m.addBox(0, 1.72, 1.38, 0.95, 0.56, 0.35, bronze);
    m.addBox(0, 1.72, 1.56, 0.72, 0.36, 0.12, spark, true);

    // Tall stepped copper transformer spire (tilts slightly toward target)
    m.setTag("pitch");
    m.addCylY(0, 2.15, 4.45, 0.72, 0.34, 8, iron);
    // 4 stepped copper coil torus rings
    for (const [ry, rr] of [[2.55, 1.15], [3.10, 0.98], [3.62, 0.82], [4.10, 0.68]]) {
      m.addCylY(0, ry - 0.14, ry + 0.14, rr, rr, 8, copper);
      m.addCylY(0, ry - 0.04, ry + 0.04, rr + 0.08, rr + 0.08, 8, arc, true);
    }
    // Side discharge prongs
    for (const s of [-1, 1]) {
      m.addStrut(s * 0.6, 3.2, 0, s * 1.45, 4.15, 0.55, 0.18, 0.08, bronze);
    }

    // Rotating crown ring & levitating plasma orb
    m.setTag("radar");
    m.addCylY(0, 4.45, 4.68, 0.95, 0.95, 8, copper);
    m.setTag("core");
    m.addBlob(0, 5.05, 0, 0.68, 0.68, 0.68, spark, true, 8, 5);

    return {
      id: "tesla_coil",
      no: "06",
      name: "特斯拉電弧防空塔",
      en: "TESLA ARC TOWER",
      role: "連鎖閃電・群體高壓感電",
      desc: "高壓銅質線圈尖塔在頂端聚積百萬伏特等離子球，釋放自動跳躍連鎖的藍紫高壓防空閃電，同時麻痺多隻飛蟲。",
      weaponStyle: "tesla",
      fireColor: "#a88cff",
      coreColor: "#84f2ff",
      accentHex: "#b088ff",
      pivotY: 2.3,
      pivotZ: 0.0,
      muzzles: [[0, 5.15, 0.0]],
      stats: { dmg: 84, rof: 82, rng: 72, arm: 78 },
      cockpit: {
        theme: "tesla_brass",
        frameCol: "#4a3322",
        frameHi: "#b87638",
        trimCol: "#b088ff",
        hudCol: "#90f0ff",
        glassTint: "rgba(86, 48, 168, 0.18)",
        reticle: "tesla",
        controlType: "arc_handles",
        barrelStyle: "tesla_prongs",
        label: "TESLA-MV 法拉第籠電弧艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.9,
    };
  }

  // --------------------------------------------------------------------------
  // 07. PLASMA MORTAR AA — 重型電漿迫擊防空塔
  // --------------------------------------------------------------------------
  function buildPlasmaMortar() {
    const m = builder();
    const volcanic = [66, 52, 56];
    const crimson = [148, 46, 46];
    const dark = [40, 32, 36];
    const magma = [255, 128, 34];
    const hot = [255, 228, 96];

    m.addGroundFoundation(volcanic, dark, magma, 2.9, 1.15);

    // Wide heavy squat armored fortress dome
    m.setTag("yaw");
    m.addCylY(0, 1.35, 2.35, 2.35, 1.85, 8, volcanic);
    m.addBox(0, 2.15, -0.75, 2.85, 1.15, 1.85, crimson, false, 0.85);
    // Heavy blast cowl cheeks
    for (const s of [-1, 1]) {
      m.addBox(s * 1.48, 2.05, 0.65, 0.65, 1.15, 1.85, volcanic, false, 0.85);
      m.addBox(s * 1.72, 2.05, -0.35, 0.34, 0.65, 1.1, magma, true); // Glow thermal vents
    }
    m.addBox(0, 1.78, 1.75, 1.15, 0.32, 0.25, hot, true);

    // Elevating wide-bore stubby plasma mortar cannon
    m.setTag("pitch");
    m.addBox(0, 2.55, 0.35, 1.75, 1.25, 1.65, dark);

    m.setTag("barrel");
    m.addCylZ(0, 2.68, 0.55, 3.35, 0.86, 0.72, 8, volcanic);
    m.addCylZ(0, 2.68, 3.15, 3.65, 0.96, 0.92, 8, crimson);
    // Glowing molten plasma containment slits along barrel
    for (const s of [-1, 1]) {
      m.addBox(s * 0.76, 2.68, 1.95, 0.16, 0.32, 1.95, magma, true);
    }
    m.setTag("core");
    m.addBlob(0, 2.68, 3.45, 0.56, 0.56, 0.45, hot, true, 6, 4);

    return {
      id: "plasma_mortar",
      no: "07",
      name: "電漿迫擊防空塔",
      en: "PLASMA MORTAR AA",
      role: "高溫太陽彈・大範圍爆炎",
      desc: "大口徑短管太陽爐迫擊砲，向高空拋射高密度炙熱電漿火球，命中後炸開巨型灼熱電漿環瞬間蒸發蟲族編隊。",
      weaponStyle: "plasma",
      fireColor: "#ff7e29",
      coreColor: "#ffe866",
      accentHex: "#ff8830",
      pivotY: 2.65,
      pivotZ: 0.35,
      muzzles: [[0, 2.68, 3.8]],
      stats: { dmg: 96, rof: 58, rng: 78, arm: 96 },
      cockpit: {
        theme: "magma_dome",
        frameCol: "#3b2626",
        frameHi: "#7d3830",
        trimCol: "#ff8830",
        hudCol: "#ffbe55",
        glassTint: "rgba(130, 48, 12, 0.19)",
        reticle: "mortar",
        controlType: "heavy_levers",
        barrelStyle: "mortar_bore",
        label: "SOLARIS-8 電漿迫擊重裝艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.4,
    };
  }

  // --------------------------------------------------------------------------
  // 08. EMP RADAR DISRUPTOR — 脈衝雷達干擾塔
  // --------------------------------------------------------------------------
  function buildEmpRadar() {
    const m = builder();
    const teal = [48, 92, 98];
    const dark = [28, 48, 56];
    const silver = [154, 186, 192];
    const emerald = [64, 255, 168];
    const mint = [170, 255, 224];

    m.addGroundFoundation(teal, dark, emerald, 2.6, 1.0);

    // Electronic warfare command turret
    m.setTag("yaw");
    m.addCylY(0, 1.24, 2.08, 1.62, 1.42, 8, teal);
    m.addBox(0, 1.72, 1.22, 1.28, 0.58, 0.55, dark);
    m.addBox(0, 1.78, 1.50, 1.04, 0.28, 0.12, emerald, true);
    // Side comms antenna masts
    for (const s of [-1, 1]) {
      m.addCylYAt(s * 1.48, -0.45, 1.4, 3.25, 0.10, 0.06, 5, silver);
      m.addBlob(s * 1.48, 3.35, -0.45, 0.18, 0.18, 0.18, emerald, true, 5, 3);
    }

    // Elevating giant hexagonal parabolic EMP dish
    m.setTag("pitch");
    m.addBox(0, 2.45, -0.25, 1.15, 0.95, 1.15, dark);
    // Dish backing & rim (6-sided funnel)
    m.addCylZ(0, 3.15, -0.15, 0.55, 0.65, 2.15, 6, teal);
    m.addCylZ(0, 3.15, 0.55, 0.72, 2.15, 2.28, 6, silver);
    // Inner glowing collector grid
    m.addCylZ(0, 3.15, 0.45, 0.58, 0.55, 1.82, 6, emerald, true);

    // 4 converging emitter struts holding central EMP pulse needle
    m.setTag("barrel");
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      m.addStrut(Math.cos(a) * 1.65, 3.15 + Math.sin(a) * 1.65, 0.62, 0, 3.15, 2.45, 0.12, 0.08, silver);
    }
    m.setTag("core");
    m.addCylZ(0, 3.15, 0.5, 2.65, 0.16, 0.08, 6, mint, true);
    m.addBlob(0, 3.15, 2.55, 0.36, 0.36, 0.36, emerald, true, 6, 4);

    return {
      id: "emp_radar",
      no: "08",
      name: "脈衝雷達干擾塔",
      en: "EMP RADAR DISRUPTOR",
      role: "電磁震波・癱瘓防空支援",
      desc: "巨型六角拋物面電磁脈衝天線陣列，發射擴散式翡翠綠 EMP 震波癱瘓蟲族飛行神經與護盾，大幅降低敵機速度。",
      weaponStyle: "emp",
      fireColor: "#40ffa8",
      coreColor: "#b8ffe0",
      accentHex: "#40ffa8",
      pivotY: 2.85,
      pivotZ: 0.0,
      muzzles: [[0, 3.15, 2.75]],
      stats: { dmg: 64, rof: 76, rng: 94, arm: 76 },
      cockpit: {
        theme: "ew_emerald",
        frameCol: "#1a3036",
        frameHi: "#3d6e75",
        trimCol: "#40ffa8",
        hudCol: "#5cffb8",
        glassTint: "rgba(22, 110, 78, 0.16)",
        reticle: "emp",
        controlType: "ew_console",
        barrelStyle: "emp_dish",
        label: "ECHO-EMP 電子戰干擾座艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.5,
    };
  }

  // --------------------------------------------------------------------------
  // 09. CRYO FROST EMITTER — 極凍冰霜射線塔
  // --------------------------------------------------------------------------
  function buildCryoBeam() {
    const m = builder();
    const snow = [220, 240, 252];
    const glacier = [86, 178, 224];
    const steel = [110, 140, 168];
    const ice = [148, 246, 255];
    const deep = [42, 86, 128];

    m.addGroundFoundation(snow, deep, ice, 2.6, 1.0);

    // Turret body with twin pressurized liquid nitrogen cryo tanks!
    m.setTag("yaw");
    m.addBox(0, 1.85, -0.1, 2.15, 1.25, 2.45, snow, false, 0.88);
    m.addBox(0, 1.98, 1.12, 1.05, 0.36, 0.22, ice, true);
    for (const s of [-1, 1]) {
      // Pressurized vertical cryo tanks
      m.addCylYAt(s * 1.42, -0.55, 1.25, 2.95, 0.56, 0.56, 8, glacier);
      m.addBlob(s * 1.42, 2.98, -0.55, 0.54, 0.34, 0.54, snow, false, 8, 4);
      m.addCylYAt(s * 1.42, -0.55, 1.75, 2.45, 0.60, 0.60, 8, ice, true);
    }

    // Elevating wide hexagonal frost nozzle & condenser fins
    m.setTag("pitch");
    m.addBox(0, 2.45, 0.45, 1.35, 0.95, 1.55, steel);

    m.setTag("barrel");
    m.addCylZ(0, 2.48, 0.95, 3.15, 0.64, 0.52, 6, snow);
    m.addCylZ(0, 2.48, 3.15, 3.72, 0.56, 0.84, 6, glacier);
    // 6 crystalline frost condenser fins around muzzle
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      m.addStrut(Math.cos(a) * 0.55, 2.48 + Math.sin(a) * 0.55, 1.5, Math.cos(a) * 0.95, 2.48 + Math.sin(a) * 0.95, 3.55, 0.14, 0.08, ice, true);
    }
    m.setTag("core");
    m.addBlob(0, 2.48, 3.55, 0.44, 0.44, 0.35, ice, true, 6, 4);

    return {
      id: "cryo_beam",
      no: "09",
      name: "極凍冰霜射線塔",
      en: "CRYO FROST EMITTER",
      role: "液氮急凍・緩速碎甲防空",
      desc: "雙側高壓液態氮儲槽供能，從六角極凍噴嘴噴射絕對零度冰霜射線，將空中蟲族瞬間冰封減速並使其脆化碎裂。",
      weaponStyle: "cryo",
      fireColor: "#94f6ff",
      coreColor: "#ffffff",
      accentHex: "#8ceeff",
      pivotY: 2.48,
      pivotZ: 0.45,
      muzzles: [[0, 2.48, 3.85]],
      stats: { dmg: 74, rof: 88, rng: 76, arm: 84 },
      cockpit: {
        theme: "arctic_cryo",
        frameCol: "#b6d4e6",
        frameHi: "#eaf7ff",
        trimCol: "#5ee4ff",
        hudCol: "#9ef8ff",
        glassTint: "rgba(96, 210, 245, 0.18)",
        reticle: "cryo",
        controlType: "valve_grips",
        barrelStyle: "cryo_nozzle",
        label: "CRYO-0K 極凍冷媒操控艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 4.4,
    };
  }

  // --------------------------------------------------------------------------
  // 10. ORBITAL ION CITADEL — 天穹離子要塞巨砲塔
  // --------------------------------------------------------------------------
  function buildOrbitalIon() {
    const m = builder();
    const royal = [72, 108, 156];
    const navy = [36, 56, 88];
    const gold = [242, 196, 68];
    const cyan = [88, 244, 255];
    const white = [235, 248, 255];

    // Extra-massive tiered fortress base
    m.addGroundFoundation(royal, navy, gold, 3.15, 1.3);
    m.setTag("base");
    m.addCylY(0, 1.3, 1.65, 2.25, 2.05, 8, gold);

    // Gilded rotating citadel superstructure
    m.setTag("yaw");
    m.addCylY(0, 1.65, 2.55, 2.08, 1.75, 8, royal);
    m.addBox(0, 2.32, -0.45, 2.75, 1.18, 2.85, navy, false, 0.86);
    m.addBox(0, 2.55, 1.35, 1.45, 0.45, 0.35, cyan, true);
    // Twin side mini defense pods
    for (const s of [-1, 1]) {
      m.addBox(s * 1.92, 2.25, 0.25, 0.65, 0.65, 1.45, royal);
      m.addBox(s * 1.92, 2.62, 0.25, 0.48, 0.14, 1.15, gold);
      m.addCylZ(s * 1.92, 2.25, 0.95, 1.95, 0.14, 0.11, 6, white);
    }

    // Elevating colossal ion core barrel
    m.setTag("pitch");
    m.addBox(0, 2.95, 0.1, 1.95, 1.25, 2.0, royal);
    m.addBox(0, 3.62, -0.1, 1.25, 0.22, 1.4, gold);

    m.setTag("barrel");
    m.addCylZ(0, 2.98, 0.65, 4.45, 0.72, 0.56, 8, white);
    m.addCylZ(0, 2.98, 1.45, 1.85, 0.88, 0.88, 8, gold);
    m.addCylZ(0, 2.98, 3.15, 3.55, 0.82, 0.82, 8, gold);
    m.addCylZ(0, 2.98, 4.35, 4.78, 0.76, 0.68, 8, navy);

    // 4 Articulated Unfolding Armored Blast Petals around the mega barrel!
    m.setTag("petal");
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      const ca = Math.cos(a), sa = Math.sin(a);
      m.addStrut(ca * 0.88, 2.98 + sa * 0.88, 1.0, ca * 1.08, 2.98 + sa * 1.08, 4.65, 0.34, 0.22, royal);
      m.addStrut(ca * 0.96, 2.98 + sa * 0.96, 1.4, ca * 1.16, 2.98 + sa * 1.16, 4.35, 0.14, 0.10, gold, true);
    }

    // Glowing sky-piercing ion core crystal
    m.setTag("core");
    m.addBlob(0, 2.98, 4.65, 0.54, 0.54, 0.54, cyan, true, 8, 5);

    return {
      id: "orbital_ion",
      no: "10",
      name: "天穹離子要塞砲塔",
      en: "ORBITAL ION CITADEL",
      role: "聯邦終極巨砲・直擊太空軌道",
      desc: "聯邦地表最強旗艦級防空要塞砲！四片重裝金邊護瓣展開蓄能後，射出貫穿大氣層的終極天穹離子光柱直轟軌道母艦！",
      weaponStyle: "ion_beam",
      fireColor: "#ffe466",
      coreColor: "#66f8ff",
      accentHex: "#f2c444",
      pivotY: 2.98,
      pivotZ: 0.1,
      muzzles: [[0, 2.98, 4.95], [-1.92, 2.25, 2.05], [1.92, 2.25, 2.05]],
      stats: { dmg: 100, rof: 52, rng: 100, arm: 100 },
      cockpit: {
        theme: "royal_citadel",
        frameCol: "#1c2d4a",
        frameHi: "#486ea3",
        trimCol: "#f2c444",
        hudCol: "#72f8ff",
        glassTint: "rgba(28, 72, 130, 0.17)",
        reticle: "orbital",
        controlType: "citadel_yoke",
        barrelStyle: "ion_petals",
        label: "SKYWARD-X 天穹離子要塞指揮艙",
      },
      verts: m.verts, vTags: m.vTags, faces: m.faces, radius: 5.5,
    };
  }

  const TURRET_LIST = [
    buildVulcanGatling(),
    buildTwinFlak(),
    buildSamMissile(),
    buildPrismLaser(),
    buildRailgunAA(),
    buildTeslaCoil(),
    buildPlasmaMortar(),
    buildEmpRadar(),
    buildCryoBeam(),
    buildOrbitalIon(),
  ];

  const TURRET_BY_ID = {};
  for (const t of TURRET_LIST) TURRET_BY_ID[t.id] = t;

  // 8 Standard Turret Action States (used for sprite sheets & 3D showcase)
  const TURRET_ACTIONS = [
    { key: "idle",     name: "待機掃描",   en: "IDLE SCAN",     desc: "雷達定速旋轉掃描空域，砲塔保持低仰角警戒。" },
    { key: "track",    name: "旋轉鎖敵",   en: "TRACK TARGET",  desc: "砲座高速水平旋轉鎖定來襲空中蟲群，火控亮起。" },
    { key: "elevate",  name: "高仰角瞄準", en: "HIGH ELEVATE",  desc: "仰角液壓全開直指天頂高空目標，進入射擊姿態。" },
    { key: "fire",     name: "主砲開火",   en: "PRIMARY FIRE",  desc: "主武器爆發耀眼砲口火光／光束／飛彈與電漿！" },
    { key: "recoil",   name: "連射後座",   en: "RAPID RECOIL",  desc: "砲管劇烈後座往復運動，全火力連續傾瀉彈幕。" },
    { key: "charge",   name: "充能裝填",   en: "RELOAD/CHARGE", desc: "護瓣展開／彈艙裝填，能量核心劇烈聚光蓄能。" },
    { key: "overheat", name: "過熱排氣",   en: "OVERHEAT VENT", desc: "武器連續射擊後紅熱降溫，雙側噴出高溫蒸氣。" },
    { key: "damaged",  name: "受損爆破",   en: "DAMAGED/BLAST", desc: "遭受蟲族俯衝轟炸，裝甲爆裂火花四濺解體！" },
  ];

  // Shared 3D vertex transform for articulated turret animations!
  // pose: { yaw, pitch, recoilL, recoilR, spinAngle, radarAngle, petalOpen, explode, shake }
  function transformTurretVerts(model, pose) {
    const yaw = pose.yaw || 0;
    const pitch = pose.pitch || 0; // positive = aim upward (+Y)
    const recL = pose.recoilL || 0;
    const recR = pose.recoilR || 0;
    const spin = pose.spinAngle || 0;
    const radar = pose.radarAngle || 0;
    const petal = pose.petalOpen || 0;
    const explode = pose.explode || 0;
    const shake = pose.shake || 0;

    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
    const cr = Math.cos(radar), sr = Math.sin(radar);
    const cs = Math.cos(spin), ss = Math.sin(spin);

    const py = model.pivotY || 2.2;
    const pz = model.pivotZ || 0.2;

    const out = new Array(model.verts.length);
    for (let i = 0; i < model.verts.length; i++) {
      const v = model.verts[i];
      const tag = model.vTags[i];
      let x = v[0], y = v[1], z = v[2];

      if (tag === "radar") {
        const rx = x * cr - z * sr;
        const rz = x * sr + z * cr;
        x = rx; z = rz;
      }

      if (tag === "spinL" || tag === "spinR") {
        const cx = tag === "spinL" ? -1.65 : 1.65;
        const dx = x - cx, dy = y - py;
        const dir = tag === "spinL" ? 1 : -1;
        x = cx + dx * cs - dy * ss * dir;
        y = py + dx * ss * dir + dy * cs;
        z -= (tag === "spinL" ? recL : recR);
      } else if (tag === "barrel") {
        z -= recL;
      } else if (tag === "barrelL") {
        z -= recL;
      } else if (tag === "barrelR") {
        z -= recR;
      } else if (tag === "petal" && petal > 0) {
        const dy = y - py;
        const radial = Math.hypot(x, dy) || 1;
        const expand = petal * (0.18 + Math.max(0, z - 1.0) * 0.16);
        x += (x / radial) * expand;
        y += (dy / radial) * expand;
      }

      // Apply pitch around (0, py, pz) for upper elevating parts
      if (tag === "pitch" || tag === "barrel" || tag === "barrelL" || tag === "barrelR" || tag === "spinL" || tag === "spinR" || tag === "petal" || tag === "core") {
        const dy = y - py;
        const dz = z - pz;
        const ny = dy * cp - dz * sp;
        const nz = dy * sp + dz * cp;
        y = py + ny;
        z = pz + nz;
      }

      // Apply yaw around Y axis for everything except ground base
      if (tag !== "base") {
        const nx = x * cy + z * sy;
        const nz = -x * sy + z * cy;
        x = nx; z = nz;
      }

      // Micro vibration during firing/overheat
      if (shake > 0 && tag !== "base") {
        x += Math.sin(i * 17.3 + shake * 40) * shake * 0.08;
        y += Math.cos(i * 13.7 + shake * 40) * shake * 0.06;
      }

      // Explode blast separation
      if (explode > 0 && tag !== "base") {
        const k = (i % 7) * 0.9 + 0.5;
        const ang = i * 2.39996;
        x += Math.cos(ang) * explode * (0.9 + k * 0.32);
        y += Math.max(-0.4, (0.55 + Math.sin(i * 1.7) * 0.5) * explode * 1.65);
        z += Math.sin(ang) * explode * (0.9 + k * 0.32);
      }

      out[i] = [x, y, z];
    }
    return out;
  }

  function getMuzzleWorld(model, pose, idx = 0) {
    const m = model.muzzles[idx % model.muzzles.length];
    const yaw = pose.yaw || 0;
    const pitch = pose.pitch || 0;
    const py = model.pivotY || 2.2;
    const pz = model.pivotZ || 0.2;
    const rec = (idx % 2 === 0 ? pose.recoilL : pose.recoilR) || 0;

    let x = m[0], y = m[1], z = m[2] - rec;
    const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
    const dy = y - py, dz = z - pz;
    y = py + (dy * cp - dz * sp);
    z = pz + (dy * sp + dz * cp);

    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    return [x * cy + z * sy, y, -x * sy + z * cy];
  }

  const api = {
    TURRET_LIST,
    TURRET_BY_ID,
    TURRET_ACTIONS,
    getTurret(id) {
      return TURRET_BY_ID[id] || TURRET_LIST[0];
    },
    transformTurretVerts,
    getMuzzleWorld,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TurretModels = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
