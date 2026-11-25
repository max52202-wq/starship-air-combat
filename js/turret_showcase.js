// ============================================================================
// turret_showcase.js — Interactive 3D 8-Bit Ground AA Turret Showcase &
// Live First-Person Seated Cockpit Gunner Simulator for All 10 Turrets!
// ============================================================================

(function () {
  const TM = window.TurretModels;
  const TURRETS = TM.TURRET_LIST;
  const ACTIONS = TM.TURRET_ACTIONS;

  const canvas = document.getElementById("stage-canvas");
  const ctx = canvas.getContext("2d");

  const listEl = document.getElementById("turret-list");
  const polyEl = document.getElementById("turret-poly-count");
  const actGridEl = document.getElementById("action-grid");
  const abLabelEl = document.getElementById("ab-label");
  const abNameEl = document.getElementById("ab-name");
  const abSubEl = document.getElementById("ab-sub");
  const stageTipEl = document.getElementById("stage-tip");
  const hudTitleEl = document.getElementById("hud-turret-title");
  const hudDescEl = document.getElementById("hud-turret-desc");
  const hudStatsEl = document.getElementById("hud-stats");
  const previewCockpitImg = document.getElementById("preview-cockpit-img");
  const previewStripImg = document.getElementById("preview-strip-img");
  const cockpitPreviewName = document.getElementById("cockpit-preview-name");

  const btnView3D = document.getElementById("btn-view-3d");
  const btnViewCockpit = document.getElementById("btn-view-cockpit");
  const btnEnterMini = document.getElementById("btn-enter-cockpit-mini");
  const btnWire = document.getElementById("btn-wire");
  const btnMute = document.getElementById("btn-mute");
  const btnDemo = document.getElementById("btn-demo");
  const btnFireNow = document.getElementById("btn-fire-now");
  const btnGallery = document.getElementById("btn-open-gallery");
  const galleryModal = document.getElementById("gallery-modal");
  const galleryImg = document.getElementById("gallery-img");
  const btnCloseGallery = document.getElementById("btn-close-gallery");

  // Pixelated canvas resolution
  let pixW = 480, pixH = 300;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const aspect = Math.max(0.8, Math.min(2.2, r.width / Math.max(1, r.height)));
    pixH = Math.min(310, Math.max(210, Math.round(r.height * 0.48)));
    pixW = Math.round(pixH * aspect);
    canvas.width = pixW;
    canvas.height = pixH;
  }
  window.addEventListener("resize", resize);
  resize();

  // State
  let selectedIdx = 0;
  let currentTurret = TURRETS[0];
  let viewMode = "3d"; // "3d" | "cockpit"
  let wireframe = false;
  let demoMode = false;
  let demoTimer = 0;
  let demoActIdx = 0;

  let activeAction = "idle";
  let actionTime = 0;
  let time = 0;

  // 3D Orbit Camera
  let orbitYaw = -0.72;
  let orbitPitch = 0.44;
  let orbitDist = 13.8;
  let dragging = false;
  let lastMouse = { x: 0, y: 0 };

  // Live Turret Pose
  const pose = {
    yaw: 0.2,
    pitch: 0.38,
    recoilL: 0,
    recoilR: 0,
    spinAngle: 0,
    radarAngle: 0,
    petalOpen: 0.15,
    explode: 0,
    shake: 0,
  };

  // Cockpit Gunner Live Aim & Combat State
  const gunner = {
    aimX: 0.5, // normalized 0..1 screen X
    aimY: 0.30, // normalized 0..1 screen Y
    yawDeg: 0,
    pitchDeg: 45,
    firing: false,
    fireCooldown: 0,
    heat: 0,
    overheated: false,
    ammo: 100,
    muzzleFlash: 0,
    flashL: 0,
    flashR: 0,
    recoilKick: 0,
    recoilL: 0,
    recoilR: 0,
    spinPhase: 0,
    shakeX: 0,
    shakeY: 0,
    barrelToggle: 0,
    kills: 0,
  };

  // Live Flying Zerg Targets (used in BOTH 3D & Cockpit modes!)
  const targets = [];
  function spawnTarget(i) {
    const ang = (i / 5) * Math.PI * 2 + Math.random();
    return {
      // 3D world pos (orbiting overhead)
      angle: ang,
      radius: 13 + Math.random() * 7,
      height: 7.5 + Math.random() * 4.5,
      speed: (i % 2 ? 1 : -1) * (0.45 + Math.random() * 0.35),
      // Cockpit 2D normalized sky coords
      sx: 0.18 + Math.random() * 0.64,
      sy: 0.14 + Math.random() * 0.28,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.08),
      vy: (Math.random() - 0.5) * 0.025,
      hp: 3,
      maxHp: 3,
      hitFlash: 0,
      kind: i % 3, // 0: Mutalisk, 1: Scourge, 2: Overlord
    };
  }
  for (let i = 0; i < 6; i++) targets.push(spawnTarget(i));

  // Active VFX particles & outbound perspective projectiles
  const bolts3D = [];
  const bursts2D = [];
  const beams2D = [];
  const shots2D = [];   // Outbound 3D-perspective shells/tracers/missiles/plasma orbs!
  const smoke2D = [];   // Drifting muzzle gunsmoke & missile backblast clouds
  const shells2D = [];  // Ejected spinning hot brass shell casings
  const rings2D = [];   // Expanding shockwave / EMP / Mach rings

  // ============================================================================
  // UI Construction
  // ============================================================================
  function buildRoster() {
    listEl.innerHTML = "";
    TURRETS.forEach((t, idx) => {
      const div = document.createElement("div");
      div.className = "turret-item" + (idx === selectedIdx ? " selected" : "");
      div.innerHTML = `
        <img src="assets/turrets_8bit/icons/${t.no}_${t.id}.png" alt="${t.name}" />
        <div class="turret-item-info">
          <div class="turret-item-no">NO.${t.no} · ${t.weaponStyle.toUpperCase()}</div>
          <div class="turret-item-name">${t.name}</div>
          <div class="turret-item-role">${t.role}</div>
        </div>
      `;
      div.addEventListener("click", () => selectTurret(idx));
      listEl.appendChild(div);
    });
  }

  function buildActions() {
    actGridEl.innerHTML = "";
    ACTIONS.forEach((a, idx) => {
      const b = document.createElement("button");
      b.className = "act-btn" + (a.key === activeAction ? " active" : "");
      b.dataset.act = a.key;
      b.innerHTML = `
        <div class="act-head">
          <span class="act-title">${a.name}</span>
          <span class="act-key">${idx + 1}</span>
        </div>
        <div class="act-desc">${a.en}</div>
      `;
      b.addEventListener("click", () => {
        demoMode = false;
        btnDemo.classList.remove("active");
        if (viewMode === "cockpit") setViewMode("3d");
        triggerAction(a.key);
      });
      actGridEl.appendChild(b);
    });
  }

  function selectTurret(idx) {
    selectedIdx = (idx + TURRETS.length) % TURRETS.length;
    currentTurret = TURRETS[selectedIdx];
    polyEl.textContent = `${currentTurret.faces.length} FACES`;
    hudTitleEl.textContent = `${currentTurret.no}. ${currentTurret.name}（${currentTurret.en}）`;
    hudDescEl.textContent = currentTurret.desc;
    const st = currentTurret.stats;
    hudStatsEl.innerHTML = `
      <span>火力 <strong>${st.dmg}</strong></span>
      <span>射速 <strong>${st.rof}</strong></span>
      <span>射程 <strong>${st.rng}</strong></span>
      <span>裝甲 <strong>${st.arm}</strong></span>
    `;
    cockpitPreviewName.textContent = currentTurret.cockpit.label;
    previewCockpitImg.src = `assets/turrets_8bit/cockpits/${currentTurret.no}_${currentTurret.id}_cockpit.png`;
    previewStripImg.src = `assets/turrets_8bit/actions/${currentTurret.no}_${currentTurret.id}_actions.png`;

    document.querySelectorAll(".turret-item").forEach((el, i) => {
      el.classList.toggle("selected", i === selectedIdx);
    });

    gunner.heat = 0;
    gunner.overheated = false;
    gunner.ammo = 100;
    updateBanner();
  }

  function triggerAction(key) {
    activeAction = key;
    actionTime = 0;
    document.querySelectorAll(".act-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.act === key);
    });
    if ((key === "fire" || key === "recoil") && window.SoundFX) {
      try { window.SoundFX.laser(); } catch (_) {}
    } else if (key === "damaged" && window.SoundFX) {
      try { window.SoundFX.explosion(true); } catch (_) {}
    }
    updateBanner();
  }

  function setViewMode(mode) {
    viewMode = mode;
    btnView3D.classList.toggle("active", mode === "3d");
    btnViewCockpit.classList.toggle("active", mode === "cockpit");
    canvas.classList.toggle("cockpit-cursor", mode === "cockpit");
    if (mode === "cockpit") {
      demoMode = false;
      btnDemo.classList.remove("active");
      stageTipEl.innerHTML = `移動滑鼠：瞄準空中蟲族目標<br/>左鍵／空白鍵：開火射擊<br/>數字 1~0 切換砲塔・按 C 返回 3D`;
    } else {
      stageTipEl.innerHTML = `滑鼠拖曳：360° 旋轉視角<br/>滾輪：拉近／拉遠・數字 1~8：動作<br/>按 C 鍵：坐進砲塔內部座艙射擊！`;
    }
    updateBanner();
  }

  function updateBanner() {
    if (viewMode === "cockpit") {
      abLabelEl.textContent = `FIRST-PERSON TURRET GUNNER COCKPIT · 擊墜數 ${gunner.kills}`;
      abNameEl.textContent = `🎯 ${currentTurret.cockpit.label}`;
      abSubEl.textContent = `移動滑鼠旋轉砲塔仰角與方位角，點擊左鍵或空白鍵發射【${currentTurret.name}】專屬防空火力！`;
    } else {
      const a = ACTIONS.find((x) => x.key === activeAction) || ACTIONS[0];
      abLabelEl.textContent = `3D TURRET ACTION STUDIO · NO.${currentTurret.no}`;
      abNameEl.textContent = `${a.name}（${a.en}）`;
      abSubEl.textContent = a.desc;
    }
  }

  // ============================================================================
  // Input Events
  // ============================================================================
  canvas.addEventListener("mousedown", (e) => {
    if (viewMode === "cockpit") {
      gunner.firing = true;
      fireCockpitWeapon();
    } else {
      dragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
    }
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    gunner.firing = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (viewMode === "cockpit") {
      gunner.aimX = Math.max(0.12, Math.min(0.88, (e.clientX - rect.left) / Math.max(1, rect.width)));
      gunner.aimY = Math.max(0.12, Math.min(0.58, (e.clientY - rect.top) / Math.max(1, rect.height)));
      gunner.yawDeg = Math.round((gunner.aimX - 0.5) * 180);
      gunner.pitchDeg = Math.round(78 - gunner.aimY * 110);
    } else if (dragging) {
      orbitYaw -= (e.clientX - lastMouse.x) * 0.011;
      orbitPitch = Math.max(0.08, Math.min(1.25, orbitPitch + (e.clientY - lastMouse.y) * 0.008));
      lastMouse = { x: e.clientX, y: e.clientY };
    }
  });
  canvas.addEventListener("wheel", (e) => {
    if (viewMode === "3d") {
      e.preventDefault();
      orbitDist = Math.max(8.5, Math.min(22, orbitDist + e.deltaY * 0.01));
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyC") {
      setViewMode(viewMode === "3d" ? "cockpit" : "3d");
    } else if (e.code === "Space") {
      e.preventDefault();
      if (viewMode === "cockpit") {
        gunner.firing = true;
        fireCockpitWeapon();
      } else {
        triggerAction("fire");
      }
    } else if (e.key >= "1" && e.key <= "8") {
      const idx = parseInt(e.key, 10) - 1;
      if (viewMode === "3d" && ACTIONS[idx]) triggerAction(ACTIONS[idx].key);
      else if (viewMode === "cockpit") selectTurret(idx);
    } else if (e.key === "9" && viewMode === "cockpit") {
      selectTurret(8);
    } else if (e.key === "0" && viewMode === "cockpit") {
      selectTurret(9);
    } else if (e.code === "ArrowUp") {
      selectTurret(selectedIdx - 1);
    } else if (e.code === "ArrowDown") {
      selectTurret(selectedIdx + 1);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") gunner.firing = false;
  });

  btnView3D.addEventListener("click", () => setViewMode("3d"));
  btnViewCockpit.addEventListener("click", () => setViewMode("cockpit"));
  btnEnterMini.addEventListener("click", () => setViewMode("cockpit"));
  btnWire.addEventListener("click", () => {
    wireframe = !wireframe;
    btnWire.textContent = wireframe ? "線框：開" : "線框：關";
    btnWire.classList.toggle("active", wireframe);
  });
  btnMute.addEventListener("click", () => {
    if (window.SoundFX && window.SoundFX.toggleMute) {
      const m = window.SoundFX.toggleMute();
      btnMute.textContent = m ? "音效：關" : "音效：開";
    }
  });
  btnDemo.addEventListener("click", () => {
    if (viewMode === "cockpit") setViewMode("3d");
    demoMode = !demoMode;
    btnDemo.classList.toggle("active", demoMode);
    demoTimer = 0;
  });
  btnFireNow.addEventListener("click", () => {
    if (viewMode === "cockpit") fireCockpitWeapon();
    else triggerAction("fire");
  });

  // Gallery modal
  const SHEETS = {
    icons: "assets/turrets_8bit/icons/turrets_3d_8bit_overview.png",
    actions: "assets/turrets_8bit/actions/turrets_actions_showcase.png",
    cockpits: "assets/turrets_8bit/cockpits/turrets_cockpits_overview.png",
  };
  btnGallery.addEventListener("click", () => galleryModal.classList.remove("hidden"));
  btnCloseGallery.addEventListener("click", () => galleryModal.classList.add("hidden"));
  galleryModal.addEventListener("click", (e) => {
    if (e.target === galleryModal) galleryModal.classList.add("hidden");
  });
  document.querySelectorAll("[data-sheet]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-sheet]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      galleryImg.src = SHEETS[btn.dataset.sheet];
    });
  });

  // ============================================================================
  // Helper: Exact Cockpit Screen Muzzle Coordinates for Current Turret & Aim
  // ============================================================================
  function getCockpitMuzzles(W, H, aimPxX, aimPxY) {
    const bs = currentTurret.cockpit.barrelStyle;
    const lerpPt = (x0, y0, x1, y1, t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    if (bs === "gatling") {
      const l = lerpPt(W * 0.16, H * 0.72, aimPxX, aimPxY, 0.48 - gunner.recoilL * 0.07);
      const r = lerpPt(W * 0.84, H * 0.72, aimPxX, aimPxY, 0.48 - gunner.recoilR * 0.07);
      return { left: l, right: r, dual: true };
    }
    if (bs === "twin_heavy") {
      const l = lerpPt(W * 0.28, H * 0.72, aimPxX, aimPxY, 0.52 - gunner.recoilL * 0.12);
      const r = lerpPt(W * 0.72, H * 0.72, aimPxX, aimPxY, 0.52 - gunner.recoilR * 0.12);
      return { left: l, right: r, dual: true };
    }
    if (bs === "missile_pods") {
      return {
        left: [W * 0.19, H * 0.48],
        right: [W * 0.81, H * 0.48],
        dual: true,
      };
    }
    if (bs === "tesla_prongs") {
      const l = lerpPt(W * 0.20, H * 0.72, aimPxX, aimPxY, 0.46);
      const r = lerpPt(W * 0.80, H * 0.72, aimPxX, aimPxY, 0.46);
      return { left: l, right: r, dual: true };
    }
    // Center-aligned heavy emitter (Prism / Railgun / Mortar / EMP / Cryo / Orbital Ion)
    const c = lerpPt(W * 0.5, H * 0.74, aimPxX, aimPxY, 0.44 - gunner.recoilL * 0.09);
    return { left: c, right: c, dual: false };
  }

  // ============================================================================
  // Cockpit Gunner Firing Logic (Real Outbound Projectiles, Recoil, Shells & Smoke!)
  // ============================================================================
  function damageTargetsAt(nx, ny, style) {
    const hitRadius = (style === "flak" || style === "plasma" || style === "emp" || style === "ion_beam") ? 0.12 : 0.072;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const d = Math.hypot(t.sx - nx, t.sy - ny);
      if (d <= hitRadius) {
        const dmg = currentTurret.stats.dmg >= 90 ? 3 : (currentTurret.stats.dmg >= 80 ? 2 : 1);
        t.hp -= dmg;
        t.hitFlash = 0.22;
        bursts2D.push({ x: t.sx * pixW, y: t.sy * pixH, r: 5, maxR: style === "flak" ? 28 : 18, life: 0.38, col: currentTurret.fireColor });
        if (t.hp <= 0) {
          gunner.kills++;
          bursts2D.push({ x: t.sx * pixW, y: t.sy * pixH, r: 9, maxR: 36, life: 0.58, col: "#ff922b" });
          bursts2D.push({ x: t.sx * pixW, y: t.sy * pixH, r: 4, maxR: 22, life: 0.42, col: "#ffffff" });
          targets[i] = spawnTarget(i);
          if (window.SoundFX) try { window.SoundFX.explosion(false); } catch (_) {}
          updateBanner();
        }
      }
    }
  }

  function fireCockpitWeapon() {
    if (gunner.fireCooldown > 0 || gunner.overheated) return;
    const style = currentTurret.weaponStyle;
    const rof = currentTurret.stats.rof;
    gunner.fireCooldown = Math.max(0.065, (112 - rof) / 145);
    gunner.muzzleFlash = 1.0;
    gunner.recoilKick = style === "flak" || style === "railgun" || style === "plasma" || style === "ion_beam" ? 1.35 : 0.85;
    gunner.barrelToggle = 1 - gunner.barrelToggle;
    const useLeft = gunner.barrelToggle === 0;
    if (style === "gatling" || style === "flak" || style === "missile") {
      if (useLeft) { gunner.recoilL = 1.0; gunner.flashL = 1.0; }
      else { gunner.recoilR = 1.0; gunner.flashR = 1.0; }
    } else {
      gunner.recoilL = 1.0; gunner.recoilR = 1.0;
      gunner.flashL = 1.0; gunner.flashR = 1.0;
    }
    gunner.shakeX = (Math.random() - 0.5) * 6 * gunner.recoilKick;
    gunner.shakeY = 3.5 * gunner.recoilKick;
    gunner.heat = Math.min(100, gunner.heat + (style === "gatling" ? 3.8 : 13));
    if (gunner.heat >= 100) gunner.overheated = true;

    if (window.SoundFX) {
      try {
        if (style === "missile") window.SoundFX.missile();
        else if (style === "plasma" || style === "flak" || style === "ion_beam") window.SoundFX.explosion(false);
        else window.SoundFX.laser();
      } catch (_) {}
    }

    const tx = gunner.aimX * pixW;
    const ty = gunner.aimY * pixH;
    const muzzles = getCockpitMuzzles(pixW, pixH, tx, ty);
    const mPt = useLeft ? muzzles.left : muzzles.right;
    const mx = mPt[0], my = mPt[1];

    // Muzzle gunsmoke / backblast / cryo mist right outside glass!
    const smokeCount = style === "missile" ? 6 : (style === "flak" || style === "plasma" ? 4 : 2);
    for (let k = 0; k < smokeCount; k++) {
      smoke2D.push({
        x: mx + (Math.random() - 0.5) * 14,
        y: my + (Math.random() - 0.5) * 10,
        vx: (useLeft ? -1 : 1) * (12 + Math.random() * 24) + (Math.random() - 0.5) * 18,
        vy: -14 - Math.random() * 22,
        r: style === "missile" ? 10 : 6,
        grow: style === "missile" ? 28 : 16,
        life: style === "missile" ? 0.65 : 0.42,
        maxLife: style === "missile" ? 0.65 : 0.42,
        col: style === "cryo" ? "170,242,255" : (style === "plasma" ? "255,154,72" : "195,210,225"),
      });
    }

    // Eject hot spinning brass shell casings on kinetic turrets!
    if (style === "gatling" || style === "flak") {
      const dir = useLeft ? -1 : 1;
      shells2D.push({
        x: mx + dir * 8,
        y: my + 8,
        vx: dir * (70 + Math.random() * 55),
        vy: -45 - Math.random() * 45,
        rot: Math.random() * 6,
        vrot: dir * 18,
        size: style === "flak" ? 5 : 3,
        life: 0.75,
      });
    }

    // Hitscan / beam weapons vs. true depth-traveling outbound projectiles!
    if (style === "laser" || style === "ion_beam" || style === "railgun" || style === "tesla" || style === "cryo") {
      beams2D.push({
        sx: mx, sy: my,
        lx: muzzles.left[0], ly: muzzles.left[1],
        rx: muzzles.right[0], ry: muzzles.right[1],
        x: tx, y: ty,
        life: style === "ion_beam" || style === "laser" ? 0.30 : 0.22,
        maxLife: style === "ion_beam" || style === "laser" ? 0.30 : 0.22,
        style,
        col: currentTurret.fireColor,
        core: currentTurret.coreColor,
      });
      if (style === "railgun" || style === "ion_beam") {
        for (const p of [0.22, 0.55, 0.85]) {
          rings2D.push({
            x: mx + (tx - mx) * p,
            y: my + (ty - my) * p,
            r: (1 - p * 0.5) * 8,
            maxR: (1 - p * 0.45) * 38,
            life: 0.34,
            maxLife: 0.34,
            col: style === "railgun" ? "#8ce4ff" : "#ffe466",
          });
        }
      }
      damageTargetsAt(gunner.aimX, gunner.aimY, style);
    } else if (style === "emp") {
      for (let k = 0; k < 3; k++) {
        shots2D.push({
          sx: mx, sy: my, tx, ty,
          nx: gunner.aimX, ny: gunner.aimY,
          p: -k * 0.14, speed: 2.6,
          style: "emp",
          col: currentTurret.fireColor,
          core: currentTurret.coreColor,
          curve: 0,
        });
      }
    } else {
      // Gatling tracers, Flak airburst shells, Curving SAM missiles, Lobbed Plasma fireballs!
      const spd = style === "gatling" ? 4.8 : (style === "flak" ? 3.2 : (style === "missile" ? 2.1 : 2.4));
      shots2D.push({
        sx: mx, sy: my, tx, ty,
        nx: gunner.aimX, ny: gunner.aimY,
        p: 0, speed: spd,
        style,
        col: currentTurret.fireColor,
        core: currentTurret.coreColor,
        curve: style === "missile" ? (useLeft ? -36 : 36) : (style === "plasma" ? -24 : 0),
      });
      if (style === "flak") {
        rings2D.push({ x: mx, y: my, r: 4, maxR: 28, life: 0.24, maxLife: 0.24, col: "#ffbe55" });
      }
    }
  }

  // ============================================================================
  // 3D Math & Live 3D Turret Renderer
  // ============================================================================
  function norm3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  const SUN = norm3([-0.55, 0.78, 0.48]);

  function render3DStage() {
    // Atmospheric sky-to-ground night defense backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, pixH);
    grad.addColorStop(0, "#050b1c");
    grad.addColorStop(0.58, "#0b1a36");
    grad.addColorStop(1, "#0d1624");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, pixW, pixH);

    // Camera positioned on orbit sphere
    const camPos = [
      Math.cos(orbitPitch) * Math.sin(orbitYaw) * orbitDist,
      Math.sin(orbitPitch) * orbitDist + 1.8,
      Math.cos(orbitPitch) * Math.cos(orbitYaw) * orbitDist,
    ];
    const target = [0, 2.2, 0];
    const fwd = norm3([target[0] - camPos[0], target[1] - camPos[1], target[2] - camPos[2]]);
    const right = norm3(cross3(fwd, [0, 1, 0]));
    const up = cross3(right, fwd);
    const fY = 1 / Math.tan((44 * Math.PI) / 360);
    const fX = fY / (pixW / pixH);

    function proj(p) {
      const rx = p[0] - camPos[0], ry = p[1] - camPos[1], rz = p[2] - camPos[2];
      const cz = rx * fwd[0] + ry * fwd[1] + rz * fwd[2];
      if (cz <= 0.3) return null;
      const cx = rx * right[0] + ry * right[1] + rz * right[2];
      const cy = rx * up[0] + ry * up[1] + rz * up[2];
      return {
        x: pixW * 0.5 + (cx / cz) * fX * (pixW * 0.5),
        y: pixH * 0.5 - (cy / cz) * fY * (pixH * 0.5),
        z: cz,
      };
    }

    // Tactical bunker floor grid
    ctx.strokeStyle = "rgba(64, 178, 224, 0.22)";
    ctx.lineWidth = 1;
    for (let g = -10; g <= 10; g += 2) {
      const a = proj([g, 0, -10]), b = proj([g, 0, 10]);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      const c = proj([-10, 0, g]), d = proj([10, 0, g]);
      if (c && d) { ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
    }
    // Concrete defense perimeter ring
    ctx.strokeStyle = currentTurret.accentHex;
    ctx.beginPath();
    for (let s = 0; s <= 24; s++) {
      const ang = (s / 24) * Math.PI * 2;
      const p = proj([Math.cos(ang) * 4.4, 0.02, Math.sin(ang) * 4.4]);
      if (!p) continue;
      if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Draw orbiting aerial Zerg targets in the sky!
    for (const t of targets) {
      const wx = Math.cos(t.angle) * t.radius;
      const wz = Math.sin(t.angle) * t.radius;
      const sp = proj([wx, t.height, wz]);
      if (!sp) continue;
      const sz = Math.max(3, 55 / sp.z);
      ctx.fillStyle = "#e04056";
      ctx.fillRect(Math.round(sp.x - sz * 1.4), Math.round(sp.y - sz * 0.4), Math.round(sz * 2.8), Math.round(sz * 0.8));
      ctx.fillStyle = "#7eff8a";
      ctx.fillRect(Math.round(sp.x - 1), Math.round(sp.y - 1), 2, 2);
    }

    // Painter's algorithm 3D Turret Faces (clean per-face explosion!)
    const exp = pose.explode || 0;
    const cleanPose = exp > 0 ? { ...pose, explode: 0 } : pose;
    const verts = TM.transformTurretVerts(currentTurret, cleanPose);
    const tris = [];
    const heatTint = activeAction === "overheat" ? 0.45 : (activeAction === "damaged" ? 0.25 : 0);

    for (let fi = 0; fi < currentTurret.faces.length; fi++) {
      const f = currentTurret.faces[fi];
      let va = verts[f.i[0]], vb = verts[f.i[1]], vc = verts[f.i[2]];
      if (exp > 0 && currentTurret.vTags[f.i[0]] !== "base") {
        const ang = fi * 2.39996;
        const spd = 0.55 + (fi % 5) * 0.28;
        const dx = Math.cos(ang) * exp * spd * 1.7;
        const dy = (0.35 + ((fi * 7) % 10) * 0.14) * exp * 1.9;
        const dz = Math.sin(ang) * exp * spd * 1.7;
        const cx = (va[0] + vb[0] + vc[0]) / 3;
        const cy = (va[1] + vb[1] + vc[1]) / 3;
        const cz = (va[2] + vb[2] + vc[2]) / 3;
        va = [cx + (va[0] - cx) * 0.72 + dx, cy + (va[1] - cy) * 0.72 + dy, cz + (va[2] - cz) * 0.72 + dz];
        vb = [cx + (vb[0] - cx) * 0.72 + dx, cy + (vb[1] - cy) * 0.72 + dy, cz + (vb[2] - cz) * 0.72 + dz];
        vc = [cx + (vc[0] - cx) * 0.72 + dx, cy + (vc[1] - cy) * 0.72 + dy, cz + (vc[2] - cz) * 0.72 + dz];
      }
      const ab = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
      const ac = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
      const n = norm3(cross3(ab, ac));
      const view = [camPos[0] - va[0], camPos[1] - va[1], camPos[2] - va[2]];
      if (!wireframe && dot3(n, view) < -0.05) continue;
      const pa = proj(va), pb = proj(vb), pc = proj(vc);
      if (!pa || !pb || !pc) continue;
      const lum = f.e ? 1.15 : (0.38 + Math.max(0, dot3(n, SUN)) * 0.65 + Math.max(0, n[1]) * 0.14);
      const qLum = Math.round(lum * 5) / 5;
      let r = f.c[0] * qLum, g = f.c[1] * qLum, b = f.c[2] * qLum;
      if (heatTint > 0 && currentTurret.vTags[f.i[0]] !== "base") {
        r = r * (1 - heatTint) + 255 * heatTint;
        g = g * (1 - heatTint) + 86 * heatTint;
        b = b * (1 - heatTint) + 38 * heatTint;
      }
      tris.push({
        z: (pa.z + pb.z + pc.z) / 3,
        pa, pb, pc,
        col: `rgb(${Math.min(255, Math.round(r))},${Math.min(255, Math.round(g))},${Math.min(255, Math.round(b))})`,
      });
    }
    tris.sort((a, b) => b.z - a.z);

    for (const tri of tris) {
      ctx.beginPath();
      ctx.moveTo(tri.pa.x, tri.pa.y);
      ctx.lineTo(tri.pb.x, tri.pb.y);
      ctx.lineTo(tri.pc.x, tri.pc.y);
      ctx.closePath();
      if (wireframe) {
        ctx.strokeStyle = currentTurret.accentHex;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = tri.col;
        ctx.fill();
        ctx.strokeStyle = "rgba(8, 12, 22, 0.35)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }

    // Live 3D Firing VFX (Muzzle flashes, beams, bolts, shockwaves, steam, explosions!)
    const m0 = TM.getMuzzleWorld(currentTurret, cleanPose, 0);
    const m1 = currentTurret.muzzles.length > 1 ? TM.getMuzzleWorld(currentTurret, cleanPose, 1) : m0;
    const pm0 = proj(m0), pm1 = proj(m1);
    const aimDir = [
      Math.sin(pose.yaw) * Math.cos(pose.pitch),
      Math.sin(pose.pitch),
      Math.cos(pose.yaw) * Math.cos(pose.pitch),
    ];
    const far0 = proj([m0[0] + aimDir[0] * 16, m0[1] + aimDir[1] * 16, m0[2] + aimDir[2] * 16]);
    const far1 = proj([m1[0] + aimDir[0] * 16, m1[1] + aimDir[1] * 16, m1[2] + aimDir[2] * 16]);

    if (activeAction === "fire" || activeAction === "recoil") {
      const pulse = 0.7 + Math.sin(time * 36) * 0.3;
      const st = currentTurret.weaponStyle;
      if (pm0 && far0) {
        if (st === "laser" || st === "ion_beam" || st === "cryo") {
          ctx.strokeStyle = currentTurret.fireColor;
          ctx.lineWidth = st === "ion_beam" ? 11 * pulse : 6 * pulse;
          ctx.beginPath(); ctx.moveTo(pm0.x, pm0.y); ctx.lineTo(far0.x, far0.y); ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = st === "ion_beam" ? 4 : 2;
          ctx.beginPath(); ctx.moveTo(pm0.x, pm0.y); ctx.lineTo(far0.x, far0.y); ctx.stroke();
        } else if (st === "tesla") {
          for (let b = 0; b < 3; b++) {
            ctx.strokeStyle = b === 0 ? "#88f4ff" : "#a88cff";
            ctx.lineWidth = b === 0 ? 2 : 3;
            ctx.beginPath();
            ctx.moveTo(pm0.x, pm0.y);
            for (let k = 1; k <= 6; k++) {
              const t = k / 6;
              const nx = pm0.x + (far0.x - pm0.x) * t + (k < 6 ? Math.sin(time * 28 + k * 5 + b * 3) * 14 : 0);
              const ny = pm0.y + (far0.y - pm0.y) * t + (k < 6 ? Math.cos(time * 24 + k * 7 + b * 2) * 10 : 0);
              ctx.lineTo(nx, ny);
            }
            ctx.stroke();
          }
        } else if (st === "emp") {
          for (let r = 0; r < 3; r++) {
            const p = ((time * 1.8 + r * 0.33) % 1);
            const rx = pm0.x + (far0.x - pm0.x) * p;
            const ry = pm0.y + (far0.y - pm0.y) * p;
            ctx.strokeStyle = `rgba(64, 255, 168, ${1 - p})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rx, ry, 6 + p * 34, 0, Math.PI * 2); ctx.stroke();
          }
        } else {
          // Projectile tracers / flak / missiles / railgun / plasma
          const p = (time * 3.5) % 1;
          for (const [sp, fp, off] of [[pm0, far0, 0], [pm1, far1, 0.5]]) {
            if (!sp || !fp) continue;
            const t = (p + off) % 1;
            const bx = sp.x + (fp.x - sp.x) * t;
            const by = sp.y + (fp.y - sp.y) * t;
            ctx.fillStyle = currentTurret.fireColor;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, 7 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = currentTurret.fireColor;
            ctx.lineWidth = st === "plasma" ? 6 : 3;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(bx, by); ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(bx, by, st === "plasma" ? 8 : 4, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    } else if (activeAction === "charge") {
      const ctr = proj([0, currentTurret.pivotY, 0]);
      if (ctr) {
        const rad = 28 + Math.sin(time * 10) * 8;
        ctx.strokeStyle = currentTurret.coreColor;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ctr.x, ctr.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = currentTurret.fireColor;
        ctx.beginPath(); ctx.arc(ctr.x, ctr.y, rad * 0.65, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (activeAction === "overheat") {
      const ctr = proj([0, currentTurret.pivotY + 0.8, 0]);
      if (ctr) {
        for (let k = 0; k < 6; k++) {
          const p = (time * 1.2 + k * 0.17) % 1;
          ctx.fillStyle = `rgba(235, 240, 250, ${(1 - p) * 0.65})`;
          ctx.beginPath();
          ctx.arc(ctr.x + Math.sin(k * 4 + time * 3) * 18, ctr.y - p * 56, 5 + p * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (activeAction === "damaged") {
      const ctr = proj([0, 2.3, 0]);
      if (ctr) {
        const pulse = 1 + Math.sin(time * 18) * 0.2;
        ctx.fillStyle = "rgba(255, 96, 36, 0.8)";
        ctx.beginPath(); ctx.arc(ctr.x, ctr.y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffe866";
        ctx.beginPath(); ctx.arc(ctr.x, ctr.y, 13 * pulse, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ============================================================================
  // Live Interactive First-Person Seated Cockpit Renderer!
  // Features chunky 3D-perspective barrels right outside glass, starburst muzzle
  // blasts, outbound shrinking projectiles, ejected brass shells, gunsmoke,
  // windshield glass sheen, recoil shake, and interior muzzle-flash bounce light!
  // ============================================================================
  function drawMuzzleStar2D(x, y, rad, col) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, rad * 1.75, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - rad * 2.4, y); ctx.lineTo(x + rad * 2.4, y);
    ctx.moveTo(x, y - rad * 2.2); ctx.lineTo(x, y + rad * 2.2);
    ctx.moveTo(x - rad * 1.6, y - rad * 1.6); ctx.lineTo(x + rad * 1.6, y + rad * 1.6);
    ctx.moveTo(x + rad * 1.6, y - rad * 1.6); ctx.lineTo(x - rad * 1.6, y + rad * 1.6);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, rad * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function renderCockpitStage() {
    const W = pixW, H = pixH;
    const cp = currentTurret.cockpit;
    const kickY = gunner.recoilKick * 5;
    const sxOff = gunner.shakeX;
    const syOff = gunner.shakeY;
    const aimPxX = gunner.aimX * W;
    const aimPxY = gunner.aimY * H;

    // 1. Bespoke Atmospheric Sky Gradient outside glass
    const SKY_GRAD = {
      olive_bunker: ["#0c1a34", "#244a6e", "#44789a"],
      iron_flak:    ["#1e142c", "#582e2e", "#945238"],
      aegis_navy:   ["#07122e", "#16386e", "#2b62a6"],
      prism_white:  ["#0a2648", "#206896", "#4ca8cc"],
      rail_sniper:  ["#050a1e", "#122652", "#204686"],
      tesla_brass:  ["#140c2e", "#362064", "#583a94"],
      magma_dome:   ["#240e12", "#5e221a", "#943e26"],
      ew_emerald:   ["#061a20", "#12423e", "#1e685e"],
      arctic_cryo:  ["#0a2240", "#28648e", "#58a6c8"],
      royal_citadel:["#081434", "#183c72", "#306aa8"],
    };
    const sg = SKY_GRAD[cp.theme] || ["#081228", "#193a68", "#32648f"];
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, sg[0]);
    sky.addColorStop(0.55, sg[1]);
    sky.addColorStop(1, sg[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Subtle parallax stars & horizon mountains as turret rotates!
    const panX = -gunner.yawDeg * 1.4 + sxOff;
    const panY = (gunner.pitchDeg - 42) * 1.1 + syOff;
    ctx.fillStyle = "#cfe8ff";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 73 + panX * 0.4) % W + W) % W;
      const sy = ((i * 31 + panY * 0.3) % (H * 0.52) + H * 0.52) % (H * 0.52);
      ctx.fillRect(Math.round(sx), Math.round(sy), i % 4 === 0 ? 2 : 1, 1);
    }
    // Distant clouds
    ctx.fillStyle = "rgba(180, 215, 240, 0.22)";
    for (let c = 0; c < 4; c++) {
      const cx = (((c * 140 + 40) + panX * 0.7) % (W + 80) + (W + 80)) % (W + 80) - 40;
      const cy = H * (0.28 + (c % 2) * 0.14) + panY * 0.35;
      ctx.fillRect(Math.round(cx), Math.round(cy), 46, 6);
      ctx.fillRect(Math.round(cx + 8), Math.round(cy - 4), 28, 4);
    }
    // Distant planetary defense horizon
    const horY = Math.round(H * 0.62 + panY * 0.45);
    ctx.fillStyle = "#142234";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) {
      const mh = Math.sin((x - panX) * 0.04) * 10 + Math.cos((x - panX) * 0.09) * 6;
      ctx.lineTo(x, horY + mh);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // 2. Flying Aerial Zerg Targets in the Sky!
    for (const t of targets) {
      const zx = Math.round(t.sx * W);
      const zy = Math.round(t.sy * H);
      const flap = Math.sin(time * 12 + t.angle) * 4;
      ctx.fillStyle = t.hitFlash > 0 ? "#ffffff" : (t.kind === 1 ? "#9b59ff" : "#d93b4f");
      ctx.fillRect(zx - 13, zy - 3 + flap * 0.5, 10, 4);
      ctx.fillRect(zx + 4, zy - 3 + flap * 0.5, 10, 4);
      ctx.fillRect(zx - 4, zy - 4, 8, 9);
      ctx.fillStyle = "#7eff80";
      ctx.fillRect(zx - 1, zy - 1, 3, 3);
      const dist = Math.hypot(t.sx - gunner.aimX, t.sy - gunner.aimY);
      if (dist < 0.15) {
        ctx.strokeStyle = dist < 0.075 ? "#ffe856" : cp.hudCol;
        ctx.lineWidth = 1;
        ctx.strokeRect(zx - 14, zy - 10, 28, 20);
      }
    }

    // 3. Outbound 3D-Perspective Projectiles, Beams, Shockwave Rings & Explosions!
    for (const sh of shots2D) {
      if (sh.p < 0) continue;
      const p = Math.min(1, sh.p);
      const pPrev = Math.max(0, p - (sh.style === "gatling" ? 0.18 : 0.14));
      const arc = (t) => Math.sin(t * Math.PI) * sh.curve;
      const x1 = sh.sx + (sh.tx - sh.sx) * p + arc(p) * (sh.style === "missile" ? 1 : 0);
      const y1 = sh.sy + (sh.ty - sh.sy) * p + (sh.style === "plasma" ? arc(p) : -Math.abs(arc(p)) * 0.25);
      const x0 = sh.sx + (sh.tx - sh.sx) * pPrev + arc(pPrev) * (sh.style === "missile" ? 1 : 0);
      const y0 = sh.sy + (sh.ty - sh.sy) * pPrev + (sh.style === "plasma" ? arc(pPrev) : -Math.abs(arc(pPrev)) * 0.25);
      const scale = Math.max(0.28, 1.15 - p * 0.78);

      if (sh.style === "emp") {
        ctx.strokeStyle = `rgba(64, 255, 168, ${1 - p * 0.45})`;
        ctx.lineWidth = Math.max(1.5, 3 * scale);
        ctx.beginPath(); ctx.arc(x1, y1, (14 + p * 34) * scale, 0, Math.PI * 2); ctx.stroke();
      } else if (sh.style === "missile") {
        // Thick curving white rocket smoke plume + glowing warhead!
        ctx.strokeStyle = "rgba(220, 234, 248, 0.75)";
        ctx.lineWidth = Math.max(2, 7 * scale);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillStyle = "#ff8c38";
        ctx.beginPath(); ctx.arc(x1, y1, Math.max(2.5, 6 * scale), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(x1, y1, Math.max(1.5, 3 * scale), 0, Math.PI * 2); ctx.fill();
      } else if (sh.style === "plasma") {
        ctx.fillStyle = "rgba(255, 118, 28, 0.45)";
        ctx.beginPath(); ctx.arc(x1, y1, 15 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff8428";
        ctx.beginPath(); ctx.arc(x1, y1, 10 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff29c";
        ctx.beginPath(); ctx.arc(x1, y1, 5 * scale, 0, Math.PI * 2); ctx.fill();
      } else {
        // Gatling tracer or heavy Flak shell streaking into deep sky!
        ctx.strokeStyle = sh.col;
        ctx.lineWidth = Math.max(1.5, (sh.style === "flak" ? 5 : 3.5) * scale);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(x1, y1, Math.max(1.5, (sh.style === "flak" ? 4.5 : 2.5) * scale), 0, Math.PI * 2); ctx.fill();
      }
    }

    for (const b of beams2D) {
      const a = b.life / b.maxLife;
      ctx.save();
      ctx.globalAlpha = a;
      if (b.style === "tesla") {
        for (const [bx, by] of [[b.lx, b.ly], [b.rx, b.ry]]) {
          ctx.strokeStyle = "#a880ff";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          for (let k = 1; k <= 4; k++) {
            const t = k / 4;
            const nx = bx + (b.x - bx) * t + (k < 4 ? (Math.random() - 0.5) * 22 : 0);
            const ny = by + (b.y - by) * t + (k < 4 ? (Math.random() - 0.5) * 14 : 0);
            ctx.lineTo(nx, ny);
          }
          ctx.stroke();
          ctx.strokeStyle = "#b8faff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Tapered 3D perspective mega-beam (wider at foreground muzzle, converging on target!)
        const w0 = b.style === "ion_beam" ? 26 * a : (b.style === "cryo" ? 20 * a : 14 * a);
        const w1 = Math.max(2, w0 * 0.35);
        ctx.fillStyle = b.col;
        ctx.beginPath();
        ctx.moveTo(b.sx - w0 * 0.5, b.sy);
        ctx.lineTo(b.sx + w0 * 0.5, b.sy);
        ctx.lineTo(b.x + w1 * 0.5, b.y);
        ctx.lineTo(b.x - w1 * 0.5, b.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(2, w0 * 0.25);
        ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }

    for (const r of rings2D) {
      const a = r.life / r.maxLife;
      ctx.strokeStyle = r.col;
      ctx.globalAlpha = a;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const p of bursts2D) {
      const a = Math.max(0, p.life / 0.55);
      ctx.fillStyle = p.col;
      ctx.globalAlpha = Math.min(1, a);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Drifting gunsmoke / backblast clouds right outside the armored glass!
    for (const sm of smoke2D) {
      const a = (sm.life / sm.maxLife) * 0.55;
      ctx.fillStyle = `rgba(${sm.col}, ${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2); ctx.fill();
    }

    // 4. MASSIVE 3D-Foreshortened Turret Barrels Right Outside Window + Live Muzzle Flash!
    const bs = cp.barrelStyle;
    const muzzles = getCockpitMuzzles(W, H, aimPxX, aimPxY);
    const heatGlow = Math.max(0, (gunner.heat - 35) / 65);
    const drawTaperBarrel = (x0, y0, w0, x1, y1, w1, darkCol, litCol, hiCol) => {
      const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI * 0.5;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.fillStyle = darkCol;
      ctx.beginPath();
      ctx.moveTo(x0 - ca * w0, y0 - sa * w0);
      ctx.lineTo(x0 + ca * w0, y0 + sa * w0);
      ctx.lineTo(x1 + ca * w1, y1 + sa * w1);
      ctx.lineTo(x1 - ca * w1, y1 - sa * w1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = litCol;
      ctx.beginPath();
      ctx.moveTo(x0 - ca * w0 * 0.55, y0 - sa * w0 * 0.55);
      ctx.lineTo(x0 + ca * w0 * 0.45, y0 + sa * w0 * 0.45);
      ctx.lineTo(x1 + ca * w1 * 0.45, y1 + sa * w1 * 0.45);
      ctx.lineTo(x1 - ca * w1 * 0.55, y1 - sa * w1 * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hiCol;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    };

    if (bs === "gatling") {
      for (const side of [-1, 1]) {
        const bx = W * (side < 0 ? 0.16 : 0.84) + sxOff * 0.5;
        const by = H * 0.72 + kickY * 0.4;
        const [ex, ey] = side < 0 ? muzzles.left : muzzles.right;
        drawTaperBarrel(bx, by, 16, ex, ey, 7, "#242c36", "#546274", "#98a8bc");
        // Spinning barrel highlight flicker & yellow hazard collar
        const spinOff = Math.sin(gunner.spinPhase + side) * 3;
        ctx.strokeStyle = "#f5b830";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx * 0.45 + ex * 0.55 - 8, by * 0.45 + ey * 0.55 + spinOff * 0.3);
        ctx.lineTo(bx * 0.45 + ex * 0.55 + 8, by * 0.45 + ey * 0.55 - spinOff * 0.3);
        ctx.stroke();
        if (heatGlow > 0) {
          ctx.fillStyle = `rgba(255, 96, 32, ${heatGlow * 0.7})`;
          ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
        }
        const fl = side < 0 ? gunner.flashL : gunner.flashR;
        if (fl > 0.05) drawMuzzleStar2D(ex, ey, 14 * fl + 4, currentTurret.fireColor);
      }
    } else if (bs === "twin_heavy") {
      for (const side of [-1, 1]) {
        const bx = W * (side < 0 ? 0.28 : 0.72) + sxOff * 0.5;
        const by = H * 0.72 + kickY * 0.5;
        const [ex, ey] = side < 0 ? muzzles.left : muzzles.right;
        // Brass hydraulic piston underneath barrel
        ctx.strokeStyle = "#c89c3e";
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(bx, by + 6); ctx.lineTo(bx * 0.55 + ex * 0.45, by * 0.55 + ey * 0.45 + 6); ctx.stroke();
        drawTaperBarrel(bx, by, 18, ex, ey, 8, "#2c3440", "#768496", "#c4d2e0");
        // Slotted muzzle brake block
        ctx.fillStyle = "#262c36";
        ctx.fillRect(ex - 9, ey - 6, 18, 12);
        ctx.fillStyle = heatGlow > 0.2 ? "#ff7b36" : "#566272";
        ctx.fillRect(ex - 7, ey - 2, 14, 4);
        const fl = side < 0 ? gunner.flashL : gunner.flashR;
        if (fl > 0.05) drawMuzzleStar2D(ex, ey, 19 * fl + 5, "#ff9e32");
      }
    } else if (bs === "missile_pods") {
      for (const side of [-1, 1]) {
        const px = side < 0 ? W * 0.11 : W * 0.73;
        const py = H * 0.39 + kickY * 0.4;
        const pw = W * 0.16, ph = H * 0.28;
        ctx.fillStyle = "#243b5c";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = "#58f2ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);
        for (const ox of [0.3, 0.7]) for (const oy of [0.3, 0.7]) {
          ctx.fillStyle = "#0e1a2c";
          ctx.beginPath(); ctx.arc(px + pw * ox, py + ph * oy, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ee4452";
          ctx.beginPath(); ctx.arc(px + pw * ox, py + ph * oy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        const fl = side < 0 ? gunner.flashL : gunner.flashR;
        if (fl > 0.05) {
          const [mx, my] = side < 0 ? muzzles.left : muzzles.right;
          drawMuzzleStar2D(mx, my, 16 * fl + 4, "#ff9e38");
        }
      }
    } else if (bs === "prism_prongs" || bs === "railgun" || bs === "tesla_prongs") {
      const [ex, ey] = muzzles.left;
      const [rx, ry] = muzzles.right;
      const isRail = bs === "railgun";
      const isTesla = bs === "tesla_prongs";
      const cDark = isTesla ? "#7a4822" : (isRail ? "#344258" : "#a8bed6");
      const cLit = isTesla ? "#d48846" : (isRail ? "#6c809e" : "#e8f4ff");
      const cHi = isTesla ? "#a88cff" : (isRail ? "#56b8ff" : "#5ef8ff");
      for (const side of [-1, 1]) {
        const bx = W * (side < 0 ? 0.20 : 0.80);
        const by = H * 0.72 + kickY * 0.4;
        const tx = isTesla ? (side < 0 ? ex : rx) : ex + side * 14;
        const ty = isTesla ? (side < 0 ? ey : ry) : ey + 4;
        drawTaperBarrel(bx, by, 14, tx, ty, 6, cDark, cLit, cHi);
        if (isTesla && gunner.muzzleFlash > 0.05) drawMuzzleStar2D(tx, ty, 13 * gunner.muzzleFlash + 4, "#a88cff");
      }
      if (!isTesla && gunner.muzzleFlash > 0.05) {
        drawMuzzleStar2D(ex, ey, 16 * gunner.muzzleFlash + 4, currentTurret.fireColor);
      }
    } else if (bs === "ion_petals") {
      // 4 unfolding gilded armored blast petals around central sky-piercing core!
      const [ex, ey] = muzzles.left;
      const open = 1 + gunner.muzzleFlash * 0.35;
      for (const [ox, oy] of [[-1, 0.8], [1, 0.8], [-1, -0.7], [1, -0.7]]) {
        drawTaperBarrel(
          W * 0.5 + ox * W * 0.36, H * 0.46 + oy * H * 0.28, 12,
          ex + ox * 24 * open, ey + oy * 14 * open, 5,
          "#284a7a", "#4874b0", "#f2c444"
        );
      }
      if (gunner.muzzleFlash > 0.05) drawMuzzleStar2D(ex, ey, 22 * gunner.muzzleFlash + 6, "#ffe466");
    } else if (bs === "emp_dish") {
      const [ex, ey] = muzzles.left;
      ctx.strokeStyle = "rgba(130, 184, 190, 0.75)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ex, ey, 54, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#40ffa8";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, ey, 48, 0, Math.PI * 2); ctx.stroke();
      for (const a of [0.7, 2.4, 3.9, 5.5]) {
        ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 52, ey + Math.sin(a) * 52); ctx.lineTo(ex, ey); ctx.stroke();
      }
      if (gunner.muzzleFlash > 0.05) drawMuzzleStar2D(ex, ey, 14 * gunner.muzzleFlash + 4, "#40ffa8");
    } else {
      // Massive centered wide-bore Plasma Mortar or Cryo Frost Nozzle!
      const [ex, ey] = muzzles.left;
      const isCryo = bs === "cryo_nozzle";
      drawTaperBarrel(
        W * 0.5 + sxOff * 0.4, H * 0.76 + kickY * 0.5, 34,
        ex, ey, 18,
        isCryo ? "#7bb4d8" : "#3b2428",
        isCryo ? "#d0eeff" : "#8c3230",
        isCryo ? "#94f6ff" : "#ff8830"
      );
      ctx.fillStyle = isCryo ? "#8cf6ff" : "#ff9630";
      ctx.beginPath(); ctx.arc(ex, ey, 11 + gunner.muzzleFlash * 6, 0, Math.PI * 2); ctx.fill();
      if (gunner.muzzleFlash > 0.05) drawMuzzleStar2D(ex, ey, 18 * gunner.muzzleFlash + 5, currentTurret.fireColor);
    }

    // Ejected spinning hot brass shell casings flying past the windshield!
    for (const sh of shells2D) {
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot);
      ctx.fillStyle = "#f8cc48";
      ctx.fillRect(-sh.size, -sh.size * 0.45, sh.size * 2, sh.size * 0.9);
      ctx.fillStyle = "#fff4b0";
      ctx.fillRect(-sh.size * 0.6, -sh.size * 0.2, sh.size, sh.size * 0.4);
      ctx.restore();
    }

    // 5. Armored Windshield Glass Tint, Specular Sheen & Holographic Targeting Reticle!
    ctx.fillStyle = cp.glassTint;
    ctx.fillRect(0, 0, W, H * 0.68);
    // Subtle diagonal glass reflections (sells sitting behind thick bulletproof glass!)
    ctx.strokeStyle = "rgba(215, 242, 255, 0.11)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, 14); ctx.lineTo(W * 0.27, H * 0.34);
    ctx.moveTo(W * 0.74, 16); ctx.lineTo(W * 0.82, H * 0.34);
    ctx.stroke();

    ctx.strokeStyle = cp.hudCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(aimPxX, aimPxY, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(aimPxX - 24, aimPxY); ctx.lineTo(aimPxX - 8, aimPxY);
    ctx.moveTo(aimPxX + 8, aimPxY); ctx.lineTo(aimPxX + 24, aimPxY);
    ctx.moveTo(aimPxX, aimPxY - 20); ctx.lineTo(aimPxX, aimPxY - 8);
    ctx.moveTo(aimPxX, aimPxY + 8); ctx.lineTo(aimPxX, aimPxY + 20);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(aimPxX) - 1, Math.round(aimPxY) - 1, 2, 2);

    ctx.font = 'bold 9px "Courier New", "Noto Sans TC", monospace';
    ctx.fillStyle = cp.hudCol;
    ctx.textAlign = "center";
    ctx.fillText(`方位 ${gunner.yawDeg >= 0 ? "+" : ""}${gunner.yawDeg}°  仰角 ${gunner.pitchDeg}°  擊墜 ${gunner.kills}`, W * 0.5, 22);

    // 6. Armored Cockpit Canopy Pillars & Overhead Bar (with recoil micro-shake!)
    const sw = Math.round(W * 0.11);
    ctx.fillStyle = cp.frameCol;
    ctx.fillRect(0, 0, W, 12);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sw + 18, 0); ctx.lineTo(sw, H * 0.68); ctx.lineTo(0, H * 0.68); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - sw - 18, 0); ctx.lineTo(W - sw, H * 0.68); ctx.lineTo(W, H * 0.68); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = cp.trimCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sw + 14, 12); ctx.lineTo(sw - 3, H * 0.68);
    ctx.moveTo(W - sw - 14, 12); ctx.lineTo(W - sw + 3, H * 0.68);
    ctx.stroke();

    // 7. Lower Armored Gunner Console & Live Instruments
    const dashY = Math.round(H * 0.65 + kickY * 0.45);
    ctx.fillStyle = cp.frameCol;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, dashY + 12);
    ctx.lineTo(W * 0.22, dashY);
    ctx.lineTo(W * 0.78, dashY);
    ctx.lineTo(W, dashY + 12);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = cp.frameHi;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dynamic Muzzle-Flash Interior Bounce Lighting onto Canopy Struts & Dashboard Brow!!
    if (gunner.muzzleFlash > 0.04) {
      ctx.save();
      ctx.globalAlpha = gunner.muzzleFlash * 0.72;
      ctx.strokeStyle = currentTurret.fireColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sw + 16, 12); ctx.lineTo(sw, H * 0.66);
      ctx.moveTo(W - sw - 16, 12); ctx.lineTo(W - sw, H * 0.66);
      ctx.moveTo(W * 0.22, dashY); ctx.lineTo(W * 0.78, dashY);
      ctx.stroke();
      ctx.restore();
    }

    // Left CRT: Live Heat & Weapon Power
    const mY = dashY + 12, mH = H - mY - 8;
    const lx = Math.round(W * 0.06), lw = Math.round(W * 0.24);
    ctx.fillStyle = "#061518";
    ctx.fillRect(lx, mY, lw, mH);
    ctx.strokeStyle = cp.trimCol;
    ctx.strokeRect(lx, mY, lw, mH);
    ctx.fillStyle = gunner.overheated ? "#ff4d5a" : cp.hudCol;
    ctx.textAlign = "left";
    ctx.fillText(gunner.overheated ? "砲管過熱冷卻中！" : "砲管溫度 HEAT", lx + 6, mY + 14);
    ctx.fillStyle = "#1c2e38";
    ctx.fillRect(lx + 6, mY + 20, lw - 12, 8);
    ctx.fillStyle = gunner.heat > 75 ? "#ff4d5a" : currentTurret.fireColor;
    ctx.fillRect(lx + 6, mY + 20, Math.round((lw - 12) * (gunner.heat / 100)), 8);
    ctx.fillStyle = cp.trimCol;
    ctx.fillText(`火力模式: ${currentTurret.weaponStyle.toUpperCase()}`, lx + 6, mY + 42);

    // Center CRT: Live Sweeping AA Radar showing real Zerg target positions!
    const cx = Math.round(W * 0.5), r = Math.max(18, Math.round(mH * 0.42)), cy = Math.round(mY + mH * 0.5);
    ctx.fillStyle = "#051a14";
    ctx.fillRect(cx - r - 24, mY, (r + 24) * 2, mH);
    ctx.strokeStyle = cp.trimCol;
    ctx.strokeRect(cx - r - 24, mY, (r + 24) * 2, mH);
    ctx.strokeStyle = cp.hudCol;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();
    const sweep = (time * 3.2) % (Math.PI * 2);
    ctx.strokeStyle = "#88ffd8";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r); ctx.stroke();
    for (const t of targets) {
      const bx = cx + (t.sx - 0.5) * r * 1.8;
      const by = cy + (t.sy - 0.35) * r * 1.8;
      ctx.fillStyle = "#ff4d5a";
      ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
    }

    // Right CRT: Live Barrel Elevation Indicator!
    const rx = Math.round(W * 0.70), rw = Math.round(W * 0.24);
    ctx.fillStyle = "#061518";
    ctx.fillRect(rx, mY, rw, mH);
    ctx.strokeStyle = cp.trimCol;
    ctx.strokeRect(rx, mY, rw, mH);
    const px = rx + Math.round(rw * 0.38), py = mY + mH - 12;
    ctx.fillStyle = cp.hudCol;
    ctx.fillRect(px - 14, py, 28, 5);
    ctx.fillRect(px - 8, py - 8, 16, 8);
    const eRad = (gunner.pitchDeg * Math.PI) / 180;
    ctx.strokeStyle = cp.trimCol;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px + 2, py - 6); ctx.lineTo(px + 2 + Math.cos(eRad) * 28, py - 6 - Math.sin(eRad) * 28); ctx.stroke();

    // 8. Animated Gunner Gloved Hands & Dual Control Grips moving with Mouse Aim + Muzzle Bounce Light!
    const tiltX = (gunner.aimX - 0.5) * 18;
    const tiltY = (gunner.aimY - 0.30) * 12 + kickY;
    for (const side of [-1, 1]) {
      const hx = Math.round(W * (side < 0 ? 0.29 : 0.71) + tiltX);
      const hy = Math.round(H * 0.85 + tiltY);
      ctx.strokeStyle = cp.frameHi;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(W * (side < 0 ? 0.26 : 0.74), H); ctx.lineTo(hx, hy - 12); ctx.stroke();
      ctx.fillStyle = gunner.firing ? "#ffffff" : currentTurret.fireColor;
      ctx.fillRect(hx - 4, hy - 16, 8, 5);
      ctx.fillStyle = "#2b3544";
      ctx.fillRect(hx - 11, hy - 5, 22, 16);
      ctx.fillStyle = "#4d5e75";
      ctx.fillRect(hx - 9, hy - 3, 18, 8);
      if (gunner.muzzleFlash > 0.05) {
        ctx.fillStyle = currentTurret.fireColor;
        ctx.globalAlpha = gunner.muzzleFlash * 0.6;
        ctx.fillRect(hx - 9, hy - 5, 18, 3);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = cp.trimCol;
      ctx.fillRect(hx - 10, hy + 10, 20, 3);
    }
  }

  // ============================================================================
  // Main Animation Loop
  // ============================================================================
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    time += dt;
    actionTime += dt;

    // Auto-demo cycles through all 8 turret actions!
    if (demoMode && viewMode === "3d") {
      demoTimer += dt;
      if (demoTimer > 2.4) {
        demoTimer = 0;
        demoActIdx = (demoActIdx + 1) % ACTIONS.length;
        triggerAction(ACTIONS[demoActIdx].key);
      }
    }

    // Update flying Zerg targets
    for (const t of targets) {
      t.angle += t.speed * dt;
      t.sx += t.vx * dt;
      t.sy += t.vy * dt;
      if (t.sx < 0.14 || t.sx > 0.86) t.vx *= -1;
      if (t.sy < 0.12 || t.sy > 0.44) t.vy *= -1;
      if (t.hitFlash > 0) t.hitFlash = Math.max(0, t.hitFlash - dt);
    }

    // Update cockpit weapon cooldown, dual barrel recoil, shake & heat
    gunner.fireCooldown = Math.max(0, gunner.fireCooldown - dt);
    gunner.muzzleFlash = Math.max(0, gunner.muzzleFlash - dt * 5.5);
    gunner.flashL = Math.max(0, gunner.flashL - dt * 6.5);
    gunner.flashR = Math.max(0, gunner.flashR - dt * 6.5);
    gunner.recoilKick = Math.max(0, gunner.recoilKick - dt * 6.5);
    gunner.recoilL = Math.max(0, gunner.recoilL - dt * 5.2);
    gunner.recoilR = Math.max(0, gunner.recoilR - dt * 5.2);
    gunner.shakeX *= Math.max(0, 1 - dt * 16);
    gunner.shakeY *= Math.max(0, 1 - dt * 16);
    if (gunner.firing) gunner.spinPhase += dt * 32;
    gunner.heat = Math.max(0, gunner.heat - dt * (gunner.overheated ? 26 : 16));
    if (gunner.overheated && gunner.heat < 25) gunner.overheated = false;
    if (viewMode === "cockpit" && gunner.firing && gunner.fireCooldown <= 0) {
      fireCockpitWeapon();
    }

    // Advance outbound 3D-perspective projectiles & detonate at target depth!
    for (let i = shots2D.length - 1; i >= 0; i--) {
      const sh = shots2D[i];
      sh.p += sh.speed * dt;
      if (sh.p >= 1) {
        if (sh.style === "flak") {
          bursts2D.push({ x: sh.tx, y: sh.ty, r: 8, maxR: 32, life: 0.45, col: "#3c3c46" });
          bursts2D.push({ x: sh.tx, y: sh.ty, r: 5, maxR: 22, life: 0.36, col: "#ff9e32" });
        } else if (sh.style === "plasma" || sh.style === "missile") {
          bursts2D.push({ x: sh.tx, y: sh.ty, r: 7, maxR: 30, life: 0.45, col: sh.col });
        }
        damageTargetsAt(sh.nx, sh.ny, sh.style);
        shots2D.splice(i, 1);
      }
    }
    for (let i = smoke2D.length - 1; i >= 0; i--) {
      const sm = smoke2D[i];
      sm.x += sm.vx * dt; sm.y += sm.vy * dt;
      sm.r += sm.grow * dt; sm.life -= dt;
      if (sm.life <= 0) smoke2D.splice(i, 1);
    }
    for (let i = shells2D.length - 1; i >= 0; i--) {
      const sh = shells2D[i];
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      sh.vy += 260 * dt; sh.rot += sh.vrot * dt; sh.life -= dt;
      if (sh.life <= 0) shells2D.splice(i, 1);
    }
    for (let i = rings2D.length - 1; i >= 0; i--) {
      const r = rings2D[i];
      r.r += (r.maxR - r.r) * dt * 8;
      r.life -= dt;
      if (r.life <= 0) rings2D.splice(i, 1);
    }
    for (let i = beams2D.length - 1; i >= 0; i--) {
      beams2D[i].life -= dt;
      if (beams2D[i].life <= 0) beams2D.splice(i, 1);
    }
    for (let i = bursts2D.length - 1; i >= 0; i--) {
      bursts2D[i].life -= dt;
      bursts2D[i].r += dt * 48;
      if (bursts2D[i].life <= 0) bursts2D.splice(i, 1);
    }

    // Update 3D Turret Articulated Pose according to Active Action
    pose.radarAngle += dt * 2.4;
    pose.explode = 0;
    pose.shake = 0;
    pose.recoilL = 0;
    pose.recoilR = 0;

    if (activeAction === "idle") {
      pose.yaw = Math.sin(time * 0.7) * 0.45;
      pose.pitch = 0.28 + Math.sin(time * 1.1) * 0.08;
      pose.petalOpen = 0.1;
    } else if (activeAction === "track") {
      pose.yaw = Math.sin(time * 2.2) * 1.35;
      pose.pitch = 0.42 + Math.cos(time * 2.2) * 0.18;
      pose.petalOpen = 0.25;
    } else if (activeAction === "elevate") {
      pose.yaw = Math.sin(time * 0.8) * 0.35;
      pose.pitch = 0.95 + Math.sin(time * 2.0) * 0.12;
      pose.petalOpen = 0.45;
    } else if (activeAction === "fire") {
      pose.yaw = Math.sin(time * 1.1) * 0.35;
      pose.pitch = 0.56;
      const r = Math.max(0, Math.sin(time * 24));
      pose.recoilL = r * 0.55;
      pose.recoilR = Math.max(0, -Math.sin(time * 24)) * 0.55;
      pose.spinAngle += dt * 16;
      pose.petalOpen = 0.8;
      pose.shake = 0.45;
    } else if (activeAction === "recoil") {
      pose.yaw = Math.sin(time * 1.6) * 0.65;
      pose.pitch = 0.64 + Math.sin(time * 3.0) * 0.1;
      pose.recoilL = (Math.sin(time * 32) * 0.5 + 0.5) * 0.68;
      pose.recoilR = (Math.sin(time * 32 + Math.PI) * 0.5 + 0.5) * 0.68;
      pose.spinAngle += dt * 24;
      pose.petalOpen = 0.95;
      pose.shake = 0.75;
    } else if (activeAction === "charge") {
      pose.yaw = 0.2;
      pose.pitch = 0.76;
      pose.petalOpen = 0.7 + Math.sin(time * 8) * 0.3;
      pose.shake = 0.3;
    } else if (activeAction === "overheat") {
      pose.yaw = -0.2;
      pose.pitch = 0.14;
      pose.petalOpen = 0.65;
      pose.shake = 0.2;
    } else if (activeAction === "damaged") {
      const cyc = (actionTime % 2.6) / 2.6;
      pose.explode = cyc < 0.6 ? Math.min(1, cyc * 2.2) : Math.max(0, 1 - (cyc - 0.6) * 2.5);
      pose.shake = 0.8;
    }

    if (viewMode === "cockpit") renderCockpitStage();
    else render3DStage();

    requestAnimationFrame(tick);
  }

  buildRoster();
  buildActions();
  selectTurret(0);
  requestAnimationFrame(tick);
})();
