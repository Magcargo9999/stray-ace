// 메인 브리핑 (v0.112): 격납고 위쪽 대사 띠에서 한 줄씩. 클릭/Space = 다음, Esc = 전부 건너뛰기, 자동 진행 없음.
// 순서: 방금 끝난 목표의 완료 대사 → 새 목표의 브리핑 (한 번만, prof.briefSeen). 다시 보기는 해독기의 「작전 일지」.
// 줄 형식: [화자 키, 대사, 꼬리표?]  (화자는 SA.SPEAKERS)
SA.Brief = (() => {
  let cur = null, el = null, ov = null;
  const P = () => SA.profile;
  const hangarOn = () => { const e = document.getElementById('hangar'); return !!e && e.style.display === 'block'; };
  const spk = (w) => SA.SPEAKERS[w] || { name: w, color: '#cfe3ff' };
  const portrait = (w, s) => {
    if (s.noPortrait) return `<span class="por ini" style="--c:${s.color}">?</span>`;
    const src = s.portrait || `assets/portrait_${w}.png`;
    return `<img class="por" src="${src}" onerror="this.outerHTML='<span class=&quot;por ini&quot; style=&quot;--c:${s.color}&quot;>${s.name[0]}</span>'">`;
  };
  const draw = () => {
    const [w, text, tag] = cur.lines[cur.i], s = spk(w);
    el.innerHTML = `${portrait(w, s)}<div class="tx"><b style="color:${s.color}">${s.name}</b>${tag ? ` <span class="dim small">· ${tag}</span>` : ''}<div>${text}</div><div class="bhint">클릭/Space: 다음 · Esc: 건너뛰기 · ${cur.i + 1}/${cur.lines.length}</div></div>`;
  };
  const onKey = (e) => {
    if (!cur) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.code === 'Escape') end(true);
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') next();
  };
  const start = (lines, opt = {}) => {
    if (cur || !lines || !lines.length) return false;
    if (SA.HangarScene && SA.HangarScene.hush) SA.HangarScene.hush();
    cur = { lines, i: 0, onEnd: opt.onEnd };
    ov = document.createElement('div'); ov.id = 'brief-ov'; ov.onclick = next;
    el = document.createElement('div'); el.id = 'brief-strip'; el.className = 'hg-bubble'; el.onclick = next;
    document.body.appendChild(ov); document.body.appendChild(el);
    window.addEventListener('keydown', onKey, true);
    draw(); SA.Audio.sfx('tick');
    return true;
  };
  const next = () => { if (!cur) return; SA.Audio.sfx('click'); if (++cur.i >= cur.lines.length) end(false); else draw(); };
  const end = (skipped) => {
    if (!cur) return;
    const f = cur.onEnd; cur = null;
    window.removeEventListener('keydown', onKey, true);
    if (el) el.remove(); if (ov) ov.remove(); el = ov = null;
    if (f) f(skipped);
    if (SA.Hangar && SA.Hangar.hud) SA.Hangar.hud();
  };
  // 지금 보여 줄 수 있는 때인가: 격납고가 떠 있고, 창·안내·연출이 없을 때
  const idle = () => hangarOn() && !cur && P() && P().tutDone && P().hgGuide && !SA.Hangar.isPanelOpen() && SA.HangarScene && !SA.HangarScene.guideOn() && !SA.HangarScene.isAnim();
  // 순서: 끝난 목표들의 완료 대사 → 지금 목표의 브리핑(처음일 때만)
  const build = (peek) => {
    const p = P(), M = SA.STORY.main, seq = [];
    for (const id of p.pendDone || []) { const q = M.find(x => x.id === id); if (q) seq.push(...(q.done || [])); }
    const { q } = SA.Quest.cur();
    p.briefSeen = p.briefSeen || {};
    if (q && q.brief && !p.briefSeen[q.id]) seq.push(...briefOf(q));
    if (!peek) { p.pendDone = []; if (q) p.briefSeen[q.id] = true; SA.Save.store(p); }
    return seq;
  };
  // 조난 신호 목표: 일반 설계도가 모자라면 한 줄 더 (b-mR-0)
  const briefOf = (q) => {
    if (!q.briefLow || SA.Rescue.bpCount() >= SA.RESCUE.teoBp) return q.brief;
    const b = q.brief.slice(); b.splice(b.length - 1, 0, q.briefLow); return b;
  };
  const hasPending = () => { const p = P(); if (!p || !p.tutDone) return false; const { q } = SA.Quest.cur(); return !!((p.pendDone || []).length || (q && q.brief && !(p.briefSeen || {})[q.id])); };
  const pump = () => {
    if (!hangarOn() || !hasPending()) return false;
    // 토스트(보상 알림)가 다 사라진 뒤에 띠를 띄운다. 창·안내·연출 중이면 잠시 뒤 다시 본다
    if (!idle() || document.querySelector('#toasts .toast')) { if (!cur) clearTimeout(pump.t), pump.t = setTimeout(pump, 700); return false; }
    return start(build(false));
  };
  // 작전 일지에서 다시 보기: 그 목표의 브리핑 + (끝났으면) 완료 대사. 기록은 건드리지 않는다
  const replay = (id) => {
    const M = SA.STORY.main, k = M.findIndex(x => x.id === id), q = M[k], i = (P().mq || {}).i || 0;
    if (!q || cur) return;
    start([...(q.brief ? briefOf(q) : []), ...(k < i ? q.done || [] : [])]);
  };
  return { start, pump, replay, active: () => !!cur, hasPending, idle };
})();
