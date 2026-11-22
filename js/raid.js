// 레이드: 맵 생성, POI, 드랍·줍기, 침식, 탈출, 정산.
SA.Raid = (() => {
  const U = SA.U, C = () => SA.Combat;

  const LOOT = {
    // 'bp:강화'는 dropLoot에서 출처별 배율(SA.BP_MUL)이 곱해진다. 'part:등급' = 부품 완성품
    wreck: [['scrap', 1], ['scrap', .7], ['wire', .5], ['core', .5], ['engine', .25], ['debris', .22], ['goldchip', .15], ['prec', .15], ['bp:일반', .06], ['key_box1', .03], ['key_zone', .015], ['stardata', .08], ['bb_reward', .05]],
    crate: [['core', .4], ['repairkit', .35], ['canister', .3], ['goldchip', .2], ['wire', .5], ['prec', .3], ['bp:일반', .12], ['bp:강화', .04], ['cell1', .2], ['key_box1', .06], ['stardata', .1], ['bb_reward', .04]],
    cache: [['core', 1], ['engine', .6], ['scrap', 1], ['prec', .8], ['prec', .4], ['bp:일반', .15], ['bp:강화', .12], ['alloy', .25], ['key_box1', .15]],
    nest:  [['goldchip', .6], ['engine', 1], ['debris', .7], ['canister', .6], ['prec', .6], ['bp:강화', .5], ['key_box1', .4], ['part:강화', .2]],
    distress: [['repairkit', 1], ['canister', .8], ['goldchip', .8], ['scrap', 1], ['prec', .4], ['bp:강화', .25], ['cell1', .5]],
  };

  const F = () => U.pick(['k_', 'e_']);   // 왕국군/제국군 무작위
  const ell = (R, d, a) => ({ x: R.map.w / 2 + Math.cos(a) * d * R.map.w / 2, y: R.map.h / 2 + Math.sin(a) * d * R.map.h / 2 });

  // ── 시작 ──
  const start = (prof, opt = {}) => {
    if (!opt.range) prof.bpMiss = (prof.bpMiss || 0) + 1;
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
      corr: 0, stage: 0, graze: 0, grazeN: 0, kills: 0, shake: 0, hurtFlash: 0,
      msgs: [], pickLog: [], hint: null, hintT: 0, boss: null, bossEngaged: false, ravenKilled: false,
      mouseWorld: { x: 0, y: 0 }, cam: { x: 0, y: 0 }, spawnT: 0, corrT: 0, hunterSpawned: false,
      distressAt: U.rnd(140, 260), extracted: false, deathT: 0, lootValueStart: 0,
    };
    const subs = (lo.sub || []).slice(0, ship.sub).map((u, i) => part(u) && SA.PARTS[part(u).id].slot === 'sub'
      ? { part: part(u), cd: 0, ang: -Math.PI / 2, ox: ship.subMounts[i][0], oy: ship.subMounts[i][1], orb: i * Math.PI, x: 0, y: 0 } : null).filter(Boolean);
    for (const s of subs.slice()) if (s.part.mod === 's_two') subs.push(Object.assign({}, s, { orb: s.orb + Math.PI, cd: 0.2 }));   // 추적 드론 개조 '2기'
    const pas = (lo.pas || []).slice(0, ship.pas).map(part).filter(Boolean);
    const hasBarrier = pas.some(p => p.id === 'barrier');
    R.player = {
      x: 0, y: 0, vx: 0, vy: 0, aim: -Math.PI / 2, ship: prof.ship, def: ship, pilot: prof.pilot,
      hp: ship.hp, maxHp: ship.hp, speed: ship.speed, accel: ship.accel, turn: ship.turn, hitR: ship.hitR,
      barrier: hasBarrier ? 40 : 0, barrierMax: hasBarrier ? 40 : 0, barrierT: 5,
      invuln: 1.5, fireCd: 0, main: part(lo.main) || part(lo.main2), mains: [part(lo.main), part(lo.main2)], wi: part(lo.main) ? 0 : 1, subs, pas, obs: part(lo.obs),
      cell: null, emer: SA.ENERGY.emerMax, reloadT: 0, swapT: 0, aimC: 0,
      acts: [0, 1].map(i => { const p = part((lo.act || [])[i]); return p ? { part: p, cd: 0 } : null; }),
      skillCd: 0, skillT: 0, skillState: null, dash: 0, rollT: 0, shieldT: 0, dead: false, lastMx: 0, lastMy: -1,
    };
    { const bm = C().pv(R.player, 'barrier'); R.player.barrier = R.player.barrierMax = Math.round(bm); }   // 베리어 발생기 (등급 배율)
    R.range = !!opt.range;
    if (R.range) return startRange(R, prof, lo);
    if (opt.tut) return SA.Tutorial.setup(R);   // 튜토리얼 프롤로그
    // 장착 동력원: 창고에서 고른 등급 하나를 꺼내 기체에 꽂는다 (기지에서는 항상 가득 차 있다)
    if (lo.cell) { const it = prof.stash.items.find(x => x.id === lo.cell); if (it) { SA.Grid.remove(prof.stash, it.uid); R.player.cell = { id: lo.cell, e: SA.ITEMS[lo.cell].cap }; } }
    R.cellStart = R.player.cell && R.player.cell.id;
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
    // 시야: 관측 장비 등급만큼 Z로 화면을 넓힐 수 있다 · 지도 안개
    const ob = R.player.obs && C().eff(R.player.obs) > 0 ? (R.player.obs.lv || 0) + 1 : 0;   // 관측기 등급: 일반 1 · 행성 2 · 은하 3
    R.obsLv = ob; R.zoomLv = 0; R.zoom = R.zoomTarget = SA.OBS.levels[0];
    R.fogW = Math.ceil(R.map.w / SA.OBS.fogCell); R.fogH = Math.ceil(R.map.h / SA.OBS.fogCell); R.fog = new Uint8Array(R.fogW * R.fogH); R.fogT = 0;
    revealAt(R, R.player.x, R.player.y, SA.OBS.reveal);
    msg(`${m.name} 진입 — 탈출구는 닫혀 있다. 1분 뒤부터 귀환 비콘이 나타난다 (X 길게: 비상탈출)`, '#7ff0b0', 6);
    if (!prof.seenTips) msg('WASD 이동 · 좌클릭 사격 · Q/E 장비 · Space 파일럿 기술 · Tab 화물칸', '#cfe3ff', 7);
    R.allies = [];
    const wc = SA.Contracts.wingActive();
    if (wc) setupWing(R, wc);
    SA.Audio.play('raid');
    return R;
  };

  // ── 연습장: 철제 격납고. 허수아비를 불러 싸워 본다. 내구도·동력원 소모 없음, 보상 없음 ──
  const startRange = (R, prof, lo) => {
    R.map = { w: 1100, h: 760, name: '연습장 (철제 격납고)' };
    R.player.x = R.map.w / 2; R.player.y = R.map.h - 140;
    R.player.cell = { id: lo.cell || 'cell1', e: SA.ITEMS[lo.cell || 'cell1'].cap };
    R.extracts = []; R.beaconQ = []; R.beaconN = SA.EXIT.max; R.distressAt = 0; R.hunterSpawned = true;
    R.zoom = R.zoomTarget = SA.OBS.levels[0]; R.zoomLv = 0;
    R.obsLv = R.player.obs && C().eff(R.player.obs) > 0 ? (R.player.obs.lv || 0) + 1 : 0;
    R.fogW = 1; R.fogH = 1; R.fog = new Uint8Array(1).fill(1); R.fogT = 0;
    R.cam.x = R.player.x; R.cam.y = R.player.y;
    R.allies = []; R.dmgLog = []; R.rangeGod = true; R.dummyMode = 'still';
    msg('연습장 — 오른쪽 패널에서 허수아비를 부른다. 내구도·동력원은 닳지 않는다', '#cfe3ff', 6);
    SA.Audio.play('hangar');
    return R;
  };
  const spawnDummy = (type) => {
    const R = SA.R; if (!R || !R.range) return;
    const P = R.player, x = U.clamp(P.x + U.rnd(-230, 230), 60, R.map.w - 60), y = U.clamp(P.y - U.rnd(110, 160), 60, R.map.h - 60);   // 화면 안, 기체 앞쪽
    const e = C().spawnEnemy(R, type, x, y, { awake: true, dummy: R.dummyMode, noDrop: true, loot: [] });
    if (type === 'raven') { e.rematch = true; e.phase = 1; }
    return e;
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
    // 탈출구는 처음엔 모두 닫혀 있다. 귀환 비콘이 먼 곳부터 시간차로 나타나고, 부수면 귀환 포트가 열린다
    for (const c of cands) {
      R.extracts.push({ x: c.x, y: c.y, active: false, prog: 0, beepT: 0 });
      keep.push({ x: c.x, y: c.y, r: 110 });
    }
    R.beaconQ = [...pool, ...cands.filter(c => !pool.includes(c))].map(c => R.extracts.find(x => x.x === c.x && x.y === c.y));
    R.beaconT = SA.EXIT.first; R.beaconN = 0;
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
    // 제국 실험 무인기: 레이븐이 합류한 뒤 출격의 일부에 나타난다 (격추하면 비행 기록 칩)
    if (joined && Math.random() < SA.MIMIC.chance) {
      const mp = place(0.4, 0.8, 650) || ell(R, 0.6, U.rnd(0, 6.28));
      addPoi('mimic', mp, { clear: 170, label: '미확인 고속 신호' });
      const e = S.spawnEnemy(R, 'mimic', mp.x, mp.y, { rematch: true, mimic: true, phase: 1 });
      e.hp = e.maxHp = SA.MIMIC.hp;
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
    // 잠긴 상자 2개 (1막: 대부분 일반 등급) · 보안상자 (35%) · 보안 구역 (45%)
    for (let i = 0; i < 2; i++) addPoi('locked', place(0.3, 0.85, 420), { label: '잠긴 상자', grade: Math.random() < 0.15 ? 2 : 1, clear: 60 });
    if (Math.random() < 0.35) addPoi('secure', place(0.3, 0.8, 420), { label: '보안상자', clear: 60 });
    if (Math.random() < 0.45) {
      const z = addPoi('zone', place(0.35, 0.65, 700), { label: '보안 구역', r: 150, clear: 200, open: false });
      z.gate = U.rnd(0, 6.28);
      for (let i = 0; i < 2 + (Math.random() < 0.5 ? 1 : 0); i++) { const a = z.gate + Math.PI + (i - 1) * 0.9; R.pois.push({ type: 'secure', x: z.x + Math.cos(a) * 70, y: z.y + Math.sin(a) * 70, label: '보안상자', seen: false, done: false, prog: 0, inZone: z }); }
      const f = F(); for (let i = 0; i < 2; i++) { const a = z.gate + Math.PI / 2 + i * Math.PI; S.spawnEnemy(R, f + 'turret', z.x + Math.cos(a) * 95, z.y + Math.sin(a) * 95, { a, dir: i ? 1 : -1, zone: z }); }
      S.spawnEnemy(R, f + 'frigate', z.x, z.y, { zone: z });
    }
    const ff = F();
    const fg = addPoi('patrol', place(0.42, 0.62), { label: ff === 'k_' ? '왕국 초계 함대' : '제국 초계 함대' });
    S.spawnEnemy(R, ff + 'frigate', fg.x, fg.y);
    for (let k = 0; k < 2; k++) S.spawnEnemy(R, ff + 'fighter', fg.x + U.rnd(-90, 90), fg.y + U.rnd(-90, 90));
    for (let i = 0; i < 6; i++) { const p = place(0.3, 0.8, 300); S.spawnEnemy(R, F() + 'fighter', p.x, p.y); }

    // 보상형 블랙박스 해독 결과: 이번 출격 맵에 신호 지점 (한 번뿐)
    for (const si of (SA.profile.signals || [])) {
      const bb = SA.STORY.bbReward[si]; if (!bb) continue;
      const sg = addPoi('signal', place(0.25, 0.85, 500), { label: bb.signal.label, seen: true, clear: 90, bb });
      const box = S.spawnEnemy(R, 'crate', sg.x, sg.y, { crate: true, def: { hp: 30, r: 11 }, loot: bb.signal.loot, signalOf: sg });
      sg.box = box;
      if (bb.signal.kind === 'nest') for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; S.spawnEnemy(R, 'corrode', sg.x + Math.cos(a) * 70, sg.y + Math.sin(a) * 70); }   // 침식 둥지: 침식체 4기가 지킨다
    }
    SA.profile.signals = [];
    // 회수 모드: 지난 출격에서 떨어뜨린 잔해 (이번 한 번뿐)
    if (SA.profile.lostCache) {
      R.lostCache = SA.profile.lostCache; SA.profile.lostCache = null;
      addPoi('lost', place(0.25, 0.8, 500), { label: '내 잔해 신호', seen: true, clear: 100 });
    }
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
  // 네임드 대사창 (하단, 게임은 멈추지 않는다). 글자 수에 따라 4~9초
  const say = (who, text) => {
    const R = SA.R, D = SA.DIALOG; if (!R) return;
    R.dialog = R.dialog || [];
    R.dialog.push({ who, text, life: Math.min(D.max, Math.max(D.min, D.min + text.length * D.perChar)) });
    if (R.dialog.length > D.queue) R.dialog.shift();
  };
  const msg = (text, col = '#fff', life = 3.5) => { SA.R.msgs.push({ text, col, life, max: life }); if (SA.R.msgs.length > 4) SA.R.msgs.shift(); };

  // 스침 스택 보너스 (모든 파일럿 공통): 드랍률과 플레이어 피해량
  const grazeCap = () => { const P = SA.R.player; if (!P) return SA.GRAZE.cap; return [SA.GRAZE.cap[0] + C().pv(P, 'grazeamp', 0), SA.GRAZE.cap[1] + C().pv(P, 'grazeamp', 1)]; };
  const grazeTier = () => Math.floor((SA.R.graze || 0) / SA.GRAZE.per);
  const grazeBonus = () => Math.min(grazeCap()[0], grazeTier() * SA.GRAZE.drop);
  const grazeDmg = () => Math.min(grazeCap()[1], grazeTier() * SA.GRAZE.dmg);

  // 불운 보정: 새 설계도 없이 출격할수록 설계도 확률 +25%씩 (최대 3배). 새 설계도를 등록하면 초기화.
  const pity = (id) => id.startsWith('bp') ? Math.min(3, 1 + .25 * (SA.profile.bpMiss || 0)) : 1;
  // 'bp:강화' → 그 등급의 설계도 하나. 모르는 설계도를 70% 우선.
  const resolve = (id) => {
    if (id.startsWith('part:')) { const pool = SA.BP_POOL[id.slice(5)] || SA.BP_POOL['일반']; return 'pt_' + U.pick(pool); }
    if (!id.startsWith('bp:')) return SA.Decode.dropId(SA.profile, id);   // 다 모은 출처의 스토리 블랙박스 → 신호 블랙박스
    const pool = (SA.BP_POOL[id.slice(3)] || []).length ? SA.BP_POOL[id.slice(3)] : SA.BP_POOL['강화'], unk = pool.filter(r => !SA.profile.recipes.includes(r));
    return 'bp_' + U.pick(unk.length && Math.random() < 0.7 ? unk : pool);
  };
  const dropLoot = (e) => {
    const R = SA.R, D = SA.ENEMIES[e.type] || {}, table = e.loot || D.drops || [], b = grazeBonus();
    // 강화·행성 설계도 배율: 네임드·보스·대형은 높게, 그 외는 낮게
    const bm = e.boss ? SA.BP_MUL.boss : D.ai === 'frigate' ? SA.BP_MUL.frigate : SA.BP_MUL.normal;
    for (const [id, p] of table) {
      const k = id === 'bp:강화' ? bm : 1;
      const sure = e.type === 'raven' && id === 'bp_raven' && !SA.profile.recipes.includes('raven');   // 레이븐 추진기 설계도는 처음 잡을 때 확정
      if (sure || Math.random() < (p >= 1 ? 1 : p * k * (1 + b) * pity(id))) spawnItem(R, id, e.x, e.y);
    }
    // 부품 완성품 드랍 (적 격추)
    if (!e.crate && !e.noDrop) {
      const ch = e.boss ? SA.PART_DROP.chance.boss : SA.PART_DROP.chance[D.ai] || 0;
      if (Math.random() < ch * (1 + b)) { const r = Math.random(); const t = (SA.PART_DROP.tierRoll.find(([, p]) => r < p) || ['일반'])[0]; spawnItem(R, 'part:' + (e.boss && t === '일반' ? '강화' : t), e.x, e.y); }
    }
  };
  const gradeOf = (id) => { const d = SA.ITEMS[id]; if (!d) return '일반'; if (d.kind === 'bp') return (SA.PARTS[d.recipe] || {}).tier || '일반'; return d.tier || '일반'; };
  // 행성급 부품 완성품: 키울 수 있는 부품 중 무작위 + 무작위 개조 (레이븐 추진기 제외)
  const PLANET_POOL = () => Object.keys(SA.PARTS).filter(k => SA.canUp(k) && k !== 'raven');
  const spawnItem = (R, id, x, y, spd = 70) => {
    let ex = null;
    if (id === 'part:행성') { const k = U.pick(PLANET_POOL()); id = 'pt_' + k; ex = { lv: 1 }; const m = SA.randMod(k); if (m) ex.mod = m; }
    else id = resolve(id);
    const a = Math.random() * 6.28, s = U.rnd(20, spd), d = SA.ITEMS[id];
    const it = Object.assign({ id, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, full: false, chk: 0, t: 0 }, ex || {});
    if (d.kind === 'part') it.dur = Math.round(U.rnd(SA.PART_DROP.dur[0], SA.PART_DROP.dur[1]) * SA.LV_MAX[it.lv || 0] / 100);
    R.items.push(it);
    // 좋은 것이 나오면: 등급별 짧은 효과음 + 빛 (부담스럽지 않게)
    const g = it.lv === 2 ? '은하' : it.lv === 1 ? '행성' : gradeOf(id);
    if (g !== '일반' && R.state === 'play') {
      const hi = g === '행성' || g === '은하', big = hi && (d.kind === 'part' || d.kind === 'bp');
      SA.Audio.sfx(big ? 'rare3' : hi ? 'rare2' : 'rare1');
      R.rings.push({ x, y, r: 4, max: hi ? 46 : 28, life: 0.5, col: SA.TIER_COL[g] });
      it.glow = g;
    }
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
    updateView(R, rdt);
    S.updatePlayer(R, dt, rdt);
    zoneBlock(R);
    S.updateEnemies(R, dt);
    S.updateAllies(R, dt);
    S.updateBullets(R, dt);
    S.updateExtra(R, dt);
    updateItems(R, dt);
    if (R.range) { P.x = U.clamp(P.x, 16, R.map.w - 16); P.y = U.clamp(P.y, 16, R.map.h - 16); if (R.rangeGod) { P.hp = P.maxHp; } R.dmgLog = R.dmgLog.filter(d => R.t - d[0] < 5); }
    else if (R.tut) { updatePois(R, dt); SA.Tutorial.update(R, dt, rdt); }   // 튜토리얼: 침식·비콘·리스폰 없음, 대본대로
    else {
      updatePois(R, dt);
      updateCorrosion(R, dt);
      updateExtraction(R, dt);
      updateExits(R, dt);
      ambientSpawns(R, dt);
      convoyRaids(R, dt);
    }

    for (const f of R.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; f.life -= dt; }
    R.fx = R.fx.filter(f => f.life > 0);
    if (R.fx.length > 900) R.fx.splice(0, R.fx.length - 900);
    for (const t of R.texts) { t.y -= 18 * dt; t.life -= dt; }
    R.texts = R.texts.filter(t => t.life > 0);
    for (const r of R.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, 12 * dt); }
    R.rings = R.rings.filter(r => r.life > 0);
    for (const a of R.after) a.life -= dt;
    R.after = R.after.filter(a => a.life > 0);
    if (R.dialog && R.dialog.length) { R.dialog[0].life -= rdt; R.dialog[0].t = (R.dialog[0].t || 0) + rdt; if (R.dialog[0].life <= 0) R.dialog.shift(); }   // 대사창은 하나씩 차례로
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
    const mag = SA.CFG.MAGNET_R * (1 + C().pv(P, 'magnet'));
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
  const itemState = (it) => { const o = {}; for (const k of ['ch', 'dur', 'lv', 'mod', 'awk']) if (it[k] !== undefined) o[k] = it[k]; return o; };   // 동력원 충전량 등은 줍고 버려도 유지
  const tryPickup = (R, it) => {
    const d = SA.ITEMS[it.id];
    const placed = SA.Grid.add(R.cargo, it.id, itemState(it));
    if (placed) {
      it.taken = true;
      SA.Audio.sfx('pickup', d.val >= 150 ? 3 : d.val >= 60 ? 2 : 1);
      R.pickLog.push({ text: `+ ${d.kind === 'part' && it.lv ? SA.partName({ id: d.part, lv: it.lv, mod: it.mod }) : d.name}`, val: SA.itemVal(it), col: it.lv ? SA.TIER_COL[it.lv === 2 ? '은하' : '행성'] : d.color, life: 3 });
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
      if (p.type === 'locked' || p.type === 'secure') { updateBox(R, p, d, dt); continue; }
      if (p.type === 'signal') {   // 신호 지점: 매복형은 다가가면 편대가 덮친다
        if (p.box && p.box.dead) { p.done = true; continue; }
        if (p.bb.signal.kind === 'ambush' && !p.sprung && d < 300) {
          p.sprung = true; const f = F();
          msg('매복이다!', '#ff6b7a', 3); SA.Audio.sfx('siren');
          for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; C().spawnEnemy(R, f + 'fighter', p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 260, { awake: true }); }
          const fr = C().spawnEnemy(R, f + 'frigate', p.x + 240, p.y, { awake: true });
          if (p.bb.signal.elite) { fr.hp = fr.maxHp = fr.maxHp * 1.6; C().spawnEnemy(R, f + 'frigate', p.x - 240, p.y, { awake: true }); }
        }
        continue;
      }
      if (p.type === 'zone') { updateZoneGate(R, p, dt); continue; }
      if (p.type === 'lost') {   // 회수 잔해: 머물러서 회수 → 들고 탈출하면 되찾는다 (화물칸 자리는 안 먹는다)
        if (d < 46) { p.prog += dt; SA.Audio.sfx('salvage', p.prog / SA.RECOVER.hold);
          if (p.prog >= SA.RECOVER.hold) { p.done = true; R.recovered = R.lostCache; msg(`잔해 회수 — 부품 ${R.lostCache.parts.length}개·화물 ${R.lostCache.items.length}개. 탈출하면 되찾는다`, '#5dffb0', 5); SA.Audio.sfx('unlock'); } }
        continue;
      }
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
  const wreckNeed = (p) => p.fast ? (p.loot.length ? 0.45 : 1.2) : p.loot.length ? SA.WRECK.per : SA.WRECK.last;   // 튜토리얼 잔해는 빨리 나온다
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
      if (id === 'blackbox') msg(SA.Decode.dropId(SA.profile, id) === id ? '블랙박스 발견' : '신호 블랙박스 발견', '#ff8f3d');
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
  // ── 잠긴 상자 · 보안상자 · 보안 구역 ──
  const codes = () => (SA.profile.codes = SA.profile.codes || {});
  const hasDecoder = (R) => C().hasPas(R.player, 'decoder');
  const boxHint = (R, p, text) => { if (!p.warnT || R.t - p.warnT > 4) { p.warnT = R.t; msg(text, '#ffb3b3', 3.5); SA.Audio.sfx('deny'); } };
  const updateBox = (R, p, d, dt) => {
    const B = SA.BOX;
    if (p.inZone && !p.inZone.open) return;
    if (d > B.r) { if (p.type === 'secure') p.prog = Math.max(0, p.prog - dt * 0.5); else p.prog = 0; return; }
    if (!hasDecoder(R)) return boxHint(R, p, '보안해독기(패시브)를 장착해야 연다');
    const code = 'box' + p.grade;
    if (p.type === 'locked' && !(codes()[code] > 0)) return boxHint(R, p, `${SA.CODES[code].name}가 없다 — 해독키를 주워 기지에서 등록하거나 상점에서 충전`);
    if (p.type === 'secure' && !p.alarm && !p.inZone) {   // 해킹 시작: 경보가 울려 편대가 온다
      p.alarm = true; msg('보안상자 해킹 시작 — 경보! 5초 버텨라', '#8fb6ff', 4); SA.Audio.sfx('siren');
      const f = F(); for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; C().spawnEnemy(R, f + 'fighter', p.x + Math.cos(a) * 360, p.y + Math.sin(a) * 360, { awake: true, noRespawn: true }); }
    }
    const need = p.type === 'secure' ? B.hackHold : B.openHold;
    p.prog += dt; SA.Audio.sfx(p.type === 'secure' ? 'hack' : 'salvage', Math.min(1, p.prog / need));
    if (p.prog >= need) {
      p.done = true;
      if (p.type === 'locked') { codes()[code]--; for (const [id, pr] of SA.LOOT_LOCKED[p.grade]) if (Math.random() < pr) spawnItem(R, id, p.x, p.y, 90); }
      else for (const [id, pr] of SA.LOOT_SECURE) if (Math.random() < pr) spawnItem(R, id, p.x, p.y, 90);
      msg(p.type === 'locked' ? `잠긴 상자 개방 — ${SA.CODES[code].name} 남은 ${codes()[code]}회` : '보안상자 해킹 완료', '#5dffb0', 3); SA.Audio.sfx('unlock');
    }
  };
  const gatePos = (z) => ({ x: z.x + Math.cos(z.gate) * z.r, y: z.y + Math.sin(z.gate) * z.r });
  const updateZoneGate = (R, z, dt) => {
    if (z.open) return;
    const g = gatePos(z), P = R.player, d = Math.sqrt(U.d2(g.x, g.y, P.x, P.y));
    if (d > 40) { z.prog = 0; return; }
    if (!hasDecoder(R)) return boxHint(R, z, '보안 구역: 보안해독기(패시브)를 장착해야 연다');
    if (!(codes().zone > 0)) return boxHint(R, z, '보안 구역 코드가 없다 — 지역 해독키를 주워 기지에서 등록하라');
    z.prog += dt; SA.Audio.sfx('hack', z.prog / 2);
    if (z.prog >= 2) { z.open = true; z.done = true; codes().zone--; msg(`보안 구역 역장 해제 — 경비가 깨어난다 (코드 남은 ${codes().zone}회)`, '#8fb6ff', 5); SA.Audio.sfx('unlock'); SA.Audio.sfx('siren'); }
  };
  // 닫힌 보안 구역: 기체를 밀어내고, 안으로 들어가는 아군 탄을 막는다
  const zoneBlock = (R) => {
    const P = R.player;
    for (const z of R.pois) {
      if (z.type !== 'zone' || z.open) continue;
      const dx = P.x - z.x, dy = P.y - z.y, d = Math.hypot(dx, dy), m = z.r + 9;
      if (d < m) { const ux = d > 0.01 ? dx / d : Math.cos(z.gate), uy = d > 0.01 ? dy / d : Math.sin(z.gate); P.x = z.x + ux * m; P.y = z.y + uy * m; P.vx *= 0.5; P.vy *= 0.5; }
      R.pb = R.pb.filter(b => U.d2(b.x, b.y, z.x, z.y) > z.r * z.r);
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
    let rate = st.rate * (1 - Math.min(0.7, C().pv(P, 'plating', 0))) * (P.outside ? 4 : 1) * (P.pilot === 'cmdr' ? SA.CMDR_CORR : 1);
    R.corr = Math.min(100, R.corr + rate * dt);
    let ns = 0; for (let i = 0; i < SA.CORROSION.length; i++) if (R.corr >= SA.CORROSION[i].at) ns = i;
    if (ns !== R.stage) {
      if (ns > R.stage) {
        const s = SA.CORROSION[ns];
        const eff = ns === 1 ? '연사 -10% · 침식체 출현' : ns === 2 ? '연사 -20% · 이속 -15% · 침식체 증가 · 사냥꾼 깨어남' : '연사 -35% · 이속 -25% · 체력 감소 · 사냥꾼 추격';
        msg(`침식 ${ns}단계 [${s.name}] — ${eff}`, '#b98cff', 5);
        SA.Audio.sfx('stage');
      }
      R.stage = ns;
      SA.Audio.setCorrosion(ns);
    }
    const s = SA.CORROSION[R.stage];
    if (P.dead) return;
    const cres = 1 - C().corrResist(P);   // 차폐 장갑: 침식 디버프 감소
    if (s.durDrain) [...P.mains, ...P.subs.map(x => x.part), ...P.pas, P.obs].filter(p => p && p.awk !== 'hunter').forEach(p => C().wear(p, 0.05 * dt * cres));   // 심연 각성 부품은 침식으로 닳지 않는다
    if (s.hpDrain && R.state === 'play') { P.hp -= s.hpDrain * dt * cres; if (P.hp <= 0) { P.hp = 0; playerDied(); } }
    const cs = SA.CORRODE_SPAWN[R.stage];
    if (cs) {
      R.corrT += dt;
      if (R.corrT > cs.every) {
        R.corrT = 0;
        const near = R.enemies.filter(e => e.type === 'corrode').length;
        for (let i = 0; i < cs.n && near + i < cs.max; i++) spawnNear(R, 'corrode', 380);
      }
    }
    if ((s.hunterWake || s.hunter) && !R.hunterSpawned) {   // 침식 단계: 멀리서 깨어난다
      R.hunterSpawned = true;
      const HC = SA.HUNTER;
      let h = null;
      for (let k = 0; k < 30 && !h; k++) {
        const a = Math.random() * 6.28, d = U.rnd(HC.spawnDist[0], HC.spawnDist[1]), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
        if (x > 60 && y > 60 && x < R.map.w - 60 && y < R.map.h - 60 && !C().insideAsteroid(R, x, y)) h = C().spawnEnemy(R, 'hunter', x, y, { awake: true });
      }
      R.hunter = h || spawnNear(R, 'hunter', 900);
      msg('심연의 사냥꾼이 깨어났다 — 지도의 보라색 점. 장판을 밟지 마라', '#8a5cff', 6);
      SA.Audio.sfx('siren');
    }
    if (s.hunter && R.hunter && !R.hunter.dead && !R.hunter.hunt) hunterWake(R, R.hunter);
  };
  // ── 네임드 윙맨 의뢰 ──
  const setupWing = (R, c) => {
    const N = SA.NAMED[c.named], P = R.player;
    R.wing = { kind: 'wing', named: c.named, x: P.x - 30, y: P.y + 30, vx: 0, vy: 0, r: 7, hp: N.hp, maxHp: N.hp, regen: N.regen, cd: 0, cover: false, face: P.aim };
    R.allies.push(R.wing);
    R.wingC = c.id; R.wingGoal = c.goal; R.wingFail = false;
    say(N.speaker, N.hello);
    if (c.goal === 'escort') {
      const to = R.extracts.slice().sort((a, b) => U.d2(b.x, b.y, P.x, P.y) - U.d2(a.x, a.y, P.x, P.y))[0];   // 가장 먼 탈출 후보 (도착하면 포트가 열린다)
      const V = SA.CONVOY;
      R.convoy = { kind: 'convoy', x: P.x + 50, y: P.y, vx: 0, vy: 0, r: V.r, hp: V.hp, maxHp: V.hp, regen: 0, to, face: U.ang(P.x, P.y, to.x, to.y) };
      R.allies.push(R.convoy); R.convoyT = 0;
      msg('의뢰: 수송선을 가장 먼 탈출점까지 호위한 뒤 탈출 · G: 윙맨 엄호', '#8fb6ff', 6);
    } else msg('의뢰: 볼크와 함께 심연의 사냥꾼(침식 2단계에 깨어남)을 격추하고 탈출 · G: 윙맨 엄호', '#ff7a6b', 6);
  };
  const allyDown = (a) => {
    const R = SA.R; if (R.wingFail) return;
    R.wingFail = true;
    if (a.kind === 'wing') { const N = SA.NAMED[a.named]; say(N.speaker, N.down); }
    else msg('수송선 격추!', '#ff4d6d', 4);
    msg('의뢰 실패 — 이번 출격에서는 진행되지 않는다 (수주는 유지)', '#ffb3b3', 5);
  };
  const convoyArrived = (a) => { const R = SA.R; if (a && a.to && !a.to.active) { a.to.active = true; if (a.to.beacon) { a.to.beacon.dead = true; a.to.beacon = null; } } if (R.wingFail) return; R.convoyDone = true; msg('수송선 도착 — 이제 살아서 탈출하면 의뢰 완료', '#8fb6ff', 5); SA.Audio.sfx('extract'); const W = R.wing && !R.wing.dead && SA.NAMED[R.wing.named]; if (W && W.arrive) say(W.speaker, W.arrive); };
  // 수송선을 노리는 습격 (제국 전투기)
  const convoyRaids = (R, dt) => {
    const cv = R.convoy; if (!cv || cv.dead || cv.arrived) return;
    R.convoyT += dt;
    if (R.convoyT < SA.CONVOY.waveEvery) return;
    R.convoyT = 0;
    msg('수송선 습격!', '#ff6b7a', 3);
    for (let i = 0; i < SA.CONVOY.waveN; i++) {
      const a = Math.random() * 6.28;
      C().spawnEnemy(R, 'e_fighter', cv.x + Math.cos(a) * 380, cv.y + Math.sin(a) * 380, { awake: true, tgt: cv, noRespawn: true });
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
  // ── 함선 리스폰 ──
  // 격추된 왕국·제국 함선은 25~35초 뒤 리스폰 점수가 되고, 점수가 모이면 화면 밖에서 편대로 들어온다 (위협 점수 상한 안에서만)
  const threatOf = (e) => { const RS = SA.RESPAWN, D = SA.ENEMIES[e.type] || {}; return e.type === 'hunter' ? RS.threat.hunter : e.type === 'corrode' ? RS.threat.corrode : RS.threat[D.ai] || 0; };
  const queueRespawn = (e) => {
    const R = SA.R, D = SA.ENEMIES[e.type] || {};
    if (!R || R.range || e.noRespawn || e.boss || (D.faction !== 'kingdom' && D.faction !== 'empire')) return;
    const pts = D.ai === 'frigate' ? 3 : 1;   // 포대도 1점 (포대 자체는 다시 세우지 않고 함선으로 돌아온다)
    (R.respawnQ = R.respawnQ || []).push({ t: U.rnd(SA.RESPAWN.delay[0], SA.RESPAWN.delay[1]), pts });
  };
  const nearThreat = (R) => {
    const P = R.player, n2 = SA.RESPAWN.near ** 2; let s = 0;
    for (const e of R.enemies) if (!e.dead && !e.crate && U.d2(e.x, e.y, P.x, P.y) < n2) s += threatOf(e);
    return s;
  };
  const spawnSquad = (R, kinds) => {
    const P = R.player, RS = SA.RESPAWN, f = F();
    let cx = 0, cy = 0;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.28, d = U.rnd(RS.dist[0], RS.dist[1]);
      cx = P.x + Math.cos(a) * d; cy = P.y + Math.sin(a) * d;
      if (!C().insideAsteroid(R, cx, cy)) break;
    }
    const out = [];
    kinds.forEach((k, i) => {
      let x = cx, y = cy;
      if (i) for (let j = 0; j < 8; j++) { x = cx + U.rnd(-45, 45); y = cy + U.rnd(-45, 45); if (!C().insideAsteroid(R, x, y)) break; }
      out.push(C().spawnEnemy(R, f + k, x, y, { awake: true }));
    });
    if (R.wing && !R.wing.dead && Math.random() < 0.5) out[out.length - 1].tgt = R.wing;   // 윙맨이 있으면 하나는 윙맨을 노린다
    return out;
  };
  const squadCost = (kinds) => kinds.reduce((s, k) => s + SA.RESPAWN.threat[k], 0);
  const ambientSpawns = (R, dt) => {
    const RS = SA.RESPAWN;
    R.respawnPts = R.respawnPts || 0;
    if (R.respawnQ) { for (const q of R.respawnQ) { q.t -= dt; if (q.t <= 0) R.respawnPts += q.pts; } R.respawnQ = R.respawnQ.filter(q => q.t > 0); }
    R.spawnT += dt;
    if (R.spawnT < 2) return;            // 2초마다 판단
    R.spawnT = 0;
    if (R.state !== 'play' || R.t < 40) return;
    const room = RS.budget[R.stage] - nearThreat(R);
    // 바닥값: 리스폰 점수가 없어도 주변이 텅 비면(위협 2 미만) 전투기 2기를 부른다 — 22초 간격
    R.idleT = (R.idleT || 0) + 2;
    if (R.respawnPts <= 0) { if (room > RS.budget[R.stage] - 2 && R.idleT >= 22) { R.idleT = 0; spawnSquad(R, ['fighter', 'fighter']); } return; }
    const roll = Math.random(); let acc = 0, kinds = RS.squads[0][1];
    for (const [p, k] of RS.squads) { acc += p; if (roll < acc) { kinds = k; break; } }
    if (squadCost(kinds) > room) kinds = ['fighter', 'fighter'];
    if (squadCost(kinds) > room) return;   // 상한에 걸리면 미룬다
    R.respawnPts -= squadCost(kinds); R.idleT = 0;
    spawnSquad(R, kinds);
    // 가끔 반대 진영 편대도 같이 들어온다
    if (Math.random() < RS.dual && R.respawnPts >= 2 && room - squadCost(kinds) >= 2) { R.respawnPts -= 2; spawnSquad(R, ['fighter', 'fighter']); }
  };

  // ── 귀환 비콘 · 비상탈출 ──
  const spawnBeacon = (R, x) => {
    if (!x || x.beacon || x.active) return;
    x.beacon = C().spawnEnemy(R, 'crate', x.x, x.y, { crate: true, beaconOf: x, def: { hp: SA.EXIT.hp, r: 13 }, hp: SA.EXIT.hp, maxHp: SA.EXIT.hp, r: 13, loot: [] });
    R.beaconN++;
    msg(`귀환 비콘 신호 (${R.beaconN}/${SA.EXIT.max}) — 지도 주황 표시. 부수면 귀환 포트가 열린다`, '#ffb347', 5);
    SA.Audio.sfx('beep');
  };
  const beaconBroken = (e) => {
    const R = SA.R, x = e.beaconOf; if (!x) return;
    x.active = true; x.beacon = null;
    msg('귀환 포트 개방 — 안에서 버티면 탈출', '#5dffb0', 4); SA.Audio.sfx('unlock');
  };
  const updateExits = (R, dt) => {
    const E = SA.EXIT, P = R.player;
    if (R.state !== 'play' || P.dead) return;
    if (R.beaconN < E.max) { R.beaconT -= dt; if (R.beaconT <= 0) { R.beaconT = E.every; spawnBeacon(R, R.beaconQ.find(x => !x.beacon && !x.active)); } }
    // 비상탈출: X를 길게 누르면 화물칸을 버리고, 버티면 탈출 (한 판에 한 번)
    if (R.emT > 0) {
      R.emT -= dt;
      if (R.emT <= 0) { R.state = 'extracting'; SA.Audio.sfx('extract'); R.extractFx = 1.2; R.emergency = true; setTimeout(() => finish(true), 900); }
      return;
    }
    if (!R.emUsed && SA.Input.isDown('KeyX') && !R.tabOpen) {
      R.emHold = (R.emHold || 0) + dt;
      if (R.emHold >= E.emHold) {
        R.emUsed = true; R.emT = E.emTime; R.emHold = 0;
        for (const it of R.cargo.items.slice()) { SA.Grid.remove(R.cargo, it.uid); if (SA.ITEMS[it.id].kind !== 'capsule') dropToSpace(it.id, it); else dropToSpace(it.id); }
        msg(`비상탈출 — 화물칸을 버렸다. ${E.emTime}초 버텨라 (보안 칸·장착 부품만 가져간다)`, '#ff8f3d', 6); SA.Audio.sfx('siren');
      }
    } else R.emHold = 0;
  };
  const updateExtraction = (R, dt) => {
    const P = R.player;
    if (R.state !== 'play' || P.dead) return;
    for (const x of R.extracts) {
      if (!x.active) continue;
      const inside = U.d2(x.x, x.y, P.x, P.y) < SA.CFG.EXTRACT_R ** 2;
      if (inside) {
        const before = Math.floor(x.prog);
        x.prog += dt / (1 - Math.min(0.6, C().pv(R.player, 'exitacc')));
        if (Math.floor(x.prog) !== before) SA.Audio.sfx('beep');
        if (x.prog >= SA.CFG.EXTRACT_TIME) { R.state = 'extracting'; SA.Audio.sfx('extract'); R.extractFx = 1.2; setTimeout(() => finish(true), 900); return; }
      } else x.prog = Math.max(0, x.prog - dt * (C().pv(R.player, 'exitacc') ? 1.5 : 3));   // 벗어나면 빠르게 줄어든다 (바로 0이 아니라 스트레스 완화)
    }
  };

  const hunterWake = (R, e) => {   // 추격 시작 (붕괴 단계·근접·피격)
    if (e.hunt) return; e.hunt = true;
    msg('심연의 사냥꾼이 사냥을 시작했다 — 싸우거나, 나가라', '#8a5cff', 5);
    SA.Audio.sfx('siren'); bossEngaged(e);
  };
  const bossEngaged = (e) => {
    const R = SA.R; R.boss = e; R.bossEngaged = true;
    if (e.type === 'raven') { say('raven', '여긴 내 구역이야, 떠돌이.'); SA.Audio.sfx('siren'); }
    if (e.type === 'mimic') { msg('제국 실험 무인기 — 레이븐의 기동을 흉내 낸다', '#c08bff', 4); if (SA.profile.pilots.raven) say('raven', '…저거, 내 비행 기록이잖아요. 누가 훔쳐 갔지?'); SA.Audio.sfx('siren'); }
    SA.Audio.play('boss');
  };
  const ravenFlee = (e) => {   // 도주 시작: 일부 전리품만 흘린다
    if (SA.R.range) return;
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
    if (R.range) { R.boss = null; msg(`${(SA.ENEMIES[e.type] || {}).name || '허수아비'} 격추`, '#ffd166', 3); return; }
    if (e.type === 'raven') {
      R.ravenKilled = true;
      msg('레이븐 격추 — 탈출 포드를 화물칸(2×2)에 싣고 탈출하라', '#ffd166', 6);
      spawnItem(R, 'cap_raven', e.x, e.y, 20);
    }
    else if (e.type === 'mimic') msg('제국 실험 무인기 격추 — 비행 기록 칩', '#c08bff', 5);
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
    if (R.range) { SA.Main.leaveRange(); return; }   // 연습장은 정산 없이 격납고로
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
    // ── 사망 방식 (prof.deathMode): 완전 상실 / 회수 / 보통 / 쉬움 ──
    const mode = SA.DEATH_MODES[prof.deathMode] ? prof.deathMode : 'normal';
    const P = R.player;
    const eqParts = [...new Set([...P.mains, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas, P.obs])].filter(p => p && prof.parts.includes(p));
    const unequip = (gone) => { const ids = new Set(gone.map(p => p.uid)); for (const s in prof.loadouts) { const l = prof.loadouts[s];
      for (const k of ['main', 'main2', 'obs']) if (ids.has(l[k])) l[k] = null; for (const k of ['sub', 'act', 'pas']) l[k] = (l[k] || []).map(u => ids.has(u) ? null : u); } };
    let lostPart = null, lostAll = null, cellBack = !!P.cell;
    if (!ok) {
      if (mode === 'normal') {   // 장착 부품 하나를 확률로 잃는다 (기본 펄스건과 마지막 남은 주무기는 제외) + 내구도 -40%
        const mains = prof.parts.filter(p => SA.PARTS[p.id].slot === 'main');
        const eq = eqParts.filter(p => p.id !== 'pulse' && !(SA.PARTS[p.id].slot === 'main' && mains.length <= 1));
        if (eq.length && Math.random() < SA.DEATH_PART_LOSS) { const lp = U.pick(eq); lostPart = SA.partName(lp); prof.parts = prof.parts.filter(p => p !== lp); unequip([lp]); }
        eqParts.forEach(p => { p.dur = Math.max(0, p.dur * 0.6); });
      } else if (mode === 'hard' || mode === 'recover') {   // 장착한 것 전부 (동력원 포함)
        prof.parts = prof.parts.filter(p => !eqParts.includes(p)); unequip(eqParts);
        lostAll = eqParts.map(p => SA.partName(p)); cellBack = false;
        if (mode === 'recover') prof.lostCache = { parts: eqParts, items: lost.map(it => ({ id: it.id, ch: it.ch })), cell: P.cell && P.cell.id, at: Date.now() };
      }
      // 주무기가 하나도 안 남으면 용병단 비상 지급 펄스건 (내구도 60)
      if (!prof.parts.some(p => SA.PARTS[p.id].slot === 'main')) { const np = SA.Save.newPart('pulse'); np.dur = 60; prof.parts.push(np); const l = prof.loadouts[prof.ship]; if (l && !l.main) l.main = np.uid; R.giftPulse = true; }
    }
    if (cellBack && !SA.Grid.add(prof.stash, P.cell.id)) prof.credits += SA.ITEMS[P.cell.id].val;   // 장착 동력원은 창고로 (기지에서 충전)
    // 회수 잔해를 들고 탈출했으면 되찾는다
    let recovered = null;
    if (ok && R.recovered) {
      const c = R.recovered; prof.parts.push(...c.parts);
      for (const it of c.items) if (!SA.Grid.add(prof.stash, it.id)) prof.credits += SA.ITEMS[it.id].val;
      if (c.cell && !SA.Grid.add(prof.stash, c.cell)) prof.credits += SA.ITEMS[c.cell].val;
      recovered = `잔해 회수 완료 — 부품 ${c.parts.length}개, 화물 ${c.items.length}개를 되찾았다`;
    }
    let overflow = 0, partsIn = [];
    for (const it of brought) {
      const d = SA.ITEMS[it.id];
      if (d.kind === 'part') { const np = SA.Save.fromItem(it); prof.parts.push(np); partsIn.push(SA.partName(np)); continue; }   // 부품 완성품 → 부품함
      if (!SA.Grid.add(prof.stash, it.id)) overflow += SA.itemVal(it);
    }   // 창고에 들어가면 동력원은 다시 가득 찬다
    prof.credits += overflow;
    const value = brought.reduce((n, it) => n + SA.itemVal(it), 0);
    // 파일럿 부상 카운트
    for (const id in prof.pilots) if (id !== R.player.pilot && prof.pilots[id].injury > 0) prof.pilots[id].injury--;
    if (!ok) {
      if (prof.pilots[R.player.pilot]) prof.pilots[R.player.pilot].injury = SA.INJURY_RAIDS;
      const healthy = Object.keys(prof.pilots).find(id => !prof.pilots[id].injury);
      if (healthy) prof.pilot = healthy;
    }
    // 의뢰 진행
    const cs = prof.contracts;
    const prog = (id, n = 1) => { cs[id] = cs[id] || { progress: 0, done: false }; if (!cs[id].done) cs[id].progress += n; };
    const repMsgs = ok ? SA.Contracts.onRaid(R) : [];
    const dec = SA.Decode.tick(prof);   // 맡긴 블랙박스 해독 진행
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
    SA.Main.showResult({ ok, brought, lost, value, overflow, time: R.t, kills: R.kills, graze: R.graze, corr: R.corr, ravenKilled: R.ravenKilled, pilot: R.player.pilot, rescued: rescuedMsgs, lostCaps, lostPart, ravenFled: R.ravenFled, repMsgs, mode, lostAll, recovered, giftPulse: R.giftPulse, emergency: R.emergency, partsIn, decoded: dec && dec.text });
  };

  // ── 지도 안개 ──
  const revealAt = (R, x, y, rad) => {
    const c = SA.OBS.fogCell, r = Math.ceil(rad / c), cx = Math.floor(x / c), cy = Math.floor(y / c);
    for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
      if (i < 0 || j < 0 || i >= R.fogW || j >= R.fogH) continue;
      if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) R.fog[j * R.fogW + i] = 1;
    }
  };
  const fogged = (R, x, y) => { const c = SA.OBS.fogCell, i = Math.floor(x / c), j = Math.floor(y / c); return i < 0 || j < 0 || i >= R.fogW || j >= R.fogH ? false : !R.fog[j * R.fogW + i]; };
  const updateView = (R, dt) => {
    if (SA.Input.hit('KeyZ') && !R.tabOpen) {
      if (!R.obsLv) { msg('관측 장비가 없다 — 관측 칸에 장착하면 Z로 더 넓게 본다', '#ffb3b3', 3); SA.Audio.sfx('deny'); }
      else { R.zoomLv = (R.zoomLv + 1) % (R.obsLv + 1); R.zoomTarget = SA.OBS.levels[R.zoomLv]; SA.Audio.sfx('click'); }
    }
    if (SA.Input.hit('KeyM') && !R.tabOpen) { R.bigMap = !R.bigMap; SA.Audio.sfx('click'); }
    R.zoom += (R.zoomTarget - R.zoom) * Math.min(1, 8 * dt);
    R.fogT -= dt;
    if (R.fogT <= 0) { R.fogT = 0.2; revealAt(R, R.player.x, R.player.y, SA.OBS.reveal * SA.OBS.levels[0] / R.zoom); }
  };
  const useItem = (it, from) => {
    const R = SA.R, P = R.player;
    if (it.id === 'canister') { R.corr = Math.max(0, R.corr - 25); msg('정화 캐니스터 사용 — 침식 -25%', '#7ff0e0'); }
    else if (it.id === 'stardata') { R.fog.fill(1); for (const p of R.pois) p.seen = true; msg('성구 데이터 — 구역 지도가 모두 밝혀졌다 (M: 큰 지도)', '#a8c8ff', 4); }
    else if (it.id === 'repairkit') { if (P.hp >= P.maxHp) return false; P.hp = Math.min(P.maxHp, P.hp + 40); msg('수리킷 사용 — 체력 +40', '#9df07f'); }
    else return false;
    SA.Grid.remove(from, it.uid);
    SA.Audio.sfx('repair');
    return true;
  };
  const dropToSpace = (id, src) => {
    const R = SA.R, P = R.player;
    const it = { id, x: P.x + U.rnd(-14, 14), y: P.y + 22, vx: 0, vy: 40, full: true, chk: 2.5, t: 0, ch: src && src.ch, dur: src && src.dur };
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
    for (const d of plan.dropped) dropToSpace(d.id, d);
    plan.it.full = false; plan.it.chk = 0;
    tryPickup(R, plan.it);
  };
  const nearbyGround = (r = 90) => {
    const R = SA.R, P = R.player;
    return R.items.filter(it => !it.taken && U.d2(it.x, it.y, P.x, P.y) < r * r);
  };

  return { start, spawnDummy, update, msg, say, swapPlan, doSwap, dropLoot, spawnItem, playerDied, bossEngaged, bossKilled, ravenFlee, ravenFled, allyDown, convoyArrived, finish, useItem, dropToSpace, nearbyGround, grazeBonus, grazeDmg, queueRespawn, hunterWake, beaconBroken, fogged };
})();
