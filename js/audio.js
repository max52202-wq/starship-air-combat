// ============================================================================
// audio.js — Zero-Asset 8-Bit Web Audio Synthesizer for Starfleet Combat
// ============================================================================

window.SFX = (function () {
  let ctx = null;
  let muted = false;
  let engineGain = null;
  let engineOsc = null;
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // Pre-generate 1s white noise buffer for explosions & thrusters
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // Quantized 8-bit LFSR-like noise
        data[i] = Math.round((Math.random() * 2 - 1) * 4) / 4;
      }
      // Subtle thruster hum
      engineOsc = ctx.createOscillator();
      engineOsc.type = "triangle";
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 180;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setMuted(m) {
    muted = m;
    if (engineGain && ctx) {
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.03, ctx.currentTime, 0.05);
    }
  }

  function isMuted() {
    return muted;
  }

  function updateEngine(speedNorm, boosting, inSpace) {
    if (!ctx || !engineGain || !engineOsc) return;
    if (muted) {
      engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      return;
    }
    const freq = 48 + speedNorm * 62 + (boosting ? 35 : 0);
    const vol = (0.022 + (boosting ? 0.025 : 0)) * (inSpace ? 0.65 : 1.0);
    engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.06);
    engineGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.08);
  }

  function playLaser(isEnemy) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = isEnemy ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(isEnemy ? 520 : 980, t);
    osc.frequency.exponentialRampToValueAtTime(isEnemy ? 140 : 210, t + 0.09);
    g.gain.setValueAtTime(isEnemy ? 0.035 : 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function playMissile() {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(1400, t);
    filt.frequency.exponentialRampToValueAtTime(320, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(t);
    src.stop(t + 0.31);
  }

  function playExplosion(big) {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const dur = big ? 0.75 : 0.26;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(big ? 420 : 900, t);
    filt.frequency.exponentialRampToValueAtTime(75, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(big ? 0.18 : 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);

    if (big) {
      // Sub-bass boom
      const osc = c.createOscillator();
      const og = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.65);
      og.gain.setValueAtTime(0.16, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
      osc.connect(og);
      og.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    }
  }

  function playHit() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.setValueAtTime(160, t + 0.03);
    g.gain.setValueAtTime(0.055, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.075);
  }

  function playLockBeep() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1320, t);
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  function playLockComplete() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [1380, 1760].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      g.gain.setValueAtTime(0.04, t + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.05);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.055);
    });
  }

  function playCrash(heavy) {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const dur = heavy ? 0.42 : 0.24;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(heavy ? 320 : 580, t);
    filt.frequency.exponentialRampToValueAtTime(90, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(heavy ? 0.22 : 0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);

    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(heavy ? 140 : 210, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + dur);
    og.gain.setValueAtTime(heavy ? 0.14 : 0.09, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(og);
    og.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playUTurn() {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.35);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.7);
    g.gain.setValueAtTime(0.075, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.74);

    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(600, t);
    filt.frequency.exponentialRampToValueAtTime(1900, t + 0.35);
    filt.frequency.exponentialRampToValueAtTime(500, t + 0.65);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.06, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
    src.connect(filt);
    filt.connect(ng);
    ng.connect(c.destination);
    src.start(t);
    src.stop(t + 0.7);
  }

  function playStageFanfare() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t = c.currentTime;
    notes.forEach((n, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(n, t + i * 0.085);
      g.gain.setValueAtTime(0.06, t + i * 0.085);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.085 + 0.14);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t + i * 0.085);
      osc.stop(t + i * 0.085 + 0.15);
    });
  }

  function playBarrelRoll() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(840, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.42);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.44);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  function playShield() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [440, 660, 880, 1320].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 0.85, t + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq, t + idx * 0.03 + 0.25);
      g.gain.setValueAtTime(0.04, t + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.35);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.37);
    });
  }

  function playCharge() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(1280, t + 0.48);
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  function playNovaBeam() {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.55);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.6);

    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(1200, t);
    filt.frequency.exponentialRampToValueAtTime(220, t + 0.5);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.09, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
    src.connect(filt);
    filt.connect(ng);
    ng.connect(c.destination);
    src.start(t);
    src.stop(t + 0.54);
  }

  function playEMP() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.55);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  function playCloak() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1180, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  function playFlare() {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const filt = c.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = 1800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.055, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.05);
      src.connect(filt);
      filt.connect(g);
      g.connect(c.destination);
      src.start(t + i * 0.06);
      src.stop(t + i * 0.06 + 0.055);
    }
  }

  function playBrake() {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(780, t);
    filt.frequency.exponentialRampToValueAtTime(240, t + 0.32);
    const g = c.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(t);
    src.stop(t + 0.36);
  }

  function playOverdrive() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      g.gain.setValueAtTime(0.055, t + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.14);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.16);
    });
  }

  return {
    ensure,
    setMuted,
    isMuted,
    updateEngine,
    playLaser,
    playMissile,
    playExplosion,
    playHit,
    playLockBeep,
    playLockComplete,
    playCrash,
    playUTurn,
    playStageFanfare,
    playBarrelRoll,
    playShield,
    playCharge,
    playNovaBeam,
    playEMP,
    playCloak,
    playFlare,
    playBrake,
    playOverdrive,
  };
})();
