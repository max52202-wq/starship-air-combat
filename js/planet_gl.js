// ============================================================================
// planet_gl.js — Procedural WebGL 8-Bit/16-Bit Solar System 9-Planet Renderer
// Supports all 9 planets: Mercury(0), Venus(1), Earth(2), Mars(3), Jupiter(4),
// Saturn(5 + 3D Rings), Uranus(6 + Ice Ring), Neptune(7), Pluto(8 + Heart Plain)
// ============================================================================

window.PlanetGL = (function () {
  const VS_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FS_SRC = `
    precision highp float;
    varying vec2 vUv;

    uniform vec2 uRes;
    uniform float uTime;
    uniform vec3 uCamPos;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform vec3 uCamFwd;
    uniform float uTanHalfFov;
    uniform vec3 uSunDir;
    uniform float uEarthRadius;
    uniform float uPlanetType; // 0..8
    uniform float uSunScale;
    uniform float uHasMoon;

    float hash31(vec3 p) {
      p = fract(p * vec3(0.1031, 0.1030, 0.0973));
      p += dot(p, p.yxz + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float noise3(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);
      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);
      return mix(nxy0, nxy1, f.z);
    }

    float fbm4(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise3(p);
        p = p * 2.07 + vec3(17.1, 31.7, 11.3);
        a *= 0.5;
      }
      return v;
    }

    float fbm3(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {
        v += a * noise3(p);
        p = p * 2.13 + vec3(9.2, 23.4, 5.7);
        a *= 0.5;
      }
      return v;
    }

    vec2 hitSphere(vec3 ro, vec3 rd, vec3 center, float radius) {
      vec3 oc = ro - center;
      float b = dot(oc, rd);
      float c = dot(oc, oc) - radius * radius;
      float h = b * b - c;
      if (h < 0.0) return vec2(-1.0);
      h = sqrt(h);
      return vec2(-b - h, -b + h);
    }

    float bayer4(vec2 px) {
      vec2 p = mod(floor(px), 4.0);
      int idx = int(p.x) + int(p.y) * 4;
      float m = 0.0;
      if (idx == 0) m = 0.0;
      else if (idx == 1) m = 8.0;
      else if (idx == 2) m = 2.0;
      else if (idx == 3) m = 10.0;
      else if (idx == 4) m = 12.0;
      else if (idx == 5) m = 4.0;
      else if (idx == 6) m = 14.0;
      else if (idx == 7) m = 6.0;
      else if (idx == 8) m = 3.0;
      else if (idx == 9) m = 11.0;
      else if (idx == 10) m = 1.0;
      else if (idx == 11) m = 9.0;
      else if (idx == 12) m = 15.0;
      else if (idx == 13) m = 7.0;
      else if (idx == 14) m = 13.0;
      else m = 5.0;
      return (m / 16.0) - 0.5;
    }

    vec3 rotY(vec3 v, float a) {
      float s = sin(a), c = cos(a);
      return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
    }

    float cloudDensity(vec3 dir, float t) {
      vec3 q = rotY(dir, t * 0.008) * 7.5;
      float n = fbm3(q + vec3(0.0, 2.3, 0.0));
      float n2 = noise3(q * 2.4 - vec3(t * 0.04, 0.0, 0.0));
      return smoothstep(0.56, 0.72, n * 0.78 + n2 * 0.22);
    }

    // Evaluate planetary ring intersection (Saturn = 5, Uranus = 6)
    vec4 evalRing(vec3 ro, vec3 rd, float R, float pType, float maxT) {
      if (abs(pType - 5.0) > 0.4 && abs(pType - 6.0) > 0.4) return vec4(0.0);
      // Slightly tilted ring plane normal
      vec3 rNorm = abs(pType - 5.0) < 0.4
        ? normalize(vec3(0.22, 0.94, 0.25))
        : normalize(vec3(0.85, 0.42, 0.30));
      float denom = dot(rd, rNorm);
      if (abs(denom) < 0.002) return vec4(0.0);
      float t = -dot(ro, rNorm) / denom;
      if (t <= 0.0 || (maxT > 0.0 && t > maxT)) return vec4(0.0);

      vec3 p = ro + rd * t;
      float dist = length(p) / R;
      float rIn = abs(pType - 5.0) < 0.4 ? 1.28 : 1.45;
      float rOut = abs(pType - 5.0) < 0.4 ? 2.35 : 1.92;
      if (dist < rIn || dist > rOut) return vec4(0.0);

      float u = (dist - rIn) / (rOut - rIn);
      vec3 rCol;
      float alpha;
      if (abs(pType - 5.0) < 0.4) {
        // Saturn classic banded gold rings + Cassini gap
        float band = 0.5 + 0.5 * sin(u * 42.0) * 0.4 + 0.3 * sin(u * 15.0);
        float cassini = smoothstep(0.56, 0.60, u) * (1.0 - smoothstep(0.64, 0.68, u));
        rCol = mix(vec3(0.76, 0.64, 0.42), vec3(0.96, 0.89, 0.68), band);
        alpha = (0.78 - cassini * 0.68) * smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
      } else {
        // Uranus thin translucent icy blue ring
        float band = 0.5 + 0.5 * sin(u * 26.0);
        rCol = mix(vec3(0.45, 0.82, 0.92), vec3(0.78, 0.96, 1.0), band);
        alpha = 0.42 * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u));
      }

      // Planet shadow cast onto rings
      vec2 shadHit = hitSphere(p, uSunDir, vec3(0.0), R);
      if (shadHit.x > 0.0) rCol *= 0.22;

      return vec4(rCol, alpha);
    }

    void main() {
      vec2 px = gl_FragCoord.xy;
      vec2 ndc = (vUv * 2.0 - 1.0);
      float aspect = uRes.x / uRes.y;

      vec3 rd = normalize(
        uCamRight * (ndc.x * aspect * uTanHalfFov) +
        uCamUp    * (ndc.y * uTanHalfFov) +
        uCamFwd
      );
      vec3 ro = uCamPos;

      float alt = length(ro) - uEarthRadius;
      float pType = uPlanetType;
      bool hasAtmo = (abs(pType - 0.0) > 0.4 && abs(pType - 8.0) > 0.4); // Mercury & Pluto have no thick sky
      float spaceFactor = hasAtmo ? smoothstep(55.0, 250.0, alt) : 1.0;
      float atmoBlend = 1.0 - spaceFactor;

      // ---- Deep Space Background + Crisp Pixel Starfield + Subtle Nebula ----
      vec3 col = vec3(0.015, 0.024, 0.062);
      float neb = fbm3(rd * 3.2 + vec3(1.5 + pType * 0.7, -0.7, 2.1));
      vec3 nebTint = abs(pType - 8.0) < 0.4 ? vec3(0.09, 0.03, 0.14) : vec3(0.04, 0.08, 0.16);
      col += nebTint * smoothstep(0.45, 0.85, neb) * spaceFactor;
      col += vec3(0.09, 0.03, 0.11) * smoothstep(0.64, 0.92, fbm3(rd * 5.0 + 4.0)) * spaceFactor;

      vec3 starCell = floor(rd * 165.0);
      float starRnd = hash31(starCell);
      if (starRnd > 0.992) {
        float twinkle = 0.7 + 0.3 * sin(uTime * 3.5 + starRnd * 120.0);
        vec3 sCol = starRnd > 0.997 ? vec3(0.75, 0.92, 1.0)
                  : starRnd > 0.995 ? vec3(1.0, 0.95, 0.75)
                  : vec3(0.85, 0.88, 1.0);
        col += sCol * twinkle * smoothstep(0.12, 0.65, spaceFactor);
      }

      // ---- Planet-Specific Atmosphere Sky Colors ----
      vec3 skyZenith = vec3(0.11, 0.34, 0.76);
      vec3 skyHorizon = vec3(0.47, 0.78, 0.98);
      vec3 rimColBase = vec3(0.26, 0.68, 1.0);

      if (abs(pType - 1.0) < 0.4) { // Venus: golden acid haze
        skyZenith = vec3(0.66, 0.46, 0.14);
        skyHorizon = vec3(0.95, 0.80, 0.42);
        rimColBase = vec3(0.98, 0.76, 0.32);
      } else if (abs(pType - 3.0) < 0.4) { // Mars: dusty salmon-red sky
        skyZenith = vec3(0.44, 0.17, 0.11);
        skyHorizon = vec3(0.88, 0.48, 0.30);
        rimColBase = vec3(0.92, 0.44, 0.25);
      } else if (abs(pType - 4.0) < 0.4) { // Jupiter: warm amber storm sky
        skyZenith = vec3(0.46, 0.28, 0.16);
        skyHorizon = vec3(0.86, 0.68, 0.48);
        rimColBase = vec3(0.92, 0.66, 0.42);
      } else if (abs(pType - 5.0) < 0.4) { // Saturn: pale golden sky
        skyZenith = vec3(0.48, 0.40, 0.22);
        skyHorizon = vec3(0.90, 0.82, 0.56);
        rimColBase = vec3(0.94, 0.84, 0.52);
      } else if (abs(pType - 6.0) < 0.4) { // Uranus: icy cyan sky
        skyZenith = vec3(0.16, 0.54, 0.64);
        skyHorizon = vec3(0.58, 0.92, 0.96);
        rimColBase = vec3(0.52, 0.92, 0.98);
      } else if (abs(pType - 7.0) < 0.4) { // Neptune: deep cobalt storm sky
        skyZenith = vec3(0.06, 0.15, 0.54);
        skyHorizon = vec3(0.24, 0.48, 0.96);
        rimColBase = vec3(0.24, 0.52, 1.0);
      }

      vec3 upLocal = normalize(ro);
      float upDot = dot(rd, upLocal);
      float sunDot = max(dot(rd, uSunDir), 0.0);

      if (hasAtmo && atmoBlend > 0.001) {
        vec3 daySky = mix(skyHorizon, skyZenith, clamp(upDot * 1.15 + 0.15, 0.0, 1.0));
        daySky += vec3(0.26, 0.22, 0.12) * pow(sunDot, 10.0) * atmoBlend;
        col = mix(col, daySky, atmoBlend);
      }

      // ---- Blazing Retro Pixel Sun (scaled by distance from Sun!) ----
      float sScale = max(0.15, uSunScale);
      float haloThresh = 1.0 - 0.036 * sScale;
      float discThresh = 1.0 - 0.0032 * sScale;
      float ringThresh = 1.0 - 0.0068 * sScale;
      if (sunDot > haloThresh) {
        float halo = smoothstep(haloThresh, 0.999, sunDot);
        col += vec3(1.0, 0.72, 0.28) * halo * (0.75 + 0.2 * min(sScale, 2.0));
      }
      if (sunDot > discThresh) {
        col = vec3(1.0, 0.98, 0.88);
      } else if (sunDot > ringThresh) {
        col = mix(col, vec3(1.0, 0.85, 0.45), 0.85);
      }

      // ---- Companion Moon (Earth's Moon / Jupiter's Europa / Pluto's Charon) ----
      if (uHasMoon > 0.5) {
        vec3 moonCenter = vec3(-2100.0, 2600.0, 2700.0);
        float moonR = 460.0;
        vec2 moonHit = hitSphere(ro, rd, moonCenter, moonR);
        if (moonHit.x > 0.0) {
          vec3 mp = ro + rd * moonHit.x;
          vec3 mn = normalize(mp - moonCenter);
          float mDiff = max(dot(mn, uSunDir), 0.0);
          float maria = fbm3(mn * 3.8);
          float craterNoise = noise3(mn * 14.0);
          float craterRing = smoothstep(0.76, 0.82, craterNoise) - smoothstep(0.82, 0.89, craterNoise) * 0.6;
          vec3 mBase = mix(vec3(0.45, 0.48, 0.54), vec3(0.78, 0.79, 0.82), smoothstep(0.38, 0.62, maria));
          mBase -= vec3(0.18) * craterRing;
          vec3 moonCol = mBase * (0.14 + 0.92 * mDiff);
          col = mix(col, moonCol, mix(0.45, 1.0, spaceFactor));
        }
      }

      // ---- Main Planet Ray-Sphere, Rings, Cloud Shell & Atmosphere Halo ----
      float R = uEarthRadius;
      float Rcloud = R + 28.0;
      float Ratmo = R + 125.0;

      vec2 earthHit = hitSphere(ro, rd, vec3(0.0), R);
      vec2 cloudHit = hitSphere(ro, rd, vec3(0.0), Rcloud);
      vec2 atmoHit  = hitSphere(ro, rd, vec3(0.0), Ratmo);

      // Ring behind planet (when ray misses planet or hits ring behind)
      vec4 ringBehind = evalRing(ro, rd, R, pType, earthHit.x > 0.0 ? earthHit.x : -1.0);
      if (earthHit.x <= 0.0 && ringBehind.a > 0.01) {
        col = mix(col, ringBehind.rgb, ringBehind.a);
      }

      // Outer atmospheric rim glow
      if (hasAtmo && atmoHit.y > 0.0) {
        float tStart = max(atmoHit.x, 0.0);
        float tEnd = earthHit.x > 0.0 ? min(earthHit.x, atmoHit.y) : atmoHit.y;
        if (tEnd > tStart) {
          vec3 midPt = ro + rd * ((tStart + tEnd) * 0.5);
          float hNorm = clamp((length(midPt) - R) / (Ratmo - R), 0.0, 1.0);
          float thickness = clamp((tEnd - tStart) / (Ratmo * 0.7), 0.0, 1.0);
          float rim = pow(1.0 - hNorm, 2.2) * thickness;
          float sunLit = smoothstep(-0.35, 0.5, dot(normalize(midPt), uSunDir));
          vec3 glowCol = mix(rimColBase * 0.7, min(vec3(1.0), rimColBase * 1.25), rim);
          col += glowCol * rim * (0.28 + 0.72 * sunLit) * (0.35 + 0.75 * spaceFactor);
        }
      }

      // Planet Surface Rendering (all 9 planets!)
      if (earthHit.x > 0.0) {
        vec3 p = ro + rd * earthHit.x;
        vec3 n = normalize(p);
        vec3 rn = rotY(n, uTime * 0.0025);
        float lat = abs(rn.y);
        vec3 surfCol = vec3(0.5);
        bool isOcean = false;

        if (abs(pType - 0.0) < 0.4) {
          // 0: MERCURY — cratered scorched rock
          float baseN = fbm4(rn * 5.0);
          float cr = noise3(rn * 18.0);
          float ring = smoothstep(0.72, 0.79, cr) - smoothstep(0.79, 0.87, cr) * 0.65;
          surfCol = mix(vec3(0.36, 0.33, 0.31), vec3(0.68, 0.63, 0.58), baseN) - vec3(0.16) * ring;
        } else if (abs(pType - 1.0) < 0.4) {
          // 1: VENUS — thick swirling golden-amber sulfuric clouds
          float swirl = fbm4(vec3(rn.x * 4.0 + sin(rn.y * 5.0) * 0.5, rn.y * 7.0, rn.z * 4.0 + uTime * 0.02));
          surfCol = mix(vec3(0.74, 0.48, 0.16), vec3(0.98, 0.88, 0.54), swirl);
        } else if (abs(pType - 2.0) < 0.4) {
          // 2: EARTH — oceans, beaches, forests, mountains, ice caps
          float cont = fbm4(rn * 4.4);
          float detail = noise3(rn * 19.0);
          float elev = cont * 0.84 + detail * 0.16;
          isOcean = elev < 0.515;
          if (isOcean) {
            float shallow = smoothstep(0.44, 0.515, elev);
            surfCol = mix(vec3(0.06, 0.25, 0.62), vec3(0.10, 0.44, 0.82), smoothstep(0.32, 0.47, elev));
            surfCol = mix(surfCol, vec3(0.22, 0.74, 0.88), shallow);
            float wave = noise3(rn * 48.0 + vec3(uTime * 0.45, 0.0, -uTime * 0.3));
            surfCol += vec3(0.06, 0.12, 0.14) * smoothstep(0.68, 0.88, wave);
          } else if (elev < 0.545) {
            surfCol = vec3(0.88, 0.80, 0.52);
          } else if (elev < 0.64) {
            surfCol = vec3(0.24, 0.68, 0.24);
          } else if (elev < 0.73) {
            surfCol = vec3(0.13, 0.46, 0.20);
          } else {
            surfCol = mix(vec3(0.46, 0.48, 0.50), vec3(0.92, 0.96, 1.0), smoothstep(0.75, 0.82, elev));
          }
          if (lat > 0.82 + (detail - 0.5) * 0.08) surfCol = vec3(0.90, 0.96, 1.0);
        } else if (abs(pType - 3.0) < 0.4) {
          // 3: MARS — rusty red deserts, dark canyons, white polar caps
          float hMap = fbm4(rn * 4.8);
          float cr = noise3(rn * 16.0);
          surfCol = mix(vec3(0.46, 0.16, 0.09), vec3(0.88, 0.42, 0.22), smoothstep(0.32, 0.74, hMap));
          surfCol -= vec3(0.12, 0.06, 0.04) * smoothstep(0.74, 0.84, cr);
          if (lat > 0.85) surfCol = vec3(0.94, 0.93, 0.92);
        } else if (abs(pType - 4.0) < 0.4) {
          // 4: JUPITER — turbulent zonal bands + Great Red Spot!
          float turb = fbm3(rn * 6.5) * 0.16;
          float band = sin((rn.y + turb) * 26.0) * 0.5 + 0.5;
          float band2 = sin((rn.y - turb * 0.7) * 11.0) * 0.5 + 0.5;
          surfCol = mix(vec3(0.74, 0.40, 0.20), vec3(0.95, 0.88, 0.74), band);
          surfCol = mix(surfCol, vec3(0.86, 0.56, 0.30), band2 * 0.45);
          // Great Red Spot near southern tropical belt
          vec3 spotPos = normalize(vec3(0.25, -0.28, 0.92));
          float spotDist = length((rn - spotPos) * vec3(1.0, 1.85, 1.0));
          float spot = 1.0 - smoothstep(0.12, 0.24, spotDist);
          surfCol = mix(surfCol, vec3(0.86, 0.22, 0.14), spot * 0.92);
        } else if (abs(pType - 5.0) < 0.4) {
          // 5: SATURN — soft golden-butterscotch bands
          float turb = fbm3(rn * 5.0) * 0.07;
          float band = sin((rn.y + turb) * 22.0) * 0.5 + 0.5;
          surfCol = mix(vec3(0.76, 0.65, 0.40), vec3(0.96, 0.90, 0.68), band);
          if (lat > 0.78) surfCol = mix(surfCol, vec3(0.56, 0.60, 0.58), 0.45);
        } else if (abs(pType - 6.0) < 0.4) {
          // 6: URANUS — pale aquamarine ice giant
          float band = sin(rn.y * 14.0 + fbm3(rn * 4.0) * 0.3) * 0.5 + 0.5;
          surfCol = mix(vec3(0.42, 0.82, 0.88), vec3(0.66, 0.94, 0.96), band);
        } else if (abs(pType - 7.0) < 0.4) {
          // 7: NEPTUNE — deep vivid cobalt blue + high-speed white storm streaks
          float turb = fbm3(rn * 6.0) * 0.12;
          float band = sin((rn.y + turb) * 18.0) * 0.5 + 0.5;
          surfCol = mix(vec3(0.08, 0.20, 0.68), vec3(0.22, 0.44, 0.94), band);
          float streak = smoothstep(0.72, 0.84, fbm3(vec3(rn.x * 3.0, rn.y * 18.0, rn.z * 3.0)));
          surfCol = mix(surfCol, vec3(0.82, 0.92, 1.0), streak * 0.65);
        } else {
          // 8: PLUTO — frozen nitrogen ice + reddish tholin + Heart Plain!
          float h = fbm4(rn * 4.5);
          surfCol = mix(vec3(0.54, 0.34, 0.28), vec3(0.84, 0.78, 0.72), smoothstep(0.32, 0.68, h));
          // Iconic heart-shaped Tombaugh Regio ice plain
          vec3 hp = rn - normalize(vec3(0.15, 0.18, 0.97));
          float heart = length(vec2(hp.x * 1.15, hp.y - abs(hp.x) * 0.45));
          if (heart < 0.28) surfCol = mix(surfCol, vec3(0.95, 0.93, 0.90), smoothstep(0.28, 0.16, heart));
        }

        // Solar lighting
        float ndl = dot(n, uSunDir);
        float light = clamp(ndl * 1.15, 0.0, 1.0);
        float ambient = 0.25;
        vec3 litCol = surfCol * (ambient + (1.0 - ambient) * light);

        // Specular sun glint on Earth's oceans
        if (isOcean && ndl > 0.0) {
          vec3 hVec = normalize(uSunDir - rd);
          float spec = pow(max(dot(n, hVec), 0.0), 36.0);
          litCol += vec3(1.0, 0.94, 0.76) * spec * 0.95;
        }

        // Earth 3D cloud shadows cast onto surface
        if (abs(pType - 2.0) < 0.4) {
          vec3 shadowDir = normalize(n + uSunDir * 0.035);
          float cShad = cloudDensity(shadowDir, uTime);
          litCol *= (1.0 - cShad * 0.42 * clamp(ndl + 0.2, 0.0, 1.0));
        }

        // Atmospheric aerial haze near horizon
        if (hasAtmo) {
          float fresnel = pow(1.0 - max(dot(-rd, n), 0.0), 2.8);
          litCol = mix(litCol, rimColBase, fresnel * (0.38 + 0.34 * atmoBlend));
        }

        col = litCol;

        // Earth 3D Cloud Layer ABOVE Earth Surface
        if (abs(pType - 2.0) < 0.4) {
          float tCloud = -1.0;
          if (cloudHit.x > 0.0 && cloudHit.x < earthHit.x) tCloud = cloudHit.x;
          else if (cloudHit.x <= 0.0 && cloudHit.y > 0.0 && cloudHit.y < earthHit.x) tCloud = cloudHit.y;
          if (tCloud > 0.0) {
            vec3 cp = ro + rd * tCloud;
            vec3 cn = normalize(cp);
            float cd = cloudDensity(cn, uTime);
            if (cd > 0.05) {
              float cLight = 0.38 + 0.62 * clamp(dot(cn, uSunDir) * 1.2 + 0.15, 0.0, 1.0);
              float puff = cloudDensity(normalize(cn + uSunDir * 0.014), uTime);
              vec3 cCol = mix(vec3(0.68, 0.79, 0.92), vec3(0.98, 0.99, 1.0), clamp(0.45 + (cd - puff) * 1.4, 0.0, 1.0));
              col = mix(col, cCol * cLight, clamp(cd * 0.96, 0.0, 1.0));
            }
          }
        }

        // Ring IN FRONT of planet (for Saturn & Uranus!)
        if (ringBehind.a > 0.01) {
          col = mix(col, ringBehind.rgb, ringBehind.a);
        }
      } else if (abs(pType - 2.0) < 0.4 && (cloudHit.x > 0.0 || cloudHit.y > 0.0)) {
        // Looking up through clouds on Earth
        float tCloud = cloudHit.x > 0.0 ? cloudHit.x : cloudHit.y;
        if (tCloud > 0.0 && tCloud < 650.0) {
          vec3 cp = ro + rd * tCloud;
          vec3 cn = normalize(cp);
          float cd = cloudDensity(cn, uTime);
          if (cd > 0.08) {
            float distFade = 1.0 - smoothstep(180.0, 620.0, tCloud);
            vec3 cCol = vec3(0.92, 0.96, 1.0) * (0.55 + 0.45 * clamp(dot(cn, uSunDir), 0.0, 1.0));
            col = mix(col, cCol, cd * 0.85 * distFade * atmoBlend);
          }
        }
      }

      // ---- 8-Bit / 16-Bit Ordered Bayer Dithering & Color Quantization ----
      float dither = bayer4(px) * (1.0 / 26.0);
      col = clamp(col + dither, 0.0, 1.0);
      float levels = 20.0;
      col = floor(col * levels + 0.5) / levels;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function create(canvas) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      return { ok: false, render: function () {} };
    }

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VS_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FS_SRC);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      return { ok: false, render: function () {} };
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const locPos = gl.getAttribLocation(prog, "aPos");
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uCamPos = gl.getUniformLocation(prog, "uCamPos");
    const uCamRight = gl.getUniformLocation(prog, "uCamRight");
    const uCamUp = gl.getUniformLocation(prog, "uCamUp");
    const uCamFwd = gl.getUniformLocation(prog, "uCamFwd");
    const uTanHalfFov = gl.getUniformLocation(prog, "uTanHalfFov");
    const uSunDir = gl.getUniformLocation(prog, "uSunDir");
    const uEarthRadius = gl.getUniformLocation(prog, "uEarthRadius");
    const uPlanetType = gl.getUniformLocation(prog, "uPlanetType");
    const uSunScale = gl.getUniformLocation(prog, "uSunScale");
    const uHasMoon = gl.getUniformLocation(prog, "uHasMoon");

    function render(state) {
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, state.time);
      gl.uniform3f(uCamPos, state.camPos.x, state.camPos.y, state.camPos.z);
      gl.uniform3f(uCamRight, state.camRight.x, state.camRight.y, state.camRight.z);
      gl.uniform3f(uCamUp, state.camUp.x, state.camUp.y, state.camUp.z);
      gl.uniform3f(uCamFwd, state.camFwd.x, state.camFwd.y, state.camFwd.z);
      gl.uniform1f(uTanHalfFov, state.tanHalfFov);
      gl.uniform3f(uSunDir, state.sunDir.x, state.sunDir.y, state.sunDir.z);
      gl.uniform1f(uEarthRadius, state.earthRadius);
      gl.uniform1f(uPlanetType, state.planetType != null ? state.planetType : 2.0);
      gl.uniform1f(uSunScale, state.sunScale != null ? state.sunScale : 1.0);
      gl.uniform1f(uHasMoon, state.hasMoon ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return { ok: true, render };
  }

  return { create };
})();
