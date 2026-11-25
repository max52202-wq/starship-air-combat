// ============================================================================
// capital_turret_models.js — 10 Distinct Large Starship Turret 3D Models
// Mounted on Federation Capital Starship Armored Hull Decks!
// Works in both Browser (window.CapitalTurretModels) and Node.js (module.exports)
// Coordinate system: +Y up (outward from ship hull), +Z forward (0° pitch), +X right
// Vertex part tags control real-time 3D articulated animations:
//   "deck"   : Federation capital starship armored hull plate + cyan conduits (stationary)
//   "base"   : recessed armored barbette collar & deck clamp lugs (stationary)
//   "yaw"    : rotating turret ring / armored cupola / ball housing (rotates around Y)
//   "pitch"  : elevating weapon cradle / gun mantlet / launcher rack (rotates around local X)
//   "barrel" : primary weapon barrel (elevates + recoils along local -Z)
//   "barrelL": left alternating barrel (alternating recoil)
//   "barrelR": right alternating barrel (alternating recoil)
//   "barrelM": center barrel for triple macro cannon (staggered recoil)
//   "spinL"  : left rotary gatling cluster (spins around barrel Z axis)
//   "spinR"  : right rotary gatling cluster (spins around barrel Z axis)
//   "radar"  : dorsal target-lock scanner / rangefinder / sensor pod (continuous Y spin)
//   "petal"  : unfolding armored blast petals / Yamato golden wings (expands on fire/charge)
//   "core"   : glowing plasma/photon/Yamato energy core (pulses & expands on charge)
// ============================================================================

(function (root) {
  function builder() {
    const verts = [];
    const vTags = [];
    const faces = [];
    let curTag = "deck";

    function setTag(tag) {
      curTag = tag || "deck";
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

    function addSphere(cx, cy, cz, rx, ry, rz, latSegs, lonSegs, color, emissive = false) {
      const rings = [];
      for (let la = 1; la < latSegs; la++) {
        const phi = (la / latSegs) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        const ring = [];
        for (let lo = 0; lo < lonSegs; lo++) {
          const th = (lo / lonSegs) * Math.PI * 2;
          ring.push(addV(cx + Math.cos(th) * sp * rx, cy + cp * ry, cz + Math.sin(th) * sp * rz));
        }
        rings.push(ring);
      }
      const topV = addV(cx, cy + ry, cz);
      const botV = addV(cx, cy - ry, cz);
      for (let lo = 0; lo < lonSegs; lo++) {
        const n = (lo + 1) % lonSegs;
        addTri(topV, rings[0][n], rings[0][lo], color, emissive);
        addTri(botV, rings[rings.length - 1][lo], rings[rings.length - 1][n], color, emissive);
      }
      for (let r = 0; r < rings.length - 1; r++) {
        for (let lo = 0; lo < lonSegs; lo++) {
          const n = (lo + 1) % lonSegs;
          addQuad(rings[r][lo], rings[r][n], rings[r + 1][n], rings[r + 1][lo], color, emissive);
        }
      }
    }

    function addWing(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, thick, color, emissive = false) {
      const ht = thick * 0.5;
      const t0 = addV(x0, y0 + ht, z0), t1 = addV(x1, y1 + ht, z1), t2 = addV(x2, y2 + ht, z2), t3 = addV(x3, y3 + ht, z3);
      const b0 = addV(x0, y0 - ht, z0), b1 = addV(x1, y1 - ht, z1), b2 = addV(x2, y2 - ht, z2), b3 = addV(x3, y3 - ht, z3);
      addQuad(t0, t1, t2, t3, color, emissive);
      addQuad(b3, b2, b1, b0, color, emissive);
      addQuad(t0, b0, b1, t1, color, emissive);
      addQuad(t1, b1, b2, t2, color, emissive);
      addQuad(t2, b2, b3, t3, color, emissive);
      addQuad(t3, b3, b0, t0, color, emissive);
    }

    // Shared Federation Large Starship Armored Hull Deck Section + Recessed Barbette Ring!
    // Every starship turret visibly sits bolted onto a capital warship hull plate.
    function addStarshipDeckBase(hullCol, hullHi, trimCol, glowCol, isSponson = false) {
      setTag("deck");
      // Sloped Capital Starship Hull Armor Slab (distinct square-chamfered warship deck plate!)
      addBox(0, 0.22, 0, 5.4, 0.44, 5.4, hullCol, false, 0.94, 1.0);
      // Raised left/right armored hull bulkhead ribs (warship deck trench)
      addBox(-2.25, 0.52, 0, 0.72, 0.26, 4.9, hullHi, false, 0.86, 0.96);
      addBox(2.25, 0.52, 0, 0.72, 0.26, 4.9, hullHi, false, 0.86, 0.96);
      // Fore/aft deck panel seams & armor plates
      addBox(0, 0.46, 2.25, 3.6, 0.14, 0.65, hullHi, false, 0.9, 0.9);
      addBox(0, 0.46, -2.25, 3.6, 0.14, 0.65, hullHi, false, 0.9, 0.9);
      // Federation gold command stripes along hull deck flanks
      addBox(-2.25, 0.66, 0, 0.22, 0.08, 4.2, trimCol, false);
      addBox(2.25, 0.66, 0, 0.22, 0.08, 4.2, trimCol, false);
      // Glowing cyan starship reactor conduit strips embedded into deck!
      addBox(-1.62, 0.48, 0, 0.14, 0.10, 4.5, glowCol, true);
      addBox(1.62, 0.48, 0, 0.14, 0.10, 4.5, glowCol, true);
      // Corner hull navigation beacon LEDs
      for (const sx of [-2.35, 2.35]) {
        for (const sz of [-2.2, 2.2]) {
          addBox(sx, 0.68, sz, 0.24, 0.12, 0.24, glowCol, true);
        }
      }
      if (isSponson) {
        // Side hull sponson bracket backing wall
        addBox(0, 1.15, -2.35, 4.6, 1.45, 0.52, hullCol, false, 0.92, 1.0);
        addBox(0, 1.88, -2.32, 4.2, 0.18, 0.56, trimCol, false);
      }

      // Recessed Armored Turret Barbette Collar (bolted into starship deck)
      setTag("base");
      addCylY(0, 0.44, 0.96, 2.02, 1.72, 8, hullHi);
      addCylY(0, 0.96, 1.12, 1.78, 1.66, 8, trimCol);
      // 4 heavy deck-lock actuator clamps
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const lx = Math.cos(a) * 1.86;
        const lz = Math.sin(a) * 1.86;
        addBox(lx, 0.72, lz, 0.52, 0.52, 0.52, hullCol, false, 0.85, 0.85);
        addBox(lx * 1.04, 0.98, lz * 1.04, 0.22, 0.14, 0.22, glowCol, true);
      }
    }

    return {
      verts, vTags, faces, setTag, addV, addTri, addQuad,
      addBox, addCylY, addCylYAt, addCylZ, addSphere, addWing, addStarshipDeckBase,
      build(meta) {
        return Object.assign({ verts, vTags, faces }, meta);
      },
    };
  }

  // Federation Starship Standard Palette (matches assets/ships_8bit/starships_8bit_overview.png!)
  const FED_HULL_DARK = [46, 62, 88];
  const FED_HULL_MID  = [76, 100, 134];
  const FED_HULL_HI   = [118, 146, 180];
  const FED_GOLD      = [232, 186, 68];
  const FED_GOLD_DARK = [168, 126, 42];
  const FED_CYAN      = [82, 240, 255];
  const FED_GLASS     = [126, 214, 242];
  const FED_GUNMETAL  = [56, 66, 82];

  // ==========================================================================
  // 01. QUAD LASER BALL TURRET — 四聯裝球型雷射砲塔 (主力艦背甲・經典球型砲座)
  // ==========================================================================
  function buildQuadLaserDome() {
    const b = builder();
    b.addStarshipDeckBase(FED_HULL_DARK, FED_HULL_MID, FED_GOLD, FED_CYAN);

    // Gimbal ring & armored ball turret shell (Millennium-Falcon / Battlecruiser style!)
    b.setTag("yaw");
    b.addCylY(0, 1.12, 1.48, 1.54, 1.42, 8, FED_HULL_MID);
    // Side gimbal yoke arms cradling the spherical turret pod
    b.addBox(-1.46, 2.15, 0, 0.38, 1.45, 0.92, FED_HULL_HI, false, 0.82, 0.85);
    b.addBox(1.46, 2.15, 0, 0.38, 1.45, 0.92, FED_HULL_HI, false, 0.82, 0.85);
    b.addBox(-1.55, 2.35, 0, 0.22, 0.52, 0.52, FED_GOLD);
    b.addBox(1.55, 2.35, 0, 0.22, 0.52, 0.52, FED_GOLD);

    // Elevating spherical armored glass gunner ball!
    b.setTag("pitch");
    b.addSphere(0, 2.35, -0.05, 1.24, 1.18, 1.24, 6, 8, FED_HULL_MID);
    // Forward octagonal armored cockpit bubble glass (gunner sits right inside!)
    b.addBox(0, 2.42, 0.88, 1.28, 0.98, 0.52, FED_GLASS, true, 0.82, 0.72);
    // Canopy mullion cross-bars across the glass dome
    b.addBox(0, 2.42, 1.12, 1.22, 0.10, 0.10, FED_HULL_DARK);
    b.addBox(0, 2.42, 1.12, 0.10, 0.92, 0.10, FED_HULL_DARK);
    // Rear reactor capacitor backpack
    b.addBox(0, 2.35, -1.25, 1.12, 0.88, 0.65, FED_HULL_DARK, false, 0.88, 0.9);
    b.addBox(0, 2.42, -1.58, 0.62, 0.42, 0.16, FED_CYAN, true);

    // 4 Quad Pulse Laser Barrels (2 left + 2 right, alternating recoil!)
    b.setTag("barrelL");
    for (const py of [2.66, 2.04]) {
      b.addCylZ(-1.18, py, 0.1, 3.65, 0.16, 0.11, 6, FED_HULL_HI);
      b.addCylZ(-1.18, py, 0.7, 1.55, 0.22, 0.20, 6, FED_GOLD);
      b.addCylZ(-1.18, py, 3.45, 3.82, 0.14, 0.13, 6, FED_CYAN, true);
    }
    b.setTag("barrelR");
    for (const py of [2.66, 2.04]) {
      b.addCylZ(1.18, py, 0.1, 3.65, 0.16, 0.11, 6, FED_HULL_HI);
      b.addCylZ(1.18, py, 0.7, 1.55, 0.22, 0.20, 6, FED_GOLD);
      b.addCylZ(1.18, py, 3.45, 3.82, 0.14, 0.13, 6, FED_CYAN, true);
    }

    // Top dome tracking optic
    b.setTag("radar");
    b.addCylY(0, 3.48, 3.74, 0.28, 0.22, 6, FED_GOLD);
    b.addBox(0, 3.82, 0.08, 0.56, 0.22, 0.34, FED_CYAN, true);

    return b.build({
      id: "quad_laser_dome",
      no: "01",
      name: "四聯裝球型雷射砲塔",
      en: "QUAD LASER BALL TURRET",
      shipClass: "主力艦・背甲球塔",
      role: "360° 全向球型光學砲座・四管連射雷射攔截蟲群",
      weaponStyle: "quad_laser",
      accentHex: "#5ef2ff",
      fireColor: "#54f4ff",
      coreColor: "#a8fbff",
      pivotY: 2.35,
      muzzles: [[-1.18, 2.66, 3.82], [1.18, 2.66, 3.82], [-1.18, 2.04, 3.82], [1.18, 2.04, 3.82]],
      cockpit: {
        theme: "ball_bubble",
        frameCol: "#2b3d58", frameHi: "#6d8fb8", trimCol: "#e8b842", hudCol: "#5ef2ff",
        spaceTheme: "earth_orbit",
        barrelStyle: "quad_laser",
        controlType: "gyro_yoke",
        hullStyle: "capital_dorsal",
      },
    });
  }

  // ==========================================================================
  // 02. TWIN HEAVY TURBOLASER — 雙聯裝重型渦輪雷射砲 (戰列艦主甲板・重火力主砲)
  // ==========================================================================
  function buildTwinTurbolaser() {
    const b = builder();
    b.addStarshipDeckBase([52, 68, 92], [88, 114, 148], FED_GOLD, FED_CYAN);

    // Iconic Battleship Sloped Armored Casemate Housing
    b.setTag("yaw");
    b.addBox(0, 1.92, -0.15, 2.85, 1.55, 2.95, FED_HULL_MID, false, 0.78, 0.88);
    b.addBox(0, 2.75, -0.35, 1.92, 0.38, 1.95, FED_GOLD, false, 0.85, 0.9);
    // Side armored cheek plates with glowing capacitor vents
    b.addBox(-1.46, 1.88, -0.2, 0.34, 0.88, 2.15, FED_HULL_DARK);
    b.addBox(1.46, 1.88, -0.2, 0.34, 0.88, 2.15, FED_HULL_DARK);
    b.addBox(-1.62, 1.92, -0.35, 0.10, 0.36, 1.25, FED_CYAN, true);
    b.addBox(1.62, 1.92, -0.35, 0.10, 0.36, 1.25, FED_CYAN, true);
    // Sloped gunner observation visor on turret roof
    b.addBox(0, 2.48, 0.92, 1.18, 0.42, 0.56, FED_GLASS, true, 0.82, 0.78);

    // Armored Mantlet Cradle
    b.setTag("pitch");
    b.addBox(0, 2.05, 1.22, 1.92, 0.92, 0.72, FED_HULL_HI, false, 0.86, 0.9);

    // Massive Twin Alternating Heavy Turbolaser Barrels!
    b.setTag("barrelL");
    b.addCylZ(-0.56, 2.08, 1.15, 2.75, 0.34, 0.28, 8, FED_HULL_DARK);
    b.addCylZ(-0.56, 2.08, 2.70, 4.75, 0.23, 0.19, 8, FED_HULL_HI);
    b.addCylZ(-0.56, 2.08, 2.45, 2.85, 0.38, 0.36, 8, FED_GOLD);
    b.addCylZ(-0.56, 2.08, 4.55, 4.92, 0.26, 0.22, 8, [255, 196, 72], true);

    b.setTag("barrelR");
    b.addCylZ(0.56, 2.08, 1.15, 2.75, 0.34, 0.28, 8, FED_HULL_DARK);
    b.addCylZ(0.56, 2.08, 2.70, 4.75, 0.23, 0.19, 8, FED_HULL_HI);
    b.addCylZ(0.56, 2.08, 2.45, 2.85, 0.38, 0.36, 8, FED_GOLD);
    b.addCylZ(0.56, 2.08, 4.55, 4.92, 0.26, 0.22, 8, [255, 196, 72], true);

    // Rangefinder bar on turret roof
    b.setTag("radar");
    b.addCylY(0, 2.94, 3.36, 0.24, 0.20, 6, FED_HULL_HI);
    b.addBox(0, 3.44, 0, 1.48, 0.22, 0.26, FED_HULL_HI);
    b.addBox(-0.68, 3.44, 0.12, 0.18, 0.14, 0.12, FED_CYAN, true);
    b.addBox(0.68, 3.44, 0.12, 0.18, 0.14, 0.12, FED_CYAN, true);

    return b.build({
      id: "twin_turbolaser",
      no: "02",
      name: "雙聯裝重型渦輪雷射砲",
      en: "TWIN HEAVY TURBOLASER",
      shipClass: "戰列艦・主甲板雙聯砲",
      role: "戰列艦核心雙聯高能渦輪雷射・交替重後座齊射",
      weaponStyle: "turbolaser",
      accentHex: "#ffbe48",
      fireColor: "#ffae38",
      coreColor: "#ffe58a",
      pivotY: 2.08,
      muzzles: [[-0.56, 2.08, 4.92], [0.56, 2.08, 4.92]],
      cockpit: {
        theme: "battleship_cupola",
        frameCol: "#2e3c52", frameHi: "#7a94b8", trimCol: "#f0b840", hudCol: "#ffd668",
        spaceTheme: "mars_orbit",
        barrelStyle: "twin_turbolaser",
        controlType: "dual_handles",
        hullStyle: "battleship_bow",
      },
    });
  }

  // ==========================================================================
  // 03. TRIPLE MACRO BATTLE CANNON — 三聯裝戰列巨砲 (主力艦艦艏・三管巨艦砲)
  // ==========================================================================
  function buildTripleMacroCannon() {
    const b = builder();
    b.addStarshipDeckBase([40, 56, 80], [74, 98, 130], FED_GOLD, FED_CYAN);

    // Wide Dreadnought Turret House (Yamato / Star Dreadnought triple-turret profile!)
    b.setTag("yaw");
    b.addBox(0, 1.88, -0.25, 3.45, 1.42, 3.15, FED_HULL_MID, false, 0.80, 0.86);
    b.addBox(0, 2.66, -0.45, 2.45, 0.34, 2.15, FED_HULL_HI, false, 0.86, 0.88);
    // Gold flagship stripe across turret top
    b.addBox(0, 2.86, -0.45, 0.56, 0.12, 1.95, FED_GOLD);
    // Armored gunner observation blister on left-top & right-top
    b.addBox(-0.88, 2.78, 0.45, 0.62, 0.34, 0.56, FED_GLASS, true);
    b.addBox(0.88, 2.78, 0.45, 0.62, 0.34, 0.56, FED_GLASS, true);
    // Rear ammunition hoist & cooling louvers
    b.addBox(0, 1.92, -1.92, 2.25, 0.96, 0.52, FED_HULL_DARK);

    b.setTag("pitch");
    b.addBox(0, 1.98, 1.12, 2.75, 0.88, 0.72, FED_HULL_DARK, false, 0.90, 0.92);

    // 3 Massive Staggered Macro Cannon Barrels! (L, M, R)
    const addMacroBarrel = (tag, bx, len) => {
      b.setTag(tag);
      b.addCylZ(bx, 2.02, 1.0, 2.55, 0.28, 0.24, 6, FED_GUNMETAL);
      b.addCylZ(bx, 2.02, 2.50, len, 0.20, 0.16, 6, FED_HULL_HI);
      b.addCylZ(bx, 2.02, 2.18, 2.62, 0.32, 0.30, 6, FED_GOLD);
      b.addCylZ(bx, 2.02, len - 0.32, len + 0.15, 0.24, 0.21, 6, [255, 148, 62], true);
    };
    addMacroBarrel("barrelL", -0.82, 4.75);
    addMacroBarrel("barrelM",  0.00, 4.95);
    addMacroBarrel("barrelR",  0.82, 4.75);

    // Wide battleship optical rangefinder mast
    b.setTag("radar");
    b.addCylY(0, 2.86, 3.25, 0.26, 0.22, 6, FED_GOLD);
    b.addBox(0, 3.35, -0.35, 2.15, 0.24, 0.32, FED_HULL_HI);
    b.addBox(-0.98, 3.35, -0.18, 0.22, 0.18, 0.14, FED_CYAN, true);
    b.addBox(0.98, 3.35, -0.18, 0.22, 0.18, 0.14, FED_CYAN, true);

    return b.build({
      id: "triple_macro_cannon",
      no: "03",
      name: "三聯裝戰列巨砲",
      en: "TRIPLE MACRO CANNON",
      shipClass: "主力艦・艦艏三管巨砲",
      role: "三管高爆反艦電漿巨砲・超遠程重裝破甲轟炸",
      weaponStyle: "triple_macro",
      accentHex: "#ff9248",
      fireColor: "#ff7e32",
      coreColor: "#ffd278",
      pivotY: 2.02,
      muzzles: [[-0.82, 2.02, 4.90], [0.0, 2.02, 5.10], [0.82, 2.02, 4.90]],
      cockpit: {
        theme: "dreadnought_bunker",
        frameCol: "#283447", frameHi: "#6d82a3", trimCol: "#e8a842", hudCol: "#ffaa48",
        spaceTheme: "jupiter_storm",
        barrelStyle: "triple_macro",
        controlType: "wheel_levers",
        hullStyle: "dreadnought_prow",
      },
    });
  }

  // ==========================================================================
  // 04. PD-CIWS POINT-DEFENSE TURRET — 點防禦火神近防砲塔 (全艦覆蓋・近防機砲)
  // ==========================================================================
  function buildPdCiwsRotary() {
    const b = builder();
    b.addStarshipDeckBase(FED_HULL_DARK, FED_HULL_MID, [196, 214, 232], FED_CYAN);

    // Compact Sleek Cylindrical CIWS Dome + Ammo Drum Housing
    b.setTag("yaw");
    b.addCylY(0, 1.12, 2.25, 1.32, 1.18, 8, FED_HULL_HI);
    b.addBox(0, 1.85, -0.95, 1.52, 0.96, 0.92, FED_HULL_DARK);
    b.addBox(0, 2.38, -0.25, 1.18, 0.52, 1.18, FED_GOLD, false, 0.78, 0.85);
    // Front panoramic point-defense gunner visor
    b.addBox(0, 2.15, 0.88, 0.96, 0.54, 0.44, FED_GLASS, true);

    b.setTag("pitch");
    b.addBox(-1.12, 1.98, 0.25, 0.42, 0.74, 1.15, FED_HULL_DARK);
    b.addBox(1.12, 1.98, 0.25, 0.42, 0.74, 1.15, FED_HULL_DARK);

    // Twin 6-Barrel High-Speed Rotary Gatling Clusters!
    const addCluster = (tag, cx) => {
      b.setTag(tag);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const ox = cx + Math.cos(a) * 0.22;
        const oy = 1.98 + Math.sin(a) * 0.22;
        b.addCylZ(ox, oy, 0.55, 3.65, 0.065, 0.06, 5, FED_HULL_HI);
      }
      b.addCylZ(cx, 1.98, 1.35, 1.62, 0.32, 0.32, 8, FED_GOLD);
      b.addCylZ(cx, 1.98, 2.75, 2.98, 0.30, 0.30, 8, FED_GOLD);
      b.addCylZ(cx, 1.98, 3.50, 3.74, 0.26, 0.24, 8, [255, 224, 96], true);
    };
    addCluster("spinL", -1.12);
    addCluster("spinR",  1.12);

    // Fast-spinning CIWS Phalanx dome radar on top!
    b.setTag("radar");
    b.addCylY(0, 2.64, 3.42, 0.42, 0.36, 8, [215, 232, 248]);
    b.addSphere(0, 3.42, 0, 0.38, 0.32, 0.38, 5, 8, [235, 246, 255]);
    b.addBox(0, 3.12, 0.36, 0.32, 0.22, 0.14, FED_CYAN, true);

    return b.build({
      id: "pd_ciws_rotary",
      no: "04",
      name: "點防禦火神近防砲塔",
      en: "PD-CIWS GATLING TURRET",
      shipClass: "全艦覆蓋・反蟲群近防砲",
      role: "雙管六膛高速旋轉機砲・近距離彈幕撕碎飛螳與孢子",
      weaponStyle: "ciws_gatling",
      accentHex: "#ffe05c",
      fireColor: "#ffd84d",
      coreColor: "#fff4a8",
      pivotY: 1.98,
      muzzles: [[-1.12, 1.98, 3.74], [1.12, 1.98, 3.74]],
      cockpit: {
        theme: "ciws_pod",
        frameCol: "#253448", frameHi: "#748ca8", trimCol: "#ffd84d", hudCol: "#6effb8",
        spaceTheme: "asteroid_belt",
        barrelStyle: "ciws_gatling",
        controlType: "gyro_yoke",
        hullStyle: "carrier_flank",
      },
    });
  }

  // ==========================================================================
  // 05. BROADSIDE PLASMA SPONSON — 舷側雙管電漿砲座 (戰列艦舷側・重型電漿砲)
  // ==========================================================================
  function buildBroadsidePlasma() {
    const b = builder();
    b.addStarshipDeckBase([48, 54, 78], [86, 98, 134], [244, 152, 56], [255, 128, 48], true);

    // Armored Broadside Sponson Casemate
    b.setTag("yaw");
    b.addBox(0, 1.88, -0.05, 2.55, 1.48, 2.45, [70, 86, 118], false, 0.84, 0.88);
    // Lateral plasma heat-radiator fins
    for (const s of [-1, 1]) {
      for (const rz of [-0.65, 0.0, 0.65]) {
        b.addBox(s * 1.38, 1.88, rz, 0.42, 0.88, 0.16, [238, 146, 52]);
      }
    }
    // Glowing orange-cyan armored gunner slit
    b.addBox(0, 2.42, 0.78, 1.12, 0.42, 0.48, [255, 186, 92], true);

    b.setTag("pitch");
    b.addBox(0, 1.96, 1.12, 1.88, 0.86, 0.72, FED_HULL_DARK);

    // Twin Magnetic Plasma Accelerator Coils with glowing plasma conduits!
    const addPlasmaTube = (tag, bx) => {
      b.setTag(tag);
      b.addBox(bx, 1.98, 2.55, 0.56, 0.62, 2.65, FED_HULL_MID, false, 0.92, 0.92);
      // Glowing plasma core slit along top & sides
      b.addBox(bx, 2.30, 2.60, 0.24, 0.12, 2.25, [255, 134, 48], true);
      // 3 magnetic containment rings
      for (const rz of [1.85, 2.65, 3.45]) {
        b.addCylZ(bx, 1.98, rz, rz + 0.20, 0.40, 0.40, 8, FED_GOLD);
      }
      b.addCylZ(bx, 1.98, 3.82, 4.18, 0.30, 0.34, 8, [255, 198, 76], true);
    };
    addPlasmaTube("barrelL", -0.62);
    addPlasmaTube("barrelR",  0.62);

    b.setTag("core");
    b.addSphere(0, 2.78, -0.45, 0.46, 0.36, 0.46, 5, 8, [255, 138, 46], true);

    return b.build({
      id: "broadside_plasma",
      no: "05",
      name: "舷側雙管電漿砲座",
      en: "BROADSIDE PLASMA SPONSON",
      shipClass: "戰列艦・舷側電漿砲",
      role: "裝設於艦側裝甲凸座・連射高溫電漿球融毀大型蟲艦",
      weaponStyle: "broadside_plasma",
      accentHex: "#ff7e38",
      fireColor: "#ff7828",
      coreColor: "#ffe078",
      pivotY: 1.98,
      muzzles: [[-0.62, 1.98, 4.18], [0.62, 1.98, 4.18]],
      cockpit: {
        theme: "plasma_sponson",
        frameCol: "#362c3d", frameHi: "#7d688a", trimCol: "#ff963c", hudCol: "#ffbe52",
        spaceTheme: "venus_nebula",
        barrelStyle: "broadside_plasma",
        controlType: "dual_handles",
        hullStyle: "broadside_flank",
      },
    });
  }

  // ==========================================================================
  // 06. CRUISER RAILGUN TURRET — 巡洋艦脊背軌道砲塔 (巡洋艦脊背・超長程穿甲狙擊)
  // ==========================================================================
  function buildSpinalRailgun() {
    const b = builder();
    b.addStarshipDeckBase([36, 48, 72], [68, 90, 124], [108, 198, 255], [96, 224, 255]);

    // Sleek Low-Profile Angular Cruiser Turret Breech
    b.setTag("yaw");
    b.addBox(0, 1.78, -0.42, 2.25, 1.24, 3.05, [52, 70, 102], false, 0.72, 0.78);
    b.addBox(0, 2.48, -0.82, 1.48, 0.46, 1.65, [76, 102, 142], false, 0.80, 0.85);
    b.addBox(0, 2.28, 0.56, 0.92, 0.36, 0.62, [118, 228, 255], true);

    b.setTag("pitch");
    b.addBox(0, 1.96, 0.95, 1.45, 0.82, 1.15, FED_HULL_MID);

    // Ultra-Long Split Twin Parallel Electromagnetic Accelerator Rails!
    b.setTag("barrel");
    // Left & right armored rail beams
    b.addBox(-0.42, 1.98, 3.25, 0.28, 0.54, 4.45, [116, 146, 184], false, 0.88, 0.82);
    b.addBox( 0.42, 1.98, 3.25, 0.28, 0.54, 4.45, [116, 146, 184], false, 0.88, 0.82);
    // Glowing inner electromagnetic induction coils!
    b.addBox(-0.22, 1.98, 3.28, 0.12, 0.34, 4.20, [92, 218, 255], true);
    b.addBox( 0.22, 1.98, 3.28, 0.12, 0.34, 4.20, [92, 218, 255], true);
    // 5 Transverse magnetic accelerator bridge clamps
    for (const rz of [1.65, 2.45, 3.25, 4.05, 4.85]) {
      b.addBox(0, 2.30, rz, 1.04, 0.14, 0.24, FED_GOLD);
      b.addBox(0, 1.66, rz, 1.04, 0.14, 0.24, FED_HULL_DARK);
    }

    b.setTag("core");
    b.addBox(0, 1.98, 1.45, 0.34, 0.34, 0.65, [168, 246, 255], true);

    b.setTag("radar");
    b.addBox(0, 2.86, -0.78, 0.56, 0.32, 0.82, [108, 198, 255], true);

    return b.build({
      id: "spinal_railgun",
      no: "06",
      name: "巡洋艦脊背軌道砲塔",
      en: "CRUISER RAILGUN TURRET",
      shipClass: "巡洋艦・脊背狙擊軌道砲",
      role: "雙軌電磁加速穿甲狙擊砲・瞬間貫穿蟲巢領主甲殼",
      weaponStyle: "railgun",
      accentHex: "#66c8ff",
      fireColor: "#7ad6ff",
      coreColor: "#d6f4ff",
      pivotY: 1.98,
      muzzles: [[0, 1.98, 5.45]],
      cockpit: {
        theme: "sniper_rail",
        frameCol: "#1a2438", frameHi: "#5474a8", trimCol: "#66c8ff", hudCol: "#82e2ff",
        spaceTheme: "deep_void",
        barrelStyle: "railgun",
        controlType: "sniper_yoke",
        hullStyle: "cruiser_spine",
      },
    });
  }

  // ==========================================================================
  // 07. PHOTON TORPEDO BATTERY — 星艦光子魚雷發射塔 (驅逐艦／航母・8聯裝魚雷塔)
  // ==========================================================================
  function buildPhotonTorpedoPod() {
    const b = builder();
    b.addStarshipDeckBase(FED_HULL_DARK, FED_HULL_MID, FED_GOLD, [88, 232, 255]);

    b.setTag("yaw");
    b.addBox(0, 1.65, 0, 2.35, 1.08, 2.25, FED_HULL_MID, false, 0.88, 0.92);
    // Center armored gunner command pod between twin torpedo racks!
    b.addBox(0, 2.32, 0.15, 1.08, 0.92, 1.55, FED_HULL_HI, false, 0.82, 0.85);
    b.addBox(0, 2.42, 0.88, 0.82, 0.44, 0.28, FED_GLASS, true);

    // Elevating 8-Cell Photon Torpedo Launcher Pods (4 left + 4 right!)
    b.setTag("pitch");
    for (const sx of [-1.22, 1.22]) {
      b.addBox(sx, 2.35, 0.35, 1.05, 1.18, 2.35, [58, 86, 126], false, 0.94, 0.96);
      b.addBox(sx, 2.98, 0.35, 0.96, 0.14, 2.15, FED_GOLD);
      // 4 Glowing Photon Torpedo Tube Warheads per pod!
      for (const ox of [-0.24, 0.24]) {
        for (const oy of [-0.26, 0.26]) {
          b.addCylZ(sx + ox, 2.35 + oy, 1.38, 1.72, 0.16, 0.10, 6, [255, 92, 108], true);
        }
      }
    }

    // Unfolding Armored Blast Doors on Top of Pods
    b.setTag("petal");
    b.addBox(-1.22, 3.06, 1.22, 0.98, 0.12, 0.55, FED_HULL_HI);
    b.addBox( 1.22, 3.06, 1.22, 0.98, 0.12, 0.55, FED_HULL_HI);

    // Rotating Tactical Target-Lock Phased Radar Bar
    b.setTag("radar");
    b.addCylY(0, 2.78, 3.22, 0.22, 0.18, 6, FED_GOLD);
    b.addBox(0, 3.36, 0, 1.72, 0.38, 0.22, FED_HULL_HI);
    b.addBox(0, 3.36, 0.12, 1.48, 0.22, 0.08, [96, 242, 255], true);

    return b.build({
      id: "photon_torpedo_pod",
      no: "07",
      name: "星艦光子魚雷發射塔",
      en: "PHOTON TORPEDO BATTERY",
      shipClass: "驅逐艦／航母・魚雷塔",
      role: "八聯裝光子追蹤魚雷發射器・自動多目標鎖定齊射",
      weaponStyle: "photon_torpedo",
      accentHex: "#ff667e",
      fireColor: "#ff5c74",
      coreColor: "#ffb8c4",
      pivotY: 2.35,
      muzzles: [[-1.22, 2.55, 1.75], [1.22, 2.55, 1.75]],
      cockpit: {
        theme: "torpedo_bay",
        frameCol: "#223452", frameHi: "#5c86b8", trimCol: "#ff667e", hudCol: "#5ef2ff",
        spaceTheme: "saturn_rings",
        barrelStyle: "torpedo_pods",
        controlType: "flight_stick",
        hullStyle: "destroyer_deck",
      },
    });
  }

  // ==========================================================================
  // 08. CARRIER SPACE FLAK QUAD — 航母破片防空砲塔 (航空母艦飛行甲板・四管破片網)
  // ==========================================================================
  function buildCarrierFlakQuad() {
    const b = builder();
    b.addStarshipDeckBase([54, 66, 84], [92, 108, 130], [236, 184, 58], [96, 232, 255]);

    // Heavy Carrier Flight-Deck Armored Flak Turret
    b.setTag("yaw");
    b.addBox(0, 1.85, -0.20, 2.75, 1.42, 2.55, [86, 102, 124], false, 0.82, 0.88);
    // Yellow/Gold flight-deck hazard stripes on turret shoulders!
    b.addBox(-1.38, 1.88, -0.15, 0.24, 0.56, 1.85, [242, 192, 56]);
    b.addBox( 1.38, 1.88, -0.15, 0.24, 0.56, 1.85, [242, 192, 56]);
    // Armored gunner cupola dome on top
    b.addBox(0, 2.66, -0.18, 1.42, 0.52, 1.32, FED_HULL_DARK, false, 0.78, 0.82);
    b.addBox(0, 2.68, 0.44, 1.02, 0.34, 0.28, [255, 214, 112], true);

    b.setTag("pitch");
    b.addBox(0, 2.02, 1.05, 2.25, 1.08, 0.72, FED_GUNMETAL);

    // Quad Heavy Flak Barrels (2x2 box formation, alternating L/R pairs!)
    b.setTag("barrelL");
    for (const py of [2.32, 1.72]) {
      b.addCylZ(-0.68, py, 0.95, 3.68, 0.20, 0.16, 6, FED_HULL_HI);
      b.addCylZ(-0.68, py, 3.55, 3.88, 0.24, 0.26, 6, [255, 168, 56], true); // Flared flak muzzle brake!
    }
    b.setTag("barrelR");
    for (const py of [2.32, 1.72]) {
      b.addCylZ(0.68, py, 0.95, 3.68, 0.20, 0.16, 6, FED_HULL_HI);
      b.addCylZ(0.68, py, 3.55, 3.88, 0.24, 0.26, 6, [255, 168, 56], true);
    }

    b.setTag("radar");
    b.addCylY(0, 2.92, 3.35, 0.20, 0.16, 6, FED_GOLD);
    b.addBox(0, 3.42, -0.18, 1.15, 0.24, 0.24, [242, 192, 56]);

    return b.build({
      id: "carrier_flak_quad",
      no: "08",
      name: "航母破片防空砲塔",
      en: "CARRIER SPACE FLAK QUAD",
      shipClass: "航空母艦・甲板防空砲",
      role: "四管重型宇宙高爆破片砲・在航母外圍織出反蟲群火網",
      weaponStyle: "space_flak",
      accentHex: "#ffaa44",
      fireColor: "#ff9933",
      coreColor: "#ffe28a",
      pivotY: 2.02,
      muzzles: [[-0.68, 2.32, 3.88], [0.68, 2.32, 3.88], [-0.68, 1.72, 3.88], [0.68, 1.72, 3.88]],
      cockpit: {
        theme: "flak_wall",
        frameCol: "#2e3642", frameHi: "#7c8b9e", trimCol: "#f2be38", hudCol: "#ffbe52",
        spaceTheme: "carrier_launch",
        barrelStyle: "quad_flak",
        controlType: "wheel_levers",
        hullStyle: "carrier_runway",
      },
    });
  }

  // ==========================================================================
  // 09. AEGIS ARC PROJECTOR — 神盾護盾電弧砲塔 (科學艦／主力艦・鏈狀電弧塔)
  // ==========================================================================
  function buildAegisArcTurret() {
    const b = builder();
    b.addStarshipDeckBase([42, 52, 86], [78, 96, 148], [164, 128, 255], [108, 246, 255]);

    b.setTag("yaw");
    b.addCylY(0, 1.12, 1.88, 1.56, 1.38, 8, [72, 92, 142]);
    // Golden-violet harmonic capacitor coils
    for (const s of [-1, 1]) {
      b.addCylYAt(s * 1.18, -0.35, 1.18, 2.45, 0.34, 0.28, 6, [156, 122, 245]);
      b.addCylYAt(s * 1.18, -0.35, 2.45, 2.75, 0.32, 0.22, 6, [112, 248, 255], true);
    }
    // Armored glass gunner dome
    b.addBox(0, 1.98, 0.78, 1.05, 0.62, 0.56, [148, 240, 255], true);

    b.setTag("pitch");
    b.addBox(0, 2.28, 0.25, 1.55, 0.72, 1.25, FED_HULL_MID);

    // Twin Crystalline Arc Emitter Prongs + Central Levitating Energy Core!
    b.setTag("barrel");
    b.addWing(-0.76, 2.28, 0.55, -0.96, 2.38, 3.65, -0.58, 2.34, 3.92, -0.46, 2.24, 0.65, 0.26, [214, 234, 255]);
    b.addWing( 0.76, 2.28, 0.55,  0.96, 2.38, 3.65,  0.58, 2.34, 3.92,  0.46, 2.24, 0.65, 0.26, [214, 234, 255]);
    // Glowing inner arc rails
    b.addBox(-0.62, 2.32, 2.35, 0.14, 0.18, 2.85, [118, 248, 255], true);
    b.addBox( 0.62, 2.32, 2.35, 0.14, 0.18, 2.85, [118, 248, 255], true);

    b.setTag("core");
    b.addSphere(0, 2.34, 2.35, 0.46, 0.46, 0.46, 6, 8, [138, 248, 255], true);
    b.addSphere(0, 2.34, 2.35, 0.24, 0.24, 0.24, 4, 6, [255, 255, 255], true);

    b.setTag("radar");
    // Floating rotating harmonic crystal prism on top
    b.addCylY(0, 2.72, 3.18, 0.18, 0.42, 4, [176, 134, 255], true);
    b.addCylY(0, 3.18, 3.62, 0.42, 0.06, 4, [128, 248, 255], true);

    return b.build({
      id: "aegis_arc_turret",
      no: "09",
      name: "神盾護盾電弧砲塔",
      en: "AEGIS ARC PROJECTOR",
      shipClass: "科學艦／主力艦・電弧塔",
      role: "雙叉晶體電弧投射砲・釋放連鎖高壓雷電並強化艦體護盾",
      weaponStyle: "aegis_arc",
      accentHex: "#b084ff",
      fireColor: "#9c72ff",
      coreColor: "#8ef8ff",
      pivotY: 2.34,
      muzzles: [[0, 2.34, 3.95]],
      cockpit: {
        theme: "aegis_prism",
        frameCol: "#26284a", frameHi: "#7478b8", trimCol: "#b488ff", hudCol: "#82f8ff",
        spaceTheme: "neptune_aurora",
        barrelStyle: "aegis_prongs",
        controlType: "gyro_yoke",
        hullStyle: "science_crystal",
      },
    });
  }

  // ==========================================================================
  // 10. YAMATO NOVA CITADEL — 大和超載旗艦巨砲塔 (主力艦旗艦・金翼終極巨砲)
  // ==========================================================================
  function buildYamatoNovaCitadel() {
    const b = builder();
    b.addStarshipDeckBase([34, 52, 86], [70, 102, 152], [244, 196, 68], [92, 248, 255]);

    // Royal Flagship Super-Turret Citadel (echoing 01. CAPITAL SHIP 主力艦 golden wings!)
    b.setTag("yaw");
    b.addCylY(0, 1.12, 1.88, 1.72, 1.56, 8, [54, 82, 128]);
    b.addBox(0, 2.08, -0.45, 2.48, 1.25, 2.55, [62, 94, 146], false, 0.82, 0.88);
    // Royal Gold Wing-Fin Shoulder Plates (Federation Flagship emblem!)
    b.addWing(-1.20, 2.35, -0.35, -2.55, 3.15, -1.35, -2.35, 2.95, 0.35, -1.15, 2.15, 0.45, 0.22, FED_GOLD);
    b.addWing( 1.20, 2.35, -0.35,  2.55, 3.15, -1.35,  2.35, 2.95, 0.35,  1.15, 2.15, 0.45, 0.22, FED_GOLD);
    // Panoramic Flagship Command Gunner Bridge Dome
    b.addBox(0, 2.86, 0.15, 1.38, 0.56, 1.12, FED_GLASS, true, 0.78, 0.80);

    b.setTag("pitch");
    b.addBox(0, 2.15, 0.85, 1.88, 1.05, 1.25, [54, 82, 128]);

    // Massive Central Yamato Nova Plasma Core Barrel!
    b.setTag("barrel");
    b.addCylZ(0, 2.18, 0.85, 4.45, 0.56, 0.48, 8, [48, 74, 118]);
    b.addCylZ(0, 2.18, 1.65, 2.05, 0.66, 0.64, 8, FED_GOLD);
    b.addCylZ(0, 2.18, 3.15, 3.48, 0.62, 0.60, 8, FED_GOLD);

    // 4 Unfolding Gilded Armor Accelerator Petals (bloom open during CHARGE & YAMATO FIRE!)
    b.setTag("petal");
    b.addBox( 0.00, 2.84, 2.75, 0.52, 0.24, 3.15, FED_GOLD, false, 0.88, 0.80);
    b.addBox( 0.00, 1.52, 2.75, 0.52, 0.24, 3.15, FED_GOLD, false, 0.88, 0.80);
    b.addBox(-0.74, 2.18, 2.75, 0.24, 0.52, 3.15, FED_HULL_HI, false, 0.88, 0.80);
    b.addBox( 0.74, 2.18, 2.75, 0.24, 0.52, 3.15, FED_HULL_HI, false, 0.88, 0.80);

    // Glowing Cyan-White Yamato Singularity Core at Muzzle!
    b.setTag("core");
    b.addSphere(0, 2.18, 4.35, 0.44, 0.44, 0.44, 6, 8, [106, 248, 255], true);
    b.addSphere(0, 2.18, 4.48, 0.24, 0.24, 0.24, 4, 6, [255, 255, 255], true);

    return b.build({
      id: "yamato_nova_citadel",
      no: "10",
      name: "大和超載旗艦巨砲塔",
      en: "YAMATO NOVA CITADEL",
      shipClass: "主力艦旗艦・終極聚能砲",
      role: "旗艦金翼展開式大和巨砲・蓄力釋放殲星級超載光束",
      weaponStyle: "yamato_nova",
      accentHex: "#ffe066",
      fireColor: "#5ef4ff",
      coreColor: "#fff29c",
      pivotY: 2.18,
      muzzles: [[0, 2.18, 4.65]],
      cockpit: {
        theme: "yamato_flagship",
        frameCol: "#1e3054", frameHi: "#5c88c4", trimCol: "#f5c644", hudCol: "#6cf6ff",
        spaceTheme: "earth_final_battle",
        barrelStyle: "yamato_petals",
        controlType: "citadel_yoke",
        hullStyle: "flagship_wings",
      },
    });
  }

  const TURRET_LIST = [
    buildQuadLaserDome(),
    buildTwinTurbolaser(),
    buildTripleMacroCannon(),
    buildPdCiwsRotary(),
    buildBroadsidePlasma(),
    buildSpinalRailgun(),
    buildPhotonTorpedoPod(),
    buildCarrierFlakQuad(),
    buildAegisArcTurret(),
    buildYamatoNovaCitadel(),
  ];

  const TURRET_BY_ID = {};
  for (const t of TURRET_LIST) TURRET_BY_ID[t.id] = t;

  // 8 Standard Starship Turret Action States
  const TURRET_ACTIONS = [
    { key: "standby",  zh: "甲板待機巡航", en: "DECK STANDBY",  desc: "砲塔鎖定於大型星艦甲板砲座，雷達與護盾能源待機掃描" },
    { key: "track",    zh: "360° 方位追蹤", en: "AZIMUTH TRACK", desc: "旋轉基座高速跟蹤敵方飛螳與太空蟲群，投射火控雷射線" },
    { key: "elevate",  zh: "高仰角太空鎖定", en: "HIGH ELEVATE", desc: "砲座大仰角上抬鎖定高軌道蟲巢領主與大型敵艦" },
    { key: "fire",     zh: "主砲齊射開火", en: "SALVO FIRE",    desc: "全砲口爆發火光、雷射／電漿／魚雷彈幕與砲管後座" },
    { key: "recoil",   zh: "重裝交替後座", en: "HEAVY RECOIL",  desc: "雙管／三管／四管交錯劇烈後座退殼、火控持續連射" },
    { key: "charge",   zh: "反應爐超載蓄能", en: "NOVA CHARGE",  desc: "金翼裝甲花瓣展開、星艦主反應爐能源匯聚砲口聚光球" },
    { key: "overheat", zh: "散熱排氣冷卻", en: "THERMAL VENT",  desc: "砲管赤紅過熱，甲板冷卻噴嘴排出大量真空散熱白煙" },
    { key: "damaged",  zh: "護盾受擊爆裂", en: "HULL IMPACT",   desc: "遭受蟲族強酸砲擊，護盾閃爍破裂、甲板火花與裝甲飛散" },
  ];

  // Shared 3D vertex transform for articulated starship turret animations!
  function transformTurretVerts(model, pose) {
    const yaw = pose.yaw || 0;
    const pitch = pose.pitch || 0;
    const recoilL = pose.recoilL || 0;
    const recoilR = pose.recoilR || 0;
    const recoilM = pose.recoilM || 0;
    const spinAngle = pose.spinAngle || 0;
    const radarAngle = pose.radarAngle || 0;
    const petalOpen = pose.petalOpen || 0;
    const corePulse = pose.corePulse || 0;
    const explode = pose.explode || 0;
    const shake = pose.shake || 0;

    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
    const cr = Math.cos(radarAngle), sr = Math.sin(radarAngle);
    const pivY = model.pivotY || 2.1;

    const sxOff = shake ? Math.sin(shake * 37.3) * 0.08 * shake : 0;
    const syOff = shake ? Math.cos(shake * 43.1) * 0.06 * shake : 0;

    const out = new Array(model.verts.length);
    for (let i = 0; i < model.verts.length; i++) {
      const tag = model.vTags[i];
      let x = model.verts[i][0];
      let y = model.verts[i][1];
      let z = model.verts[i][2];

      if (tag === "deck" || tag === "base") {
        out[i] = [x, y, z];
        continue;
      }

      if (tag === "radar") {
        const rx = x * cr - z * sr;
        const rz = x * sr + z * cr;
        x = rx; z = rz;
      }

      if (tag === "spinL" || tag === "spinR") {
        const cx = tag === "spinL" ? -1.12 : 1.12;
        const cySpin = pivY;
        const dx = x - cx, dy = y - cySpin;
        const ca = Math.cos(spinAngle * (tag === "spinL" ? 1 : -1));
        const sa = Math.sin(spinAngle * (tag === "spinL" ? 1 : -1));
        x = cx + dx * ca - dy * sa;
        y = cySpin + dx * sa + dy * ca;
      }

      if (tag === "petal" && petalOpen > 0) {
        const dy = y - pivY;
        x *= 1 + petalOpen * 0.42;
        y = pivY + dy * (1 + petalOpen * 0.45);
      }

      if (tag === "core" && corePulse > 0) {
        const dy = y - pivY;
        x *= 1 + corePulse * 0.32;
        y = pivY + dy * (1 + corePulse * 0.32);
      }

      if (tag === "barrel") {
        z -= Math.max(recoilL, recoilR) * 0.65;
      } else if (tag === "barrelL" || tag === "spinL") {
        z -= recoilL * 0.65;
      } else if (tag === "barrelR" || tag === "spinR") {
        z -= recoilR * 0.65;
      } else if (tag === "barrelM") {
        z -= recoilM * 0.72;
      }

      const elevates =
        tag === "pitch" || tag === "barrel" || tag === "barrelL" || tag === "barrelR" ||
        tag === "barrelM" || tag === "spinL" || tag === "spinR" || tag === "petal" ||
        (tag === "core" && (model.id === "aegis_arc_turret" || model.id === "yamato_nova_citadel"));

      if (elevates) {
        const ly = y - pivY;
        const ny = ly * cp - z * sp;
        const nz = ly * sp + z * cp;
        y = ny + pivY;
        z = nz;
      }

      // Rotate entire upper turret assembly around Y (azimuth)
      const wx = x * cy + z * sy;
      const wz = -x * sy + z * cy;
      x = wx + sxOff;
      z = wz;
      y += syOff;

      if (explode > 0) {
        const h1 = Math.sin(i * 12.9898) * 43758.5453;
        const h2 = Math.sin(i * 78.233) * 19341.231;
        const fx = (h1 - Math.floor(h1)) * 2 - 1;
        const fz = (h2 - Math.floor(h2)) * 2 - 1;
        x += fx * explode * 1.9;
        y += Math.abs(fx) * explode * 2.1;
        z += fz * explode * 1.9;
      }

      out[i] = [x, y, z];
    }
    return out;
  }

  function getMuzzleWorld(model, pose, muzzleIdx = 0) {
    const m = model.muzzles[muzzleIdx % model.muzzles.length] || [0, model.pivotY || 2.1, 3.8];
    const yaw = pose.yaw || 0;
    const pitch = pose.pitch || 0;
    const recoil = muzzleIdx === 1 ? (pose.recoilR || 0) : (muzzleIdx === 2 ? (pose.recoilM || pose.recoilL || 0) : (pose.recoilL || 0));
    const pivY = model.pivotY || 2.1;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(-pitch), sp = Math.sin(-pitch);

    const x = m[0];
    const ly = m[1] - pivY;
    const lz = m[2] - recoil * 0.65;
    const ny = ly * cp - lz * sp + pivY;
    const nz = ly * sp + lz * cp;
    return [x * cy + nz * sy, ny, -x * sy + nz * cy];
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
    root.CapitalTurretModels = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
