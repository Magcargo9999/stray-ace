// 격자 인벤토리 모델 (화물칸·보안 칸·창고 공용). DOM과 무관한 순수 로직.
SA.Grid = (() => {
  let uidSeq = 1;
  const newUid = () => 'i' + (uidSeq++) + '_' + Math.floor(Math.random() * 1e6);

  const make = (w, h, items = []) => ({ w, h, items });
  const dims = (it) => {
    const d = SA.ITEMS[it.id];
    return it.rot ? [d.h, d.w] : [d.w, d.h];
  };
  const fits = (g, id, x, y, rot, ignoreUid) => {
    const d = SA.ITEMS[id];
    const w = rot ? d.h : d.w, h = rot ? d.w : d.h;
    if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
    for (const it of g.items) {
      if (it.uid === ignoreUid) continue;
      const [iw, ih] = dims(it);
      if (x < it.x + iw && x + w > it.x && y < it.y + ih && y + h > it.y) return false;
    }
    return true;
  };
  const findSpot = (g, id) => {
    const d = SA.ITEMS[id];
    const rots = d.w === d.h ? [0] : [0, 1];
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        for (const r of rots) if (fits(g, id, x, y, r)) return { x, y, rot: r };
    return null;
  };
  const add = (g, id, extra) => {
    const s = findSpot(g, id);
    if (!s) return null;
    const it = Object.assign({ uid: newUid(), id, x: s.x, y: s.y, rot: s.rot }, extra || {});
    g.items.push(it);
    return it;
  };
  const place = (g, it, x, y, rot) => {
    if (!fits(g, it.id, x, y, rot, it.uid)) return false;
    remove(g, it.uid);
    it.x = x; it.y = y; it.rot = rot;
    g.items.push(it);
    return true;
  };
  const remove = (g, uid) => {
    const i = g.items.findIndex(it => it.uid === uid);
    return i >= 0 ? g.items.splice(i, 1)[0] : null;
  };
  // 큰 것부터 다시 채운다. 다 못 넣으면 원래대로 둔다.
  const autoSort = (g) => {
    const sorted = g.items.slice().sort((a, b) => {
      const A = SA.ITEMS[a.id], B = SA.ITEMS[b.id];
      return (B.w * B.h - A.w * A.h) || (B.val - A.val) || a.id.localeCompare(b.id);
    });
    const tmp = make(g.w, g.h);
    for (const it of sorted) {
      const s = findSpot(tmp, it.id);
      if (!s) return false;
      tmp.items.push(Object.assign({}, it, s));
    }
    g.items = tmp.items;
    return true;
  };
  const used = (g) => g.items.reduce((n, it) => n + SA.ITEMS[it.id].w * SA.ITEMS[it.id].h, 0);
  const value = (g) => g.items.reduce((n, it) => n + SA.ITEMS[it.id].val, 0);
  const count = (g, id) => g.items.filter(it => it.id === id).length;
  const takeMats = (g, mats) => {
    for (const k in mats) if (count(g, k) < mats[k]) return false;
    for (const k in mats) for (let i = 0; i < mats[k]; i++) remove(g, g.items.find(it => it.id === k).uid);
    return true;
  };

  // 자체 점검 (Ponytail: 비자명한 로직엔 작은 확인)
  const selfTest = () => {
    const g = make(3, 3);
    console.assert(add(g, 'debris') && add(g, 'core'), 'grid: add');           // 2x3 + 1x2
    console.assert(add(g, 'scrap') && !add(g, 'engine'), 'grid: full check');   // 남은 1칸
    console.assert(used(g) === 9, 'grid: used');
    const r = make(3, 1); console.assert(add(r, 'wire') && add(r, 'scrap') && !add(r, 'scrap'), 'grid: row');
    const s = make(2, 3); add(s, 'scrap'); add(s, 'scrap'); add(s, 'core');
    console.assert(autoSort(s) && s.items.length === 3, 'grid: autosort');
    const t = make(1, 2); console.assert(add(t, 'wire') && t.items[0].rot === 1, 'grid: auto-rotate');
  };
  selfTest();

  return { make, dims, fits, findSpot, add, place, remove, autoSort, used, value, count, takeMats, newUid };
})();
