// 레이드: 맵 생성, POI, 드랍·줍기, 침식, 탈출, 정산.
SA.Raid = (() => {
  const U = SA.U, C = () => SA.Combat;

  const LOOT = {
    // 'bp:강화'는 dropLoot에서 출처별 배율(SA.BP_MUL)이 곱해진다. 'part:등급' = 부품 완성품
    // v0.103 개편 (임시): 기본 상자·잔해는 낮은 재료 + 일반 설계도 위주, 양 약 30% 감소. 동력원·부품 완성품은 적 기체에서
    wreck: [['scrap', .7], ['scrap', .35], ['wire', .3], ['core', .22], ['engine', .12], ['debris', .1], ['goldchip', .1], ['prec', .1], ['bp:일반', .2], ['bp:강화', .02], ['pbp', .01], ['mchip', .03], ['alloy', .04], ['key_box1', .03], ['key_zone', .015], ['stardata', .08], ['bb_reward', .04]],
    crate: [['scrap', .25], ['core', .22], ['repairkit', .25], ['canister', .2], ['goldchip', .12], ['wire', .3], ['prec', .2], ['bp:일반', .22], ['bp:강화', .04], ['pbp', .01], ['mchip', .04], ['alloy', .06], ['fcore', .04], ['key_box1', .05], ['stardata', .08], ['bb_reward', .03]],
    cache: [['core', 1], ['scrap', .6], ['engine', .35], ['prec', .5], ['prec', .25], ['bp:일반', .25], ['bp:강화', .1], ['alloy', .12], ['key_box1', .12]],
    nest:  [['goldchip', .5], ['engine', .8], ['debris', .45], ['canister', .5], ['prec', .45], ['bp:강화', .4], ['pbp', .2], ['key_box1', .3]],
    distress: [['repairkit', 1], ['canister', .6], ['goldchip', .5], ['scrap', 1], ['prec', .3], ['bp:강화', .2], ['cell1', .4]],
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
      enemies: [], eb: [], pb: [], items: [], fx: [], texts: [], rings: [], after: [], lostFx: [],
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
    for (const s of subs.slice()) if (SA.modsOf(s.part).includes('s_two')) subs.push(Object.assign({}, s, { orb: s.orb + Math.PI, cd: 0.2 }));   // 추적 드론 개조 '2기'
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
    { const bm = C().pv(R.player, 'barrier'); R.player.barrier = R.player.barrierMax = Math.round(bm); }
    { const P0 = R.player; P0.pm = new Set([...P0.mains, ...P0.subs.map(s => s.part), ...P0.acts.map(a => a && a.part), ...P0.pas, P0.obs].flatMap(SA.modsOf)); }   // 장착 부품의 칩·행성 전용 개조   // 베리어 발생기 (등급 배율)
    R.range = !!opt.range;
    if (R.range) return startRange(R, prof, lo);
    if (opt.tut) return SA.Tutorial.setup(R);   // 튜토리얼 프롤로그
    // 장착 동력원: 창고에서 고른 등급 하나를 꺼내 기체에 꽂는다 (기지에서는 항상 가득 차 있다)
    if (lo.cell) { const it = SA.Grid.bestCell(prof.stash, lo.cell); if (it) { SA.Grid.remove(prof.stash, it.uid); R.player.cell = { id: lo.cell, e: SA.ITEMS[lo.cell].cap * SA.cellCh(it) }; } }
    R.cellStart = R.player.cell && R.player.cell.id;
    // 출격 준비에서 고른 소모품만 화물칸에 싣는다
    const bring = prof.bring || {};
    for (const id in bring) for (let i = 0; i < bring[id]; i++) {
      const it = SA.ITEMS[id].kind === 'cell' ? SA.Grid.bestCell(prof.stash, id) : prof.stash.items.find(x => x.id === id);
      if (!it || !SA.Grid.add(R.cargo, id, it.ch !== undefined ? { ch: it.ch } : undefined)) break;
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
    // 레이븐이 합류한 뒤에는 그녀가 둥지에 없다 — 놓친 전용 설계도는 둥지 상자에서 (모르는 것만)
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
      if (SA.STORY.signals[rid]) msg(SA.STORY.signals[rid], '#ffd166', 7);   // 구조 대상의 첫 조난 문구
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
    // 메인 목표 mB: 결정 속 식별 신호를 따라 '추락한 기록 포드' (루미나 기록 L1)
    if ((SA.STORY.main[(SA.profile.mq || {}).i || 0] || {}).id === 'mB') {
      const w = addPoi('wreck', place(0.5, 0.82, 650), { label: '추락한 기록 포드', lumina: true, seen: true, seed: Math.random() });
      for (let k = 0; k < 2; k++) S.spawnEnemy(R, 'corrode', w.x + U.rnd(-110, 110), w.y + U.rnd(-110, 110));
      msg('왕국 군용 식별 신호 — 추락한 기록 포드 (미니맵 금빛 표시 · 화면 가장자리 화살표 · 가까이 머물러 수색)', '#ffe9a8', 8);
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
    // 수집가 (낮은 확률): 시작부터 미니맵에 보인다
    const CO = SA.COLLECTOR;
    if (SA.profile.stats.raids >= CO.minRaids && Math.random() < CO.chance) {
      const cp = addPoi('collector', place(0.35, 0.7, 650), { label: '수집가', seen: true, clear: 220, stock: collectorStock() });
      R.collector = cp;
      msg('수집가 함선이 이 구역에 정박했다 — 미니맵 분홍 표시', '#ff9fd8', 6); SA.Audio.sfx('beep');
    }
    // 균열 (1막 최종 보스): 메인 목표가 '균열' 단계면 꼭, 한 번 이긴 뒤에는 가끔
    {
      const lu = SA.profile.lumina = SA.profile.lumina || { wins: 0, tries: 0 };
      const q = SA.STORY.main[(SA.profile.mq || {}).i || 0];
      if ((q && q.id === 'mL') || (lu.wins > 0 && Math.random() < SA.RIFT.again)) {
        R.rift = addPoi('rift', place(0.3, 0.75, 500), { label: '공간 균열', seen: true, clear: 120 });
        SA.Audio.preload('lumina');
        msg(q && q.id === 'mL' ? '공간 균열 — 주변 침식이 짙어지고 있다. 미니맵 보라 표시' : '공간 균열이 감지됐다 — 미니맵 보라 표시', '#d9b8ff', 6);
      }
    }
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
  const pity = (id) => id.startsWith('bp') ? Math.min(4, 1 + .5 * (SA.profile.bpMiss || 0)) : 1;
  // 'bp:강화' → 그 등급의 설계도 하나. 모르는 설계도를 70% 우선.
  // 행성 설계도: 모르는 것 중에서, 장착 중인 부품(×6)·가진 부품(×3)·아는 제작법(×1.5) 쪽으로 기울여 뽑는다
  const pickPlanetBp = () => {
    const pr = SA.profile, known = pr.planetBp || [], eq = new Set(), own = new Set(pr.parts.map(p => p.id));
    for (const s in pr.loadouts) for (const u of SA.loUids(pr.loadouts[s])) { const p = pr.parts.find(x => x.uid === u); if (p) eq.add(p.id); }
    const c = Object.keys(SA.PLANET).filter(id => !known.includes(id) && id !== 'raven');
    if (!c.length) return null;
    const w = c.map(id => eq.has(id) ? 6 : own.has(id) ? 3 : pr.recipes.includes(id) ? 1.5 : 1);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
    return c[c.length - 1];
  };
  const resolve = (id) => {
    if (id === 'pbp') { const k = pickPlanetBp(); return k ? 'pbp_' + k : U.pick(SA.BENCH.fallback); }
    if (id === 'mchip') return 'mc_' + U.pick(SA.CHIPS);
    if (id.startsWith('part:')) { const pool = SA.BP_POOL[id.slice(5)] || SA.BP_POOL['일반']; return 'pt_' + U.pick(pool); }
    if (!id.startsWith('bp:')) return SA.Decode.dropId(SA.profile, id);   // 다 모은 출처의 스토리 블랙박스 → 신호 블랙박스
    const tier = id.slice(3), known = (r) => SA.profile.recipes.includes(r);
    const pool = (SA.BP_POOL[tier] || []).length ? SA.BP_POOL[tier] : SA.BP_POOL['강화'], unk = pool.filter(r => !known(r));
    if (unk.length) return 'bp_' + U.pick(unk);                  // 아는 설계도는 안 나온다
    const unk2 = SA.BP_POOL['강화'].filter(r => !known(r));       // 그 등급을 다 알면: 가끔 모르는 강화 설계도, 아니면 쓸 수 있는 재료
    if (tier === '일반' && unk2.length && Math.random() < SA.BENCH.upRoll) return 'bp_' + U.pick(unk2);
    return U.pick(SA.BENCH.fallback);
  };
  const mm = (id, p) => p >= 1 ? p : Math.min(.98, p * (SA.MAT_MUL[id] || 1));   // 재료 희귀도 배율 (확정은 그대로)
  const dropLoot = (e) => {
    if (e.type === 'lumina') return;   // 루미나 보상은 균열에서 따로 (riftWin)
    const R = SA.R, D = SA.ENEMIES[e.type] || {}, table = e.loot || D.drops || [], b = grazeBonus();
    // 강화·행성 설계도 배율: 네임드·보스·대형은 높게, 그 외는 낮게
    const bm = e.boss ? SA.BP_MUL.boss : D.ai === 'frigate' ? SA.BP_MUL.frigate : SA.BP_MUL.normal;
    for (const [id, p] of table) {
      if (e.type === 'raven' && id === 'bp_raven' && SA.profile.recipes.includes('raven')) continue;   // 이미 아는 레이븐 설계도는 다시 안 나온다 (부품은 낮은 확률로)
      const k = id === 'bp:강화' ? bm : 1;
      const sure = e.type === 'raven' && id === 'bp_raven' && !SA.profile.recipes.includes('raven');   // 레이븐 추진기 설계도는 처음 잡을 때 확정
      if (sure || Math.random() < (p >= 1 ? 1 : mm(id, p) * k * (1 + b) * pity(id))) spawnItem(R, id, e.x, e.y);
    }
    // 적별 전용 강화 설계도: 아직 모르는 것만
    const sig = (SA.SIG_BP[e.type] || []).filter(r => !SA.profile.recipes.includes(r));
    if (sig.length && Math.random() < (SA.SIG_RATE[D.ai] || 0) * (1 + b) * pity('bp')) spawnItem(R, 'bp_' + U.pick(sig), e.x, e.y);
    // 적 기체: 쓰던 동력원(일반, 거의 소모된 상태) + 장착 부품. 소형은 낮게, 대형은 높게
    if (!e.crate && !e.noDrop && !e.boss && SA.CELL.drop[D.ai] && Math.random() < SA.CELL.drop[D.ai]) spawnItem(R, 'cell1', e.x, e.y, 70, { ch: U.rnd(SA.CELL.dropCh[0], SA.CELL.dropCh[1]) });
    // 네임드·보스 확정: 높은 동력원 1개 + 전용 부품 완성품 (처음 잡을 때만 확정, 이후엔 낮은 확률)
    const ND = SA.NAMED_DROP[e.type];
    if (ND && !e.crate && !e.noDrop && !SA.R.range) {
      if (ND.cell) spawnItem(R, ND.cell, e.x, e.y, 70, { ch: U.rnd(.4, .6) });
      if (ND.part) {
        const first = e.type === 'raven' ? !SA.profile.recipes.includes('raven') : true;
        if (Math.random() < (first ? ND.first : ND.later)) spawnItem(R, ND.part, e.x, e.y);
      }
    }
    // 부품 완성품 드랍 (적 격추)
    if (!e.crate && !e.noDrop) {
      const pp = e.boss ? SA.PART_DROP.pbp.boss : SA.PART_DROP.pbp[D.ai] || 0; if (Math.random() < pp) spawnItem(R, 'pbp', e.x, e.y);   // 행성 설계도
      const ch = e.boss ? SA.PART_DROP.chance.boss : SA.PART_DROP.chance[D.ai] || 0;
      if (Math.random() < ch * (1 + b)) { const r = Math.random(); const t = ((e.boss ? SA.PART_DROP.tierRoll : SA.PART_DROP.tierNormal).find(([, p]) => r < p) || ['일반'])[0]; spawnItem(R, 'part:' + (e.boss && t === '일반' ? '강화' : t), e.x, e.y); }
    }
  };
  const gradeOf = (id) => { const d = SA.ITEMS[id]; if (!d) return '일반'; if (d.kind === 'bp') return (SA.PARTS[d.recipe] || {}).tier || '일반'; return d.tier || '일반'; };
  // 행성급 부품 완성품: 키울 수 있는 부품 중 무작위 + 무작위 개조 (레이븐 추진기 제외)
  const PLANET_POOL = () => Object.keys(SA.PARTS).filter(k => SA.canUp(k) && k !== 'raven');
  const spawnItem = (R, id, x, y, spd = 70, extra = null) => {
    let ex = extra;
    if (id === 'part:행성') { const k = U.pick(PLANET_POOL()); id = 'pt_' + k; ex = { lv: 1 }; }
    else id = resolve(id);
    if (id.startsWith('pt_') && Math.random() < SA.PART_DROP.chip) { const c = SA.randChip(id.slice(3)); if (c) (ex = ex || {}).mod = c; }   // 드랍 부품에 칩이 끼워져 나온다
    const a = Math.random() * 6.28, s = U.rnd(20, spd), d = SA.ITEMS[id];
    const it = Object.assign({ id, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, full: false, chk: 0, t: 0 }, ex || {});
    if (d.kind === 'part') it.dur = Math.round(U.rnd(SA.PART_DROP.dur[0], SA.PART_DROP.dur[1]) * SA.LV_MAX[it.lv || 0] / 100);
    R.items.push(it);
    // 좋은 것이 나오면: 등급별 짧은 효과음 + 빛 (부담스럽지 않게)
    const g = it.lv ? '행성' : SA.ITEMS[id].kind === 'pbp' ? '행성' : gradeOf(id);
    if (g !== '일반' && R.state === 'play') {
      const hi = g === '행성' || g === '은하', big = hi && (d.kind === 'part' || d.kind === 'bp');
      SA.Audio.sfx(big ? 'rare3' : hi ? 'rare2' : 'rare1');
      R.rings.push({ x, y, r: 4, max: hi ? 46 : 28, life: 0.5, col: SA.TIER_COL[g] });
      it.glow = g;
    }
  };

  // 메인 목표 의뢰인의 출격 통신: 첫 출격은 1번 줄, 그 뒤는 2·3번을 번갈아 (v0.112)
  const mainComm = (R) => {
    const prof = SA.profile, q = SA.Quest.cur().q; if (!q || !q.comm || !q.comm.length) return;
    const cn = prof.commN = prof.commN || {}, n = cn[q.id] || 0, L = q.comm;
    const line = n === 0 || L.length === 1 ? L[0] : L[1 + ((n - 1) % (L.length - 1))];
    cn[q.id] = n + 1; SA.Save.store(prof);
    say(q.commWho || q.giver, line);
  };

  // ── 매 프레임 ──
  const update = (rdt) => {
    const R = SA.R; if (!R || R.paused) return;
    // 루미나 첫 도전 페이즈 대사 (v0.112): 탄·적·기체 시간이 멈추고 Space로만 계속한다. 그 Space는 대사가 먹는다
    if (R.freeze) {
      const d = R.dialog && R.dialog.find(x => x.hold); if (d) d.t = (d.t || 0) + rdt;
      if (!SA.Input.hit('Space')) return;
      SA.Input.consume('Space'); R.freeze = null; R.dialog = (R.dialog || []).filter(x => !x.hold); SA.Audio.sfx('click');
    }
    const dt = rdt * R.timeScale;
    R.t += dt;
    if (!R.commOk && R.t >= 2 && R.state === 'play' && !R.range && !R.tut && !R.arena) { R.commOk = true; mainComm(R); }   // 출격 시작 통신 (v0.112)
    const P = R.player, S = C();

    if (R.state === 'dying') {
      R.deathT -= rdt;
      R.timeScale = 0.35;
      if (R.deathT <= 0) finish(false);
    }

    if (SA.Input.hit('KeyF') && R.state === 'play') { if (document.getElementById('colwin')) SA.UI.tabClose(); else if (!R.tabOpen) { if (R.nearCol) SA.UI.collectorOpen(); else if (R.nearRift && !R.arena) enterRift(R.nearRift); else if (R.arena && R.arena.won && !R.range) riftExit(); } }
    if (R.qf) for (const k in R.qf) R.qf[k] = R.qf[k] > 0 ? Math.max(0, R.qf[k] - rdt) : Math.min(0, R.qf[k] + rdt);
    if (R.state === 'play' && !R.tabOpen && !R.tut && !R.range && !document.getElementById('colwin')) {
      for (const q of SA.QUICK) if (SA.Input.hit('Digit' + q.n) || SA.Input.hit('Numpad' + q.n)) quickUse(q);
    }
    updateView(R, rdt);
    S.updatePlayer(R, dt, rdt);
    if (R.arena) arenaClamp(R); else zoneBlock(R);
    S.updateEnemies(R, dt);
    S.updateAllies(R, dt);
    S.updateBullets(R, dt);
    S.updateExtra(R, dt);
    updateItems(R, dt);
    if (R.range) {
      if (!R.arena) { P.x = U.clamp(P.x, 16, R.map.w - 16); P.y = U.clamp(P.y, 16, R.map.h - 16); }
      if (R.rangeGod) { P.hp = P.maxHp; } R.dmgLog = R.dmgLog.filter(d => R.t - d[0] < 5);
      if (R.arena) updateArena(R, dt, rdt);   // 연습장 보스전 (v0.106)
    }
    else if (R.tut) { updatePois(R, dt); SA.Tutorial.update(R, dt, rdt); }
    else if (R.arena) updateArena(R, dt, rdt);   // 균열 아레나: 출격 시간·침식·비콘·탈출이 멈춘다   // 튜토리얼: 침식·비콘·리스폰 없음, 대본대로
    else {
      updatePois(R, dt);
      updateCorrosion(R, R.tabOpen ? rdt : dt);   // Tab 중에는 시간이 멈추지만 침식은 흐른다
      updateExtraction(R, dt);
      updateExits(R, dt);
      ambientSpawns(R, dt);
      convoyRaids(R, dt);
    }

    for (const f of R.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; f.life -= dt; }
    R.fx = R.fx.filter(f => f.life > 0);
    SA.FX.update(R, dt);   // v0.114 이펙트
    for (const f of R.lostFx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; f.vy *= 0.96; f.rot += f.vr * dt; }   // 격추로 흩어지는 화물
    R.lostFx = R.lostFx.filter(f => f.life > 0);
    if (R.fx.length > 900) R.fx.splice(0, R.fx.length - 900);
    for (const t of R.texts) { t.y -= 18 * dt; t.life -= dt; }
    R.texts = R.texts.filter(t => t.life > 0);
    for (const r of R.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, 12 * dt); }
    R.rings = R.rings.filter(r => r.life > 0);
    for (const a of R.after) a.life -= dt;
    R.after = R.after.filter(a => a.life > 0);
    if (R.dialog && R.dialog.length) { if (!R.dialog[0].hold) R.dialog[0].life -= rdt; R.dialog[0].t = (R.dialog[0].t || 0) + rdt; if (R.dialog[0].life <= 0) R.dialog.shift(); }   // 대사창은 하나씩 차례로
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
    // v0.101: 자동 줍기 없음 — 바닥 아이템은 Tab 창의 「주변 바닥」에서만 줍는다. 버린 것은 life초 뒤 사라진다
    for (const it of R.items) {
      it.t += dt;
      it.vx *= 0.92; it.vy *= 0.92;
      if (it.life !== undefined && (it.life -= dt) <= 0) it.taken = true;
      it.x += it.vx * dt; it.y += it.vy * dt;
    }
    R.items = R.items.filter(it => !it.taken);
  };
  const itemState = (it) => { const o = {}; for (const k of ['ch', 'dur', 'lv', 'mod', 'awk']) if (it[k] !== undefined) o[k] = it[k]; return o; };   // 동력원 충전량 등은 줍고 버려도 유지
  // Tab 창의 「주변 바닥」에서 좌클릭: 화물칸 빈자리에 넣는다 (성공하면 true)
  const pickGround = (it, at) => {
    const R = SA.R, d = SA.ITEMS[it.id];
    const placed = SA.Grid.add(R.cargo, it.id, itemState(it));
    if (!placed) { SA.Audio.sfx('deny'); msg('화물칸에 자리가 없다', '#ffb3b3', 2); return false; }
    it.taken = true;
    if (it.x !== undefined) SA.FX.pickup(R, it.x, it.y, it.glow || '일반');   // v0.114 줍기 반짝임
    if (C().pm(R.player, 'p_magnet')) R.graze += 1;   // 행성 자력 수집기
    SA.Audio.sfx('pickup', d.val >= 150 ? 3 : d.val >= 60 ? 2 : 1);
    R.pickLog.push({ text: `+ ${d.kind === 'part' && it.lv ? SA.partName({ id: d.part, lv: it.lv, mod: it.mod }) : d.name}`, val: SA.itemVal(it), col: SA.itemCol(it.id, it), life: 3 });
    if (R.pickLog.length > 5) R.pickLog.shift();
    return true;
  };
  // 수집가 재고: 행성 설계도 · 행성 부품 · 특수 재료 (출격마다 새로)
  const collectorStock = () => {
    const CO = SA.COLLECTOR, st = [], sh = (a) => a.slice().sort(() => Math.random() - 0.5);
    for (const id of sh(Object.keys(SA.PLANET).filter(k => !SA.Bench.knowsPlanet(k))).slice(0, CO.pbp)) st.push({ kind: 'pbp', id: 'pbp_' + id, n: 1, price: Math.ceil(SA.ITEMS['pbp_' + id].val * CO.pbpMul) });
    for (const k of sh(PLANET_POOL()).slice(0, CO.part)) { const ex = { lv: 1, dur: SA.LV_MAX[1] }; st.push({ kind: 'part', id: 'pt_' + k, ex, n: 1, price: Math.ceil(SA.itemVal(Object.assign({ id: 'pt_' + k }, ex)) * CO.partMul) + CO.partAdd }); }
    for (const id of sh(CO.mats).slice(0, CO.matKinds)) st.push({ kind: 'mat', id, n: CO.matN[0] + Math.floor(Math.random() * (CO.matN[1] - CO.matN[0] + 1)), price: Math.ceil(SA.ITEMS[id].val * CO.matMul) });
    return st;
  };
  const collectorBuy = (st) => {
    const R = SA.R, prof = SA.profile;
    if (!st.n) return '품절';
    if (prof.credits < st.price) return '크레딧이 부족하다';
    if (!SA.Grid.add(R.cargo, st.id, st.ex ? Object.assign({}, st.ex) : undefined)) return '화물칸에 자리가 없다';
    prof.credits -= st.price; st.n--; SA.Save.store(prof);
    R.pickLog.push({ text: `+ ${st.ex ? SA.partName({ id: SA.ITEMS[st.id].part, lv: 1 }) : SA.ITEMS[st.id].name}`, val: st.price, col: SA.itemCol(st.id, st.ex), life: 3 }); if (R.pickLog.length > 5) R.pickLog.shift();
    SA.Audio.sfx('buy'); return null;
  };
  const collectorSell = (it, g) => {
    const prof = SA.profile, price = Math.ceil(SA.itemVal(it) * SA.COLLECTOR.buyMul);
    SA.Grid.remove(g, it.uid); prof.credits += price; SA.Save.store(prof); SA.Audio.sfx('buy');
    return price;
  };

  const updatePois = (R, dt) => {
    const P = R.player;
    for (const p of R.pois) {
      const d = Math.sqrt(U.d2(p.x, p.y, P.x, P.y));
      if (!p.seen && d < 380) { p.seen = true; if (p.type !== 'distress') C().text(R, p.x, p.y - 40, p.label, '#cfe3ff'); }
      if (p.type === 'collector') { R.nearCol = !P.dead && d < SA.COLLECTOR.r; continue; }
      if (p.type === 'rift') { R.nearRift = !P.dead && !p.closed && d < SA.RIFT.near ? p : null; continue; }
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
      for (const [id, pr] of LOOT.wreck) if (Math.random() < mm(id, pr) * (1 + grazeBonus()) * pity(id)) p.loot.push(id);
      if (R.stage >= 2 && Math.random() < 0.25) p.loot.push('crystal');   // 침식 3단계 이상: 잔해에 침식 결정
      while (p.loot.length < 2) p.loot.push('scrap');
      // 한 난파선에서 나오는 아이템은 마지막 보상까지 합쳐 최대 5개 (임시). 넘치면 값싼 것부터 뺀다
      const cap = SA.WRECK.maxItems - 1 - (p.blackbox || p.lumina ? 1 : 0);
      const cheap = (id) => { const d = SA.ITEMS[id]; return d ? d.val / (d.w * d.h) : 9999; };
      while (p.loot.length > cap) { let k = 0; for (let i = 1; i < p.loot.length; i++) if (cheap(p.loot[i]) < cheap(p.loot[k])) k = i; p.loot.splice(k, 1); }
      if (p.blackbox) p.loot.unshift('blackbox');
      if (p.lumina) p.loot.unshift('bb_lumina');
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
      if (id === 'bb_lumina') msg('기록 포드의 블랙박스 — 들고 탈출하라', '#ffe9a8', 4);
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
      if (p.type === 'locked') { codes()[code]--; for (const [id, pr] of SA.LOOT_LOCKED[p.grade]) if (Math.random() < mm(id, pr)) spawnItem(R, id, p.x, p.y, 90); }
      else for (const [id, pr] of SA.LOOT_SECURE) if (Math.random() < mm(id, pr)) spawnItem(R, id, p.x, p.y, 90);
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
      for (const [id, pr] of LOOT.distress) if (Math.random() < mm(id, pr)) spawnItem(R, id, p.x, p.y, 100);
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
        for (const it of R.cargo.items.slice()) { SA.Grid.remove(R.cargo, it.uid); if (SA.ITEMS[it.id].kind !== 'capsule') dropToSpace(it.id, it); else dropToSpace(it.id, null, true); }
        msg(`비상탈출 — 화물칸을 버렸다. ${E.emTime}초 버텨라 (보안 칸·장착 부품만 가져간다)`, '#ff8f3d', 6); SA.Audio.sfx('siren');
      }
    } else R.emHold = 0;
  };
  const updateExtraction = (R, dt) => {
    const P = R.player; R.inPort = Math.max(0, (R.inPort || 0) - dt);
    if (R.state !== 'play' || P.dead) return;
    for (const x of R.extracts) {
      if (!x.active) continue;
      const inside = U.d2(x.x, x.y, P.x, P.y) < SA.CFG.EXTRACT_R ** 2;
      if (inside) {
        R.inPort = 0.2;
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
  const ravenGiveUp = (e) => {   // 구역 밖으로 벗어난 플레이어를 놓아준다
    const R = SA.R; if (R.boss === e) { R.boss = null; R.bossEngaged = false; }
    if (!e.mimic) say('raven', '…여기까지만 쫓죠. 내 구역으로 돌아갑니다.');
    SA.Audio.play('raid');
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
    if (R.range && e.type === 'lumina' && R.arena) {   // 연습장 보스전: 보상 없이 잠깐 뒤 연습장으로
      R.arena.won = true; R.arena.winT = 2.8; R.boss = null; R.eb = []; R.player.invuln = 99; SA.Audio.stop();
      msg('연습 — 성운 나방 루미나 격추 (보상 없음)', '#ffe9a8', 4); return;
    }
    if (R.range) { R.boss = null; msg(`${(SA.ENEMIES[e.type] || {}).name || '허수아비'} 격추`, '#ffd166', 3); return; }
    if (e.type === 'raven') {
      R.ravenKilled = true;
      msg('레이븐 격추 — 탈출 포드를 화물칸(2×2)에 싣고 탈출하라', '#ffd166', 6);
      spawnItem(R, 'cap_raven', e.x, e.y, 20);
    }
    else if (e.type === 'mimic') msg('제국 실험 무인기 격추 — 비행 기록 칩', '#c08bff', 5);
    else if (e.type === 'lumina') { riftWin(e); return; }
    else { R.hunterKilled = true; msg('심연의 사냥꾼 격추', '#ffd166', 5); }
    R.boss = null;
    SA.Audio.play('raid');
  };

  // ── 균열 · 아레나 ──
  // 들어가면 바깥 맵(소행성·적·탄·아이템·POI…)을 통째로 얼려 두고, 화면 한 장 크기의 아레나로 바꾼다
  const WORLD = ['map', 'asteroids', 'astGrid', 'nebulas', 'pois', 'extracts', 'enemies', 'eb', 'pb', 'items', 'allies', 'bolts', 'beams', 'strikes', 'wells', 'zones'];
  const enterRift = (p, now, po = {}) => {   // now: 연습장 보스전 (두 번 누르기 생략) · po: { ph: 시작 페이즈, again: 다시 만난 루미나 }
    const R = SA.R, P = R.player, RF = SA.RIFT;
    if (!now && (!p.armT || R.t - p.armT > 3)) { p.armT = R.t; msg('공간 균열 — F를 한 번 더 누르면 들어간다. 들어가면 쉽게 나올 수 없다', '#d9b8ff', 3); SA.Audio.sfx('beep'); return; }
    const out = { px: P.x, py: P.y, zoom: R.zoom, zoomTarget: R.zoomTarget, boss: R.boss, rift: p };
    for (const k of WORLD) out[k] = R[k];
    R.outside = out;
    R.map = { w: RF.w, h: RF.h, name: '균열' };
    R.asteroids = []; R.astGrid = new Map(); R.pois = []; R.extracts = []; R.enemies = []; R.eb = []; R.pb = []; R.items = [];
    R.allies = []; R.bolts = []; R.beams = []; R.strikes = []; R.wells = []; R.zones = [];
    R.nebulas = [];   // v0.95: 뒷배경 그림이 대신한다
    P.x = RF.w / 2; P.y = RF.h - 40; P.vx = P.vy = 0; P.invuln = 2;
    R.zoom = R.zoomTarget = RF.zoom; R.nearRift = null; R.nearCol = false; R.bigMap = false;
    R.arena = { t: 0, hits: 0, bonus: 0, flash: 0.8 }; R.msgs = [];   // flash: 진입 흰빛 (v0.95)
    if (!R.range) { const lu = SA.profile.lumina = SA.profile.lumina || { wins: 0, tries: 0 }; lu.tries++; }   // 연습장 보스전은 기록에 넣지 않는다
    const e = C().spawnEnemy(R, 'lumina', RF.w / 2, -70, { awake: true });
    R.boss = e; SA.Lumina.init(R, e);
    if (po.ph) e.startPh = po.ph;
    if (po.again != null) e.again = !!po.again;
    C().fx(R, P.x, P.y, 40, '#d9b8ff', 160, 0.6, 2); R.shake = 10;
    SA.Audio.sfx('warp'); SA.Audio.play('lumina');   // 진입 대사 「…빛을 따라왔다.」는 이제 루미나의 파편 대사 lp1 (lumina.js)
  };
  const arenaClamp = (R) => {
    const P = R.player, m = 8;
    P.x = U.clamp(P.x, m, R.map.w - m); P.y = U.clamp(P.y, m, R.map.h - m); P.outside = false;
  };
  const updateArena = (R, dt, rdt) => {
    const A = R.arena; A.t += dt;
    const W = R.map.w, H = R.map.h;
    R.eb = R.eb.filter(b => b.x > -6 && b.y > -10 && b.x < W + 6 && b.y < H + 6);   // 아레나 밖으로 나간 탄은 바로 지운다
    if (A.won) {
      if (A.talk && SA.Input.hit('Space') && R.dialog && R.dialog.length) R.dialog.shift();   // 1막 엔딩 통신: Space로 한 줄씩 넘긴다
      if (R.range) { A.winT -= rdt; if (A.winT <= 0) riftBack(R, '연습 끝 — 연습장으로 돌아왔다'); }   // 연습장 보스전은 잠깐 뒤 자동으로 돌아간다
    }
  };
  // 연습장 보스전에서 나온다: 바깥(연습장)을 되살린다. 손실·보상·기록 없음
  const riftBack = (R, text) => {
    const P = R.player, o = R.outside; if (!o) return;
    for (const k of WORLD) R[k] = o[k];
    R.zoom = o.zoom; R.zoomTarget = o.zoomTarget; R.boss = o.boss;
    P.x = o.px; P.y = o.py; P.vx = P.vy = 0; P.dead = false; P.hp = P.maxHp; P.invuln = 1.5;
    R.arena = null; R.outside = null; R.state = 'play';
    C().fx(R, P.x, P.y, 40, '#d9b8ff', 160, 0.6, 2);
    SA.Audio.play('hangar');
    msg(text, '#cfe3ff', 4);
    if (SA.Main.rangeRedraw) SA.Main.rangeRedraw();
  };
  const practiceRift = (po = {}) => {   // 연습장 패널: 루미나 보스전 바로 들어가기
    const R = SA.R; if (!R || !R.range || R.arena || R.state !== 'play') return;
    R.rangeGod = !!po.god;
    enterRift({ type: 'rift', x: R.player.x, y: R.player.y, practice: true }, true, po);
  };
  const practiceExit = () => { const R = SA.R; if (R && R.range && R.arena) riftBack(R, '연습 — 균열에서 나왔다'); };
  // 격추 → 바깥 맵을 되살리고 들어간 자리로 튕겨 나온다. 장착 부품 내구도 -35, 체력 50%. 이 판 균열은 닫힌다
  const riftFail = () => {
    const R = SA.R, P = R.player, o = R.outside, RF = SA.RIFT;
    if (R.range) { riftBack(R, '연습 — 격추됐다 (손실 없음)'); return; }
    for (const k of WORLD) R[k] = o[k];
    R.zoom = o.zoom; R.zoomTarget = o.zoomTarget; R.boss = o.boss;
    o.rift.closed = true; o.rift.done = true;
    P.x = o.px; P.y = o.py; P.vx = P.vy = 0; P.dead = false;
    P.hp = Math.max(1, Math.round(P.maxHp * RF.outHp)); P.invuln = 2;
    const eq = [...new Set([...P.mains, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas, P.obs])].filter(Boolean);
    eq.forEach(p => { p.dur = Math.max(0, (p.dur || 0) - RF.durLoss); });
    R.arena = null; R.outside = null;
    C().fx(R, P.x, P.y, 50, '#d9b8ff', 200, 0.7, 2); R.shake = 14; R.hurtFlash = 0.5;
    SA.Audio.sfx('bigboom'); SA.Audio.play('raid');
    msg(`균열에서 튕겨 나왔다 — 장착 부품 내구도 -${RF.durLoss}. 균열이 닫혔다`, '#ffb3b3', 6);
    SA.Save.store(SA.profile);
  };
  // 루미나를 쓰러뜨렸다 → 보상 아이템이 루미나가 있던 자리에 떨어진다. 주워서(Tab) 화물칸에 싣고, 균열에서 나가야(F) 격납고로 돌아간다 (v0.110)
  const riftWin = (e) => {
    const R = SA.R, prof = SA.profile, RF = SA.RIFT, lu = prof.lumina = prof.lumina || { wins: 0, tries: 0 };
    const first = !lu.wins; lu.wins++;
    const rw = first ? RF.first : RF.again2, ids = [];
    for (const [id, n] of rw.items) for (let i = 0; i < n; i++) ids.push(id);
    if (first) ids.push('bb_lumina');   // 1막 엔딩: 루미나의 마지막 기록 (L2)
    ids.forEach((id, i) => spawnItem(R, id, e.x + (i % 3 - 1) * 8, e.y + 10, 95));
    const cr = rw.cr + (R.arena.bonus || 0); prof.credits += cr;   // 크레딧은 바로 들어온다
    R.luminaRes = `성운 나방 루미나 격추${first ? ' — 1막 완료' : ''} · ₵${cr}${R.arena.bonus ? ` (보너스 ₵${R.arena.bonus})` : ''}`;
    R.arena.won = true; R.arena.winT = 2.8; R.boss = null; R.eb = [];
    R.player.invuln = 99; SA.Audio.stop();
    msg('성운 나방 루미나 격추 — 떨어진 보상을 주워라 (Tab), 다 챙기면 F로 균열에서 나간다', '#ffe9a8', 7);
    if (first) {   // 1막 엔딩: 보스 맵에서 통신 몇 줄 (Space로 한 줄씩)
      msg('블랙박스 회수 — 균열 속 기록', '#ffe9a8', 5);
      say('serena', '처리했나. 기록은 왕국으로 넘겨. 다른 데 흘리면 곤란해져.');
      say('mina', '…그 사람이에요. 제가 고치던 기체의.');
      say('dan', '…균열이 하나뿐이면 좋겠군.');
      R.arena.talk = true;
    }
    C().fx(R, e.x, e.y, 120, '#ffe9a8', 260, 1.2, 2.5);
    SA.Save.store(prof);
  };
  // 균열에서 나가기: 바닥에 보상이 남았으면 한 번 더 확인한다. 나가면 출격 성공으로 정산된다
  const riftExit = () => {
    const R = SA.R, A = R && R.arena; if (!A || !A.won || R.range || R.finished) return;
    const left = R.items.filter(it => !it.taken).length;
    if (left && (!A.exitArm || R.t - A.exitArm > 3)) { A.exitArm = R.t; msg(`바닥에 아이템 ${left}개가 남았다 — F를 한 번 더 누르면 놓고 나간다`, '#ffd166', 3); SA.Audio.sfx('beep'); return; }
    if (left && R.t - A.exitArm < 0.4) return;   // 같은 키 입력이 여러 프레임에 걸쳐 확인으로 넘어가지 않게
    finish(true);
  };

  const playerDied = () => {
    const R = SA.R;
    if (R.state !== 'play') return;
    if (R.arena && !R.arena.won) { riftFail(); return; }   // 균열 안에서 격추: 내구도를 잃고 튕겨 나온다
    R.state = 'dying'; R.deathT = 1.3; R.player.dead = true;
    SA.Audio.sfx('bigboom');
    for (const it of (R.cargo.items || []).slice(0, 16)) {   // 실은 화물이 사방으로 흩어진다 (잃는다는 것이 눈에 보이게)
      const a = Math.random() * 6.28, s = U.rnd(170, 300);
      R.lostFx.push({ id: it.id, x: R.player.x, y: R.player.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: 0, vr: U.rnd(-6, 6), life: 1.3, max: 1.3 });
    }
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
    let lost = ok ? [] : R.cargo.items.filter(it => !isCap(it));
    if (!ok && lost.length && C().pm(R.player, 'p_vault') && SA.Grid.value(R.cargo) >= 2000) {   // 행성 금고 장갑: 가장 비싼 화물 1개를 지킨다
      const keep = lost.slice().sort((a, b) => SA.itemVal(b) - SA.itemVal(a))[0]; lost = lost.filter(x => x !== keep); brought.push(keep);
    }
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
        if (mode === 'recover') prof.lostCache = { parts: eqParts, items: lost.map(it => ({ id: it.id, ch: it.ch })), cell: P.cell && P.cell.id, cellCh: P.cell && P.cell.e / SA.ITEMS[P.cell.id].cap, at: Date.now() };
      }
      // 주무기가 하나도 안 남으면 용병단 비상 지급 펄스건 (내구도 60)
      if (!prof.parts.some(p => SA.PARTS[p.id].slot === 'main')) { const np = SA.Save.newPart('pulse'); np.dur = 60; prof.parts.push(np); const l = prof.loadouts[prof.ship]; if (l && !l.main) l.main = np.uid; R.giftPulse = true; }
    }
    if (cellBack) { const cx = { ch: U.clamp(P.cell.e / SA.ITEMS[P.cell.id].cap, 0, 1) }; if (!SA.Grid.add(prof.stash, P.cell.id, cx)) prof.credits += SA.itemVal({ id: P.cell.id, ch: cx.ch }); }   // 장착 동력원은 쓴 만큼 줄어든 채 창고로
    // 회수 잔해를 들고 탈출했으면 되찾는다
    let recovered = null;
    if (ok && R.recovered) {
      const c = R.recovered; prof.parts.push(...c.parts);
      for (const it of c.items) if (!SA.Grid.add(prof.stash, it.id, it.ch !== undefined ? { ch: it.ch } : undefined)) prof.credits += SA.itemVal(it);
      if (c.cell) { const cx = c.cellCh !== undefined ? { ch: c.cellCh } : undefined; if (!SA.Grid.add(prof.stash, c.cell, cx)) prof.credits += SA.itemVal({ id: c.cell, ch: c.cellCh }); }
      recovered = `잔해 회수 완료 — 부품 ${c.parts.length}개, 화물 ${c.items.length}개를 되찾았다`;
    }
    let overflow = 0, partsIn = [];
    for (const it of brought) {
      const d = SA.ITEMS[it.id];
      if (d.kind === 'part') { const np = SA.Save.fromItem(it); prof.parts.push(np); partsIn.push(SA.partName(np)); continue; }   // 부품 완성품 → 부품함
      if (!SA.Grid.add(prof.stash, it.id, it.ch !== undefined ? { ch: it.ch } : undefined)) overflow += SA.itemVal(it);
    }   // 동력원은 쓴 만큼 줄어든 채로 창고에 들어간다
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
    // 파일럿 숙련도·기록 (v0.74)
    let mastery = null;
    { const pid = R.player.pilot, M = SA.MASTERY; prof.pstats = prof.pstats || {};
      const ps = prof.pstats[pid] = Object.assign({ raids: 0, ext: 0, deaths: 0, cr: 0, graze: 0, kills: 0, boss: 0, t: 0, score: 0, best: 0 }, prof.pstats[pid] || {});
      const kt = R.killTypes || {}, boss = SA.MASTERY_BOSS.reduce((a, k) => a + (kt[k] || 0), 0);
      ps.raids++; ps.t += R.t; ps.graze += R.grazeN || 0; ps.kills += R.kills; ps.boss += boss;
      if (ok) {
        ps.ext++; ps.cr += value; ps.best = Math.max(ps.best, value);
        const before = SA.masteryRank(ps.score).i;
        const gain = Math.round(M.extract + value * M.perCr + (R.grazeN || 0) * M.perGraze + R.kills * M.perKill + boss * M.boss);
        ps.score += gain; mastery = { pid, gain, up: SA.masteryRank(ps.score).i > before }; if (mastery.up) { const r = SA.masteryRank(ps.score); prof.rankUp = { pid, i: r.i, name: r.name }; }
      } else ps.deaths++;
    }
    prof.seenTips = true;
    SA.Save.store(prof);
    // 메인퀘스트 (지금 목표에만 센다)
    const cnt = (id) => brought.filter(it => it.id === id).length;
    if (ok) { SA.Quest.event('extract'); SA.Quest.event('blackbox', cnt('blackbox')); SA.Quest.event('lumbox', cnt('bb_lumina')); }
    SA.Quest.event('crystal', cnt('crystal'));
    SA.Quest.sync();
    SA.Main.showResult({ ok, brought, lost, value, overflow, time: R.t, kills: R.kills, graze: R.graze, corr: R.corr, ravenKilled: R.ravenKilled, pilot: R.player.pilot, rescued: rescuedMsgs, lostCaps, lostPart, ravenFled: R.ravenFled, repMsgs, mode, lostAll, recovered, giftPulse: R.giftPulse, emergency: R.emergency, partsIn, decoded: dec && dec.text, lumina: R.luminaRes });
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
    if (R.arena) return;   // 균열 아레나: 시야 배율·지도·안개 고정
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
    else if (it.id === 'accel') { R.corr = Math.min(100, R.corr + 25); msg('침식 촉진제 사용 — 침식 +25%', '#d58cff'); }
    else if (it.id === 'stardata') { R.fog.fill(1); for (const p of R.pois) p.seen = true; msg('성구 데이터 — 구역 지도가 모두 밝혀졌다 (M: 큰 지도)', '#a8c8ff', 4); }
    else if (it.id === 'repairkit') { if (P.hp >= P.maxHp) return false; P.hp = Math.min(P.maxHp, P.hp + 40); msg('수리킷 사용 — 체력 +40', '#9df07f'); }
    else return false;
    SA.Grid.remove(from, it.uid);
    SA.Audio.sfx('repair');
    return true;
  };
  // 단축키 1·2·3: 화물칸에서 해당 소모품을 찾아 바로 쓴다 (헛쓰기는 막는다)
  const quickUse = (q) => {
    const R = SA.R, P = R.player, it = R.cargo.items.find(x => x.id === q.id), nm = SA.ITEMS[q.id].name;
    R.qf = R.qf || {};
    if (!it) { msg(`${nm}이(가) 없다`, '#ffb3b3', 1.5); SA.Audio.sfx('deny'); R.qf[q.id] = -0.35; return; }
    if (q.id === 'repairkit' && P.hp >= P.maxHp) { msg('체력이 가득 차 있다', '#ffb3b3', 1.5); SA.Audio.sfx('deny'); return; }
    if (q.id === 'canister' && R.corr <= 0) { msg('침식이 없다', '#ffb3b3', 1.5); SA.Audio.sfx('deny'); return; }
    if (q.id === 'accel' && R.corr >= 100) { msg('이미 침식이 최대다', '#ffb3b3', 1.5); SA.Audio.sfx('deny'); return; }
    if (useItem(it, R.cargo)) R.qf[q.id] = 0.4;
  };
  const dropToSpace = (id, src, keep) => {
    const R = SA.R, P = R.player, d = SA.ITEMS[id], t = SA.itemTier(id, src);
    const it = { id, x: P.x + U.rnd(-14, 14), y: P.y + 22, vx: 0, vy: 40, full: false, t: 0 };
    for (const k of ['ch', 'dur', 'lv', 'mod', 'awk']) if (src && src[k] !== undefined) it[k] = src[k];
    if (!keep) it.life = (t && t !== '일반') || d.val >= 150 ? SA.CFG.DROP_LIFE_HI : SA.CFG.DROP_LIFE;   // 버린 것은 낮은 등급 3초 · 높은 등급 5초 뒤 사라진다 (임시)
    R.items.push(it);
    SA.Audio.sfx('drop');
  };
  const nearbyGround = (r = 90) => {
    const R = SA.R, P = R.player; r *= 1 + C().pv(P, 'magnet');   // 자력 수집기: 주변 바닥 범위 확대
    return R.items.filter(it => !it.taken && U.d2(it.x, it.y, P.x, P.y) < r * r);
  };

  return { LOOT, start, spawnDummy, practiceRift, practiceExit, update, msg, collectorBuy, collectorSell, say, pickGround, dropLoot, spawnItem, playerDied, bossEngaged, bossKilled, ravenGiveUp, ravenFlee, ravenFled, allyDown, convoyArrived, finish, useItem, dropToSpace, nearbyGround, grazeBonus, grazeDmg, queueRespawn, hunterWake, beaconBroken, fogged };
})();
