// 이펙트 v0.114: 격파 · 루미나 소멸 · 피격 · 폭발 범위 · 전기 사슬 · 중력 우물 · 줍기 · 탄 소거 · 발사 예고 · 화염/화상 · 플레이어 피격
// 전부 코드로 그리는 별도 레이어다 (도트 원본은 그대로). 적 탄보다 아래에 그려서 탄막을 가리지 않는다.
// 시안: 프로젝트 문서 「이펙트_시안_결정_v1」. 수치(크기·시간·개수)는 시안 기준 임시 값.
// 설정 「이펙트 약하게」(profile.settings.fxSoft): 입자 수를 줄이고 일부 피격 이펙트를 건너뛴다.
SA.FX = (() => {
  const TAU = Math.PI * 2, rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), pick = (a) => a[Math.floor(rnd() * a.length)];
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const out = (x) => 1 - (1 - x) * (1 - x), ease = (u) => u * u * (3 - 2 * u);
  const WARM = ['#2a0f10', '#7a2a14', '#c4541c', '#ff7a3d', '#ffb347', '#ffe08a', '#fff3c4', '#ffffff'];
  const GOLD = ['#1a1204', '#4a3208', '#8a5f10', '#d49a1c', '#ffc23d', '#ffe08a', '#fff3c4', '#ffffff'];
  const TIER = {   // 줍기 반짝임: 등급 색 (SA.TIER_COL: 일반 은색 · 강화 초록 · 행성 금 · 은하 보라)
    일반: { f: ['#10151c', '#2c3a4a', '#4f6479', '#7f97ad', '#aec4d8', '#d3e2ef', '#eef6fc', '#ffffff'], n: 3, a: 0.7 },
    강화: { f: ['#04180e', '#0c4a2c', '#118a52', '#2bd37f', '#5dffb0', '#a6ffd3', '#d9ffeb', '#ffffff'], n: 5, a: 1 },
    행성: { f: GOLD, n: 7, a: 1 },
    은하: { f: ['#120826', '#3a1c70', '#6a3fc2', '#9d6bf0', '#c08bff', '#dcb8ff', '#f0dcff', '#ffffff'], n: 9, a: 1 },
  };
  const FL = ['#fff3c4', '#ffe08a', '#ffb347', '#ff7a3d', '#c4541c', '#7a2a14'];
  const soft = () => !!(SA.profile && SA.profile.settings && SA.profile.settings.fxSoft);
  const K = () => (soft() ? 0.5 : 1);

  // ── 그리기 도구 (지역 좌표, 1월드픽셀 = 1점) ──
  const px = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (c, x0, y0, x1, y1, col, a = 1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); c.globalAlpha = a; c.fillStyle = col;
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
  };
  const ringPx = (c, x, y, r, col, a = 1, skip = 0, th = 1) => {
    const n = Math.max(10, Math.round(r * TAU * 1.1)); c.globalAlpha = a; c.fillStyle = col;
    for (let q = 0; q < n; q++) { if (skip && q % skip === 0) continue; const t = q / n * TAU; c.fillRect(Math.round(x + Math.cos(t) * r), Math.round(y + Math.sin(t) * r), th, th); }
  };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const glow = (c, x, y, r, col, a) => {
    if (r < 1 || a <= 0) return; const [R, G, B] = rgb(col), g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${R},${G},${B},${a})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  const dDisc = (c, cx, cy, r, col, a = 1, softe = 0.35) => {   // 가장자리가 도트 디더로 번지는 원
    const Rr = Math.ceil(r + 1); c.globalAlpha = a; c.fillStyle = col;
    for (let y = -Rr; y <= Rr; y++) for (let x = -Rr; x <= Rr; x++) {
      const d = Math.hypot(x, y) / r; if (d > 1) continue;
      const k = d < 1 - softe ? 1 : 1 - (d - (1 - softe)) / softe;
      if (k >= bay(x + 64, y + 64)) c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  };
  const sparkle = (c, x, y, arm, col, tip, a = 1) => {
    const n = Math.round(arm); if (n < 1) return; const X = Math.floor(x), Y = Math.floor(y); c.globalAlpha = a;
    for (let d = 1; d <= n; d++) { c.fillStyle = d > n * 0.6 ? tip : col; c.fillRect(X + d, Y, 1, 1); c.fillRect(X - d, Y, 1, 1); c.fillRect(X, Y + d, 1, 1); c.fillRect(X, Y - d, 1, 1); }
    c.fillStyle = col; if (n >= 3) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) c.fillRect(X + dx, Y + dy, 1, 1);
    c.fillStyle = '#ffffff'; c.fillRect(X, Y, 1, 1); glow(c, x, y, 4 + n * 2, col, 0.5 * a);
  };
  const mixc = (h, t, k) => { const a = rgb(h), b = rgb(t); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const toneCache = new Map();
  const tones = (col) => { let t = toneCache.get(col); if (!t) { t = { d: mixc(col, '#000000', 0.5), l: mixc(col, '#ffffff', 0.5) }; toneCache.set(col, t); } return t; };
  const orb = (c, x, y, r, col, a = 1) => {   // 탄과 같은 구슬 모양 (어두운 외곽선 · 몸통 · 밝은 안쪽 · 흰 점)
    const T = tones(col); c.globalAlpha = a;
    c.fillStyle = T.d; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.8, 0, TAU); c.fill();
    c.fillStyle = T.l; c.beginPath(); c.arc(x, y, r * 0.52, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.24, 0, TAU); c.fill();
  };

  // ── 이펙트 목록 (R.fx2): 각 이펙트 = { kind, x, y, t, dur, step?, draw(c) } ──
  const CAP = { hit: 32, ghost: 200, ember: 50, chain: 8, pick: 16 };
  const add = (R, o) => {
    const L = R.fx2 || (R.fx2 = []);
    if (o.kind && CAP[o.kind]) { let n = 0; for (const q of L) if (q.kind === o.kind) n++; if (n >= CAP[o.kind]) return null; }
    if (L.length > 420) L.shift();
    o.t = 0; L.push(o); return o;
  };
  const update = (R, dt) => {
    const L = R.fx2; if (!L || !L.length) return;
    for (const o of L) { o.t += dt; if (o.step) o.step(dt); }
    R.fx2 = L.filter((o) => o.t < o.dur);
  };
  const draw = (ctx, R) => {
    const L = R.fx2; if (!L || !L.length) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (const o of L) { ctx.save(); ctx.translate(Math.round(o.x || 0), Math.round(o.y || 0)); o.draw(ctx); ctx.restore(); }
    ctx.restore(); ctx.globalAlpha = 1;
  };

  // ── 적 격파: 흰 섬광 → 울퉁불퉁한 불덩이가 식음 → 충격 고리 → 짧은 불꽃 줄 → 옅은 연기 (0.9초) ──
  const kill = (R, e) => {
    const r = e.boss ? 30 : clamp(Math.round(e.r * 0.95), 8, 22), k = K(), F = WARM;
    const nsp = Math.max(4, Math.round((3 + r * 0.65) * k));
    const sp = Array.from({ length: nsp }, () => ({ a: rr(0, TAU), v: rr(1.6, 3.4) * r * 3.4, life: rr(0.22, 0.5), c: pick([5, 6, 4, 7]) }));
    const em = Array.from({ length: Math.round(nsp * 0.7) }, () => ({ a: rr(0, TAU), v: rr(0.6, 1.5) * r * 1.4, life: rr(0.4, 0.8) }));
    const sm = Array.from({ length: 5 }, (_, i) => ({ a: i / 5 * TAU + rr(-0.3, 0.3), d: r * rr(0.4, 0.8), s: r * rr(0.28, 0.42), t0: rr(0.05, 0.14) }));
    const lumps = Array.from({ length: 6 }, () => ({ a: rr(0, TAU), d: rr(0.2, 0.55), s: rr(0.4, 0.62), t0: rr(0, 0.12), h: rr(-0.6, 0.6) }));
    add(R, { kind: 'kill', x: e.x, y: e.y, dur: 0.9, draw(c) {
      const t = this.t;
      for (const s of sm) { const u = (t - s.t0) / 0.6; if (u <= 0 || u >= 1) continue; const d = s.d * (0.4 + out(u)); dDisc(c, Math.cos(s.a) * d, Math.sin(s.a) * d, s.s * (0.7 + u * 0.7), '#2b1d2d', 0.9 * (1 - u), 0.5); }
      if (t < 0.36) { const u = t / 0.36, g = out(u);
        for (const L of lumps) { const uu = clamp(u * 1.1 - L.t0), rd = L.s * r * (0.5 + 0.7 * out(uu)); if (uu >= 1) continue;
          dDisc(c, Math.cos(L.a) * L.d * r * g, Math.sin(L.a) * L.d * r * g, rd, F[Math.max(1, Math.min(7, Math.floor(6.4 - uu * 5.2 + L.h)))], 1, 0.5); }
        dDisc(c, 0, 0, r * (0.42 + 0.3 * g) * (1 - u * 0.5), F[Math.max(2, Math.floor(7 - u * 4.5))], 1, 0.5); glow(c, 0, 0, r * 2.4, F[4], 0.5 * (1 - u)); }
      if (t < 0.07) { const kk = 1 - t / 0.07; dDisc(c, 0, 0, r * 1.05 * (0.6 + 0.4 * kk), '#ffffff', 1, 0.3); glow(c, 0, 0, r * 3, F[5], 0.8 * kk); }
      if (t < 0.36) { const u = t / 0.36, rd = r * (0.7 + 1.9 * out(u)); ringPx(c, 0, 0, rd, F[u < 0.5 ? 6 : 4], 1 - u * u, 0, u < 0.5 ? 2 : 1); }
      for (const s of sp) { const u = t / s.life; if (u >= 1) continue; const kk = 4, d = s.v * (1 - Math.exp(-kk * t)) / kk, d0 = Math.max(s.v * (1 - Math.exp(-kk * Math.max(0, t - 0.07))) / kk, d - 1);
        line(c, Math.cos(s.a) * d0, Math.sin(s.a) * d0, Math.cos(s.a) * d, Math.sin(s.a) * d, F[Math.min(7, Math.max(2, s.c - Math.floor(u * 3)))], 1 - u * u); }
      for (const m of em) { const u = t / m.life; if (u >= 1) continue; const d = m.v * out(u) * 0.8; px(c, Math.cos(m.a) * d, Math.sin(m.a) * d, F[u < 0.5 ? 4 : 2], 1 - u); }
    } });
  };

  // ── 루미나 소멸: 기체 도트를 2×2 조각으로 나눠 중심부터 재처럼 풀려 흩날린다 (색은 원본 그대로, 불꽃·고리·섬광 없음) ──
  const scatter = (R, e) => {
    const S = SA.RIFT && SA.RIFT.spr, pre = SA.Render && SA.Render.pre; if (!S || !pre) return false;
    const burn = e.ph >= 0 && SA.Lumina.PH[e.ph] && SA.Lumina.PH[e.ph].last;
    const spr = pre[(burn ? 'lumina_burn_' : 'lumina_') + [0, 1, 2, 1][Math.floor(R.t * (burn ? 7 : 4)) % 4]]; if (!spr) return false;
    const B = 2, cw = Math.round(S.w / B), ch = Math.round(S.h / B), oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
    const o = oc.getContext('2d', { willReadFrequently: true }); o.imageSmoothingEnabled = true; o.drawImage(spr, 0, 0, cw, ch);
    const d = o.getImageData(0, 0, cw, ch).data, bl = []; let maxD = 1;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const q = (j * cw + i) * 4; if (d[q + 3] < 110) continue;
      const bx = i * B - S.w / 2, by = j * B - S.h * S.py, dist = Math.hypot(bx, by); maxD = Math.max(maxD, dist); bl.push({ bx, by, dist, col: `rgb(${d[q]},${d[q + 1]},${d[q + 2]})` }); }
    const kk = soft() ? 0.6 : 1, keep = [];
    for (const b of bl) { if (kk < 1 && rnd() > kk) continue; const a = Math.atan2(b.by, b.bx) + (rnd() - 0.5) * 0.8, sp = 5 + rnd() * 16;
      b.delay = b.dist / maxD * 0.95 + rnd() * 0.3; b.vx = Math.cos(a) * sp + 4; b.vy = Math.sin(a) * sp - 6 - rnd() * 12; b.life = 1.1 + rnd() * 0.8; keep.push(b); }
    const bob = Math.sin(R.t * (burn ? 3.2 : 1.8)) * 2;
    add(R, { kind: 'scatter', x: e.x, y: e.y + bob, dur: 3.3, blocks: keep, draw(c) {
      for (const b of this.blocks) { const u = this.t - b.delay; let x = b.bx, y = b.by, a = 1, s = 2;
        if (u > 0) { const k = (1 - Math.exp(-2.4 * u)) / 2.4; x += b.vx * k; y += b.vy * k; const f = u / b.life; if (f >= 1) continue; a = 1 - ease(Math.max(0, (f - 0.3) / 0.7)); if (f > 0.65) s = 1;
          if (u < 0.07) { c.globalAlpha = 0.9; c.fillStyle = '#e8eefc'; c.fillRect(Math.round(x), Math.round(y), 2, 2); continue; } }
        c.globalAlpha = a; c.fillStyle = b.col; c.fillRect(Math.round(x), Math.round(y), s, s); }
    } });
    return true;
  };

  // ── 적 피격: 작은 흰 별 + 짧은 불꽃 (0.26초). 약점은 금빛으로 한 단계 크게 ──
  const hit = (R, x, y, weak) => {
    if (soft() && !weak && rnd() < 0.5) return;
    const F = weak ? GOLD : WARM, s = weak ? 1.35 : 1, n = weak ? 8 : 6;
    const sp = Array.from({ length: n }, () => ({ a: rr(0, TAU), v: rr(55, 110), life: rr(0.12, 0.24) }));
    add(R, { kind: 'hit', x, y, dur: 0.26, draw(c) {
      const t = this.t; if (t < 0.09) { const k = 1 - t / 0.09; sparkle(c, 0, 0, (6 * k + 1.5) * s, '#ffffff', F[5]); glow(c, 0, 0, 8 * s, F[5], 0.7 * k); }
      for (const q of sp) { const u = t / q.life; if (u >= 1) continue; const d = q.v * out(Math.min(1, t * 3.2)) * 0.22 * s, d0 = Math.max(0, d - 3);
        line(c, Math.cos(q.a) * d0, Math.sin(q.a) * d0, Math.cos(q.a) * d, Math.sin(q.a) * d, F[u < 0.5 ? 6 : 4], 1 - u); }
    } });
  };

  // ── 폭발 범위 (지뢰 등): 충격 고리가 실제 범위에서 멈추고 안쪽에 불티가 흩어졌다 식는다 ──
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
  const blast = (R, x, y, aoe) => {
    const r = clamp(aoe, 10, 150), F = WARM, k = K();
    const ns = Math.max(6, Math.round(14 * k)), spokes = Array.from({ length: ns }, (_, i) => ({ a: i / ns * TAU + rr(-0.12, 0.12), l: rr(0.55, 1), w: rnd() < 0.3 }));
    const st = r > 60 ? 2 : 1;
    add(R, { kind: 'blast', x, y, dur: 0.55, draw(c) {
      const t = this.t;
      if (t < 0.1) { const kk = 1 - t / 0.1; dDisc(c, 0, 0, r * 0.28 * (0.7 + 0.3 * kk), '#ffffff', 1, 0.4); glow(c, 0, 0, r * 0.7, F[5], 0.7 * kk); }
      if (t < 0.4) { const u = t / 0.4, rd = r * out(u); ringPx(c, 0, 0, rd, F[u < 0.35 ? 6 : 4], 1 - u * u, 0, u < 0.35 ? 2 : 1);
        if (u > 0.08) ringPx(c, 0, 0, rd * 0.72, F[3], (1 - u) * 0.8);
        for (const s of spokes) { const a0 = rd * 0.58, a1 = rd * (0.62 + 0.38 * s.l); line(c, Math.cos(s.a) * a0, Math.sin(s.a) * a0, Math.cos(s.a) * a1, Math.sin(s.a) * a1, F[s.w ? 5 : 3], (1 - u) * 0.9); } }
      if (t < 0.45) { const u = t / 0.45, ri = Math.round(r);
        for (let yy = -ri; yy <= ri; yy += st) for (let xx = -ri; xx <= ri; xx += st) { const d = Math.hypot(xx, yy) / r; if (d > 0.97 || d < 0.12) continue; const h = hash(xx * 53 + 7, yy * 91 + 3);
          if (h < (0.5 - d * 0.35) * (1 - u) * 0.5) px(c, xx, yy, F[h < 0.03 ? 5 : d < 0.55 ? 3 : 2], 0.9 * (1 - u)); } }
    } });
  };

  // ── 전기 사슬: 번개 길을 따라 사슬 고리가 이어지고 마디마다 작은 방전이 튄다 (약 0.6초) ──
  const ellipsePx = (c, x, y, ang, a, b, col, al) => { const n = Math.max(8, Math.round((a + b) * 4)), ca = Math.cos(ang), sa = Math.sin(ang); for (let i = 0; i < n; i++) { const th = i / n * TAU, ex = Math.cos(th) * a, ey = Math.sin(th) * b; px(c, x + ex * ca - ey * sa, y + ex * sa + ey * ca, col, al); } };
  const chain = (R, pts) => {
    if (!pts || pts.length < 2) return;
    const segs = [];
    for (let k = 0; k < pts.length - 1; k++) { const A = pts[k], B = pts[k + 1], len = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(4, Math.round(len / 5.2));
      segs.push({ A, B, len, n, links: Array.from({ length: n }, (_, i) => ({ f: (i + 0.5) / n, j: (rnd() - 0.5) * 2, arc: rnd() })), t0: k * 0.13, ang: Math.atan2(B[1] - A[1], B[0] - A[0]) }); }
    let jt = 0; const A0 = pts[0], o = { kind: 'chain', x: 0, y: 0, dur: (segs.length - 1) * 0.13 + 0.7, step() { if (this.t - jt > 0.045) { jt = this.t; for (const s of segs) for (const l of s.links) { l.j = (rnd() - 0.5) * 2; l.arc = rnd(); } } },
      draw(c) {
        const t = this.t; glow(c, A0[0], A0[1], 9, '#7fe3ff', 0.5 * (1 - clamp((t - 0.4) / 0.4)));
        for (const s of segs) { const u = t - s.t0; if (u < 0) continue; const travel = Math.min(1, u / 0.1), fade = clamp((u - 0.42) / 0.2); if (fade >= 1) continue;
          const dx = Math.cos(s.ang), dy = Math.sin(s.ang), nx = -dy, ny = dx, flick = Math.floor(t * 24) % 2;
          for (let i = 0; i < s.n; i++) { const l = s.links[i]; if (l.f > travel || l.f < fade) continue;
            const amp = Math.sin(l.f * Math.PI) * 2.6, x = s.A[0] + dx * s.len * l.f + nx * l.j * amp, y = s.A[1] + dy * s.len * l.f + ny * l.j * amp;
            const wob = Math.sin(l.f * 9 + t * 30) * 0.35, hot = (i + flick) % 3 === 0, al = 1 - fade * 0.7;
            if (i % 2 === 0) { ellipsePx(c, x, y, s.ang + wob, 2.7, 1.5, hot ? '#dcf8ff' : '#5fd0ff', al); if (hot) px(c, x, y, '#fff', al); }
            else ellipsePx(c, x, y, s.ang + wob, 0.9, 1.6, hot ? '#fff' : '#2f9be0', al);
            if (l.arc > 0.72 && fade < 0.5) { const ax = x + dx * 3.2 + nx * (l.arc - 0.85) * 9, ay = y + dy * 3.2 + ny * (l.arc - 0.85) * 9; px(c, (x + ax) / 2 + nx, (y + ay) / 2 - ny, '#a8ecff', 0.9); px(c, ax, ay, '#fff', 0.9); } }
          if (travel >= 1 && u < 0.22) { const kk = 1 - u / 0.22, Bp = s.B;
            for (let d = -3; d <= 3; d++) { px(c, Bp[0] + d, Bp[1], d === 0 ? '#fff' : '#a8ecff', kk); px(c, Bp[0], Bp[1] + d, d === 0 ? '#fff' : '#a8ecff', kk); }
            for (let q = 0; q < 6; q++) { const a = q * 1.047 + 0.4, rd = 3 + (1 - kk) * 8; px(c, Bp[0] + Math.cos(a) * rd, Bp[1] + Math.sin(a) * rd, '#7fe3ff', kk); } } }
      } };
    add(R, o);
  };

  // ── 중력 우물: 나선팔이 안쪽으로 감기고 고리가 수축, 먼지가 빨려 들어간다. 매 프레임 render.js가 부른다 ──
  const wellMotes = new WeakMap();
  const well = (ctx, R, w) => {
    const r = w.r, max = w.max || 3, t = max - w.t, x0 = w.x, y0 = w.y, core = Math.max(3.5, r * 0.1);
    const F = ease(Math.min(1, t / 0.25)) * Math.min(1, Math.max(0, w.t / 0.3)); if (F <= 0) return;
    let mo = wellMotes.get(w); if (!mo) { mo = Array.from({ length: Math.min(90, Math.round(r * 0.5)) }, () => ({ a: rnd() * TAU, p: rnd(), v: 0.35 + rnd() * 0.3 })); wellMotes.set(w, mo); }
    const k = K(), c = ctx; c.save(); c.imageSmoothingEnabled = false;
    ringPx(c, x0, y0, r, '#7a56d0', 0.5 * F, 2);   // 범위 경계 (점선)
    const steps = Math.round(clamp(r * 0.55, 30, 80) * k);
    for (let arm = 0; arm < 3; arm++) for (let j = 0; j < steps; j++) { const s = j / steps, rad = core + (r - core) * (1 - s) ** 1.3, a = arm * 2.094 + s * 4.2 - t * 2.4, al = (0.12 + 0.55 * s * s) * F;
      px(c, x0 + Math.cos(a) * rad, y0 + Math.sin(a) * rad, s > 0.7 ? '#c9b5ff' : s > 0.35 ? '#8c6ae6' : '#5b3fa8', al); if (s > 0.55) px(c, x0 + Math.cos(a) * rad + 1, y0 + Math.sin(a) * rad, '#c9b5ff', al * 0.6); }
    for (let i = 0; i < 3; i++) { const ph = (t * 0.85 + i / 3) % 1, rd = core + (r - core) * (1 - ph ** 1.8); ringPx(c, x0, y0, rd, ph > 0.6 ? '#b99cff' : '#7a56d0', Math.sin(ph * Math.PI) * 0.75 * F, 3); }
    for (const m of mo) { const ph = (t * m.v * 0.6 + m.p) % 1, rad = core + (r - core) * (1 - ph * ph), a = m.a + ph * 3.2 + t * 0.8; px(c, x0 + Math.cos(a) * rad, y0 + Math.sin(a) * rad, ph > 0.5 ? '#f1eaff' : '#9d86e8', Math.min(1, ph * 2) * 0.9 * F); }
    c.globalAlpha = F; c.fillStyle = '#080412'; c.beginPath(); c.arc(x0, y0, core, 0, TAU); c.fill();
    const pul = 0.7 + 0.3 * Math.sin(t * 7); ringPx(c, x0, y0, core + 0.8, '#d9c8ff', F * pul); ringPx(c, x0, y0, core + 2.2, '#7a56d0', F * 0.5);
    c.restore(); c.globalAlpha = 1;
  };
  const wellEnd = (R, w) => {   // 사건의 지평선: 끝에 바깥으로 되쏘는 고리
    const core = Math.max(3.5, w.r * 0.1);
    add(R, { kind: 'wellend', x: w.x, y: w.y, dur: 0.35, draw(c) { const u = Math.min(1, this.t / 0.3); ringPx(c, 0, 0, core + (w.r - core) * u, '#c08bff', 1 - u); } });
  };

  // ── 아이템 줍기: 등급 색의 작은 반짝임 + 안으로 빨려드는 고리 + 별가루 (0.5초). 일반은 아주 약하게 ──
  const pickup = (R, x, y, tier) => {
    const T = TIER[tier] || TIER.일반, F = T.f, n = Math.max(1, Math.round(T.n * K()));
    const st = Array.from({ length: n }, () => ({ a: rr(0, TAU), v: rr(14, 30), life: rr(0.28, 0.5), s: rr(1.5, 3) }));
    add(R, { kind: 'pick', x, y, dur: 0.5, draw(c) {
      const t = this.t;
      if (t < 0.22) { const u = t / 0.22; ringPx(c, 0, 0, 11 * (1 - out(u)) + 2, F[5], (1 - u * 0.5) * T.a); }
      if (t < 0.18) { const k = 1 - t / 0.18; sparkle(c, 0, 0, (7 * k + 1) * (T.a < 1 ? 0.7 : 1), '#ffffff', F[5], T.a); glow(c, 0, 0, 9, F[4], 0.6 * k * T.a); }
      for (const s of st) { const u = t / s.life; if (u >= 1 || t < 0.06) continue; const d = s.v * out(u); sparkle(c, Math.cos(s.a) * d, Math.sin(s.a) * d - 6 * u, s.s * (1 - u) + 0.5, F[6], F[4], T.a); }
    } });
  };

  // ── 탄 소거: 탄이 줄어들며 자기 색의 작은 점 3개로 흩어진다. 정화 펄스(고리) · 보스 페이즈 전환(쓸어 내림) 공용 ──
  const ghost = (R, b, delay) => {
    const dots = [0, 1, 2].map(() => ({ a: rr(0, TAU), v: rr(14, 36) })), T = tones(b.col || '#ffe9a8'), vx = b.vx || 0, vy = b.vy || 0, r0 = b.r || 3;
    add(R, { kind: 'ghost', x: b.x, y: b.y, dur: delay + 0.45, draw(c) {
      const t = this.t, mx = vx * Math.min(t, delay + 0.2), my = vy * Math.min(t, delay + 0.2);
      if (t < delay) { orb(c, mx, my, r0, b.col || '#ffe9a8', 0.75); return; }
      const u = (t - delay) / 0.45;
      if (u < 0.45) orb(c, mx, my, Math.max(0.8, r0 * (1 - u / 0.45 * 0.8)), b.col || '#ffe9a8', 1 - u * 0.6);
      for (const d of dots) { const dd = d.v * (1 - Math.exp(-5 * (t - delay))) / 5 * 2.2; px(c, mx + Math.cos(d.a) * dd, my + Math.sin(d.a) * dd, u < 0.5 ? T.l : (b.col || '#ffe9a8'), 1 - u); }
    } });
  };
  const purge = (R, x, y, rad, list, col) => {   // 반경 안 탄을 지움 (정화 펄스·베리어·반격 방어막). list = 이미 R.eb에서 뺀 탄
    const base = col || '#7ff0e0';
    let n = 0; for (const b of list) { if (n++ > 120) break; ghost(R, b, Math.hypot(b.x - x, b.y - y) / rad * 0.3); }
    add(R, { kind: 'pulse', x, y, dur: 0.6, draw(c) {
      const t = this.t, w = rad * (1 - (1 - Math.min(1, t / 0.35)) ** 2), f = Math.max(0, 1 - t / 0.6);
      for (let k = 0; k < 2; k++) { const rd = w - k * 5; if (rd < 2) continue; ringPx(c, 0, 0, rd, k ? base : mixc(base, '#ffffff', 0.8), f * (k ? 0.5 : 0.95), 3); }
    } });
  };
  const sweep = (R, x, y, list) => {   // 보스에서 화면 전체로 쓸어 내리며 지움
    let n = 0; for (const b of list) { if (n++ > 160) break; ghost(R, b, Math.hypot(b.x - x, b.y - y) / 190 * 0.7); }
    add(R, { kind: 'sweepw', x, y, dur: 0.8, draw(c) {
      const t = this.t, w = 190 * (1 - (1 - Math.min(1, t / 0.7)) ** 2), f = Math.max(0, 1 - t / 0.8), nn = Math.round(Math.min(w, 140) * 3.2);
      c.globalAlpha = f * 0.5; c.fillStyle = '#fff6d8'; for (let q = 0; q < nn; q += 2) { const a = q / nn * TAU; c.fillRect(Math.round(Math.cos(a) * w), Math.round(Math.sin(a) * w), 1, 1); }
    } });
  };

  // ── 발사 예고 (큰 패턴): 0.33초 전부터 고리가 오므라들고 발사 순간 십자 섬광 ──
  const tele = (R, x, y, col) => {
    const F = 0.33, base = col || '#ffe9a8', lt = mixc(base, '#ffffff', 0.7);
    add(R, { kind: 'tele', x, y, dur: F + 0.14, draw(c) {
      const t = this.t;
      if (t < F) { const u = t / F, r = 19 * (1 - u * u) + 3; ringPx(c, 0, 0, r, u > 0.7 ? lt : base, 0.35 + u * 0.6, 2); glow(c, 0, 0, 7 + u * 4, lt, 0.2 + u * 0.7); }
      else if (t < F + 0.12) { const kk = 1 - (t - F) / 0.12; for (let d = -6; d <= 6; d++) { px(c, d, 0, Math.abs(d) < 2 ? '#fff' : base, kk); px(c, 0, d, Math.abs(d) < 2 ? '#fff' : base, kk); } }
    } });
  };

  // ── 화염 방사: 불길이 흰색→노랑→주황→암적으로 식으며 작아진다 (플레이어 탄 b.flame을 그릴 때 render.js가 부른다) / 화상 불씨 ──
  const flameDot = (ctx, b) => {
    const u = clamp(1 - b.life / 0.2), s = u < 0.35 ? 3 : u < 0.7 ? 2 : 1;
    ctx.globalAlpha = 1 - u * u * 0.9; ctx.fillStyle = FL[Math.min(5, Math.floor(u * 6.5))]; ctx.fillRect(Math.round(b.x - s / 2), Math.round(b.y - s / 2), s, s); ctx.globalAlpha = 1;
  };
  const ember = (R, e) => {
    if (soft() && rnd() < 0.5) return;
    const vx = (rnd() - 0.5) * 6, vy = -(16 + rnd() * 20), x0 = (rnd() - 0.5) * 11, y0 = (rnd() - 0.2) * 6;
    add(R, { kind: 'ember', x: e.x, y: e.y, dur: 0.55, draw(c) {
      const u = this.t / 0.55, x = x0 + vx * this.t, y = y0 + vy * this.t;
      px(c, x, y, FL[Math.min(5, 1 + Math.floor(u * 5))], 1 - u); if (u < 0.45) px(c, x, y + 1, FL[3], 0.5 * (1 - u));
    } });
  };

  // ── 플레이어 피격: 0.09초 하얀 번쩍임 + 기체 도트 파편 + 작은 붉은 충격 고리 (화면 테두리·흔들림은 그대로) ──
  const shardCache = new Map();
  const shipBlocks = (id, w, h) => {
    let bl = shardCache.get(id); if (bl) return bl; bl = [];
    const spr = SA.Render.pre[id] || SA.Render.IMG[id]; if (!spr) return bl;
    const oc = document.createElement('canvas'); oc.width = w * 2; oc.height = h * 2; const o = oc.getContext('2d', { willReadFrequently: true }); o.drawImage(spr, 0, 0, oc.width, oc.height);
    const d = o.getImageData(0, 0, oc.width, oc.height).data;
    for (let j = 0; j < h; j += 3) for (let i = 0; i < w; i += 3) { const q = ((j * 2 + 1) * oc.width + (i * 2 + 1)) * 4; if (d[q + 3] > 130) bl.push({ bx: i + 1.5, by: j + 1.5, col: `rgb(${d[q] + Math.round((255 - d[q]) * 0.5)},${d[q + 1] + Math.round((255 - d[q + 1]) * 0.5)},${d[q + 2] + Math.round((255 - d[q + 2]) * 0.5)})` }); }
    shardCache.set(id, bl); return bl;
  };
  const playerHit = (R, P) => {
    const id = P.ship, s = SA.SHIPS[id], w = s.size[0], h = s.size[1], bl = shipBlocks(id, w, h), spr = SA.Render.pre[id];
    const ox = -s.mount[0] * w, oy = -s.mount[1] * h, ps = [], n = Math.round(16 * K());   // (ox, oy) = 기체 도트 왼쪽 위 모서리 (기체 중심 기준)
    for (let i = 0; i < n && bl.length; i++) { const b = pick(bl), a = Math.atan2(b.by - h / 2, b.bx - w / 2 + (rnd() - 0.5) * 6), v = rr(45, 100); ps.push({ x0: b.bx + ox, y0: b.by + oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, m: rr(0.3, 0.45), col: b.col }); }
    add(R, { kind: 'phit', x: P.x, y: P.y, dur: 0.45, draw(c) {
      const t = this.t;
      if (t < 0.09 && spr) { c.globalAlpha = 0.9 * (1 - t / 0.09); c.drawImage(SA.Render.flashOf(spr), Math.round(ox * 2) / 2, Math.round(oy * 2) / 2, w, h); }
      const k = (1 - Math.exp(-3 * t)) / 3;
      for (const p of ps) { const u = t / p.m; if (u >= 1) continue; c.globalAlpha = 1 - u * u; c.fillStyle = p.col; const sz = u > 0.6 ? 2 : 3; c.fillRect(Math.round(p.x0 + p.vx * k), Math.round(p.y0 + p.vy * k), sz, sz); }
      if (t < 0.24) { const u = t / 0.24, rd = 6 + 16 * (1 - (1 - u) ** 2); ringPx(c, 0, 0, rd, u < 0.4 ? '#ffd2d2' : '#ff8a8a', 0.9 * (1 - u), 3); }
    } });
  };

  return { add, update, draw, kill, scatter, hit, blast, chain, well, wellEnd, pickup, ghost, purge, sweep, tele, flameDot, ember, playerHit, soft };
})();
