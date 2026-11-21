// 사운드: 효과음과 배경음악을 모두 Web Audio로 합성한다 (파일 없음).
SA.Audio = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf, corrGain;
  const last = {};
  let track = null, nextTime = 0, step = 0, timer = null, corrLayer = 0;

  const init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    corrGain = ctx.createGain(); corrGain.gain.value = 0; corrGain.connect(musicBus);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter();
    o1.type = 'sawtooth'; o1.frequency.value = 55; o2.type = 'sawtooth'; o2.frequency.value = 55.7;
    f.type = 'lowpass'; f.frequency.value = 260; o1.connect(f); o2.connect(f); f.connect(corrGain); o1.start(); o2.start();
    setVolumes();
    if (track) play(track, true);
  };
  const setVolumes = () => {
    if (!ctx) return;
    const s = SA.profile ? SA.profile.settings : { music: .5, sfx: .7 };
    musicBus.gain.value = s.music * 0.55;
    sfxBus.gain.value = s.sfx;
  };

  const tone = (type, f, t, dur, vol, o = {}) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.02);
  };
  const noise = (t, dur, vol, o = {}) => {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  };
  // 같은 소리가 한 프레임에 겹치면 하나만 (탄막 게임 소리 폭주 방지)
  const gate = (k, ms) => {
    const n = performance.now();
    if (last[k] && n - last[k] < ms) return false;
    last[k] = n; return true;
  };

  const sfx = (name, p = 1) => {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    switch (name) {
      case 'shoot': if (gate(name, 55)) tone('square', 880, t, 0.06, 0.05, { slide: 420, lp: 3000 }); break;
      case 'sub': if (gate(name, 70)) tone('square', 1200, t, 0.04, 0.025, { slide: 700, lp: 2500 }); break;
      case 'enemyShot': if (gate(name, 90)) tone('triangle', 520, t, 0.07, 0.03, { slide: 300 }); break;
      case 'hitEnemy': if (gate(name, 40)) noise(t, 0.05, 0.08, { f: 2500, type: 'highpass' }); break;
      case 'hurt': noise(t, 0.25, 0.5, { f: 900, fTo: 120 }); tone('sawtooth', 160, t, 0.25, 0.25, { slide: 60 }); tone('square', 2400, t, 0.08, 0.06, { slide: 1800 }); break;
      case 'graze': if (gate(name, 45)) tone('sine', 2600 + Math.random() * 300, t, 0.05, 0.05); break;
      case 'boom': if (gate('boom', 50)) { noise(t, 0.25 * p, 0.35, { f: 1400, fTo: 80 }); tone('sine', 110 / p, t, 0.3 * p, 0.3, { slide: 35 }); } break;
      case 'bigboom': noise(t, 1.2, 0.6, { f: 1800, fTo: 50 }); tone('sine', 70, t, 1.2, 0.5, { slide: 25 }); break;
      case 'pickup': if (gate(name, 60)) { const b = 660 + p * 110; tone('square', b, t, 0.06, 0.06, { lp: 4000 }); tone('square', b * 1.5, t + 0.05, 0.08, 0.05, { lp: 4000 }); } break;
      case 'full': if (gate(name, 600)) tone('square', 200, t, 0.18, 0.08, { lp: 1200 }); break;
      case 'roll': tone('sine', 400, t, 0.3, 0.12, { slide: 1400 }); noise(t, 0.25, 0.08, { f: 3000, type: 'bandpass' }); break;
      case 'ram': noise(t, 0.4, 0.25, { f: 400, fTo: 2000, type: 'bandpass' }); tone('sawtooth', 90, t, 0.35, 0.15, { slide: 220 }); break;
      case 'repair': for (let i = 0; i < 4; i++) tone('triangle', 520 + i * 130, t + i * 0.08, 0.12, 0.07); break;
      case 'boost': noise(t, 0.6, 0.2, { f: 300, fTo: 3500, type: 'bandpass' }); break;
      case 'warp': tone('sine', 1800, t, 0.18, 0.12, { slide: 200 }); tone('sine', 300, t + 0.1, 0.15, 0.1, { slide: 1500 }); break;
      case 'missile': for (let i = 0; i < 3; i++) noise(t + i * 0.05, 0.15, 0.12, { f: 2000, fTo: 500, type: 'bandpass' }); break;
      case 'purge': tone('sine', 300, t, 0.5, 0.2, { slide: 1200 }); noise(t, 0.4, 0.15, { f: 6000, fTo: 800, type: 'highpass' }); break;
      case 'shield': tone('triangle', 700, t, 0.4, 0.12, { slide: 1100 }); break;
      case 'siren': for (let i = 0; i < 2; i++) { tone('sawtooth', 220, t + i * 0.5, 0.45, 0.08, { slide: 330, lp: 900 }); } break;
      case 'beep': tone('square', 1000, t, 0.07, 0.05, { lp: 3000 }); break;
      case 'extract': [523, 659, 784, 1046].forEach((f, i) => tone('square', f, t + i * 0.09, 0.2, 0.07, { lp: 3500 })); tone('sine', 200, t, 1.0, 0.15, { slide: 1600 }); break;
      case 'salvage': if (gate(name, 140)) tone('triangle', 300 + p * 500, t, 0.08, 0.04); break;
      case 'open': noise(t, 0.2, 0.15, { f: 1500, fTo: 400 }); tone('square', 330, t, 0.1, 0.05); break;
      case 'click': tone('square', 1400, t, 0.03, 0.03, { lp: 4000 }); break;
      case 'drop': tone('triangle', 330, t, 0.1, 0.06, { slide: 160 }); break;
      case 'buy': [784, 1046].forEach((f, i) => tone('square', f, t + i * 0.07, 0.12, 0.06, { lp: 3500 })); break;
      case 'deny': tone('square', 140, t, 0.15, 0.07, { lp: 900 }); break;
      case 'stage': tone('sawtooth', 110, t, 0.9, 0.18, { slide: 70, lp: 600 }); noise(t, 0.9, 0.08, { f: 200 }); break;
      case 'swap': tone('square', 600, t, 0.04, 0.04, { lp: 2500 }); tone('square', 900, t + 0.06, 0.05, 0.04, { lp: 2500 }); break;
      case 'reload': noise(t, 0.12, 0.08, { f: 1800, type: 'bandpass' }); tone('triangle', 260, t + 0.1, 0.25, 0.06, { slide: 700 }); break;
      case 'snipe': noise(t, 0.3, 0.3, { f: 3000, fTo: 300 }); tone('sawtooth', 1600, t, 0.12, 0.1, { slide: 200, lp: 5000 }); break;
      // 좋은 드랍: 등급이 높을수록 음이 하나씩 늘어난다 (부담스럽지 않게 짧고 작게)
      case 'rare1': [880, 1175].forEach((f, i) => tone('triangle', f, t + i * 0.06, 0.12, 0.05)); break;
      case 'rare2': [784, 988, 1319].forEach((f, i) => tone('triangle', f, t + i * 0.07, 0.16, 0.06)); tone('sine', 2637, t + 0.21, 0.25, 0.025); break;
      case 'rare3': [659, 880, 1109, 1319, 1760].forEach((f, i) => tone('triangle', f, t + i * 0.07, 0.2, 0.06)); tone('sine', 3520, t + 0.35, 0.4, 0.03); break;
      case 'hack': if (gate(name, 160)) tone('square', 900 + p * 900, t, 0.05, 0.03, { lp: 3000 }); break;
      case 'unlock': [523, 784, 1046].forEach((f, i) => tone('square', f, t + i * 0.05, 0.1, 0.05, { lp: 3000 })); noise(t, 0.2, 0.08, { f: 4000, type: 'highpass' }); break;
    }
  };

  // ── 배경음악: 16분음표 시퀀서 ──
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const TR = {
    raid: { bpm: 148, len: 64, step(i, t, sp) {
      const bar = Math.floor(i / 16) % 4, s = i % 16;
      const roots = [45, 41, 48, 43];               // A F C G
      const r = roots[bar];
      const arp = [0, 12, 7, 12, 3, 12, 7, 15];
      tone('sawtooth', N(r - 12 + arp[s % 8] * (s % 2 ? 1 : 0)), t, sp * 0.9, 0.09, { lp: 700, bus: musicBus });
      if (s % 4 === 0) { tone('sine', 120, t, 0.18, 0.4, { slide: 40, bus: musicBus }); }
      if (s === 4 || s === 12) noise(t, 0.15, 0.18, { f: 2400, type: 'bandpass', bus: musicBus });
      if (s % 2 === 1) noise(t, 0.03, 0.05, { f: 7000, type: 'highpass', bus: musicBus });
      const mel = [69, -1, 72, -1, 76, -1, 74, 72, 69, -1, -1, 67, 69, -1, 64, -1];
      const m = mel[s];
      if (bar % 2 === 1 && m > 0) tone('square', N(m + (bar === 3 ? 2 : 0)), t, sp * 1.8, 0.035, { lp: 2400, bus: musicBus, attack: 0.01 });
    } },
    boss: { bpm: 172, len: 32, step(i, t, sp) {
      const s = i % 16, bar = Math.floor(i / 16) % 2;
      const r = bar ? 41 : 40;
      tone('sawtooth', N(r - 12 + (s % 3 === 2 ? 12 : 0)), t, sp * 0.8, 0.11, { lp: 900, bus: musicBus });
      if (s % 4 === 0 || s === 10) tone('sine', 130, t, 0.15, 0.45, { slide: 40, bus: musicBus });
      if (s === 4 || s === 12) noise(t, 0.18, 0.22, { f: 2000, type: 'bandpass', bus: musicBus });
      noise(t, 0.025, 0.04, { f: 8000, type: 'highpass', bus: musicBus });
      if (s % 4 === 2) tone('square', N(76 + (bar ? 1 : 0)), t, sp * 1.5, 0.03, { lp: 3000, bus: musicBus });
    } },
    hangar: { bpm: 72, len: 64, step(i, t, sp) {
      if (i % 16 !== 0) { if (i % 4 === 2 && Math.random() < 0.3) tone('sine', N([81, 83, 76, 79][(i >> 2) % 4]), t, 1.2, 0.02, { bus: musicBus, attack: 0.05 }); return; }
      const ch = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]][(i >> 4) % 4];
      ch.forEach((n, k) => tone('triangle', N(n), t, sp * 15, 0.035, { attack: 0.8, bus: musicBus, detune: k * 3 }));
      tone('sine', N(ch[0] - 12), t, sp * 15, 0.05, { attack: 0.6, bus: musicBus });
    } },
    death: { bpm: 66, len: 48, once: true, step(i, t, sp) {
      const seq = [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 64, 67, 71, 76, 74, 72, 71, 69, -1, -1, -1, -1,
                   69, 72, 76, 81, 79, 76, 77, 74, 72, 71, 69, -1, 64, -1, 69, -1, -1, -1, -1, -1, -1, -1, -1, -1];
      const n = seq[i]; if (n > 0) { tone('sine', N(n), t, 1.6, 0.11, { bus: musicBus }); tone('triangle', N(n), t, 0.6, 0.03, { bus: musicBus }); }
      if (i % 8 === 0 && i < 40) tone('sine', N(45 - (i / 8 % 2) * 4), t, sp * 8, 0.06, { attack: 0.3, bus: musicBus });
    } },
  };
  const tick = () => {
    if (!ctx || !track || !TR[track]) return;
    const tr = TR[track], sp = 60 / tr.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      if (tr.once && step >= tr.len) { track = null; return; }
      tr.step(step % tr.len, nextTime, sp);
      step++; nextTime += sp;
    }
  };
  const play = (name, force) => {
    if (track === name && !force) return;
    track = name; step = 0;
    if (!ctx) return;
    nextTime = ctx.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 25);
  };
  const setCorrosion = (stage) => {
    if (!ctx || stage === corrLayer) return;
    corrLayer = stage;
    corrGain.gain.setTargetAtTime(stage >= 2 ? (stage === 3 ? 0.12 : 0.06) : 0, ctx.currentTime, 0.8);
  };

  return { init, sfx, play, setVolumes, setCorrosion, get track() { return track; } };
})();
