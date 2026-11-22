// 격납고 장면: 정면 투시 한 장 + 시차 레이어. 물건·NPC를 누르면 창이 열린다 (창 내용은 hangar.js)
// 좌표는 논리 1280x720. 물건 위치는 OBJ 데이터로만 두어, 나중에 그림(시점)을 바꿔도 여기만 고치면 된다.
// UI 피드백 반영(v0.55) 스위치: false로 바꾸면 그 항목만 예전대로 돌아간다
SA.HGUI = {
  sortieTag: true,    // 발사대 위 '출격 준비' 표시 + 기체 상태 한 줄, Enter로 출격 준비
  shipLight: true,    // 발사대 기체 뒤 흰 빛 + 기체 밝은 테두리 (배경에 묻히지 않게)
  barLink: true,      // 바로가기 막대에 마우스를 올리면 장면 물건도 같이 강조
  barOrder: true,     // 막대 순서를 장면 왼쪽→오른쪽 배치에 맞춤 (끄면 예전 순서)
  barAlerts: true,    // 막대 아이콘에도 '!' 알림
  pixelFont: true,    // 갈무리11 12px 기준 글자 크기, 키캡 숫자
  goalSplit: true,    // 목표 카드: 괄호 속 힌트를 흐린 보조 줄로
  creditFx: true,     // 재화 쉼표 + 증감 숫자
  hideNpc: true,      // 원화가 올 때까지 실루엣 NPC 숨김 (말풍선은 그 사람 물건 위에서)
  rackLock: true,     // 뒷줄 안 산 기체 칸에 자물쇠 + 가격
};
SA.HangarScene = (() => {
  const W = 1280, H = 720, $ = (s) => document.querySelector(s);
  const IMG = {}, SPR = {};            // 원본 이미지 / 축소본 캐시 { c: canvas, sil: 윤곽용 실루엣, a: 알파 }
  let barHi = null, cv, ctx, stage, on = false, t0 = 0, T = 0, mx = 640, my = 360, sx = 640, sy = 360, hover = null, k = 1;
  let anim = null, guide = null, bubble = null, chatT = 6, sparks = [];
  const P = () => SA.profile;

  // 물건 배치 (x = 가운데, base = 바닥 y, h = 높이, d = 시차 깊이). open = 누르면 여는 창
  const OBJ = [
    { id: 'rack1', img: 'rack_small', x: 326, base: 466, h: 140, d: .45, rack: 0 },
    { id: 'rack2', img: 'rack_small', x: 404, base: 466, h: 140, d: .45, rack: 1 },
    { id: 'rack3', img: 'rack_small', x: 482, base: 466, h: 140, d: .45, rack: 2 },
    { id: 'lockers', img: 'lockers', x: 104, base: 552, h: 224, d: .55, open: 'stash', name: '창고' },   // 바닥에 닿게 크게, 뒷줄 거치대보다 앞
    { id: 'board', img: 'board', x: 862, base: 398, h: 148, d: .45, open: 'contracts', name: '의뢰 게시판' },
    { id: 'cargo', img: 'cargo', x: 790, base: 542, h: 108, d: .5, open: 'deliv', name: '도리의 화물', need: () => P().rescued.deliv, lockTip: '빈자리 — 도리를 구조하면 들어온다' },
    { id: 'dori', npc: 'dori', x: 878, base: 552, h: 92, d: .5, need: () => P().rescued.deliv, open: 'deliv' },
    { id: 'os', npc: 'os', x: 958, base: 566, h: 108, d: .5, open: 'contracts', open2: 'shop' },
    { id: 'terminal', img: 'terminal', x: 1042, base: 572, h: 220, d: .5, open: 'shop', name: '오스의 단말 · 상점' },
    { id: 'workbench', img: 'workbench', x: 138, base: 690, h: 230, d: .7, open: 'bench', name: '작업대' },
    { id: 'teo', npc: 'teo', x: 290, base: 690, h: 108, d: .7, need: () => P().rescued.teo, open: 'bench' },
    { id: 'mina', npc: 'mina', x: 290, base: 690, h: 100, d: .7, need: () => !P().rescued.teo && P().pilots.mina && !P().pilots.mina.injury, open: 'bench' },
    { id: 'rack', img: 'rack_main', x: 640, base: 650, h: 420, d: .7, open: 'sortie', name: '출격 준비', ship: true },
    { id: 'pilots', pilots: true, d: .75 },
    { id: 'lounge', img: 'lounge', x: 410, base: 616, h: 108, d: .8, name: '대기실 · 파일럿', lounge: true },
    { id: 'decoder', img: 'decoder', x: 1150, base: 712, h: 190, d: .8, open: 'decoder', name: '해독기' },
  ];
  // 기능별 색 (바로가기 막대·창 테두리와 같은 색): 색으로 기능을 기억한다
  const ACCENT = { rack: '#5dffb0', workbench: '#4bb4f4', board: '#f335a5', terminal: '#3fede3', decoder: '#f03960', lockers: '#d8e6ff', cargo: '#ffd166' };
  const ANCHOR = { os: 'terminal', teo: 'workbench', mina: 'workbench', dori: 'cargo', pilot: 'lounge' };   // NPC를 숨겼을 때 말풍선이 뜨는 물건
  const PILOT_X = [372, 412, 452, 340, 484, 308];
  // 그림 안 화면 위치 (스프라이트 기준 비율): 해독기 화면 · 슬롯 3칸, 단말 화면
  const SCREEN = { decoder: [0.16, 0.28, 0.84, 0.56], terminal: [0.09, 0.315, 0.83, 0.51] };
  const SLOTS = [[0.085, 0.73, 0.35, 0.87], [0.37, 0.73, 0.63, 0.87], [0.65, 0.73, 0.91, 0.87]];

  // ── 준비 ──
  const NAMES = ['bg', 'fg', 'rack_main', 'rack_small', 'workbench', 'board', 'terminal', 'decoder', 'lockers', 'cargo', 'lounge', 'route_map',
    ...['ex', 'star', 'gift', 'lock', 'rack', 'locker', 'tools', 'note', 'decoder', 'coins', 'crate', 'gear'].map(n => 'ic_' + n),
    ...['main', 'sub', 'act', 'pas', 'obs', 'cell', 'pod', 'emblem'].map(n => 'pt_' + n)];
  const src = (n) => 'assets/hangar/' + n + '.png';
  let loaded = false;
  const load = (done) => {
    if (loaded) { if (done) done(); return; }
    let left = NAMES.length + 1;
    const fin = () => { if (--left === 0) { loaded = true; if (done) done(); } };
    for (const n of NAMES) { const im = new Image(); im.onload = im.onerror = () => { IMG[n] = im.naturalWidth ? im : null; fin(); }; im.src = src(n); }
    const tp = new Image(); tp.onload = tp.onerror = () => { IMG.teo = tp.naturalWidth ? tp : null; fin(); }; tp.src = SA.HG_NPC.teo.portrait;
  };
  // 큰 도트를 반씩 줄여 가며 축소 (한 번에 줄이면 지글거린다)
  const shrink = (im, w, h) => {
    let c = im, cw = im.width, ch = im.height;
    while (cw / 2 > w * 1.4) { const n = document.createElement('canvas'); n.width = Math.round(cw / 2); n.height = Math.round(ch / 2); const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n; cw = n.width; ch = n.height; }
    const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(w)); o.height = Math.max(1, Math.round(h));
    const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, o.width, o.height); return o;
  };
  const sprite = (name, h) => {
    const key = name + '@' + h; if (SPR[key]) return SPR[key];
    const im = IMG[name]; if (!im) return null;
    const w = im.width * h / im.height, c = shrink(im, w, h);
    const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height;
    const sx = sil.getContext('2d'); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#d8e6ff'; sx.fillRect(0, 0, c.width, c.height);
    const a = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return (SPR[key] = { c, sil, a, w: c.width, h: c.height });
  };

  // 물건 뒤 은은한 색 빛 (흐린 실루엣). 한 번 만들어 둔다
  const HALO = {};
  const halo = (name, h, col) => {
    const key = name + '@' + h + col; if (HALO[key]) return HALO[key];
    const s = sprite(name, h); if (!s) return null;
    const pad = 28, c = document.createElement('canvas'); c.width = s.w + pad * 2; c.height = s.h + pad * 2;
    const t = document.createElement('canvas'); t.width = s.w; t.height = s.h; const tx = t.getContext('2d');
    tx.drawImage(s.c, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, s.w, s.h);
    const x = c.getContext('2d'); x.filter = 'blur(9px)'; x.drawImage(t, pad, pad); x.filter = 'none';
    return (HALO[key] = { c, pad });
  };
  const rim = (name, h) => {   // 늘 켜진 얇은 테두리 (배경과 떨어져 보이게)
    const key = name + '@' + h + 'rim'; if (HALO[key]) return HALO[key];
    const s = sprite(name, h); if (!s) return null;
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const x = c.getContext('2d');
    x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#05070d'; x.fillRect(0, 0, s.w, s.h);
    return (HALO[key] = c);
  };
  // 미리 굽기: 배경(어둡게 한 겹 포함)·앞 레이어를 화면 크기로 한 번만 줄여 둔다
  const LAY = {};
  const layer = (n) => {
    if (LAY[n]) return LAY[n]; const im = IMG[n]; if (!im) return null;
    const [w, h] = n === 'bg' ? [W + 32, H + 18] : [W + 48, H + 27];
    const c = shrink(im, w, h), x = c.getContext('2d');
    if (n === 'bg') { x.fillStyle = 'rgba(8,12,24,0.5)'; x.fillRect(0, 0, w, h); }   // 배경을 한 겹 어둡게: 물건이 앞으로 나온다 (그림 파일은 그대로)
    return (LAY[n] = c);
  };
  // 물건 한 장: 바닥 그림자 + 뒤쪽 그늘 + 짙은 테두리(평소) 또는 밝은 윤곽(마우스) + 그림
  const BAKE = {};
  const baked = (o, hv) => {
    const key = o.id + o.h + (hv ? 'h' : ''); if (BAKE[key]) return BAKE[key];
    const s = sprite(o.img, o.h); if (!s) return null;
    const pad = 30, c = document.createElement('canvas'); c.width = s.w + pad * 2; c.height = s.h + pad * 2; const x = c.getContext('2d');
    x.save(); x.translate(pad + s.w / 2, pad + s.h - 4); x.scale(1, 16 / (s.w * 0.55));
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s.w * 0.55); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, s.w * 0.55, 0, 6.29); x.fill(); x.restore();
    const ha = halo(o.img, o.h, '#000000'); if (ha) { x.globalAlpha = 0.7; x.drawImage(ha.c, pad - ha.pad + 3, pad - ha.pad + 4); x.globalAlpha = 1; }
    const edge = hv ? s.sil : rim(o.img, o.h);
    if (edge) { x.globalAlpha = hv ? 1 : 0.85; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) x.drawImage(edge, pad + dx, pad + dy); x.globalAlpha = 1; }
    x.drawImage(s.c, pad, pad);
    return (BAKE[key] = { c, pad });
  };
  const floorLight = (cx, cy, rx, ry, col, a) => {   // 바닥 빛웅덩이 / 그림자
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.29); ctx.fill(); ctx.restore();
  };
  const rgba = (hex) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},A)`;

  const init = () => {
    stage = $('#hg-stage'); cv = $('#hg-cv'); ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    cv.addEventListener('mousemove', (e) => { [mx, my] = pos(e); });
    cv.addEventListener('mouseleave', () => { mx = W / 2; my = H / 2; setHover(null); });
    cv.addEventListener('mousedown', (e) => { if (e.button !== 0) return; [mx, my] = pos(e); if (!anim && !guide && !panelOpen()) pickHover(); click(); });
    addEventListener('resize', fit); fit();
  };
  const fit = () => {
    if (!stage) return;
    k = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(-50%,-50%) scale(${k})`;
  };

  const start = () => { if (on) return; on = true; fit(); t0 = performance.now(); requestAnimationFrame(loop); };
  const stop = () => { on = false; hideBubble(); };
  const loop = (now) => {
    if (!on) return;
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; T += dt;
    update(dt); draw();
    requestAnimationFrame(loop);
  };

  // ── 상태 ──
  const visible = (o) => !o.need || o.need();
  const shipsInRacks = () => {
    const prof = P(), list = Object.keys(SA.SHIPS).filter(id => !SA.SHIPS[id].hidden && id !== prof.ship);
    return list.slice(0, 3);
  };
  const pilotsHere = () => Object.keys(P().pilots).filter(id => !P().pilots[id].injury && id !== P().pilot).slice(0, PILOT_X.length);
  const panelOpen = () => SA.Hangar.isPanelOpen();

  // 물건 위 표시 아이콘
  const badges = () => {
    const prof = P(), out = {};
    const K = SA.Contracts;
    if (SA.STORY.contracts.some(c => K.open(c) && K.st(c.id).accepted && !K.st(c.id).done && K.canClaim(c))) out.board = 'gift';
    if ((prof.logsNew || []).length || (prof.signals || []).length) out.decoder = 'star';
    if (guide) out[guide.target] = 'ex';
    return out;
  };

  // ── 그리기 ──
  const par = (d) => [Math.round(-(sx / W - 0.5) * d * 16), Math.round(-(sy / H - 0.5) * d * 8)];   // 부드럽게 따라온 마우스 기준, 정수 픽셀
  const placed = (o) => {   // 화면 위 사각형 (시차 포함)
    const s = sprite(o.img, o.h); if (!s) return null;
    const [px, py] = par(o.d);
    return { s, x: Math.round(o.x - s.w / 2 + px), y: Math.round(o.base - s.h + py) };
  };
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    // 뒷벽: 화면보다 조금 크게 깔아 시차로 가장자리가 안 보이게
    const B = layer('bg'); if (B) { const [px, py] = par(0.25); ctx.drawImage(B, -16 + px, -9 + py); }
    const bd = badges(), launching = anim && anim.type === 'launch';
    for (const o of OBJ) {
      if (o.pilots) { if (!SA.HGUI.hideNpc) drawPilots(); continue; }
      if (o.npc) { if (visible(o) && !SA.HGUI.hideNpc) drawNpc(o); continue; }
      if (!visible(o)) { if (hover === o) lockedSpot(o); continue; }
      const p = placed(o); if (!p) continue;
      const bk = baked(o, hover === o || (barHi && SA.HGUI.barLink && objPanel(o) === barHi)); if (bk) ctx.drawImage(bk.c, p.x - bk.pad, p.y - bk.pad);
      if (o.rack !== undefined) drawRackShip(o, p);
      if (o.ship && !launching) drawMainShip(o, p);
      if (o.ship && SA.HGUI.sortieTag && !launching && hover !== o && !guide) sortieTag(p);
      if (o.id === 'decoder') drawDecoder(p);
      if (o.id === 'terminal') screenGlow(p, SCREEN.terminal, 0.08);
      if (o.id === 'workbench' && P().rescued.teo) weld(p, 0.17, 0.52);
      if (bd[o.id]) icon(bd[o.id], o.x + par(o.d)[0], p.y - 18);
    }
    if (launching) drawLaunch();
    drawSparks();
    const F = layer('fg'); if (F) { const [px, py] = par(1.1); ctx.drawImage(F, -24 + px, -14 + py); }
    if (anim && anim.type === 'crash' && anim.t < 0.6) { ctx.fillStyle = `rgba(232,240,255,${1 - anim.t / 0.6})`; ctx.fillRect(0, 0, W, H); }
    if (guide) drawGuide();
    if (hover && !guide && !(bubble && bubble.o && bubble.o.id === hover.id)) nameTag(hover);
  };
  const screenGlow = (p, r, a, c = '216,230,255') => {   // 화면 빛: 고정 (깜빡이지 않는다)
    const x = p.x + r[0] * p.s.w, y = p.y + r[1] * p.s.h, w = (r[2] - r[0]) * p.s.w, h = (r[3] - r[1]) * p.s.h;
    ctx.fillStyle = `rgba(${c},${a})`; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(${c},${a * 0.7})`;
    for (let yy = y + 1; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);   // 주사선 (멈춰 있음)
    return [x, y, w, h];
  };
  const drawDecoder = (p) => {
    const dec = P().decoding || [];
    const [x, y, w, h] = screenGlow(p, SCREEN.decoder, dec.length ? 0.1 : 0.04);
    if (dec.length) {   // 해독 중: 파형이 흐른다
      ctx.strokeStyle = '#d8e6ff'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const xx = x + 6 + (w - 12) * i / 40, yy = y + h / 2 + Math.sin(i * 0.7 + T * 2) * h * 0.22 * Math.sin(i / 40 * Math.PI); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    dec.forEach((d, i) => {   // 슬롯에 맡긴 블랙박스
      const r = SLOTS[i]; if (!r) return;
      const sx = p.x + r[0] * p.s.w, sy = p.y + r[1] * p.s.h, sw = (r[2] - r[0]) * p.s.w, sh = (r[3] - r[1]) * p.s.h;
      ctx.fillStyle = '#0b1120'; ctx.fillRect(sx + sw * 0.2, sy + sh * 0.2, sw * 0.6, sh * 0.6);
      ctx.fillStyle = '#f03960'; ctx.fillRect(sx + sw * 0.5 - 2, sy + sh * 0.4, 4, 3);
    });
  };
  const weld = (p, rx, ry) => {   // 작업대 용접 불꽃 (가끔)
    if (Math.random() < 0.012) for (let i = 0; i < 5; i++) sparks.push({ x: p.x + rx * p.s.w, y: p.y + ry * p.s.h, vx: (Math.random() - 0.3) * 60, vy: -Math.random() * 50, l: 0.4 + Math.random() * 0.3 });
  };
  const drawSparks = () => { for (const s of sparks) { ctx.fillStyle = s.l > 0.25 ? '#d8e6ff' : '#8f9bb8'; ctx.fillRect(s.x, s.y, 2, 2); } };

  // 기체 그림: 위에서 본 도트를 '세워 둔' 모습으로. 장착한 서브무기도 얹는다
  const SHIPSIL = {};
  const shipImg = (id) => id === 'hex' ? SA.Render.IMG.hex : SA.Render.IMG[id];
  const drawShipAt = (id, cx, cy, maxW, maxH, opt = {}) => {
    const s = SA.SHIPS[id], im = shipImg(id); if (!s) return;
    const sc = Math.min(maxW / s.size[0], maxH / s.size[1]), w = s.size[0] * sc, h = s.size[1] * sc;
    const ox = cx - w / 2, oy = cy - h / 2;
    ctx.save();
    if (opt.alpha) ctx.globalAlpha = opt.alpha;
    if (opt.filter) ctx.filter = opt.filter;
    if (opt.flame && SA.Render.IMG.flame && s.flames) {
      const fr = Math.floor(T * 12) % 3; ctx.imageSmoothingEnabled = false;
      for (const [fx, fy] of s.flames) ctx.drawImage(SA.Render.IMG.flame, fr * 8, 0, 8, 8, ox + (fx - 4) * sc, oy + fy * sc, 8 * sc, 8 * sc * opt.flame);
    }
    if (im && opt.rim) {   // 밝은 테두리 (흰빛 실루엣을 1~2px 둘레에)
      const key = id + '@' + Math.round(w) + 'x' + Math.round(h); let sil = SHIPSIL[key];
      if (!sil) { sil = document.createElement('canvas'); sil.width = Math.ceil(w); sil.height = Math.ceil(h); const sx2 = sil.getContext('2d'); sx2.imageSmoothingEnabled = id !== 'hex'; sx2.drawImage(im, 0, 0, w, h); sx2.globalCompositeOperation = 'source-in'; sx2.fillStyle = '#d8e6ff'; sx2.fillRect(0, 0, w, h); SHIPSIL[key] = sil; }
      ctx.globalAlpha = (opt.alpha || 1) * 0.55; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(sil, ox + dx, oy + dy); ctx.globalAlpha = opt.alpha || 1;
    }
    if (im) { ctx.imageSmoothingEnabled = id !== 'hex'; ctx.drawImage(im, ox, oy, w, h); }
    if (id === 'hex' && SA.Render.IMG.hexTurret) { ctx.imageSmoothingEnabled = false; const mw = 13 * sc; ctx.drawImage(SA.Render.IMG.hexTurret, ox + s.mount[0] * w - mw / 2, oy + s.mount[1] * h - mw / 2, mw, mw); }
    if (opt.subs) {   // 서브무기: 전투 화면과 같은 자리에 작은 포탑
      const lo = P().loadouts[id] || {}, mxp = ox + s.mount[0] * w, myp = oy + s.mount[1] * h;
      (lo.sub || []).forEach((uid, i) => {
        const pt = uid && P().parts.find(x => x.uid === uid), m = s.subMounts && s.subMounts[i]; if (!pt || !m) return;
        const tx = mxp + m[0] * sc, ty = myp + m[1] * sc, kk = sc * (s.subScale || 1);
        ctx.fillStyle = '#0b1120'; ctx.fillRect(tx - 2 * kk, ty - 6 * kk, 4 * kk, 8 * kk);
        ctx.fillStyle = '#8f9bb8'; ctx.fillRect(tx - 1 * kk, ty - 5 * kk, 2 * kk, 6 * kk);
        ctx.fillStyle = '#2a3550'; ctx.beginPath(); ctx.arc(tx, ty, 2.4 * kk, 0, 6.29); ctx.fill();
      });
    }
    if (opt.soot) {   // 격추되고 돌아온 기체: 그을음
      ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(11,17,32,0.55)'; ctx.fillRect(ox, oy, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 9; i++) { const r = ((i * 37) % 11) / 11, q = ((i * 53) % 13) / 13; ctx.fillRect(ox + r * w, oy + q * h, w * 0.12, h * 0.06); }
    }
    ctx.restore();
  };
  // 기체 상태 한 줄 (준비 완료 / 수리 필요 / 주무기 없음)
  const shipState = () => {
    const prof = P(), lo = prof.loadouts[prof.ship];
    if (!lo.main && !lo.main2) return ['주무기 없음', '#ff6b7a'];
    if (SA.loUids(lo).map(u => prof.parts.find(p => p.uid === u)).some(p => p && p.dur / p.max < 0.5)) return ['수리 필요', '#ffd166'];
    return ['준비 완료', '#5dffb0'];
  };
  const sortieTag = (p) => {
    const [st, col] = shipState(), x = p.x + p.s.w / 2, y = p.y - 10;
    ctx.font = `bold ${SA.HGUI.pixelFont ? 12 : 14}px "Galmuri11", sans-serif`; ctx.textAlign = 'center';
    const t1 = '출격 준비 [Enter]', w = Math.max(ctx.measureText(t1).width, ctx.measureText(st).width) + 20;
    ctx.fillStyle = 'rgba(11,17,32,0.9)'; ctx.fillRect(x - w / 2, y - 34, w, 38); ctx.strokeStyle = '#3a4a6b'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 0.5, y - 33.5, w - 1, 37);
    ctx.fillStyle = '#d8e6ff'; ctx.fillText(t1, x, y - 19);
    ctx.fillStyle = col; ctx.font = `${SA.HGUI.pixelFont ? 12 : 13}px "Galmuri11", sans-serif`; ctx.fillText(st, x, y - 4);
  };
  const drawMainShip = (o, p) => {
    let cy = p.y + p.s.h * 0.47, a = 1;
    if (anim && anim.type === 'land') { const q = Math.min(1, anim.t / 0.9); cy -= (1 - q) * (1 - q) * 420; }
    if (SA.HGUI.shipLight) {   // 기체 뒤 흰 빛 (색 없이): 주인공이 배경에 묻히지 않게
      const g = ctx.createRadialGradient(p.x + p.s.w / 2, cy, 4, p.x + p.s.w / 2, cy, p.s.w * 0.42);
      g.addColorStop(0, 'rgba(216,230,255,0.30)'); g.addColorStop(1, 'rgba(216,230,255,0)'); ctx.fillStyle = g; ctx.fillRect(p.x, cy - p.s.w * 0.42, p.s.w, p.s.w * 0.84);
    }
    drawShipAt(P().ship, p.x + p.s.w / 2, cy, p.s.w * 0.42, p.s.h * 0.52, { subs: true, soot: P().scorched, flame: anim && anim.type === 'land' ? 1.2 : 0, alpha: a, rim: SA.HGUI.shipLight });
  };
  const drawRackShip = (o, p) => {
    const id = shipsInRacks()[o.rack]; if (!id) return;
    const own = P().ships.includes(id), cx = p.x + p.s.w / 2, cy = p.y + p.s.h * 0.48;
    if (own) drawShipAt(id, cx, cy, p.s.w * 0.44, p.s.h * 0.5, { subs: true });
    else {   // 안 산 기체: 홀로그램 윤곽
      drawShipAt(id, cx, cy, p.s.w * 0.44, p.s.h * 0.5, { alpha: 0.3, filter: 'grayscale(1) brightness(1.8)' });
      if (SA.HGUI.rackLock) { const s = SA.SHIPS[id], lk = sprite('ic_lock', 16), ty = p.y + p.s.h - 16; ctx.font = '12px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; const tx = `₵${s.price.toLocaleString('ko-KR')}`, tw = ctx.measureText(tx).width + 28; ctx.fillStyle = 'rgba(11,17,32,0.9)'; ctx.fillRect(cx - tw / 2, ty - 13, tw, 18); if (lk) ctx.drawImage(lk.c, Math.round(cx - tw / 2 + 4), ty - 12); ctx.fillStyle = '#d8e6ff'; ctx.fillText(tx, cx + 8, ty + 1); }
      ctx.fillStyle = 'rgba(216,230,255,0.10)'; for (let yy = p.y + p.s.h * 0.2 + (T * 20) % 3; yy < p.y + p.s.h * 0.75; yy += 3) ctx.fillRect(p.x + p.s.w * 0.25, yy, p.s.w * 0.5, 1);
    }
  };
  const drawLaunch = () => {   // 발진: 불꽃을 달고 천장 해치로 빠져나간다
    const o = OBJ.find(x => x.id === 'rack'), p = placed(o); if (!p) return;
    const q = Math.min(1, anim.t / 1.3), cy = p.y + p.s.h * 0.47 - q * q * 620;
    drawShipAt(P().ship, p.x + p.s.w / 2, cy, p.s.w * 0.42, p.s.h * 0.52, { subs: true, flame: 1.4 + q * 2 });
    ctx.fillStyle = `rgba(216,230,255,${0.25 * Math.sin(q * Math.PI)})`; ctx.fillRect(0, 0, W, H);
  };
  // NPC: 원화가 오기 전까지 실루엣 자리표시
  const npcInfo = (o) => o.npc === 'pilot' ? { ...SA.PILOTS[o.pid], color: SA.PILOTS[o.pid].color } : SA.HG_NPC[o.npc];
  const npcRect = (o) => {
    if (SA.HGUI.hideNpc) { const a = OBJ.find(x => x.id === ANCHOR[o.npc]), p = a && placed(a); if (p) return { x: p.x + p.s.w / 2, y: p.y + p.s.h, w: p.s.w, h: p.s.h }; }
    const [px, py] = par(o.d); return { x: o.x + px, y: o.base + py, w: o.h * 0.42, h: o.h };
  };
  const drawFigure = (r, col, hov) => {
    const { x, y, w, h } = r, hr = h * 0.13;
    ctx.save();
    if (hov) { ctx.shadowColor = '#d8e6ff'; ctx.shadowBlur = 0; ctx.strokeStyle = '#d8e6ff'; ctx.lineWidth = 4; figPath(x, y, w, h, hr); ctx.stroke(); }
    ctx.fillStyle = '#2a3550'; ctx.strokeStyle = '#8f9bb8'; ctx.lineWidth = 2;
    figPath(x, y, w, h, hr); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x - w * 0.36, y - h * 0.68, w * 0.72, h * 0.07);   // 목도리·완장 색
    ctx.globalAlpha = 1; ctx.fillStyle = '#3a4a6b'; ctx.fillRect(x - hr * 0.5, y - h + hr * 0.7, hr * 0.35, hr * 0.35);
    ctx.restore();
  };
  const figPath = (x, y, w, h, hr) => {
    ctx.beginPath(); ctx.arc(x, y - h + hr, hr, 0, 6.29);
    ctx.moveTo(x - w * 0.4, y); ctx.lineTo(x - w * 0.46, y - h * 0.6); ctx.quadraticCurveTo(x, y - h * 0.78, x + w * 0.46, y - h * 0.6); ctx.lineTo(x + w * 0.4, y); ctx.closePath();
  };
  const drawNpc = (o) => drawFigure(npcRect(o), npcInfo(o).color, hover === o);
  const pilotObjs = () => pilotsHere().map((pid, i) => ({ id: 'p_' + pid, npc: 'pilot', pid, x: PILOT_X[i], base: 590, h: 84, d: .75 }));
  const drawPilots = () => { for (const o of pilotObjs()) drawFigure(npcRect(o), npcInfo(o).color, hover && hover.id === o.id); };

  const icon = (name, x, y) => {
    const s = sprite('ic_' + name, 26); if (!s) return;
    ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h + Math.sin(T * 2.5) * 2));
  };
  const lockedSpot = (o) => {
    const [px, py] = par(o.d), w = o.h * 1.1, x = o.x - w / 2 + px, y = o.base - o.h + py;
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(143,155,184,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, o.h); ctx.restore();
  };
  const label = (o) => {
    if (o.npc) { const i = npcInfo(o); return `${i.name} · ${i.title}`; }
    if (o.rack !== undefined) { const id = shipsInRacks()[o.rack]; if (!id) return '빈 거치대'; const s = SA.SHIPS[id]; return P().ships.includes(id) ? `${s.name} · 보관 중` : `${s.name} · ₵${s.price}`; }
    if (!visible(o)) return o.lockTip;
    return o.name;
  };
  const nameTag = (o) => {
    const txt = label(o); if (!txt) return;
    let x, y;
    if (o.npc && !SA.HGUI.hideNpc) { const r = npcRect(o); x = r.x; y = r.y - r.h - 10; }
    else { const p = placed(o); x = o.x + par(o.d)[0]; y = p ? p.y - 8 : o.base - o.h - 8; }
    ctx.font = `bold ${SA.HGUI.pixelFont ? 12 : 15}px "Galmuri11", "Malgun Gothic", sans-serif`; ctx.textAlign = 'center';
    const tw = ctx.measureText(txt).width + 18; y = Math.max(26, y);
    ctx.fillStyle = 'rgba(11,17,32,0.92)'; ctx.fillRect(x - tw / 2, y - 20, tw, 26);
    ctx.strokeStyle = '#3a4a6b'; ctx.lineWidth = 1; ctx.strokeRect(x - tw / 2 + 0.5, y - 19.5, tw - 1, 25);
    ctx.fillStyle = '#d8e6ff'; ctx.fillText(txt, x, y - 2);
  };

  // ── 고르기 ──
  const hitList = () => {   // 앞에 그린 것부터
    const out = [];
    for (const o of OBJ) {
      if (o.pilots) { if (!SA.HGUI.hideNpc) for (const po of pilotObjs()) out.push(po); continue; }
      if (o.npc) { if (visible(o) && !SA.HGUI.hideNpc) out.push(o); continue; }
      if (o.img && (visible(o) || o.lockTip) && (o.open || o.rack !== undefined || (o.lounge && SA.HGUI.hideNpc) || o.ship)) out.push(o);
    }
    return out.reverse();
  };
  const hit = (o) => {
    if (o.npc) { const r = npcRect(o); return mx > r.x - r.w / 2 && mx < r.x + r.w / 2 && my > r.y - r.h && my < r.y; }
    if (!visible(o)) { const [px, py] = par(o.d), w = o.h * 1.1; return mx > o.x - w / 2 + px && mx < o.x + w / 2 + px && my > o.base - o.h + py && my < o.base + py; }
    const p = placed(o); if (!p) return false;
    const lx = Math.floor(mx - p.x), ly = Math.floor(my - p.y);
    if (lx < 0 || ly < 0 || lx >= p.s.w || ly >= p.s.h) return false;
    if (o.ship || o.rack !== undefined) return true;   // 거치대는 빈 칸(기체가 서 있는 곳)도 누를 수 있다
    return p.s.a[(ly * p.s.w + lx) * 4 + 3] > 40;
  };
  const setHover = (o) => {
    if (o && hover && o.id === hover.id) { hover = o; return; }
    hover = o; cv.style.cursor = o ? 'pointer' : 'default';
    if (o) SA.Audio.sfx('tick');
    SA.Hangar.barHover(o ? (o.npc === 'pilot' ? null : objPanel(o)) : null);
  };
  const objPanel = (o) => o.rack !== undefined ? 'rack' : o.open;
  const click = () => {
    if (anim) { anim.skip = true; return; }
    if (guide) { guideNext(); return; }
    const o = hover; if (!o) return;
    SA.Audio.sfx('click');
    if (o.npc) return npcClick(o);
    if (!visible(o)) return;
    if (o.rack !== undefined) { const id = shipsInRacks()[o.rack]; if (id) SA.Hangar.openRack(id); return; }
    if (o.lounge) { const ps = pilotObjs(); if (ps.length) npcClick(SA.U.pick(ps)); else say('os', '다들 나가 있어.'); return; }
    if (o.open) SA.Hangar.openPanel(o.open);
  };

  // ── 말풍선 ──
  const strip = (s) => s.replace(/^[^:"]+:\s*"?/, '').replace(/"$/, '');
  const say = (npcObjOrId, text, buttons = [], ms = 4600) => {
    const o = typeof npcObjOrId === 'string' ? findNpc(npcObjOrId) : npcObjOrId;
    if (!o) return false;
    hideBubble();
    const info = npcInfo(o), b = document.createElement('div'); b.className = 'hg-bubble';
    const por = o.npc === 'teo' && IMG.teo ? `<img class="por" src="${SA.HG_NPC.teo.portrait}">` : `<span class="por ini" style="--c:${info.color}">${info.name[0]}</span>`;
    b.innerHTML = `${por}<div class="tx"><b style="color:${info.color}">${info.name}</b><div>${strip(text)}</div></div>`;
    if (buttons.length) { const row = document.createElement('div'); row.className = 'bt'; for (const [lab, fn] of buttons) { const x = document.createElement('button'); x.className = 'btn tiny'; x.textContent = lab; x.onclick = (e) => { e.stopPropagation(); hideBubble(); fn(); }; row.appendChild(x); } b.querySelector('.tx').appendChild(row); }
    stage.appendChild(b);
    const r = npcRect(o); b.style.left = Math.min(W - 330, Math.max(10, r.x - 40)) + 'px'; b.style.top = Math.max(8, r.y - r.h - 16 - b.offsetHeight) + 'px';
    bubble = { el: b, o, t: buttons.length ? 9 : ms / 1000 };
    chatT = 10 + Math.random() * 6;
    return true;
  };
  const hideBubble = () => { if (bubble) { bubble.el.remove(); bubble = null; } };
  const findNpc = (id) => {
    if (SA.PILOTS[id]) return pilotObjs().find(o => o.pid === id) || null;
    const o = OBJ.find(x => x.npc === id); return o && visible(o) ? o : null;
  };
  const mech = () => findNpc('teo') ? 'teo' : findNpc('mina') ? 'mina' : null;
  const npcLine = (o) => {
    const L = SA.HG_LINES, prof = P(), K = SA.Contracts;
    if (o.npc === 'pilot') return SA.PILOTS[o.pid].quote;
    if (o.npc === 'os') {
      if (SA.STORY.contracts.some(c => K.open(c) && K.st(c.id).accepted && !K.st(c.id).done && K.canClaim(c))) return L.claim;
      if (!K.active().length) return L.noJob;
      return SA.U.pick([...L.idle.os, ...L.tips]);
    }
    if (o.npc === 'teo' || o.npc === 'mina') {
      const worn = SA.loUids(prof.loadouts[prof.ship]).map(u => prof.parts.find(p => p.uid === u)).some(p => p && p.dur / p.max < 0.5);
      if (worn) return L.worn[o.npc];
      return SA.U.pick(L.idle[o.npc]);
    }
    return SA.U.pick(L.idle[o.npc] || ['…']);
  };
  const npcClick = (o) => {
    const btn = [];
    if (o.npc === 'pilot') btn.push(['이 파일럿으로', () => { P().pilot = o.pid; SA.Save.store(P()); SA.Hangar.toast(`다음 출격: ${SA.PILOTS[o.pid].name}`); }]);
    else if (o.npc === 'os') btn.push(['의뢰', () => SA.Hangar.openPanel('contracts')], ['상점', () => SA.Hangar.openPanel('shop')]);
    else if (o.npc === 'teo' || o.npc === 'mina') btn.push(['작업대', () => SA.Hangar.openPanel('bench')]);
    else if (o.npc === 'dori') btn.push(['배달', () => SA.Hangar.openPanel('deliv')]);
    say(o, npcLine(o), btn);
  };
  // 귀환 직후: 결과에 맞는 사람 한 명
  const react = (r) => {
    const L = SA.HG_LINES;
    let who, line;
    if (!r.ok) { who = mech() || 'os'; line = L.crash[who]; }
    else if ((r.decoded || (r.rescued || []).length || r.brought.some(it => SA.Decode.srcOf(it.id) || it.id === 'bb_reward')) && L.found[r.pilot] && findNpc(r.pilot)) { who = r.pilot; line = L.found[r.pilot]; }
    else { who = 'os'; line = r.value >= 1500 ? L.rich : r.value < 150 ? L.empty : L.back; }
    setTimeout(() => { if (on && !panelOpen()) say(who, line); }, anim ? 1300 : 500);
  };

  const pickHover = () => { let f = null; for (const o of hitList()) if (hit(o)) { f = o; break; } setHover(f); };
  // ── 연출 ──
  const play = (type, done) => { anim = { type, t: 0, done }; hideBubble(); setHover(null); };
  const update = (dt) => {
    // 호버
    if (!anim && !guide && !panelOpen()) pickHover();
    else if (hover && (panelOpen() || anim)) setHover(null);
    sx += (mx - sx) * Math.min(1, dt * 5); sy += (my - sy) * Math.min(1, dt * 5);   // 시차가 마우스를 천천히 따라온다 (떨림 방지)
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.l -= dt; }
    sparks = sparks.filter(s => s.l > 0);
    if (anim) {
      anim.t += dt;
      const len = { launch: 1.5, land: 1.0, crash: 0.8 }[anim.type];
      if (anim.t >= len || anim.skip) { const d = anim.done; anim = null; if (d) d(); }
    }
    if (bubble) { bubble.t -= dt; if (bubble.t <= 0 || panelOpen()) hideBubble(); }
    // 가끔 혼잣말 (창이 열려 있으면 조용히)
    if (!bubble && !panelOpen() && !anim && !guide) {
      chatT -= dt;
      if (chatT <= 0) {
        const pool = ['os', mech(), findNpc('dori') && 'dori', ...pilotsHere().slice(0, 2)].filter(Boolean);
        const who = SA.U.pick(pool), o = findNpc(who);
        if (o) say(o, npcLine(o)); else chatT = 8;
      }
    }
  };

  // ── 첫 방문 안내: 장면이 어두워지고 한 곳만 밝다. 오스가 한 줄씩 ──
  const GUIDE = ['rack', 'board', 'rack'];
  const startGuide = () => { guide = { i: 0, target: GUIDE[0] }; showGuideLine(); };
  const showGuideLine = () => { say('os', SA.HG_LINES.guide[guide.i], [], 60000); if (bubble) bubble.el.classList.add('guide'); };
  const guideNext = () => {
    guide.i++;
    if (guide.i >= GUIDE.length) { guide = null; hideBubble(); P().hgGuide = true; SA.Save.store(P()); return; }
    guide.target = GUIDE[guide.i]; showGuideLine();
  };
  const drawGuide = () => {
    const o = OBJ.find(x => x.id === guide.target), p = placed(o), os = OBJ.find(x => x.id === 'os');
    ctx.save(); ctx.fillStyle = 'rgba(5,7,13,0.72)'; ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (p) { const cx = p.x + p.s.w / 2, cy = p.y + p.s.h / 2, rr = Math.max(p.s.w, p.s.h) * 0.62; ctx.moveTo(cx + rr, cy); ctx.arc(cx, cy, rr, 0, 6.29, true); }
    const r = npcRect(os); ctx.moveTo(r.x + 70, r.y - r.h / 2); ctx.arc(r.x, r.y - r.h / 2, 70, 0, 6.29, true);
    ctx.fill('evenodd'); ctx.restore();
    if (p) icon('ex', o.x + par(o.d)[0], p.y - 14);
    ctx.font = '13px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#8f9bb8'; ctx.fillText('클릭해서 다음', W / 2, H - 92);
  };

  const bench = (n = 30) => { const t = performance.now(); for (let i = 0; i < n; i++) { update(0.016); draw(); } return (performance.now() - t) / n; };   // 개발용: 한 프레임 평균 ms
  const setBarHi = (pid) => { barHi = pid; };
  const alerts = () => { const b = badges(), out = {}; if (b.board) out.contracts = 1; if (b.decoder) out.decoder = 1; return out; };
  return { init, load, start, stop, play, react, say, startGuide, fit, IMG, sprite, bench, setBarHi, alerts, sortieState: () => shipState(), isAnim: () => !!anim, guideOn: () => !!guide };
})();
