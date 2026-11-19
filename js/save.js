// 프로필 저장 (localStorage). 저장이 막힌 환경에서도 게임은 돌아간다.
SA.Save = (() => {
  const KEY = 'strayace_profile_v1';
  let partSeq = 1;
  const newPart = (id) => ({ uid: 'p' + Date.now().toString(36) + (partSeq++), id, dur: 100, max: 100 });

  const fresh = () => {
    const parts = ['pulse', 'mg', 'purge', 'magnet'].map(newPart);   // 시작 지급은 이것뿐, 나머지는 제작
    const by = (id, n = 0) => parts.filter(p => p.id === id)[n].uid;
    return {
      credits: 200,
      stash: SA.Grid.make(SA.CFG.STASH_W, SA.CFG.STASH_H),
      ships: ['hex'],
      parts,
      loadouts: {
        hex: { main: by('pulse'), sub: [by('mg')], act: [by('purge')], pas: [by('magnet')] },
      },
      pilots: { kai: { injury: 0 }, mina: { injury: 0 } },
      pilot: 'kai', ship: 'hex',
      recipes: SA.START_RECIPES.slice(),
      contracts: {},           // id -> { progress, done }
      logs: [],                // 해독한 블랙박스 인덱스
      stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, bestValue: 0 },
      settings: { music: 0.5, sfx: 0.7 },
      seenTips: false,
      bpMiss: 0,              // 새 설계도 없이 출격한 횟수 (불운 보정)
      deliv: { slot: -1, stock: [] },   // 배달 상점 재고 (20분마다 교체)
      bring: {},              // 이번 출격에 가져갈 소모품 개수
      rescued: { teo: false, deliv: false },   // 조난 구조로 연 시설 (테오: 강화 제작, 도리: 배달 상점)
      resc: { escapes: 0, pity: 0, pending: null },   // 구조 신호 상태: 직전 구조 후 탈출 수, 불운 보정, 아직 못 구한 신호
      rescMig: true,
    };
  };

  // 예전 세이브 정리: 사라진 아이템(연료 전지 등)은 판매가로 환불, 모르는 부품·제작법은 뺀다
  const LEGACY = { fuel: 60 };
  const migrate = (p) => {
    for (const it of p.stash.items.slice()) if (!SA.ITEMS[it.id]) { p.credits += LEGACY[it.id] || 0; SA.Grid.remove(p.stash, it.uid); }
    p.parts = p.parts.filter(q => SA.PARTS[q.id]);
    p.recipes = p.recipes.filter(r => SA.RECIPES[r]);
    for (const r of ['pulse', 'mg']) if (!p.recipes.includes(r)) p.recipes.push(r);   // 기본 두 개는 항상 안다
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
    return p;
  };
  const load = () => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) { const j = JSON.parse(s), p = Object.assign(fresh(), j); p.rescMig = !!j.rescMig; return migrate(p); }
    } catch (e) { console.warn('save load failed', e); }
    return fresh();
  };
  const store = (p) => {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* shortcut: 저장 불가 환경(일부 미리보기)은 세션 동안만 유지 */ }
  };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} return fresh(); };

  return { load, store, reset, newPart };
})();
