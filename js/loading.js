// 출격 로딩 화면: 출격할 때 기체가 별 사이를 날아가는 짧은 장면.
// 별줄기가 점점 빨라지고, 끝에 기체가 화면 위로 빠져나가며 화면이 밝아진다.
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
    cv = $('#ld-cv'); ctx = cv.getContext('2d');
  };
  const size = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; st && (st.dpr = d); };

  // 별: z가 클수록 가깝고 빠르고 밝다
  const makeStars = () => Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), z: 0.15 + Math.random() ** 2 * 0.85, c: Math.random() < 0.2 ? '#8fd3ff' : '#c8d6ff' }));

  // opt: { label, name, min(초), ready() → 0..1 진행률(1이면 준비 완료), done() }
  const show = (opt) => {
    ensure();
    const w = $('#ldwin'); w.style.display = 'block'; w.style.opacity = 1; w.classList.remove('out');
    const prof = SA.profile, shipId = (prof && SA.SHIPS[prof.ship]) ? prof.ship : 'hex', s = SA.SHIPS[shipId];
    st = { t: 0, last: performance.now(), opt, stars: makeStars(), s, shipId, hull: img(s.img), tur: shipId === 'hex' && s.turretImg ? img(s.turretImg) : null,
      flame: img('assets/engine_flame.png'), prog: 0, exitT: -1, tipI: Math.floor(Math.random() * TIPS.length) };
    size(); addEventListener('resize', size);
    $('#ld-lab').textContent = opt.label || ''; $('#ld-name').innerHTML = opt.name || '';
    $('#ld-tip').textContent = TIPS[st.tipI];
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  };

  const frame = (now) => {
    const S = st; if (!S) return;
    const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt; S.dt = dt;
    const o = S.opt, real = o.ready ? Math.min(1, o.ready()) : 1;
    // 진행 막대: 실제 진행률과 최소 시간 중 느린 쪽을 따라간다 (바로 띡 끝나지 않게)
    const target = Math.min(real, S.t / (o.min || 1.4));
    S.prog += (target - S.prog) * Math.min(1, dt * 8);
    if (target >= 1 && S.prog > 0.985 && S.exitT < 0) { S.prog = 1; S.exitT = 0; }
    if (S.exitT >= 0) S.exitT += dt;
    $('#ld-fill').style.width = (S.prog * 100).toFixed(1) + '%';
    $('#ld-pct').textContent = S.exitT >= 0 ? '발진' : Math.floor(S.prog * 100) + '%';
    draw(S);
    if (S.exitT >= EXIT) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };

  const draw = (S) => {
    const W = cv.width, H = cv.height, d = S.dpr || 1, t = S.t;
    const ex = S.exitT >= 0 ? S.exitT / EXIT : 0;   // 0..1 빠져나가는 정도
    const sp = (1 - (1 - Math.min(1, t / 0.8)) ** 3) * (1 + ex * ex * 3);   // 처음엔 서서히 가속, 끝에 크게 가속
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    // 가운데가 살짝 밝은 배경
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(30,44,80,.35)'); g.addColorStop(1, 'rgba(5,7,13,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 별줄기 (아래로 흐른다 → 기체가 위로 날아간다)
    const dt = S.dt || 1 / 60;
    for (const p of S.stars) {
      const v = p.z * sp * 1.4;   // 화면 높이/초
      p.y += v * dt; if (p.y > 1.05) { p.y -= 1.1; p.x = Math.random(); }
      const x = Math.round(p.x * W), y = p.y * H, len = Math.max(1.5 * d, v * H * 0.06);
      ctx.globalAlpha = 0.25 + p.z * 0.7; ctx.fillStyle = p.c;
      ctx.fillRect(x, y - len, Math.max(1, Math.round(p.z * 2 * d)), len);
    }
    ctx.globalAlpha = 1;
    // 기체
    const s = S.s, hull = S.hull;
    if (hull.complete && hull.naturalWidth) {
      const targetH = Math.min(H * 0.24, 190 * d), k = targetH / s.size[1];
      const kk = S.shipId === 'hex' ? Math.max(1, Math.round(k)) : k;   // 32px 도트는 정수배
      const sw = s.size[0] * kk, sh = s.size[1] * kk;
      const cx = W / 2 + Math.sin(t * 1.3) * 8 * d, by = H * 0.5 + Math.sin(t * 2.1) * 5 * d;
      const cy = by - ex * ex * (H * 0.75 + sh);   // 끝: 위로 빠져나간다
      const ox = cx - s.mount[0] * sw, oy = cy - s.mount[1] * sh;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 1.3) * 0.035); ctx.translate(-cx, -cy);
      // 엔진 빛
      for (const [fx, fy] of s.flames || []) {
        const gx = ox + fx * kk, gy = oy + fy * kk, r = (10 + 6 * Math.sin(t * 20)) * kk * 0.9;
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * (1 + ex));
        gg.addColorStop(0, 'rgba(143,211,255,.45)'); gg.addColorStop(1, 'rgba(143,211,255,0)');
        ctx.fillStyle = gg; ctx.fillRect(gx - r * 2, gy - r * 2, r * 4, r * 4);
      }
      // 엔진 불꽃 (8×8 3프레임 도트, 늘려서 그린다)
      if (S.flame.complete && S.flame.naturalWidth) {
        const fr = Math.floor(t * 12) % 3, ly = (1.3 + 0.25 * Math.sin(t * 17)) * (1 + ex * 1.5);
        ctx.imageSmoothingEnabled = false;
        for (const [fx, fy] of s.flames || []) ctx.drawImage(S.flame, fr * 8, 0, 8, 8, ox + (fx - 4) * kk, oy + (fy - 0.5) * kk, 8 * kk, 8 * kk * ly);
      }
      ctx.imageSmoothingEnabled = S.shipId !== 'hex'; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(hull, ox, oy, sw, sh);
      if (S.tur && S.tur.complete && S.tur.naturalWidth) { ctx.imageSmoothingEnabled = false; ctx.drawImage(S.tur, cx - 6.5 * kk, cy - 6.5 * kk, 13 * kk, 13 * kk); }
      ctx.restore();
    }
    // 끝: 화면이 살짝 밝아졌다가 게임으로 넘어간다
    if (ex > 0.55) { ctx.fillStyle = `rgba(200,225,255,${((ex - 0.55) / 0.45) * 0.18})`; ctx.fillRect(0, 0, W, H); }
  };

  const finish = () => {
    const S = st; st = null; cancelAnimationFrame(raf); removeEventListener('resize', size);
    const w = $('#ldwin'); w.classList.add('out');
    setTimeout(() => { w.style.display = 'none'; w.classList.remove('out'); }, 320);
    if (S && S.opt.done) S.opt.done();
  };

  return { show, active: () => !!st };
})();
