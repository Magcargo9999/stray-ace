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
    const list = [['poi_distress', 'assets/poi_distress.png'], ['hex', 'assets/hex_hull.png'], ['beacon', 'assets/beacon.png'], ['hexTurret', 'assets/hex_turret.png'], ['swift', 'assets/swift_hull.png'], ['ace', SA.SHIPS.ace.img], ['bastion', 'assets/bastion_hull.png'], ['arsenal', 'assets/arsenal_hull.png'], ['flame', 'assets/engine_flame.png'], ['ast_rock', 'assets/m_rock.png'], ['ast_planet', 'assets/m_planetoid.png'], ['ast_shard', 'assets/m_shard.png'], ['box_crate', 'assets/box_crate.png'], ['box_locked', 'assets/box_locked.png'], ['sub_drone', 'assets/sub_drone.png'], ['poi_wreck', 'assets/poi_wreck.png'], ['i_pod', 'assets/i_pod.png']];
    for (const id in SA.ENEMIES) { const d = SA.ENEMIES[id]; if (!d.img) continue; list.push(['en_' + id, d.img]);
      if (d.anim) for (let k = 1; k < d.anim.n; k++) list.push(['en_' + id + '_' + k, d.img.replace(/_0\.png$/, '_' + k + '.png')]); }   // 애니메이션 프레임 xxx_0..n-1.png
    for (const id in SA.ITEMS) if (SA.ITEMS[id].img) list.push(['it_' + id, SA.ITEMS[id].img]);
    for (const id in SA.SPEAKERS) list.push(['pt_' + id, 'assets/portrait_' + id + '.png']);   // 초상화 (없으면 실루엣)
    let left = list.length;
    for (const [k, src] of list) {
      const im = new Image();
      im.onload = im.onerror = () => { IMG[k] = im.naturalWidth ? im : null; if (--left === 0) { prep(); done(); } };
      im.src = src;
    }
  };
  const prep = () => {
    for (const id of ['swift', 'bastion', 'arsenal', 'ace']) {
      const s = SA.SHIPS[id];
      if (IMG[id]) pre[id] = shrink(IMG[id], s.size[0] * Z, s.size[1] * Z);
    }
    for (const id in SA.ENEMIES) { const d = SA.ENEMIES[id]; if (d.img && IMG['en_' + id]) pre['en_' + id] = shrink(IMG['en_' + id], d.size[0] * Z, d.size[1] * Z);
      if (d.anim) for (let k = 1; k < d.anim.n; k++) if (IMG['en_' + id + '_' + k]) pre['en_' + id + '_' + k] = shrink(IMG['en_' + id + '_' + k], d.size[0] * Z, d.size[1] * Z); }
    // 필드 오브젝트 도트 (월드 크기 x ZOOM)
    const fit = (k, w, h) => { if (IMG[k]) pre[k] = shrink(IMG[k], w * Z, h * Z); };
    fit('box_crate', 25, 14); fit('box_locked', 18, 25); fit('sub_drone', 11, 11); fit('poi_wreck', 72, 28); fit('i_pod', 13, 17); fit('poi_distress', 16, 18); fit('beacon', 40, 39);
    // 엄폐물: 크기 단계별로 미리 축소 (작은 원본은 그대로 확대)
    for (const k of ['rock', 'shard']) if (IMG['ast_' + k]) {
      const im = IMG['ast_' + k]; pre['ast_' + k] = [24, 48, 96].map(d => { const s = d * Z / Math.max(im.width, im.height); return shrink(im, im.width * s, im.height * s); });
    }
  };

  // ── 아이템 아이콘 (16px/칸 도트, 코드로 그림) ──
  const iconCache = {};
  const icon = (id) => {
    if (iconCache[id]) return iconCache[id];
    const d = SA.ITEMS[id], c = document.createElement('canvas'), im = d.img && IMG['it_' + id], q = im ? 48 : 16;   // 도트 원본이 있으면 칸당 48px로 크게
    c.width = d.w * q; c.height = d.h * q;
    const x = c.getContext('2d');
    if (im) {   // 칸 안에 비율 유지로 맞춘다 (색·모양은 그대로, 크기만)
      const s = Math.min(c.width / im.width, c.height / im.height) * 0.94, w = Math.round(im.width * s), hh = Math.round(im.height * s);
      x.imageSmoothingEnabled = true; x.drawImage(shrink(im, w, hh), (c.width - w) >> 1, (c.height - hh) >> 1);
      iconCache[id] = c; return c;
    }
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
      case 'prec': p(ol, 2, 2, 12, 12); p('#2b4a66', 3, 3, 10, 10); p('#7fd3ff', 5, 5, 6, 6); p('#0d1018', 7, 7, 2, 2); for (const [a, b] of [[3, 7], [11, 7], [7, 3], [7, 11]]) p('#cfeeff', a, b, 2, 2); break;
      case 'ace': p(ol, 3, 1, 10, 14); p('#5a0f1e', 4, 2, 8, 12); p('#ff4d6d', 5, 3, 6, 9); p('#ffd166', 7, 4, 2, 6); p('#ffd166', 5, 6, 6, 2); p('#ffffff', 7, 4, 1, 1); break;
      case 'blackbox': p(ol, 2, 3, 12, 11); p('#2a2d36', 3, 4, 10, 9); p('#ff8f3d', 3, 7, 10, 2); p('#ffd0a8', 5, 7, 2, 1); break;
      case 'canister': p(ol, 4, 2, 8, 28); p('#2a8f87', 5, 4, 6, 24); p('#7ff0e0', 6, 6, 2, 20); p('#d8fffa', 6, 2, 4, 2); p('#1b5a55', 5, 14, 6, 2); break;
      case 'repairkit': p(ol, 2, 3, 12, 11); p('#3f8f3a', 3, 4, 10, 9); p('#e9ffe0', 7, 5, 2, 7); p('#e9ffe0', 5, 7, 6, 3); break;
      case 'stardata': p(ol, 2, 2, 12, 12); p('#16213a', 3, 3, 10, 10); for (const [a, b] of [[5, 5], [10, 4], [7, 9], [11, 11], [4, 11]]) p('#a8c8ff', a, b, 1, 1); p('#3d5a8a', 5, 6, 3, 1); p('#3d5a8a', 7, 7, 1, 2); p('#3d5a8a', 8, 10, 3, 1); break;
      case 'bb_reward': p(ol, 2, 3, 12, 11); p('#2a2d36', 3, 4, 10, 9); p('#ffb347', 3, 7, 10, 2); p('#fff2d0', 5, 7, 2, 1); p('#ffb347', 11, 4, 2, 2); break;
      case 'alloy': p(ol, 2, 4, 12, 9); p('#4f7f74', 3, 5, 10, 7); p('#9fd8c8', 3, 5, 10, 2); p('#cff3ea', 4, 5, 3, 1); p('#2f5a50', 3, 10, 10, 2); break;
      case 'fcore': p(ol, 3, 2, 10, 28); p('#24496e', 4, 3, 8, 26); p('#6fb7ff', 5, 5, 6, 8); p('#6fb7ff', 5, 19, 6, 8); p('#d58a5b', 4, 14, 8, 4); p('#e8f4ff', 6, 7, 2, 3); break;
      case 'chip': p(ol, 3, 2, 10, 12); p('#4a1f2e', 4, 3, 8, 10); p('#ff8fb0', 5, 4, 6, 2); p('#ff4d6d', 5, 7, 6, 1); p('#ff8fb0', 5, 9, 4, 1); p('#ffe0ea', 5, 11, 2, 1); for (let i = 0; i < 4; i++) { p('#c9b27a', 1, 4 + i * 2, 2, 1); p('#c9b27a', 13, 4 + i * 2, 2, 1); } break;   // 비행 기록 칩 (임시 도트)
      case 'abyss': p(ol, 3, 3, 10, 10); p('#2a1450', 4, 4, 8, 8); p('#6b3fd0', 5, 5, 6, 6); p('#c08bff', 6, 6, 4, 4); p('#f4e9ff', 7, 7, 2, 2); p('#6b3fd0', 7, 1, 2, 2); p('#6b3fd0', 7, 13, 2, 2); p('#6b3fd0', 1, 7, 2, 2); p('#6b3fd0', 13, 7, 2, 2); break;   // 심연 핵 (임시 도트)
      case 'qcircuit': p(ol, 2, 2, 12, 12); p('#8a6a12', 3, 3, 10, 10); p('#ffd166', 4, 4, 8, 8); p('#b98cff', 6, 6, 4, 4); p('#f4e9ff', 7, 6, 1, 2); for (let i = 0; i < 3; i++) { p('#ffd166', 0, 4 + i * 3, 2, 1); p('#ffd166', 14, 4 + i * 3, 2, 1); } break;
      case 'key_box1': case 'key_box2': case 'key_box3': case 'key_zone': {   // 해독키 (임시 도트): 코드 칩 카드
        const gc = d.color; p(ol, 2, 3, 12, 10); p('#1c2333', 3, 4, 10, 8); p(gc, 3, 4, 10, 2); p('#d8b45a', 4, 8, 4, 3); p('#8a6a2a', 5, 9, 2, 1); p(gc, 10, 8, 2, 2); break;
      }
      case 'cell1': case 'cell2': case 'cell3': case 'cell4': {   // 동력원 (임시 도트): 원통 + 등급 색 띠
        const gc = d.color; p(ol, 4, 1, 8, 14); p('#2a3242', 5, 3, 6, 11); p(gc, 5, 5, 6, 2); p(gc, 5, 9, 6, 2); p('#cfd6dd', 6, 1, 4, 2); p('#ffffff', 6, 5, 1, 2); break;
      }
      default:
        if (d.kind === 'part') {   // 부품 완성품 (도트 원본이 없을 때): 등급 테 + 칸 종류 기호
          const sl = SA.PARTS[d.part].slot; p(ol, 1, 1, W - 2, H - 2); p('#151c2b', 2, 2, W - 4, H - 4); p(k, 2, 2, W - 4, 1); p(k, 2, H - 3, W - 4, 1);
          const cx = W >> 1, cy = H >> 1;
          if (sl === 'main') { p('#9fb0c6', 6, cy - 1, W - 14, 3); p('#cfe3ff', W - 9, cy - 2, 3, 5); }
          else if (sl === 'sub') { p('#9fb0c6', cx - 4, cy - 3, 8, 6); p('#cfe3ff', cx + 4, cy - 1, 5, 2); }
          else if (sl === 'act') { p(k, cx - 3, cy - 5, 6, 10); p('#ffffff', cx - 1, cy - 3, 2, 6); }
          else { p('#9fb0c6', cx - 5, cy - 4, 10, 8); p(k, cx - 2, cy - 1, 4, 2); }
          break;
        }
        // 설계도
        p(ol, 2, 2, 12, 12); const tc = { 강화: '#3a7a2a', 행성: '#7a5a12' }[(SA.PARTS[d.recipe] || {}).tier] || '#1f4f8a'; p(tc, 3, 3, 10, 10);
        p(tc === '#7a5a12' ? '#ffd166' : '#cfe3ff', 4, 5, 8, 1); p('#cfe3ff', 4, 8, 6, 1); p('#cfe3ff', 4, 10, 7, 1); p('#ffffff', 10, 4, 2, 2);
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
    const camX = R.cam.x + sx, camY = R.cam.y + sy, Zw = R.zoom || Z;   // 시야 배율 (관측 장비로 Z키 조절)
    for (const L of starLayers) {
      const ox = -((camX * Zw * L.f) % 1024 + 1024) % 1024, oy = -((camY * Zw * L.f) % 1024 + 1024) % 1024;
      for (let x = ox; x < cv.width; x += 1024) for (let y = oy; y < cv.height; y += 1024) ctx.drawImage(L.c, Math.floor(x), Math.floor(y));
    }
    ctx.setTransform(Zw, 0, 0, Zw, Math.round(cv.width / 2 - camX * Zw), Math.round(cv.height / 2 - camY * Zw));
    const hw = cv.width / 2 / Zw + 20, hh0 = cv.height / 2 / Zw + 20;
    const vx0 = camX - hw, vx1 = camX + hw, vy0 = camY - hh0, vy1 = camY + hh0;
    const vis = (x, y, r) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

    for (const n of R.nebulas) if (vis(n.x, n.y, n.r)) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue},60%,40%,0.10)`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.29); ctx.fill();
    }
    if (R.range) {   // 연습장: 철제 격납고 바닥 (임시, 코드 도트)
      ctx.fillStyle = '#121720'; ctx.fillRect(0, 0, R.map.w, R.map.h);
      for (let x = 0; x < R.map.w; x += 64) for (let y = 0; y < R.map.h; y += 64) {
        ctx.fillStyle = (x / 64 + y / 64) % 2 ? '#161c27' : '#141a24'; ctx.fillRect(x + 1, y + 1, 62, 62);
        ctx.fillStyle = '#2a3242'; for (const [a, b] of [[4, 4], [58, 4], [4, 58], [58, 58]]) ctx.fillRect(x + a, y + b, 2, 2);
      }
      ctx.fillStyle = 'rgba(255,209,102,0.25)'; for (let x = 0; x < R.map.w; x += 32) { ctx.fillRect(x, 300, 16, 4); }   // 사격선
      ctx.strokeStyle = '#3a4558'; ctx.lineWidth = 8; ctx.strokeRect(-4, -4, R.map.w + 8, R.map.h + 8);
    } else {
    // 맵 경계 (붉은 선)
    ctx.strokeStyle = 'rgba(255,60,80,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
    ctx.strokeRect(0, 0, R.map.w, R.map.h); ctx.setLineDash([]);
    }
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
    for (const p of R.pois) if (vis(p.x, p.y, p.type === 'zone' ? p.r + 20 : 90)) drawPoi(ctx, R, p);
    // 소행성
    for (const a of R.asteroids) if (!a.hidden && vis(a.x, a.y, a.len || a.r)) drawAst(ctx, a);
    // 궤도 폭격 예고 · 중력 우물
    for (const st of R.strikes) {
      if (st.t > 0) { ctx.strokeStyle = `rgba(255,120,80,${0.4 + 0.4 * Math.sin(R.t * 20)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (0.4 + 0.6 * Math.max(0, 1 - st.t)), 0, 6.29); ctx.stroke(); }
      else { ctx.fillStyle = `rgba(255,220,160,${0.6 + st.t * 3})`; ctx.fillRect(st.x - 3, st.y - 400, 6, 400); }
    }
    for (const w of R.wells) {
      ctx.strokeStyle = 'rgba(185,140,255,0.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const r = ((R.t * 60 + i * 50) % w.r); ctx.beginPath(); ctx.arc(w.x, w.y, w.r - r, 0, 6.29); ctx.stroke(); }
      ctx.fillStyle = '#1a0d33'; ctx.beginPath(); ctx.arc(w.x, w.y, 8, 0, 6.29); ctx.fill(); ctx.strokeStyle = '#b98cff'; ctx.stroke();
    }
    // 떠다니는 아이템
    const NM = R.range ? {} : (R.needMap = R.needMap || SA.Need.map());
    for (const it of R.items) if (vis(it.x, it.y, 20)) {
      const d = SA.ITEMS[it.id], w = d.w * 8, h = d.h * 8, bob = Math.sin(it.t * 4) * 1;
      if (it.glow && !it.full) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(it.t * 6); ctx.fillStyle = SA.TIER_COL[it.glow] || '#5dffb0'; ctx.beginPath(); ctx.arc(it.x, it.y + bob, Math.max(w, h) * 0.8 + 4, 0, 6.29); ctx.fill(); }
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(it.t * 5);
      ctx.fillStyle = it.full ? '#ff6b6b' : d.color;
      ctx.fillRect(it.x - w / 2 - 2, it.y - h / 2 - 2 + bob, w + 4, h + 4);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon(it.id), it.x - w / 2, it.y - h / 2 + bob, w, h);
      const nd = NM[it.id] && NM[it.id].mark;
      if (nd) {   // 필요한 재료: 위에 작은 마름모 (노랑 = 제작 목표, 초록 = 납품 의뢰)
        const mx = it.x, my = it.y - h / 2 - 7 + bob - Math.abs(Math.sin(it.t * 3)) * 2;
        ctx.fillStyle = nd === 'pin' ? '#ffd166' : '#5dffb0'; ctx.strokeStyle = '#0b1120'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mx, my - 4); ctx.lineTo(mx + 4, my); ctx.lineTo(mx, my + 4); ctx.lineTo(mx - 4, my); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // 적
    for (const z of R.zones || []) if (vis(z.x, z.y, z.r)) {   // 은하 장판 (적만 다침)
      const a = Math.min(1, z.t / 0.5) * 0.9;
      ctx.globalAlpha = 0.18 * a; ctx.fillStyle = z.col; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = z.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.85 + 0.15 * Math.sin(R.t * 8 + z.x)), 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const g of R.ghosts || []) { ctx.globalAlpha = 0.35 * g.t; ctx.strokeStyle = '#ff8fb0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(g.x, g.y, 14, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1; }   // 잔상 방패
    for (const p of R.pools || []) if (vis(p.x, p.y, p.r)) {   // 침식 장판
      const a = Math.min(1, p.t / 2) * Math.min(1, (p.max - p.t) * 3);
      ctx.globalAlpha = 0.22 * a; ctx.fillStyle = '#8a5cff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = '#c9a2ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.9 + 0.1 * Math.sin(R.t * 4 + p.x)), 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const e of R.enemies) if (vis(e.x, e.y, e.r + 10)) drawEnemy(ctx, R, e);
    for (const a of R.allies || []) if (!a.dead && vis(a.x, a.y, a.r + 20)) drawAlly(ctx, R, a);
    // 플레이어 탄
    for (const b of R.pb) {
      if (!vis(b.x, b.y, 6)) continue;
      if (b.mine) { ctx.fillStyle = '#0d1018'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6); ctx.fillStyle = Math.sin(R.t * 12) > 0 ? '#ffcf6b' : '#7a5a1e'; ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3); continue; }
      ctx.strokeStyle = b.col; ctx.lineWidth = b.w;
      const l = b.missile ? 0.012 : 0.018;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // 잔상
    for (const a of R.after) {
      ctx.globalAlpha = a.life * 1.6 * 0.5;
      if (a.dot) { ctx.fillStyle = a.dot; ctx.fillRect(a.x - 1.5, a.y - 1.5, 3, 3); }
      else if (a.enemy) { ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, 6.29); ctx.fill(); }
      else drawShip(ctx, R, a.x, a.y, P.aim, true);
      ctx.globalAlpha = 1;
    }
    if (!P.dead) drawPlayer(ctx, R);
    // 적 탄 (맨 위: 가장 잘 보여야 한다)
    for (const b of R.eb) {
      if (!vis(b.x, b.y, 8)) continue;
      ctx.fillStyle = b.frz > 0 ? '#cfe3ff' : b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, 6.29); ctx.fill();
    }
    // 번개·광선 (EMP 부채꼴, 충전 캐논)
    for (const b of R.bolts) {
      ctx.strokeStyle = b.col; ctx.lineWidth = 1.4; ctx.globalAlpha = Math.min(1, b.life * 10);
      ctx.beginPath(); b.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
    for (const b of R.beams) {
      const k = b.life / b.max; ctx.globalAlpha = k;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      if (b.cone) { ctx.fillStyle = 'rgba(143,211,255,0.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.len * (1.2 - k * 0.2), -b.cone, b.cone); ctx.closePath(); ctx.fill(); ctx.strokeStyle = b.col; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = b.col; ctx.fillRect(0, -b.w / 2 * k, b.len, b.w * k); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -b.w / 5 * k, b.len, b.w / 2.5 * k); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 충전 중 표시
    for (const a of P.acts) if (a && a.charge !== undefined) { const c = a.charge / 1.5; ctx.strokeStyle = c >= 1 ? '#ffffff' : '#9ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, 26, -Math.PI / 2, -Math.PI / 2 + c * 6.283); ctx.stroke(); }
    if (P.reflectT > 0) { ctx.strokeStyle = 'rgba(255,208,240,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, 34, 0, 6.29); ctx.stroke(); }
    if (P.odT > 0) { ctx.strokeStyle = `rgba(255,77,109,${0.4 + 0.3 * Math.sin(R.t * 20)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 20, 0, 6.29); ctx.stroke(); }
    for (const f of R.fx) { ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.col; ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size); }
    ctx.globalAlpha = 1;
    for (const r of R.rings) { ctx.globalAlpha = Math.max(0, r.life * 3); ctx.strokeStyle = r.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.29); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const t of R.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); label(ctx, t.s, t.x, t.y, t.col, 7); }
    ctx.globalAlpha = 1;
    if (R.extractFx) { R.extractFx -= 1 / 60; ctx.fillStyle = `rgba(200,255,230,${Math.max(0, R.extractFx) * 0.5})`; ctx.fillRect(vx0, vy0, 680, 400); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!(SA.Rec && SA.Rec.st.clean)) drawHUD(ctx, R, camX, camY);   // 촬영 모드: HUD 숨김
    if (R.tut && SA.Tutorial) SA.Tutorial.draw(ctx, R);   // 튜토리얼 목표·검은 화면 글귀·화이트아웃
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
      if (pre.poi_wreck) { ctx.imageSmoothingEnabled = true; if (p.done) ctx.globalAlpha = 0.6; ctx.drawImage(pre.poi_wreck, -36, -14, 72, 28); ctx.globalAlpha = 1;
        ctx.fillStyle = p.done ? '#444' : (Math.sin(t * 4) > 0 ? '#ff8f3d' : '#7a3a12'); ctx.fillRect(4, -2, 3, 3); ctx.restore(); }
      else {
      ctx.fillStyle = '#2a2f3a'; ctx.strokeStyle = '#0b0c10'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(-10, -16); ctx.lineTo(18, -12); ctx.lineTo(30, -2); ctx.lineTo(14, 10); ctx.lineTo(4, 6); ctx.lineTo(-8, 14); ctx.lineTo(-26, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d4554'; ctx.fillRect(-20, -6, 22, 6);
      ctx.fillStyle = p.done ? '#444' : (Math.sin(t * 4) > 0 ? '#ff8f3d' : '#7a3a12'); ctx.fillRect(10, -6, 3, 3);
      ctx.restore();
      }
    } else if (p.type === 'distress') {
      if (p.done) return;
      const pulse = (t * 1.5) % 1;
      ctx.strokeStyle = `rgba(255,209,102,${1 - pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 10 + pulse * 40, 0, 6.29); ctx.stroke();
      if (pre.poi_distress) { ctx.imageSmoothingEnabled = true; ctx.drawImage(pre.poi_distress, p.x - 8, p.y - 9, 16, 18); }   // 조난 신호 송신기 도트
      else { ctx.fillStyle = '#ffd166'; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
      label(ctx, 'SOS', p.x, p.y - 13, '#ffd166', 7);
    } else if (p.type === 'rescue') {
      if (p.done) return;
      const pulse = (t * 1.2) % 1, tg = SA.RESCUE.targets[p.target];
      ctx.strokeStyle = `rgba(110,231,255,${1 - pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 12 + pulse * 46, 0, 6.29); ctx.stroke();
      if (pre.i_pod) { ctx.imageSmoothingEnabled = true; ctx.drawImage(pre.i_pod, p.x - 6.5, p.y - 8.5, 13, 17); ctx.fillStyle = tg.color; ctx.fillRect(p.x - 1.5, p.y + 9, 3, 3); }
      else {
      ctx.fillStyle = '#12303a'; ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
      ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 7, p.y - 7, 14, 14);
      ctx.fillStyle = tg.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
      label(ctx, '구조 신호', p.x, p.y - 14, '#6ee7ff', 7);
      const near = U.d2(p.x, p.y, R.player.x, R.player.y) < 52 * 52, need = SA.RESCUE.hold;
      ctx.strokeStyle = near ? '#6ee7ff' : 'rgba(110,231,255,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 52, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (p.prog > 0) { ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 55, -Math.PI / 2, -Math.PI / 2 + Math.min(1, p.prog / need) * 6.283); ctx.stroke(); }
      if (near && !p.started) label(ctx, '머물러서 구조 시작', p.x, p.y + 68, '#6ee7ff', 7);
      else if (!near && p.started) label(ctx, '구조 중단 — 돌아와라', p.x, p.y + 68, '#ffb3b3', 7);
    } else if (p.type === 'locked' || p.type === 'secure') {   // 잠긴 상자(도트) · 보안상자(같은 도트 + 청색 보안 테)
      if (p.done) { if (pre.box_locked) { ctx.globalAlpha = 0.35; ctx.drawImage(pre.box_locked, p.x - 9, p.y - 12.5, 18, 25); ctx.globalAlpha = 1; } return; }
      const sec = p.type === 'secure', gc = sec ? '#8fb6ff' : ['#9fb3c8', '#5dffb0', '#ffd166'][p.grade - 1];
      if (sec) { ctx.strokeStyle = `rgba(143,182,255,${0.5 + 0.3 * Math.sin(t * 5)})`; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 12, p.y - 15.5, 24, 31); }
      if (pre.box_locked) { ctx.imageSmoothingEnabled = true; ctx.drawImage(pre.box_locked, p.x - 9, p.y - 12.5, 18, 25); }
      else { ctx.fillStyle = '#3a4558'; ctx.fillRect(p.x - 9, p.y - 12, 18, 24); }
      ctx.fillStyle = gc; ctx.fillRect(p.x - 2, p.y + 1, 4, 4);
      label(ctx, sec ? '보안상자' : `잠긴 상자 · ${['일반', '강화', '행성'][p.grade - 1]}`, p.x, p.y - 18, gc, 6);
      const near = U.d2(p.x, p.y, R.player.x, R.player.y) < SA.BOX.r ** 2, need = sec ? SA.BOX.hackHold : SA.BOX.openHold;
      ctx.strokeStyle = near ? gc : 'rgba(160,180,210,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, SA.BOX.r, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (p.prog > 0) { ctx.strokeStyle = gc; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, SA.BOX.r + 3, -Math.PI / 2, -Math.PI / 2 + Math.min(1, p.prog / need) * 6.283); ctx.stroke(); }
      if (near && !p.prog) label(ctx, sec ? '머물러서 해킹 (보안해독기)' : '머물러서 열기 (보안해독기 + 상자 코드)', p.x, p.y + 30, gc, 6);
    } else if (p.type === 'zone') {   // 보안 구역: 역장 원 + 출입구
      const gx = p.x + Math.cos(p.gate) * p.r, gy = p.y + Math.sin(p.gate) * p.r;
      if (!p.open) {
        ctx.strokeStyle = `rgba(143,182,255,${0.35 + 0.2 * Math.sin(t * 3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.stroke();
        ctx.fillStyle = 'rgba(143,182,255,0.05)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#8fb6ff'; ctx.fillRect(gx - 5, gy - 5, 10, 10); ctx.fillStyle = '#0b1120'; ctx.fillRect(gx - 2, gy - 2, 4, 4);
        label(ctx, '보안 구역 출입구', gx, gy - 12, '#8fb6ff', 6);
        if (p.prog > 0) { ctx.strokeStyle = '#8fb6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, 14, -Math.PI / 2, -Math.PI / 2 + Math.min(1, p.prog / 2) * 6.283); ctx.stroke(); }
      } else { ctx.strokeStyle = 'rgba(143,182,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.stroke(); ctx.setLineDash([]); }
    } else if (p.type === 'signal') {   // 블랙박스 신호 지점
      if (p.done) return;
      const pulse = (t * 1.1) % 1;
      ctx.strokeStyle = `rgba(255,179,71,${1 - pulse})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 14 + pulse * 60, 0, 6.29); ctx.stroke();
      label(ctx, p.label, p.x, p.y - 22, '#ffb347', 7);
    } else if (p.type === 'lost') {   // 회수 잔해
      if (p.done) return;
      const pulse = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(93,255,176,${1 - pulse})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 12 + pulse * 46, 0, 6.29); ctx.stroke();
      if (pre.poi_wreck) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0.4); ctx.drawImage(pre.poi_wreck, -30, -12, 60, 23); ctx.restore(); }
      label(ctx, '내 잔해', p.x, p.y - 22, '#5dffb0', 7);
      const near = U.d2(p.x, p.y, R.player.x, R.player.y) < 46 * 46;
      ctx.strokeStyle = near ? '#5dffb0' : 'rgba(93,255,176,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (p.prog > 0) { ctx.strokeStyle = '#5dffb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 49, -Math.PI / 2, -Math.PI / 2 + Math.min(1, p.prog / SA.RECOVER.hold) * 6.283); ctx.stroke(); }
      if (near && !p.prog) label(ctx, '머물러서 회수', p.x, p.y + 60, '#5dffb0', 7);
    } else if (p.type === 'turrets') {
      ctx.strokeStyle = 'rgba(255,90,110,0.25)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, 55, 0, 6.29); ctx.stroke();
    }
    if (p.type === 'wreck' && !p.done) {   // 난파선: 진행 중 게이지 + 남은 자원 칸
      const final = p.loot && !p.loot.length, need = !p.loot ? SA.WRECK.per : final ? SA.WRECK.last : SA.WRECK.per, cur = p.cur || 0;
      const near = U.d2(p.x, p.y, R.player.x, R.player.y) < 46 * 46;
      ctx.strokeStyle = near ? '#ffd166' : 'rgba(255,209,102,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      if (cur > 0) { ctx.strokeStyle = final ? '#ff9de2' : '#ffd166'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 49, -Math.PI / 2, -Math.PI / 2 + Math.min(1, cur / need) * 6.283); ctx.stroke(); }
      if (p.loot) { const left = p.loot.length + 1; for (let i = 0; i < p.total; i++) { ctx.fillStyle = i < left ? (i === 0 && final ? '#ff9de2' : '#ffd166') : '#3a3424'; ctx.fillRect(p.x - p.total * 4 + i * 8, p.y + 54, 6, 3); } }
      if (near && !cur) label(ctx, p.loot ? (final ? '마지막: 오래 머물면 좋은 것이 나온다' : '머물러서 뒤지기') : '머물러서 뒤지기', p.x, p.y + 66, '#ffd166', 7);
    }
    if (p.type === 'distress' && !p.done) {
      const need = 3;
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

  // 아군: 네임드 윙맨(진영 전투기 도트 + 이름) · 호위 수송선(왕국 프리깃 도트를 크게)
  const drawAlly = (ctx, R, a) => {
    const isW = a.kind === 'wing', N = isW ? SA.NAMED[a.named] : null;
    const id = isW ? N.sprite : 'convoy_ship', D = SA.ENEMIES[id], spr = pre['en_' + id], k = 1;
    const w = D.size[0] * k, h = D.size[1] * k;
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate((a.face || 0) + Math.PI / 2);
    if (a.flash > 0) ctx.filter = 'brightness(2.6)';
    ctx.imageSmoothingEnabled = true;
    if (spr) ctx.drawImage(spr, -w / 2, -h / 2, w, h);
    ctx.restore();
    const col = isW ? N.color : '#8fb6ff';
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 6, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1;
    if (isW && a.cover) { ctx.strokeStyle = '#5dffb0'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(R.player.x, R.player.y); ctx.stroke(); ctx.setLineDash([]); }
    else if (isW && !R.player.dead) { ctx.strokeStyle = col; ctx.globalAlpha = 0.22; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(R.player.x, R.player.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    label(ctx, isW ? N.name : (a.waiting ? '수송선 (대기 중)' : '수송선'), a.x, a.y - a.r - 14, col, 6);
    ctx.fillStyle = '#10202e'; ctx.fillRect(a.x - 14, a.y - a.r - 9, 28, 3); ctx.fillStyle = col; ctx.fillRect(a.x - 14, a.y - a.r - 9, 28 * a.hp / a.maxHp, 3);
  };
  const drawEnemy = (ctx, R, e) => {
    const P = R.player, a = U.ang(e.x, e.y, P.x, P.y), fl = e.flash > 0;
    const D = SA.ENEMIES[e.type];
    let spr = D && pre['en_' + e.type];
    if (spr && D.anim) { const k = Math.floor(R.t * D.anim.fps + e.homeX) % D.anim.n; spr = (k && pre['en_' + e.type + '_' + k]) || spr; }   // 프레임 애니메이션
    if (spr) {   // 도트 적기: 기수가 위를 향한 그림을 진행 방향으로 돌린다
      const w = D.size[0], h = D.size[1], pv = D.pivot || [0.5, 0.5];
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate((D.ai === 'turret' ? e.a : e.face) + Math.PI / 2);
      if (fl) ctx.filter = 'brightness(2.6)';
      if (e.inv > 0) ctx.globalAlpha = 0.5;
      if (e.type === 'corrode') { const pu = 1 + 0.05 * Math.sin(R.t * 5 + e.homeX); ctx.scale(pu, pu); }   // 침식체는 숨 쉬듯 맥동
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spr, -w * pv[0], -h * pv[1], w, h);
      ctx.restore();
      if (e.stun > 0) label(ctx, '기절', e.x, e.y - e.r - 12, '#8fd3ff', 6);
      if (e.type === 'raven') { label(ctx, 'RAVEN', e.x, e.y - 20, '#ff4d6d', 6); return; }
      if (!e.boss && e.hp < e.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(e.x - 10, e.y - e.r - 8, 20, 2); ctx.fillStyle = D.faction === 'kingdom' ? '#8fb6ff' : '#ff6b6b'; ctx.fillRect(e.x - 10, e.y - e.r - 8, 20 * e.hp / e.maxHp, 2); }
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
      default:
        if (e.beaconOf) {   // 귀환 비콘: 도트(assets/beacon.png) + 주황 신호 고리. 도트가 없으면 예전 임시 그림
          const pu = 0.5 + 0.5 * Math.sin(R.t * 6), dot = !!pre.beacon;
          if (dot) { ctx.imageSmoothingEnabled = true; if (fl) ctx.filter = 'brightness(2.4)'; ctx.drawImage(pre.beacon, -20, -20, 40, 39); ctx.filter = 'none'; }
          else {
            ctx.fillStyle = C('#2a3040'); shipPoly(ctx, [[0, -15], [12, -7], [12, 8], [0, 15], [-12, 8], [-12, -7]]); ctx.fill(); ctx.stroke();
            ctx.fillStyle = C('#4a5468'); ctx.fillRect(-6, -9, 12, 18); ctx.fillStyle = `rgba(255,179,71,${0.5 + pu * 0.5})`; ctx.fillRect(-3, -6, 6, 6);
          }
          ctx.strokeStyle = `rgba(255,179,71,${0.6 * (1 - pu)})`; ctx.beginPath(); ctx.arc(0, dot ? -9 : 0, (dot ? 16 : 18) + pu * 14, 0, 6.29); ctx.stroke();   // 도트는 주황 구슬 둘레에 고리
          ctx.restore();
          const dy = dot ? 5 : 0;
          label(ctx, '귀환 비콘', e.x, e.y - 24 - dy, '#ffb347', 6);
          ctx.fillStyle = '#300'; ctx.fillRect(e.x - 14, e.y + 19 + dy, 28, 3); ctx.fillStyle = '#ffb347'; ctx.fillRect(e.x - 14, e.y + 19 + dy, 28 * e.hp / e.maxHp, 3);
          return;
        }
        // crate (부수는 상자 도트)
        if (pre.box_crate) { if (fl) ctx.filter = 'brightness(2.2)'; ctx.drawImage(pre.box_crate, -12.5, -7, 25, 14); ctx.filter = 'none'; break; }
        ctx.fillStyle = C('#5c4a1e'); ctx.fillRect(-9, -8, 18, 16); ctx.strokeRect(-9, -8, 18, 16);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(-9, -2, 18, 3); ctx.fillStyle = '#2b220c'; for (let i = -8; i < 9; i += 4) ctx.fillRect(i, -2, 2, 3);
    }
    ctx.restore();
    if (e.type === 'raven') label(ctx, 'RAVEN', e.x, e.y - 18, '#ff4d6d', 6);
    if (e.stun > 0) label(ctx, '기절', e.x, e.y - e.r - 12, '#8fd3ff', 6);
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
      if (sb.part.id === 'drone') { if (pre.sub_drone) { ctx.rotate(sb.ang + Math.PI / 2); ctx.imageSmoothingEnabled = true; ctx.drawImage(pre.sub_drone, -5.5, -5.5, 11, 11); } else { ctx.fillStyle = '#ffe6a8'; ctx.fillRect(-2.5, -2.5, 5, 5); ctx.fillStyle = '#0d1018'; ctx.fillRect(-1, -1, 2, 2); } }
      else if (sb.part.id === 'sdrone') { ctx.fillStyle = '#8ff0ff'; ctx.fillRect(-3, -3, 6, 6); ctx.fillStyle = '#0d1018'; ctx.fillRect(-1.5, -1.5, 3, 3); ctx.strokeStyle = 'rgba(143,240,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-4.5, -4.5, 9, 9); }
      else { const c = { intercept: '#7fe3ff', chain: '#9fd8ff', hturret: '#ffb347', flamer: '#ff7a3d', mine: '#ffcf6b', gzcharge: '#fff3a8' }[sb.part.id] || '#c9b27a';
        ctx.rotate(sb.ang); const k = SA.SHIPS[P.ship].subScale || 1; if (k !== 1) ctx.scale(k, k);
        ctx.fillStyle = '#0d1018'; ctx.fillRect(-2, -2, 8, 4); ctx.fillStyle = c; ctx.fillRect(-1, -1, 6, 2);
        if (k !== 1) { ctx.fillStyle = '#0d1018'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 6.29); ctx.fill(); ctx.fillStyle = '#3d4658'; ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, 6.29); ctx.fill(); } }   // 큰 포탑: 둥근 받침
      ctx.restore();
    }
    if (P.barrier > 0) { ctx.strokeStyle = `rgba(110,220,255,${0.25 + P.barrier / P.barrierMax * 0.4})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 22, 0, 6.29); ctx.stroke(); }
    if (P.shieldT > 0) { ctx.fillStyle = 'rgba(160,255,240,0.18)'; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 24, 0, 6.29); ctx.fill(); }
    if (P.skillState === 'slip') { ctx.strokeStyle = '#ff4d6d'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, SA.CFG.GRAZE_R * 2, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1; }
    if (P.skillState === 'repair') { ctx.strokeStyle = '#9df07f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, 18 + Math.sin(R.t * 10) * 2, 0, 6.29); ctx.stroke(); }
    if (P.slow) { ctx.strokeStyle = 'rgba(61,255,181,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, P.hitR + 6 + Math.sin(R.t * 8), 0, 6.29); ctx.stroke(); }   // Shift 저속: 판정점 강조
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
    const P = R.player, W = ctx.canvas.width, H = ctx.canvas.height, Zw = R.zoom || Z;
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
    const toScreen = (x, y) => [W / 2 + (x - camX) * Zw, H / 2 + (y - camY) * Zw];
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
      if (Math.abs(dx) < W / 2 / Zw && Math.abs(dy) < H / 2 / Zw) continue;
      if (Math.abs(dx) > W / 2 / Zw + 150 || Math.abs(dy) > H / 2 / Zw + 150) continue;
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
      if (x.beacon && !x.beacon.dead && !x.active) {   // 귀환 비콘: 주황 화살표
        const e = edge(x.x, x.y, 54); if (e.on) continue;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.fillStyle = '#ffb347';
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.restore();
        T(ctx, `비콘 ${Math.round(Math.sqrt(U.d2(x.x, x.y, P.x, P.y)) / 10)}m`, e.x - Math.cos(e.a) * 26, e.y - Math.sin(e.a) * 18 + 4, '#ffb347', 12, 'center');
        continue;
      }
      if (!x.active) continue;
      const e = edge(x.x, x.y, 54); if (e.on) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.fillStyle = '#5dffb0';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.restore();
      T(ctx, `탈출 ${Math.round(Math.sqrt(U.d2(x.x, x.y, P.x, P.y)) / 10)}m`, e.x - Math.cos(e.a) * 26, e.y - Math.sin(e.a) * 18 + 4, '#5dffb0', 12, 'center');
    }
    if (R.ravenRematch && R.boss === null) for (const p of R.pois) if (p.type === 'duel' && R.enemies.some(e => e.type === 'raven')) {
      const e = edge(p.x, p.y, 54); if (e.on) continue;
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
      T(ctx, '레이븐', e.x - Math.cos(e.a) * 26, e.y - Math.sin(e.a) * 16 + 4, '#ff4d6d', 11, 'center');
    }
    for (const p of R.pois) if (p.type === 'rescue' && !p.done) {
      const e = edge(p.x, p.y, 54); if (e.on) continue;
      ctx.fillStyle = '#6ee7ff'; ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
      T(ctx, '구조', e.x - Math.cos(e.a) * 22, e.y - Math.sin(e.a) * 16 + 4, '#6ee7ff', 11, 'center');
    }
    for (const p of R.pois) if (p.type === 'distress' && !p.done) {
      const e = edge(p.x, p.y, 54); if (e.on) continue;
      ctx.fillStyle = '#ffd166'; ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
      T(ctx, 'SOS', e.x - Math.cos(e.a) * 22, e.y - Math.sin(e.a) * 16 + 4, '#ffd166', 11, 'center');
    }

    if (!R.range && !R.tut) {   // 연습장·튜토리얼에서는 침식·목표 표시를 숨긴다
    // 침식 게이지 (상단 중앙)
    const gw = 340, gx = W / 2 - gw / 2, gy = 18;
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(gx - 8, gy - 6, gw + 16, 40);
    bar(ctx, gx, gy + 14, gw, 8, R.corr / 100, ['#6d7fa8', '#9a7bdc', '#b06cff', '#d14dff'][R.stage]);
    ctx.fillStyle = '#05070d'; [30, 60, 90].forEach(m => ctx.fillRect(gx + gw * m / 100 - 1, gy + 12, 2, 12));
    const st = SA.CORROSION[R.stage], next = SA.CORROSION[R.stage + 1];
    const eta = next ? (next.at - R.corr) / (st.rate * (1 - Math.min(0.7, SA.Combat.pv(P, 'plating', 0)))) : 0;
    T(ctx, `침식 ${Math.floor(R.corr)}% · ${st.name}`, gx, gy + 8, '#cbb8ff', 13);
    T(ctx, next ? `다음 단계 ${fmtT(eta)}` : '최고 단계', gx + gw, gy + 8, '#8f9bb8', 12, 'right', false);
    T(ctx, fmtT(R.t), W / 2, gy + 50, '#8f9bb8', 12, 'center', false);

    // 메인 목표 한 줄 (좌상단)
    const ql = SA.Quest.label();
    if (ql) { ctx.fillStyle = 'rgba(8,10,18,0.6)'; ctx.font = 'bold 13px "Galmuri11", "Malgun Gothic", sans-serif'; const qw = ctx.measureText('목표  ' + ql).width; ctx.fillRect(14, 14, qw + 20, 26); T(ctx, '목표', 24, 32, '#8f9bb8', 13); T(ctx, ql, 60, 32, '#ffd166', 13); }
    const pl = R.range || R.tut ? null : SA.Need.pinLine();   // 고정한 제작 목표 (보유 = 창고 + 화물칸 + 보안 칸)
    if (pl) { const t = `${pl[0]} — ${pl[2] ? '재료 다 모았다' : pl[1]}`; ctx.font = '12px "Galmuri11", "Malgun Gothic", sans-serif'; const pw = ctx.measureText('제작  ' + t).width; ctx.fillStyle = 'rgba(8,10,18,0.6)'; ctx.fillRect(14, 42, pw + 20, 20); T(ctx, '제작', 24, 56, '#8f9bb8', 12); T(ctx, t, 56, 56, pl[2] ? '#5dffb0' : '#ffd166', 12); }
    }
    // 보스 체력
    if (R.boss && !R.boss.dead) {
      const b = R.boss, bw = 420, bx = W / 2 - bw / 2, by = 92;
      T(ctx, SA.ENEMIES[b.type].name, W / 2, by - 6, '#ff8fa3', 14, 'center');
      bar(ctx, bx, by, bw, 8, b.hp / b.maxHp, b.type === 'raven' ? '#ff4d6d' : '#8a5cff');
    }
    // 윙맨·수송선 상태 (왼쪽, 목표 줄 아래)
    if (R.allies && R.allies.length) {
      let y = pl ? 76 : 56;
      for (const a of R.allies) {
        const isW = a.kind === 'wing', N = isW && SA.NAMED[a.named], col = isW ? N.color : '#8fb6ff';
        T(ctx, a.dead ? `${isW ? N.name : '수송선'} — 격추` : isW ? `${N.name}${a.cover ? ' · 엄호 중' : a.retreat ? ' · 후퇴 중' : ''}` : `수송선${a.arrived ? ' · 도착' : a.waiting ? ' · 대기 (가까이 와라)' : ''}`, 24, y, a.dead ? '#777' : col, 12);
        if (!a.dead) bar(ctx, 24, y + 6, 160, 5, a.hp / a.maxHp, col);
        y += 26;
      }
      if (R.wing && !R.wing.dead) T(ctx, `G: 엄호 ${R.wing.cover ? '끄기 (다시 자유롭게 싸운다)' : '켜기 (곁으로 불러 받는 피해 절반을 대신 맞는다)'}`, 24, y, '#9aa7bd', 11);
      if (R.wingFail) T(ctx, '의뢰 실패 — 이번 판은 진행되지 않는다', 24, y + 18, '#ffb3b3', 11);
    }
    if (R.range) {   // 연습장 DPS (최근 5초)
      const sum = (R.dmgLog || []).reduce((n, d) => n + d[1], 0), span = Math.min(5, Math.max(1, R.t));
      T(ctx, `초당 피해 ${Math.round(sum / span)}  ·  최근 5초 누적 ${Math.round(sum)}`, W / 2, 128, '#ffd166', 16, 'center');
    }
    // 네임드 대사창: 하단 가운데, 초상화 + 이름 + 대사 (원화 전에는 실루엣)
    if (R.dialog && R.dialog.length) {
      const d = R.dialog[0], S = SA.SPEAKERS[d.who] || { name: d.who, title: '', color: '#cfe3ff' };
      const bw = 600, bh = 74, bx0 = (W - bw) / 2, by0 = H - 214, a = Math.min(1, d.life * 3, (d.t || 0) * 6);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(6,9,16,0.88)'; ctx.fillRect(bx0, by0, bw, bh); ctx.strokeStyle = S.color; ctx.lineWidth = 1; ctx.strokeRect(bx0 + 0.5, by0 + 0.5, bw - 1, bh - 1);
      const pim = IMG['pt_' + d.who], ps = bh - 12;
      ctx.fillStyle = '#0d1424'; ctx.fillRect(bx0 + 6, by0 + 6, ps, ps);
      if (pim) { ctx.imageSmoothingEnabled = true; const k2 = Math.max(ps / pim.width, ps / pim.height); ctx.save(); ctx.beginPath(); ctx.rect(bx0 + 6, by0 + 6, ps, ps); ctx.clip(); ctx.drawImage(pim, bx0 + 6 + (ps - pim.width * k2) / 2, by0 + 6, pim.width * k2, pim.height * k2); ctx.restore(); }
      else {   // 실루엣
        ctx.fillStyle = S.color; ctx.globalAlpha = a * 0.55;
        ctx.beginPath(); ctx.arc(bx0 + 6 + ps / 2, by0 + 6 + ps * 0.38, ps * 0.2, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx0 + 6 + ps / 2, by0 + 6 + ps * 0.95, ps * 0.36, ps * 0.34, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = a;
      }
      ctx.strokeStyle = S.color; ctx.strokeRect(bx0 + 6.5, by0 + 6.5, ps - 1, ps - 1);
      T(ctx, S.name, bx0 + ps + 18, by0 + 24, S.color, 14);
      T(ctx, S.title, bx0 + ps + 24 + ctx.measureText(S.name).width, by0 + 24, '#6b7385', 11, 'left', false);
      // 줄바꿈 (가로 폭에 맞춰)
      ctx.font = '13px "Galmuri11", "Malgun Gothic", sans-serif';
      const maxW = bw - ps - 34, words = d.text.split(' '), lines = [''];
      for (const w of words) { const t2 = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (ctx.measureText(t2).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t2; }
      lines.slice(0, 2).forEach((l, i) => T(ctx, l, bx0 + ps + 18, by0 + 45 + i * 18, '#e6edf3', 13, 'left', false));
      if (R.dialog.length > 1) T(ctx, `▸ ${R.dialog.length - 1}`, bx0 + bw - 8, by0 + bh - 8, '#6b7385', 10, 'right', false);
      ctx.globalAlpha = 1;
    }
    // 메시지
    R.msgs.forEach((m, i) => { ctx.globalAlpha = Math.min(1, m.life); T(ctx, m.text, W / 2, 140 + i * 24, m.col, 16, 'center'); });
    ctx.globalAlpha = 1;

    // 좌하단: 체력·기술
    const bx = 24, by = H - 44;
    // 주무기·동력원 (좌하단 위)
    {
      const y0 = by - 150;
      ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(bx - 8, y0, 300, 54);
      P.mains.forEach((m, i) => {
        const on = i === P.wi, nm = m ? SA.partName(m, true) : '—', tc = m && m.lv ? SA.TIER_COL[SA.partTier(m)] : '#e6edf3';
        T(ctx, `${i + 1}`, bx + i * 142, y0 + 17, on ? '#8fd3ff' : '#4a5468', 12);
        T(ctx, nm, bx + 14 + i * 142, y0 + 17, on ? tc : '#6b7385', 12, 'left', on);
      });
      if (P.swapT > 0) T(ctx, '교체 중', bx + 280, y0 + 17, '#ffd166', 11, 'right', false);
      const cd = P.cell && SA.ITEMS[P.cell.id], frac = cd ? P.cell.e / cd.cap : 0;
      const spare = [...R.cargo.items, ...R.secure.items].filter(it => SA.ITEMS[it.id].kind === 'cell' && (it.ch === undefined || it.ch > 0.01)).length;
      if (P.reloadT > 0) { bar(ctx, bx, y0 + 26, 280, 8, 1 - P.reloadT / SA.ENERGY.reload, '#ffd166'); T(ctx, '동력원 교체 중…', bx, y0 + 49, '#ffd166', 11, 'left', false); }
      else if (frac > 0) { bar(ctx, bx, y0 + 26, 280, 8, frac, cd.color); T(ctx, `${cd.name} ${Math.ceil(frac * 100)}%`, bx, y0 + 49, frac < 0.2 ? '#ffb3b3' : '#cfe3ff', 11, 'left', false); }
      else { bar(ctx, bx, y0 + 26, 280, 8, P.emer / SA.ENERGY.emerMax, '#ff8f3d'); T(ctx, cd ? '동력원 방전 — 비상 발전' : '동력원 없음 — 비상 발전', bx, y0 + 49, '#ff8f3d', 11, 'left', false); }
      T(ctx, `예비 ${spare} · R 교체`, bx + 280, y0 + 49, spare ? '#8f9bb8' : '#ff8f3d', 11, 'right', false);
    }
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(bx - 8, by - 92, 300, 128);
    T(ctx, `${SA.SHIPS[P.ship].name} · ${R.tut ? '단장' : SA.PILOTS[P.pilot].name}`, bx, by - 72, '#8f9bb8', 12, 'left', false);
    bar(ctx, bx, by - 6, 280, 12, P.hp / P.maxHp, P.hp / P.maxHp < 0.3 ? '#ff4d6d' : '#5dffb0');
    if (P.barrierMax) bar(ctx, bx, by - 10, 280, 3, P.barrier / P.barrierMax, '#6ee0ff', 'rgba(0,0,0,0)');
    T(ctx, `HP ${Math.ceil(P.hp)}/${P.maxHp}`, bx, by + 22, '#e6edf3', 13);
    const gb = SA.Raid.grazeBonus(), gd = SA.Raid.grazeDmg();
    T(ctx, `스침 ${R.graze} · 드랍 +${Math.round(gb * 100)}% · 피해 +${Math.round(gd * 100)}%`, bx + 280, by + 22, gb > 0 ? '#fff3a8' : '#8f9bb8', 12, 'right', false);
    if (P.hasRvAwk === undefined) P.hasRvAwk = [...P.mains, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas, P.obs].some(p => p && p.awk === 'raven');
    if (P.hasRvAwk) T(ctx, `레이븐 각성 +${Math.min(10, P.rvStk || 0) * 3}%`, bx + 280, by - 72, '#ff8fb0', 11, 'right', false);
    const slot = (x, key, name, cd, max, ok, ch) => {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, by - 58, 84, 40);
      if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, by - 58, 84 * (cd / max), 40); }
      ctx.strokeStyle = cd > 0 || !ok ? '#3a4255' : '#8fd3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, by - 57.5, 83, 39);
      T(ctx, key, x + 6, by - 42, ok ? '#8fd3ff' : '#555', 12);
      T(ctx, name, x + 6, by - 25, ok ? '#e6edf3' : '#555', 11, 'left', false);
      if (cd > 0) T(ctx, cd.toFixed(1), x + 78, by - 42, '#fff', 12, 'right');
      if (ch !== undefined) T(ctx, '●'.repeat(ch) + '○'.repeat(2 - ch), x + 78, by - 25, '#ffd166', 10, 'right', false);   // 2회 충전 개조
    };
    P.acts.forEach((a, i) => slot(bx + i * 92, i ? 'E' : 'Q', a ? SA.PARTS[a.part.id].name : '비어 있음', a ? (SA.modsOf(a.part).includes('a_two') && a.ch > 0 ? 0 : a.cd) : 0, a ? SA.Combat.actCd(P, a) : 1, !!a && SA.Combat.eff(a.part) > 0, a && SA.modsOf(a.part).includes('a_two') ? (a.ch === undefined ? 2 : a.ch) : undefined));
    const pl = SA.PILOTS[P.pilot];
    slot(bx + 184, 'SPACE', R.tut ? '배럴 롤' : SA.PILOTS[P.pilot].title, P.skillCd, pl.cd, !!pl.skill);

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

    // 비상탈출: 길게 누르는 중 / 버티는 중
    if (R.emT > 0) { T(ctx, `비상탈출 ${R.emT.toFixed(1)}초 — 버텨라`, W / 2, H / 2 + 90, '#ff8f3d', 20, 'center'); bar(ctx, W / 2 - 100, H / 2 + 100, 200, 6, 1 - R.emT / SA.EXIT.emTime, '#ff8f3d'); }
    else if (R.emHold > 0) { T(ctx, '비상탈출 준비 — 화물칸을 버린다', W / 2, H / 2 + 90, '#ff8f3d', 16, 'center'); bar(ctx, W / 2 - 100, H / 2 + 100, 200, 6, R.emHold / SA.EXIT.emHold, '#ff8f3d'); }
    else if (!R.emUsed && R.t < 20 && !R.range && !R.tut) T(ctx, 'X 길게: 비상탈출 (화물칸 포기)', W / 2, H - 80, '#8f9bb8', 11, 'center', false);
    // 탈출 진행
    for (const x of R.extracts) if (x.active && x.prog > 0) {
      T(ctx, `탈출 중 ${(SA.CFG.EXTRACT_TIME - x.prog).toFixed(1)}초`, W / 2, H / 2 + 90, '#5dffb0', 20, 'center');
      bar(ctx, W / 2 - 100, H / 2 + 100, 200, 6, x.prog / SA.CFG.EXTRACT_TIME, '#5dffb0');
    }

    drawMinimap(ctx, R, W, H);

    // 조준선
    if (!R.tabOpen && !R.paused) {
      const m = SA.Input.mouse, sn = SA.Combat.hasPas(R.player, 'sensor'), cr = sn ? 6 : 9, ct = sn ? 9 : 12, cc = sn ? '#ff4d6d' : '#e6f7ff';   // 조준 센서: 붉고 좁은 조준선
      ctx.strokeStyle = cc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, cr, 0, 6.29); ctx.stroke();
      // 탄 퍼짐 원: 우클릭 조준하면 좁아진다. 저격총은 정조준 충전이 원으로 찬다
      const P = R.player, md = P.main && SA.PARTS[P.main.id];
      if (md) {
        const dist = Math.hypot(m.x - W / 2, m.y - H / 2), spr = md.spread * (sn ? 0.4 : 1) * (P.aiming ? SA.ENERGY.aim : SA.ENERGY.hip);
        const rr = Math.max(cr + 3, Math.min(160, Math.tan(spr) * dist));
        ctx.globalAlpha = P.aiming ? 0.7 : 0.3; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1;
        if (md.sniper && P.aimC > 0) { const f = P.aimC / (P.aimMax || SA.ENERGY.sniperCharge); ctx.strokeStyle = f >= 1 ? '#ffe08a' : '#cfe3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, cr + 6, -Math.PI / 2, -Math.PI / 2 + f * 6.283); ctx.stroke(); }
      }
      ctx.fillStyle = cc; ctx.fillRect(m.x - 1, m.y - 1, 2, 2);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(m.x + a * ct - (b ? 1 : 0) - (a < 0 ? 4 : 0), m.y + b * ct - (a ? 1 : 0) - (b < 0 ? 4 : 0), a ? 4 : 2, b ? 4 : 2);
    }
  };

  // 지도: 미니맵(우상단)과 큰 지도(M)가 같이 쓴다. 안 가 본 곳은 안개, 적은 레이더 범위 안만
  const drawMap = (ctx, R, mx, my, mw, big) => {
    const mh = Math.round(mw * R.map.h / R.map.w), k = mw / R.map.w, P = R.player;
    ctx.fillStyle = big ? 'rgba(6,8,14,0.94)' : 'rgba(8,10,18,0.78)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = 'rgba(255,60,80,0.5)'; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.save(); ctx.beginPath(); ctx.rect(mx - 4, my - 4, mw + 8, mh + 8); ctx.clip();
    const fog = (x, y) => R.fog && SA.Raid.fogged(R, x, y);
    ctx.fillStyle = 'rgba(140,130,120,0.35)';
    for (const a of R.asteroids) if (!fog(a.x, a.y)) ctx.fillRect(mx + a.x * k - 1, my + a.y * k - 1, Math.max(1.5, a.r * k * 2), Math.max(1.5, a.r * k * 2));
    // 안개: 안 가 본 칸을 어둡게
    if (R.fog) { const c = SA.OBS.fogCell * k; ctx.fillStyle = 'rgba(4,6,12,0.82)';
      for (let j = 0; j < R.fogH; j++) for (let i = 0; i < R.fogW; i++) if (!R.fog[j * R.fogW + i]) ctx.fillRect(mx + i * c, my + j * c, Math.ceil(c), Math.ceil(c)); }
    const ps = big ? 4 : 2.5;
    for (const p of R.pois) {
      if (!p.seen) continue;
      const px = mx + p.x * k, py = my + p.y * k;
      if (p.type === 'zone') { ctx.strokeStyle = p.open ? 'rgba(143,182,255,0.4)' : '#8fb6ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, p.r * k, 0, 6.29); ctx.stroke(); continue; }
      ctx.fillStyle = p.done ? '#555' : { wreck: '#ffd166', container: '#ffd166', turrets: '#ff6b7a', patrol: '#ff6b7a', nest: '#ff4d6d', distress: Math.sin(R.t * 6) > 0 ? '#ffd166' : '#7a5a12', rescue: Math.sin(R.t * 6) > 0 ? '#6ee7ff' : '#1d5a66', duel: '#ff4d6d', lost: Math.sin(R.t * 5) > 0 ? '#5dffb0' : '#1d6a4a', locked: ['#9fb3c8', '#5dffb0', '#ffd166'][(p.grade || 1) - 1], secure: '#8fb6ff', signal: Math.sin(R.t * 5) > 0 ? '#ffb347' : '#7a4a12' }[p.type] || '#cfe3ff';
      ctx.fillRect(px - ps, py - ps, ps * 2, ps * 2);
      if (big && !p.done && p.label) { ctx.font = '11px "Galmuri11", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#9aa7bd'; ctx.fillText(p.label, px + 7, py + 4); }
    }
    for (const x of R.extracts) if (x.beacon && !x.beacon.dead) { ctx.fillStyle = Math.sin(R.t * 6) > 0 ? '#ffb347' : '#7a4a12'; const bx2 = mx + x.x * k, by2 = my + x.y * k, q = big ? 7 : 5; ctx.beginPath(); ctx.moveTo(bx2, by2 - q); ctx.lineTo(bx2 + q, by2); ctx.lineTo(bx2, by2 + q); ctx.lineTo(bx2 - q, by2); ctx.fill(); }
    for (const x of R.extracts) if (x.active) {
      ctx.strokeStyle = '#5dffb0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx + x.x * k, my + x.y * k, big ? 8 : 5, 0, 6.29); ctx.stroke();
    }
    // 레이더: 관측 장비 등급만큼 넓다
    const rr = SA.OBS.radar[R.obsLv || 0];
    ctx.strokeStyle = 'rgba(143,211,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx + P.x * k, my + P.y * k, rr * k, 0, 6.29); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,130,0.85)';
    for (const e of R.enemies) if (!e.dead && !e.crate && !e.boss && U.d2(e.x, e.y, P.x, P.y) < rr * rr) ctx.fillRect(mx + e.x * k - 1, my + e.y * k - 1, big ? 3 : 2, big ? 3 : 2);
    for (const a of R.allies || []) if (!a.dead) { ctx.fillStyle = a.kind === 'wing' ? SA.NAMED[a.named].color : '#8fb6ff'; ctx.fillRect(mx + a.x * k - 2, my + a.y * k - 2, 4, 4); }
    const seeBoss = (e) => e && !e.dead && (R.obsLv >= 2 || U.d2(e.x, e.y, P.x, P.y) < rr * rr || e === R.boss);
    if (R.hunter && seeBoss(R.hunter)) { ctx.fillStyle = Math.sin(R.t * 5) > -0.3 ? '#b98cff' : '#5a3a99'; ctx.beginPath(); ctx.arc(mx + R.hunter.x * k, my + R.hunter.y * k, 3.5, 0, 6.29); ctx.fill(); }
    if (R.boss && !R.boss.dead) { ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(mx + R.boss.x * k, my + R.boss.y * k, 3, 0, 6.29); ctx.fill(); }
    { const vw = ctx.canvas.width / (R.zoom || Z), vh = ctx.canvas.height / (R.zoom || Z); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(mx + (R.cam.x - vw / 2) * k, my + (R.cam.y - vh / 2) * k, vw * k, vh * k); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx + P.x * k, my + P.y * k, big ? 4 : 2.5, 0, 6.29); ctx.fill();
    ctx.restore();
    return mh;
  };
  const drawMinimap = (ctx, R, W) => {
    const mw = 220, mx = W - mw - 18, my = 18;
    const mh = drawMap(ctx, R, mx, my, mw, false);
    T(ctx, `${R.map.name} · M 큰 지도${R.obsLv ? ` · Z 시야 ${R.zoomLv + 1}/${R.obsLv + 1}` : ''}`, mx, my + mh + 18, '#8f9bb8', 11, 'left', false);
    if (R.bigMap) {   // 큰 지도
      const H = ctx.canvas.height, bw = Math.min(W - 160, (H - 120) * R.map.w / R.map.h), bx = (W - bw) / 2, bh = bw * R.map.h / R.map.w, by = (H - bh) / 2;
      drawMap(ctx, R, bx, by, bw, true);
      T(ctx, '큰 지도 — M으로 닫기 · 주황 마름모: 귀환 비콘 · 초록 원: 귀환 포트', W / 2, by - 12, '#cfe3ff', 13, 'center');
    }
  };

  return { load, draw, icon, iconSrc, IMG, pre };
})();
