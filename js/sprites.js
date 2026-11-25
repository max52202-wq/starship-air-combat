// ============================================================================
// sprites.js — 8-Bit Pixel Sprite Loader & Automatic Transparency Cutout
// Loads all 9 custom Starships (assets/ships_8bit/) and all 10 custom Aerial
// Zerg sprites (assets/zerg_icons/), automatically removing dark navy ship
// backgrounds and stripping the shared hexagonal icon frame for in-flight 3D!
// ============================================================================

window.SpriteBank = (function () {
  const ships = {};       // key -> { canvas, flash, w, h, ready, src }
  const zergRaw = {};     // key -> HTMLImageElement (full hex icon for HUD/Bestiary)
  const zergCut = {};     // key -> { canvas, flash, w, h, ready }
  let zergBatchLoaded = 0;

  const SHIP_FILES = {
    capital_ship: "assets/ships_8bit/01_capital_ship.png",
    battleship: "assets/ships_8bit/02_battleship.png",
    cruiser: "assets/ships_8bit/03_cruiser.png",
    destroyer: "assets/ships_8bit/04_destroyer.png",
    frigate: "assets/ships_8bit/05_frigate.png",
    carrier: "assets/ships_8bit/06_carrier.png",
    science_ship: "assets/ships_8bit/07_science_ship.png",
    tiny_fighter: "assets/ships_8bit/08_tiny_fighter.png",
    stealth_vessel: "assets/ships_8bit/09_stealth_vessel.png",
  };

  const ZERG_FILES = {
    zerg_01: "assets/zerg_icons/01_larva_air.png",
    zerg_02: "assets/zerg_icons/02_zergling_air.png",
    zerg_03: "assets/zerg_icons/03_hydralisk_air.png",
    zerg_04: "assets/zerg_icons/04_roach_air.png",
    zerg_05: "assets/zerg_icons/05_mutalisk_air.png",
    zerg_06: "assets/zerg_icons/06_swarm_host_air.png",
    zerg_07: "assets/zerg_icons/07_ultralisk_air.png",
    zerg_08: "assets/zerg_icons/08_overlord_air.png",
    zerg_09: "assets/zerg_icons/09_infestor_air.png",
    zerg_10: "assets/zerg_icons/10_brood_lord_air.png",
  };

  const ZERG_ACTION_FILES = {
    zerg_01: "assets/zerg_actions/01_larva_actions.png",
    zerg_02: "assets/zerg_actions/02_zergling_actions.png",
    zerg_03: "assets/zerg_actions/03_hydralisk_actions.png",
    zerg_04: "assets/zerg_actions/04_roach_actions.png",
    zerg_05: "assets/zerg_actions/05_mutalisk_actions.png",
    zerg_06: "assets/zerg_actions/06_swarm_host_actions.png",
    zerg_07: "assets/zerg_actions/07_ultralisk_actions.png",
    zerg_08: "assets/zerg_actions/08_overlord_actions.png",
    zerg_09: "assets/zerg_actions/09_infestor_actions.png",
    zerg_10: "assets/zerg_actions/10_brood_lord_actions.png",
  };

  const ZERG_ACTION_INDEX = {
    move_up: 0,
    move_down: 1,
    shoot: 2,
    missile: 3,
    roll: 4,
    boost: 5,
    melee_dive: 6,
    shield_spawn: 7,
    hit: 8,
    death: 9,
  };

  const TURRET_ICON_FILES = {
    vulcan_gatling: "assets/turrets_8bit/icons/01_vulcan_gatling.png",
    twin_flak: "assets/turrets_8bit/icons/02_twin_flak.png",
    sam_missile: "assets/turrets_8bit/icons/03_sam_missile.png",
    prism_laser: "assets/turrets_8bit/icons/04_prism_laser.png",
    railgun_aa: "assets/turrets_8bit/icons/05_railgun_aa.png",
    tesla_coil: "assets/turrets_8bit/icons/06_tesla_coil.png",
    plasma_mortar: "assets/turrets_8bit/icons/07_plasma_mortar.png",
    emp_radar: "assets/turrets_8bit/icons/08_emp_radar.png",
    cryo_beam: "assets/turrets_8bit/icons/09_cryo_beam.png",
    orbital_ion: "assets/turrets_8bit/icons/10_orbital_ion.png",
  };

  const TURRET_ACTION_FILES = {
    vulcan_gatling: "assets/turrets_8bit/actions/01_vulcan_gatling_actions.png",
    twin_flak: "assets/turrets_8bit/actions/02_twin_flak_actions.png",
    sam_missile: "assets/turrets_8bit/actions/03_sam_missile_actions.png",
    prism_laser: "assets/turrets_8bit/actions/04_prism_laser_actions.png",
    railgun_aa: "assets/turrets_8bit/actions/05_railgun_aa_actions.png",
    tesla_coil: "assets/turrets_8bit/actions/06_tesla_coil_actions.png",
    plasma_mortar: "assets/turrets_8bit/actions/07_plasma_mortar_actions.png",
    emp_radar: "assets/turrets_8bit/actions/08_emp_radar_actions.png",
    cryo_beam: "assets/turrets_8bit/actions/09_cryo_beam_actions.png",
    orbital_ion: "assets/turrets_8bit/actions/10_orbital_ion_actions.png",
  };

  const TURRET_COCKPIT_FILES = {
    vulcan_gatling: "assets/turrets_8bit/cockpits/01_vulcan_gatling_cockpit.png",
    twin_flak: "assets/turrets_8bit/cockpits/02_twin_flak_cockpit.png",
    sam_missile: "assets/turrets_8bit/cockpits/03_sam_missile_cockpit.png",
    prism_laser: "assets/turrets_8bit/cockpits/04_prism_laser_cockpit.png",
    railgun_aa: "assets/turrets_8bit/cockpits/05_railgun_aa_cockpit.png",
    tesla_coil: "assets/turrets_8bit/cockpits/06_tesla_coil_cockpit.png",
    plasma_mortar: "assets/turrets_8bit/cockpits/07_plasma_mortar_cockpit.png",
    emp_radar: "assets/turrets_8bit/cockpits/08_emp_radar_cockpit.png",
    cryo_beam: "assets/turrets_8bit/cockpits/09_cryo_beam_cockpit.png",
    orbital_ion: "assets/turrets_8bit/cockpits/10_orbital_ion_cockpit.png",
  };

  const TURRET_ACTION_INDEX = {
    idle: 0,
    track: 1,
    elevate: 2,
    fire: 3,
    recoil: 4,
    charge: 5,
    overheat: 6,
    damaged: 7,
  };

  const zergSheets = {};  // key -> { img, frameW, frameH, frames, ready }

  function makeWhiteFlash(srcCanvas) {
    const fc = document.createElement("canvas");
    fc.width = srcCanvas.width;
    fc.height = srcCanvas.height;
    const fctx = fc.getContext("2d");
    fctx.drawImage(srcCanvas, 0, 0);
    fctx.globalCompositeOperation = "source-in";
    fctx.fillStyle = "#ffffff";
    fctx.fillRect(0, 0, fc.width, fc.height);
    return fc;
  }

  function cropTight(srcCanvas) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const ctx = srcCanvas.getContext("2d");
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return srcCanvas;
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(srcCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
    return out;
  }

  // Edge-connected flood-fill removal of dark navy background for assets/ships_8bit/*.png
  function processShipSprite(img) {
    const size = 128; // crisp pixel-art downscale from 512x512
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;

    // Sample corner background color
    const bgR = d[0], bgG = d[1], bgB = d[2];
    const visited = new Uint8Array(size * size);
    const queue = new Int32Array(size * size);
    let head = 0, tail = 0;

    function isBg(idx4) {
      if (d[idx4 + 3] < 20) return true;
      const dr = Math.abs(d[idx4] - bgR);
      const dg = Math.abs(d[idx4 + 1] - bgG);
      const db = Math.abs(d[idx4 + 2] - bgB);
      // Dark navy background tolerance (preserves crisp black outlines of ship hull!)
      return (dr + dg + db) < 42 && d[idx4] < 36 && d[idx4 + 1] < 44 && d[idx4 + 2] < 64;
    }

    function push(x, y) {
      const p = y * size + x;
      if (visited[p]) return;
      if (!isBg(p * 4)) return;
      visited[p] = 1;
      queue[tail++] = p;
    }

    for (let x = 0; x < size; x++) {
      push(x, 0);
      push(x, size - 1);
    }
    for (let y = 0; y < size; y++) {
      push(0, y);
      push(size - 1, y);
    }

    while (head < tail) {
      const p = queue[head++];
      d[p * 4 + 3] = 0;
      const x = p % size;
      const y = (p - x) / size;
      if (x > 0) push(x - 1, y);
      if (x < size - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < size - 1) push(x, y + 1);
    }

    ctx.putImageData(imgData, 0, 0);
    const cropped = cropTight(c);
    return {
      canvas: cropped,
      flash: makeWhiteFlash(cropped),
      w: cropped.width,
      h: cropped.height,
      ready: true,
    };
  }

  // Load transparent 3D volumetric 8-bit Zerg icons directly (zero hex frame to strip!)
  function processTransparentZerg(img) {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    const cropped = cropTight(c);
    return {
      canvas: cropped,
      flash: makeWhiteFlash(cropped),
      w: cropped.width,
      h: cropped.height,
      ready: true,
    };
  }

  function init() {
    // Load all 9 Starships
    for (const [k, src] of Object.entries(SHIP_FILES)) {
      ships[k] = { canvas: null, flash: null, w: 64, h: 64, ready: false, src };
      const img = new Image();
      img.onload = () => {
        try {
          ships[k] = { ...processShipSprite(img), src };
        } catch (err) {
          ships[k] = { canvas: img, flash: img, w: img.width, h: img.height, ready: true, src };
        }
      };
      img.src = src;
    }

    // Load all 10 3D Aerial Zerg icons (pure transparent PNGs)
    for (const [k, src] of Object.entries(ZERG_FILES)) {
      zergCut[k] = { canvas: null, flash: null, w: 80, h: 80, ready: false };
      const img = new Image();
      img.onload = () => {
        zergRaw[k] = img;
        try {
          zergCut[k] = processTransparentZerg(img);
        } catch (err) {
          zergCut[k] = { canvas: img, flash: img, w: img.width, h: img.height, ready: true };
        }
      };
      img.src = src;
    }

    // Load all 10 3D Zerg 10-Action animation sprite sheets (2400x240 -> 10 frames of 240x240)
    for (const [k, src] of Object.entries(ZERG_ACTION_FILES)) {
      zergSheets[k] = { img: null, frameW: 240, frameH: 240, frames: 10, ready: false, src };
      const simg = new Image();
      simg.onload = () => {
        const fw = Math.round(simg.width / 10);
        zergSheets[k] = { img: simg, frameW: fw, frameH: simg.height, frames: 10, ready: true, src };
      };
      simg.src = src;
    }
  }

  function getShip(key) {
    return ships[key] && ships[key].ready ? ships[key] : null;
  }

  function getZerg(key) {
    return zergCut[key] && zergCut[key].ready ? zergCut[key] : null;
  }

  function getZergAction(key, actionName) {
    const sh = zergSheets[key];
    if (sh && sh.ready && sh.img) {
      const idx = ZERG_ACTION_INDEX[actionName] ?? 0;
      return {
        canvas: sh.img,
        sx: idx * sh.frameW,
        sy: 0,
        sw: sh.frameW,
        sh: sh.frameH,
        w: sh.frameW,
        h: sh.frameH,
        flash: null,
        ready: true,
      };
    }
    return getZerg(key);
  }

  function getZergIcon(key) {
    return zergRaw[key] || null;
  }

  init();

  return {
    getShip,
    getZerg,
    getZergAction,
    getZergIcon,
    SHIP_FILES,
    ZERG_FILES,
    ZERG_ACTION_FILES,
    ZERG_ACTION_INDEX,
    TURRET_ICON_FILES,
    TURRET_ACTION_FILES,
    TURRET_COCKPIT_FILES,
    TURRET_ACTION_INDEX,
  };
})();
