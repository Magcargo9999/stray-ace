// 레이드: 맵 생성, POI, 드랍·줍기, 침식, 탈출, 정산.
SA.Raid = (() => {
  const U = SA.U, C = () => SA.Combat;

  const LOOT = {
    wreck: [['scrap', 1], ['scrap', .7], ['wire', .5], ['core', .5], ['engine', .25], ['debris', .22], ['goldchip', .15], ['prec', .15], ['bp:일반', .06]],
    crate: [['core', .4], ['repairkit', .35], ['canister', .3], ['goldchip', .2], ['wire', .5], ['prec', .3], ['bp:일반', .12], ['bp:강화', .04]],
    cache: [['core', 1], ['engine', .6], ['scrap', 1], ['prec', .8], ['prec', .4], ['bp:일반', .15], ['bp:강화', .12]],
    nest:  [['goldchip', .6], ['engine', 1], ['debris', .7], ['canister', .6], ['prec', .6], ['bp:강화', .5]],
    distress: [['repairkit', 1], ['canister', .8], ['goldchip', .8], ['scrap', 1], ['prec', .4], ['bp:강화', .25]],
  };

  const F = () => U.pick(['k_', 'e_']);   // 왕국군/제국군 무작위
  const ell = (R, d, a) => ({ x: R.map.w / 2 + Math.cos(a) * d * R.map.w / 2, y: R.map.h / 2 + Math.sin(a) * d * R.map.h / 2 });

  // ── 시작 ──
  const start = (prof) => {
    prof.bpMiss = (prof.bpMiss || 0) + 1;
    const ship = SA.SHIPS[prof.ship];
    const lo = prof.loadouts[prof.ship] || {};
    const part = (uid) => prof.parts.find(p => p.uid === uid) || null;
    const hasP = (id) => (lo.pas || []).slice(0, ship.pas).some(u => part(u) && part(u).id === id && part(u).dur > 0);
    const m = SA.MAPS.mine, S = SA.CFG.MAP_SCALE;
    const R = SA.R = {
      t: 0, state: 'play', timeScale: 1, tabOpen: false, paused: false,
      map: { w: Math.round(SA.CFG.VIEW_W * m.sx * S), h: Math.round(SA.CFG.VIEW_H * m.sy * S), name: m.name },
      asteroids: [], astGrid: new Map(), nebulas: [], pois: [], extracts: [],
      enemies: [], eb: [], pb: [], items: [], fx: [], texts: [], rings: [], after: [],
      cargo: SA.Grid.make(ship.cargo[0], ship.cargo[1] + (hasP('cargo') ? 1 : 0)),
      secure: SA.Grid.make(SA.CFG.SECURE_W + (hasP('secure2') ? 1 : 0), SA.CFG.SECURE_H),
      bolts: [], beams: [], strikes: [], wells: [],
      corr: 0, stage: 0, graze: 0, kills: 0, shake: 0, hurtFlash: 0,
      msgs: [], pickLog: [], hint: null, hintT: 0, boss: null, bossEngaged: false, ravenKilled: false,
      mouseWorld: { x: 0, y: 0 }, cam: { x: 0, y: 0 }, spawnT: 0, corrT: 0, hunterSpawned: false,
      distressAt: U.rnd(140, 260), extracted: false, deathT: 0, lootValueStart: 0,
    };
    const subs = (lo.sub || []).slice(0, ship.sub).map((u, i) => part(u) && SA.PARTS[part(u).id].slot === 'sub'
      ? { part: part(u), cd: 0, ang: -Math.PI / 2, ox: ship.subMounts[i][0], oy: ship.subMounts[i][1], orb: i * Math.PI, x: 0, y: 0 } : null).filter(Boolean);
    const pas = (lo.pas || []).slice(0, ship.pas).map(part).filter(Boolean);
    const hasBarrier = pas.some(p => p.id === 'barrier');
    R.player = {
      x: 0, y: 0, vx: 0, vy: 0, aim: -Math.PI / 2, ship: prof.ship, def: ship, pilot: prof.pilot,
      hp: ship.hp, maxHp: ship.hp, speed: ship.speed, accel: ship.accel, turn: ship.turn, hitR: ship.hitR,
      barrier: hasBarrier ? 40 : 0, barrierMax: hasBarrier ? 40 : 0, barrierT: 5,
      invuln: 1.5, fireCd: 0, main: part(lo.main), subs, pas,
      acts: [0, 1].map(i => { const p = part((lo.act || [])[i]); return p ? { part: p, cd: 0 } : null; }),
      skillCd: 0, skillT: 0, skillState: null, dash: 0, rollT: 0, shieldT: 0, dead: false, lastMx: 0, lastMy: -1,
    };
    // 출격 준비에서 고른 소모품만 화물칸에 싣는다
    const bring = prof.bring || {};
    for (const id in bring) for (let i = 0; i < bring[id]; i++) {
      const it = prof.stash.items.find(x => x.id === id);
      if (!it || !SA.Grid.add(R.cargo, id)) break;
      SA.Grid.remove(prof.stash, it.uid);
    }
    prof.bring = {};
    generate(R);
    R.cam.x = R.player.x; R.cam.y = R.player.y;
    msg(`${m.name} 진입 — 탈출점 ${R.extracts.filter(e => e.active).length}곳 활성`, '#7ff0b0');
    if (!prof.seenTips) msg('WASD 이동 · 좌클릭 사격 · Q/E 장비 · Space 파일럿 기술 · Tab 화물칸', '#cfe3ff', 7);
    R.allies = [];
    const wc = SA.Contracts.wingActive();
    if (wc) setupWing(R, wc);
    SA.Audio.play('raid');
    return R;
  };

  // ── 맵 생성 ──
  const generate = (R) => {
    const W = R.map.w, H = R.map.h, keep = [];
    const far = (p, list, d) => list.every(q => U.d2(p.x, p.y, q.x, q.y) > d * d);
    // 스폰과 탈출점
    const sa = U.rnd(0, Math.PI * 2);
    const sp = ell(R, 0.86, sa);
    R.player.x = sp.x; R.player.y = sp.y;
    keep.push({ x: sp.x, y: sp.y, r: 120 });
    const cands = [];
    for (let i = 0; i < 5; i++) cands.push(ell(R, 0.88, sa + Math.PI * 0.45 + i * (Math.PI * 1.1 / 4) + U.rnd(-0.15, 0.15)));
    const ok = cands.filter(c => Math.sqrt(U.d2(c.x, c.y, sp.x, sp.y)) > W * 0.5);
    const pool = (ok.length >= 2 ? ok : cands.sort((a, b) => U.d2(b.x, b.y, sp.x, sp.y) - U.d2(a.x, a.y, sp.x, sp.y)).slice(0, 2)).sort(() => Math.random() - 0.5);
    const nAct = Math.min(pool.length, Math.random() < 0.5 ? 2 : 3);
    for (const c of cands) {
      R.extracts.push({ x: c.x, y: c.y, active: pool.indexOf(c) >= 0 && pool.indexOf(c) < nAct, prog: 0, beepT: 0 });
      keep.push({ x: c.x, y: c.y, r: 110 });
    }
    // POI
    const place = (dMin, dMax, minGap = 620) => {
      for (let k = 0; k < 200; k++) {
        const p = ell(R, U.rnd(dMin, dMax), U.rnd(0, Math.PI * 2));
        if (far(p, R.pois, minGap) && far(p, keep, 260)) return p;
      }
      return ell(R, U.rnd(dMin, dMax), U.rnd(0, Math.PI * 2));
    };
    const addPoi = (type, p, o = {}) => { const poi = Object.assign({ type, x: p.x, y: p.y, seen: false, done: false, prog: 0 }, o); R.pois.push(poi); keep.push({ x: p.x, y: p.y, r: o.clear || 90 }); return poi; };
    const S = C();

    const rv = SA.profile.raven, joined = !!(SA.profile.pilots.raven || rv.done);
    // 레이븐이 합류한 뒤에는 그가 둥지에 없다 — 놓친 전용 설계도는 둥지 상자에서 (모르는 것만)
    const nestLoot = joined ? LOOT.nest.concat([['bp_raven', .2], ['bp_sensor', .25]].filter(([id]) => !SA.profile.recipes.includes(id.slice(3)))) : LOOT.nest;
    const empty = joined || rv.stage >= 1;
    const nest = addPoi('nest', ell(R, 0.06, U.rnd(0, 6.28)), { clear: 160, label: joined ? '버려진 둥지' : empty ? '비어 있는 레이븐 둥지' : '레이븐 둥지' });
    if (empty) { S.spawnEnemy(R, 'k_frigate', nest.x - 60, nest.y); S.spawnEnemy(R, 'e_frigate', nest.x + 60, nest.y); }
    else S.spawnEnemy(R, 'raven', nest.x, nest.y);
    // 도주했던 레이븐: 매 출격 다른 곳에서 기다린다 (시작부터 미니맵에 표시)
    if (!joined && rv.stage >= 1) {
      const dp = place(0.38, 0.75, 650) || ell(R, 0.55, U.rnd(0, 6.28));
      addPoi('duel', dp, { clear: 170, label: '레이븐의 신호', seen: true });
      S.spawnEnemy(R, 'raven', dp.x, dp.y, { rematch: true });
      R.ravenRematch = true;
    }
    const rid = SA.Rescue.plan();
    if (rid) {
      const rp = place(0.3, 0.58, 700) || ell(R, 0.45, U.rnd(0, 6.28));
      addPoi('rescue', rp, { clear: 150, label: '구조 신호', target: rid, seen: true, waves: 0, started: false });
      R.rescueId = rid;
    }
    S.spawnEnemy(R, 'crate', nest.x + 30, nest.y + 20, { crate: true, def: { hp: 30, r: 11 }, loot: nestLoot });
    for (let i = 0; i < 2; i++) S.spawnEnemy(R, F() + 'fighter', nest.x + U.rnd(-80, 80), nest.y + U.rnd(-80, 80));

    const tf = U.pick(['k_', 'e_', 'm_']);
    const tb = addPoi('turrets', place(0.32, 0.5), { clear: 120, label: { k_: '왕국 포대 기지', e_: '제국 포대 기지', m_: '폐광 포대 기지' }[tf] });
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; S.spawnEnemy(R, tf + 'turret', tb.x + Math.cos(a) * 55, tb.y + Math.sin(a) * 55, { a: a, dir: i % 2 ? 1 : -1 }); }
    S.spawnEnemy(R, 'crate', tb.x, tb.y, { crate: true, def: { hp: 30, r: 11 }, loot: LOOT.cache });

    const bbIdx = Math.floor(Math.random() * 3);
    for (let i = 0; i < 3; i++) {
      const w = addPoi('wreck', place(0.33, 0.72), { label: i === bbIdx ? '추락한 정찰선' : '난파선', blackbox: i === bbIdx, seed: Math.random() });
      { const f = F(); for (let k = 0; k < 2; k++) S.spawnEnemy(R, f + 'fighter', w.x + U.rnd(-120, 120), w.y + U.rnd(-120, 120)); }
    }
    for (let i = 0; i < 2; i++) {
      const c = addPoi('container', place(0.55, 0.8), { label: '보급 컨테이너' });
      S.spawnEnemy(R, 'crate', c.x, c.y, { crate: true, def: { hp: 20, r: 10 }, loot: LOOT.crate });
    }
    const ff = F();
    const fg = addPoi('patrol', place(0.42, 0.62), { label: ff === 'k_' ? '왕국 초계 함대' : '제국 초계 함대' });
    S.spawnEnemy(R, ff + 'frigate', fg.x, fg.y);
    for (let k = 0; k < 2; k++) S.spawnEnemy(R, ff + 'fighter', fg.x + U.rnd(-90, 90), fg.y + U.rnd(-90, 90));
    for (let i = 0; i < 6; i++) { const p = place(0.3, 0.8, 300); S.spawnEnemy(R, F() + 'fighter', p.x, p.y); }

    // 소행성: 띠 3개 (빈틈 = 통로) + 흩뿌림
    // 엄폐물: 바위 50% · 소행성 30% · 길쭉한 파편 20%. 파편은 원 3개로 충돌을 잡는다.
    const addAst = (x, y, r) => {
      if (x < 20 || y < 20 || x > W - 20 || y > H - 20) return;
      const kind = Math.random() < 0.5 ? 'rock' : Math.random() < 0.6 ? 'planet' : 'shard';
      const rr = kind === 'shard' ? r * 1.5 : r;
      if (!keep.every(k => U.d2(x, y, k.x, k.y) > (k.r + rr) ** 2)) return;
      if (!R.asteroids.every(a => U.d2(x, y, a.x, a.y) > (Math.max(a.r, (a.len || 0) / 2) + rr + 6) ** 2)) return;
      if (kind !== 'shard') { R.asteroids.push({ x, y, r, kind, flip: Math.random() < 0.5 && kind === 'rock' }); return; }
      const len = r * 3, rot = U.rnd(-0.45, 0.45), ax = Math.cos(rot - 0.49), ay = Math.sin(rot - 0.49), cr = len / 4.6 / 2 * 1.05;
      R.asteroids.push({ x, y, r: cr, kind, len, rot });
      for (const t of [-0.3, 0.3, -0.15, 0.15]) R.asteroids.push({ x: x + ax * len * t, y: y + ay * len * t, r: cr * (Math.abs(t) > 0.2 ? 0.85 : 1), hidden: true });
    };
    for (const d of [0.28, 0.52, 0.76]) {
      const a0 = U.rnd(0, 6.28), span = U.rnd(2.2, 3.6);
      for (let a = a0; a < a0 + span; a += U.rnd(0.03, 0.06)) {
        if (Math.sin(a * 5 + d * 10) > 0.75) continue;       // 통로 구멍
        const p = ell(R, d + U.rnd(-0.04, 0.04), a);
        addAst(p.x, p.y, U.rnd(10, 30));
      }
    }
    for (let i = 0; i < 70; i++) addAst(U.rnd(0, W), U.rnd(0, H), U.rnd(8, 40));
    for (const a of R.asteroids) {
      const x0 = Math.floor((a.x - a.r) / 160), x1 = Math.floor((a.x + a.r) / 160);
      const y0 = Math.floor((a.y - a.r) / 160), y1 = Math.floor((a.y + a.r) / 160);
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        const k = gx + ',' + gy; if (!R.astGrid.has(k)) R.astGrid.set(k, []); R.astGrid.get(k).push(a);
      }
    }
    for (let i = 0; i < 5; i++) R.nebulas.push({ x: U.rnd(0, W), y: U.rnd(0, H), r: U.rnd(200, 420), hue: U.pick([260, 200, 320]) });
  };

  // ── 메시지 ──
  const msg = (text, col = '#fff', life = 3.5) => { SA.R.msgs.push({ text, col, life, max: life }); if (SA.R.msgs.length > 4) SA.R.msgs.shift(); };

  const grazeBonus = () => { const amp = SA.R.player && C().hasPas(SA.R.player, 'grazeamp'); return Math.min(amp ? 0.5 : 0.3, Math.floor(SA.R.graze / (amp ? 25 : 40)) * 0.05); };

  // 불운 보정: 새 설계도 없이 출격할수록 설계도 확률 +25%씩 (최대 3배). 새 설계도를 등록하면 초기화.
  const pity = (id) => id.startsWith('bp') ? Math.min(3, 1 + .25 * (SA.profile.bpMiss || 0)) : 1;
  // 'bp:강화' → 그 등급의 설계도 하나. 모르는 설계도를 70% 우선.
  const resolve = (id) => {
    if (!id.startsWith('bp:')) return id;
    const pool = SA.BP_POOL[id.slice(3)] || [], unk = pool.filter(r => !SA.profile.recipes.includes(r));
    return 'bp_' + U.pick(unk.length && Math.random() < 0.7 ? unk : pool);
  };
  const dropLoot = (e) => {
    const R = SA.R, table = e.loot || (SA.ENEMIES[e.type] || {}).drops || [], b = grazeBonus();
    for (const [id, p] of table) if (Math.random() < (p >= 1 ? 1 : p * (1 + b) * pity(id))) spawnItem(R, id, e.x, e.y);
  };
  const spawnItem = (R, id, x, y, spd = 70) => {
    id = resolve(id);
    const a = Math.random() * 6.28, s = U.rnd(20, spd);
    R.items.push({ id, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, full: false, chk: 0, t: 0 });
  };

  // ── 매 프레임 ──
  const update = (rdt) => {
    const R = SA.R; if (!R || R.paused) return;
    const dt = rdt * R.timeScale;
    R.t += dt;
    const P = R.player, S = C();

    if (R.state === 'dying') {
      R.deathT -= rdt;
      R.timeScale = 0.35;
      if (R.deathT <= 0) finish(false);
    }

    if (SA.Input.hit('KeyF') && !R.tabOpen && R.state === 'play') doSwap();
    S.updatePlayer(R, dt, rdt);
    S.updateEnemies(R, dt);
    S.updateAllies(R, dt);
    S.updateBullets(R, dt);
    S.updateExtra(R, dt);
    updateItems(R, dt);
    updatePois(R, dt);
    updateCorrosion(R, dt);
    updateExtraction(R, dt);
    ambientSpawns(R, dt);
    convoyRaids(R, dt);

    for (const f of R.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; f.life -= dt; }
    R.fx = R.fx.filter(f => f.life > 0);
    if (R.fx.length > 900) R.fx.splice(0, R.fx.length - 900);
    for (const t of R.texts) { t.y -= 18 * dt; t.life -= dt; }
    R.texts = R.texts.filter(t => t.life > 0);
    for (const r of R.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, 12 * dt); }
    R.rings = R.rings.filter(r => r.life > 0);
    for (const a of R.after) a.life -= dt;
    R.after = R.after.filter(a => a.life > 0);
    for (const m of R.msgs) m.life -= rdt;
    R.msgs = R.msgs.filter(m => m.life > 0);
    for (const l of R.pickLog) l.life -= rdt;
    R.pickLog = R.pickLog.filter(l => l.life > 0);
    R.hintT = Math.max(0, R.hintT - rdt); if (!R.hintT) R.hint = null;
    R.shake = Math.max(0, R.shake - 30 * rdt);
    R.hurtFlash = Math.max(0, R.hurtFlash - rdt);
    P.rollT = Math.max(0, P.rollT - dt); P.shieldT = Math.max(0, P.shieldT - dt);
  };

  const updateItems = (R, dt) => {
    const P = R.player;
    const mag = SA.CFG.MAGNET_R * (C().hasPas(P, 'magnet') ? 2 : 1);
    for (const it of R.items) {
      it.t += dt;
      it.vx *= 0.92; it.vy *= 0.92;
      const d = Math.sqrt(U.d2(it.x, it.y, P.x, P.y));
      if (!P.dead && it.t > 0.35) {
        if (it.full) {
          it.chk -= dt;
          if (d < 16 && it.chk <= 0) { it.chk = 0.6; tryPickup(R, it); }
        } else if (d < mag) {
          const a = U.ang(it.x, it.y, P.x, P.y), s = 260 * (1 - d / mag) + 60;
          it.vx = Math.cos(a) * s; it.vy = Math.sin(a) * s;
          if (d < 10) tryPickup(R, it);
        }
      }
      it.x += it.vx * dt; it.y += it.vy * dt;
    }
    R.items = R.items.filter(it => !it.taken);
  };
  const tryPickup = (R, it) => {
    const d = SA.ITEMS[it.id];
    const placed = SA.Grid.add(R.cargo, it.id);
    if (placed) {
      it.taken = true;
      SA.Audio.sfx('pickup', d.val >= 150 ? 3 : d.val >= 60 ? 2 : 1);
      R.pickLog.push({ text: `+ ${d.name}`, val: d.val, col: d.color, life: 3 });
      if (R.pickLog.length > 5) R.pickLog.shift();
    } else {
      if (!it.full) { SA.Audio.sfx('full'); C().text(R, it.x, it.y - 8, '칸 부족', '#ffb3b3'); }
      it.full = true; it.chk = 0.6; it.vx *= 0.2; it.vy *= 0.2;
      R.hint = 'full'; R.hintT = 4;
    }
  };

  const updatePois = (R, dt) => {
    const P = R.player;
    for (const p of R.pois) {
      const d = Math.sqrt(U.d2(p.x, p.y, P.x, P.y));
      if (!p.seen && d < 380) { p.seen = true; if (p.type !== 'distress') C().text(R, p.x, p.y - 40, p.label, '#cfe3ff'); }
      if (p.done || P.dead) continue;
      if (p.type === 'rescue') { updateRescue(R, p, d, dt); continue; }
      if (p.type === 'wreck') { updateWreck(R, p, d, dt); continue; }
      if (p.type === 'distress') {
        const need = 3;
        if (d < 46) {
          p.prog += dt;
          SA.Audio.sfx('salvage', p.prog / need);
          if (p.prog >= need) {
            p.done = true;
            distressOutcome(R, p);
          }
        }
      }
    }
    if (R.distressAt && R.t > R.distressAt) {
      R.distressAt = 0;
      let best = null;
      for (let k = 0; k < 30; k++) {
        const q = ell(R, U.rnd(0.35, 0.7), U.rnd(0, 6.28));
        const dd = U.d2(q.x, q.y, P.x, P.y);
        if (dd > 500 * 500 && dd < 1400 * 1400 && !C().insideAsteroid(R, q.x, q.y)) { best = q; break; }
      }
      if (best) {
        R.pois.push({ type: 'distress', x: best.x, y: best.y, seen: true, done: false, prog: 0, label: '조난 신호', trap: Math.random() < 0.3 });
        msg('조난 신호 포착 — 미니맵 확인', '#ffd166', 5);
        SA.Audio.sfx('beep');
      }
    }
  };
  // ── 난파선: 자원 게이지가 줄면서 아이템이 하나씩 튀어나온다. 벗어나면 진행 중인 게이지가 줄어든다.
  // 마지막 하나는 오래 걸리는 대신 좋은 아이템 확률이 높다.
  const wreckNeed = (p) => p.loot.length ? SA.WRECK.per : SA.WRECK.last;
  const updateWreck = (R, p, d, dt) => {
    const W = SA.WRECK;
    if (!p.loot) {
      p.loot = [];
      for (const [id, pr] of LOOT.wreck) if (Math.random() < pr * (1 + grazeBonus()) * pity(id)) p.loot.push(id);
      while (p.loot.length < 2) p.loot.push('scrap');
      if (p.blackbox) p.loot.unshift('blackbox');
      p.total = p.loot.length + 1; p.cur = 0;
    }
    if (d < 46) { p.cur += dt; SA.Audio.sfx('salvage', p.cur / wreckNeed(p)); }
    else if (p.cur > 0) p.cur = Math.max(0, p.cur - dt * W.decay);
    if (p.cur < wreckNeed(p)) return;
    p.cur = 0;
    if (p.loot.length) {
      const id = p.loot.shift();
      spawnItem(R, id, p.x, p.y, 100);
      if (id === 'blackbox') msg('블랙박스 발견', '#ff8f3d');
      SA.Audio.sfx('open');
    } else {
      let got = null;
      for (const [id, pr] of W.final) if (Math.random() < pr * pity(id)) { got = id; break; }
      spawnItem(R, got || 'prec', p.x, p.y, 100);
      p.done = true;
      msg('난파선 바닥까지 뒤졌다', '#ffd166', 2.5);
      SA.Audio.sfx('extract');
    }
  };
  // ── 조난 구조: 반경 안에 10초 머물면 캡슐 회수 (벗어나면 일시정지). 도중 적 2파. 탈출해야 확정.
  const updateRescue = (R, p, d, dt) => {
    const C0 = SA.RESCUE, P = R.player, cap = 'cap_' + p.target;
    if (d > 52) return;
    if (!p.started) {
      if (!SA.Grid.findSpot(R.cargo, cap)) {
        if (!p.warnT || R.t - p.warnT > 4) { p.warnT = R.t; msg('화물칸에 2×2 빈 자리가 필요하다 — Tab으로 비우고 다시 와라', '#ffb3b3', 4); SA.Audio.sfx('deny'); }
        return;
      }
      p.started = true;
      msg(`${C0.targets[p.target].name} 구조 시작 — ${C0.hold}초 버텨라`, '#6ee7ff', 4);
      SA.Audio.sfx('siren');
    }
    p.prog += dt;
    SA.Audio.sfx('salvage', Math.min(1, p.prog / C0.hold));
    const f = F();
    if (p.waves < 1 && p.prog >= C0.hold * 0.25) {
      p.waves = 1; msg('습격 1파!', '#ff6b7a', 3);
      for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.5; C().spawnEnemy(R, f + 'fighter', p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, { awake: true }); }
    }
    if (p.waves < 2 && p.prog >= C0.hold * 0.65) {
      p.waves = 2; msg('습격 2파!', '#ff4d6d', 3);
      for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; C().spawnEnemy(R, f + 'fighter', p.x + Math.cos(a) * 320, p.y + Math.sin(a) * 320, { awake: true }); }
      C().spawnEnemy(R, f + 'frigate', p.x - 340, p.y, { awake: true });
    }
    if (p.prog >= C0.hold) {
      p.done = true;
      if (SA.Grid.add(R.cargo, cap)) msg('캡슐 회수 — 탈출해야 구조가 확정된다 (이속 -10%)', '#6ee7ff', 5);
      else { spawnItem(R, cap, p.x, p.y, 30); msg('캡슐이 떨어졌다 — 칸을 비우고 주워라', '#ffd166', 4); }
      SA.Audio.sfx('extract');
    }
  };
  const distressOutcome = (R, p) => {
    if (p.trap) {
      msg('함정이다! 매복 함대 출현', '#ff4d6d', 4);
      SA.Audio.sfx('siren');
      const f = F();
      for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; C().spawnEnemy(R, f + 'fighter', p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 260, { awake: true }); }
      C().spawnEnemy(R, f + 'frigate', p.x + 300, p.y, { awake: true });
      spawnItem(R, 'goldchip', p.x, p.y);
    } else {
      msg('조난자 구조 — 보급품을 받았다', '#7ff0b0', 4);
      for (const [id, pr] of LOOT.distress) if (Math.random() < pr) spawnItem(R, id, p.x, p.y, 100);
      SA.Audio.sfx('extract');
    }
  };

  const updateCorrosion = (R, dt) => {
    const P = R.player, st = SA.CORROSION[R.stage];
    let rate = st.rate * (C().hasPas(P, 'plating') ? 0.8 : 1) * (P.outside ? 4 : 1) * (P.pilot === 'cmdr' ? SA.CMDR_CORR : 1);
    R.corr = Math.min(100, R.corr + rate * dt);
    let ns = 0; for (let i = 0; i < SA.CORROSION.length; i++) if (R.corr >= SA.CORROSION[i].at) ns = i;
    if (ns !== R.stage) {
      if (ns > R.stage) {
        const s = SA.CORROSION[ns];
        const eff = ns === 1 ? '연사 -10% · 침식체 출현' : ns === 2 ? '연사 -20% · 이속 -15% · 침식체 증가' : '연사 -35% · 이속 -25% · 체력 감소 · 사냥꾼 출현';
        msg(`침식 ${ns}단계 [${s.name}] — ${eff}`, '#b98cff', 5);
        SA.Audio.sfx('stage');
      }
      R.stage = ns;
      SA.Audio.setCorrosion(ns);
    }
    const s = SA.CORROSION[R.stage];
    if (P.dead) return;
    if (s.durDrain) [P.main, ...P.subs.map(x => x.part), ...P.pas].forEach(p => C().wear(p, 0.05 * dt));
    if (s.hpDrain && R.state === 'play') { P.hp -= s.hpDrain * dt; if (P.hp <= 0) { P.hp = 0; playerDied(); } }
    const cs = SA.CORRODE_SPAWN[R.stage];
    if (cs) {
      R.corrT += dt;
      if (R.corrT > cs.every) {
        R.corrT = 0;
        const near = R.enemies.filter(e => e.type === 'corrode').length;
        for (let i = 0; i < cs.n && near + i < cs.max; i++) spawnNear(R, 'corrode', 380);
      }
    }
    if (s.hunter && !R.hunterSpawned) {
      R.hunterSpawned = true;
      const h = spawnNear(R, 'hunter', 460);
      msg('심연의 사냥꾼이 다가온다 — 나가라', '#8a5cff', 6);
      SA.Audio.sfx('siren');
      bossEngaged(h);
    }
  };
  // ── 네임드 윙맨 의뢰 ──
  const setupWing = (R, c) => {
    const N = SA.NAMED[c.named], P = R.player;
    R.wing = { kind: 'wing', named: c.named, x: P.x - 30, y: P.y + 30, vx: 0, vy: 0, r: 7, hp: N.hp, maxHp: N.hp, regen: N.regen, cd: 0, cover: false, face: P.aim };
    R.allies.push(R.wing);
    R.wingC = c.id; R.wingGoal = c.goal; R.wingFail = false;
    msg(`${N.title} ${N.name}: "${N.hello}"`, N.color, 6);
    if (c.goal === 'escort') {
      const to = R.extracts.filter(x => x.active).sort((a, b) => U.d2(b.x, b.y, P.x, P.y) - U.d2(a.x, a.y, P.x, P.y))[0];
      const V = SA.CONVOY;
      R.convoy = { kind: 'convoy', x: P.x + 50, y: P.y, vx: 0, vy: 0, r: V.r, hp: V.hp, maxHp: V.hp, regen: 0, to, face: U.ang(P.x, P.y, to.x, to.y) };
      R.allies.push(R.convoy); R.convoyT = 0;
      msg('의뢰: 수송선을 가장 먼 탈출점까지 호위한 뒤 탈출 · G: 윙맨 엄호', '#8fb6ff', 6);
    } else msg('의뢰: 볼크와 함께 심연의 사냥꾼(침식 3단계)을 격추하고 탈출 · G: 윙맨 엄호', '#ff7a6b', 6);
  };
  const allyDown = (a) => {
    const R = SA.R; if (R.wingFail) return;
    R.wingFail = true;
    if (a.kind === 'wing') { const N = SA.NAMED[a.named]; msg(`${N.name}: "${N.down}"`, N.color, 4); }
    else msg('수송선 격추!', '#ff4d6d', 4);
    msg('의뢰 실패 — 이번 출격에서는 진행되지 않는다 (수주는 유지)', '#ffb3b3', 5);
  };
  const convoyArrived = () => { const R = SA.R; if (R.wingFail) return; R.convoyDone = true; msg('수송선 도착 — 이제 살아서 탈출하면 의뢰 완료', '#8fb6ff', 5); SA.Audio.sfx('extract'); const W = R.wing && !R.wing.dead && SA.NAMED[R.wing.named]; if (W && W.arrive) msg(`${W.title} ${W.name}: "${W.arrive}"`, W.color, 7); };
  // 수송선을 노리는 습격 (제국 전투기)
  const convoyRaids = (R, dt) => {
    const cv = R.convoy; if (!cv || cv.dead || cv.arrived) return;
    R.convoyT += dt;
    if (R.convoyT < SA.CONVOY.waveEvery) return;
    R.convoyT = 0;
    msg('수송선 습격!', '#ff6b7a', 3);
    for (let i = 0; i < SA.CONVOY.waveN; i++) {
      const a = Math.random() * 6.28;
      C().spawnEnemy(R, 'e_fighter', cv.x + Math.cos(a) * 380, cv.y + Math.sin(a) * 380, { awake: true, tgt: cv });
    }
  };
  const spawnNear = (R, type, dist) => {
    const P = R.player;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.28, x = P.x + Math.cos(a) * dist, y = P.y + Math.sin(a) * dist;
      if (!C().insideAsteroid(R, x, y)) return C().spawnEnemy(R, type, x, y, { awake: true });
    }
    return C().spawnEnemy(R, type, P.x + dist, P.y, { awake: true });
  };
  const ambientSpawns = (R, dt) => {
    R.spawnT += dt;
    if (R.spawnT < 22 || R.t < 40) return;
    R.spawnT = 0;
    const P = R.player;
    const near = R.enemies.filter(e => (SA.ENEMIES[e.type] || {}).ai === 'fighter' && U.d2(e.x, e.y, P.x, P.y) < 600 * 600).length;
    if (near < 2) { const f = F(); const a = spawnNear(R, f + 'fighter', 420); spawnNear(R, f + 'fighter', 440); if (R.wing && !R.wing.dead && Math.random() < 0.5) a.tgt = R.wing; }   // 윙맨이 있으면 하나는 윙맨을 노린다
  };

  const updateExtraction = (R, dt) => {
    const P = R.player;
    if (R.state !== 'play' || P.dead) return;
    for (const x of R.extracts) {
      if (!x.active) continue;
      const inside = U.d2(x.x, x.y, P.x, P.y) < SA.CFG.EXTRACT_R ** 2;
      if (inside) {
        const before = Math.floor(x.prog);
        x.prog += dt * (C().hasPas(R.player, 'exitacc') ? 1 / 0.7 : 1);
        if (Math.floor(x.prog) !== before) SA.Audio.sfx('beep');
        if (x.prog >= SA.CFG.EXTRACT_TIME) { R.state = 'extracting'; SA.Audio.sfx('extract'); R.extractFx = 1.2; setTimeout(() => finish(true), 900); return; }
      } else x.prog = Math.max(0, x.prog - dt * (C().hasPas(R.player, 'exitacc') ? 1.5 : 3));   // 벗어나면 빠르게 줄어든다 (바로 0이 아니라 스트레스 완화)
    }
  };

  const bossEngaged = (e) => {
    const R = SA.R; R.boss = e; R.bossEngaged = true;
    if (e.type === 'raven') { msg('레이븐: "여긴 내 구역이야, 떠돌이."', '#ff4d6d', 4); SA.Audio.sfx('siren'); }
    SA.Audio.play('boss');
  };
  const ravenFlee = (e) => {   // 도주 시작: 일부 전리품만 흘린다
    for (const [id, p] of SA.RAVEN.fleeDrops) if (Math.random() < p) spawnItem(SA.R, id, e.x, e.y);
    SA.Audio.sfx('boost');
  };
  const ravenFled = (e) => {
    const R = SA.R; R.ravenFled = true; R.boss = null;
    msg('레이븐 도주 — 다음 출격부터 다른 곳에서 다시 만난다', '#ffd166', 5);
    SA.Audio.play('raid');
  };
  const bossKilled = (e) => {
    const R = SA.R;
    if (e.type === 'raven') {
      R.ravenKilled = true;
      msg('레이븐 격추 — 탈출 포드를 화물칸(2×2)에 싣고 탈출하라', '#ffd166', 6);
      spawnItem(R, 'cap_raven', e.x, e.y, 20);
    }
    else { R.hunterKilled = true; msg('심연의 사냥꾼 격추', '#ffd166', 5); }
    R.boss = null;
    SA.Audio.play('raid');
  };

  const playerDied = () => {
    const R = SA.R;
    if (R.state !== 'play') return;
    R.state = 'dying'; R.deathT = 1.3; R.player.dead = true;
    SA.Audio.sfx('bigboom');
    C().fx(R, R.player.x, R.player.y, 80, '#ffb347', 220, 0.9, 2);
    C().fx(R, R.player.x, R.player.y, 30, '#fff', 120, 0.5, 1.5);
    R.shake = 16;
    SA.Audio.play('death');
  };

  // ── 정산 ──
  const finish = (ok) => {
    const R = SA.R, prof = SA.profile;
    if (!R || R.finished) return;
    R.finished = true;
    const isCap = (it) => SA.ITEMS[it.id].kind === 'capsule';
    const brought = (ok ? [...R.cargo.items, ...R.secure.items] : R.secure.items.slice()).filter(it => !isCap(it));
    const lost = ok ? [] : R.cargo.items.filter(it => !isCap(it));
    // 구조 캡슐: 탈출해야 확정. 격추되면 잃고 신호가 다음 출격에 다시 뜬다.
    const rescuedMsgs = [], caps = [...R.cargo.items, ...R.secure.items].filter(isCap);
    if (R.ravenFled && prof.raven.stage < 1) prof.raven.stage = 1;
    if (ok) {
      SA.Rescue.onEscape();
      for (const it of caps) rescuedMsgs.push(it.id === 'cap_raven' ? SA.Quest.ravenCaught() : SA.Rescue.complete(it.id.slice(4)));
    }
    const lostCaps = ok ? [] : caps.map(it => SA.ITEMS[it.id].name);
    // 격추되면 장착 부품 하나를 잃는다 (기본 펄스건과 마지막 남은 주무기는 제외)
    let lostPart = null;
    if (!ok) {
      const P = R.player, mains = prof.parts.filter(p => SA.PARTS[p.id].slot === 'main');
      const eq = [P.main, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas].filter(Boolean)
        .filter(p => p.id !== 'pulse' && prof.parts.includes(p) && !(SA.PARTS[p.id].slot === 'main' && mains.length <= 1));
      if (eq.length && Math.random() < SA.DEATH_PART_LOSS) {
        const lp = U.pick(eq); lostPart = SA.PARTS[lp.id].name;
        prof.parts = prof.parts.filter(p => p !== lp);
        for (const s in prof.loadouts) {
          const l = prof.loadouts[s];
          if (l.main === lp.uid) l.main = null;
          for (const k of ['sub', 'act', 'pas']) l[k] = (l[k] || []).map(u => u === lp.uid ? null : u);
        }
      }
    }
    let overflow = 0;
    for (const it of brought) if (!SA.Grid.add(prof.stash, it.id)) { overflow += SA.ITEMS[it.id].val; }
    prof.credits += overflow;
    const value = brought.reduce((n, it) => n + SA.ITEMS[it.id].val, 0);
    // 파일럿 부상 카운트
    for (const id in prof.pilots) if (id !== R.player.pilot && prof.pilots[id].injury > 0) prof.pilots[id].injury--;
    if (!ok) {
      if (prof.pilots[R.player.pilot]) prof.pilots[R.player.pilot].injury = SA.INJURY_RAIDS;
      const healthy = Object.keys(prof.pilots).find(id => !prof.pilots[id].injury);
      if (healthy) prof.pilot = healthy;
      const P = R.player;
      [P.main, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas].filter(Boolean).forEach(p => { p.dur = Math.max(0, p.dur * 0.6); });
    }
    // 의뢰 진행
    const cs = prof.contracts;
    const prog = (id, n = 1) => { cs[id] = cs[id] || { progress: 0, done: false }; if (!cs[id].done) cs[id].progress += n; };
    const repMsgs = ok ? SA.Contracts.onRaid(R) : [];
    prof.stats.raids++; if (ok) prof.stats.extracts++; else prof.stats.deaths++;
    prof.stats.kills += R.kills;
    prof.stats.bestValue = Math.max(prof.stats.bestValue, ok ? value : 0);
    prof.seenTips = true;
    SA.Save.store(prof);
    // 메인퀘스트 (지금 목표에만 센다)
    const cnt = (id) => brought.filter(it => it.id === id).length;
    if (ok) { SA.Quest.event('extract'); SA.Quest.event('blackbox', cnt('blackbox')); }
    SA.Quest.event('crystal', cnt('crystal'));
    SA.Quest.sync();
    SA.Main.showResult({ ok, brought, lost, value, overflow, time: R.t, kills: R.kills, graze: R.graze, corr: R.corr, ravenKilled: R.ravenKilled, pilot: R.player.pilot, rescued: rescuedMsgs, lostCaps, lostPart, ravenFled: R.ravenFled, repMsgs });
  };

  const useItem = (it, from) => {
    const R = SA.R, P = R.player;
    if (it.id === 'canister') { R.corr = Math.max(0, R.corr - 25); msg('정화 캐니스터 사용 — 침식 -25%', '#7ff0e0'); }
    else if (it.id === 'repairkit') { if (P.hp >= P.maxHp) return false; P.hp = Math.min(P.maxHp, P.hp + 40); msg('수리킷 사용 — 체력 +40', '#9df07f'); }
    else return false;
    SA.Grid.remove(from, it.uid);
    SA.Audio.sfx('repair');
    return true;
  };
  const dropToSpace = (id) => {
    const R = SA.R, P = R.player;
    const it = { id, x: P.x + U.rnd(-14, 14), y: P.y + 22, vx: 0, vy: 40, full: true, chk: 2.5, t: 0 };
    R.items.push(it);
    SA.Audio.sfx('drop');
  };
  // 화물칸이 꽉 찼을 때: 칸당 가치가 낮은 것부터 버리고 더 비싼 걸 줍는 계획 (손해면 null)
  const swapPlan = () => {
    const R = SA.R; if (!R) return null;
    const P = R.player;
    const it = R.items.filter(i => i.full && !i.taken && U.d2(i.x, i.y, P.x, P.y) < 70 * 70)
      .sort((a, b) => SA.ITEMS[b.id].val - SA.ITEMS[a.id].val)[0];
    if (!it) return null;
    const nd = SA.ITEMS[it.id], per = (x) => SA.ITEMS[x.id].val / (SA.ITEMS[x.id].w * SA.ITEMS[x.id].h);
    const g = SA.Grid.make(R.cargo.w, R.cargo.h, R.cargo.items.map(x => Object.assign({}, x)));
    const cands = g.items.slice().filter(x => per(x) < nd.val / (nd.w * nd.h)).sort((a, b) => per(a) - per(b));
    const dropped = [];
    for (const c of cands) {
      SA.Grid.remove(g, c.uid); dropped.push(c);
      const lost = dropped.reduce((n, x) => n + SA.ITEMS[x.id].val, 0);
      if (lost >= nd.val) return null;
      if (SA.Grid.findSpot(g, it.id) || (SA.Grid.autoSort(g) && SA.Grid.findSpot(g, it.id)))
        return { it, g, dropped, name: nd.name, gain: nd.val - lost, dropNames: dropped.map(x => SA.ITEMS[x.id].name).join('·') };
    }
    return null;
  };
  const doSwap = () => {
    const R = SA.R, plan = swapPlan();
    if (!plan) { SA.Audio.sfx('deny'); return; }
    R.cargo.items = plan.g.items;
    for (const d of plan.dropped) dropToSpace(d.id);
    plan.it.full = false; plan.it.chk = 0;
    tryPickup(R, plan.it);
  };
  const nearbyGround = (r = 90) => {
    const R = SA.R, P = R.player;
    return R.items.filter(it => !it.taken && U.d2(it.x, it.y, P.x, P.y) < r * r);
  };

  return { start, update, msg, swapPlan, doSwap, dropLoot, spawnItem, playerDied, bossEngaged, bossKilled, ravenFlee, ravenFled, allyDown, convoyArrived, finish, useItem, dropToSpace, nearbyGround, grazeBonus };
})();
