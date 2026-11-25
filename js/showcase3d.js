// ============================================================================
// showcase3d.js — Interactive 3D Volumetric Starship Action Showcase
// Supports all 9 8-bit 3D Starships & 14 real-time combat/flight animations!
// ============================================================================

(function () {
  const {
    v3, add, sub, scale, dot, cross, len, norm, lerp, lerpV3, clamp,
    qIdentity, qFromAxisAngle, qMul, qNorm, qBasis, qLookAt, qSlerp,
  } = window.M3;

  const canvas = document.getElementById("stage-canvas");
  const ctx = canvas.getContext("2d");

  const shipListEl = document.getElementById("ship-list");
  const shipPolyCountEl = document.getElementById("ship-poly-count");
  const abNameEl = document.getElementById("ab-name");
  const abSubEl = document.getElementById("ab-sub");
  const hudTitleEl = document.getElementById("hud-ship-title");
  const hudDescEl = document.getElementById("hud-ship-desc");
  const hudStatsEl = document.getElementById("hud-stats");
  const hudSigEl = document.getElementById("hud-ship-sig");
  const sigBtnDescEl = document.getElementById("sig-btn-desc");

  const btnCamOrbit = document.getElementById("btn-cam-orbit");
  const btnCamChase = document.getElementById("btn-cam-chase");
  const btnCamCine = document.getElementById("btn-cam-cine");
  const btnStyleSolid = document.getElementById("btn-style-solid");
  const btnStyleWire = document.getElementById("btn-style-wire");
  const btnGrid = document.getElementById("btn-grid");
  const btnTarget = document.getElementById("btn-target");
  const btnMute = document.getElementById("btn-mute");
  const btnDemo = document.getElementById("btn-demo");
  const btnReset = document.getElementById("btn-reset");

  const SUN_DIR = norm(v3(0.58, 0.65, 0.48));
  const TAN_HALF_FOV = Math.tan((54 * Math.PI) / 360);

  // Ordered 01..09 fleet list for the showcase
  const ORDERED_IDS = [
    "capital_ship",
    "battleship",
    "cruiser",
    "destroyer",
    "frigate",
    "carrier",
    "science_ship",
    "tiny_fighter",
    "stealth_vessel",
  ];

  // Crisp pixel resolution
  let pixW = 540;
  let pixH = 340;
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const aspect = Math.max(0.7, Math.min(2.4, rect.width / Math.max(1, rect.height)));
    pixH = Math.min(360, Math.max(240, Math.round(rect.height * 0.56)));
    pixW = Math.round(pixH * aspect);
    canvas.width = pixW;
    canvas.height = pixH;
  }
  window.addEventListener("resize", resize);
  resize();

  // Starfield in 3D space (streaks during Warp Boost!)
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 110,
      z: (Math.random() - 0.5) * 180,
      c: i % 5 === 0 ? "#8cf4ff" : (i % 7 === 0 ? "#ffe79a" : "#cfe6ff"),
      s: i % 6 === 0 ? 2 : 1,
    });
  }

  // State
  let selectedId = "capital_ship";
  let currentModel = window.Models.getStarship(selectedId);
  let currentSpec = window.SolarMissions.getShipById(selectedId);

  let camMode = "orbit"; // "orbit" | "chase" | "cine"
  let wireframe = false;
  let showGrid = true;
  let showTarget = true;
  let demoMode = false;
  let demoIdx = 0;
  let demoTimer = 0;

  // Orbit camera angles
  let orbitYaw = -0.68;
  let orbitPitch = 0.34;
  let orbitDist = 14.5;
  let dragging = false;
  let lastMouse = { x: 0, y: 0 };

  const keys = {};
  let time = 0;

  // Main Ship Live Transform & Action State
  const ship = {
    pos: v3(0, 0, 0),
    quat: qIdentity(),
    basis: qBasis(qIdentity()),
    hitFlash: 0,
    thrusterFlame: 0.75,
    trailL: [],
    trailR: [],
    trailTimer: 0,
    act: {
      recoil: 0,
      muzzleFlash: 0,
      boost: 0,
      brake: 0,
      bayOpen: 0,
      cloak: 0,
      shield: 0,
      charge: 0,
      beamAlpha: 0,
      beamLen: 85,
      overdrive: 0,
      explodeProg: 0,
    },
  };

  // Active Action Sequencer
  let activeAction = "idle";
  let actionTime = 0;
  let actionDuration = 0;
  let laserBurstTimer = 0;
  let missileBurstTimer = 0;
  let flareBurstTimer = 0;
  let beamFired = false;
  let rollDir = 1;

  // Dynamic Scene Lists
  let projectiles = [];
  let particles = [];
  let rings = [];
  let ghosts = []; // 3D afterimage silhouettes
  let drones = []; // Mini escort fighters launched by Carrier overdrive or Stealth clones!

  // Live 3D Target Drone hovering ahead
  const targetDrone = {
    pos: v3(0, 0.8, 34),
    baseZ: 34,
    hp: 100,
    maxHp: 100,
    alive: true,
    respawnTimer: 0,
    hitFlash: 0,
    stunTimer: 0,
  };

  const ACTION_META = {
    idle: { name: "待機巡航懸浮（IDLE CRUISE）", sub: "滑鼠拖曳可 360° 旋轉鑑賞 3D 艦體・右側點選或按快捷鍵觸發 14 種動作" },
    move: { name: "✈ 移動蛇行機動（EVASIVE FLIGHT）", sub: "3D 壓坡傾斜、俯仰爬升與雙翼離子軌跡展示" },
    laser: { name: "⚡ 脈衝雷射連射（PULSE LASER SALVO）", sub: "全武器掛點連發雷射＋砲口火光＋3D 砲管後座力震動" },
    missile: { name: "🚀 追蹤電漿飛彈齊射（HOMING MISSILES）", sub: "開啟 3D 飛彈彈艙，發射曲線導引飛彈鎖定並轟炸靶機！" },
    roll: { name: "🌀 360° 桶滾翻滾閃避（BARREL ROLL）", sub: "高速 360° 橫滾翻轉＋橫向閃避位移＋半透明 3D 殘影" },
    boost: { name: "🔥 曲速後燃加速（WARP AFTERBURNER）", sub: "全引擎超載電漿長尾焰＋雙翼氣動後掠＋3D 音爆衝擊環" },
    uturn: { name: "↩ 180° 戰術大迴轉（IMMELMANN U-TURN）", sub: "高 G 垂直半筋斗翻轉反咬敵機＋金青旋渦尾跡" },
    brake: { name: "⏹ 逆噴急煞＆側滑甩尾（RETRO-BRAKE DRIFT）", sub: "艦艏逆向噴嘴點火急煞，機頭高速側滑鎖敵" },
    shield: { name: "🛡 3D 能量護盾穹頂（AEGIS SHIELD DOME）", sub: "展開旋轉 3D 多面體能量防護罩並吸收反彈衝擊" },
    beam: { name: "☄ 集氣超載主砲（CHARGED NOVA BEAM）", sub: "艦艏核心蓄能聚光→射出貫穿式超粗高能光束！" },
    cloak: { name: "👻 光學匿蹤／相位閃現（PHASE CLOAK & BLINK）", sub: "進入全息匿蹤模式並觸發多段殘影短距相位瞬移" },
    emp: { name: "📡 EMP 電磁脈衝震波（EMP SHOCKWAVE）", sub: "向四周釋放 3D 擴散電磁震波環，瞬間癱瘓敵方靶機" },
    flare: { name: "✨ 熱焰干擾誘餌彈（CHAFF / FLARES）", sub: "自艦尾雙側拋射金色誘餌彈幕偏折敵方追蹤導彈" },
    damage: { name: "💥 受擊護盾＆解體重組（EXPLODE & REBUILD）", sub: "展示受擊閃爍→3D 裝甲爆裂解體→奈米磁力重組特效！" },
    overdrive: { name: "★ 艦種專屬特技展開（SIGNATURE OVERDRIVE）", sub: "" },
  };

  function toWorldShip(lx, ly, lz) {
    const b = ship.basis;
    return {
      x: ship.pos.x + b.right.x * lx + b.up.x * ly + b.fwd.x * lz,
      y: ship.pos.y + b.right.y * lx + b.up.y * ly + b.fwd.y * lz,
      z: ship.pos.z + b.right.z * lx + b.up.z * ly + b.fwd.z * lz,
    };
  }

  function setBanner(actKey) {
    const meta = ACTION_META[actKey] || ACTION_META.idle;
    abNameEl.textContent = actKey === "overdrive"
      ? `★ ${currentModel.signatureName}`
      : meta.name;
    abSubEl.textContent = actKey === "overdrive"
      ? currentModel.signatureDesc
      : meta.sub;
    document.querySelectorAll(".act-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-act") === actKey);
    });
  }

  function spawnExplosion(pos, big, palette) {
    const cols = palette || (big
      ? ["#ffffff", "#ffe875", "#ff9f1c", "#ff4757", "#6cf4ff"]
      : ["#ffffff", "#ffe66d", "#ff7f50", "#5ef2ff"]);
    const count = big ? 32 : 14;
    for (let i = 0; i < count; i++) {
      const d = norm(v3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1));
      const spd = (big ? 12 : 6) + Math.random() * (big ? 28 : 14);
      particles.push({
        pos: { ...pos },
        vel: scale(d, spd),
        life: (big ? 0.65 : 0.35) + Math.random() * 0.35,
        maxLife: 1.0,
        size: (big ? 2.4 : 1.2) + Math.random() * 1.8,
        color: cols[Math.floor(Math.random() * cols.length)],
        ring: big && i < 3,
      });
    }
    window.SFX.playExplosion(big);
  }

  function addRing(pos, axisA, axisB, startR, growSpd, life, color, width = 2) {
    rings.push({
      pos: { ...pos },
      axisA: norm(axisA),
      axisB: norm(axisB),
      radius: startR,
      growSpd,
      life,
      maxLife: life,
      color,
      width,
    });
  }

  function fireLasers() {
    const hp = currentModel.hardpoints;
    const points = (hp && hp.lasers) || [[-1.5, 0, 2.2], [1.5, 0, 2.2]];
    ship.act.recoil = 1.0;
    ship.act.muzzleFlash = 1.0;
    const col = currentModel.beamColor || "#44f8ff";
    const core = currentModel.beamCore || "#ffffff";

    for (let i = 0; i < points.length; i++) {
      const lp = points[i];
      const muzzle = toWorldShip(lp[0], lp[1], lp[2]);
      let dir = { ...ship.basis.fwd };
      if (showTarget && targetDrone.alive) {
        const toT = norm(sub(targetDrone.pos, muzzle));
        if (dot(toT, ship.basis.fwd) > 0.72) dir = toT;
      }
      projectiles.push({
        pos: muzzle,
        dir,
        speed: 98,
        life: 1.1,
        isMissile: false,
        damage: 10,
        color: col,
        coreColor: core,
        tailLen: 4.5,
      });
    }
    window.SFX.playLaser(false);
  }

  function fireMissiles() {
    const hp = currentModel.hardpoints;
    const bays = (hp && hp.missiles) || [[-0.8, -0.4, 1.0], [0.8, -0.4, 1.0]];
    ship.act.bayOpen = 1.0;
    for (let i = 0; i < bays.length; i++) {
      const bp = bays[i];
      const muzzle = toWorldShip(bp[0], bp[1], bp[2]);
      const sideKick = (bp[0] >= 0 ? 1 : -1) * 0.42;
      const upKick = (i % 2 === 0 ? 0.25 : -0.18);
      const dir = norm(add(
        ship.basis.fwd,
        add(scale(ship.basis.right, sideKick), scale(ship.basis.up, upKick))
      ));
      projectiles.push({
        pos: muzzle,
        dir,
        speed: 44,
        life: 3.0,
        isMissile: true,
        target: showTarget && targetDrone.alive ? targetDrone : null,
        damage: 28,
        color: "#ffbe0b",
        coreColor: "#ffffff",
      });
    }
    window.SFX.playMissile();
  }

  function launchFlares() {
    const hp = currentModel.hardpoints;
    const ports = (hp && hp.flarePorts) || [[-1.0, -0.2, -1.8], [1.0, -0.2, -1.8]];
    for (let i = 0; i < ports.length; i++) {
      const fp = ports[i];
      const origin = toWorldShip(fp[0], fp[1], fp[2]);
      const side = fp[0] >= 0 ? 1 : -1;
      for (let k = 0; k < 2; k++) {
        const vel = add(
          scale(ship.basis.right, side * (8 + Math.random() * 8)),
          add(scale(ship.basis.up, -4 + (Math.random() - 0.5) * 6), scale(ship.basis.fwd, -10 - Math.random() * 6))
        );
        particles.push({
          pos: { ...origin },
          vel,
          life: 1.15 + Math.random() * 0.4,
          maxLife: 1.5,
          size: 1.9,
          color: k === 0 ? "#fff3a6" : "#ff9f1c",
          flare: true,
        });
      }
    }
  }

  function triggerAction(actKey, keepDemo = false) {
    if (!keepDemo && demoMode) {
      demoMode = false;
      btnDemo.classList.remove("active");
      btnDemo.textContent = "▶ 全動作自動連播";
    }
    window.SFX.ensure();

    activeAction = actKey;
    actionTime = 0;
    laserBurstTimer = 0;
    missileBurstTimer = 0;
    flareBurstTimer = 0;
    beamFired = false;
    ship.act.explodeProg = 0;
    drones = [];

    if (actKey === "idle") {
      actionDuration = 0;
      ship.act.cloak = 0;
      ship.act.shield = 0;
      ship.act.boost = 0;
      ship.act.brake = 0;
      ship.act.charge = 0;
      ship.act.beamAlpha = 0;
      ship.act.overdrive = 0;
      setBanner("idle");
      return;
    }

    const durations = {
      move: 4.0,
      laser: 2.4,
      missile: 2.5,
      roll: 1.35,
      boost: 3.0,
      uturn: 1.85,
      brake: 2.3,
      shield: 3.0,
      beam: 2.6,
      cloak: 3.2,
      emp: 2.0,
      flare: 2.2,
      damage: 3.2,
      overdrive: 3.6,
    };
    actionDuration = durations[actKey] || 2.5;
    setBanner(actKey);

    if (actKey === "roll") {
      rollDir = -rollDir;
      window.SFX.playBarrelRoll();
    } else if (actKey === "boost") {
      window.SFX.playMissile();
      addRing(ship.pos, ship.basis.right, ship.basis.up, 2.0, 22, 0.55, "#66f7ff", 3);
    } else if (actKey === "uturn") {
      window.SFX.playUTurn();
    } else if (actKey === "brake") {
      window.SFX.playBrake();
    } else if (actKey === "shield") {
      window.SFX.playShield();
      addRing(ship.pos, ship.basis.right, ship.basis.fwd, 2.5, 18, 0.55, "#6cf7ff", 2);
    } else if (actKey === "beam") {
      window.SFX.playCharge();
    } else if (actKey === "cloak") {
      window.SFX.playCloak();
      ghosts.push({ pos: { ...ship.pos }, basis: { ...ship.basis }, life: 0.7, maxLife: 0.7 });
    } else if (actKey === "emp") {
      window.SFX.playEMP();
      addRing(ship.pos, v3(1, 0, 0), v3(0, 0, 1), 2.2, 34, 0.95, "#5ef2ff", 3);
      addRing(ship.pos, v3(1, 0, 0), v3(0, 1, 0), 2.2, 30, 0.85, "#b872ff", 2);
      addRing(ship.pos, v3(0, 1, 0), v3(0, 0, 1), 2.2, 28, 0.85, "#ffffff", 2);
      if (showTarget && targetDrone.alive) {
        targetDrone.stunTimer = 2.0;
        targetDrone.hitFlash = 1.0;
      }
    } else if (actKey === "flare") {
      window.SFX.playFlare();
      launchFlares();
    } else if (actKey === "damage") {
      ship.hitFlash = 1.0;
      window.SFX.playHit();
    } else if (actKey === "overdrive") {
      window.SFX.playOverdrive();
      addRing(ship.pos, ship.basis.right, ship.basis.up, 2.2, 22, 0.75, currentModel.beamColor || "#ffe066", 3);
      // Carrier deploys 4 mini 3D Tiny Fighters! Stealth spawns 2 shadow wing-clones!
      if (selectedId === "carrier") {
        for (let i = 0; i < 4; i++) {
          drones.push({
            model: window.Models.getStarship("tiny_fighter"),
            angle: (i / 4) * Math.PI * 2,
            dist: 5.5 + (i % 2) * 1.8,
            yOff: (i % 2 === 0 ? 1.5 : -1.2),
            scale: 0.36,
            fireCD: 0.25 + i * 0.15,
            ghost: false,
          });
        }
      } else if (selectedId === "stealth_vessel") {
        for (const s of [-1, 1]) {
          drones.push({
            model: currentModel,
            side: s,
            scale: 0.88,
            fireCD: 0.22,
            ghost: true,
          });
        }
      }
    }
  }

  function selectShip(id) {
    selectedId = id;
    currentModel = window.Models.getStarship(id);
    currentSpec = window.SolarMissions.getShipById(id);

    shipPolyCountEl.textContent = `${currentModel.faces.length} 面`;
    hudTitleEl.textContent = `${currentSpec.no}. ${currentSpec.name} · ${currentSpec.en}`;
    hudDescEl.textContent = currentSpec.desc;
    hudStatsEl.innerHTML = `
      <span>護盾 <strong>${currentSpec.shield}</strong></span>
      <span>裝甲 <strong>${currentSpec.hp}</strong></span>
      <span>火力 <strong>${currentSpec.laserDmg}</strong></span>
      <span>極速 <strong>${currentSpec.boostSpeed}</strong></span>
      <span>飛彈 <strong>${currentSpec.missiles}發</strong></span>
    `;
    hudSigEl.textContent = `★ 專屬特技【${currentModel.signatureName}】：${currentModel.signatureDesc}`;
    sigBtnDescEl.textContent = `${currentModel.signatureName} — ${currentModel.signatureDesc}`;

    ship.trailL = [];
    ship.trailR = [];
    drones = [];
    projectiles = [];
    ghosts = [];

    document.querySelectorAll(".ship-item").forEach((el) => {
      el.classList.toggle("selected", el.getAttribute("data-id") === id);
    });
    if (activeAction === "overdrive") setBanner("overdrive");
  }

  function buildRosterUI() {
    shipListEl.innerHTML = "";
    ORDERED_IDS.forEach((id) => {
      const sp = window.SolarMissions.getShipById(id);
      const item = document.createElement("div");
      item.className = "ship-item" + (id === selectedId ? " selected" : "");
      item.setAttribute("data-id", id);
      item.innerHTML = `
        <img src="${sp.icon}" alt="${sp.name}" />
        <div class="ship-item-info">
          <div class="ship-item-no">${sp.no}. ${sp.en}</div>
          <div class="ship-item-name">${sp.name}</div>
          <div class="ship-item-role">${sp.role}</div>
        </div>
      `;
      item.addEventListener("click", () => {
        window.SFX.ensure();
        window.SFX.playLockBeep();
        selectShip(id);
      });
      shipListEl.appendChild(item);
    });
  }

  // ---- Input & UI Bindings ----
  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    window.SFX.ensure();
  });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    orbitYaw -= dx * 0.011;
    orbitPitch = clamp(orbitPitch + dy * 0.009, -1.2, 1.2);
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    orbitDist = clamp(orbitDist + e.deltaY * 0.012, 7.5, 28);
  }, { passive: false });

  // Touch drag support
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      dragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });
  canvas.addEventListener("touchmove", (e) => {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - lastMouse.x;
    const dy = e.touches[0].clientY - lastMouse.y;
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    orbitYaw -= dx * 0.012;
    orbitPitch = clamp(orbitPitch + dy * 0.01, -1.2, 1.2);
  }, { passive: false });
  canvas.addEventListener("touchend", () => { dragging = false; });

  document.querySelectorAll(".act-btn").forEach((btn) => {
    btn.addEventListener("click", () => triggerAction(btn.getAttribute("data-act")));
  });

  function setCamMode(mode) {
    camMode = mode;
    btnCamOrbit.classList.toggle("active", mode === "orbit");
    btnCamChase.classList.toggle("active", mode === "chase");
    btnCamCine.classList.toggle("active", mode === "cine");
  }
  btnCamOrbit.addEventListener("click", () => setCamMode("orbit"));
  btnCamChase.addEventListener("click", () => setCamMode("chase"));
  btnCamCine.addEventListener("click", () => setCamMode("cine"));

  btnStyleSolid.addEventListener("click", () => {
    wireframe = false;
    btnStyleSolid.classList.add("active");
    btnStyleWire.classList.remove("active");
  });
  btnStyleWire.addEventListener("click", () => {
    wireframe = true;
    btnStyleWire.classList.add("active");
    btnStyleSolid.classList.remove("active");
  });

  btnGrid.addEventListener("click", () => {
    showGrid = !showGrid;
    btnGrid.classList.toggle("active", showGrid);
  });
  btnTarget.addEventListener("click", () => {
    showTarget = !showTarget;
    btnTarget.classList.toggle("active", showTarget);
    btnTarget.textContent = showTarget ? "◎ 靶機：開" : "◎ 靶機：關";
  });
  btnMute.addEventListener("click", () => {
    const m = !window.SFX.isMuted();
    window.SFX.setMuted(m);
    btnMute.textContent = m ? "🔇 音效：關" : "🔊 音效：開";
  });

  const DEMO_SEQUENCE = [
    "move", "laser", "missile", "roll", "boost",
    "uturn", "brake", "shield", "beam", "cloak",
    "emp", "flare", "overdrive", "damage",
  ];
  btnDemo.addEventListener("click", () => {
    demoMode = !demoMode;
    btnDemo.classList.toggle("active", demoMode);
    btnDemo.textContent = demoMode ? "⏹ 停止自動連播" : "▶ 全動作自動連播";
    if (demoMode) {
      demoIdx = 0;
      demoTimer = 0;
      triggerAction(DEMO_SEQUENCE[0], true);
    }
  });
  btnReset.addEventListener("click", () => {
    demoMode = false;
    btnDemo.classList.remove("active");
    btnDemo.textContent = "▶ 全動作自動連播";
    ship.pos = v3(0, 0, 0);
    ship.quat = qIdentity();
    orbitYaw = -0.68;
    orbitPitch = 0.34;
    orbitDist = 14.5;
    triggerAction("idle");
  });

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Digit1") triggerAction("move");
    else if (e.code === "Digit2" || e.code === "Space") triggerAction("laser");
    else if (e.code === "Digit3" || e.code === "KeyF") triggerAction("missile");
    else if (e.code === "Digit4" || e.code === "KeyB") triggerAction("roll");
    else if (e.code === "Digit5" || e.code === "ShiftLeft" || e.code === "ShiftRight") triggerAction("boost");
    else if (e.code === "Digit6" || e.code === "KeyZ") triggerAction("uturn");
    else if (e.code === "Digit7" || e.code === "KeyX") triggerAction("brake");
    else if (e.code === "Digit8" || e.code === "KeyG") triggerAction("shield");
    else if (e.code === "Digit9" || e.code === "KeyT") triggerAction("beam");
    else if (e.code === "Digit0" || e.code === "KeyH") triggerAction("cloak");
    else if (e.code === "KeyU") triggerAction("emp");
    else if (e.code === "KeyJ") triggerAction("flare");
    else if (e.code === "KeyK") triggerAction("overdrive");
    else if (e.code === "KeyL") triggerAction("damage");
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // ---- Main Simulation & Render Loop ----
  let lastT = performance.now();

  function update(dt) {
    time += dt;
    ship.hitFlash = Math.max(0, ship.hitFlash - dt * 3.8);
    ship.act.recoil = Math.max(0, ship.act.recoil - dt * 6.5);
    ship.act.muzzleFlash = Math.max(0, ship.act.muzzleFlash - dt * 9.0);
    ship.act.bayOpen = Math.max(0, ship.act.bayOpen - dt * 1.4);

    // Smoothly decay transient states unless actively driven
    if (activeAction !== "boost") ship.act.boost = Math.max(0, ship.act.boost - dt * 2.5);
    if (activeAction !== "brake") ship.act.brake = Math.max(0, ship.act.brake - dt * 2.5);
    if (activeAction !== "shield" && activeAction !== "damage") ship.act.shield = Math.max(0, ship.act.shield - dt * 2.2);
    if (activeAction !== "cloak") ship.act.cloak = Math.max(0, ship.act.cloak - dt * 2.2);
    if (activeAction !== "beam") {
      ship.act.charge = Math.max(0, ship.act.charge - dt * 3.5);
      ship.act.beamAlpha = Math.max(0, ship.act.beamAlpha - dt * 4.5);
    }
    if (activeAction !== "overdrive") ship.act.overdrive = Math.max(0, ship.act.overdrive - dt * 2.0);
    if (activeAction !== "damage") ship.act.explodeProg = Math.max(0, ship.act.explodeProg - dt * 3.0);

    // Base hover position & manual WASD attitude control
    let targetPos = v3(0, Math.sin(time * 2.0) * 0.35, 0);
    let pitch = Math.sin(time * 1.3) * 0.04;
    let yaw = 0;
    let roll = Math.sin(time * 1.1) * 0.06;
    let flame = 0.72;

    if (keys["KeyW"] || keys["ArrowUp"]) pitch -= 0.38;
    if (keys["KeyS"] || keys["ArrowDown"]) pitch += 0.38;
    if (keys["KeyA"] || keys["ArrowLeft"]) { yaw -= 0.45; roll += 0.55; targetPos.x -= 2.4; }
    if (keys["KeyD"] || keys["ArrowRight"]) { yaw += 0.45; roll -= 0.55; targetPos.x += 2.4; }

    // Drive active showcase maneuver
    if (activeAction !== "idle") {
      actionTime += dt;
      const u = clamp(actionTime / Math.max(0.1, actionDuration), 0, 1);

      if (activeAction === "move") {
        const w = u * Math.PI * 2;
        targetPos.x = Math.sin(w) * 4.6;
        targetPos.y = Math.sin(w * 2) * 1.5;
        targetPos.z = Math.cos(w) * 1.8;
        roll = -Math.cos(w) * 0.68;
        pitch = -Math.cos(w * 2) * 0.25;
        yaw = Math.cos(w) * 0.28;
        flame = 1.05;
      } else if (activeAction === "laser") {
        targetPos.x = Math.sin(actionTime * 3.5) * 1.1;
        roll = -Math.cos(actionTime * 3.5) * 0.16;
        laserBurstTimer -= dt;
        if (laserBurstTimer <= 0 && u < 0.88) {
          laserBurstTimer = 0.14;
          fireLasers();
        }
      } else if (activeAction === "missile") {
        ship.act.bayOpen = Math.sin(Math.min(1, u * 1.4) * Math.PI);
        pitch = -0.14 * Math.sin(u * Math.PI);
        missileBurstTimer -= dt;
        if (missileBurstTimer <= 0 && u < 0.65) {
          missileBurstTimer = 0.58;
          fireMissiles();
        }
      } else if (activeAction === "roll") {
        const smooth = u * u * (3 - 2 * u);
        roll = rollDir * smooth * Math.PI * 2;
        targetPos.x = rollDir * Math.sin(u * Math.PI) * 4.2;
        targetPos.y = Math.sin(u * Math.PI * 2) * 0.6;
        flame = 1.25;
        if (Math.random() < 0.5) {
          ghosts.push({ pos: { ...ship.pos }, basis: { ...ship.basis }, life: 0.35, maxLife: 0.35 });
        }
      } else if (activeAction === "boost") {
        const env = Math.sin(u * Math.PI);
        ship.act.boost = clamp(env * 1.35, 0, 1);
        targetPos.z = env * 3.2;
        targetPos.y = (Math.random() - 0.5) * 0.14 * ship.act.boost;
        targetPos.x = (Math.random() - 0.5) * 0.14 * ship.act.boost;
        flame = 2.4;
        if (Math.random() < 0.16) {
          addRing(ship.pos, ship.basis.right, ship.basis.up, 1.8, 20, 0.42, "rgba(110,245,255,0.7)", 2);
        }
      } else if (activeAction === "uturn") {
        // Vertical 180° Immelmann flip + leveling return
        const s = u < 0.65 ? (u / 0.65) : 1;
        const loop = s * Math.PI * 2;
        pitch = -loop;
        roll = Math.sin(u * Math.PI) * 1.1;
        targetPos.y = Math.sin(s * Math.PI) * 4.2;
        targetPos.z = Math.sin(s * Math.PI * 2) * 2.4;
        flame = 1.65;
      } else if (activeAction === "brake") {
        const env = Math.sin(u * Math.PI);
        ship.act.brake = env;
        targetPos.z = -env * 2.6;
        yaw = env * 0.72;
        pitch = -env * 0.22;
        roll = env * 0.38;
        flame = 0.2;
      } else if (activeAction === "shield") {
        ship.act.shield = Math.min(1, Math.sin(u * Math.PI) * 1.5);
        if (Math.abs(u - 0.42) < 0.04 || Math.abs(u - 0.68) < 0.04) {
          ship.hitFlash = 0.75;
          window.SFX.playHit();
        }
      } else if (activeAction === "beam") {
        if (u < 0.35) {
          ship.act.charge = u / 0.35;
          ship.act.beamAlpha = 0;
          targetPos.z = -(u / 0.35) * 0.9;
        } else {
          if (!beamFired) {
            beamFired = true;
            window.SFX.playNovaBeam();
            addRing(toWorldShip(0, 0, 3.8), ship.basis.right, ship.basis.up, 1.2, 18, 0.48, currentModel.beamColor || "#64f4ff", 3);
          }
          ship.act.charge = Math.max(0, 1 - (u - 0.35) * 2.5);
          ship.act.beamAlpha = Math.sin(((u - 0.35) / 0.65) * Math.PI) * 1.2;
          targetPos.z = -1.2 * ship.act.beamAlpha;
          targetPos.x = (Math.random() - 0.5) * 0.18;
          if (showTarget && targetDrone.alive && Math.random() < 0.4) {
            targetDrone.hitFlash = 1.0;
            targetDrone.hp -= 12;
            if (targetDrone.hp <= 0) {
              targetDrone.alive = false;
              targetDrone.respawnTimer = 1.8;
              spawnExplosion(targetDrone.pos, true);
            }
          }
        }
      } else if (activeAction === "cloak") {
        ship.act.cloak = Math.sin(u * Math.PI) * 1.3;
        // Phase blink lateral teleport mid-way!
        if (u > 0.32 && u < 0.68) {
          if (Math.abs(u - 0.34) < 0.03) {
            ghosts.push({ pos: { ...ship.pos }, basis: { ...ship.basis }, life: 0.65, maxLife: 0.65 });
            window.SFX.playCloak();
          }
          targetPos.x = 4.2;
          targetPos.z = 2.0;
        }
      } else if (activeAction === "emp") {
        pitch = Math.sin(u * Math.PI) * -0.15;
        if (Math.abs(u - 0.45) < 0.03) {
          addRing(ship.pos, v3(1, 0, 0), v3(0, 0, 1), 1.8, 32, 0.8, "#5ef2ff", 2);
        }
      } else if (activeAction === "flare") {
        roll = Math.sin(u * Math.PI * 2) * 0.42;
        flareBurstTimer -= dt;
        if (flareBurstTimer <= 0 && u < 0.78) {
          flareBurstTimer = 0.28;
          launchFlares();
        }
      } else if (activeAction === "damage") {
        if (u < 0.25) {
          ship.act.shield = 0.9;
          ship.hitFlash = (Math.floor(actionTime * 18) % 2 === 0) ? 1.0 : 0.0;
        } else if (u < 0.62) {
          const p = (u - 0.25) / 0.37;
          ship.act.shield = 0;
          if (p < 0.08 && ship.act.explodeProg < 0.05) {
            spawnExplosion(ship.pos, true);
          }
          ship.act.explodeProg = p;
        } else {
          // Magnetic nano-reassembly!
          const p = 1 - (u - 0.62) / 0.38;
          ship.act.explodeProg = Math.max(0, p);
          if (p < 0.12) ship.act.shield = 0.65;
        }
      } else if (activeAction === "overdrive") {
        const env = Math.sin(u * Math.PI);
        ship.act.overdrive = clamp(env * 1.4, 0, 1);
        flame = 1.9;
        targetPos.y = Math.sin(u * Math.PI) * 1.2;
        if (selectedId === "science_ship" && Math.random() < 0.14) {
          const cols = ["#42ffb8", "#66f7ff", "#e066ff"];
          addRing(ship.pos, v3(1, 0, 0), v3(0, 0, 1), 1.8, 22, 0.65, cols[Math.floor(Math.random() * 3)], 2);
        }
        if (selectedId === "frigate") {
          ship.act.shield = 0.75 * env;
        }
        if (selectedId === "stealth_vessel") {
          ship.act.cloak = 0.65 * env;
        }
        laserBurstTimer -= dt;
        if (laserBurstTimer <= 0 && u > 0.15 && u < 0.85) {
          laserBurstTimer = selectedId === "destroyer" || selectedId === "tiny_fighter" ? 0.10 : 0.18;
          fireLasers();
        }
      }

      if (actionTime >= actionDuration) {
        if (demoMode) {
          demoIdx = (demoIdx + 1) % DEMO_SEQUENCE.length;
          triggerAction(DEMO_SEQUENCE[demoIdx], true);
        } else {
          triggerAction("idle");
        }
      }
    }

    ship.pos = lerpV3(ship.pos, targetPos, Math.min(1, dt * 8));
    ship.thrusterFlame = lerp(ship.thrusterFlame, flame, Math.min(1, dt * 8));

    // Compose orientation quaternion (Yaw Y -> Pitch X -> Roll Z)
    let q = qIdentity();
    q = qMul(q, qFromAxisAngle(v3(0, 1, 0), yaw));
    q = qMul(q, qFromAxisAngle(v3(1, 0, 0), pitch));
    q = qMul(q, qFromAxisAngle(v3(0, 0, 1), roll));
    ship.quat = qNorm(q);
    ship.basis = qBasis(ship.quat);

    // Wingtip / engine trails
    ship.trailTimer += dt;
    if (ship.trailTimer >= 0.03) {
      ship.trailTimer = 0;
      const span = Math.min(3.2, (currentModel.radius || 3.5) * 0.62);
      ship.trailL.push(toWorldShip(-span, 0, -1.6));
      ship.trailR.push(toWorldShip(span, 0, -1.6));
      const maxLen = activeAction === "boost" || activeAction === "uturn" ? 24 : 14;
      while (ship.trailL.length > maxLen) ship.trailL.shift();
      while (ship.trailR.length > maxLen) ship.trailR.shift();
    }

    // Update Starfield parallax movement
    const starSpeed = 16 + ship.act.boost * 95 + (activeAction === "move" ? 18 : 0) - ship.act.brake * 14;
    for (let i = 0; i < stars.length; i++) {
      stars[i].z -= starSpeed * dt;
      if (stars[i].z < -90) {
        stars[i].z += 180;
        stars[i].x = (Math.random() - 0.5) * 160;
        stars[i].y = (Math.random() - 0.5) * 110;
      }
    }

    // Update Target Drone
    if (showTarget) {
      if (!targetDrone.alive) {
        targetDrone.respawnTimer -= dt;
        if (targetDrone.respawnTimer <= 0) {
          targetDrone.alive = true;
          targetDrone.hp = targetDrone.maxHp;
          targetDrone.stunTimer = 0;
          addRing(targetDrone.pos, v3(1, 0, 0), v3(0, 1, 0), 0.8, 12, 0.4, "#ff5c72", 2);
        }
      } else {
        targetDrone.hitFlash = Math.max(0, targetDrone.hitFlash - dt * 5);
        targetDrone.stunTimer = Math.max(0, targetDrone.stunTimer - dt);
        const speedMul = targetDrone.stunTimer > 0 ? 0.15 : 1.0;
        targetDrone.pos.x = Math.sin(time * 1.15 * speedMul) * 5.2 + (targetDrone.stunTimer > 0 ? (Math.random() - 0.5) * 0.45 : 0);
        targetDrone.pos.y = 0.8 + Math.cos(time * 1.65 * speedMul) * 2.1;
        targetDrone.pos.z = targetDrone.baseZ + Math.sin(time * 0.7) * 3.0;
      }
    }

    // Update Overdrive mini-drones (Carrier fighters / Stealth clones)
    for (let i = 0; i < drones.length; i++) {
      const dr = drones[i];
      dr.fireCD -= dt;
      let dPos;
      if (dr.ghost) {
        dPos = toWorldShip(dr.side * 5.2, Math.sin(time * 4 + dr.side) * 0.6, -0.6);
      } else {
        dr.angle += dt * 2.4;
        dPos = add(ship.pos, v3(Math.cos(dr.angle) * dr.dist, dr.yOff + Math.sin(dr.angle * 2) * 0.5, Math.sin(dr.angle) * dr.dist));
      }
      dr.pos = dPos;
      dr.basis = ship.basis;
      if (dr.fireCD <= 0 && showTarget && targetDrone.alive) {
        dr.fireCD = 0.35;
        projectiles.push({
          pos: { ...dPos },
          dir: norm(sub(targetDrone.pos, dPos)),
          speed: 85,
          life: 1.0,
          damage: 8,
          color: dr.ghost ? "#b872ff" : "#5ef2ff",
          coreColor: "#ffffff",
          tailLen: 3.2,
        });
      }
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) { projectiles.splice(i, 1); continue; }
      if (pr.isMissile && pr.target && pr.target.alive) {
        const toT = norm(sub(pr.target.pos, pr.pos));
        pr.dir = norm(lerpV3(pr.dir, toT, Math.min(1, dt * 6.5)));
        if (Math.random() < 0.85) {
          particles.push({
            pos: { ...pr.pos },
            vel: v3(0, 0, 0),
            life: 0.25,
            maxLife: 0.25,
            size: 1.3,
            color: "#ffd166",
          });
        }
      }
      pr.pos = add(pr.pos, scale(pr.dir, pr.speed * dt));

      if (showTarget && targetDrone.alive && len(sub(pr.pos, targetDrone.pos)) < 3.0) {
        targetDrone.hp -= pr.damage || 10;
        targetDrone.hitFlash = 1.0;
        if (pr.isMissile) spawnExplosion(pr.pos, false);
        else window.SFX.playHit();
        if (targetDrone.hp <= 0) {
          targetDrone.alive = false;
          targetDrone.respawnTimer = 1.8;
          spawnExplosion(targetDrone.pos, true);
        }
        projectiles.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(i, 1); continue; }
      pt.pos = add(pt.pos, scale(pt.vel, dt));
      pt.vel = scale(pt.vel, 1 - dt * 1.1);
      if (pt.ring) pt.size += dt * 16;
      if (pt.flare && Math.random() < 0.35) {
        particles.push({
          pos: { ...pt.pos },
          vel: v3(0, 0, 0),
          life: 0.22,
          maxLife: 0.22,
          size: 0.9,
          color: "#ffe8a3",
        });
      }
    }

    // Update 3D Rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const rg = rings[i];
      rg.life -= dt;
      if (rg.life <= 0) { rings.splice(i, 1); continue; }
      rg.radius += rg.growSpd * dt;
    }

    // Update 3D Ghosts
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    }
  }

  function render() {
    // Compute Camera Position
    let camPos, lookAt;
    if (camMode === "chase") {
      camPos = add(ship.pos, v3(0, 3.6, -11.5 - ship.act.boost * 2.5));
      lookAt = add(ship.pos, v3(0, 0.4, 10));
    } else if (camMode === "cine") {
      const a = time * 0.42;
      camPos = v3(Math.sin(a) * 14.5, 4.2 + Math.sin(time * 0.7) * 2.2, Math.cos(a) * 14.5);
      lookAt = add(ship.pos, v3(0, 0.2, 1.5));
    } else {
      if (!dragging && activeAction === "idle") orbitYaw += 0.0032;
      const cp = Math.cos(orbitPitch);
      camPos = v3(
        ship.pos.x + Math.sin(orbitYaw) * cp * orbitDist,
        ship.pos.y + Math.sin(orbitPitch) * orbitDist,
        ship.pos.z + Math.cos(orbitYaw) * cp * orbitDist
      );
      lookAt = ship.pos;
    }
    const camQ = qLookAt(sub(lookAt, camPos), v3(0, 1, 0));
    const camB = qBasis(camQ);
    const cam = {
      pos: camPos,
      right: camB.right,
      up: camB.up,
      fwd: camB.fwd,
      tanHalfFov: TAN_HALF_FOV,
    };

    // Build 3D Space Grid
    const gridLines = [];
    if (showGrid) {
      const yFloor = -3.8;
      const step = 4;
      const extent = 28;
      for (let g = -extent; g <= extent; g += step) {
        const isMain = g === 0;
        const col = isMain ? "rgba(68, 210, 255, 0.28)" : "rgba(38, 118, 178, 0.16)";
        gridLines.push({ a: v3(g, yFloor, -extent), b: v3(g, yFloor, extent), col });
        gridLines.push({ a: v3(-extent, yFloor, g), b: v3(extent, yFloor, g), col });
      }
    }

    // Build Ships List
    const renderShips = [];
    // Afterimage Ghosts
    for (let i = 0; i < ghosts.length; i++) {
      const gh = ghosts[i];
      renderShips.push({
        visible: true,
        force3D: true,
        pos: gh.pos,
        basis: gh.basis,
        model: currentModel,
        scale: 1.0,
        ghostAlpha: gh.life / gh.maxLife,
      });
    }
    // Primary 3D Starship
    renderShips.push({
      visible: true,
      force3D: true,
      pos: ship.pos,
      basis: ship.basis,
      model: currentModel,
      scale: 1.0,
      hitFlash: ship.hitFlash,
      thrusterFlame: ship.thrusterFlame,
      act: ship.act,
      wireframe,
      pixelEdges: true,
    });
    // Overdrive Mini-Drones / Clones
    for (let i = 0; i < drones.length; i++) {
      const dr = drones[i];
      renderShips.push({
        visible: true,
        force3D: true,
        pos: dr.pos,
        basis: dr.basis,
        model: dr.model,
        scale: dr.scale,
        thrusterFlame: 1.1,
        ghostAlpha: dr.ghost ? 0.72 : 0,
      });
    }
    // Live 3D Target Drone
    if (showTarget && targetDrone.alive) {
      const tq = qNorm(qMul(qFromAxisAngle(v3(0, 1, 0), time * 1.4), qFromAxisAngle(v3(1, 0, 0), time * 0.9)));
      renderShips.push({
        visible: true,
        force3D: true,
        pos: targetDrone.pos,
        basis: qBasis(tq),
        model: window.Models.targetDrone,
        scale: 1.0,
        hitFlash: targetDrone.hitFlash,
      });
    }

    // Trails
    const trails = [];
    const trailColorFn = activeAction === "uturn" || activeAction === "overdrive"
      ? (a) => `rgba(255, 224, 96, ${a.toFixed(2)})`
      : (a) => `rgba(88, 240, 255, ${a.toFixed(2)})`;
    if (ship.trailL.length > 1) {
      trails.push({ pts: ship.trailL, alpha: 0.72, colorFn: trailColorFn });
      trails.push({ pts: ship.trailR, alpha: 0.72, colorFn: trailColorFn });
    }

    // Render 3D Scene
    const { project } = window.Renderer3D.renderScene(ctx, pixW, pixH, {
      cam,
      sunDir: SUN_DIR,
      earthRadius: 0,
      gridLines,
      ships: renderShips,
      trails,
      projectiles,
      particles,
      rings,
      boostAlpha: ship.act.boost * 0.95,
      wireframe,
      time,
    });

    // Draw background deep-space stars underneath via destination-over!
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const sp = project(st);
      if (!sp || sp.x < 0 || sp.x >= pixW || sp.y < 0 || sp.y >= pixH) continue;
      if (ship.act.boost > 0.15) {
        const sp2 = project({ x: st.x, y: st.y, z: st.z + 4.5 * ship.act.boost });
        if (sp2) {
          ctx.strokeStyle = st.c;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.round(sp.x), Math.round(sp.y));
          ctx.lineTo(Math.round(sp2.x), Math.round(sp2.y));
          ctx.stroke();
          continue;
        }
      }
      ctx.fillStyle = st.c;
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), st.s, st.s);
    }
    // Deep space gradient backdrop
    const grad = ctx.createRadialGradient(pixW * 0.5, pixH * 0.45, 20, pixW * 0.5, pixH * 0.5, pixW * 0.72);
    grad.addColorStop(0, "#0b1a36");
    grad.addColorStop(0.55, "#050c1d");
    grad.addColorStop(1, "#02050c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, pixW, pixH);
    ctx.restore();

    // Target lock reticle on Target Drone
    if (showTarget && targetDrone.alive) {
      const tp = project(targetDrone.pos);
      if (tp && tp.x > 8 && tp.x < pixW - 8 && tp.y > 8 && tp.y < pixH - 8) {
        const r = Math.max(8, Math.min(20, 320 / tp.z));
        ctx.strokeStyle = targetDrone.stunTimer > 0 ? "#5ef2ff" : "#ff5c72";
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(tp.x - r), Math.round(tp.y - r), Math.round(r * 2), Math.round(r * 2));
        ctx.font = 'bold 9px "Noto Sans TC", monospace';
        ctx.fillStyle = targetDrone.stunTimer > 0 ? "#7df7ff" : "#ff9aa6";
        ctx.textAlign = "center";
        ctx.fillText(targetDrone.stunTimer > 0 ? "EMP 癱瘓中" : `靶機 ${Math.max(0, Math.round(targetDrone.hp))}%`, Math.round(tp.x), Math.round(tp.y - r - 4));
      }
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  buildRosterUI();
  selectShip(selectedId);
  setBanner("idle");
  requestAnimationFrame(loop);
})();
