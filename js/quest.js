// 메인퀘스트 진행: 이벤트가 들어오면 지금 목표에만 센다.
SA.Quest = (() => {
  const cur = () => {
    const p = SA.profile; p.mq = p.mq || { i: 0, p: 0 };
    return { q: SA.STORY.main[p.mq.i], st: p.mq };
  };
  const label = () => {
    const { q, st } = cur(); if (!q) return '';
    if (q.rescue) {
      const n = SA.Rescue.bpCount(), need = SA.RESCUE.teoBp;
      return n < need ? `일반 설계도 모으기 (${n}/${need}) — 모으면 정비사의 조난 신호가 잡힌다` : '정비사의 조난 신호 — 미니맵 표시로 가서 10초 버틴 뒤 탈출';
    }
    if (q.raven) return SA.profile.raven.stage < 1 ? '레이븐 둥지에서 레이븐을 몰아붙이기 (체력 30%가 되면 도주한다)' : '도주한 레이븐과 재대결 — 격추 후 탈출 포드를 싣고 탈출';
    if (q.actEnd) { const r = SA.profile.route || SA.Contracts.lean(); return `${q.text} · 2막 루트: ${r ? SA.Contracts.FAC[r] : '미정 (진영 의뢰를 완료하면 정해진다)'}`; }
    return q.ev ? `${q.text} (${Math.min(st.p, q.need)}/${q.need})` : q.text;
  };
  const event = (ev, n = 1) => {
    const { q, st } = cur();
    if (!q || q.ev !== ev || n <= 0) return;
    st.p += n;
    if (st.p < q.need) { SA.Save.store(SA.profile); return; }
    complete(q);
    sync();
  };
  // 지금 목표를 완료 처리하고 보상을 준다
  const complete = (q) => {
    const prof = SA.profile, st = prof.mq;
    prof.credits += q.reward;
    st.i++; st.p = 0;
    let bpMsg = '';
    if (q.bp) {   // 초반 퀘스트 보상: 일반 설계도. 이미 아는 제작법이면 설계도 판매가만큼 크레딧으로
      const nm = SA.PARTS[q.bp].name;
      if (prof.recipes.includes(q.bp)) { prof.credits += SA.ITEMS['bp_' + q.bp].val; bpMsg = `이미 아는 설계도 「${nm}」 — 판매 ₵${SA.ITEMS['bp_' + q.bp].val}`; }
      else { prof.recipes.push(q.bp); bpMsg = `설계도 획득: ${nm} — 작업대에서 제작 가능`; }
    }
    SA.Save.store(prof);
    const T = (m, c, d) => setTimeout(() => SA.Hangar.toast(m, c), d);
    T(`메인 목표 완료: ${q.text} — ₵${q.reward}`, '#5dffb0', 0);
    if (q.line) T(q.line, '#cfe3ff', 600);
    if (bpMsg) T(bpMsg, '#ffd166', 1200);
  };
  // 미리 해 둔 목표(레이븐 포획·테오 구조)는 차례가 오면 바로 완료. 1막 끝에서 2막 루트를 정한다.
  const sync = () => {
    const prof = SA.profile;
    for (let g = 0; g < 10; g++) { const { q } = cur(); if (!q || !q.check || !q.check(prof)) break; complete(q); }
    const { q } = cur();
    if (q && q.actEnd && !prof.route) { prof.route = SA.Contracts.lean(); SA.Save.store(prof); }
    SA.Contracts.sync();
  };
  // 레이븐의 탈출 포드를 들고 탈출: 붙잡았다 → 고용권
  const ravenCaught = () => {
    const prof = SA.profile; prof.raven.done = true;
    let m = '레이븐을 붙잡았다';
    if (!prof.pilots.raven) {
      if (SA.Grid.add(prof.stash, 'raven_ticket')) m += ' — 레이븐 고용권을 받았다. 창고에서 사용하면 합류한다';
      else { prof.pilots.raven = { injury: 0 }; m += ' — 창고가 가득 차 레이븐이 바로 합류했다'; }
    }
    SA.Save.store(prof);
    return m;
  };
  const rewardText = () => { const { q } = cur(); return q && q.bp ? ` · 보상 설계도: ${SA.PARTS[q.bp].name}` : q && q.rescue ? ' · 보상: 테오 합류(강화 등급 제작 해금) + 트윈 펄스 설계도' : ''; };
  return { event, label, rewardText, cur, sync, ravenCaught };
})();

// 조난 구조: 한 판 최대 1개의 신호. 누구를 구할지는 여기서 정한다.
SA.Rescue = (() => {
  const R = () => SA.RESCUE;
  const prof = () => SA.profile;
  const bpCount = () => prof().recipes.filter(r => SA.PARTS[r] && SA.PARTS[r].tier === '일반' && !SA.START_RECIPES.includes(r)).length;
  const rescueIdx = () => SA.STORY.main.findIndex(q => q.rescue);
  const teoOpen = () => { const p = prof(); p.mq = p.mq || { i: 0, p: 0 }; return !p.rescued.teo && p.mq.i >= rescueIdx() && bpCount() >= R().teoBp; };
  const valid = (id) => id === 'teo' ? !prof().rescued.teo : id === 'deliv' ? !prof().rescued.deliv : !prof().pilots[id];
  // 출격할 때 한 번 부른다. 못 구한 신호(pending)는 다음 출격에도 그대로 뜬다.
  const plan = () => {
    const p = prof(), r = p.resc, C = R();
    if (r.pending && valid(r.pending)) return r.pending;
    r.pending = null;
    let id = null;
    if (teoOpen()) id = 'teo';
    else if (p.rescued.teo && !p.rescued.deliv) id = 'deliv';
    else if (p.rescued.teo) {
      const left = C.pilots.filter(valid);
      if (left.length && r.escapes >= C.pilotEscapes) {
        if (Math.random() < Math.min(1, C.chance0 + C.chanceUp * r.pity)) { id = left[Math.floor(Math.random() * left.length)]; r.pity = 0; }
        else r.pity++;
      }
    }
    r.pending = id; SA.Save.store(p);
    return id;
  };
  const onEscape = () => { prof().resc.escapes++; };
  // 캡슐을 들고 탈출했을 때 구조 확정. 안내 문장을 돌려준다.
  const complete = (id) => {
    const p = prof(), t = R().targets[id], r = p.resc;
    r.pending = null; r.escapes = 0; r.pity = 0;
    let msg = `${t.name} 구조 완료`;
    if (id === 'teo') {
      p.rescued.teo = true;
      const dup = p.recipes.includes('twin');
      if (dup) p.credits += SA.ITEMS.bp_twin.val; else p.recipes.push('twin');
      msg += ` — 테오가 합류했다. 작업대에서 강화 등급 제작 가능, ${dup ? '트윈 펄스 설계도는 이미 알아서 ₵' + SA.ITEMS.bp_twin.val : '트윈 펄스 설계도 획득'}`;
      SA.Quest.event('rescue');
    } else if (id === 'deliv') { p.rescued.deliv = true; msg += ' — 상점 탭에서 재료 배달이 열렸다'; }
    else { p.pilots[id] = { injury: 0 }; msg += ' — 파일럿으로 고를 수 있다'; }
    SA.Save.store(p);
    return msg;
  };
  return { plan, onEscape, complete, bpCount, teoOpen };
})();

// 의뢰 게시판: 수주(동시 3개) → 진행 → 보상. 진영 호감도.
SA.Contracts = (() => {
  const FAC = { kingdom: '왕국', empire: '제국', neutral: '중립' };
  const RIVAL = { kingdom: 'empire', empire: 'kingdom' };
  const prof = () => SA.profile;
  const st = (id) => (prof().contracts[id] = prof().contracts[id] || { accepted: false, progress: 0, done: false });
  const def = (id) => SA.STORY.contracts.find(c => c.id === id);
  const active = () => SA.STORY.contracts.filter(c => { const s = prof().contracts[c.id]; return s && s.accepted && !s.done; });
  const canClaim = (c) => {
    const s = st(c.id); if (!s.accepted || s.done) return false;
    if (c.type === 'deliver') return Object.keys(c.mats).every(k => SA.Grid.count(prof().stash, k) >= c.mats[k]);
    return s.progress >= (c.need || 1);
  };
  const accept = (id) => {
    if (active().length >= SA.REP.maxActive) return `동시에 ${SA.REP.maxActive}개까지 수주할 수 있다.`;
    const s = st(id); s.accepted = true; s.progress = 0; sync(); SA.Save.store(prof()); return '';
  };
  const abandon = (id) => { const s = st(id); s.accepted = false; s.progress = 0; SA.Save.store(prof()); };
  // 호감도: 의뢰 진영 +gain, 반대 진영 -loss. 중립은 영향 없음
  const claim = (id) => {
    const c = def(id), s = st(id), p = prof();
    if (!canClaim(c)) return null;
    if (c.type === 'deliver') SA.Grid.takeMats(p.stash, c.mats);
    s.done = true;
    p.credits += c.reward.credits;
    if (c.reward.item) SA.Grid.add(p.stash, c.reward.item);
    let rep = '';
    if (RIVAL[c.fac]) {
      p.rep[c.fac] += SA.REP.gain; p.rep[RIVAL[c.fac]] -= SA.REP.loss; p.rep.last = c.fac;
      rep = ` · ${FAC[c.fac]} 호감도 +${SA.REP.gain}, ${FAC[RIVAL[c.fac]]} -${SA.REP.loss}`;
    }
    SA.Save.store(p);
    return rep;
  };
  // 출격 정산: 수주한 의뢰만 센다 (탈출했을 때만)
  const onRaid = (R) => {
    for (const c of active()) {
      const s = st(c.id);
      if (c.type === 'extract') s.progress++;
      if (c.type === 'kill') for (const t in (R.killTypes || {})) if (t.startsWith(c.target)) s.progress += R.killTypes[t];
    }
  };
  const sync = () => { for (const c of active()) if (c.type === 'raven' && prof().raven.done) st(c.id).progress = 1; };
  // 지금 기울어진 진영 (동점이면 마지막으로 의뢰를 끝낸 진영, 아무것도 안 했으면 null)
  const lean = () => { const r = prof().rep; return r.kingdom > r.empire ? 'kingdom' : r.empire > r.kingdom ? 'empire' : (r.last || null); };
  return { FAC, st, def, active, canClaim, accept, abandon, claim, onRaid, sync, lean };
})();
