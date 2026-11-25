// ============================================================================
// renderer3d.js — Crisp Low-Res Pixel-Art 3D Rasterizer for Volumetric
// Starships, Per-Part Action Animations, Shield Domes, Nova Beams, EMP Rings,
// Ion Contrails, Lasers, Missiles & Explosions
// ============================================================================

window.Renderer3D = (function () {
  const { sub, dot } = window.M3;

  // Check if world point is occluded behind the planet sphere from camPos
  function isBehindEarth(camPos, worldPos, earthRadius) {
    if (!earthRadius || earthRadius <= 0) return false;
    const dx = worldPos.x - camPos.x;
    const dy = worldPos.y - camPos.y;
    const dz = worldPos.z - camPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < 1e-4) return false;
    const dist = Math.sqrt(distSq);
    const invD = 1 / dist;
    const rdx = dx * invD, rdy = dy * invD, rdz = dz * invD;
    const b = camPos.x * rdx + camPos.y * rdy + camPos.z * rdz;
    if (b >= 0) return false;
    const c = camPos.x * camPos.x + camPos.y * camPos.y + camPos.z * camPos.z - (earthRadius - 3) * (earthRadius - 3);
    const h = b * b - c;
    if (h < 0) return false;
    const tHit = -b - Math.sqrt(h);
    return tHit > 0 && tHit < dist;
  }

  function createProjector(cam, w, h) {
    const aspect = w / h;
    const fY = 1 / cam.tanHalfFov;
    const fX = fY / aspect;
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    function project(p) {
      const rx = p.x - cam.pos.x;
      const ry = p.y - cam.pos.y;
      const rz = p.z - cam.pos.z;
      const cz = rx * cam.fwd.x + ry * cam.fwd.y + rz * cam.fwd.z;
      if (cz <= 0.45) return null;
      const cx = rx * cam.right.x + ry * cam.right.y + rz * cam.right.z;
      const cy = rx * cam.up.x + ry * cam.up.y + rz * cam.up.z;
      const invZ = 1 / cz;
      const sx = halfW + cx * invZ * fX * halfW;
      const sy = halfH - cy * invZ * fY * halfH;
      return { x: sx, y: sy, z: cz };
    }

    return { project, fY, halfW, halfH };
  }

  function drawPixelLine(ctx, x0, y0, x1, y1, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5);
    ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.stroke();
  }

  function toWorld(ship, lx, ly, lz) {
    const sc = ship.scale || 1;
    const b = ship.basis;
    const sx = lx * sc, sy = ly * sc, sz = lz * sc;
    return {
      x: ship.pos.x + b.right.x * sx + b.up.x * sy + b.fwd.x * sz,
      y: ship.pos.y + b.right.y * sx + b.up.y * sy + b.fwd.y * sz,
      z: ship.pos.z + b.right.z * sx + b.up.z * sy + b.fwd.z * sz,
    };
  }

  function renderScene(ctx, w, h, scene) {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const cam = scene.cam;
    const sunDir = scene.sunDir;
    const earthR = scene.earthRadius || 0;
    const { project, fY, halfH } = createProjector(cam, w, h);
    const drawList = [];

    // 0. Optional 3D Floor/Space Reference Grid (used in 3D Action Showcase!)
    if (scene.gridLines) {
      for (let i = 0; i < scene.gridLines.length; i++) {
        const gl = scene.gridLines[i];
        const p0 = project(gl.a);
        const p1 = project(gl.b);
        if (!p0 || !p1) continue;
        drawList.push({
          type: 1,
          z: Math.max(p0.z, p1.z) + 50,
          x0: p0.x, y0: p0.y,
          x1: p1.x, y1: p1.y,
          col: gl.col,
          w: 1,
        });
      }
    }

    // 1. Add 3D Volumetric Starships & Zerg Sprites
    for (let sIdx = 0; sIdx < scene.ships.length; sIdx++) {
      const ship = scene.ships[sIdx];
      if (!ship.visible) continue;

      const rel = sub(ship.pos, cam.pos);
      const cz = dot(rel, cam.fwd);
      const rad = (ship.radius || (ship.model && ship.model.radius) || 4) * (ship.scale || 1);
      if (cz + rad < 0.6 || cz > 2600) continue;
      if (earthR > 0 && cz > 120 && isBehindEarth(cam.pos, ship.pos, earthR)) continue;

      // Use 3D-volumetric 8-bit action sprites for Zerg (10 live 3D actions!) or cutout ships
      const useSprite = !ship.force3D && ship.spriteKey && window.SpriteBank;
      let zergActionKey = "move_up";
      if (ship.spriteKind === "zerg") {
        if (ship.actionState) {
          zergActionKey = ship.actionState;
        } else {
          const flapPhase = scene.time * (ship.isCapital ? 4.4 : 8.2) + (ship.animSeed || 0);
          zergActionKey = Math.sin(flapPhase) >= 0 ? "move_up" : "move_down";
        }
      }
      const spriteObj = useSprite
        ? (ship.spriteKind === "zerg"
          ? (window.SpriteBank.getZergAction
            ? window.SpriteBank.getZergAction(ship.spriteKey, zergActionKey)
            : window.SpriteBank.getZerg(ship.spriteKey))
          : window.SpriteBank.getShip(ship.spriteKey))
        : null;

      if (spriteObj && spriteObj.canvas) {
        const sp = project(ship.pos);
        if (sp && sp.x > -140 && sp.x < w + 140 && sp.y > -140 && sp.y < h + 140) {
          const worldH = (ship.spriteWorldSize || (rad * 2.55));
          const maxPx = ship.isPlayer ? h * 0.34 : (ship.isBoss ? h * 0.64 : (ship.isCapital ? h * 0.48 : h * 0.34));
          const minPx = ship.isCapital ? 16 : 9;
          let drawH = Math.max(minPx, Math.min(maxPx, (worldH * fY * halfH) / sp.z));
          const aspectSpr = spriteObj.w / Math.max(1, spriteObj.h);
          let drawW = drawH * aspectSpr;

          let rot = 0;
          let flipX = false;
          let flipY = !!ship.flipY;

          if (ship.isPlayer) {
            rot = -(ship.rollVisual || 0) * 0.65;
          } else if (ship.spriteKind === "zerg") {
            const phase = scene.time * (ship.isCapital ? 4.2 : 8.2) + (ship.animSeed || 0);
            const fwdRight = dot(ship.basis.fwd, cam.right);
            if (fwdRight < -0.25) flipX = true;
            if (zergActionKey === "roll") {
              rot = Math.sin(scene.time * 16 + (ship.animSeed || 0)) * 0.45;
            } else if (zergActionKey === "boost") {
              drawW *= 1.12;
              rot = flipX ? -0.14 : 0.14;
            } else {
              rot = Math.cos(phase * 0.5) * (ship.isCapital ? 0.04 : 0.09);
            }
          } else {
            const fwdRight = dot(ship.basis.fwd, cam.right);
            if (fwdRight > 0.15) flipX = true;
          }

          drawList.push({
            type: 4,
            z: sp.z,
            x: sp.x,
            y: sp.y,
            w: drawW,
            h: drawH,
            rot,
            flipX,
            flipY,
            img: ship.hitFlash > 0.35 && spriteObj.flash ? spriteObj.flash : spriteObj.canvas,
            sx: spriteObj.sx,
            sy: spriteObj.sy,
            sw: spriteObj.sw,
            sh: spriteObj.sh,
            isPlayer: !!ship.isPlayer,
            thrusterFlame: ship.thrusterFlame || 0,
          });
        }
        continue;
      }

      if (!ship.model) continue;

      const basis = ship.basis;
      const verts = ship.model.verts;
      const vTags = ship.model.vTags || null;
      const sc = ship.scale || 1;
      const anim = ship.model.anim;
      const act = ship.act || null;
      const animPhase = anim ? Math.sin(scene.time * anim.speed + (ship.animSeed || 0)) : 0;
      const swayPhase = anim ? Math.cos(scene.time * (anim.speed * 0.75) + (ship.animSeed || 0)) : 0;

      // Precompute action animation scalars
      const recoil = act ? (act.recoil || 0) : 0;
      const boostVal = act ? (act.boost || 0) : (ship.thrusterFlame > 1.2 ? 1 : 0);
      const bayOpen = act ? (act.bayOpen || 0) : 0;
      const overdrive = act ? (act.overdrive || 0) : 0;
      const cloakVal = act ? (act.cloak || 0) : 0;
      const chargeVal = act ? (act.charge || 0) : 0;
      const explodeProg = act ? (act.explodeProg || 0) : 0;
      const wireframe = !!(scene.wireframe || ship.wireframe || cloakVal > 0.35);
      const ghostAlpha = ship.ghostAlpha || 0;

      // Science Ship crystal & probe orbit angles
      const crystalAng = scene.time * (0.9 + overdrive * 4.5 + chargeVal * 3.0);
      const cosC = Math.cos(crystalAng), sinC = Math.sin(crystalAng);
      const probeAng = scene.time * (1.1 + overdrive * 5.2);
      const cosP = Math.cos(probeAng), sinP = Math.sin(probeAng);

      // Transform vertices to world with per-part 3D animations!
      const wVerts = new Array(verts.length);
      const pVerts = new Array(verts.length);
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i];
        let lx = v[0], ly = v[1], lz = v[2];
        const tag = vTags ? vTags[i] : null;

        if (tag) {
          if (tag === "gun" && recoil > 0.01) {
            lz -= recoil * 0.45;
          } else if (tag === "wing") {
            if (boostVal > 0.01) {
              // Swept-back aerodynamic wing flex under boost!
              lz -= boostVal * Math.abs(lx) * 0.14;
              ly -= boostVal * Math.abs(lx) * 0.04;
            }
            if (overdrive > 0.01) {
              // Heroic wing flare & golden angel-wing elevation!
              const flap = Math.sin(scene.time * 12) * 0.12 * overdrive;
              lx *= (1 + overdrive * 0.18);
              ly += overdrive * (Math.abs(lx) * 0.16) + flap * Math.abs(lx);
              lz += overdrive * 0.12;
            }
          } else if (tag === "bay" && bayOpen > 0.01) {
            lx *= (1 + bayOpen * 0.12);
            ly -= bayOpen * 0.18;
          } else if (tag === "crystal") {
            const rx = lx * cosC - lz * sinC;
            const rz = lx * sinC + lz * cosC;
            const pulse = 1 + (overdrive * 0.16 + chargeVal * 0.18) * (0.6 + 0.4 * Math.sin(scene.time * 14));
            lx = rx * pulse;
            ly = ly * pulse;
            lz = rz * pulse;
          } else if (tag === "probe") {
            const rx = lx * cosP - lz * sinP;
            const rz = lx * sinP + lz * cosP;
            const spread = 1 + overdrive * 0.24;
            lx = rx * spread;
            ly = ly * spread + Math.sin(scene.time * 4 + i) * 0.08;
            lz = rz * spread;
          } else if (tag === "cloak") {
            const wave = Math.sin(scene.time * (5.5 + overdrive * 8) + lx * 1.4 + lz * 0.8);
            ly += wave * (0.09 + cloakVal * 0.14 + overdrive * 0.18) * Math.min(1, Math.abs(lx) * 0.35);
            if (overdrive > 0.01) {
              lx *= (1 + overdrive * 0.15);
            }
          } else if (tag === "fin" && boostVal > 0.05) {
            lz -= boostVal * 0.12;
          }
        }

        // Legacy Zerg organic animations
        if (anim) {
          if (anim.type === "flap") {
            const ax = Math.abs(lx);
            if (ax > anim.xMin) {
              const factor = (ax - anim.xMin) / Math.max(1.0, (ship.model.radius || 4) - anim.xMin);
              ly += animPhase * anim.amp * factor;
              lz -= Math.abs(animPhase) * anim.amp * 0.22 * factor;
            } else if (anim.tailZ != null && lz < anim.tailZ) {
              lx += swayPhase * (anim.amp * 0.14);
              ly += animPhase * (anim.amp * 0.12);
            }
          } else if (anim.type === "overlord") {
            if (ly > anim.ySac) {
              const pScale = 1.0 + animPhase * 0.09;
              lx *= pScale;
              ly += animPhase * anim.amp * 0.55;
              lz *= pScale;
            } else if (ly < anim.yLeg) {
              const depth = Math.min(2.0, (anim.yLeg - ly) * 0.35);
              lx += Math.sin(scene.time * 4.5 + (ship.animSeed || 0) + lz) * anim.amp * depth;
              lz += Math.cos(scene.time * 3.8 + (ship.animSeed || 0) + lx) * anim.amp * 0.7 * depth;
            }
          } else if (anim.type === "pulse" && ly > anim.yMin) {
            const pScale = 1.0 + animPhase * 0.08;
            lx *= pScale;
            ly += animPhase * anim.amp;
            lz *= pScale;
          }
        }

        lx *= sc; ly *= sc; lz *= sc;
        const wx = ship.pos.x + basis.right.x * lx + basis.up.x * ly + basis.fwd.x * lz;
        const wy = ship.pos.y + basis.right.y * lx + basis.up.y * ly + basis.fwd.y * lz;
        const wz = ship.pos.z + basis.right.z * lx + basis.up.z * ly + basis.fwd.z * lz;
        const wp = { x: wx, y: wy, z: wz };
        wVerts[i] = wp;
        pVerts[i] = project(wp);
      }

      const faces = ship.model.faces;
      const flash = ship.hitFlash > 0;
      const showEdge = !!(scene.pixelEdges || ship.pixelEdges);

      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        let wa = wVerts[f.i[0]], wb = wVerts[f.i[1]], wc = wVerts[f.i[2]];
        let a = pVerts[f.i[0]], b = pVerts[f.i[1]], c = pVerts[f.i[2]];

        // Dramatic 3D Armor Disintegration / Reassembly animation!
        if (explodeProg > 0.005) {
          const cx = (wa.x + wb.x + wc.x) * 0.33333;
          const cy = (wa.y + wb.y + wc.y) * 0.33333;
          const czF = (wa.z + wb.z + wc.z) * 0.33333;
          const dx = cx - ship.pos.x;
          const dy = cy - ship.pos.y;
          const dz = czF - ship.pos.z;
          const dl = Math.hypot(dx, dy, dz) || 1;
          const push = explodeProg * (5.2 + (i % 7) * 0.75) * sc;
          const ox = (dx / dl) * push;
          const oy = (dy / dl) * push;
          const oz = (dz / dl) * push;
          const shrink = Math.max(0.15, 1 - explodeProg * 0.65);
          wa = { x: cx + (wa.x - cx) * shrink + ox, y: cy + (wa.y - cy) * shrink + oy, z: czF + (wa.z - czF) * shrink + oz };
          wb = { x: cx + (wb.x - cx) * shrink + ox, y: cy + (wb.y - cy) * shrink + oy, z: czF + (wb.z - czF) * shrink + oz };
          wc = { x: cx + (wc.x - cx) * shrink + ox, y: cy + (wc.y - cy) * shrink + oy, z: czF + (wc.z - czF) * shrink + oz };
          a = project(wa); b = project(wb); c = project(wc);
        }

        if (!a || !b || !c) continue;

        const cross2d = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (!wireframe && explodeProg < 0.05 && cross2d <= 0) continue;

        if (
          Math.max(a.x, b.x, c.x) < -24 || Math.min(a.x, b.x, c.x) > w + 24 ||
          Math.max(a.y, b.y, c.y) < -24 || Math.min(a.y, b.y, c.y) > h + 24
        ) continue;

        const zAvg = (a.z + b.z + c.z) * 0.33333;

        if (ghostAlpha > 0.01) {
          drawList.push({
            type: 5,
            z: zAvg + 0.05,
            ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: c.x, cy: c.y,
            fill: `rgba(80, 238, 255, ${(ghostAlpha * 0.28).toFixed(2)})`,
            stroke: `rgba(110, 248, 255, ${(ghostAlpha * 0.55).toFixed(2)})`,
          });
          continue;
        }

        if (wireframe) {
          const isStealth = cloakVal > 0.35;
          const shimmer = 0.55 + 0.35 * Math.sin(scene.time * 16 + i * 0.6);
          const strokeCol = isStealth
            ? `rgba(140, 210, 255, ${(shimmer * 0.72).toFixed(2)})`
            : (f.e ? `rgb(${f.c[0]},${f.c[1]},${f.c[2]})` : "rgba(86, 240, 255, 0.85)");
          const fillCol = isStealth
            ? `rgba(48, 86, 168, ${(shimmer * 0.22).toFixed(2)})`
            : "rgba(12, 42, 72, 0.24)";
          drawList.push({
            type: 5,
            z: zAvg,
            ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: c.x, cy: c.y,
            fill: fillCol,
            stroke: strokeCol,
          });
          continue;
        }

        let colStr;
        if (flash) {
          colStr = "#ffffff";
        } else if (explodeProg > 0.35 && (i % 3 === 0)) {
          colStr = explodeProg > 0.65 ? "#ff6b3d" : "#ffd166";
        } else if (f.e) {
          // Pulse emissive panels brighter during Overdrive / Charge!
          const boostGlow = 1 + overdrive * 0.25 + chargeVal * 0.2;
          const r = Math.min(255, Math.round(f.c[0] * boostGlow));
          const g = Math.min(255, Math.round(f.c[1] * boostGlow));
          const bl = Math.min(255, Math.round(f.c[2] * boostGlow));
          colStr = `rgb(${r},${g},${bl})`;
        } else {
          const ux = wb.x - wa.x, uy = wb.y - wa.y, uz = wb.z - wa.z;
          const vx = wc.x - wa.x, vy = wc.y - wa.y, vz = wc.z - wa.z;
          let nx = uy * vz - uz * vy;
          let ny = uz * vx - ux * vz;
          let nz = ux * vy - uy * vx;
          const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= nl; ny /= nl; nz /= nl;
          const ndl = nx * sunDir.x + ny * sunDir.y + nz * sunDir.z;
          // Crisp 8-bit 5-band stepped cel shading
          const rawLight = 0.34 + Math.max(0, ndl) * 0.78 + Math.max(0, -ndl) * 0.14;
          const shade = Math.round(rawLight * 5) / 5;
          let r = Math.min(255, Math.round(f.c[0] * shade));
          let g = Math.min(255, Math.round(f.c[1] * shade));
          let bl = Math.min(255, Math.round(f.c[2] * shade));
          if (overdrive > 0.1) {
            r = Math.min(255, Math.round(r + overdrive * 22));
            g = Math.min(255, Math.round(g + overdrive * 34));
            bl = Math.min(255, Math.round(bl + overdrive * 44));
          }
          colStr = `rgb(${r},${g},${bl})`;
        }

        drawList.push({
          type: 0,
          z: zAvg,
          ax: a.x, ay: a.y,
          bx: b.x, by: b.y,
          cx: c.x, cy: c.y,
          col: colStr,
          edge: showEdge ? "rgba(8, 14, 28, 0.55)" : null,
        });
      }

      if (ghostAlpha > 0.01) continue;

      // ---- Per-Ship 3D Action Hardpoint VFX ----
      const hp = ship.model.hardpoints;

      // A. Multi-Engine Volumetric Thruster Plumes
      if (ship.thrusterFlame > 0.05 && cz < 380 && explodeProg < 0.2) {
        if (hp && hp.engines) {
          for (let ei = 0; ei < hp.engines.length; ei++) {
            const eng = hp.engines[ei];
            const baseW = toWorld(ship, eng.pos[0], eng.pos[1], eng.pos[2]);
            const fLen = (1.1 + ship.thrusterFlame * 2.5 + boostVal * 2.4 + overdrive * 1.4 + Math.random() * 0.65) * eng.size * sc;
            const tipW = {
              x: baseW.x - basis.fwd.x * fLen,
              y: baseW.y - basis.fwd.y * fLen,
              z: baseW.z - basis.fwd.z * fLen,
            };
            const p0 = project(baseW);
            const p1 = project(tipW);
            if (p0 && p1) {
              const pxW = Math.max(2, Math.min(14, (eng.size * (1.2 + boostVal * 0.7) * sc * fY * halfH) / p0.z));
              const outerCol = boostVal > 0.4 ? "#6cf7ff" : (overdrive > 0.4 ? "#ffe46b" : (eng.color || "#5ef2ff"));
              drawList.push({
                type: 2,
                z: p0.z + 0.18,
                x0: p0.x, y0: p0.y,
                x1: p1.x, y1: p1.y,
                col: outerCol,
                core: "#ffffff",
                w: pxW,
              });
            }
          }
        } else {
          // Legacy single thruster cone
          const tailBase = {
            x: ship.pos.x - basis.fwd.x * (1.8 * sc),
            y: ship.pos.y - basis.fwd.y * (1.8 * sc),
            z: ship.pos.z - basis.fwd.z * (1.8 * sc),
          };
          const flameLen = (1.6 + ship.thrusterFlame * 2.4 + Math.random() * 0.8) * sc;
          const tailTip = {
            x: tailBase.x - basis.fwd.x * flameLen,
            y: tailBase.y - basis.fwd.y * flameLen,
            z: tailBase.z - basis.fwd.z * flameLen,
          };
          const p0 = project(tailBase);
          const p1 = project(tailTip);
          if (p0 && p1) {
            drawList.push({
              type: 1,
              z: p0.z + 0.2,
              x0: p0.x, y0: p0.y,
              x1: p1.x, y1: p1.y,
              col: ship.isEnemy ? "#ff6b3d" : (ship.thrusterFlame > 1.2 ? "#7df9ff" : "#ffd166"),
              w: Math.max(1, Math.min(5, (2.2 * sc * fY * halfH) / p0.z)),
            });
          }
        }
      }

      // B. Forward Retro-Brake Thruster Jets (when braking / drifting!)
      if (act && act.brake > 0.05 && hp && hp.retroNozzles) {
        for (let ri = 0; ri < hp.retroNozzles.length; ri++) {
          const rn = hp.retroNozzles[ri];
          const baseW = toWorld(ship, rn[0], rn[1], rn[2]);
          const jetLen = (1.8 + act.brake * 2.6 + Math.random() * 0.7) * sc;
          const tipW = {
            x: baseW.x + basis.fwd.x * jetLen + basis.right.x * (rn[0] > 0 ? 0.5 : -0.5) * sc,
            y: baseW.y + basis.fwd.y * jetLen,
            z: baseW.z + basis.fwd.z * jetLen + basis.right.z * (rn[0] > 0 ? 0.5 : -0.5) * sc,
          };
          const p0 = project(baseW);
          const p1 = project(tipW);
          if (p0 && p1) {
            drawList.push({
              type: 2,
              z: p0.z - 0.1,
              x0: p0.x, y0: p0.y,
              x1: p1.x, y1: p1.y,
              col: "#ffae42",
              core: "#fff7cc",
              w: Math.max(2, Math.min(7, (1.1 * sc * fY * halfH) / p0.z)),
            });
          }
        }
      }

      // C. 3D Muzzle Flash Bursts at Weapon Hardpoints
      if (act && act.muzzleFlash > 0.08 && hp && hp.lasers) {
        for (let li = 0; li < hp.lasers.length; li++) {
          const lz = hp.lasers[li];
          const mw = toWorld(ship, lz[0], lz[1], lz[2]);
          const mp = project(mw);
          if (mp) {
            const sz = Math.max(3, Math.min(18, (1.4 * act.muzzleFlash * sc * fY * halfH) / mp.z));
            drawList.push({
              type: 3,
              z: mp.z - 0.15,
              x: mp.x, y: mp.y,
              size: sz,
              col: "#ffffff",
              ring: false,
            });
            drawList.push({
              type: 3,
              z: mp.z - 0.12,
              x: mp.x, y: mp.y,
              size: sz * 1.65,
              col: ship.model.beamColor || "#44f8ff",
              ring: true,
            });
          }
        }
      }

      // D. 3D Charged Nova Beam / Railgun Core & Piercing Beam
      if (act && (chargeVal > 0.05 || (act.beamAlpha || 0) > 0.02)) {
        const noseZ = (ship.model.radius || 4) * 0.92;
        const muzzleW = toWorld(ship, 0, 0.05, noseZ);
        const mp = project(muzzleW);
        const bCol = ship.model.beamColor || "#48f4ff";
        const bCore = ship.model.beamCore || "#ffffff";

        if (chargeVal > 0.05 && mp) {
          const orbSz = Math.max(4, Math.min(34, ((0.6 + chargeVal * 2.4 + Math.sin(scene.time * 32) * 0.25) * sc * fY * halfH) / mp.z));
          drawList.push({ type: 3, z: mp.z - 0.2, x: mp.x, y: mp.y, size: orbSz * 1.45, col: bCol, ring: true });
          drawList.push({ type: 3, z: mp.z - 0.22, x: mp.x, y: mp.y, size: orbSz, col: bCore, ring: false });
        }

        if ((act.beamAlpha || 0) > 0.02) {
          const bLen = (act.beamLen || 220) * sc;
          const endW = {
            x: muzzleW.x + basis.fwd.x * bLen,
            y: muzzleW.y + basis.fwd.y * bLen,
            z: muzzleW.z + basis.fwd.z * bLen,
          };
          const p0 = mp;
          const p1 = project(endW);
          if (p0 && p1) {
            const bw = Math.max(4, Math.min(26, (2.6 * act.beamAlpha * sc * fY * halfH) / Math.max(4, p0.z)));
            drawList.push({
              type: 2,
              z: Math.min(p0.z, p1.z) - 0.2,
              x0: p0.x, y0: p0.y,
              x1: p1.x, y1: p1.y,
              col: bCol,
              core: bCore,
              w: bw,
            });
          }
        }
      }

      // E. 3D Geodesic Energy Shield Dome!
      if (act && (act.shield || 0) > 0.04 && window.Models && window.Models.shieldDome) {
        const dome = window.Models.shieldDome;
        const sRad = (ship.model.shieldRadius || ((ship.model.radius || 4) * 1.25)) * sc * (0.94 + act.shield * 0.08);
        const sAng = scene.time * 1.35;
        const cA = Math.cos(sAng), sA = Math.sin(sAng);
        const dVerts = new Array(dome.verts.length);
        for (let vi = 0; vi < dome.verts.length; vi++) {
          const dv = dome.verts[vi];
          const rx = dv[0] * cA - dv[2] * sA;
          const rz = dv[0] * sA + dv[2] * cA;
          const wp = {
            x: ship.pos.x + (basis.right.x * rx + basis.up.x * dv[1] + basis.fwd.x * rz) * sRad,
            y: ship.pos.y + (basis.right.y * rx + basis.up.y * dv[1] + basis.fwd.y * rz) * sRad,
            z: ship.pos.z + (basis.right.z * rx + basis.up.z * dv[1] + basis.fwd.z * rz) * sRad,
          };
          dVerts[vi] = project(wp);
        }
        const hitBoost = ship.hitFlash > 0.1 ? 1 : 0;
        const fillA = Math.min(0.45, act.shield * (hitBoost ? 0.36 : 0.14));
        const strokeA = Math.min(0.95, act.shield * (hitBoost ? 0.95 : 0.62));
        const fCol = hitBoost ? `rgba(255, 240, 140, ${fillA.toFixed(2)})` : `rgba(68, 236, 255, ${fillA.toFixed(2)})`;
        const sCol = hitBoost ? `rgba(255, 255, 255, ${strokeA.toFixed(2)})` : `rgba(116, 248, 255, ${strokeA.toFixed(2)})`;

        for (let fi = 0; fi < dome.faces.length; fi++) {
          const df = dome.faces[fi];
          const a = dVerts[df.i[0]], b = dVerts[df.i[1]], c = dVerts[df.i[2]];
          if (!a || !b || !c) continue;
          const cross2d = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
          if (cross2d <= 0) continue;
          drawList.push({
            type: 5,
            z: (a.z + b.z + c.z) * 0.33333 - 0.12,
            ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: c.x, cy: c.y,
            fill: fCol,
            stroke: sCol,
          });
        }
      }
    }

    // 2. Add 3D Expanding Shockwave Rings (EMP, Boost Sonic Boom, Overdrive Resonance)
    if (scene.rings) {
      for (let rIdx = 0; rIdx < scene.rings.length; rIdx++) {
        const rg = scene.rings[rIdx];
        const segs = 20;
        let prev = null;
        for (let s = 0; s <= segs; s++) {
          const ang = (s / segs) * Math.PI * 2;
          const ca = Math.cos(ang) * rg.radius;
          const sa = Math.sin(ang) * rg.radius;
          const wp = {
            x: rg.pos.x + rg.axisA.x * ca + rg.axisB.x * sa,
            y: rg.pos.y + rg.axisA.y * ca + rg.axisB.y * sa,
            z: rg.pos.z + rg.axisA.z * ca + rg.axisB.z * sa,
          };
          const sp = project(wp);
          if (prev && sp) {
            drawList.push({
              type: 1,
              z: (prev.z + sp.z) * 0.5,
              x0: prev.x, y0: prev.y,
              x1: sp.x, y1: sp.y,
              col: rg.color,
              w: rg.width || 2,
            });
          }
          prev = sp;
        }
      }
    }

    // 3. Add Ion / Vapor Contrails
    for (let tIdx = 0; tIdx < scene.trails.length; tIdx++) {
      const tr = scene.trails[tIdx];
      const pts = tr.pts;
      if (pts.length < 2) continue;
      for (let i = 1; i < pts.length; i++) {
        const p0 = project(pts[i - 1]);
        const p1 = project(pts[i]);
        if (!p0 || !p1) continue;
        if (p0.z > 700 || p1.z > 700) continue;
        const alpha = (i / pts.length) * tr.alpha;
        if (alpha < 0.08) continue;
        drawList.push({
          type: 1,
          z: (p0.z + p1.z) * 0.5 + 0.5,
          x0: p0.x, y0: p0.y,
          x1: p1.x, y1: p1.y,
          col: tr.colorFn(alpha),
          w: p0.z < 50 ? 2 : 1,
        });
      }
    }

    // 4. Add Laser Bolts & Homing Missiles
    for (let i = 0; i < scene.projectiles.length; i++) {
      const pr = scene.projectiles[i];
      const pHead = project(pr.pos);
      if (!pHead || pHead.z > 1800) continue;
      const tailLen = pr.isCapital ? 14 : (pr.isMissile ? 5.5 : (pr.tailLen || 8.5));
      const tailPos = {
        x: pr.pos.x - pr.dir.x * tailLen,
        y: pr.pos.y - pr.dir.y * tailLen,
        z: pr.pos.z - pr.dir.z * tailLen,
      };
      const pTail = project(tailPos);
      if (!pTail) continue;
      const thick = pr.isCapital
        ? Math.max(2, Math.min(7, (12 * fY * halfH) / pHead.z))
        : (pr.isMissile ? 3 : Math.max(1, Math.min(4, (3.2 * fY * halfH) / pHead.z)));
      drawList.push({
        type: 2,
        z: pHead.z,
        x0: pTail.x, y0: pTail.y,
        x1: pHead.x, y1: pHead.y,
        col: pr.color,
        core: pr.coreColor || "#ffffff",
        w: thick,
      });
    }

    // 5. Add Pixel Explosions & Voxel Debris Particles
    for (let i = 0; i < scene.particles.length; i++) {
      const pt = scene.particles[i];
      const sp = project(pt.pos);
      if (!sp || sp.z > 2000) continue;
      const pxSize = Math.max(1, Math.min(28, (pt.size * fY * halfH) / sp.z));
      drawList.push({
        type: 3,
        z: sp.z,
        x: sp.x,
        y: sp.y,
        size: pxSize,
        col: pt.color,
        ring: pt.ring,
      });
    }

    // Sort back-to-front (largest Z first)
    drawList.sort((a, b) => b.z - a.z);

    // Execute crisp retro raster draw
    for (let i = 0; i < drawList.length; i++) {
      const d = drawList[i];
      if (d.type === 0) {
        ctx.fillStyle = d.col;
        ctx.beginPath();
        ctx.moveTo(Math.round(d.ax), Math.round(d.ay));
        ctx.lineTo(Math.round(d.bx), Math.round(d.by));
        ctx.lineTo(Math.round(d.cx), Math.round(d.cy));
        ctx.closePath();
        ctx.fill();
        if (d.edge) {
          ctx.strokeStyle = d.edge;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (d.type === 1) {
        drawPixelLine(ctx, d.x0, d.y0, d.x1, d.y1, d.col, d.w);
      } else if (d.type === 2) {
        drawPixelLine(ctx, d.x0, d.y0, d.x1, d.y1, d.col, d.w + 1);
        drawPixelLine(ctx, d.x0, d.y0, d.x1, d.y1, d.core, Math.max(1, Math.floor(d.w * 0.55)));
      } else if (d.type === 3) {
        const s = Math.max(1, Math.round(d.size));
        const half = Math.floor(s * 0.5);
        if (d.ring) {
          ctx.strokeStyle = d.col;
          ctx.lineWidth = 2;
          ctx.strokeRect(Math.round(d.x - half), Math.round(d.y - half), s, s);
        } else {
          ctx.fillStyle = d.col;
          ctx.fillRect(Math.round(d.x - half), Math.round(d.y - half), s, s);
        }
      } else if (d.type === 4) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(d.x), Math.round(d.y));
        if (d.rot) ctx.rotate(d.rot);
        if (d.flipX || d.flipY) ctx.scale(d.flipX ? -1 : 1, d.flipY ? -1 : 1);
        const dw = Math.max(2, Math.round(d.w));
        const dh = Math.max(2, Math.round(d.h));
        if (d.isPlayer && d.thrusterFlame > 0.2) {
          const fl = Math.round((4 + d.thrusterFlame * 6 + Math.random() * 3));
          const fy = d.flipY ? -Math.round(dh * 0.42) - fl : Math.round(dh * 0.42);
          ctx.fillStyle = d.thrusterFlame > 1.2 ? "#6bf5ff" : "#ffd166";
          ctx.fillRect(-3, fy, 6, fl);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-1, fy + (d.flipY ? 2 : 0), 2, Math.max(2, fl - 2));
        }
        if (d.sw && d.sh) {
          ctx.drawImage(d.img, d.sx || 0, d.sy || 0, d.sw, d.sh, -Math.round(dw * 0.5), -Math.round(dh * 0.5), dw, dh);
        } else {
          ctx.drawImage(d.img, -Math.round(dw * 0.5), -Math.round(dh * 0.5), dw, dh);
        }
        ctx.restore();
      } else if (d.type === 5) {
        // Translucent wireframe / holographic / shield triangle
        ctx.beginPath();
        ctx.moveTo(Math.round(d.ax), Math.round(d.ay));
        ctx.lineTo(Math.round(d.bx), Math.round(d.by));
        ctx.lineTo(Math.round(d.cx), Math.round(d.cy));
        ctx.closePath();
        if (d.fill) {
          ctx.fillStyle = d.fill;
          ctx.fill();
        }
        if (d.stroke) {
          ctx.strokeStyle = d.stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 6. Afterburner / Warp Boost Speed Lines
    if (scene.boostAlpha > 0.05) {
      const cx = w * 0.5, cy = h * 0.5;
      ctx.strokeStyle = `rgba(120, 240, 255, ${(scene.boostAlpha * 0.55).toFixed(2)})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + (scene.time * 0.7 % 0.45);
        const r0 = Math.min(w, h) * (0.28 + ((i * 37 + Math.floor(scene.time * 40)) % 20) * 0.01);
        const r1 = r0 + 26 * scene.boostAlpha;
        drawPixelLine(
          ctx,
          cx + Math.cos(ang) * r0,
          cy + Math.sin(ang) * r0,
          cx + Math.cos(ang) * r1,
          cy + Math.sin(ang) * r1,
          ctx.strokeStyle,
          1
        );
      }
    }

    return { project };
  }

  return { renderScene };
})();
