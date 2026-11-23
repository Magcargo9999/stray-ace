// 출격 로딩 화면: 출격할 때 기체가 별 사이를 날아가는 짧은 장면.
// 별줄기가 점점 빨라지고, 끝에 기체가 화면 위로 빠져나가며 화면이 밝아진다.
// 가볍게: 배경·기체·엔진 빛은 크기가 바뀔 때만 미리 그려 두고, 매 프레임엔 찍기만 한다.
SA.Loading = (() => {
  const $ = (s) => document.querySelector(s);
  let cv, ctx, raf = 0, st = null;
  const imgs = {};
  const img = (src) => { if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; } return imgs[src]; };
  const TIPS = [
    'Tab을 열면 시간이 30%로 느려진다. 정리는 안전할 때.',
    '탄을 스치면 드랍률이 오른다. 맞으면 절반이 날아간다.',
    '보안 칸에 넣은 것은 격추돼도 남는다.',
    '침식이 30%를 넘으면 기체가 무거워진다.',
    'R로 동력원을 교체한다. 다 쓴 동력원은 기지에서 다시 찬다.',
    'X를 길게 누르면 비상탈출. 화물칸은 포기한다.',
    'Shift를 누르고 있으면 천천히 움직인다. 탄 사이를 빠질 때.',
    '부품 내구도가 50% 아래로 내려가면 성능이 떨어진다.',
  ];
  const EXIT = 0.5;   // 기체가 빠져나가는 시간 (초)

  const ensure = () => {
    if (cv) return;
    const w = $('#ldwin');
    w.innerHTML = `<canvas id="ld-cv"></canvas>
      <div class="ld-hud">
        <div class="ld-logo logo sm">STRAY<span>//</span>ACE</div>
        <div class="ld-info"><div class="ld-lab" id="ld-lab"></div><div class="ld-name" id="ld-name"></div>
          <div class="ld-bar"><i id="ld-fill"></i></div><div class="ld-pct" id="ld-pct"></div></div>
        <div class="ld-tip"><b>TIP</b> <span id="ld-tip"></span></div>
      </div>`;
    cv = $('#ld-cv'); ctx = cv.getContext('2d', { alpha: false });
  };

  const off = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  // 해상도는 화면 크기 그대로 (배율 1). 크기가 바뀌면 미리 그린 것들을 다시 만든다
  let bgCache = null;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; if (st) { st.bg = null; st.sprite = null; } };
  const makeBg = (W, H) => {
    const c = off(W, H), x = c.getContext('2d');
    x.fillStyle = '#05070d'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(30,44,80,.35)'); g.addColorStop(1, 'rgba(5,7,13,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    return c;
  };
  let glowC = null;
  const makeGlow = () => {
    const c = off(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(143,211,255,.45)'); g.addColorStop(1, 'rgba(143,211,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  };
  // 기체(선체 + 헥스 포탑)를 표시 크기로 한 번만 줄여 둔다. 원본이 큰 도트(1000px대)라 매 프레임 줄이면 무겁다
  const spriteCache = {};   // 기체·화면 높이별로 한 번만 만든다 (다음 출격부터는 바로 쓴다)
  const makeSprite = (S, H) => {
    const key = S.shipId + ':' + H; if (spriteCache[key]) return spriteCache[key];
    const s = S.s, hull = S.hull; if (!hull || !hull.naturalWidth) return null;
    const k0 = Math.min(H * 0.24, 190) / s.size[1], k = S.shipId === 'hex' ? Math.max(1, Math.round(k0)) : k0;   // 32px 도트는 정수배
    const sw = s.size[0] * k, sh = s.size[1] * k, c = off(sw, sh), x = c.getContext('2d');
    x.imageSmoothingEnabled = S.shipId !== 'hex'; x.imageSmoothingQuality = 'high';
    x.drawImage(hull, 0, 0, c.width, c.height);
    if (S.tur && S.tur.naturalWidth) { x.imageSmoothingEnabled = false; x.drawImage(S.tur, s.mount[0] * sw - 6.5 * k, s.mount[1] * sh - 6.5 * k, 13 * k, 13 * k); }
    return (spriteCache[key] = { c, k, sw: c.width, sh: c.height });
  };

  // 별: z가 클수록 가깝고 빠르고 밝다. 색·밝기별로 묶어 그려서 상태 바꾸는 횟수를 줄인다
  const makeStars = () => {
    const a = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: 0.15 + Math.random() ** 2 * 0.85, c: Math.random() < 0.2 ? '#8fd3ff' : '#c8d6ff' }));
    return a.sort((p, q) => (p.c + Math.round(p.z * 4)).localeCompare(q.c + Math.round(q.z * 4)));
  };

  // opt: { label, name, min(초), ready() → 0..1 (1이면 준비 완료), done() }
  const show = (opt) => {
    ensure();
    const w = $('#ldwin'); w.style.display = 'block'; w.classList.remove('out');
    const prof = SA.profile, shipId = (prof && SA.SHIPS[prof.ship]) ? prof.ship : 'hex', s = SA.SHIPS[shipId];
    const G = (SA.Render && SA.Render.IMG) || {};   // 게임이 이미 불러 둔 이미지를 쓴다
    st = { t: 0, dt: 1 / 60, last: performance.now(), opt, stars: makeStars(), s, shipId,
      hull: G[shipId] || img(s.img), tur: shipId === 'hex' ? (G.hexTurret || (s.turretImg && img(s.turretImg))) : null,
      flame: G.flame || img('assets/engine_flame.png'), glow: glowC || (glowC = makeGlow()), bg: null, sprite: null,
      prog: 0, exitT: -1, lastW: -1, lastPct: -1 };
    size(); addEventListener('resize', size);
    $('#ld-lab').textContent = opt.label || ''; $('#ld-name').innerHTML = opt.name || '';
    $('#ld-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    st.fillEl = $('#ld-fill'); st.pctEl = $('#ld-pct'); st.fillEl.style.width = '0%'; st.pctEl.textContent = '0%';
    st.sprite = makeSprite(st, cv.height); st.bg = (bgCache && bgCache.width === cv.width && bgCache.height === cv.height) ? bgCache : (bgCache = makeBg(cv.width, cv.height));
    draw(st);   // 첫 화면은 바로 그려 둔다 (별은 아직 멈춰 있다)
    cancelAnimationFrame(raf); raf = requestAnimationFrame((now) => { st && (st.last = now); raf = requestAnimationFrame(frame); });
  };

  const frame = (now) => {
    const S = st; if (!S) return;
    const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt; S.dt = dt;
    const o = S.opt, real = o.ready ? Math.min(1, o.ready()) : 1;
    // 진행 막대: 실제 준비와 최소 시간 중 느린 쪽을 따라간다 (바로 띡 끝나지 않게)
    const target = Math.min(real, S.t / (o.min || 1.4));
    S.prog += (target - S.prog) * Math.min(1, dt * 8);
    if (target >= 1 && S.prog > 0.985 && S.exitT < 0) { S.prog = 1; S.exitT = 0; }
    if (S.exitT >= 0) S.exitT += dt;
    // 글자·막대는 값이 바뀔 때만 건드린다
    const wv = Math.round(S.prog * 200) / 2, pv = S.exitT >= 0 ? -2 : Math.floor(S.prog * 100);
    if (wv !== S.lastW) { S.lastW = wv; S.fillEl.style.width = wv + '%'; }
    if (pv !== S.lastPct) { S.lastPct = pv; S.pctEl.textContent = pv < 0 ? '발진' : pv + '%'; }
    draw(S);
    if (S.exitT >= EXIT) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };

  const draw = (S) => {
    const W = cv.width, H = cv.height, t = S.t, dt = S.dt;
    const ex = S.exitT >= 0 ? S.exitT / EXIT : 0;   // 0..1 빠져나가는 정도
    const sp = (1 - (1 - Math.min(1, t / 0.8)) ** 3) * (1 + ex * ex * 3);   // 처음엔 서서히 가속, 끝에 크게 가속
    if (!S.bg) S.bg = (bgCache && bgCache.width === W && bgCache.height === H) ? bgCache : (bgCache = makeBg(W, H));
    ctx.drawImage(S.bg, 0, 0);
    // 별줄기 (아래로 흐른다 → 기체가 위로 날아간다)
    let lastC = '', lastA = -1;
    for (const p of S.stars) {
      const v = p.z * sp * 1.4;   // 화면 높이/초
      p.y += v * dt; if (p.y > 1.05) { p.y -= 1.1; p.x = Math.random(); }
      const len = Math.max(1.5, v * H * 0.06), a = Math.round((0.25 + p.z * 0.7) * 10) / 10;
      if (p.c !== lastC) { ctx.fillStyle = lastC = p.c; }
      if (a !== lastA) { ctx.globalAlpha = lastA = a; }
      ctx.fillRect(Math.round(p.x * W), Math.round(p.y * H - len), p.z > 0.6 ? 2 : 1, Math.round(len));
    }
    ctx.globalAlpha = 1;
    // 기체
    const s = S.s;
    if (!S.sprite) S.sprite = makeSprite(S, H);
    const sp2 = S.sprite;
    if (sp2) {
      const kk = sp2.k, sw = sp2.sw, sh = sp2.sh;
      const cx = W / 2 + Math.sin(t * 1.3) * 8, by = H * 0.5 + Math.sin(t * 2.1) * 5;
      const cy = by - ex * ex * (H * 0.75 + sh);   // 끝: 위로 빠져나간다
      const ox = cx - s.mount[0] * sw, oy = cy - s.mount[1] * sh;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 1.3) * 0.035); ctx.translate(-cx, -cy);
      // 엔진 빛 (미리 그린 원을 크기만 바꿔 찍는다)
      for (const [fx, fy] of s.flames || []) {
        const gx = ox + fx * kk, gy = oy + fy * kk, r = (10 + 6 * Math.sin(t * 20)) * kk * 0.9 * (1 + ex);
        ctx.drawImage(S.glow, gx - r, gy - r, r * 2, r * 2);
      }
      // 엔진 불꽃 (8×8 3프레임 도트, 늘려서 그린다)
      if (S.flame && S.flame.naturalWidth) {
        const fr = Math.floor(t * 12) % 3, ly = (1.3 + 0.25 * Math.sin(t * 17)) * (1 + ex * 1.5);
        ctx.imageSmoothingEnabled = false;
        for (const [fx, fy] of s.flames || []) ctx.drawImage(S.flame, fr * 8, 0, 8, 8, ox + (fx - 4) * kk, oy + (fy - 0.5) * kk, 8 * kk, 8 * kk * ly);
      }
      ctx.drawImage(sp2.c, Math.round(ox), Math.round(oy));
      ctx.restore();
    }
    // 끝: 화면이 살짝 밝아졌다가 게임으로 넘어간다
    if (ex > 0.55) { ctx.fillStyle = `rgba(200,225,255,${((ex - 0.55) / 0.45) * 0.18})`; ctx.fillRect(0, 0, W, H); }
  };

  const finish = () => {
    const S = st; st = null; cancelAnimationFrame(raf); removeEventListener('resize', size);
    const w = $('#ldwin'); w.classList.add('out');
    setTimeout(() => { if (!st) w.style.display = 'none'; w.classList.remove('out'); }, 320);
    if (S && S.opt.done) S.opt.done();
  };

  return { show, active: () => !!st };
})();
