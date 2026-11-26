// ============================================================================
// game.js — 星艦大空戰 (8-BIT Seamless Surface-to-Space Fleet Dogfight)
// Stage 1: 地表大氣層空戰 -> Stage 2: 突破大氣層 -> Stage 3: 太空星艦艦隊大決戰
// ============================================================================

(function () {
  const {
    v3, add, sub, scale, dot, cross, len, norm, lerp, lerpV3, clamp,
    qIdentity, qFromAxisAngle, qMul, qNorm, qBasis, qLookAt, qSlerp,
  } = window.M3;

  const EARTH_RADIUS = 1000;
  const SUN_DIR = norm(v3(0.55, 0.42, 0.72));
  const TAN_HALF_FOV = Math.tan((60 * Math.PI) / 360);

  // DOM Elements
  const glCanvas = document.getElementById("gl-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const fxCtx = fxCanvas.getContext("2d");

  const titleOverlay = document.getElementById("title-overlay");
  const missionOverlay = document.getElementById("mission-overlay");
  const missionGrid = document.getElementById("mission-grid");
  const liberationProgress = document.getElementById("liberation-progress");
  const hangarOverlay = document.getElementById("hangar-overlay");
  const hangarGrid = document.getElementById("hangar-grid");
  const currentShipPill = document.getElementById("current-ship-pill");
  const bestiaryOverlay = document.getElementById("bestiary-overlay");
  const bestiaryGrid = document.getElementById("bestiary-grid");
  const endOverlay = document.getElementById("end-overlay");
  const commsBar = document.getElementById("comms-bar");
  const commsSender = document.getElementById("comms-sender");
  const commsText = document.getElementById("comms-text");
  const bossBar = document.getElementById("boss-bar");
  const bossNameEl = document.getElementById("boss-name");
  const bossPctEl = document.getElementById("boss-pct");
  const bossFillEl = document.getElementById("boss-fill");

  const btnStart = document.getElementById("btn-start");
  const btnOpenHangarTitle = document.getElementById("btn-open-hangar-title");
  const btnCloseHangar = document.getElementById("btn-close-hangar");
  const btnHangar = document.getElementById("btn-hangar");
  const btnOpenMapTitle = document.getElementById("btn-open-map-title");
  const btnOpenBestiaryTitle = document.getElementById("btn-open-bestiary-title");
  const btnCloseBestiary = document.getElementById("btn-close-bestiary");
  const btnBestiary = document.getElementById("btn-bestiary");
  const btnOpenMapEnd = document.getElementById("btn-open-map-end");
  const btnCloseMap = document.getElementById("btn-close-map");
  const btnMissions = document.getElementById("btn-missions");
  const btnNextMission = document.getElementById("btn-next-mission");
  const btnRestart = document.getElementById("btn-restart");
  const btnCam = document.getElementById("btn-cam");
  const btnAutoLock = document.getElementById("btn-autolock");
  const btnNextTarget = document.getElementById("btn-next-target");
  const btnUTurn = document.getElementById("btn-uturn");
  const btn3DMode = document.getElementById("btn-3d-mode");
  const btnRoll = document.getElementById("btn-roll");
  const btnShield = document.getElementById("btn-shield");
  const btnBeam = document.getElementById("btn-beam");
  const btnEmp = document.getElementById("btn-emp");
  const btnOverdrive = document.getElementById("btn-overdrive");
  const btnZoneEarth = document.getElementById("btn-zone-earth");
  const btnZoneSpace = document.getElementById("btn-zone-space");
  const btnBoost = document.getElementById("btn-boost");
  const btnMute = document.getElementById("btn-mute");
  const btnToggleMenu = document.getElementById("btn-toggle-menu");
  const btnCloseDrawer = document.getElementById("btn-close-drawer");
  const dockMenuDrawer = document.getElementById("dock-menu-drawer");
  const btnToggleSkills = document.getElementById("btn-toggle-skills");
  const btnCamDrawer = document.getElementById("btn-cam-drawer");
  const btnZoneSpaceDrawer = document.getElementById("btn-zone-space-drawer");
  const mobileCombatUI = document.getElementById("mobile-combat-ui");
  const mobLaser = document.getElementById("mob-laser");
  const mobMissile = document.getElementById("mob-missile");
  const mobMissileNum = document.getElementById("mob-missile-num");
  const mobBoost = document.getElementById("mob-boost");
  const mobUTurn = document.getElementById("mob-uturn");
  const mobSkillsToggle = document.getElementById("mob-skills-toggle");
  const dockMission = document.getElementById("dock-mission");
  const dockScore = document.getElementById("dock-score");
  const touchPad = document.getElementById("touch-pad");
  const touchKnob = document.getElementById("touch-knob");

  const isCoarsePointer = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  // On mobile/narrow viewports, skills bar starts collapsed so it NEVER blocks the starship!
  let skillsPanelOpen = window.innerWidth > 860;

  function isMobileLayout() {
    return window.innerWidth <= 900 || isCoarsePointer;
  }

  function syncSkillsToggleUI() {
    if (btnToggleSkills) {
      btnToggleSkills.textContent = skillsPanelOpen ? "✦ 技能：開" : "✦ 技能";
      btnToggleSkills.classList.toggle("active", skillsPanelOpen);
    }
    if (mobSkillsToggle) {
      mobSkillsToggle.textContent = skillsPanelOpen ? "✕ 收合" : "✦ 技能";
      mobSkillsToggle.classList.toggle("active", skillsPanelOpen);
    }
  }

  function toggleSkillsPanel() {
    skillsPanelOpen = !skillsPanelOpen;
    syncSkillsToggleUI();
  }

  function toggleMenuDrawer(forceState) {
    if (!dockMenuDrawer) return;
    const willOpen = typeof forceState === "boolean"
      ? forceState
      : dockMenuDrawer.classList.contains("hidden");
    dockMenuDrawer.classList.toggle("hidden", !willOpen);
    if (btnToggleMenu) {
      btnToggleMenu.textContent = willOpen ? "✕ 收合" : "☰ 選單";
      btnToggleMenu.classList.toggle("active", willOpen);
    }
  }
  syncSkillsToggleUI();

  const battleHud = document.getElementById("battle-hud");
  const hudPlayerBox = document.getElementById("hud-player");
  const hudFlightBox = document.getElementById("hud-flight");
  const hudSkillsBox = document.getElementById("hud-skills");
  const hudShieldFill = document.getElementById("hud-shield-fill");
  const hudShieldVal = document.getElementById("hud-shield-val");
  const hudHpFill = document.getElementById("hud-hp-fill");
  const hudHpVal = document.getElementById("hud-hp-val");
  const hudMissilesEl = document.getElementById("hud-missiles");
  const hudShipNameEl = document.getElementById("hud-ship-name");
  const hudTargetBox = document.getElementById("hud-target");
  const hudTargetSprite = document.getElementById("hud-target-sprite");
  const hudTargetName = document.getElementById("hud-target-name");
  const hudTargetLock = document.getElementById("hud-target-lock");
  const hudTargetDist = document.getElementById("hud-target-dist");
  const hudTargetHpFill = document.getElementById("hud-target-hp-fill");
  const hudTargetAct = document.getElementById("hud-target-act");
  const hudTargetPct = document.getElementById("hud-target-pct");
  const hudSpeedEl = document.getElementById("hud-speed");
  const hudAltEl = document.getElementById("hud-alt");
  const hudZoneEl = document.getElementById("hud-zone");
  const hudBoostTag = document.getElementById("hud-boost-tag");
  const hudThrustFill = document.getElementById("hud-thrust-fill");
  const hudLockStateEl = document.getElementById("hud-lock-state");
  const hudDiffBadge = document.getElementById("hud-diff-badge");
  const btnDiff = document.getElementById("btn-diff");
  const titleDiffSelector = document.getElementById("title-diff-selector");
  const titleDiffDesc = document.getElementById("title-diff-desc");

  const hudSkillChips = {
    roll: document.getElementById("sk-roll"),
    uturn: document.getElementById("sk-uturn"),
    shield: document.getElementById("sk-shield"),
    beam: document.getElementById("sk-beam"),
    cloak: document.getElementById("sk-cloak"),
    emp: document.getElementById("sk-emp"),
    flares: document.getElementById("sk-flares"),
    overdrive: document.getElementById("sk-overdrive"),
  };

  const ZERG_ACT_TEXT = {
    move_up: "拍翼巡航",
    move_down: "拍翼巡航",
    shoot: "生體射擊!",
    missile: "孢子飛彈!",
    roll: "翻滾閃避",
    boost: "高速衝刺!",
    melee_dive: "俯衝斬擊!",
    shield_spawn: "護盾孵化!",
    hit: "受擊硬直",
    death: "爆散擊墜",
  };

  function updateBattleHudDOM(locked, boosting, alt) {
    if (!battleHud) return;
    if (gameMode === "title" || !player) {
      battleHud.classList.add("hidden");
      return;
    }
    battleHud.classList.remove("hidden");
    const isCockpit = viewMode === "cockpit";
    if (hudPlayerBox) hudPlayerBox.classList.toggle("hidden", isCockpit);
    if (hudFlightBox) hudFlightBox.classList.toggle("hidden", isCockpit);
    if (hudSkillsBox) hudSkillsBox.classList.toggle("hidden", isCockpit || !skillsPanelOpen);
    if (mobileCombatUI) {
      mobileCombatUI.classList.toggle("hidden", !isMobileLayout() || gameMode !== "playing");
    }
    if (mobMissileNum) mobMissileNum.textContent = String(player.missiles);

    // Player stats
    const shPct = Math.max(0, Math.min(100, Math.round((player.shield / Math.max(1, player.maxShield)) * 100)));
    const hpPct = Math.max(0, Math.min(100, Math.round((player.hp / Math.max(1, player.maxHp)) * 100)));
    hudShieldFill.style.width = shPct + "%";
    hudShieldVal.textContent = Math.ceil(player.shield);
    hudHpFill.style.width = hpPct + "%";
    hudHpFill.classList.toggle("low", hpPct <= 35);
    hudHpVal.textContent = Math.ceil(player.hp);
    hudMissilesEl.textContent = `飛彈 ${player.missiles}/${player.maxMissiles}`;
    hudShipNameEl.textContent = selectedShip.name;
    if (hudLockStateEl) {
      hudLockStateEl.textContent = !autoLockEnabled
        ? "火控：手動模式"
        : (locked ? (lockProgress >= 0.95 ? "火控：已鎖定" : "火控：追蹤中") : "火控：掃描中");
    }

    // Flight telemetry & thrust gauge
    hudSpeedEl.textContent = Math.round(player.speed * 12);
    if (hudThrustFill) {
      const thrustPct = Math.max(8, Math.min(100, Math.round((player.speed / 185) * 100)));
      hudThrustFill.style.width = thrustPct + "%";
    }
    hudAltEl.textContent = Math.max(0, Math.round(alt * 10)) + "m";
    const pName = currentMission.name || "地球";
    hudZoneEl.textContent = alt > 240 ? `${pName}・軌道` : (alt > 100 ? `${pName}・高空` : `${pName}・地表`);
    hudBoostTag.classList.toggle("hidden", !boosting);

    // Top-Center Locked Enemy Target Card
    if (locked && locked.alive) {
      hudTargetBox.classList.remove("hidden");
      const isFull = lockProgress >= 0.95;
      hudTargetBox.classList.toggle("locked", isFull);
      hudTargetName.textContent = locked.name;
      hudTargetLock.textContent = isFull ? "鎖定完成" : "自動追蹤中";
      hudTargetLock.classList.toggle("full", isFull);
      const dist = len(sub(locked.pos, player.pos));
      hudTargetDist.textContent = dist >= 100 ? (dist / 100).toFixed(1) + "km" : Math.round(dist * 10) + "m";
      const ePct = Math.max(0, Math.round((locked.hp / Math.max(1, locked.maxHp)) * 100));
      hudTargetHpFill.style.width = ePct + "%";
      hudTargetHpFill.classList.toggle("boss", !!locked.isBoss);
      hudTargetPct.textContent = ePct + "%";

      const actKey = locked.actionState || (Math.sin(time * 7 + locked.id) >= 0 ? "move_up" : "move_down");
      hudTargetAct.textContent = ZERG_ACT_TEXT[actKey] || "巡航中";

      const sheetSrc = locked.spriteKey && window.SpriteBank && window.SpriteBank.ZERG_ACTION_FILES
        ? window.SpriteBank.ZERG_ACTION_FILES[locked.spriteKey]
        : null;
      if (sheetSrc) {
        if (hudTargetSprite.dataset.src !== sheetSrc) {
          hudTargetSprite.dataset.src = sheetSrc;
          hudTargetSprite.style.backgroundImage = `url('${sheetSrc}')`;
        }
        const fIdx = (window.SpriteBank.ZERG_ACTION_INDEX && window.SpriteBank.ZERG_ACTION_INDEX[actKey]) || 0;
        hudTargetSprite.style.backgroundPosition = `${-(fIdx * 48)}px 0px`;
      }
    } else {
      hudTargetBox.classList.add("hidden");
    }

    // Bottom 8-Skill Cooldown Bar with live visual progress strip
    const skStates = {
      roll: { act: player.rollAnim && player.rollAnim.active, cd: player.rollAnim ? player.rollAnim.cd : 0, maxCd: 1.8 },
      uturn: { act: player.uturn && player.uturn.active, cd: player.uturn ? player.uturn.cd : 0, maxCd: 2.2 },
      shield: { act: player.shieldAnim && player.shieldAnim.active, cd: player.shieldAnim ? player.shieldAnim.cd : 0, maxCd: 8.0 },
      beam: { act: player.beamAnim && player.beamAnim.active, cd: player.beamAnim ? player.beamAnim.cd : 0, maxCd: 7.5 },
      cloak: { act: player.cloakAnim && player.cloakAnim.active, cd: player.cloakAnim ? player.cloakAnim.cd : 0, maxCd: 6.5 },
      emp: { act: false, cd: player.empCD || 0, maxCd: 6.0 },
      flares: { act: false, cd: player.flareCD || 0, maxCd: 2.8 },
      overdrive: { act: player.overdriveAnim && player.overdriveAnim.active, cd: player.overdriveAnim ? player.overdriveAnim.cd : 0, maxCd: 10.0 },
    };
    for (const [key, st] of Object.entries(skStates)) {
      const el = hudSkillChips[key];
      if (!el) continue;
      const ready = !st.act && st.cd <= 0.05;
      el.classList.toggle("active", !!st.act);
      el.classList.toggle("ready", ready);
      el.classList.toggle("cooling", !st.act && !ready);
      const stEl = el.querySelector(".sk-st");
      if (stEl) stEl.textContent = st.act ? "發動中" : (ready ? "就緒" : st.cd.toFixed(1) + "s");
      const progEl = el.querySelector(".sk-prog");
      if (progEl) {
        const pct = st.act ? 100 : (ready ? 100 : Math.max(0, Math.min(100, Math.round((1 - st.cd / st.maxCd) * 100))));
        progEl.style.width = pct + "%";
      }
    }
  }

  const planetRenderer = window.PlanetGL.create(glCanvas);

  // Pixel-art logical resolution (crisp 16-bit look + clear Traditional Chinese HUD)
  let pixW = 480;
  let pixH = 270;

  let lastNarrowLayout = window.innerWidth <= 860;
  function resize() {
    const wrap = document.getElementById("viewport-wrap");
    const rect = wrap.getBoundingClientRect();
    const aspect = Math.max(0.6, Math.min(2.4, rect.width / Math.max(1, rect.height)));
    pixH = rect.width < 600 ? 250 : 270;
    pixW = Math.round(pixH * aspect);
    glCanvas.width = pixW;
    glCanvas.height = pixH;
    fxCanvas.width = pixW;
    fxCanvas.height = pixH;
    const nowNarrow = window.innerWidth <= 860;
    if (nowNarrow !== lastNarrowLayout) {
      lastNarrowLayout = nowNarrow;
      skillsPanelOpen = !nowNarrow;
      syncSkillsToggleUI();
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // Input State
  const keys = {};
  let mouseFire = false;
  let touchBoost = false;
  let touchFire = false;
  const touchStick = { active: false, x: 0, y: 0, id: null };

  // Global Game State
  let nextEntityId = 1;
  let gameMode = "title"; // "title" | "playing" | "victory" | "gameover"
  let currentMission = window.SolarMissions.getById("earth");
  let clearedMissions = window.SolarMissions.loadCleared();
  let selectedShipId = window.SolarMissions.loadSelectedShipId();
  let selectedShip = window.SolarMissions.getShipById(selectedShipId);
  let difficultyId = window.SolarMissions.loadDifficultyId();
  let difficulty = window.SolarMissions.getDifficultyById(difficultyId);
  let playerShotSeq = 0;
  let viewMode = "third"; // "third" | "cockpit"

  function syncDifficultyUI() {
    if (btnDiff) {
      btnDiff.textContent = `難度：${difficulty.name}`;
      btnDiff.style.borderColor = difficulty.color;
      btnDiff.style.color = difficulty.color;
    }
    if (hudDiffBadge) {
      hudDiffBadge.textContent = difficulty.name;
      hudDiffBadge.style.borderColor = difficulty.color;
      hudDiffBadge.style.color = difficulty.color;
    }
    if (titleDiffSelector) {
      titleDiffSelector.querySelectorAll(".diff-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-diff") === difficulty.id);
      });
    }
    if (titleDiffDesc) {
      titleDiffDesc.textContent = `${difficulty.label}：${difficulty.desc}`;
    }
  }

  function setDifficulty(id, announce = true) {
    difficultyId = id;
    difficulty = window.SolarMissions.getDifficultyById(id);
    window.SolarMissions.saveDifficultyId(id);
    syncDifficultyUI();
    if (announce && gameMode === "playing") {
      showComms("作戰難度", `已切換為【${difficulty.label}】！${difficulty.desc}`, difficulty.id === "hell", 4);
    }
  }

  function cycleDifficulty() {
    const list = window.SolarMissions.DIFFICULTIES;
    const idx = list.findIndex((d) => d.id === difficulty.id);
    const next = list[(idx + 1) % list.length];
    setDifficulty(next.id, true);
  }
  syncDifficultyUI();
  let use3DStarships = true;
  let time = 0;
  let score = 0;
  let kills = 0;
  let capitalKills = 0;
  let stage = 1; // 1 = 地表大氣層空戰, 2 = 突破大氣層攔截, 3 = 太空艦隊決戰
  let commsTimer = 0;
  let lockBeepTimer = 0;
  let autoLockEnabled = true;
  let lockedTargetId = null;
  let lockProgress = 0;
  let camShake = 0;
  let crashAlertText = "";
  let crashAlertTimer = 0;
  let lastDownTapTime = 0;

  // World entities
  let player = null;
  let enemies = [];
  let friendlies = [];
  let projectiles = [];
  let particles = [];
  let rings = [];
  let ghosts = [];
  let camPos = v3(0, EARTH_RADIUS + 60, -25);
  let camQuat = qIdentity();

  function showComms(sender, text, isAlert = false, duration = 6.0) {
    commsSender.textContent = sender;
    commsSender.classList.toggle("alert", isAlert);
    commsText.textContent = text;
    commsBar.classList.remove("hidden");
    commsTimer = duration;
  }

  function createPlayer(inSpace) {
    const spec = selectedShip || window.SolarMissions.getShipById("tiny_fighter");
    const alt = inSpace ? 440 : 48;
    const pos = v3(0, EARTH_RADIUS + alt, 0);
    const q = qLookAt(v3(0, 0, 1), v3(0, 1, 0));
    return {
      id: nextEntityId++,
      shipSpec: spec,
      pos,
      quat: q,
      basis: qBasis(q),
      vel: v3(0, 0, spec.speed),
      speed: spec.speed,
      hp: spec.hp,
      maxHp: spec.hp,
      shield: spec.shield,
      maxShield: spec.shield,
      shieldDelay: 0,
      missiles: spec.missiles,
      maxMissiles: spec.missiles,
      missileRegen: 0,
      laserCD: 0,
      missileCD: 0,
      crashCD: 0,
      hitFlash: 0,
      rollVisual: 0,
      trailL: [],
      trailR: [],
      trailTimer: 0,
      uturn: {
        active: false,
        t: 0,
        dur: 0.78,
        cd: 0,
        maxCd: 2.2,
        startQuat: q,
        apexQuat: q,
        endQuat: q,
      },
      // 3D Volumetric Action States & Cooldowns
      rollAnim: { active: false, t: 0, dur: 0.62, dir: 1, cd: 0 },
      shieldAnim: { active: false, t: 0, dur: 3.2, cd: 0 },
      beamAnim: { active: false, t: 0, dur: 1.15, fired: false, cd: 0 },
      cloakAnim: { active: false, t: 0, dur: 3.0, cd: 0 },
      empCD: 0,
      flareCD: 0,
      overdriveAnim: { active: false, t: 0, dur: 3.6, cd: 0 },
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
        beamLen: 260,
        overdrive: 0,
      },
    };
  }

  function spawnShip(opts) {
    const q = qLookAt(opts.fwd || v3(0, 0, -1), norm(opts.pos));
    return {
      id: nextEntityId++,
      kind: opts.kind,
      name: opts.name,
      isEnemy: !!opts.isEnemy,
      isCapital: !!opts.isCapital,
      isBoss: !!opts.isBoss,
      model: opts.model,
      spriteKey: opts.spriteKey || null,
      spriteKind: opts.spriteKind || (opts.isEnemy ? "zerg" : "ship"),
      spriteWorldSize: opts.spriteWorldSize || null,
      radius: opts.radius || (opts.model && opts.model.radius) || 4,
      projCol: opts.projCol || null,
      scale: opts.scale || 1.0,
      pos: { ...opts.pos },
      quat: q,
      basis: qBasis(q),
      vel: v3(0, 0, 0),
      speed: opts.speed || 42,
      hp: opts.hp || 35,
      maxHp: opts.hp || 35,
      alive: true,
      hitFlash: 0,
      fireCD: 0.8 + Math.random() * 1.5,
      aiTimer: Math.random() * 4,
      orbitAlt: opts.orbitAlt || 50,
      trail: [],
      trailTimer: 0,
      scoreVal: opts.scoreVal || 150,
      spawnTimer: opts.isBoss ? 8 : 0,
    };
  }

  function spawnExplosion(pos, big, colorOverride) {
    const count = big ? 38 : 16;
    const palette = colorOverride || (big
      ? ["#ffffff", "#fff275", "#ff9f1c", "#ff4757", "#ff388c", "#6c7a89"]
      : ["#ffffff", "#ffe66d", "#ff7f50", "#ff4757"]);
    for (let i = 0; i < count; i++) {
      const dir = norm(v3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1));
      const spd = (big ? 28 : 14) + Math.random() * (big ? 95 : 42);
      particles.push({
        pos: { ...pos },
        vel: scale(dir, spd),
        life: (big ? 0.9 : 0.4) + Math.random() * (big ? 0.9 : 0.35),
        maxLife: big ? 1.8 : 0.75,
        size: (big ? 5 : 2.2) + Math.random() * (big ? 7 : 3.2),
        color: palette[Math.floor(Math.random() * palette.length)],
        ring: big && i < 3,
      });
    }
    window.SFX.playExplosion(big);
  }

  // ---- Solar System 9-Planet Mission Map & Bug Swarm Spawners ----
  function renderMissionMap() {
    liberationProgress.textContent = `太陽系解放：${clearedMissions.size} / ${window.SolarMissions.LIST.length} 行星`;
    missionGrid.innerHTML = "";

    window.SolarMissions.LIST.forEach((m) => {
      const isCleared = clearedMissions.has(m.id);
      const isEarthPriority = m.id === "earth" && !isCleared;

      const card = document.createElement("div");
      card.className = "mission-card" + (isCleared ? " cleared" : "") + (isEarthPriority ? " priority" : "");

      const statusText = isCleared ? "已解放 ✓" : (isEarthPriority ? "初始優先" : "蟲族入侵中");
      const statusCls = isCleared ? "cleared" : (isEarthPriority ? "priority" : "");

      const ringHtml = m.ringColor
        ? `<div class="planet-ring" style="border-color:${m.ringColor}"></div>`
        : "";

      card.innerHTML = `
        <div class="mission-card-top">
          <div class="planet-orb-wrap">
            <div class="planet-orb" style="background:${m.color}"></div>
            ${ringHtml}
          </div>
          <div class="mission-meta">
            <div class="mission-code">${m.code}</div>
            <div class="mission-name-row">
              <span class="mission-planet-name">${m.name}</span>
              <span class="mission-status ${statusCls}">${statusText}</span>
            </div>
          </div>
        </div>
        <div class="mission-title">${m.title}</div>
        <div class="mission-summary">${m.summary}</div>
        <div class="mission-actions">
          <button class="dock-btn accent" data-launch="${m.id}" data-space="0">▶ 地表出擊</button>
          <button class="dock-btn" data-launch="${m.id}" data-space="1">✦ 直攻軌道</button>
        </div>
      `;
      missionGrid.appendChild(card);
    });

    missionGrid.querySelectorAll("button[data-launch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-launch");
        const inSpace = btn.getAttribute("data-space") === "1";
        closeMissionMap();
        startMission(id, inSpace);
      });
    });
  }

  function openMissionMap() {
    renderMissionMap();
    missionOverlay.classList.remove("hidden");
  }

  function closeMissionMap() {
    missionOverlay.classList.add("hidden");
  }

  const BESTIARY_ACTIONS = [
    { key: "move", label: "移動拍翼", frame: 0 },
    { key: "shoot", label: "射擊", frame: 2 },
    { key: "missile", label: "發射飛彈", frame: 3 },
    { key: "roll", label: "翻滾", frame: 4 },
    { key: "boost", label: "加速推進", frame: 5 },
    { key: "melee_dive", label: "俯衝斬擊", frame: 6 },
    { key: "shield_spawn", label: "護盾孵化", frame: 7 },
    { key: "hit", label: "受擊硬直", frame: 8 },
    { key: "death", label: "空中爆散", frame: 9 },
    { key: "auto", label: "▶ 自動輪播", frame: 0 },
  ];
  let bestiaryActionMode = "move";
  let bestiaryAnimTimer = null;
  let bestiaryTick = 0;

  function applyBestiaryFrame() {
    const sprites = bestiaryGrid.querySelectorAll(".zerg-action-sprite");
    if (!sprites.length) return;
    let frameIdx = 0;
    if (bestiaryActionMode === "move") {
      frameIdx = bestiaryTick % 2; // 0=move_up, 1=move_down
    } else if (bestiaryActionMode === "auto") {
      frameIdx = bestiaryTick % 10;
    } else {
      const spec = BESTIARY_ACTIONS.find((a) => a.key === bestiaryActionMode);
      frameIdx = spec ? spec.frame : 0;
    }
    const posX = -(frameIdx * 64);
    sprites.forEach((el) => {
      el.style.backgroundPosition = `${posX}px 0px`;
    });
  }

  function renderBestiary() {
    const actBar = document.getElementById("bestiary-actions");
    if (actBar && actBar.children.length === 0) {
      BESTIARY_ACTIONS.forEach((a) => {
        const btn = document.createElement("button");
        btn.className = "bestiary-act-btn" + (a.key === bestiaryActionMode ? " active" : "");
        btn.textContent = a.label;
        btn.dataset.act = a.key;
        btn.addEventListener("click", () => {
          bestiaryActionMode = a.key;
          actBar.querySelectorAll(".bestiary-act-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.act === a.key);
          });
          applyBestiaryFrame();
        });
        actBar.appendChild(btn);
      });
    }
    if (bestiaryGrid.children.length > 0) {
      applyBestiaryFrame();
      return;
    }
    window.SolarMissions.ZERG_HIERARCHY.forEach((z) => {
      const isAct = z.status === "active";
      const sheetSrc = (window.SpriteBank && window.SpriteBank.ZERG_ACTION_FILES && window.SpriteBank.ZERG_ACTION_FILES[z.key])
        || z.icon;
      const card = document.createElement("div");
      card.className = "zerg-card" + (isAct ? " active-unit" : "");
      card.innerHTML = `
        <div class="zerg-icon-wrap">
          <div class="zerg-action-sprite" style="background-image:url('${sheetSrc}')" title="#${z.no} ${z.name} 3D 10-Action Sheet"></div>
        </div>
        <div class="zerg-card-body">
          <div class="zerg-card-head">
            <div class="zerg-title">#${z.no} ${z.name}<span>${z.en} · ${z.role}</span></div>
            <div class="zerg-badge ${isAct ? "active" : ""}">${isAct ? "3D空戰實裝" : "空戰預備兵種"}</div>
          </div>
          <div class="zerg-desc">${z.desc}</div>
        </div>
      `;
      bestiaryGrid.appendChild(card);
    });
    applyBestiaryFrame();
  }

  function openBestiary() {
    renderBestiary();
    bestiaryOverlay.classList.remove("hidden");
    if (!bestiaryAnimTimer) {
      bestiaryAnimTimer = setInterval(() => {
        bestiaryTick++;
        applyBestiaryFrame();
      }, 360);
    }
  }

  function closeBestiary() {
    bestiaryOverlay.classList.add("hidden");
    if (bestiaryAnimTimer) {
      clearInterval(bestiaryAnimTimer);
      bestiaryAnimTimer = null;
    }
  }

  // ---- 聯邦星艦機庫（9 款自製 8-BIT 星艦選擇） ----
  function selectStarship(shipId) {
    selectedShipId = shipId;
    selectedShip = window.SolarMissions.getShipById(shipId);
    window.SolarMissions.saveSelectedShipId(shipId);
    if (currentShipPill) currentShipPill.textContent = `目前座駕：${selectedShip.name}`;
    if (player && gameMode === "playing") {
      const hpRatio = player.hp / Math.max(1, player.maxHp);
      const shRatio = player.shield / Math.max(1, player.maxShield);
      player.shipSpec = selectedShip;
      player.maxHp = selectedShip.hp;
      player.hp = Math.max(20, Math.round(selectedShip.hp * hpRatio));
      player.maxShield = selectedShip.shield;
      player.shield = Math.round(selectedShip.shield * shRatio);
      player.maxMissiles = selectedShip.missiles;
      player.missiles = Math.min(player.maxMissiles, Math.max(player.missiles, Math.ceil(player.maxMissiles * 0.5)));
      showComms("聯邦船塢", `座駕已切換為「${selectedShip.no}. ${selectedShip.name}」(${selectedShip.role})！`, false, 4);
    }
    renderHangar();
  }

  function renderHangar() {
    if (!hangarGrid) return;
    if (currentShipPill) currentShipPill.textContent = `目前座駕：${selectedShip.name}`;
    hangarGrid.innerHTML = "";
    window.SolarMissions.STARSHIPS.forEach((s) => {
      const isSel = s.id === selectedShip.id;
      const card = document.createElement("div");
      card.className = "ship-card" + (isSel ? " selected" : "");
      card.innerHTML = `
        <div class="ship-card-top">
          <div class="ship-thumb-wrap">
            <img src="${s.icon}" alt="${s.name}" class="ship-thumb" />
          </div>
          <div class="ship-meta">
            <div class="ship-no">${s.no}. ${s.en}</div>
            <div class="ship-name">${s.name}</div>
            <div class="ship-role">${s.role}</div>
          </div>
        </div>
        <div class="ship-stats">
          <div>護盾 <strong>${s.shield}</strong></div>
          <div>裝甲 <strong>${s.hp}</strong></div>
          <div>火力 <strong>${s.laserDmg}</strong></div>
          <div>飛彈 <strong>${s.missiles}發 (×${s.missileSalvo || 1}齊射)</strong></div>
        </div>
        <div class="ship-ability-box">
          <div>主砲：<strong>${s.barrageName || "脈衝雷射"}</strong></div>
          <div>K 特技：<strong>${s.specialName || "超載齊射"}</strong> — ${s.specialDesc || ""}</div>
        </div>
        <div class="ship-desc">${s.desc}</div>
        <button class="dock-btn ${isSel ? "active" : "accent"}" data-pick-ship="${s.id}">
          ${isSel ? "✓ 目前駕駛中" : "▶ 選擇此星艦駕駛"}
        </button>
      `;
      hangarGrid.appendChild(card);
    });
    hangarGrid.querySelectorAll("button[data-pick-ship]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectStarship(btn.getAttribute("data-pick-ship"));
      });
    });
  }

  function openHangar() {
    renderHangar();
    hangarOverlay.classList.remove("hidden");
  }

  function closeHangar() {
    hangarOverlay.classList.add("hidden");
  }

  function spawnZergUnit(zergKey, pos, fwd, orbitAlt, missionOrder, overrideOpts = {}) {
    const z = window.SolarMissions.getZergByKey(zergKey);
    const isCap = !!z.isCapital || !!overrideOpts.isCapital;
    const isBoss = !!z.isBoss || !!overrideOpts.isBoss;
    const fallbackModel = isBoss
      ? window.Models.bugOverlordBoss
      : (isCap ? window.Models.bugHiveCruiser : (zergKey === "zerg_08" ? window.Models.bugMantis : window.Models.bugDrone));
    const hpBase = Math.round((overrideOpts.hp || (z.hp + missionOrder * (isCap ? 22 : 4))) * difficulty.enemyHpMul);
    const sc = overrideOpts.scale || z.scale || 1.25;
    return spawnShip({
      kind: zergKey,
      name: overrideOpts.name || z.name,
      isEnemy: true,
      isCapital: isCap,
      isBoss,
      model: fallbackModel,
      spriteKind: "zerg",
      spriteKey: z.key,
      spriteWorldSize: isBoss ? 86 : (isCap ? 52 : (zergKey === "zerg_08" ? 18 : 11.5)),
      radius: z.radius || 4.2,
      projCol: z.projCol,
      scale: sc,
      pos,
      fwd,
      speed: (overrideOpts.speed || (z.speed + missionOrder * 1.1)) * difficulty.enemySpeedMul,
      hp: Math.max(12, hpBase),
      orbitAlt,
      scoreVal: Math.round((overrideOpts.scoreVal || z.score || 220) * difficulty.scoreMul),
    });
  }

  function spawnStage1Surface() {
    stage = 1;
    enemies = [];
    friendlies = [];
    projectiles = [];
    const m = currentMission;
    dockMission.textContent = `${m.name} · 階段一 地表蟲群`;
    bossBar.classList.add("hidden");

    const up = norm(player.pos);
    const fwd = norm(sub(player.basis.fwd, scale(up, dot(player.basis.fwd, up))));
    const right = norm(cross(up, fwd));

    const droneCount = Math.max(4, Math.round(m.surfaceWave.drones * difficulty.enemyCountMul));
    const mantisCount = Math.max(1, Math.round(m.surfaceWave.mantis * (difficulty.id === "hell" ? 1.5 : 1.0)));
    const surfPool = m.surfaceTypes || ["zerg_05", "zerg_02", "zerg_01"];
    const heavyKey = m.surfaceHeavy || "zerg_08";

    // 地表蟲族空中突擊群（依行星輪替出動 01浮空幼蟲～05飛螳）
    for (let i = 0; i < droneCount; i++) {
      const ang = (i / droneCount) * Math.PI * 2;
      const dist = 155 + (i % 3) * 60;
      const alt = 30 + (i % 4) * 14;
      const pDir = norm(add(
        scale(up, EARTH_RADIUS),
        add(scale(fwd, Math.cos(ang) * dist + 145), scale(right, Math.sin(ang) * dist))
      ));
      const zKey = surfPool[i % surfPool.length];
      enemies.push(spawnZergUnit(zKey, scale(pDir, EARTH_RADIUS + alt), scale(fwd, -1), alt, m.order));
    }

    // 王蟲空天運兵氣囊群 (#08)
    for (let i = 0; i < mantisCount; i++) {
      const side = (i % 2 === 0 ? -1 : 1) * (80 + Math.floor(i / 2) * 55);
      const pDir = norm(add(
        scale(up, EARTH_RADIUS),
        add(scale(fwd, 250 + i * 25), scale(right, side))
      ));
      enemies.push(spawnZergUnit(heavyKey, scale(pDir, EARTH_RADIUS + 56), scale(fwd, -1), 56, m.order));
    }

    // 聯邦護衛中隊（使用自製 8-BIT 微型戰機 / 巡防艦 / 隱形艦！）
    const wingSpecs = ["tiny_fighter", "frigate", "stealth_vessel"];
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 26;
      const pos = add(player.pos, add(scale(right, side), scale(fwd, -15 + i * 8)));
      const wSpec = window.SolarMissions.getShipById(wingSpecs[i % wingSpecs.length]);
      friendlies.push(spawnShip({
        kind: "friendlyFighter",
        name: `聯邦${wSpec.name} 0${i + 1}`,
        isEnemy: false,
        model: window.Models.getStarship(wSpec.id),
        spriteKind: "ship",
        spriteKey: wSpec.id,
        spriteWorldSize: 10.5,
        radius: 3.4,
        scale: 1.0,
        pos,
        fwd,
        speed: 48,
        hp: 85,
        orbitAlt: 48,
      }));
    }

    showComms(`${m.name}防禦總部`, m.stage1Comms, true, 7.5);
  }

  function spawnStage2Ascent() {
    stage = 2;
    const m = currentMission;
    dockMission.textContent = `${m.name} · 階段二 突破軌道`;
    window.SFX.playStageFanfare();

    const up = norm(player.pos);
    const refRight = Math.abs(up.y) < 0.9 ? norm(cross(up, v3(0, 1, 0))) : v3(1, 0, 0);
    const refFwd = norm(cross(refRight, up));
    const pool = m.spaceEscortTypes || ["zerg_05", "zerg_03"];

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const pos = add(scale(up, EARTH_RADIUS + 290 + i * 18), add(scale(refRight, Math.cos(a) * 90), scale(refFwd, Math.sin(a) * 90)));
      enemies.push(spawnZergUnit(pool[i % pool.length], pos, scale(refFwd, -1), 320, m.order));
    }

    showComms(`${m.name}防禦總部`, `${m.stage2Comms}（也可點擊「躍遷軌道」）`, false, 9);
  }

  function spawnStage3SpaceFleet() {
    stage = 3;
    const m = currentMission;
    dockMission.textContent = `${m.name} · 階段三 軌道巢母戰`;
    window.SFX.playStageFanfare();

    const up = norm(player.pos);
    let fwd = sub(player.basis.fwd, scale(up, dot(player.basis.fwd, up)));
    if (len(fwd) < 0.1) fwd = Math.abs(up.y) < 0.9 ? norm(cross(up, v3(0, 1, 0))) : v3(1, 0, 0);
    else fwd = norm(fwd);
    const right = norm(cross(up, fwd));

    const battleCenter = add(scale(up, EARTH_RADIUS + 460), scale(fwd, 280));

    // 聯邦太空主力艦隊（使用自製 8-BIT 主力艦／戰列艦／巡洋艦／驅逐艦／航空母艦／科學艦！）
    friendlies = friendlies.filter((f) => f.alive);
    const fleetKeys = m.friendlyFleet || ["cruiser", "battleship"];
    const flankLanes = [-155, 155, -265, 265];
    for (let i = 0; i < fleetKeys.length; i++) {
      const shipSpec = window.SolarMissions.getShipById(fleetKeys[i]);
      const side = flankLanes[i % flankLanes.length];
      const offset = add(scale(right, side), add(scale(fwd, -180 - Math.floor(i / 2) * 55), scale(up, (i % 2 === 0 ? -24 : 32))));
      friendlies.push(spawnShip({
        kind: "friendlyCruiser",
        name: `聯邦${shipSpec.name}`,
        isEnemy: false,
        isCapital: true,
        model: window.Models.getStarship(shipSpec.id),
        spriteKind: "ship",
        spriteKey: shipSpec.id,
        spriteWorldSize: 64,
        radius: 22,
        scale: 5.2,
        pos: add(battleCenter, offset),
        fwd: fwd,
        speed: 6,
        hp: 950,
        orbitAlt: 460,
      }));
    }

    // 聯邦護衛機中隊增援
    const wingKeys = ["tiny_fighter", "frigate", "stealth_vessel", "destroyer"];
    for (let i = 0; i < 4; i++) {
      const wSpec = window.SolarMissions.getShipById(wingKeys[i % wingKeys.length]);
      friendlies.push(spawnShip({
        kind: "friendlyFighter",
        name: `聯邦${wSpec.name}`,
        isEnemy: false,
        model: window.Models.getStarship(wSpec.id),
        spriteKind: "ship",
        spriteKey: wSpec.id,
        spriteWorldSize: 11,
        radius: 3.6,
        scale: 1.05,
        pos: add(player.pos, add(scale(right, (i - 1.5) * 35), scale(fwd, 25))),
        fwd,
        speed: 58,
        hp: 95,
        orbitAlt: 460,
      }));
    }

    // 軌道巨型蟲族護衛艦隊（06空巢百生蟲 / 07天空雷獸 / 09浮游感染蟲！）
    const capKeys = m.spaceCruisers || ["zerg_06", "zerg_09"];
    const bugCruiserCount = m.spaceWave.cruisers || capKeys.length;
    for (let i = 0; i < bugCruiserCount; i++) {
      const zKey = capKeys[i % capKeys.length];
      const zSpec = window.SolarMissions.getZergByKey(zKey);
      const side = (i - (bugCruiserCount - 1) * 0.5) * 175;
      const offset = add(scale(right, side), add(scale(fwd, 95 + (i % 2) * 30), scale(up, i % 2 === 0 ? 25 : -28)));
      enemies.push(spawnZergUnit(zKey, add(battleCenter, offset), scale(fwd, -1), 460, m.order, {
        name: `${zSpec.name} 0${i + 1}`,
        isCapital: true,
      }));
    }

    // 10 蟲巢領主 BROOD LORD — 軌道終極 BOSS
    const bossPos = add(battleCenter, add(scale(fwd, 225), scale(up, 18)));
    enemies.push(spawnZergUnit("zerg_10", bossPos, scale(fwd, -1), 480, m.order, {
      name: m.spaceWave.bossName,
      isCapital: true,
      isBoss: true,
      hp: m.spaceWave.bossHp,
    }));

    // 蟲族親衛空戰群
    const escorts = m.spaceWave.escorts || 6;
    const escPool = m.spaceEscortTypes || ["zerg_05", "zerg_02"];
    for (let i = 0; i < escorts; i++) {
      const a = (i / escorts) * Math.PI * 2;
      const ePos = add(bossPos, add(scale(right, Math.cos(a) * 95), scale(up, Math.sin(a) * 58)));
      enemies.push(spawnZergUnit(escPool[i % escPool.length], ePos, scale(fwd, -1), 470, m.order));
    }

    bossNameEl.textContent = m.spaceWave.bossName;
    bossBar.classList.remove("hidden");
    showComms("緊急警報", m.stage3Comms, true, 8.5);
  }

  function startMission(missionId, startInSpace) {
    window.SFX.ensure();
    currentMission = window.SolarMissions.getById(missionId);
    score = 0;
    kills = 0;
    capitalKills = 0;
    particles = [];
    projectiles = [];
    rings = [];
    ghosts = [];
    enemies = [];
    friendlies = [];

    player = createPlayer(startInSpace);
    lockedTargetId = null;
    lockProgress = 0;
    camShake = 0;
    crashAlertTimer = 0;
    camPos = sub(player.pos, scale(player.basis.fwd, 14));
    camQuat = { ...player.quat };

    gameMode = "playing";
    titleOverlay.classList.add("hidden");
    missionOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");

    if (startInSpace) {
      spawnStage3SpaceFleet();
    } else {
      spawnStage1Surface();
    }
  }

  function startNewGame(startInSpace) {
    startMission(currentMission ? currentMission.id : "earth", startInSpace);
  }

  function warpToZone(toSpace) {
    if (gameMode !== "playing") {
      startNewGame(toSpace);
      return;
    }
    window.SFX.ensure();
    window.SFX.playMissile();
    const up = norm(player.pos);
    let fwd = sub(player.basis.fwd, scale(up, dot(player.basis.fwd, up)));
    if (len(fwd) < 0.1) fwd = v3(0, 0, 1);
    else fwd = norm(fwd);

    if (toSpace) {
      player.pos = scale(up, EARTH_RADIUS + 440);
      player.quat = qLookAt(fwd, up);
      player.basis = qBasis(player.quat);
      player.trailL = [];
      player.trailR = [];
      if (stage < 3) {
        spawnStage3SpaceFleet();
      } else {
        showComms(`${currentMission.name}防禦總部`, `已躍遷至${currentMission.name}軌道太空艦隊戰區！`, false, 4);
      }
    } else {
      player.pos = scale(up, EARTH_RADIUS + 48);
      player.quat = qLookAt(fwd, up);
      player.basis = qBasis(player.quat);
      player.trailL = [];
      player.trailR = [];
      if (stage !== 1) {
        spawnStage1Surface();
      } else {
        showComms(`${currentMission.name}防禦總部`, `已重返${currentMission.name}地表空戰區！`, false, 4);
      }
    }
  }

  // ---- Auto-Lock, 180° U-Turn & Weapons ----
  function getLockedTarget() {
    if (!autoLockEnabled || !lockedTargetId) return null;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].id === lockedTargetId && enemies[i].alive) return enemies[i];
    }
    return null;
  }

  function findBestLockTarget(allowAnyDir = true) {
    if (!autoLockEnabled) return null;
    let bestFront = null;
    let bestFrontScore = Infinity;
    let nearestAny = null;
    let nearestDist = Infinity;
    const fwd = player.basis.fwd;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const toE = sub(e.pos, player.pos);
      const d = len(toE);
      if (d > 1600 || d < 2) continue;
      if (d < nearestDist) {
        nearestDist = d;
        nearestAny = e;
      }
      const dir = scale(toE, 1 / d);
      const align = dot(fwd, dir);
      if (align >= 0.65) {
        const metric = (1.0 - align) * 420 + d * 0.11 - (e.isCapital ? 22 : 0);
        if (metric < bestFrontScore) {
          bestFrontScore = metric;
          bestFront = e;
        }
      }
    }
    return bestFront || (allowAnyDir ? nearestAny : null);
  }

  function updateAutoLock(dt) {
    if (!autoLockEnabled) {
      lockedTargetId = null;
      lockProgress = 0;
      return null;
    }

    let target = getLockedTarget();
    if (!target || len(sub(target.pos, player.pos)) > 1700) {
      target = findBestLockTarget(true);
      lockedTargetId = target ? target.id : null;
      lockProgress = 0;
    }

    if (!target) {
      lockProgress = 0;
      return null;
    }

    const toT = sub(target.pos, player.pos);
    const d = len(toT);
    const align = dot(player.basis.fwd, scale(toT, 1 / (d || 1)));

    // If current locked target went behind us and another enemy is squarely in front, auto-switch
    if (align < 0.35 && !player.uturn.active) {
      const frontCandidate = findBestLockTarget(false);
      if (frontCandidate && frontCandidate.id !== target.id) {
        target = frontCandidate;
        lockedTargetId = target.id;
        lockProgress = 0.25;
      }
    }

    const prevProg = lockProgress;
    if (align > 0.72 && d < 1250) {
      lockProgress = Math.min(1.0, lockProgress + dt * 2.2);
      if (prevProg < 0.95 && lockProgress >= 0.95) {
        window.SFX.playLockComplete();
      }
    } else {
      lockProgress = Math.max(0.15, lockProgress - dt * 1.4);
    }

    return target;
  }

  function toggleAutoLock() {
    autoLockEnabled = !autoLockEnabled;
    if (!autoLockEnabled) {
      lockedTargetId = null;
      lockProgress = 0;
    } else if (player) {
      const t = findBestLockTarget(true);
      lockedTargetId = t ? t.id : null;
      lockProgress = 0.35;
    }
    btnAutoLock.textContent = autoLockEnabled ? "自動鎖定：開" : "自動鎖定：關";
    btnAutoLock.classList.toggle("active", autoLockEnabled);
    if (gameMode === "playing") {
      showComms("火控系統", autoLockEnabled ? "自動鎖定已開啟：系統將自動追蹤並鎖定敵艦。" : "自動鎖定已關閉：切換為手動瞄準模式。", false, 3);
    }
  }

  function cycleNextTarget() {
    if (gameMode !== "playing" || !player) return;
    if (!autoLockEnabled) toggleAutoLock();
    const alive = enemies
      .filter((e) => e.alive)
      .sort((a, b) => len(sub(a.pos, player.pos)) - len(sub(b.pos, player.pos)));
    if (alive.length === 0) return;
    const idx = alive.findIndex((e) => e.id === lockedTargetId);
    const next = alive[(idx + 1) % alive.length];
    lockedTargetId = next.id;
    lockProgress = 0.35;
    window.SFX.playLockBeep();
    showComms("火控系統", `切換鎖定目標：${next.name}`, false, 2.5);
  }

  function triggerUTurn() {
    if (gameMode !== "playing" || !player) return;
    const ut = player.uturn;
    if (ut.active || ut.cd > 0) return;

    window.SFX.ensure();
    window.SFX.playUTurn();

    const p = player;
    const upLocal = norm(p.pos);
    let endFwd = scale(p.basis.fwd, -1);

    // If auto-lock has a target off-axis or behind, snap the 180° U-turn directly onto that target!
    const locked = getLockedTarget();
    if (locked && locked.alive) {
      const toT = norm(sub(locked.pos, p.pos));
      if (dot(p.basis.fwd, toT) < 0.72) {
        endFwd = toT;
      }
    }

    // Ensure exit heading doesn't dive straight into Earth when flying low
    const alt = len(p.pos) - EARTH_RADIUS;
    if (alt < 75 && dot(endFwd, upLocal) < -0.1) {
      endFwd = norm(sub(endFwd, scale(upLocal, dot(endFwd, upLocal) - 0.12)));
    }

    // Apex orientation: steep vertical climb (~100 deg nose-up loop)
    const apexQuat = qNorm(qMul(p.quat, qFromAxisAngle(v3(1, 0, 0), -Math.PI * 0.56)));
    const endQuat = qLookAt(endFwd, upLocal);

    ut.active = true;
    ut.t = 0;
    ut.startQuat = { ...p.quat };
    ut.apexQuat = apexQuat;
    ut.endQuat = endQuat;
  }

  function addWorldRing(pos, axisA, axisB, startR, growSpd, life, color, width = 2) {
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

  function triggerBarrelRoll(dirSign) {
    if (gameMode !== "playing" || !player) return;
    const ra = player.rollAnim;
    if (ra.active || ra.cd > 0) return;
    window.SFX.ensure();
    window.SFX.playBarrelRoll();
    ra.active = true;
    ra.t = 0;
    ra.dir = dirSign || -ra.dir;
  }

  function triggerShieldDome() {
    if (gameMode !== "playing" || !player) return;
    const sa = player.shieldAnim;
    if (sa.active || sa.cd > 0) return;
    window.SFX.ensure();
    window.SFX.playShield();
    sa.active = true;
    sa.t = 0;
    player.shield = Math.min(player.maxShield, player.shield + Math.round(player.maxShield * 0.45));
    addWorldRing(player.pos, player.basis.right, player.basis.fwd, 4, 38, 0.55, "#6cf7ff", 2);
    showComms("護盾系統", "3D 能量護盾穹頂展開！吸收傷害並大幅回復護盾！", false, 2.8);
  }

  function triggerNovaBeam() {
    if (gameMode !== "playing" || !player) return;
    const ba = player.beamAnim;
    if (ba.active || ba.cd > 0) return;
    window.SFX.ensure();
    window.SFX.playCharge();
    ba.active = true;
    ba.t = 0;
    ba.fired = false;
  }

  function triggerCloakBlink() {
    if (gameMode !== "playing" || !player) return;
    const ca = player.cloakAnim;
    if (ca.active || ca.cd > 0) return;
    window.SFX.ensure();
    window.SFX.playCloak();
    ca.active = true;
    ca.t = 0;
    const pSpec = player.shipSpec || selectedShip;
    const pModel = window.Models.getStarship(pSpec.id);
    ghosts.push({ pos: { ...player.pos }, basis: { ...player.basis }, model: pModel, scale: pSpec.scale || 1, life: 0.65, maxLife: 0.65 });
    // Phase Blink dash forward + slight side shift
    player.pos = add(player.pos, add(scale(player.basis.fwd, 26), scale(player.basis.right, 10)));
    showComms("匿蹤系統", "光學匿蹤與相位閃現啟動！已脫離敵方火力鎖定！", false, 2.6);
  }

  function triggerEMP() {
    if (gameMode !== "playing" || !player || player.empCD > 0) return;
    window.SFX.ensure();
    window.SFX.playEMP();
    player.empCD = 6.0;
    addWorldRing(player.pos, player.basis.right, player.basis.fwd, 5, 130, 0.85, "#5ef2ff", 3);
    addWorldRing(player.pos, player.basis.right, player.basis.up, 5, 115, 0.78, "#b872ff", 2);
    // Destroy incoming enemy projectiles within 130 units & shock nearby enemies
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].isEnemy && len(sub(projectiles[i].pos, player.pos)) < 140) {
        projectiles.splice(i, 1);
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      if (len(sub(e.pos, player.pos)) < 145) {
        damageShip(e, 45, true);
      }
    }
    showComms("電子戰系統", "EMP 電磁脈衝震波釋放！清除周邊敵火並癱瘓蟲群！", false, 2.8);
  }

  function triggerFlares() {
    if (gameMode !== "playing" || !player || player.flareCD > 0) return;
    window.SFX.ensure();
    window.SFX.playFlare();
    player.flareCD = 2.8;
    const b = player.basis;
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        particles.push({
          pos: add(player.pos, add(scale(b.right, s * 2.0), scale(b.fwd, -2.5))),
          vel: add(scale(b.right, s * (16 + Math.random() * 14)), add(scale(b.up, -8 + Math.random() * 12), scale(b.fwd, -14))),
          life: 1.2 + Math.random() * 0.4,
          maxLife: 1.6,
          size: 3.0,
          color: k % 2 === 0 ? "#fff3a6" : "#ff9f1c",
        });
      }
    }
    // Deflect nearby enemy bolts
    for (let i = 0; i < projectiles.length; i++) {
      const pr = projectiles[i];
      if (pr.isEnemy && len(sub(pr.pos, player.pos)) < 85) {
        pr.dir = norm(add(pr.dir, scale(b.up, 0.7)));
      }
    }
  }

  // Helper: spawn angled player plasma bolt / capital barrage shell
  function spawnPlayerBolt(b, pos, aimDir, yawOff, pitchOff, opts) {
    const dir = norm(add(aimDir, add(scale(b.right, yawOff), scale(b.up, pitchOff))));
    projectiles.push({
      pos,
      dir,
      speed: opts.speed || 365,
      life: opts.life || 1.8,
      isEnemy: false,
      isMissile: !!opts.isMissile,
      isCapital: !!opts.isCapital,
      target: opts.target || null,
      damage: opts.damage || 16,
      color: opts.color || "#38f2ff",
      coreColor: opts.coreColor || "#ffffff",
    });
  }

  // Helper: distribute multi-target homing missiles across locked + nearby alive enemies!
  function launchMultiMissiles(count, dmgPerMissile, color = "#ffbe0b") {
    const b = player.basis;
    const spec = player.shipSpec || selectedShip;
    const sc = spec.scale || 1.0;
    const locked = getLockedTarget();
    const alive = enemies
      .filter((e) => e.alive && len(sub(e.pos, player.pos)) < 1400)
      .sort((a, c) => len(sub(a.pos, player.pos)) - len(sub(c.pos, player.pos)));
    const targets = [];
    if (locked && locked.alive) targets.push(locked);
    for (let i = 0; i < alive.length; i++) {
      if (!targets.includes(alive[i])) targets.push(alive[i]);
    }
    for (let i = 0; i < count; i++) {
      const fan = count > 1 ? ((i / (count - 1)) - 0.5) * 0.55 : 0;
      const upOff = (i % 2 === 0 ? 0.12 : -0.10);
      const muzzle = add(
        player.pos,
        add(scale(b.right, fan * 8 * sc), add(scale(b.up, -0.6 * sc), scale(b.fwd, 2.2 * sc)))
      );
      const tgt = targets.length > 0 ? targets[i % targets.length] : null;
      spawnPlayerBolt(b, muzzle, b.fwd, fan, upOff, {
        speed: 205,
        life: 4.8,
        isMissile: true,
        target: tgt,
        damage: dmgPerMissile,
        color,
      });
    }
    window.SFX.playMissile();
  }

  // Distinct K Signature Special Ability for ALL 9 Starships!
  function triggerOverdrive() {
    if (gameMode !== "playing" || !player) return;
    const oa = player.overdriveAnim;
    if (oa.active || oa.cd > 0) return;
    window.SFX.ensure();
    window.SFX.playOverdrive();
    oa.active = true;
    oa.t = 0;
    const pSpec = player.shipSpec || selectedShip;
    const pModel = window.Models.getStarship(pSpec.id);
    const b = player.basis;
    const sc = pSpec.scale || 1.0;
    const locked = getLockedTarget() || findBestLockTarget(false);
    let aimDir = b.fwd;
    if (locked && locked.alive) {
      const toL = norm(sub(locked.pos, player.pos));
      if (dot(toL, b.fwd) > 0.72) aimDir = toL;
    }

    addWorldRing(player.pos, b.right, b.up, 4, 58, 0.75, pModel.beamColor || "#ffe066", 3);

    if (pSpec.id === "capital_ship") {
      // 01 主力艦：天使光翼・全艦總齊發（22道雙層金青重砲彈幕 + 6發分導追蹤飛彈！）
      camShake = Math.max(camShake, 1.5);
      for (let i = 0; i < 11; i++) {
        const spread = ((i / 10) - 0.5) * 0.72;
        const muzTop = add(player.pos, add(scale(b.right, spread * 12 * sc), add(scale(b.up, 1.5 * sc), scale(b.fwd, 3 * sc))));
        const muzBot = add(player.pos, add(scale(b.right, spread * 10 * sc), add(scale(b.up, -1.2 * sc), scale(b.fwd, 3 * sc))));
        spawnPlayerBolt(b, muzTop, aimDir, spread, 0.05, { speed: 390, damage: 28, isCapital: true, color: "#ffe066" });
        spawnPlayerBolt(b, muzBot, aimDir, spread * 0.85, -0.05, { speed: 375, damage: 26, isCapital: true, color: "#5ef2ff" });
      }
      launchMultiMissiles(6, 55, "#ffe066");
      addWorldRing(player.pos, b.right, b.fwd, 6, 85, 0.85, "#ffe066", 3);
    } else if (pSpec.id === "battleship") {
      // 02 戰列艦：全艦重砲・一艦齊發（兩波共 20 門巨型重砲轟炸！）
      const fireBroadside = (waveIdx) => {
        if (!player || player.hp <= 0) return;
        const bb = player.basis;
        camShake = Math.max(camShake, 1.8);
        window.SFX.playNovaBeam();
        for (let i = 0; i < 10; i++) {
          const sp = ((i / 9) - 0.5) * 0.58;
          const upS = (waveIdx === 0 ? 0.04 : -0.04) + ((i % 2) - 0.5) * 0.06;
          const muz = add(player.pos, add(scale(bb.right, sp * 11 * sc), scale(bb.fwd, 3.2 * sc)));
          spawnPlayerBolt(bb, muz, bb.fwd, sp, upS, { speed: 360, damage: 34, isCapital: true, color: i % 2 === 0 ? "#ff9f1c" : "#ffe066" });
        }
      };
      fireBroadside(0);
      setTimeout(() => fireBroadside(1), 280);
    } else if (pSpec.id === "carrier") {
      // 06 航空母艦：艦載機出擊 + 10 發全目標分導追蹤飛彈蜂群！
      const wingKeys = ["tiny_fighter", "stealth_vessel"];
      for (let i = 0; i < 2; i++) {
        const wSpec = window.SolarMissions.getShipById(wingKeys[i]);
        const launchPos = add(player.pos, add(scale(b.right, (i === 0 ? -1 : 1) * 10), scale(b.fwd, 5)));
        friendlies.push(spawnShip({
          kind: "friendlyFighter",
          name: `母艦無人機 0${i + 1}`,
          isEnemy: false,
          model: window.Models.getStarship(wSpec.id),
          spriteKind: "ship",
          spriteKey: wSpec.id,
          spriteWorldSize: 10.5,
          radius: 3.4,
          scale: 1.0,
          pos: launchPos,
          fwd: b.fwd,
          speed: 64,
          hp: 110,
          orbitAlt: len(player.pos) - EARTH_RADIUS,
        }));
      }
      launchMultiMissiles(10, 48, "#5ef2ff");
    } else if (pSpec.id === "cruiser") {
      // 03 巡洋艦：雙層 14 道螺旋脈衝彈幕環
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const r = i < 7 ? 0.14 : 0.28;
        const muz = add(player.pos, scale(b.fwd, 3 * sc));
        spawnPlayerBolt(b, muz, aimDir, Math.cos(ang) * r, Math.sin(ang) * r, {
          speed: 375, damage: 24, isCapital: i < 7, color: i % 2 === 0 ? "#38e8ff" : "#80ffdb",
        });
      }
    } else if (pSpec.id === "destroyer") {
      // 04 驅逐艦：12 發交叉穿甲雷射暴雨
      for (let i = 0; i < 12; i++) {
        const sp = ((i / 11) - 0.5) * 0.34;
        const upS = ((i % 3) - 1) * 0.07;
        const muz = add(player.pos, add(scale(b.right, sp * 8 * sc), scale(b.fwd, 2.8 * sc)));
        spawnPlayerBolt(b, muz, aimDir, sp * 0.6, upS, { speed: 410, damage: 24, color: "#ffd166" });
      }
    } else if (pSpec.id === "frigate") {
      // 05 巡防艦：360° 全方位 14 道環形掃蕩波
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const dir360 = norm(add(scale(b.fwd, Math.cos(ang)), scale(b.right, Math.sin(ang))));
        spawnPlayerBolt(b, player.pos, dir360, 0, 0, { speed: 340, damage: 30, isCapital: true, color: "#48f2ff" });
      }
      addWorldRing(player.pos, b.right, b.fwd, 5, 110, 0.75, "#48f2ff", 3);
    } else if (pSpec.id === "science_ship") {
      // 07 科學艦：瞬間滿護盾 + 8 顆紫青追蹤水晶光球 + EMP 震波
      player.shield = player.maxShield;
      launchMultiMissiles(8, 42, "#c77dff");
      addWorldRing(player.pos, b.right, b.fwd, 5, 105, 0.8, "#c77dff", 3);
    } else if (pSpec.id === "stealth_vessel") {
      // 09 隱形艦：光學匿蹤瞬殺 + 8 道高暴擊紫紅幽影刃
      player.cloakAnim.active = true;
      player.cloakAnim.t = 0;
      for (let i = 0; i < 8; i++) {
        const sp = ((i / 7) - 0.5) * 0.28;
        const muz = add(player.pos, add(scale(b.right, sp * 7 * sc), scale(b.fwd, 3 * sc)));
        spawnPlayerBolt(b, muz, aimDir, sp * 0.5, 0, { speed: 430, damage: 32, color: "#e056fd" });
      }
    } else {
      // 08 微型戰機：王牌殘影六連斬
      ghosts.push({ pos: { ...player.pos }, basis: { ...b }, model: pModel, scale: sc * 0.72, life: 0.65, maxLife: 0.65 });
      for (let i = 0; i < 6; i++) {
        const sp = ((i / 5) - 0.5) * 0.22;
        const muz = add(player.pos, add(scale(b.right, sp * 5), scale(b.fwd, 3)));
        spawnPlayerBolt(b, muz, aimDir, sp * 0.4, 0, { speed: 440, damage: 28, color: "#5ef2ff" });
      }
    }

    showComms("星艦專屬特技", `★【${pSpec.specialName || pModel.signatureName}】發動！${pSpec.specialDesc || ""}`, false, 3.8);
  }

  function toggle3DMode() {
    use3DStarships = !use3DStarships;
    if (btn3DMode) {
      btn3DMode.textContent = use3DStarships ? "3D立體：開" : "3D立體：關";
      btn3DMode.classList.toggle("active", use3DStarships);
    }
    if (gameMode === "playing") {
      showComms("顯示引擎", use3DStarships ? "已切換為「3D 立體星艦模型」模式！" : "已切換為「2D 8-BIT 像素圖示」模式。", false, 2.5);
    }
  }

  function applyPlayerDamage(dmg, alertText, heavyCrash = false) {
    if (!player || player.hp <= 0) return;
    // Invulnerable dodge frames during 360° Barrel Roll!
    if (player.rollAnim && player.rollAnim.active && !heavyCrash) return;
    // 3D Energy Shield Dome cuts damage by 70%!
    if (player.shieldAnim && player.shieldAnim.active) dmg = Math.ceil(dmg * 0.3);
    let rem = dmg;
    player.shieldDelay = 3.2;
    player.hitFlash = 1.0;
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, rem);
      player.shield -= absorbed;
      rem -= absorbed;
    }
    if (rem > 0) player.hp = Math.max(0, player.hp - rem);
    if (alertText) {
      crashAlertText = alertText;
      crashAlertTimer = 1.35;
      camShake = Math.max(camShake, heavyCrash ? 2.4 : 1.4);
      window.SFX.playCrash(heavyCrash);
    } else {
      window.SFX.playHit();
    }
  }

  function firePlayerLaser(locked) {
    if (player.laserCD > 0) return;
    const spec = player.shipSpec || selectedShip;
    const overActive = !!(player.overdriveAnim && player.overdriveAnim.active);
    player.laserCD = (spec.laserCD || 0.11) * (overActive ? 0.58 : 1.0);
    player.act.recoil = 1.0;
    player.act.muzzleFlash = 1.0;
    playerShotSeq++;

    const b = player.basis;
    const sc = spec.scale || 1.0;
    const pModel = window.Models.getStarship(spec.id);
    let aimDir = b.fwd;

    if (autoLockEnabled && locked && locked.alive) {
      const toT = sub(locked.pos, player.pos);
      const d = len(toT);
      const leadPos = add(locked.pos, scale(locked.vel || v3(), d / 365));
      const toLead = norm(sub(leadPos, player.pos));
      const cone = spec.barrageType === "crystal_seek" ? 0.72 : (lockProgress >= 0.95 ? 0.85 : 0.92);
      if (dot(toLead, b.fwd) > cone) aimDir = toLead;
    }

    const boltColor = pModel.beamColor || "#38f2ff";
    const boltCore = pModel.beamCore || "#ffffff";
    const baseDmg = spec.laserDmg || 16;
    const bType = spec.barrageType || "twin_rapid";

    if (bType === "capital_angel8") {
      // 01 主力艦：8道天使光翼超級彈幕（超載時升級為 12 道巨型光翼彈幕！）
      const streams = overActive ? 12 : 8;
      for (let i = 0; i < streams; i++) {
        const u = (i / (streams - 1)) - 0.5;
        const spread = u * (overActive ? 0.54 : 0.38);
        const upArc = Math.abs(u) * 0.08 * (i % 2 === 0 ? 1 : -1);
        const muz = add(player.pos, add(scale(b.right, u * 9.5 * sc), scale(b.fwd, 2.8 * sc)));
        const isWing = Math.abs(u) > 0.24;
        spawnPlayerBolt(b, muz, aimDir, spread, upArc, {
          speed: isWing ? 360 : 390,
          damage: Math.round(baseDmg * (isWing ? 0.52 : 0.68)),
          isCapital: !isWing,
          color: isWing ? "#ffe066" : "#5ef2ff",
          coreColor: boltCore,
        });
      }
    } else if (bType === "heavy_salvo6") {
      // 02 戰列艦：6 門巨型重砲廣域彈幕（超載 8 門！）
      const streams = overActive ? 8 : 6;
      for (let i = 0; i < streams; i++) {
        const u = (i / (streams - 1)) - 0.5;
        const muz = add(player.pos, add(scale(b.right, u * 8.5 * sc), scale(b.fwd, 2.8 * sc)));
        spawnPlayerBolt(b, muz, aimDir, u * 0.26, (i % 2 === 0 ? 0.025 : -0.025), {
          speed: 355,
          damage: Math.round(baseDmg * 0.65),
          isCapital: true,
          color: i % 2 === 0 ? "#ff9f1c" : "#ffe066",
        });
      }
    } else if (bType === "carrier_swarm6") {
      // 06 航空母艦：6 道機庫防空彈幕 + 每 4 輪自動釋放追蹤子機光彈
      const streams = overActive ? 8 : 6;
      for (let i = 0; i < streams; i++) {
        const u = (i / (streams - 1)) - 0.5;
        const muz = add(player.pos, add(scale(b.right, u * 8.0 * sc), scale(b.fwd, 2.4 * sc)));
        spawnPlayerBolt(b, muz, aimDir, u * 0.34, 0, {
          speed: 370,
          damage: Math.round(baseDmg * 0.56),
          color: i % 2 === 0 ? "#5ef2ff" : "#7effb2",
        });
      }
      if (playerShotSeq % 4 === 0 && locked && locked.alive) {
        spawnPlayerBolt(b, add(player.pos, scale(b.up, -1)), aimDir, 0, -0.06, {
          speed: 230, life: 3.4, isMissile: true, target: locked, damage: 28, color: "#7effb2",
        });
      }
    } else if (bType === "helix4") {
      // 03 巡洋艦：4 道旋轉螺旋電漿彈幕
      const ph = playerShotSeq * 0.65;
      const count = overActive ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const a = ph + (i / count) * Math.PI * 2;
        const muz = add(player.pos, add(scale(b.right, Math.cos(a) * 2.2 * sc), add(scale(b.up, Math.sin(a) * 1.4 * sc), scale(b.fwd, 2.6 * sc))));
        spawnPlayerBolt(b, muz, aimDir, Math.cos(a) * 0.075, Math.sin(a) * 0.055, {
          speed: 375, damage: Math.round(baseDmg * 0.68), color: i % 2 === 0 ? "#38e8ff" : "#80ffdb",
        });
      }
    } else if (bType === "quad_cross") {
      // 04 驅逐艦：4 管高速交叉火網
      const offs = overActive ? [-0.18, -0.09, -0.03, 0.03, 0.09, 0.18] : [-0.11, -0.035, 0.035, 0.11];
      for (let i = 0; i < offs.length; i++) {
        const u = offs[i];
        const muz = add(player.pos, add(scale(b.right, u * 24 * sc), scale(b.fwd, 2.5 * sc)));
        spawnPlayerBolt(b, muz, aimDir, u * 0.75, 0, {
          speed: 395, damage: Math.round(baseDmg * 0.72), color: i % 2 === 0 ? "#ffd166" : "#5ef2ff",
        });
      }
    } else if (bType === "fan3") {
      // 05 巡防艦：寬幅三聯扇形彈幕
      const offs = overActive ? [-0.20, -0.10, 0, 0.10, 0.20] : [-0.12, 0, 0.12];
      for (let i = 0; i < offs.length; i++) {
        const muz = add(player.pos, add(scale(b.right, offs[i] * 18 * sc), scale(b.fwd, 2.4 * sc)));
        spawnPlayerBolt(b, muz, aimDir, offs[i], 0, { speed: 375, damage: Math.round(baseDmg * 0.8), color: boltColor });
      }
    } else if (bType === "crystal_seek") {
      // 07 科學艦：3 聯自動尋標水晶光束
      const offs = overActive ? [-0.14, -0.05, 0.05, 0.14] : [-0.08, 0, 0.08];
      for (let i = 0; i < offs.length; i++) {
        const muz = add(player.pos, add(scale(b.right, offs[i] * 18 * sc), scale(b.fwd, 2.4 * sc)));
        spawnPlayerBolt(b, muz, aimDir, offs[i] * 0.5, 0, {
          speed: 350, damage: Math.round(baseDmg * 0.78), color: i % 2 === 0 ? "#c77dff" : "#64dfdf",
          isMissile: !!(locked && locked.alive && i === Math.floor(offs.length / 2)),
          target: locked && locked.alive ? locked : null,
        });
      }
    } else if (bType === "phantom_blades") {
      // 09 隱形艦：3 連高暴擊幽影紫刃
      const offs = overActive ? [-0.12, -0.04, 0.04, 0.12] : [-0.06, 0, 0.06];
      for (let i = 0; i < offs.length; i++) {
        const muz = add(player.pos, add(scale(b.right, offs[i] * 16 * sc), scale(b.fwd, 2.6 * sc)));
        spawnPlayerBolt(b, muz, aimDir, offs[i] * 0.5, 0, { speed: 415, damage: Math.round(baseDmg * 0.92), color: "#e056fd" });
      }
    } else {
      // 08 微型戰機：極速雙聯電漿（超載四聯！）
      const offs = overActive ? [-2.6, -1.0, 1.0, 2.6] : [-1.8, 1.8];
      for (let i = 0; i < offs.length; i++) {
        const muz = add(player.pos, add(scale(b.right, offs[i] * sc), scale(b.fwd, 2.4 * sc)));
        spawnPlayerBolt(b, muz, aimDir, offs[i] * 0.015, 0, { speed: 395, damage: baseDmg, color: boltColor, coreColor: boltCore });
      }
    }
    window.SFX.playLaser(false);
  }

  function firePlayerMissile(locked) {
    if (player.missileCD > 0 || player.missiles <= 0) return;
    player.missileCD = 0.42;
    player.missiles--;
    player.act.bayOpen = 1.0;
    const spec = player.shipSpec || selectedShip;
    const salvo = spec.missileSalvo || 1;
    const dmg = salvo >= 4 ? 42 : (salvo >= 3 ? 48 : (salvo === 2 ? 54 : 68));
    launchMultiMissiles(salvo, dmg, "#ffbe0b");
  }

  function fireShipWeapon(ship, targetPos, isCapitalShot) {
    const dir = norm(sub(targetPos, ship.pos));
    const spread = isCapitalShot ? 0.035 : 0.045;
    const aim = norm(v3(
      dir.x + (Math.random() - 0.5) * spread,
      dir.y + (Math.random() - 0.5) * spread,
      dir.z + (Math.random() - 0.5) * spread
    ));
    const offset = isCapitalShot ? ship.model.radius * ship.scale * 0.55 : 4.0;
    const muzzle = add(ship.pos, scale(aim, offset));
    const rawDmg = isCapitalShot ? 18 : 7;
    projectiles.push({
      pos: muzzle,
      dir: aim,
      speed: isCapitalShot ? 240 : 210,
      life: isCapitalShot ? 3.2 : 2.1,
      isEnemy: ship.isEnemy,
      isMissile: false,
      isCapital: isCapitalShot,
      damage: ship.isEnemy ? Math.max(3, Math.round(rawDmg * difficulty.enemyDmgMul)) : rawDmg,
      color: ship.isEnemy
        ? (ship.projCol || (isCapitalShot ? "#8cff42" : "#78ffbc"))
        : "#38d9ff",
      coreColor: "#ffffff",
    });
    if (len(sub(ship.pos, player.pos)) < 260) {
      window.SFX.playLaser(ship.isEnemy);
    }
  }

  // ---- Update Loop ----
  function updateTitleCamera(dt) {
    // Cinematic orbital pan around pixel Earth & hovering Starfleet ships
    const ang = time * 0.09;
    const r = EARTH_RADIUS + 260 + Math.sin(time * 0.25) * 90;
    camPos = v3(Math.sin(ang) * r, 360 + Math.cos(time * 0.2) * 80, Math.cos(ang) * r);
    const lookTarget = v3(Math.sin(ang + 0.35) * (EARTH_RADIUS * 0.4), 120, Math.cos(ang + 0.35) * (EARTH_RADIUS * 0.4));
    camQuat = qLookAt(sub(lookTarget, camPos), v3(0, 1, 0));
  }

  function updatePlayer(dt) {
    const p = player;
    const ut = p.uturn;
    ut.cd = Math.max(0, ut.cd - dt);
    p.crashCD = Math.max(0, p.crashCD - dt);

    const boosting = !!(keys["ShiftLeft"] || keys["ShiftRight"] || touchBoost || ut.active);
    const pSpec = p.shipSpec || selectedShip;
    const targetSpeed = ut.active ? 118 : (boosting ? (pSpec.boostSpeed || 168) : (keys["KeyX"] ? 30 : (pSpec.speed || 64)));
    p.speed = lerp(p.speed, targetSpeed, Math.min(1, dt * 5.0));

    // Read controls
    let pitchIn = 0; // +1 = nose UP toward sky/space
    let yawIn = 0;   // +1 = turn RIGHT
    let rollIn = 0;

    if (keys["KeyW"] || keys["ArrowUp"]) pitchIn += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) pitchIn -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) yawIn += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) yawIn -= 1;
    if (keys["KeyQ"]) rollIn -= 1;
    if (keys["KeyE"]) rollIn += 1;

    if (touchStick.active) {
      yawIn += touchStick.x;
      pitchIn -= touchStick.y;
    }

    if (ut.active) {
      // High-G 180° Immelmann Loop + Roll Maneuver
      ut.t += dt;
      const u = clamp(ut.t / ut.dur, 0, 1);
      const smooth = (x) => x * x * (3 - 2 * x);
      if (u < 0.5) {
        p.quat = qSlerp(ut.startQuat, ut.apexQuat, smooth(u * 2));
      } else {
        p.quat = qSlerp(ut.apexQuat, ut.endQuat, smooth((u - 0.5) * 2));
      }
      p.quat = qNorm(p.quat);
      p.basis = qBasis(p.quat);
      // Dramatic half-roll visual flourish during second half of loop
      p.rollVisual = Math.sin(u * Math.PI) * 0.95;
      if (u >= 1) {
        ut.active = false;
        ut.cd = ut.maxCd;
        p.quat = ut.endQuat;
        p.basis = qBasis(p.quat);
      }
    } else {
      // Normal flight rotations (Pitch around local Right, Yaw around local Up, Roll around local Fwd)
      const pitchRate = 1.75;
      const yawRate = 1.85;
      const rollRate = 2.3;

      if (Math.abs(pitchIn) > 0.01) {
        p.quat = qMul(p.quat, qFromAxisAngle(v3(1, 0, 0), -pitchIn * pitchRate * dt));
      }
      if (Math.abs(yawIn) > 0.01) {
        p.quat = qMul(p.quat, qFromAxisAngle(v3(0, 1, 0), yawIn * yawRate * dt));
      }
      if (Math.abs(rollIn) > 0.01) {
        p.quat = qMul(p.quat, qFromAxisAngle(v3(0, 0, 1), -rollIn * rollRate * dt));
      }
      p.quat = qNorm(p.quat);
      p.basis = qBasis(p.quat);

      // Gentle auto-leveling of roll near planet surface when not manually rolling
      const altNow = len(p.pos) - EARTH_RADIUS;
      if (Math.abs(rollIn) < 0.05 && altNow < 240) {
        const upLocal = norm(p.pos);
        const fwdDotUp = Math.abs(dot(p.basis.fwd, upLocal));
        if (fwdDotUp < 0.85) {
          const rightDotUp = dot(p.basis.right, upLocal);
          const levelStrength = (1 - altNow / 260) * 1.6;
          p.quat = qNorm(qMul(p.quat, qFromAxisAngle(v3(0, 0, 1), -rightDotUp * levelStrength * dt)));
          p.basis = qBasis(p.quat);
        }
      }

      // Smooth visual banking angle for 3rd-person starfighter flair!
      const targetBank = clamp(-yawIn * 0.54, -0.6, 0.6);
      p.rollVisual = lerp(p.rollVisual, targetBank, Math.min(1, dt * 7));
    }

    // Move forward
    p.vel = scale(p.basis.fwd, p.speed);
    p.pos = add(p.pos, scale(p.vel, dt));

    // Planetary surface collision & safety bounce (steep crash causes real damage!)
    const r = len(p.pos);
    const minR = EARTH_RADIUS + 16;
    const maxR = EARTH_RADIUS + 1150;
    if (r < minR) {
      const upL = norm(p.pos);
      p.pos = scale(upL, minR + 1.2);
      const intoGround = dot(p.basis.fwd, upL);
      if (intoGround < -0.22 && p.crashCD <= 0) {
        p.crashCD = 0.6;
        applyPlayerDamage(24, "撞擊星球地表！艦體受損！", true);
        spawnExplosion(sub(p.pos, scale(upL, 3)), false, ["#ffffff", "#7ee8ff", "#ff9f1c"]);
        const bounceFwd = norm(add(sub(p.basis.fwd, scale(upL, intoGround)), scale(upL, 0.36)));
        p.quat = qLookAt(bounceFwd, upL);
        p.basis = qBasis(p.quat);
      } else if (intoGround < 0) {
        const safeFwd = norm(sub(p.basis.fwd, scale(upL, intoGround - 0.14)));
        p.quat = qLookAt(safeFwd, upL);
        p.basis = qBasis(p.quat);
      }
    } else if (r > maxR) {
      p.pos = scale(norm(p.pos), maxR);
    }

    const alt = len(p.pos) - EARTH_RADIUS;

    // Cooldowns & Shield / Missile Regeneration
    p.laserCD = Math.max(0, p.laserCD - dt);
    p.missileCD = Math.max(0, p.missileCD - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 3.5);
    p.empCD = Math.max(0, p.empCD - dt);
    p.flareCD = Math.max(0, p.flareCD - dt);
    p.act.recoil = Math.max(0, p.act.recoil - dt * 6.5);
    p.act.muzzleFlash = Math.max(0, p.act.muzzleFlash - dt * 9.5);
    p.act.bayOpen = Math.max(0, p.act.bayOpen - dt * 1.8);
    p.act.boost = lerp(p.act.boost, boosting ? 1 : 0, Math.min(1, dt * 6));
    p.act.brake = lerp(p.act.brake, keys["KeyX"] ? 1 : 0, Math.min(1, dt * 8));

    // 360° Barrel Roll Animation & Lateral Evasive Dodge
    const ra = p.rollAnim;
    ra.cd = Math.max(0, ra.cd - dt);
    if (ra.active) {
      ra.t += dt;
      const u = clamp(ra.t / ra.dur, 0, 1);
      const smooth = u * u * (3 - 2 * u);
      p.rollVisual = ra.dir * smooth * Math.PI * 2;
      p.pos = add(p.pos, scale(p.basis.right, ra.dir * 62 * Math.sin(u * Math.PI) * dt));
      if (Math.random() < 0.45) {
        const pModel = window.Models.getStarship(pSpec.id);
        const bankedQ = qMul(p.quat, qFromAxisAngle(v3(0, 0, 1), p.rollVisual));
        ghosts.push({ pos: { ...p.pos }, basis: qBasis(bankedQ), model: pModel, scale: pSpec.scale || 1, life: 0.3, maxLife: 0.3 });
      }
      if (u >= 1) {
        ra.active = false;
        ra.cd = 1.1;
        p.rollVisual = 0;
      }
    }

    // 3D Shield Dome Animation
    const sa = p.shieldAnim;
    sa.cd = Math.max(0, sa.cd - dt);
    if (sa.active) {
      sa.t += dt;
      const u = clamp(sa.t / sa.dur, 0, 1);
      p.act.shield = Math.min(1, Math.sin(u * Math.PI) * 1.45);
      if (u >= 1) { sa.active = false; sa.cd = 5.5; p.act.shield = 0; }
    } else {
      p.act.shield = Math.max(0, p.act.shield - dt * 3);
    }

    // Charged Nova Beam Animation & Piercing Line Damage
    const ba = p.beamAnim;
    ba.cd = Math.max(0, ba.cd - dt);
    if (ba.active) {
      ba.t += dt;
      const u = clamp(ba.t / ba.dur, 0, 1);
      if (u < 0.4) {
        p.act.charge = u / 0.4;
        p.act.beamAlpha = 0;
      } else {
        if (!ba.fired) {
          ba.fired = true;
          window.SFX.playNovaBeam();
          camShake = Math.max(camShake, 1.3);
          const pModel = window.Models.getStarship(pSpec.id);
          addWorldRing(add(p.pos, scale(p.basis.fwd, 5)), p.basis.right, p.basis.up, 2.5, 42, 0.45, pModel.beamColor || "#66f7ff", 3);
          // Pierce every enemy near the forward ray up to 380 units!
          for (let ei = 0; ei < enemies.length; ei++) {
            const e = enemies[ei];
            if (!e.alive) continue;
            const toE = sub(e.pos, p.pos);
            const projD = dot(toE, p.basis.fwd);
            if (projD > 4 && projD < 380) {
              const closest = add(p.pos, scale(p.basis.fwd, projD));
              const perpDist = len(sub(e.pos, closest));
              if (perpDist < ((e.model.radius || 4) * e.scale + 11)) {
                damageShip(e, (pSpec.laserDmg || 20) * 6, true);
                spawnExplosion(e.pos, false, ["#ffffff", pModel.beamColor || "#64f4ff", "#ffe066"]);
              }
            }
          }
        }
        p.act.charge = Math.max(0, 1 - (u - 0.4) * 3);
        p.act.beamAlpha = Math.sin(((u - 0.4) / 0.6) * Math.PI) * 1.25;
      }
      if (u >= 1) { ba.active = false; ba.cd = 4.2; p.act.charge = 0; p.act.beamAlpha = 0; }
    }

    // Optical Cloak Animation
    const ca = p.cloakAnim;
    ca.cd = Math.max(0, ca.cd - dt);
    if (ca.active) {
      ca.t += dt;
      const u = clamp(ca.t / ca.dur, 0, 1);
      p.act.cloak = Math.sin(u * Math.PI) * 1.3;
      if (u >= 1) { ca.active = false; ca.cd = 5.0; p.act.cloak = 0; }
    } else {
      p.act.cloak = Math.max(0, p.act.cloak - dt * 3);
    }

    // Ship Signature Overdrive Animation
    const oa = p.overdriveAnim;
    oa.cd = Math.max(0, oa.cd - dt);
    if (oa.active) {
      oa.t += dt;
      const u = clamp(oa.t / oa.dur, 0, 1);
      p.act.overdrive = Math.min(1, Math.sin(u * Math.PI) * 1.45);
      p.shield = Math.min(p.maxShield, p.shield + dt * 22);
      if (u >= 1) { oa.active = false; oa.cd = 7.5; p.act.overdrive = 0; }
    } else {
      p.act.overdrive = Math.max(0, p.act.overdrive - dt * 2.5);
    }

    if (p.shieldDelay > 0) {
      p.shieldDelay -= dt;
    } else if (p.shield < p.maxShield) {
      p.shield = Math.min(p.maxShield, p.shield + dt * 11 * difficulty.shieldRegenMul);
    }
    if (p.missiles < p.maxMissiles) {
      p.missileRegen += dt;
      if (p.missileRegen >= 2.6) {
        p.missileRegen = 0;
        p.missiles++;
      }
    }

    // Wingtip trails
    p.trailTimer += dt;
    if (p.trailTimer >= 0.03) {
      p.trailTimer = 0;
      const bankedQ = qMul(p.quat, qFromAxisAngle(v3(0, 0, 1), p.rollVisual));
      const bb = qBasis(bankedQ);
      const leftTip = add(p.pos, add(scale(bb.right, -2.55), scale(bb.fwd, -1.9)));
      const rightTip = add(p.pos, add(scale(bb.right, 2.55), scale(bb.fwd, -1.9)));
      p.trailL.push(leftTip);
      p.trailR.push(rightTip);
      if (p.trailL.length > 30) p.trailL.shift();
      if (p.trailR.length > 30) p.trailR.shift();
    }

    // Auto-Lock Update & Weapons
    const locked = updateAutoLock(dt);
    if (locked && lockProgress >= 0.95 && lockBeepTimer <= 0) {
      lockBeepTimer = 1.6;
      window.SFX.playLockBeep();
    }
    lockBeepTimer = Math.max(0, lockBeepTimer - dt);

    if (keys["Space"] || mouseFire || touchFire) {
      firePlayerLaser(locked);
    }
    if (keys["KeyF"]) {
      keys["KeyF"] = false;
      firePlayerMissile(locked);
    }

    // Engine audio
    window.SFX.updateEngine(clamp((p.speed - 30) / 140, 0, 1), boosting, alt > 220);

    // Stage 2 -> Stage 3 automatic transition when player ascends into space!
    if (stage === 2 && alt >= 240) {
      spawnStage3SpaceFleet();
    }

    return { locked, boosting, alt };
  }

  // ---- Solid Ship-to-Ship Collision & Ramming Destruction Physics ----
  function resolveCollisions() {
    if (!player || player.hp <= 0) return;
    const pRad = 3.8;
    const allShips = [...enemies, ...friendlies];

    // 1. Player vs. All Ships (no clipping through — bounce + real crash damage!)
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s.alive) continue;
      const sRad = (s.model.radius || 3.5) * s.scale * (s.isCapital ? 0.72 : 0.95);
      const delta = sub(player.pos, s.pos);
      const dist = len(delta);
      const minDist = pRad + sRad;

      if (dist < minDist) {
        const pushDir = dist > 0.01 ? scale(delta, 1 / dist) : norm(player.basis.up);
        // Hard physical separation so ships never pass through each other
        player.pos = add(s.pos, scale(pushDir, minDist + 2.2));

        // Deflect player heading outward if flying directly into the hull
        const inward = dot(player.basis.fwd, pushDir);
        if (inward < 0.25) {
          const bounceFwd = norm(add(sub(player.basis.fwd, scale(pushDir, inward * 1.45)), scale(pushDir, 0.35)));
          player.quat = qLookAt(bounceFwd, norm(player.pos));
          player.basis = qBasis(player.quat);
        }
        // Cancel U-turn if slammed mid-maneuver
        if (player.uturn.active) {
          player.uturn.active = false;
          player.uturn.cd = player.uturn.maxCd;
        }

        if (player.crashCD <= 0) {
          player.crashCD = 0.45;
          const impactPt = add(s.pos, scale(pushDir, sRad));
          spawnExplosion(impactPt, false, ["#ffffff", "#ffea61", "#ff7f50", "#ff384c"]);

          if (s.isEnemy) {
            if (s.isCapital) {
              applyPlayerDamage(42, `嚴重撞擊${s.name}！`, true);
              damageShip(s, 75, true);
            } else {
              applyPlayerDamage(28, `與${s.name}發生對撞！`, true);
              damageShip(s, 90, true);
              if (s.alive) {
                s.pos = sub(s.pos, scale(pushDir, 8));
              }
            }
          } else {
            applyPlayerDamage(16, `擦撞友軍${s.name}！`, false);
            damageShip(s, 14, false);
          }
        }
      }
    }

    // 2. AI vs. AI & AI vs. Capital Ships solid collision
    for (let i = 0; i < allShips.length; i++) {
      const a = allShips[i];
      if (!a.alive) continue;
      const rA = (a.model.radius || 3.5) * a.scale * (a.isCapital ? 0.7 : 0.9);
      for (let j = i + 1; j < allShips.length; j++) {
        const b = allShips[j];
        if (!b.alive) continue;
        if (a.isCapital && b.isCapital) continue;
        const rB = (b.model.radius || 3.5) * b.scale * (b.isCapital ? 0.7 : 0.9);
        const delta = sub(a.pos, b.pos);
        const dist = len(delta);
        const minD = rA + rB;
        if (dist < minD) {
          const n = dist > 0.01 ? scale(delta, 1 / dist) : v3(0, 1, 0);
          const overlap = (minD - dist) + 1.5;
          if (!a.isCapital && !b.isCapital) {
            a.pos = add(a.pos, scale(n, overlap * 0.5));
            b.pos = sub(b.pos, scale(n, overlap * 0.5));
          } else if (!a.isCapital) {
            a.pos = add(b.pos, scale(n, minD + 2.0));
          } else {
            b.pos = sub(a.pos, scale(n, minD + 2.0));
          }
          // Opposing faction AI ramming causes damage + sparks!
          if (a.isEnemy !== b.isEnemy) {
            damageShip(a, b.isCapital ? 60 : 28, false);
            damageShip(b, a.isCapital ? 60 : 28, false);
          }
        }
      }
    }
  }

  function updateAIShips(dt) {
    const allShips = [...enemies, ...friendlies];

    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s.alive) {
        if (s.deathTimer > 0) s.deathTimer = Math.max(0, s.deathTimer - dt);
        continue;
      }
      s.hitFlash = Math.max(0, s.hitFlash - dt * 5);
      s.aiTimer += dt;
      s.fireCD -= dt;
      if (s.actionTimer > 0) {
        s.actionTimer -= dt;
        if (s.actionTimer <= 0) s.actionState = null;
      }
      s.maneuverCD = (s.maneuverCD || (2.5 + Math.random() * 3.0)) - dt;
      s.missileCD = (s.missileCD || (4.5 + Math.random() * 4.0)) - dt;

      // Pick nearest opposing target
      let target = null;
      let minDist = Infinity;
      if (s.isEnemy) {
        const dp = len(sub(player.pos, s.pos));
        target = { pos: player.pos, vel: player.vel, isPlayer: true };
        minDist = dp;
        for (let j = 0; j < friendlies.length; j++) {
          const f = friendlies[j];
          if (!f.alive) continue;
          const d = len(sub(f.pos, s.pos));
          if (d < minDist * (s.isCapital && f.isCapital ? 1.5 : 0.85)) {
            minDist = d;
            target = f;
          }
        }
      } else {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.alive) continue;
          const d = len(sub(e.pos, s.pos));
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
      }

      const upLocal = norm(s.pos);

      if (s.isCapital) {
        // Capital ships cruise majestically & fire broadside turbo-lasers!
        const tangent = norm(sub(s.basis.fwd, scale(upLocal, dot(s.basis.fwd, upLocal))));
        const desiredQ = qLookAt(tangent, upLocal);
        s.quat = qSlerp(s.quat, desiredQ, Math.min(1, dt * 0.4));
        s.basis = qBasis(s.quat);
        s.vel = scale(s.basis.fwd, s.speed);
        s.pos = add(s.pos, scale(s.vel, dt));

        // Maintain orbital radius
        const targetR = EARTH_RADIUS + s.orbitAlt;
        s.pos = scale(norm(s.pos), lerp(len(s.pos), targetR, Math.min(1, dt)));

        // Boss launches escort fighter reinforcements periodically (triggers 3D shield_spawn pose!)
        if (s.isBoss) {
          s.spawnTimer -= dt;
          const fighterCount = enemies.filter((e) => e.alive && !e.isCapital).length;
          if (s.spawnTimer <= 0 && fighterCount < 6) {
            s.spawnTimer = 11;
            s.actionState = "shield_spawn";
            s.actionTimer = 1.05;
            const launchPos = add(s.pos, scale(s.basis.up, -12));
            const spawnKey = Math.random() < 0.45 ? "zerg_01" : "zerg_05";
            enemies.push(spawnZergUnit(spawnKey, launchPos, s.basis.fwd, 470, currentMission.order));
          }
        }

        if (target && minDist < 620 && s.fireCD <= 0) {
          s.fireCD = (s.isBoss ? 0.65 : 1.05) * (s.isEnemy ? difficulty.enemyFireRateMul : 1.0);
          if (s.isEnemy && s.missileCD <= 0 && minDist < 540) {
            // Capital Zerg launches homing bio-spore missile salvo!
            s.missileCD = s.isBoss ? 5.5 : 7.5;
            s.actionState = "missile";
            s.actionTimer = 0.65;
            const mDir = norm(sub(target.pos, s.pos));
            projectiles.push({
              pos: add(s.pos, scale(s.basis.fwd, 12)),
              dir: mDir,
              speed: 145,
              life: 4.0,
              isEnemy: true,
              isMissile: true,
              isCapital: false,
              target: target.isPlayer ? player : target,
              damage: 14,
              color: s.projCol || "#9eff52",
              coreColor: "#ffffff",
            });
          } else {
            if (s.isEnemy && !s.actionState) {
              s.actionState = "shoot";
              s.actionTimer = 0.42;
            }
            fireShipWeapon(s, target.pos, true);
          }
        }
      } else {
        // Starfighter / Zerg Aerial Combat AI (with 3D Roll, Boost, Dive Slash & Bio-Missile!)
        let desiredDir = s.basis.fwd;
        let spdMult = 1.0;
        if (target) {
          const toT = sub(target.pos, s.pos);
          const d = len(toT);
          if (d < 45) {
            desiredDir = norm(add(scale(s.basis.right, Math.sin(s.aiTimer * 2 + s.id) > 0 ? 1 : -1), scale(upLocal, 0.35)));
            if (s.isEnemy && !s.actionState) {
              s.actionState = "melee_dive";
              s.actionTimer = 0.45;
            }
          } else {
            const weave = scale(s.basis.right, Math.sin(s.aiTimer * 1.8 + s.id) * 0.25);
            desiredDir = norm(add(scale(toT, 1 / (d || 1)), weave));
          }

          // Autonomous Zerg 3D Tactical Maneuvers: Barrel-Roll Evasion & Hyper-Boost Surge!
          if (s.isEnemy && s.maneuverCD <= 0 && !s.actionState) {
            s.maneuverCD = 3.2 + Math.random() * 3.5;
            if (d < 150 && Math.random() < 0.55) {
              s.actionState = "roll";
              s.actionTimer = 0.65;
              s.rollDir = Math.random() < 0.5 ? 1 : -1;
            } else if (d > 140) {
              s.actionState = "boost";
              s.actionTimer = 0.85;
            }
          }
          if (s.actionState === "roll") {
            desiredDir = norm(add(desiredDir, scale(s.basis.right, (s.rollDir || 1) * 0.75)));
            spdMult = 1.18;
          } else if (s.actionState === "boost") {
            spdMult = 1.48;
          } else if (s.actionState === "melee_dive") {
            spdMult = 1.28;
          }

          // Keep fighters within their zone altitude band
          const alt = len(s.pos) - EARTH_RADIUS;
          if (alt < 22) desiredDir = norm(add(desiredDir, scale(upLocal, 0.7)));
          if (stage === 1 && alt > 115) desiredDir = norm(sub(desiredDir, scale(upLocal, 0.6)));

          if (d < 290 && s.fireCD <= 0 && dot(s.basis.fwd, norm(toT)) > 0.82) {
            s.fireCD = s.isEnemy ? ((1.1 + Math.random() * 0.9) * difficulty.enemyFireRateMul) : (0.65 + Math.random() * 0.5);
            if (s.isEnemy && s.missileCD <= 0 && d > 95 && Math.random() < 0.35) {
              s.missileCD = 6.5 + Math.random() * 4.0;
              s.actionState = "missile";
              s.actionTimer = 0.55;
              projectiles.push({
                pos: add(s.pos, scale(s.basis.fwd, 5)),
                dir: norm(toT),
                speed: 140,
                life: 3.4,
                isEnemy: true,
                isMissile: true,
                isCapital: false,
                target: target.isPlayer ? player : target,
                damage: 10,
                color: s.projCol || "#9eff52",
                coreColor: "#ffffff",
              });
            } else {
              if (s.isEnemy && s.actionState !== "roll") {
                s.actionState = "shoot";
                s.actionTimer = 0.35;
              }
              fireShipWeapon(s, target.pos, false);
            }
          }
        } else if (!s.isEnemy) {
          const formPos = add(player.pos, add(scale(player.basis.right, ((s.id % 3) - 1) * 28), scale(player.basis.fwd, -16)));
          desiredDir = norm(sub(formPos, s.pos));
        }

        const desiredQ = qLookAt(desiredDir, upLocal);
        const turnSpd = s.kind === "enemyCorvette" ? 1.4 : 2.6;
        s.quat = qSlerp(s.quat, desiredQ, Math.min(1, dt * turnSpd));
        s.basis = qBasis(s.quat);
        s.vel = scale(s.basis.fwd, s.speed * spdMult);
        s.pos = add(s.pos, scale(s.vel, dt));

        // Safety surface floor
        if (len(s.pos) < EARTH_RADIUS + 18) {
          s.pos = scale(norm(s.pos), EARTH_RADIUS + 18);
        }

        // Fighter ion trail (Federation) vs organic bio-spore droplets (Zerg)
        s.trailTimer += dt;
        if (s.isEnemy) {
          if (s.trailTimer >= 0.16 && len(sub(s.pos, player.pos)) < 420) {
            s.trailTimer = 0;
            particles.push({
              pos: sub(s.pos, scale(s.basis.fwd, 2.0 * s.scale)),
              vel: v3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4),
              life: 0.45,
              maxLife: 0.45,
              size: s.kind === "bugMantis" ? 2.4 : 1.5,
              color: s.kind === "bugMantis" ? "#72f5e6" : "#8cff42",
            });
          }
        } else if (s.trailTimer >= 0.05) {
          s.trailTimer = 0;
          s.trail.push(sub(s.pos, scale(s.basis.fwd, 2.2 * s.scale)));
          if (s.trail.length > 14) s.trail.shift();
        }
      }
    }
  }

  function damageShip(ship, dmg, fromPlayer) {
    if (!ship.alive) return;
    ship.hp -= dmg;
    ship.hitFlash = 1.0;
    if (ship.isEnemy) {
      ship.actionState = "hit";
      ship.actionTimer = 0.24;
    }
    if (fromPlayer) window.SFX.playHit();

    if (ship.hp <= 0) {
      ship.alive = false;
      if (ship.isEnemy) {
        ship.actionState = "death";
        ship.deathTimer = 0.36;
      }
      spawnExplosion(ship.pos, ship.isCapital || ship.kind === "enemyCorvette");

      if (ship.isEnemy) {
        score += ship.scoreVal;
        if (ship.isCapital) capitalKills++;
        else kills++;
        // Small shield recharge reward on kill
        player.shield = Math.min(player.maxShield, player.shield + (ship.isCapital ? 35 : 10));

        if (ship.isBoss) {
          // Extra multi-burst chain explosion for Dreadnought Flagship!
          setTimeout(() => spawnExplosion(add(ship.pos, v3(18, 8, -10)), true), 220);
          setTimeout(() => spawnExplosion(add(ship.pos, v3(-16, -6, 14)), true), 480);
        }
      }
    }
  }

  function updateProjectilesAndParticles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        projectiles.splice(i, 1);
        continue;
      }

      // Homing missile steering
      if (pr.isMissile && pr.target && pr.target.alive) {
        const toT = norm(sub(pr.target.pos, pr.pos));
        pr.dir = norm(lerpV3(pr.dir, toT, Math.min(1, dt * 6.5)));
        if (Math.random() < 0.7) {
          particles.push({
            pos: { ...pr.pos },
            vel: v3(0, 0, 0),
            life: 0.25,
            maxLife: 0.25,
            size: 1.6,
            color: "#ffd166",
          });
        }
      }

      pr.pos = add(pr.pos, scale(pr.dir, pr.speed * dt));

      // Hit Earth surface
      if (len(pr.pos) < EARTH_RADIUS + 2) {
        particles.push({ pos: pr.pos, vel: v3(0, 0, 0), life: 0.2, maxLife: 0.2, size: 3, color: "#7ee8ff" });
        projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      if (pr.isEnemy) {
        // Check hit on player (respect Barrel Roll invulnerability, Cloak & Shield Dome!)
        if (len(sub(pr.pos, player.pos)) < (pr.isCapital ? 9.5 : 6.2)) {
          if (player.rollAnim && player.rollAnim.active) {
            pr.dir = norm(add(pr.dir, scale(player.basis.right, 0.9)));
            hit = false;
          } else {
            applyPlayerDamage(pr.damage, null, false);
            hit = true;
          }
        }
        // Check hit on friendlies
        if (!hit) {
          for (let j = 0; j < friendlies.length; j++) {
            const f = friendlies[j];
            if (!f.alive) continue;
            const hitR = f.model.radius * f.scale * 0.95;
            if (len(sub(pr.pos, f.pos)) < hitR) {
              damageShip(f, pr.damage * 0.6, false);
              hit = true;
              break;
            }
          }
        }
      } else {
        // Check hit on enemies
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.alive) continue;
          const hitR = e.model.radius * e.scale * (pr.isMissile ? 1.45 : 1.15);
          if (len(sub(pr.pos, e.pos)) < hitR) {
            damageShip(e, pr.damage, true);
            if (pr.isMissile) spawnExplosion(pr.pos, false, ["#ffffff", "#ffea61", "#ff7f50"]);
            hit = true;
            break;
          }
        }
      }

      if (hit) projectiles.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      pt.pos = add(pt.pos, scale(pt.vel, dt));
      pt.vel = scale(pt.vel, 1 - dt * 1.4);
      if (pt.ring) pt.size += dt * 42;
    }

    // 3D Shockwave Rings & Afterimage Ghosts
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life -= dt;
      if (rings[i].life <= 0) { rings.splice(i, 1); continue; }
      rings[i].radius += rings[i].growSpd * dt;
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    }
  }

  function checkMissionProgression() {
    // Player destroyed?
    if (player.hp <= 0) {
      gameMode = "gameover";
      spawnExplosion(player.pos, true);
      showEndScreen(false);
      return;
    }

    const aliveEnemies = enemies.filter((e) => e.alive);
    const boss = aliveEnemies.find((e) => e.isBoss);

    // Update Boss Health Bar
    if (boss) {
      bossBar.classList.remove("hidden");
      const pct = Math.max(0, Math.round((boss.hp / boss.maxHp) * 100));
      bossPctEl.textContent = pct + "%";
      bossFillEl.style.width = pct + "%";
    } else {
      bossBar.classList.add("hidden");
    }

    if (stage === 1 && aliveEnemies.length === 0) {
      spawnStage2Ascent();
    } else if (stage === 3) {
      const aliveCaps = aliveEnemies.filter((e) => e.isCapital);
      if (!boss && aliveCaps.length === 0) {
        clearedMissions.add(currentMission.id);
        window.SolarMissions.saveCleared(clearedMissions);
        gameMode = "victory";
        window.SFX.playStageFanfare();
        showEndScreen(true);
      }
    }
  }

  function showEndScreen(victory) {
    const m = currentMission;
    const nextM = window.SolarMissions.getNext(m.id);
    document.getElementById("end-tag").textContent = victory
      ? `${m.name}解放成功 · 太陽系進度 ${clearedMissions.size}/9`
      : `${m.name}防禦受挫 · 星艦緊急撤離`;
    document.getElementById("end-title").textContent = victory
      ? `${m.name}蟲族艦隊全滅！`
      : "星艦已遭蟲族擊墜";
    document.getElementById("end-desc").textContent = victory
      ? m.victoryDesc
      : `${m.name}空域的蟲族攻勢過於猛烈，請重整星艦護盾後再次出擊。`;
    document.getElementById("stat-kills").textContent = kills;
    document.getElementById("stat-caps").textContent = capitalKills;
    document.getElementById("stat-score").textContent = score;
    if (victory && nextM) {
      btnNextMission.textContent = `▶ 前往下一行星：${nextM.name}`;
      btnNextMission.classList.remove("hidden");
    } else {
      btnNextMission.classList.add("hidden");
    }
    endOverlay.classList.remove("hidden");
  }

  // ---- Main Frame Loop ----
  let lastT = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    time += dt;

    if (commsTimer > 0) {
      commsTimer -= dt;
      if (commsTimer <= 0) commsBar.classList.add("hidden");
    }
    if (crashAlertTimer > 0) crashAlertTimer = Math.max(0, crashAlertTimer - dt);
    if (camShake > 0) camShake = Math.max(0, camShake - dt * 5.2);

    let lockedTarget = null;
    let boosting = false;
    let alt = 48;

    const modalOpen =
      !missionOverlay.classList.contains("hidden") ||
      !hangarOverlay.classList.contains("hidden") ||
      !bestiaryOverlay.classList.contains("hidden") ||
      (dockMenuDrawer && !dockMenuDrawer.classList.contains("hidden"));

    if (gameMode === "playing" && player && !modalOpen) {
      const res = updatePlayer(dt);
      lockedTarget = res.locked;
      boosting = res.boosting;
      alt = res.alt;

      updateAIShips(dt);
      resolveCollisions();
      updateProjectilesAndParticles(dt);
      checkMissionProgression();

      // Update Camera (pull back smoothly during 180° U-Turn + apply collision shake)
      if (viewMode === "cockpit") {
        camPos = add(player.pos, add(scale(player.basis.up, 0.55), scale(player.basis.fwd, 0.7)));
        camQuat = player.quat;
      } else {
        const camBack = player.uturn.active ? -21.0 : -15.5;
        const camUp = player.uturn.active ? 5.6 : 4.2;
        const followRate = player.uturn.active ? 6.5 : 11;
        const desiredCamPos = add(
          player.pos,
          add(scale(player.basis.fwd, camBack), scale(player.basis.up, camUp))
        );
        camPos = lerpV3(camPos, desiredCamPos, Math.min(1, dt * followRate));
        camQuat = qSlerp(camQuat, player.quat, Math.min(1, dt * followRate));
      }

      if (camShake > 0.02) {
        const jb = qBasis(camQuat);
        const s = camShake * 0.9;
        camPos = add(
          camPos,
          add(scale(jb.right, (Math.random() - 0.5) * s), scale(jb.up, (Math.random() - 0.5) * s))
        );
      }

      dockScore.textContent = "積分 " + String(score).padStart(5, "0");
    } else if (gameMode === "playing" && player) {
      // Paused cleanly while browsing Hangar / Mission Map / Zerg Bestiary
      alt = len(player.pos) - EARTH_RADIUS;
      lockedTarget = getLockedTarget();
    } else {
      updateTitleCamera(dt);
    }

    const camBasis = qBasis(camQuat);

    // 1. Render Procedural WebGL Pixel Planet (all 9 Solar System planets!)
    if (planetRenderer.ok) {
      planetRenderer.render({
        time,
        camPos,
        camRight: camBasis.right,
        camUp: camBasis.up,
        camFwd: camBasis.fwd,
        tanHalfFov: TAN_HALF_FOV,
        sunDir: SUN_DIR,
        earthRadius: EARTH_RADIUS,
        planetType: currentMission.planetIndex,
        sunScale: currentMission.sunScale,
        hasMoon: currentMission.hasMoon,
      });
    } else {
      fxCtx.fillStyle = "#081428";
      fxCtx.fillRect(0, 0, pixW, pixH);
    }

    // 2. Render 3D Starships, Capital Fleets, Ion Trails, Lasers & Pixel Explosions
    if (gameMode !== "title" && player) {
      const renderShips = [];

      // 3D Afterimage Ghosts (Barrel Roll / Phase Blink)
      for (let i = 0; i < ghosts.length; i++) {
        const gh = ghosts[i];
        renderShips.push({
          visible: true,
          force3D: true,
          pos: gh.pos,
          basis: gh.basis,
          model: gh.model,
          scale: gh.scale,
          ghostAlpha: gh.life / gh.maxLife,
        });
      }

      // Player Selected 3D Volumetric Starship (visible in 3rd-person)
      if (viewMode === "third" && player.hp > 0) {
        const bankedQ = qMul(player.quat, qFromAxisAngle(v3(0, 0, 1), player.rollVisual));
        const pSpec = player.shipSpec || selectedShip;
        const pModel = window.Models.getStarship(pSpec.id);
        renderShips.push({
          visible: true,
          isPlayer: true,
          force3D: use3DStarships,
          pixelEdges: use3DStarships,
          pos: player.pos,
          basis: qBasis(bankedQ),
          model: pModel,
          act: player.act,
          spriteKind: "ship",
          spriteKey: pSpec.id,
          spriteWorldSize: 8.6 * (pSpec.scale || 1.0),
          flipY: !!pSpec.flipY,
          rollVisual: player.rollVisual,
          radius: pModel.radius || 3.8,
          scale: (pSpec.scale || 1.0) * 0.72,
          hitFlash: player.hitFlash,
          thrusterFlame: boosting ? 1.9 : (keys["KeyX"] ? 0.15 : 0.75),
          isEnemy: false,
        });
      }

      for (let i = 0; i < friendlies.length; i++) {
        const f = friendlies[i];
        if (!f.alive) continue;
        renderShips.push({
          visible: true,
          force3D: use3DStarships,
          pixelEdges: use3DStarships && !f.isCapital,
          pos: f.pos,
          basis: f.basis,
          model: f.model,
          spriteKind: f.spriteKind || "ship",
          spriteKey: f.spriteKey,
          spriteWorldSize: f.spriteWorldSize,
          radius: f.radius,
          isCapital: f.isCapital,
          scale: f.scale,
          hitFlash: f.hitFlash,
          thrusterFlame: f.isCapital ? 0.55 : 0.75,
          isEnemy: false,
        });
      }

      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive && !(e.deathTimer > 0)) continue;
        renderShips.push({
          visible: true,
          pos: e.pos,
          basis: e.basis,
          model: e.model,
          spriteKind: e.spriteKind || "zerg",
          spriteKey: e.spriteKey,
          spriteWorldSize: e.spriteWorldSize,
          radius: e.radius,
          isCapital: e.isCapital,
          isBoss: e.isBoss,
          scale: e.scale,
          hitFlash: e.hitFlash,
          actionState: !e.alive ? "death" : e.actionState,
          animSeed: e.id * 1.7,
          thrusterFlame: 0,
          isEnemy: true,
        });
      }

      // Build Ion / Vapor Contrails (gold-cyan vortex trails during 180° U-Turn!)
      const inSpace = alt > 200;
      const trails = [];
      if (viewMode === "third") {
        const pColorFn = player.uturn.active
          ? (a) => `rgba(255, 224, 92, ${a.toFixed(2)})`
          : (inSpace
            ? (a) => `rgba(92, 240, 255, ${a.toFixed(2)})`
            : (a) => `rgba(240, 248, 255, ${a.toFixed(2)})`);
        trails.push({ pts: player.trailL, alpha: boosting ? 0.92 : 0.65, colorFn: pColorFn });
        trails.push({ pts: player.trailR, alpha: boosting ? 0.92 : 0.65, colorFn: pColorFn });
      }
      // Friendly wingman ion trails (only Federation Starships leave crisp ion ribbons;
      // organic Zerg monsters shed pulsing bio-spore droplets instead of jet contrails!)
      for (let i = 0; i < friendlies.length; i++) {
        const f = friendlies[i];
        if (f.alive && f.trail.length > 1) {
          trails.push({ pts: f.trail, alpha: 0.55, colorFn: (a) => `rgba(110, 230, 255, ${a.toFixed(2)})` });
        }
      }

      const camObj = {
        pos: camPos,
        right: camBasis.right,
        up: camBasis.up,
        fwd: camBasis.fwd,
        tanHalfFov: TAN_HALF_FOV,
      };

      const { project } = window.Renderer3D.renderScene(fxCtx, pixW, pixH, {
        cam: camObj,
        sunDir: SUN_DIR,
        earthRadius: EARTH_RADIUS,
        ships: renderShips,
        trails,
        projectiles,
        particles,
        rings,
        boostAlpha: boosting ? 0.85 : 0,
        time,
      });

      // 3. Render Traditional Chinese Cockpit / Tactical HUD + Crisp Native HTML Battle HUD
      updateBattleHudDOM(lockedTarget, boosting, alt);
      window.CockpitHUD.render(fxCtx, pixW, pixH, {
        cam: camObj,
        player,
        enemies,
        friendlies,
        lockedTarget,
        autoLockEnabled,
        lockProgress,
        uturnActive: player.uturn.active,
        uturnCd: player.uturn.cd,
        crashAlertText,
        crashAlertTimer,
        boosting,
        altitude: alt,
        planetName: currentMission.name,
        playerShipName: selectedShip.name,
        stage,
        viewMode,
        time,
        kills: kills + capitalKills,
        enemyCount: enemies.filter((e) => e.alive).length,
        friendlyCount: friendlies.filter((f) => f.alive).length,
      }, project);
    } else {
      updateBattleHudDOM(null, false, 48);
      fxCtx.clearRect(0, 0, pixW, pixH);
    }

    requestAnimationFrame(frame);
  }

  // ---- Controls & UI Bindings ----
  function toggleCamera() {
    viewMode = viewMode === "third" ? "cockpit" : "third";
    btnCam.textContent = viewMode === "cockpit" ? "視角：星艦座艙" : "視角：第三人稱";
    btnCam.classList.toggle("active", viewMode === "cockpit");
  }

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "KeyF" && gameMode === "playing" && player) {
      firePlayerMissile(getLockedTarget() || findBestLockTarget(false));
      keys["KeyF"] = false;
    }
    if (e.code === "KeyZ" && !e.repeat) {
      triggerUTurn();
    }
    if (e.code === "KeyB" && !e.repeat) triggerBarrelRoll();
    if (e.code === "KeyG" && !e.repeat) triggerShieldDome();
    if (e.code === "KeyT" && !e.repeat) triggerNovaBeam();
    if (e.code === "KeyH" && !e.repeat) triggerCloakBlink();
    if (e.code === "KeyU" && !e.repeat) triggerEMP();
    if (e.code === "KeyJ" && !e.repeat) triggerFlares();
    if (e.code === "KeyK" && !e.repeat) triggerOverdrive();
    // Double-tap S / ArrowDown within 280ms also triggers 180° U-Turn!
    if ((e.code === "KeyS" || e.code === "ArrowDown") && !e.repeat) {
      const nowMs = performance.now();
      if (nowMs - lastDownTapTime < 280) {
        triggerUTurn();
        lastDownTapTime = 0;
      } else {
        lastDownTapTime = nowMs;
      }
    }
    if (e.code === "KeyR" && !e.repeat) toggleAutoLock();
    if (e.code === "Tab" && !e.repeat) cycleNextTarget();
    if (e.code === "KeyC" || e.code === "KeyV") toggleCamera();
    if (e.code === "KeyM") {
      const m = !window.SFX.isMuted();
      window.SFX.setMuted(m);
      btnMute.textContent = m ? "音效：關" : "音效：開";
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  fxCanvas.addEventListener("mousedown", (e) => {
    if (dockMenuDrawer && !dockMenuDrawer.classList.contains("hidden")) {
      toggleMenuDrawer(false);
      return;
    }
    if (gameMode !== "playing") return;
    window.SFX.ensure();
    if (e.button === 0) mouseFire = true;
    if (e.button === 2) {
      firePlayerMissile(getLockedTarget() || findBestLockTarget(false));
    }
  });
  window.addEventListener("mouseup", () => { mouseFire = false; });
  fxCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

  btnStart.addEventListener("click", () => startMission("earth", false));
  btnOpenHangarTitle.addEventListener("click", openHangar);
  btnCloseHangar.addEventListener("click", closeHangar);
  btnHangar.addEventListener("click", openHangar);
  btnOpenMapTitle.addEventListener("click", openMissionMap);
  btnOpenBestiaryTitle.addEventListener("click", openBestiary);
  btnCloseBestiary.addEventListener("click", closeBestiary);
  btnBestiary.addEventListener("click", openBestiary);
  btnOpenMapEnd.addEventListener("click", () => {
    endOverlay.classList.add("hidden");
    openMissionMap();
  });
  btnCloseMap.addEventListener("click", closeMissionMap);
  btnMissions.addEventListener("click", openMissionMap);
  btnRestart.addEventListener("click", () => startMission(currentMission.id, false));
  btnNextMission.addEventListener("click", () => {
    const nextM = window.SolarMissions.getNext(currentMission.id);
    if (nextM) startMission(nextM.id, false);
    else openMissionMap();
  });

  // Auto-close command drawer when launching modals or switching zones
  if (btnToggleMenu) btnToggleMenu.addEventListener("click", () => toggleMenuDrawer());
  if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", () => toggleMenuDrawer(false));
  if (btnToggleSkills) btnToggleSkills.addEventListener("click", toggleSkillsPanel);
  if (btnCamDrawer) btnCamDrawer.addEventListener("click", () => { toggleCamera(); toggleMenuDrawer(false); });
  if (btnZoneSpaceDrawer) btnZoneSpaceDrawer.addEventListener("click", () => { warpToZone(true); toggleMenuDrawer(false); });

  if (dockMenuDrawer) {
    dockMenuDrawer.querySelectorAll("button").forEach((b) => {
      if (b.id === "btn-close-drawer" || b.id === "btn-diff" || b.id === "btn-3d-mode" || b.id === "btn-autolock") return;
      b.addEventListener("click", () => toggleMenuDrawer(false));
    });
  }

  btnCam.addEventListener("click", toggleCamera);
  btnAutoLock.addEventListener("click", toggleAutoLock);
  btnNextTarget.addEventListener("click", cycleNextTarget);
  btnUTurn.addEventListener("click", triggerUTurn);
  if (btn3DMode) btn3DMode.addEventListener("click", toggle3DMode);
  if (btnRoll) btnRoll.addEventListener("click", () => triggerBarrelRoll());
  if (btnShield) btnShield.addEventListener("click", triggerShieldDome);
  if (btnBeam) btnBeam.addEventListener("click", triggerNovaBeam);
  const btnCloak = document.getElementById("btn-cloak");
  if (btnCloak) btnCloak.addEventListener("click", triggerCloakBlink);
  if (btnEmp) btnEmp.addEventListener("click", triggerEMP);
  const btnFlares = document.getElementById("btn-flares");
  if (btnFlares) btnFlares.addEventListener("click", triggerFlares);
  if (btnOverdrive) btnOverdrive.addEventListener("click", triggerOverdrive);

  // Wire clickable Bottom-HUD Skill Chips (auto-collapse on mobile after casting so sky stays clear!)
  function wrapSkillClick(fn) {
    return () => {
      fn();
      if (window.innerWidth <= 768 && skillsPanelOpen) {
        skillsPanelOpen = false;
        syncSkillsToggleUI();
      }
    };
  }
  if (hudSkillChips.roll) hudSkillChips.roll.addEventListener("click", wrapSkillClick(() => triggerBarrelRoll()));
  if (hudSkillChips.uturn) hudSkillChips.uturn.addEventListener("click", wrapSkillClick(triggerUTurn));
  if (hudSkillChips.shield) hudSkillChips.shield.addEventListener("click", wrapSkillClick(triggerShieldDome));
  if (hudSkillChips.beam) hudSkillChips.beam.addEventListener("click", wrapSkillClick(triggerNovaBeam));
  if (hudSkillChips.cloak) hudSkillChips.cloak.addEventListener("click", wrapSkillClick(triggerCloakBlink));
  if (hudSkillChips.emp) hudSkillChips.emp.addEventListener("click", wrapSkillClick(triggerEMP));
  if (hudSkillChips.flares) hudSkillChips.flares.addEventListener("click", wrapSkillClick(triggerFlares));
  if (hudSkillChips.overdrive) hudSkillChips.overdrive.addEventListener("click", wrapSkillClick(triggerOverdrive));
  btnZoneEarth.addEventListener("click", () => warpToZone(false));
  btnZoneSpace.addEventListener("click", () => warpToZone(true));

  if (btnBoost) {
    btnBoost.addEventListener("mousedown", () => { touchBoost = true; });
    btnBoost.addEventListener("mouseup", () => { touchBoost = false; });
    btnBoost.addEventListener("mouseleave", () => { touchBoost = false; });
    btnBoost.addEventListener("touchstart", (e) => { e.preventDefault(); touchBoost = true; });
    btnBoost.addEventListener("touchend", () => { touchBoost = false; });
  }

  // Dedicated Mobile Thumb Combat Pad (Attack Laser, Homing Missile, Boost, U-Turn, Skill Tray)
  if (mobLaser) {
    const startFire = (e) => { e.preventDefault(); window.SFX.ensure(); touchFire = true; mobLaser.classList.add("pressed"); };
    const stopFire = () => { touchFire = false; mobLaser.classList.remove("pressed"); };
    mobLaser.addEventListener("touchstart", startFire);
    mobLaser.addEventListener("touchend", stopFire);
    mobLaser.addEventListener("touchcancel", stopFire);
    mobLaser.addEventListener("mousedown", startFire);
    mobLaser.addEventListener("mouseup", stopFire);
    mobLaser.addEventListener("mouseleave", stopFire);
  }
  if (mobMissile) {
    const fireMis = (e) => {
      e.preventDefault();
      window.SFX.ensure();
      if (player) firePlayerMissile(getLockedTarget() || findBestLockTarget(false));
    };
    mobMissile.addEventListener("touchstart", fireMis);
    mobMissile.addEventListener("mousedown", fireMis);
  }
  if (mobBoost) {
    const startB = (e) => { e.preventDefault(); touchBoost = true; mobBoost.classList.add("pressed"); };
    const stopB = () => { touchBoost = false; mobBoost.classList.remove("pressed"); };
    mobBoost.addEventListener("touchstart", startB);
    mobBoost.addEventListener("touchend", stopB);
    mobBoost.addEventListener("touchcancel", stopB);
    mobBoost.addEventListener("mousedown", startB);
    mobBoost.addEventListener("mouseup", stopB);
    mobBoost.addEventListener("mouseleave", stopB);
  }
  if (mobUTurn) {
    mobUTurn.addEventListener("touchstart", (e) => { e.preventDefault(); triggerUTurn(); });
    mobUTurn.addEventListener("click", triggerUTurn);
  }
  if (mobSkillsToggle) {
    mobSkillsToggle.addEventListener("click", toggleSkillsPanel);
  }

  if (btnDiff) btnDiff.addEventListener("click", cycleDifficulty);
  if (titleDiffSelector) {
    titleDiffSelector.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.addEventListener("click", () => setDifficulty(btn.getAttribute("data-diff"), false));
    });
  }

  btnMute.addEventListener("click", () => {
    const m = !window.SFX.isMuted();
    window.SFX.setMuted(m);
    btnMute.textContent = m ? "音效：關" : "音效：開";
  });

  // Virtual Flight Joystick (supports touch + mouse drag for mobile & emulator testing)
  touchPad.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchStick.active = true;
    touchStick.id = t.identifier;
    updateTouchStick(t);
  });
  touchPad.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchStick.id) updateTouchStick(t);
    }
  });
  const endStick = () => {
    touchStick.active = false;
    touchStick.x = 0;
    touchStick.y = 0;
    touchKnob.style.transform = "translate(0px, 0px)";
  };
  touchPad.addEventListener("touchend", endStick);
  touchPad.addEventListener("touchcancel", endStick);

  function updateTouchStick(t) {
    const rect = touchPad.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.36;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) {
      dx = (dx / d) * maxR;
      dy = (dy / d) * maxR;
    }
    touchStick.x = dx / maxR;
    touchStick.y = dy / maxR;
    touchKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  requestAnimationFrame(frame);
})();
