// 그리기: 스프라이트·아이템 아이콘·월드·HUD
SA.Render = (() => {
  const U = SA.U, Z = SA.CFG.ZOOM;
  const IMG = {};
  const pre = {};          // 기체 이름 -> 월드 크기에 맞춘 캔버스

  // 큰 원본 도트를 월드 크기 x ZOOM으로 단계적 축소 (색은 그대로, 크기만)
  const shrink = (img, w, h) => {
    let src = img, sw = img.width, sh = img.height;
    while (sw / 2 >= w * 1.5) {
      const c = document.createElement('canvas'); c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
    return c;
  };
  const load = (done) => {
    const list = [['hex', 'assets/hex_hull.png'], ['hexTurret', 'assets/hex_turret.png'], ['swift', 'assets/swift_hull.png'], ['bastion', 'assets/bastion_hull.png'], ['arsenal', 'assets/arsenal_hull.png'], ['flame', 'assets/engine_flame.png'], ['ast_rock', 'assets/m_rock.png'], ['ast_planet', 'assets/m_planetoid.png'], ['ast_shard', 'assets/m_shard.png']];
    for (const id in SA.ENEMIES) if (SA.ENEMIES[id].img) list.push(['en_' + id, SA.ENEMIES[id].img]);
    let left = list.length;
    for (const [k, src] of list) {
      const im = new Image();
      im.onload = im.onerror = () => { IMG[k] = im.naturalWidth ? im : null; if (--left === 0) { prep(); done(); } };
      im.src = src;
    }
  };
  const prep = () => {
    for (const id of ['swift', 'bastion', 'arsenal']) {
      const s = SA.SHIPS[id];
      if (IMG[id]) pre[id] = shrink(IMG[id], s.size[0] * Z, s.size[1] * Z);
    }
    for (const id in SA.ENEMIES) { const d = SA.ENEMIES[id]; if (d.img && IMG['en_' + id]) pre['en_' + id] = shrink(IMG['en_' + id], d.size[0] * Z, d.size[1] * Z); }
    // 엄폐물: 크기 단계별로 미리 축소 (작은 원본은 그대로 확대)
    for (const k of ['rock', 'shard']) if (IMG['ast_' + k]) {
      const im = IMG['ast_' + k]; pre['ast_' + k] = [24, 48, 96].map(d => { const s = d * Z / Math.max(im.width, im.height); return shrink(im, im.width * s, im.height * s); });
    }
  };

  // ── 아이템 아이콘 (16px/칸 도트, 코드로 그림) ──
  const iconCache = {};
  const icon = (id) => {
    if (iconCache[id]) return iconCache[id];
    const d = SA.ITEMS[id], c = document.createElement('canvas');
    c.width = d.w * 16; c.height = d.h * 16;
    const x = c.getContext('2d');
    const p = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const W = c.width, H = c.height, k = d.color;
    const ol = '#0d1018';
    switch (id) {
      case 'scrap': p(ol, 3, 5, 10, 8); p(ol, 5, 3, 6, 2); p('#6d727b', 4, 6, 8, 6); p('#8a8f98', 6, 4, 4, 3); p('#b1b6be', 5, 6, 3, 1); p('#4a4e56', 8, 10, 4, 1); break;
      case 'wire': for (let i = 0; i < 4; i++) { p(ol, 3 + i * 7, 3, 6, 10); p('#c9a65b', 4 + i * 7, 4, 4, 8); p('#f0d58a', 4 + i * 7, 4, 1, 8); } p('#8c6f35', 2, 12, 28, 1); break;
      case 'fuel': p(ol, 4, 2, 8, 13); p('#2f7d55', 5, 4, 6, 10); p('#5bc98a', 5, 4, 2, 10); p('#c9f7dd', 6, 2, 4, 2); p('#9df0c2', 6, 7, 4, 1); break;
      case 'core': p(ol, 3, 2, 10, 28); p('#2b5b8a', 4, 3, 8, 26); p('#5b9bd5', 5, 5, 3, 22); p('#cfe7ff', 6, 12, 4, 8); p('#9cc8ef', 5, 3, 6, 1); break;
      case 'engine': p(ol, 4, 4, 24, 22); p('#7a4a2f', 5, 5, 22, 20); p('#d58a5b', 6, 6, 8, 18); p('#3a3f4a', 20, 8, 6, 14); p('#ffd166', 22, 12, 2, 6); p(ol, 8, 26, 16, 3); p('#59606e', 9, 26, 14, 2); break;
      case 'goldchip': p(ol, 3, 3, 10, 10); p('#b88a1f', 4, 4, 8, 8); p('#ffd166', 5, 5, 6, 6); p('#fff2b8', 5, 5, 2, 2); for (let i = 0; i < 3; i++) { p('#ffd166', 1, 5 + i * 2, 2, 1); p('#ffd166', 13, 5 + i * 2, 2, 1); } break;
      case 'crystal': p(ol, 6, 1, 4, 14); p(ol, 3, 5, 10, 6); p('#6f4bd1', 7, 2, 2, 12); p('#b98cff', 4, 6, 8, 4); p('#e8dbff', 7, 4, 1, 4); break;
      case 'debris': p(ol, 2, 2, 28, 44); p('#5e656e', 3, 3, 26, 42); p('#9aa3ad', 5, 5, 10, 18); p('#7b838c', 16, 24, 11, 18);
        for (const [a, b] of [[6, 6], [24, 6], [6, 40], [24, 40]]) p('#cfd6dd', a, b, 2, 2); p('#3a3f46', 3, 23, 26, 1); break;
      case 'blackbox': p(ol, 2, 3, 12, 11); p('#2a2d36', 3, 4, 10, 9); p('#ff8f3d', 3, 7, 10, 2); p('#ffd0a8', 5, 7, 2, 1); break;
      case 'canister': p(ol, 4, 2, 8, 28); p('#2a8f87', 5, 4, 6, 24); p('#7ff0e0', 6, 6, 2, 20); p('#d8fffa', 6, 2, 4, 2); p('#1b5a55', 5, 14, 6, 2); break;
      case 'repairkit': p(ol, 2, 3, 12, 11); p('#3f8f3a', 3, 4, 10, 9); p('#e9ffe0', 7, 5, 2, 7); p('#e9ffe0', 5, 7, 6, 3); break;
      default: // 설계도
        p(ol, 2, 2, 12, 12); p(id === 'bp_raven' ? '#7a5a12' : '#1f4f8a', 3, 3, 10, 10);
        p(id === 'bp_raven' ? '#ffd166' : '#cfe3ff', 4, 5, 8, 1); p('#cfe3ff', 4, 8, 6, 1); p('#cfe3ff', 4, 10, 7, 1); p('#ffffff', 10, 4, 2, 2);
    }
    iconCache[id] = c;
    return c;
  };
  const iconURL = {};
  const iconSrc = (id) => iconURL[id] || (iconURL[id] = icon(id).toDataURL());

  // ── 별 배경 ──
  let starLayers = null;
  const makeStars = () => {
    starLayers = [0.12, 0.28, 0.5].map((f, li) => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      const x = c.getContext('2d');
      const n = [260, 120, 50][li];
      for (let i = 0; i < n; i++) {
        const s = li === 2 ? 2 : li === 1 ? (Math.random() < 0.3 ? 2 : 1) * 2 : 2;
        x.fillStyle = ['#3b4a6b', '#6d7fa8', '#c8d6ff'][li];
        x.globalAlpha = U.rnd(0.4, 1);
        x.fillRect(Math.floor(Math.random() * 512) * 2, Math.floor(Math.random() * 512) * 2, s, s);
      }
      return { c, f };
    });
  };

  // ── 월드 ──
  const draw = (ctx, R) => {
    const P = R.player, cv = ctx.canvas;
    if (!starLayers) makeStars();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, cv.width, cv.height);
    // 카메라
    const lead = 0.18;
    const tx = P.x + (R.tabOpen ? 150 : (R.mouseWorld.x - P.x) * lead), ty = P.y + (R.mouseWorld.y - P.y) * lead;
    R.cam.x += (tx - R.cam.x) * 0.12; R.cam.y += (ty - R.cam.y) * 0.12;
    const sx = (Math.random() - 0.5) * R.shake, sy = (Math.random() - 0.5) * R.shake;
    const camX = R.cam.x + sx, camY = R.cam.y + sy;
    for (const L of starLayers) {
      const ox = -((camX * Z * L.f) % 1024 + 1024) % 1024, oy = -((camY * Z * L.f) % 1024 + 1024) % 1024;
      for (let x = ox; x < cv.width; x += 1024) for (let y = oy; y < cv.height; y += 1024) ctx.drawImage(L.c, Math.floor(x), Math.floor(y));
    }
    ctx.setTransform(Z, 0, 0, Z, Math.round(cv.width / 2 - camX * Z), Math.round(cv.height / 2 - camY * Z));
    const vx0 = camX - 340, vx1 = camX + 340, vy0 = camY - 200, vy1 = camY + 200;
    const vis = (x, y, r) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

    for (const n of R.nebulas) if (vis(n.x, n.y, n.r)) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue},60%,40%,0.10)`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.29); ctx.fill();
    }
    // 맵 경계 (붉은 선)
    ctx.strokeStyle = 'rgba(255,60,80,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
    ctx.strokeRect(0, 0, R.map.w, R.map.h); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,40,60,0.06)';
    ctx.fillRect(-400, -400, R.map.w + 800, 400); ctx.fillRect(-400, R.map.h, R.map.w + 800, 400);
    ctx.fillRect(-400, 0, 400, R.map.h); ctx.fillRect(R.map.w, 0, 400, R.map.h);

    // 탈출점
    for (const x of R.extracts) if (x.active && vis(x.x, x.y, 80)) {
      const r = SA.CFG.EXTRACT_R, t = R.t;
      ctx.fillStyle = 'rgba(80,255,170,0.07)'; ctx.beginPath(); ctx.arc(x.x, x.y, r, 0, 6.29); ctx.fill();
      ctx.strokeStyle = '#5dffb0'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(x.x, x.y, r, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (x.prog > 0) { ctx.strokeStyle = '#d6ffe9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x.x, x.y, r + 4, -Math.PI / 2, -Math.PI / 2 + x.prog / SA.CFG.EXTRACT_TIME * 6.283); ctx.stroke(); }
      label(ctx, '탈출', x.x, x.y + 3, '#5dffb0', 8);
    }
    // POI
    for (const p of R.pois) if (vis(p.x, p.y, 90)) drawPoi(ctx, R, p);
    // 소행성
    for (const a of R.asteroids) if (!a.hidden && vis(a.x, a.y, a.len || a.r)) drawAst(ctx, a);
    // 떠다니는 아이템
    for (const it of R.items) if (vis(it.x, it.y, 20)) {
      const d = SA.ITEMS[it.id], w = d.w * 8, h = d.h * 8, bob = Math.sin(it.t * 4) * 1;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(it.t * 5);
      ctx.fillStyle = it.full ? '#ff6b6b' : d.color;
      ctx.fillRect(it.x - w / 2 - 2, it.y - h / 2 - 2 + bob, w + 4, h + 4);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon(it.id), it.x - w / 2, it.y - h / 2 + bob, w, h);
    }
    // 적
    for (const e of R.enemies) if (vis(e.x, e.y, e.r + 10)) drawEnemy(ctx, R, e);
    // 플레이어 탄
    for (const b of R.pb) {
      if (!vis(b.x, b.y, 6)) continue;
      ctx.strokeStyle = b.col; ctx.lineWidth = b.w;
      const l = b.missile ? 0.012 : 0.018;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // 잔상
    for (const a of R.after) {
      ctx.globalAlpha = a.life * 1.6 * 0.5;
      if (a.enemy) { ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, 6.29); ctx.fill(); }
      else drawShip(ctx, R, a.x, a.y, P.aim, true);
      ctx.globalAlpha = 1;
    }
    if (!P.dead) drawPlayer(ctx, R);
    // 적 탄 (맨 위: 가장 잘 보여야 한다)
    for (const b of R.eb) {
      if (!vis(b.x, b.y, 8)) continue;
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, 6.29); ctx.fill();
    }
    for (const f of R.fx) { ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.col; ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size); }
    ctx.globalAlpha = 1;
    for (const r of R.rings) { ctx.globalAlpha = Math.max(0, r.life * 3); ctx.strokeStyle = r.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.29); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const t of R.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); label(ctx, t.s, t.x, t.y, t.col, 7); }
    ctx.globalAlpha = 1;
    if (R.extractFx) { R.extractFx -= 1 / 60; ctx.fillStyle = `rgba(200,255,230,${Math.max(0, R.extractFx) * 0.5})`; ctx.fillRect(vx0, vy0, 680, 400); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHUD(ctx, R, camX, camY);
  };

  const label = (ctx, s, x, y, col, size) => {
    ctx.font = `bold ${size}px "Galmuri11", "Malgun Gothic", sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = '#05070d'; ctx.fillText(s, x + 0.6, y + 0.6);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  };

  const drawPoi = (ctx, R, p) => {
    const t = R.t;
    if (p.type === 'wreck') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.seed * 6);
      ctx.fillStyle = '#2a2f3a'; ctx.strokeStyle = '#0b0c10'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(-10, -16); ctx.lineTo(18, -12); ctx.lineTo(30, -2); ctx.lineTo(14, 10); ctx.lineTo(4, 6); ctx.lineTo(-8, 14); ctx.lineTo(-26, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d4554'; ctx.fillRect(-20, -6, 22, 6);
      ctx.fillStyle = p.done ? '#444' : (Math.sin(t * 4) > 0 ? '#ff8f3d' : '#7a3a12'); ctx.fillRect(10, -6, 3, 3);
      ctx.restore();
    } else if (p.type === 'distress') {
      if (p.done) return;
      const pulse = (t * 1.5) % 1;
      ctx.strokeStyle = `rgba(255,209,102,${1 - pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 10 + pulse * 40, 0, 6.29); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      label(ctx, 'SOS', p.x, p.y - 12, '#ffd166', 7);
    } else if (p.type === 'turrets') {
      ctx.strokeStyle = 'rgba(255,90,110,0.25)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, 55, 0, 6.29); ctx.stroke();
    }
    if ((p.type === 'wreck' || p.type === 'distress') && !p.done) {
      const need = p.type === 'wreck' ? 2.5 : 3;
      const near = U.d2(p.x, p.y, R.player.x, R.player.y) < 46 * 46;
      ctx.strokeStyle = near ? '#ffd166' : 'rgba(255,209,102,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (p.prog > 0) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 49, -Math.PI / 2, -Math.PI / 2 + p.prog / need * 6.283); ctx.stroke(); }
      if (near && p.prog === 0) label(ctx, p.type === 'wreck' ? '머물러서 뒤지기' : '머물러서 신호 확인', p.x, p.y + 60, '#ffd166', 7);
    }
  };

  // 엄폐물 도트: 바위·소행성은 회전 없이(빛 방향 유지), 파편은 원래 기울기 근처로만 회전
  const drawAst = (ctx, a) => {
    if (a.kind === 'planet' && IMG.ast_planet) {
      const d = a.r * 2.12; ctx.imageSmoothingEnabled = false; ctx.drawImage(IMG.ast_planet, a.x - d / 2, a.y - d / 2, d, d); return;
    }
    const set = pre['ast_' + a.kind];
    if (set) {
      const big = a.kind === 'shard' ? a.len : a.r * 2.15;
      const c = set[big <= 24 ? 0 : big <= 48 ? 1 : 2], k = big / (Math.max(c.width, c.height) / Z) / Z;
      const w = c.width * k, h = c.height * k;
      ctx.imageSmoothingEnabled = true;
      ctx.save(); ctx.translate(a.x, a.y); if (a.rot) ctx.rotate(a.rot); if (a.flip) ctx.scale(-1, 1);
      ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore(); return;
    }
    ctx.fillStyle = '#3a3634'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.29); ctx.fill();
  };
  const shipPoly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); };

  const drawEnemy = (ctx, R, e) => {
    const P = R.player, a = U.ang(e.x, e.y, P.x, P.y), fl = e.flash > 0;
    const D = SA.ENEMIES[e.type], spr = D && pre['en_' + e.type];
    if (spr) {   // 도트 적기: 기수가 위를 향한 그림을 진행 방향으로 돌린다
      const w = D.size[0], h = D.size[1], pv = D.pivot || [0.5, 0.5];
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate((D.ai === 'turret' ? e.a : e.face) + Math.PI / 2);
      if (fl) ctx.filter = 'brightness(2.6)';
      if (e.inv > 0) ctx.globalAlpha = 0.5;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spr, -w * pv[0], -h * pv[1], w, h);
      ctx.restore();
      if (e.stun > 0) label(ctx, '기절', e.x, e.y - e.r - 12, '#8fd3ff', 6);
      if (e.type === 'raven') { label(ctx, 'RAVEN', e.x, e.y - 20, '#ff4d6d', 6); return; }
      if (e.hp < e.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(e.x - 10, e.y - e.r - 8, 20, 2); ctx.fillStyle = D.faction === 'kingdom' ? '#8fb6ff' : '#ff6b6b'; ctx.fillRect(e.x - 10, e.y - e.r - 8, 20 * e.hp / e.maxHp, 2); }
      return;
    }
    const C = (c) => fl ? '#ffffff' : c;
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.strokeStyle = '#0b0c10'; ctx.lineWidth = 1.5;
    switch (e.type) {
      case 'fighter': ctx.rotate(Math.atan2(e.vy, e.vx) * 0.0 + a);
        ctx.fillStyle = C('#7a2a36'); shipPoly(ctx, [[10, 0], [-7, -8], [-4, 0], [-7, 8]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C('#e05a6a'); ctx.fillRect(-2, -2, 5, 4); ctx.fillStyle = '#ffb347'; ctx.fillRect(-8, -1, 2, 2); break;
      case 'frigate': ctx.rotate(a);
        ctx.fillStyle = C('#5a2230'); shipPoly(ctx, [[22, 0], [8, -14], [-18, -16], [-22, -6], [-22, 6], [-18, 16], [8, 14]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C('#c0485a'); ctx.fillRect(-12, -5, 20, 10); ctx.fillStyle = '#ffb347'; ctx.fillRect(-24, -4, 3, 3); ctx.fillRect(-24, 2, 3, 3); break;
      case 'turret':
        ctx.fillStyle = C('#3a2a30'); shipPoly(ctx, [[13, 0], [9, 9], [0, 13], [-9, 9], [-13, 0], [-9, -9], [0, -13], [9, -9]]); ctx.fill(); ctx.stroke();
        ctx.rotate(e.a); ctx.fillStyle = C('#b34a5d'); ctx.fillRect(-3, -3, 14, 6); ctx.rotate(Math.PI); ctx.fillRect(-3, -3, 14, 6); break;
      case 'corrode': {
        const w = Math.sin(R.t * 5 + e.homeX) * 2;
        ctx.globalAlpha = 0.75; ctx.fillStyle = C('#6a3fb8'); ctx.beginPath(); ctx.arc(0, 0, e.r + w, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#c9a2ff'; ctx.beginPath(); ctx.arc(-3, -2, 4, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; break;
      }
      case 'hunter': ctx.rotate(R.t * 0.8);
        ctx.fillStyle = C('#2a1650'); const pts = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 18 : 30; pts.push([Math.cos(i / 16 * 6.28) * r, Math.sin(i / 16 * 6.28) * r]); }
        shipPoly(ctx, pts); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b98cff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 6.29); ctx.fill(); break;
      case 'raven': ctx.rotate(a + Math.PI / 2);
        if (e.inv > 0) ctx.globalAlpha = 0.5;
        ctx.fillStyle = C('#3a1018'); shipPoly(ctx, [[0, -14], [5, -4], [13, 8], [4, 6], [0, 10], [-4, 6], [-13, 8], [-5, -4]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C('#ff4d6d'); ctx.fillRect(-1, -9, 2, 10); ctx.fillStyle = '#ffd166'; ctx.fillRect(-1, -6, 2, 2); ctx.globalAlpha = 1; break;
      default: // crate
        ctx.fillStyle = C('#5c4a1e'); ctx.fillRect(-9, -8, 18, 16); ctx.strokeRect(-9, -8, 18, 16);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(-9, -2, 18, 3); ctx.fillStyle = '#2b220c'; for (let i = -8; i < 9; i += 4) ctx.fillRect(i, -2, 2, 3);
    }
    ctx.restore();
    if (e.type === 'raven') label(ctx, 'RAVEN', e.x, e.y - 18, '#ff4d6d', 6);
    if (!e.boss && !e.crate && e.hp < e.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(e.x - 10, e.y - e.r - 6, 20, 2); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(e.x - 10, e.y - e.r - 6, 20 * e.hp / e.maxHp, 2); }
  };

  // 기체: 선체는 고정(위), 포탑만 회전. (x,y) = 포탑/판정점
  const drawShip = (ctx, R, x, y, aim, ghost) => {
    const id = R.player.ship, s = SA.SHIPS[id];
    const w = s.size[0], h = s.size[1], ox = x - s.mount[0] * w, oy = y - s.mount[1] * h;
    ctx.imageSmoothingEnabled = false;
    if (id === 'hex' && IMG.hex) ctx.drawImage(IMG.hex, Math.round(ox * 2) / 2, Math.round(oy * 2) / 2, w, h);
    else if (pre[id]) ctx.drawImage(pre[id], Math.round(ox * 2) / 2, Math.round(oy * 2) / 2, w, h);
    else { // 이미지를 못 불러왔을 때 대체 도형
      ctx.fillStyle = '#3b4050'; ctx.strokeStyle = '#0b0c10'; ctx.lineWidth = 1;
      shipPoly(ctx, [[x, y - 17], [x + 8, y - 6], [x + 18, y + 2], [x + 16, y + 12], [x + 6, y + 10], [x, y + 14], [x - 6, y + 10], [x - 16, y + 12], [x - 18, y + 2], [x - 8, y - 6]]);
      ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffb347'; ctx.fillRect(x - 1.5, y - 11, 3, 3);
    }
    if (ghost) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aim + Math.PI / 2);
    if (id === 'hex' && IMG.hexTurret) ctx.drawImage(IMG.hexTurret, -6.5, -6.5, 13, 13);
    else { ctx.fillStyle = '#0d1018'; ctx.fillRect(-2, -10, 4, 12); ctx.fillStyle = '#5a6578'; ctx.fillRect(-1, -9, 2, 10); ctx.fillStyle = '#9fb0c6'; ctx.fillRect(-1, -10, 2, 2);
      ctx.fillStyle = '#0d1018'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 6.29); ctx.fill(); ctx.fillStyle = '#3d4658'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 6.29); ctx.fill(); }
    ctx.restore();
  };

  const drawPlayer = (ctx, R) => {
    const P = R.player;
    const blink = P.invuln > 0 && P.rollT <= 0 && P.shieldT <= 0 && Math.floor(R.t * 20) % 2 === 0;
    // 엔진 불꽃: 8×8 3프레임 도트. 노즐마다 하나씩, 이동·부스트에 따라 길이가 변한다
    const s = SA.SHIPS[P.ship], ox = P.x - s.mount[0] * s.size[0], oy = P.y - s.mount[1] * s.size[1];
    const mv = Math.min(1, Math.hypot(P.vx, P.vy) / P.speed), ly = (0.6 + 0.5 * mv) * (P.skillState === 'boost' ? 1.6 : 1);
    if (IMG.flame && s.flames) {
      const fr = Math.floor(R.t * 12) % 3;
      ctx.imageSmoothingEnabled = false;
      for (const [fx0, fy0] of s.flames) ctx.drawImage(IMG.flame, fr * 8, 0, 8, 8, ox + fx0 - 4, oy + fy0 - 0.5, 8, 8 * ly);
    }
    if (!blink) drawShip(ctx, R, P.x, P.y, P.aim);
    for (const sb of P.subs) {
      ctx.save(); ctx.translate(sb.x, sb.y);
      if (sb.part.id === 'drone') { ctx.fillStyle = '#ffe6a8'; ctx.fillRect(-2.5, -2.5, 5, 5); ctx.fillStyle = '#0d1018'; ctx.fillRect(-1, -1, 2, 2); }
      else { ctx.rotate(sb.ang); ctx.fillStyle = '#0d1018'; ctx.fillRect(-2, -2, 8, 4); ctx.fillStyle = '#c9b27a'; ctx.fillRect(-1, -1, 6, 2); }
      ctx.restore();
    }
    if (P.barrier > 0) { ctx.strokeStyle = `rgba(110,220,255,${0.25 + P.barrier / P.barrierMax * 0.4})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 22, 0, 6.29); ctx.stroke(); }
    if (P.shieldT > 0) { ctx.fillStyle = 'rgba(160,255,240,0.18)'; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 24, 0, 6.29); ctx.fill(); }
    if (P.skillState === 'repair') { ctx.strokeStyle = '#9df07f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, 18 + Math.sin(R.t * 10) * 2, 0, 6.29); ctx.stroke(); }
    // 판정점: 항상 보인다
    ctx.fillStyle = '#062018'; ctx.beginPath(); ctx.arc(P.x, P.y, P.hitR + 2.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#3dffb5'; ctx.beginPath(); ctx.arc(P.x, P.y, P.hitR + 1.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(P.x, P.y, P.hitR, 0, 6.29); ctx.fill();
  };

  // ── HUD (화면 좌표 1280x720) ──
  const T = (ctx, s, x, y, col = '#e6edf3', size = 14, align = 'left', bold = true) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px "Galmuri11", "Malgun Gothic", sans-serif`; ctx.textAlign = align;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  const bar = (ctx, x, y, w, h, v, col, bg = 'rgba(255,255,255,0.08)') => { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * U.clamp(v, 0, 1), h); };
  const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const drawHUD = (ctx, R, camX, camY) => {
    const P = R.player, W = ctx.canvas.width, H = ctx.canvas.height;
    // 비네트: 침식·피격·저체력
    if (R.stage >= 1) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(120,60,220,${[0, 0.18, 0.32, 0.5][R.stage]})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (R.hurtFlash > 0 || P.hp / P.maxHp < 0.3) {
      const a = Math.max(R.hurtFlash, P.hp / P.maxHp < 0.3 ? 0.15 + 0.1 * Math.sin(R.t * 6) : 0);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(255,30,50,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (P.outside) T(ctx, '경계 밖 — 침식 4배', W / 2, H / 2 - 120, '#ff6b7a', 18, 'center');

    // 화면 밖 경고: 탄(빨강 꺾쇠), 적(작은 삼각형), 탈출점(초록 화살표)
    const toScreen = (x, y) => [W / 2 + (x - camX) * Z, H / 2 + (y - camY) * Z];
    const edge = (x, y, pad) => {
      const [sx, sy] = toScreen(x, y);
      const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min((W / 2 - pad) / Math.abs(dx || 1e-6), (H / 2 - pad) / Math.abs(dy || 1e-6));
      let ex = cx + dx * k, ey = cy + dy * k;
      if (ex > W - 270 && ey < 175) ey = 175;
      return { x: ex, y: ey, a: Math.atan2(dy, dx), on: sx > 0 && sx < W && sy > 0 && sy < H };
    };
    const buckets = new Array(32).fill(0);
    for (const b of R.eb) {
      const dx = b.x - camX, dy = b.y - camY;
      if (Math.abs(dx) < 320 && Math.abs(dy) < 180) continue;
      if (Math.abs(dx) > 470 || Math.abs(dy) > 330) continue;
      const tx = P.x - b.x, ty = P.y - b.y, tl = Math.hypot(tx, ty), sp = Math.hypot(b.vx, b.vy);
      if ((b.vx * tx + b.vy * ty) / (tl * sp) < 0.75) continue;
      const k = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 32) % 32; buckets[k]++;
    }
    buckets.forEach((n, k) => {
      if (!n) return;
      const a = k / 32 * Math.PI * 2 - Math.PI + Math.PI / 32;
      const e = edge(camX + Math.cos(a) * 1000, camY + Math.sin(a) * 1000, 18);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
      ctx.globalAlpha = Math.min(1, 0.35 + n * 0.12); ctx.fillStyle = '#ff3d6e';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    for (const en of R.enemies) {
      if (en.crate || en.dead) continue;
      const dd = U.d2(en.x, en.y, P.x, P.y);
      if (dd > (en.boss ? 1200 : 520) ** 2) continue;
      const e = edge(en.x, en.y, 36); if (e.on) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.fillStyle = en.boss ? '#ff4d6d' : 'rgba(255,120,140,0.7)';
      const s = en.boss ? 9 : 5; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    for (const x of R.extracts) {
      if (!x.active) continue;
      const e = edge(x.x, x.y, 54); if (e.on) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.fillStyle = '#5dffb0';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.restore();
      T(ctx, `탈출 ${Math.round(Math.sqrt(U.d2(x.x, x.y, P.x, P.y)) / 10)}m`, e.x - Math.cos(e.a) * 26, e.y - Math.sin(e.a) * 18 + 4, '#5dffb0', 12, 'center');
    }
    for (const p of R.pois) if (p.type === 'distress' && !p.done) {
      const e = edge(p.x, p.y, 54); if (e.on) continue;
      ctx.fillStyle = '#ffd166'; ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
      T(ctx, 'SOS', e.x - Math.cos(e.a) * 22, e.y - Math.sin(e.a) * 16 + 4, '#ffd166', 11, 'center');
    }

    // 침식 게이지 (상단 중앙)
    const gw = 340, gx = W / 2 - gw / 2, gy = 18;
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(gx - 8, gy - 6, gw + 16, 40);
    bar(ctx, gx, gy + 14, gw, 8, R.corr / 100, ['#6d7fa8', '#9a7bdc', '#b06cff', '#d14dff'][R.stage]);
    ctx.fillStyle = '#05070d'; [30, 60, 90].forEach(m => ctx.fillRect(gx + gw * m / 100 - 1, gy + 12, 2, 12));
    const st = SA.CORROSION[R.stage], next = SA.CORROSION[R.stage + 1];
    const eta = next ? (next.at - R.corr) / (st.rate * (SA.Combat.hasPas(P, 'plating') ? 0.8 : 1)) : 0;
    T(ctx, `침식 ${Math.floor(R.corr)}% · ${st.name}`, gx, gy + 8, '#cbb8ff', 13);
    T(ctx, next ? `다음 단계 ${fmtT(eta)}` : '최고 단계', gx + gw, gy + 8, '#8f9bb8', 12, 'right', false);
    T(ctx, fmtT(R.t), W / 2, gy + 50, '#8f9bb8', 12, 'center', false);

    // 메인 목표 한 줄 (좌상단)
    const ql = SA.Quest.label();
    if (ql) { ctx.fillStyle = 'rgba(8,10,18,0.6)'; ctx.font = 'bold 13px "Galmuri11", "Malgun Gothic", sans-serif'; const qw = ctx.measureText('목표  ' + ql).width; ctx.fillRect(14, 14, qw + 20, 26); T(ctx, '목표', 24, 32, '#8f9bb8', 13); T(ctx, ql, 60, 32, '#ffd166', 13); }
    // 보스 체력
    if (R.boss && !R.boss.dead) {
      const b = R.boss, bw = 420, bx = W / 2 - bw / 2, by = 92;
      T(ctx, SA.ENEMIES[b.type].name, W / 2, by - 6, '#ff8fa3', 14, 'center');
      bar(ctx, bx, by, bw, 8, b.hp / b.maxHp, b.type === 'raven' ? '#ff4d6d' : '#8a5cff');
    }
    // 메시지
    R.msgs.forEach((m, i) => { ctx.globalAlpha = Math.min(1, m.life); T(ctx, m.text, W / 2, 140 + i * 24, m.col, 16, 'center'); });
    ctx.globalAlpha = 1;

    // 좌하단: 체력·기술
    const bx = 24, by = H - 44;
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(bx - 8, by - 92, 300, 128);
    T(ctx, `${SA.SHIPS[P.ship].name} · ${SA.PILOTS[P.pilot].name}`, bx, by - 72, '#8f9bb8', 12, 'left', false);
    bar(ctx, bx, by - 6, 280, 12, P.hp / P.maxHp, P.hp / P.maxHp < 0.3 ? '#ff4d6d' : '#5dffb0');
    if (P.barrierMax) bar(ctx, bx, by - 10, 280, 3, P.barrier / P.barrierMax, '#6ee0ff', 'rgba(0,0,0,0)');
    T(ctx, `HP ${Math.ceil(P.hp)}/${P.maxHp}`, bx, by + 22, '#e6edf3', 13);
    const gb = SA.Raid.grazeBonus();
    T(ctx, `스침 ${R.graze} · 드랍 +${Math.round(gb * 100)}%`, bx + 280, by + 22, gb > 0 ? '#fff3a8' : '#8f9bb8', 12, 'right', false);
    const slot = (x, key, name, cd, max, ok) => {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, by - 58, 84, 40);
      if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, by - 58, 84 * (cd / max), 40); }
      ctx.strokeStyle = cd > 0 || !ok ? '#3a4255' : '#8fd3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, by - 57.5, 83, 39);
      T(ctx, key, x + 6, by - 42, ok ? '#8fd3ff' : '#555', 12);
      T(ctx, name, x + 6, by - 25, ok ? '#e6edf3' : '#555', 11, 'left', false);
      if (cd > 0) T(ctx, cd.toFixed(1), x + 78, by - 42, '#fff', 12, 'right');
    };
    P.acts.forEach((a, i) => slot(bx + i * 92, i ? 'E' : 'Q', a ? SA.PARTS[a.part.id].name : '비어 있음', a ? a.cd : 0, a ? SA.PARTS[a.part.id].cd : 1, !!a && SA.Combat.eff(a.part) > 0));
    const pl = SA.PILOTS[P.pilot];
    slot(bx + 184, 'SPACE', SA.PILOTS[P.pilot].title, P.skillCd, pl.cd, !!pl.skill);

    // 우하단: 화물 미니 격자
    const cg = R.cargo, cs = 9, cx = W - 24 - Math.max(cg.w, 2) * cs - 30 - 2 * cs, cy = H - 24 - Math.max(cg.h, 2) * cs;
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(cx - 10, cy - 34, W - cx - 14, H - cy + 20);
    const mini = (g, x0, y0) => {
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x0 + x * cs, y0 + y * cs, cs - 1, cs - 1); }
      for (const it of g.items) { const [w, h] = SA.Grid.dims(it); ctx.fillStyle = SA.ITEMS[it.id].color; ctx.fillRect(x0 + it.x * cs, y0 + it.y * cs, w * cs - 1, h * cs - 1); }
    };
    mini(cg, cx, cy); mini(R.secure, cx + cg.w * cs + 30, cy);
    T(ctx, `[Tab] 화물 ${SA.Grid.used(cg)}/${cg.w * cg.h} · ₵${SA.Grid.value(cg) + SA.Grid.value(R.secure)}`, W - 24, cy - 16, '#e6edf3', 13, 'right');
    T(ctx, '보안', cx + cg.w * cs + 30, cy - 2, '#8f9bb8', 10, 'left', false);
    R.pickLog.forEach((l, i) => { ctx.globalAlpha = Math.min(1, l.life); T(ctx, `${l.text}  ₵${l.val}`, W - 24, cy - 44 - (R.pickLog.length - 1 - i) * 20, l.col, 13, 'right'); });
    ctx.globalAlpha = 1;
    if (R.hint === 'full') {
      const sw = SA.Raid.swapPlan();
      T(ctx, sw ? `[F] ${sw.dropNames} 버리고 ${sw.name} 줍기 (+₵${sw.gain})` : '화물칸이 가득 찼다 — Tab에서 정리하거나 버리기', W / 2, H - 110, sw ? '#ffd166' : '#ffb3b3', 15, 'center');
    }

    // 탈출 진행
    for (const x of R.extracts) if (x.active && x.prog > 0) {
      T(ctx, `탈출 중 ${(SA.CFG.EXTRACT_TIME - x.prog).toFixed(1)}초`, W / 2, H / 2 + 90, '#5dffb0', 20, 'center');
      bar(ctx, W / 2 - 100, H / 2 + 100, 200, 6, x.prog / SA.CFG.EXTRACT_TIME, '#5dffb0');
    }

    drawMinimap(ctx, R, W, H);

    // 조준선
    if (!R.tabOpen && !R.paused) {
      const m = SA.Input.mouse;
      ctx.strokeStyle = '#e6f7ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, 6.29); ctx.stroke();
      ctx.fillStyle = '#e6f7ff'; ctx.fillRect(m.x - 1, m.y - 1, 2, 2);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(m.x + a * 12 - (b ? 1 : 0) - (a < 0 ? 4 : 0), m.y + b * 12 - (a ? 1 : 0) - (b < 0 ? 4 : 0), a ? 4 : 2, b ? 4 : 2);
    }
  };

  const drawMinimap = (ctx, R, W) => {
    const mw = 220, mh = Math.round(mw * R.map.h / R.map.w), mx = W - mw - 18, my = 18, k = mw / R.map.w;
    ctx.fillStyle = 'rgba(8,10,18,0.78)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = 'rgba(255,60,80,0.5)'; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.fillStyle = 'rgba(140,130,120,0.35)';
    for (const a of R.asteroids) ctx.fillRect(mx + a.x * k - 1, my + a.y * k - 1, Math.max(1.5, a.r * k * 2), Math.max(1.5, a.r * k * 2));
    for (const p of R.pois) {
      if (!p.seen) continue;
      const px = mx + p.x * k, py = my + p.y * k;
      ctx.fillStyle = p.done ? '#555' : { wreck: '#ffd166', container: '#ffd166', turrets: '#ff6b7a', patrol: '#ff6b7a', nest: '#ff4d6d', distress: Math.sin(R.t * 6) > 0 ? '#ffd166' : '#7a5a12' }[p.type];
      ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
    for (const x of R.extracts) if (x.active) {
      ctx.strokeStyle = '#5dffb0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx + x.x * k, my + x.y * k, 5, 0, 6.29); ctx.stroke();
    }
    if (R.boss && !R.boss.dead) { ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(mx + R.boss.x * k, my + R.boss.y * k, 3, 0, 6.29); ctx.fill(); }
    const P = R.player;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(mx + (R.cam.x - 320) * k, my + (R.cam.y - 180) * k, 640 * k, 360 * k);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx + P.x * k, my + P.y * k, 2.5, 0, 6.29); ctx.fill();
    T(ctx, R.map.name, mx, my + mh + 18, '#8f9bb8', 11, 'left', false);
  };

  return { load, draw, icon, iconSrc, IMG, pre };
})();
