// ============================================================================
// math.js — 3D Vector & Quaternion Math for Seamless Surface-to-Space Flight
// ============================================================================

window.M3 = (function () {
  function v3(x = 0, y = 0, z = 0) {
    return { x, y, z };
  }

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function scale(a, s) {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  function lenSq(a) {
    return a.x * a.x + a.y * a.y + a.z * a.z;
  }

  function len(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }

  function norm(a) {
    const l = len(a);
    if (l < 1e-8) return { x: 0, y: 0, z: 1 };
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpV3(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // Quaternion: { x, y, z, w }
  function qIdentity() {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  function qFromAxisAngle(axis, rad) {
    const half = rad * 0.5;
    const s = Math.sin(half);
    const n = norm(axis);
    return { x: n.x * s, y: n.y * s, z: n.z * s, w: Math.cos(half) };
  }

  function qMul(a, b) {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  }

  function qNorm(q) {
    const l = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w) || 1;
    return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
  }

  function qRotV3(q, v) {
    // q * (v,0) * q^-1
    const tx = 2 * (q.y * v.z - q.z * v.y);
    const ty = 2 * (q.z * v.x - q.x * v.z);
    const tz = 2 * (q.x * v.y - q.y * v.x);
    return {
      x: v.x + q.w * tx + (q.y * tz - q.z * ty),
      y: v.y + q.w * ty + (q.z * tx - q.x * tz),
      z: v.z + q.w * tz + (q.x * ty - q.y * tx),
    };
  }

  function qBasis(q) {
    return {
      right: qRotV3(q, { x: 1, y: 0, z: 0 }),
      up: qRotV3(q, { x: 0, y: 1, z: 0 }),
      fwd: qRotV3(q, { x: 0, y: 0, z: 1 }),
    };
  }

  function qFromBasis(right, up, fwd) {
    // Convert orthonormal basis (columns: right, up, fwd) to quaternion
    const m00 = right.x, m01 = up.x, m02 = fwd.x;
    const m10 = right.y, m11 = up.y, m12 = fwd.y;
    const m20 = right.z, m21 = up.z, m22 = fwd.z;
    const trace = m00 + m11 + m22;
    let q;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q = {
        w: 0.25 / s,
        x: (m21 - m12) * s,
        y: (m02 - m20) * s,
        z: (m10 - m01) * s,
      };
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      q = {
        w: (m21 - m12) / s,
        x: 0.25 * s,
        y: (m01 + m10) / s,
        z: (m02 + m20) / s,
      };
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      q = {
        w: (m02 - m20) / s,
        x: (m01 + m10) / s,
        y: 0.25 * s,
        z: (m12 + m21) / s,
      };
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      q = {
        w: (m10 - m01) / s,
        x: (m02 + m20) / s,
        y: (m12 + m21) / s,
        z: 0.25 * s,
      };
    }
    return qNorm(q);
  }

  function qLookAt(fwdDir, upHint) {
    const fwd = norm(fwdDir);
    let up = upHint ? norm(upHint) : { x: 0, y: 1, z: 0 };
    if (Math.abs(dot(fwd, up)) > 0.99) {
      up = Math.abs(fwd.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    }
    const right = norm(cross(up, fwd));
    const trueUp = cross(fwd, right);
    return qFromBasis(right, trueUp, fwd);
  }

  function qSlerp(a, b, t) {
    let bx = b.x, by = b.y, bz = b.z, bw = b.w;
    let cosHalf = a.x * bx + a.y * by + a.z * bz + a.w * bw;
    if (cosHalf < 0) {
      bx = -bx; by = -by; bz = -bz; bw = -bw;
      cosHalf = -cosHalf;
    }
    if (cosHalf > 0.999) {
      return qNorm({
        x: a.x + (bx - a.x) * t,
        y: a.y + (by - a.y) * t,
        z: a.z + (bz - a.z) * t,
        w: a.w + (bw - a.w) * t,
      });
    }
    const halfTheta = Math.acos(clamp(cosHalf, -1, 1));
    const sinHalf = Math.sqrt(1 - cosHalf * cosHalf);
    const ra = Math.sin((1 - t) * halfTheta) / sinHalf;
    const rb = Math.sin(t * halfTheta) / sinHalf;
    return {
      x: a.x * ra + bx * rb,
      y: a.y * ra + by * rb,
      z: a.z * ra + bz * rb,
      w: a.w * ra + bw * rb,
    };
  }

  return {
    v3, add, sub, scale, dot, cross, lenSq, len, norm, lerp, lerpV3, clamp,
    qIdentity, qFromAxisAngle, qMul, qNorm, qRotV3, qBasis, qFromBasis, qLookAt, qSlerp,
  };
})();
