// 프로필 저장 (localStorage). 저장이 막힌 환경에서도 게임은 돌아간다.
SA.Save = (() => {
  const KEY = 'strayace_profile_v1';
  let partSeq = 1;
  const newPart = (id) => ({ uid: 'p' + Date.now().toString(36) + (partSeq++), id, dur: 100, max: 100 });

  const fresh = () => {
    const parts = ['pulse', 'mg', 'mg', 'missile', 'purge', 'magnet'].map(newPart);
    const by = (id, n = 0) => parts.filter(p => p.id === id)[n].uid;
    return {
      credits: 200,
      stash: SA.Grid.make(SA.CFG.STASH_W, SA.CFG.STASH_H),
      ships: ['hex'],
      parts,
      loadouts: {
        hex: { main: by('pulse'), sub: [by('mg'), by('mg', 1)], act: [by('missile'), by('purge')], pas: [by('magnet')] },
      },
      pilots: { kai: { injury: 0 }, mina: { injury: 0 } },
      pilot: 'kai', ship: 'hex',
      recipes: SA.START_RECIPES.slice(),
      contracts: {},           // id -> { progress, done }
      logs: [],                // 해독한 블랙박스 인덱스
      stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, bestValue: 0 },
      settings: { music: 0.5, sfx: 0.7 },
      seenTips: false,
      bring: {},              // 이번 출격에 가져갈 소모품 개수
    };
  };

  const load = () => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return Object.assign(fresh(), JSON.parse(s));
    } catch (e) { console.warn('save load failed', e); }
    return fresh();
  };
  const store = (p) => {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* shortcut: 저장 불가 환경(일부 미리보기)은 세션 동안만 유지 */ }
  };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} return fresh(); };

  return { load, store, reset, newPart };
})();
