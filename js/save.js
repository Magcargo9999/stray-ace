// 프로필 저장 (localStorage). 저장이 막힌 환경에서도 게임은 돌아간다.
// 장착 칸 uid 전부 (주무기 2 · 서브 · 액티브 · 패시브 · 관측)
SA.loUids = (l) => [l.main, l.main2, ...(l.sub || []), ...(l.act || []), ...(l.pas || []), l.obs].filter(Boolean);
SA.Save = (() => {
  const KEY = 'strayace_profile_v1';
  let partSeq = 1;
  const newPart = (id) => ({ uid: 'p' + Date.now().toString(36) + (partSeq++), id, dur: 100, max: 100 });
  // 필드에서 주운 부품 완성품 아이템 → 부품 (행성 개조 등 유지)
  const fromItem = (it) => {
    const d = SA.ITEMS[it.id], np = newPart(d.part);
    if (it.lv) { np.lv = it.lv; np.max = SA.LV_MAX[it.lv]; }
    if (it.mod) np.mod = it.mod; if (it.awk) np.awk = it.awk;
    np.dur = Math.min(np.max, it.dur !== undefined ? it.dur : 60);
    return np;
  };
  // 부품 등급 개편 (v0.41): 없어진 부품 → 그 계열 행성급 + 개조 [기준 부품, 등급, 개조, 각성]
  const TIER_CONV = { twin: ['pulse', 1, 'm_twin'], shard: ['scatter', 1, 'm_frag'], crusher: ['scatter', 1, 'm_crush'], rail: ['lance', 1, 'm_pierce'], breaker: ['lance', 1, 'm_cut'],
    plating2: ['plating', 1], obs2: ['obs1', 1], obs3: ['obs1', 2, null, 'hunter'], gzcharge: ['mg', 1, 's_graze'], convert: ['purge', 1, 'a_conv'], slowfield: ['deflect', 0] };
  const tierMig = (p) => {
    for (const q of p.parts) {
      const c = TIER_CONV[q.id]; if (!c) continue;
      const lost = 100 - (q.max || 100), r = q.max ? q.dur / q.max : 1;
      q.id = c[0]; q.lv = c[1]; if (c[2]) q.mod = c[2]; if (c[3]) q.awk = c[3];
      q.max = Math.max(40, SA.LV_MAX[q.lv] - lost); q.dur = Math.round(q.max * r);
    }
    for (const old in TIER_CONV) { const i = p.recipes.indexOf(old); if (i >= 0) { p.recipes.splice(i, 1); if (!p.recipes.includes(TIER_CONV[old][0])) p.recipes.push(TIER_CONV[old][0]); } }
    for (const it of p.stash.items) {
      const k = it.id.slice(3), c = TIER_CONV[k]; if (!c) continue;
      if (it.id.startsWith('pt_')) { it.id = 'pt_' + c[0]; if (c[1]) it.lv = c[1]; if (c[2]) it.mod = c[2]; if (c[3]) it.awk = c[3]; }
      else if (it.id.startsWith('bp_')) { if (SA.ITEMS['bp_' + c[0]] && !p.recipes.includes(c[0])) it.id = 'bp_' + c[0]; else { p.credits += 200; it.id = '__gone'; } }
    }
    p.stash.items = p.stash.items.filter(it => it.id !== '__gone');
    for (const s in p.loadouts) { const l = p.loadouts[s]; if (l.cell && !SA.ITEMS[l.cell]) l.cell = 'cell1'; }
  };

  const fresh = () => {
    const parts = ['pulse', 'mg', 'purge', 'magnet'].map(newPart);   // 시작 지급은 이것뿐, 나머지는 제작
    const by = (id, n = 0) => parts.filter(p => p.id === id)[n].uid;
    const stash = SA.Grid.make(SA.CFG.STASH_W, SA.CFG.STASH_H);
    for (let i = 0; i < 3; i++) SA.Grid.add(stash, 'cell1');   // 시작 동력원 3개 (장착 1 + 예비 2)
    return {
      credits: 200,
      stash,
      ships: ['hex'],
      parts,
      loadouts: {
        hex: { main: by('pulse'), main2: null, sub: [by('mg')], act: [by('purge')], pas: [by('magnet')], obs: null, cell: 'cell1' },
      },
      pilots: { kai: { injury: 0 }, mina: { injury: 0 } },
      pilot: 'kai', ship: 'hex',
      recipes: SA.START_RECIPES.slice(),
      contracts: {},           // id -> { progress, done }
      logs: [],                // 해독한 블랙박스 인덱스
      stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, bestValue: 0 },
      settings: { music: 0.5, sfx: 0.7 },
      seenTips: false, tierMig: true, tutDone: false,
      newRecipes: [],         // 새로 등록돼 작업대에서 아직 안 본 설계도
      bpMiss: 0,              // 새 설계도 없이 출격한 횟수 (불운 보정)
      deliv: { slot: -1, stock: [] },   // 배달 상점 재고 (20분마다 교체)
      bring: {},              // 이번 출격에 가져갈 소모품 개수
      rescued: { teo: false, deliv: false },   // 조난 구조로 연 시설 (테오: 강화 제작, 도리: 배달 상점)
      resc: { escapes: 0, pity: 0, pending: null },   // 구조 신호 상태: 직전 구조 후 탈출 수, 불운 보정, 아직 못 구한 신호
      rescMig: true,
      cellMig: true,
      raven: { stage: 0, done: false },   // 0: 둥지 첫 대결 · 1: 도주 후 재대결 · done: 포드 들고 탈출
      rep: { kingdom: 0, empire: 0, last: null },   // 진영 호감도
      route: null,            // 1막 끝에서 정해지는 2막 진영 루트
    };
  };

  // 예전 세이브 정리: 사라진 아이템(연료 전지 등)은 판매가로 환불, 모르는 부품·제작법은 뺀다
  const LEGACY = { fuel: 60 };
  const migrate = (p) => {
    // 블랙박스 개편 (v0.42): 기록 번호 → id, 신호 1개 → 여러 개, 맡기기 1개 → 목록
    if (p.logs.some(x => typeof x === 'number')) p.logs = [...new Set(p.logs.map(x => typeof x === 'number' ? ['k1', 'r1', 'k2'][x] : x).filter(Boolean))];
    if (p.signal !== undefined) { if (p.signal !== null) p.signals = (p.signals || []).concat([p.signal]); delete p.signal; }
    if (p.decoding && !Array.isArray(p.decoding)) p.decoding = [p.decoding];
    if (p.lastDecode && typeof p.lastDecode.log === 'object') p.lastDecode = null;
    if (!p.tierMig) { p.tierMig = true; tierMig(p); }
    for (const it of p.stash.items.slice()) if (!SA.ITEMS[it.id]) { p.credits += LEGACY[it.id] || 0; SA.Grid.remove(p.stash, it.uid); }
    p.parts = p.parts.filter(q => SA.PARTS[q.id]);
    p.recipes = p.recipes.filter(r => SA.RECIPES[r]);
    for (const r of ['pulse', 'mg', 'obs1']) if (!p.recipes.includes(r)) p.recipes.push(r);   // 기본 제작법은 항상 안다 (광역 관측기는 v0.40부터)
    for (const id in p.bring) if (!SA.ITEMS[id]) delete p.bring[id];
    // 조난 구조 도입 전 세이브: 테오·도리는 다시 구조해야 한다(이미 쌓은 메인퀘스트는 유지)
    p.rescued = Object.assign({ teo: false, deliv: false }, p.rescued || {});
    p.resc = Object.assign({ escapes: 0, pity: 0, pending: null }, p.resc || {});
    if (!p.rescMig) {
      p.rescMig = true;
      const ri = SA.STORY.main.findIndex(q => q.rescue);
      if (p.mq && p.mq.i >= ri) p.mq.i++;   // 새로 끼워 넣은 구조 퀘스트 칸만큼 밀어 진행도를 지킨다
    }
    for (const it of p.stash.items.slice()) if (SA.ITEMS[it.id].kind === 'capsule') SA.Grid.remove(p.stash, it.uid);
    // 레이븐 3단계·의뢰 수주 도입 전 세이브
    p.raven = Object.assign({ stage: 0, done: false }, p.raven || {});
    if (p.pilots.raven) { p.raven.done = true; p.raven.stage = 1; }
    p.rep = Object.assign({ kingdom: 0, empire: 0, last: null }, p.rep || {});
    for (const id in p.contracts) {
      const c = p.contracts[id], d = SA.STORY.contracts.find(x => x.id === id);
      if (!d) { delete p.contracts[id]; continue; }
      if (c.accepted === undefined) { c.accepted = !c.done && c.progress > 0 && d.type !== 'raven'; if (d.type === 'raven' && !c.done) c.progress = 0; }
    }
    // 동력원·주무기 2칸 도입 전 세이브: 칸을 채우고 시작 동력원을 준다
    if (!p.cellMig) {
      p.cellMig = true;
      for (const s in p.loadouts) { const l = p.loadouts[s]; if (l.main2 === undefined) l.main2 = null; if (l.obs === undefined) l.obs = null; if (!l.cell) l.cell = 'cell1'; }
      for (let i = 0; i < 3; i++) if (!SA.Grid.add(p.stash, 'cell1')) p.credits += SA.ITEMS.cell1.val;
    }
    return p;
  };
  const load = () => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) { const j = JSON.parse(s), p = Object.assign(fresh(), j); p.rescMig = !!j.rescMig; p.cellMig = !!j.cellMig; p.tierMig = !!j.tierMig; p.tutDone = j.tutDone !== undefined ? !!j.tutDone : !!((j.stats && j.stats.raids > 0) || j.deathModeSet); return migrate(p); }   // 이미 하던 세이브는 튜토리얼을 건너뛴다
    } catch (e) { console.warn('save load failed', e); }
    return fresh();
  };
  const store = (p) => {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* shortcut: 저장 불가 환경(일부 미리보기)은 세션 동안만 유지 */ }
  };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} return fresh(); };

  return { load, store, reset, newPart, fromItem };
})();
