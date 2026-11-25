// ============================================================================
// cockpit.js — Traditional Chinese 8-Bit/16-Bit Starfleet Cockpit & Tactical HUD
// Features: Pixel-art cockpit frame, live 3D attitude artificial horizon,
// rotating mini ship wireframe monitor, tactical space radar, pitch ladder,
// target lock-on brackets, lead reticle & off-screen directional markers.
// ============================================================================

window.CockpitHUD = (function () {
  const { sub, dot, norm, len } = window.M3;

  function drawCornerBox(ctx, x, y, r, color) {
    const k = Math.max(3, Math.floor(r * 0.45));
    const x0 = Math.round(x - r), y0 = Math.round(y - r);
    const x1 = Math.round(x + r), y1 = Math.round(y + r);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // TL
    ctx.moveTo(x0, y0 + k); ctx.lineTo(x0, y0); ctx.lineTo(x0 + k, y0);
    // TR
    ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + k);
    // BR
    ctx.moveTo(x1, y1 - k); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1);
    // BL
    ctx.moveTo(x0 + k, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - k);
    ctx.stroke();
  }

  function drawDiamond(ctx, x, y, r, color) {
    const ix = Math.round(x), iy = Math.round(y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ix, iy - r);
    ctx.lineTo(ix + r, iy);
    ctx.lineTo(ix, iy + r);
    ctx.lineTo(ix - r, iy);
    ctx.closePath();
    ctx.stroke();
  }

  // Draw enemy target brackets, lock-on diamond, lead pip & off-screen arrows
  function drawTargeting(ctx, w, h, state, project) {
    const cam = state.cam;
    const locked = state.lockedTarget;
    const enemies = state.enemies;

    ctx.font = 'bold 9px "Noto Sans TC", "Microsoft JhengHei", monospace';
    ctx.textBaseline = "middle";

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const dist = len(sub(e.pos, state.player.pos));
      if (dist > 2200) continue;

      const sp = project(e.pos);
      const isLocked = locked && locked.id === e.id;
      const onScreen = sp && sp.x >= 10 && sp.x <= w - 10 && sp.y >= 10 && sp.y <= h - 10;

      if (onScreen) {
        const boxR = e.isCapital ? Math.min(26, Math.max(11, 2200 / (sp.z + 60))) : Math.min(14, Math.max(6, 520 / (sp.z + 30)));
        const lockFull = isLocked && state.lockProgress >= 0.95;
        const col = lockFull ? "#ffea61" : (isLocked ? "#5ef2ff" : (e.isCapital ? "#ff5c8a" : "#ff4d5a"));
        drawCornerBox(ctx, sp.x, sp.y, boxR, col);

        if (isLocked) {
          const pulse = lockFull ? (2 + Math.sin(state.time * 14) * 2) : (10 * (1 - state.lockProgress) + 2);
          drawDiamond(ctx, sp.x, sp.y, boxR + pulse, lockFull ? "#ffea61" : "#5ef2ff");
          ctx.fillStyle = lockFull ? "#ffea61" : "#7ee8ff";
          ctx.textAlign = "center";
          ctx.fillText(lockFull ? "鎖定完成" : "自動鎖定中", Math.round(sp.x), Math.round(sp.y - boxR - 7));

          // Lead-target aiming circle (for fighters/corvettes)
          if (e.vel && dist < 560) {
            const flightT = dist / 360;
            const leadPos = {
              x: e.pos.x + e.vel.x * flightT,
              y: e.pos.y + e.vel.y * flightT,
              z: e.pos.z + e.vel.z * flightT,
            };
            const lp = project(leadPos);
            if (lp && lp.x > 8 && lp.x < w - 8 && lp.y > 8 && lp.y < h - 8) {
              ctx.strokeStyle = lockFull ? "#ffea61" : "#5ef2ff";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(Math.round(lp.x), Math.round(lp.y), 4, 0, Math.PI * 2);
              ctx.stroke();
              // Connector from target to lead point
              ctx.strokeStyle = "rgba(94,242,255,0.45)";
              ctx.beginPath();
              ctx.moveTo(Math.round(sp.x), Math.round(sp.y));
              ctx.lineTo(Math.round(lp.x), Math.round(lp.y));
              ctx.stroke();
            }
          }
        }

        // Distance & HP bar for capital ships or locked target
        if (isLocked || e.isCapital || dist < 240) {
          const distStr = dist >= 100 ? (dist / 100).toFixed(1) + "km" : Math.round(dist * 10) + "m";
          ctx.fillStyle = isLocked ? "#ffffff" : "#ffb0b8";
          ctx.textAlign = "center";
          ctx.fillText(distStr, Math.round(sp.x), Math.round(sp.y + boxR + 7));

          // Mini HP bar
          const bw = e.isCapital ? 30 : 18;
          const bx = Math.round(sp.x - bw * 0.5);
          const by = Math.round(sp.y - boxR - (isLocked ? 15 : 6));
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(bx, by, bw, 3);
          ctx.fillStyle = e.isBoss ? "#ff3870" : "#ff5757";
          ctx.fillRect(bx, by, Math.max(1, Math.round(bw * (e.hp / e.maxHp))), 3);
        }
      } else if (isLocked || e.isCapital || i < 4) {
        // Off-screen edge directional arrow
        const rel = sub(e.pos, cam.pos);
        const rx = dot(rel, cam.right);
        const ry = dot(rel, cam.up);
        const ang = Math.atan2(-ry, rx);
        const pad = 16;
        const cx = w * 0.5, cy = h * 0.5;
        const maxX = cx - pad, maxY = cy - (state.viewMode === "cockpit" ? 42 : pad);
        const cosA = Math.cos(ang), sinA = Math.sin(ang);
        const tx = Math.abs(cosA) > 1e-4 ? maxX / Math.abs(cosA) : 1e6;
        const ty = Math.abs(sinA) > 1e-4 ? maxY / Math.abs(sinA) : 1e6;
        const t = Math.min(tx, ty);
        const ax = Math.round(cx + cosA * t);
        const ay = Math.round(Math.min(h - (state.viewMode === "cockpit" ? 68 : 16), Math.max(18, cy + sinA * t)));

        ctx.fillStyle = e.isBoss ? "#ff3870" : (isLocked ? "#ffea61" : "#ff4d5a");
        ctx.beginPath();
        ctx.moveTo(ax + cosA * 5, ay + sinA * 5);
        ctx.lineTo(ax - cosA * 3 - sinA * 3.5, ay - sinA * 3 + cosA * 3.5);
        ctx.lineTo(ax - cosA * 3 + sinA * 3.5, ay - sinA * 3 - cosA * 3.5);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Stage 2 Orbital Ascent Guide Arrow!
    if (state.stage === 2 && state.altitude < 230) {
      const upWorld = norm(state.player.pos);
      const beacon = {
        x: state.player.pos.x + upWorld.x * 260,
        y: state.player.pos.y + upWorld.y * 260,
        z: state.player.pos.z + upWorld.z * 260,
      };
      const bp = project(beacon);
      const cx = w * 0.5;
      const blink = Math.floor(state.time * 4) % 2 === 0;
      ctx.fillStyle = blink ? "#62f5ff" : "#ffffff";
      ctx.textAlign = "center";
      ctx.font = 'bold 10px "Noto Sans TC", "Microsoft JhengHei", monospace';
      if (bp && bp.x > 30 && bp.x < w - 30 && bp.y > 24 && bp.y < h - 75) {
        drawDiamond(ctx, bp.x, bp.y, 10, "#62f5ff");
        ctx.fillText("▲ 飛往太空艦隊戰場 ▲", Math.round(bp.x), Math.round(bp.y - 16));
      } else {
        ctx.fillText("▲ 拉升機頭 + SHIFT 曲速升空突破大氣層 ▲", Math.round(cx), 28);
      }
    }
  }

  // Draw Sci-Fi Holographic Tactical Radar (concentric rings + phosphor sweep wedge)
  function drawRadar(ctx, cx, cy, r, state) {
    ctx.save();
    // Outer holographic glow bezel
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(72, 232, 255, 0.42)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(3, 22, 24, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "#48f2ff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner range rings & axis crosshairs
    ctx.strokeStyle = "rgba(72, 242, 255, 0.24)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Cardinal outer ticks
    ctx.strokeStyle = "rgba(126, 255, 200, 0.7)";
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.lineTo(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1));
      ctx.stroke();
    }

    // Phosphor sweeping radar wedge fan!
    const sweep = (state.time * 2.5) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 1, sweep - 0.55, sweep);
    ctx.closePath();
    ctx.fillStyle = "rgba(72, 245, 210, 0.22)";
    ctx.fill();

    ctx.strokeStyle = "rgba(110, 255, 235, 0.85)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r);
    ctx.stroke();

    const p = state.player;
    const basis = p.basis;
    const range = state.altitude > 220 ? 900 : 480;

    // Friendly blips (cyan)
    for (let i = 0; i < state.friendlies.length; i++) {
      const f = state.friendlies[i];
      if (!f.alive) continue;
      const rel = sub(f.pos, p.pos);
      const rx = dot(rel, basis.right) / range;
      const rz = dot(rel, basis.fwd) / range;
      const d = Math.hypot(rx, rz);
      const k = d > 0.92 ? 0.92 / d : 1;
      const px = Math.round(cx + rx * k * r);
      const py = Math.round(cy - rz * k * r);
      ctx.fillStyle = "#5ef2ff";
      const s = f.isCapital ? 3 : 2;
      ctx.fillRect(px - 1, py - 1, s, s);
    }

    // Enemy blips (red / magenta for boss)
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.alive) continue;
      const rel = sub(e.pos, p.pos);
      const rx = dot(rel, basis.right) / range;
      const rz = dot(rel, basis.fwd) / range;
      const d = Math.hypot(rx, rz);
      const k = d > 0.92 ? 0.92 / d : 1;
      const px = Math.round(cx + rx * k * r);
      const py = Math.round(cy - rz * k * r);
      ctx.fillStyle = e.isBoss ? "#ff388c" : (e.isCapital ? "#ffaa33" : "#ff4252");
      const s = e.isBoss ? 4 : (e.isCapital ? 3 : 2);
      ctx.fillRect(px - Math.floor(s * 0.5), py - Math.floor(s * 0.5), s, s);
    }

    // Center player chevron
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.restore();
  }

  // Draw detailed 16-bit Pixel-Art Starfleet Cockpit (inspired by Video 2 + Video 1)
  function drawCockpit(ctx, w, h, state) {
    const p = state.player;
    const basis = p.basis;
    const upLocal = norm(p.pos);

    // Compute pitch & roll relative to Earth's local horizon
    const pitchSin = Math.max(-1, Math.min(1, dot(basis.fwd, upLocal)));
    const pitchRad = Math.asin(pitchSin);
    const rollRad = Math.atan2(dot(basis.right, upLocal), dot(basis.up, upLocal));

    // ---- 1. Center Translucent HUD Glass & Pitch Ladder ----
    const hudW = Math.round(w * 0.44);
    const hudH = Math.round(h * 0.48);
    const hudX = Math.round((w - hudW) * 0.5);
    const hudY = Math.round(h * 0.14);
    const cx = Math.round(w * 0.5);
    const cy = Math.round(hudY + hudH * 0.5);

    ctx.fillStyle = "rgba(40, 220, 190, 0.06)";
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeStyle = "rgba(96, 245, 220, 0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX + 0.5, hudY + 0.5, hudW, hudH);

    // Pitch ladder clipped inside HUD glass
    ctx.save();
    ctx.beginPath();
    ctx.rect(hudX + 2, hudY + 2, hudW - 4, hudH - 4);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(-rollRad);
    const pxPerRad = hudH * 0.65;
    ctx.strokeStyle = "rgba(110, 255, 210, 0.55)";
    for (let deg = -60; deg <= 60; deg += 15) {
      const yOff = (pitchRad - (deg * Math.PI) / 180) * pxPerRad;
      if (Math.abs(yOff) > hudH * 0.7) continue;
      const barW = deg === 0 ? 34 : 18;
      ctx.beginPath();
      ctx.moveTo(-barW, Math.round(yOff));
      ctx.lineTo(-7, Math.round(yOff));
      ctx.moveTo(7, Math.round(yOff));
      ctx.lineTo(barW, Math.round(yOff));
      ctx.stroke();
    }
    ctx.restore();

    // Center gun reticle
    ctx.strokeStyle = "#7effd4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy); ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 6);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx, cy, 1, 1);

    // HUD Speed (left) & Altitude (right) readouts in Traditional Chinese
    const speedDisplay = Math.round(p.speed * 12);
    const altDisplay = Math.max(0, Math.round(state.altitude * 10));
    const pName = state.planetName || "地球";
    const zoneName = state.altitude > 240
      ? `${pName}・軌道太空`
      : (state.altitude > 100 ? `${pName}・高空` : `${pName}・地表空域`);

    ctx.font = 'bold 9px "Noto Sans TC", "Microsoft JhengHei", monospace';
    ctx.textBaseline = "top";
    ctx.fillStyle = "#8affd8";
    ctx.textAlign = "left";
    ctx.fillText(`速度 ${speedDisplay}`, hudX + 5, hudY + 4);
    ctx.textAlign = "right";
    ctx.fillText(`高度 ${altDisplay}m`, hudX + hudW - 5, hudY + 4);
    ctx.fillStyle = state.altitude > 240 ? "#7ee8ff" : "#ffe680";
    ctx.fillText(zoneName, hudX + hudW - 5, hudY + 16);

    // Left/Right HUD tick bars
    ctx.fillStyle = "rgba(110, 255, 210, 0.55)";
    for (let i = 0; i < 8; i++) {
      const ty = hudY + 28 + i * 10;
      if (ty > hudY + hudH - 8) break;
      ctx.fillRect(hudX + 4, ty, i % 2 === 0 ? 6 : 3, 1);
      ctx.fillRect(hudX + hudW - (i % 2 === 0 ? 10 : 7), ty, i % 2 === 0 ? 6 : 3, 1);
    }

    // ---- 2. Outer Starship Canopy Frame Struts (16-Bit Beveled Pixel Armor) ----
    const dashTop = Math.round(h * 0.72);

    // Left & right angled canopy pillars
    ctx.fillStyle = "#121a28";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w * 0.14, 0); ctx.lineTo(w * 0.05, dashTop); ctx.lineTo(0, dashTop);
    ctx.closePath(); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, 0); ctx.lineTo(w * 0.86, 0); ctx.lineTo(w * 0.95, dashTop); ctx.lineTo(w, dashTop);
    ctx.closePath(); ctx.fill();

    // Top canopy visor bar
    ctx.fillStyle = "#0e1522";
    ctx.fillRect(0, 0, w, 9);
    ctx.fillStyle = "#2b4163";
    ctx.fillRect(0, 9, w, 2);

    // Highlight accent trim on canopy struts (orange-amber sci-fi trim like Video 1/2!)
    ctx.strokeStyle = "#d96b2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, 9); ctx.lineTo(w * 0.05, dashTop);
    ctx.moveTo(w * 0.86, 9); ctx.lineTo(w * 0.95, dashTop);
    ctx.stroke();

    // ---- 3. Lower Armored Dashboard Console ----
    ctx.fillStyle = "#182130";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, dashTop + 8);
    ctx.lineTo(w * 0.24, dashTop - 4);
    ctx.lineTo(w * 0.76, dashTop - 4);
    ctx.lineTo(w, dashTop + 8);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Beveled top rim highlight
    ctx.strokeStyle = "#486284";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, dashTop + 8);
    ctx.lineTo(w * 0.24, dashTop - 4);
    ctx.lineTo(w * 0.76, dashTop - 4);
    ctx.lineTo(w, dashTop + 8);
    ctx.stroke();

    const panelY = dashTop + 4;
    const panelH = h - panelY - 6;

    // ---- Left CRT Monitor: Ship Integrity & Shield / Missiles ----
    const leftX = Math.round(w * 0.05);
    const leftW = Math.round(w * 0.29);
    ctx.fillStyle = "#051a14";
    ctx.fillRect(leftX, panelY, leftW, panelH);
    ctx.strokeStyle = "#3a5678";
    ctx.lineWidth = 2;
    ctx.strokeRect(leftX, panelY, leftW, panelH);

    // Wireframe mini starship icon inside left CRT
    const sx = leftX + Math.round(leftW * 0.24);
    const sy = panelY + Math.round(panelH * 0.56);
    ctx.strokeStyle = p.shield > 25 ? "#4ef5b8" : "#ff5a6e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 13);
    ctx.lineTo(sx + 5, sy - 2);
    ctx.lineTo(sx + 14, sy + 7);
    ctx.lineTo(sx + 14, sy + 11);
    ctx.lineTo(sx + 5, sy + 6);
    ctx.lineTo(sx + 4, sy + 12);
    ctx.lineTo(sx - 4, sy + 12);
    ctx.lineTo(sx - 5, sy + 6);
    ctx.lineTo(sx - 14, sy + 11);
    ctx.lineTo(sx - 14, sy + 7);
    ctx.lineTo(sx - 5, sy - 2);
    ctx.closePath();
    ctx.stroke();

    // Shield, Hull & Missile bars on right half of left CRT
    const barX = leftX + Math.round(leftW * 0.48);
    const barW = Math.round(leftW * 0.46);
    ctx.font = 'bold 8px "Noto Sans TC", "Microsoft JhengHei", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#5ef2ff";
    ctx.fillText(`護盾 ${Math.ceil(p.shield)}`, barX, panelY + 5);
    ctx.fillStyle = "#0b2e3d";
    ctx.fillRect(barX, panelY + 16, barW, 5);
    ctx.fillStyle = "#48e5ff";
    ctx.fillRect(barX, panelY + 16, Math.round(barW * (p.shield / p.maxShield)), 5);

    ctx.fillStyle = "#7effa8";
    ctx.fillText(`裝甲 ${Math.ceil(p.hp)}`, barX, panelY + 25);
    ctx.fillStyle = "#10331e";
    ctx.fillRect(barX, panelY + 36, barW, 5);
    ctx.fillStyle = p.hp > 35 ? "#57f287" : "#ff4d5a";
    ctx.fillRect(barX, panelY + 36, Math.round(barW * (p.hp / p.maxHp)), 5);

    ctx.fillStyle = "#ffd166";
    ctx.fillText(`飛彈 ${p.missiles}/${p.maxMissiles}`, barX, panelY + 46);
    ctx.fillStyle = state.uturnActive ? "#ffea61" : (state.uturnCd > 0 ? "#8aa5c7" : "#5ef2ff");
    const utTxt = state.uturnActive ? "大迴轉中" : (state.uturnCd > 0 ? `迴轉 ${state.uturnCd.toFixed(1)}s` : "大迴轉就緒");
    ctx.fillText(utTxt, leftX + 6, panelY + 5);

    // ---- Center Instrument: Live Artificial Horizon Attitude Sphere ----
    const attR = Math.max(18, Math.min(26, Math.floor(panelH * 0.44)));
    const attX = cx;
    const attY = panelY + Math.round(panelH * 0.52);

    ctx.save();
    ctx.beginPath();
    ctx.arc(attX, attY, attR, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(attX, attY);
    ctx.rotate(-rollRad);
    const horizonShift = Math.max(-attR, Math.min(attR, pitchRad * attR * 1.1));
    // Sky half
    ctx.fillStyle = state.altitude > 240 ? "#12244a" : "#267ad9";
    ctx.fillRect(-attR - 4, -attR - 4, attR * 2 + 8, attR + 4 + horizonShift);
    // Ground half
    ctx.fillStyle = "#9c5c2e";
    ctx.fillRect(-attR - 4, horizonShift, attR * 2 + 8, attR * 2 + 8);
    // Horizon white line
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-attR, Math.round(horizonShift), attR * 2, 1);
    ctx.restore();

    // Bezel ring & fixed center orange wings
    ctx.strokeStyle = "#8aa5c7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(attX, attY, attR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ff9d3b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(attX - 10, attY); ctx.lineTo(attX - 3, attY);
    ctx.moveTo(attX + 3, attY); ctx.lineTo(attX + 10, attY);
    ctx.stroke();
    ctx.fillStyle = "#ff9d3b";
    ctx.fillRect(attX - 1, attY - 1, 2, 2);

    // Thrust / Boost LEDs above attitude sphere
    const ledCount = 5;
    const boostLit = state.boosting ? 5 : Math.max(1, Math.round((p.speed / 130) * 5));
    for (let i = 0; i < ledCount; i++) {
      const lx = attX - 20 + i * 9;
      ctx.fillStyle = i < boostLit ? (i >= 3 ? "#ff8c42" : "#5ef2ff") : "#233247";
      ctx.fillRect(lx, panelY + 2, 6, 4);
    }

    // ---- Right CRT Monitor: Tactical Space Radar & Fleet Telemetry ----
    const rightW = Math.round(w * 0.29);
    const rightX = w - Math.round(w * 0.05) - rightW;
    ctx.fillStyle = "#061816";
    ctx.fillRect(rightX, panelY, rightW, panelH);
    ctx.strokeStyle = "#3a5678";
    ctx.lineWidth = 2;
    ctx.strokeRect(rightX, panelY, rightW, panelH);

    const radR = Math.max(16, Math.min(24, Math.floor(panelH * 0.41)));
    const radCx = rightX + radR + 8;
    const radCy = panelY + Math.round(panelH * 0.52);
    drawRadar(ctx, radCx, radCy, radR, state);

    const infoX = radCx + radR + 7;
    ctx.font = 'bold 8px "Noto Sans TC", "Microsoft JhengHei", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#5ef2ff";
    ctx.fillText("戰術雷達", infoX, panelY + 5);
    ctx.fillStyle = "#9eff78";
    ctx.fillText(`蟲群 ${state.enemyCount}`, infoX, panelY + 19);
    ctx.fillStyle = "#7effb2";
    ctx.fillText(`友軍 ${state.friendlyCount}`, infoX, panelY + 32);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`擊墜 ${state.kills}`, infoX, panelY + 45);
  }

  const ZERG_ACT_LABELS = {
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

  // Draw Sci-Fi Holographic 3rd-Person Visor Reticle & Curved Attitude Arcs + Holo-Radar
  function drawThirdPersonHUD(ctx, w, h, state) {
    const cx = Math.round(w * 0.5);
    const cy = Math.round(h * 0.46);
    const roll = (state.player && state.player.rollVisual) || 0;
    const locked = state.lockedTarget && state.lockProgress >= 0.95;

    ctx.save();
    ctx.translate(cx, cy);

    // Subtle tilting sci-fi holographic visor arcs flanking crosshair
    ctx.save();
    ctx.rotate(-roll * 0.45);
    const arcR = Math.round(Math.min(w, h) * 0.16);
    ctx.strokeStyle = locked ? "rgba(255, 234, 97, 0.48)" : "rgba(78, 235, 255, 0.36)";
    ctx.lineWidth = 1;
    // Left curved tactical arc
    ctx.beginPath();
    ctx.arc(0, 0, arcR, Math.PI * 0.78, Math.PI * 1.22);
    ctx.stroke();
    // Right curved tactical arc
    ctx.beginPath();
    ctx.arc(0, 0, arcR, -Math.PI * 0.22, Math.PI * 0.22);
    ctx.stroke();

    // Fine degree ticks on left/right visor arcs
    for (let i = -2; i <= 2; i++) {
      const aL = Math.PI + i * 0.16;
      const aR = i * 0.16;
      const tick = i === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(aL) * arcR, Math.sin(aL) * arcR);
      ctx.lineTo(Math.cos(aL) * (arcR + tick), Math.sin(aL) * (arcR + tick));
      ctx.moveTo(Math.cos(aR) * arcR, Math.sin(aR) * arcR);
      ctx.lineTo(Math.cos(aR) * (arcR + tick), Math.sin(aR) * (arcR + tick));
      ctx.stroke();
    }
    ctx.restore();

    // Precision sci-fi segmented targeting reticle
    ctx.strokeStyle = locked ? "#ffea61" : "rgba(110, 248, 255, 0.92)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-4, 0);
    ctx.moveTo(4, 0); ctx.lineTo(10, 0);
    ctx.moveTo(0, -9); ctx.lineTo(0, -4);
    ctx.moveTo(0, 4); ctx.lineTo(0, 9);
    ctx.stroke();
    // Inner micro-diamond center pip
    ctx.fillStyle = locked ? "#ffea61" : "#ffffff";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();

    // Bottom-right Holographic Tactical Radar
    drawRadar(ctx, w - 34, h - 34, 24, state);
  }

  function render(ctx, w, h, state, project) {
    // Targeting boxes drawn first (underneath cockpit pillars so pillars look 3D!)
    drawTargeting(ctx, w, h, state, project);

    if (state.viewMode === "cockpit") {
      drawCockpit(ctx, w, h, state);
    } else {
      drawThirdPersonHUD(ctx, w, h, state);
    }

    // 180-degree U-Turn maneuver banner
    if (state.uturnActive) {
      ctx.font = 'bold 11px "Noto Sans TC", "Microsoft JhengHei", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffea61";
      ctx.fillText("« 執行 180° 戰術大迴轉 »", Math.round(w * 0.5), Math.round(h * 0.43));
    }

    // Collision / Crash Warning Alert
    if (state.crashAlertTimer > 0 && state.crashAlertText) {
      const blink = Math.floor(state.time * 12) % 2 === 0;
      ctx.font = 'bold 11px "Noto Sans TC", "Microsoft JhengHei", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = blink ? "#ff384c" : "#ffffff";
      ctx.fillText("⚠ " + state.crashAlertText + " ⚠", Math.round(w * 0.5), Math.round(h * 0.62));
    }

    // Red damage vignette flash
    if (state.player.hitFlash > 0) {
      ctx.strokeStyle = `rgba(255, 50, 72, ${(state.player.hitFlash * 0.85).toFixed(2)})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
    }
  }

  return { render };
})();
