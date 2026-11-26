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
    { const S = prof.stats; (prof.mqLog = prof.mqLog || []).push({ id: q.id, min: Math.round((S.tPlay || 0) / 60), raids: S.raids }); }   // 플레이 시간 측정 (v0.73)
    st.i++; st.p = 0;
    let bpMsg = '';
    if (q.bp) {   // 초반 퀘스트 보상: 일반 설계도. 이미 아는 제작법이면 설계도 판매가만큼 크레딧으로
      const nm = SA.PARTS[q.bp].name;
      if (prof.recipes.includes(q.bp)) { prof.credits += SA.ITEMS['bp_' + q.bp].val; bpMsg = `이미 아는 설계도 「${nm}」 — 판매 ₵${SA.ITEMS['bp_' + q.bp].val}`; }
      else { prof.recipes.push(q.bp); bpMsg = `설계도 획득: ${nm} — 작업대에서 제작 가능`; }
    }
    SA.Save.store(prof);
    const T = (m, c, d) => setTimeout(() => SA.Hangar.toast(m, c), d);
    T(`메인 목표 완료: ${q.text}${q.reward ? ' — ₵' + q.reward : ''}`, '#5dffb0', 0);
    if (q.line) T(q.line, '#cfe3ff', 600);
    if (q.line2) T(q.line2, '#cfe3ff', 1800);
    if (bpMsg) T(bpMsg, '#ffd166', q.line2 ? 3000 : 1200);
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
  const rewardText = () => { const { q } = cur(); return q && q.bp ? ` · 보상 설계도: ${SA.PARTS[q.bp].name}` : q && q.rescue ? ' · 보상: 테오 합류(작업대 강화 의뢰) + 강화 합금 2 · 양자 회로 1' : ''; };
  // 1막 진행: 몇 번째 단계인지 (actEnd 전까지가 한 막)
  const prog = () => { const M = SA.STORY.main, end = M.findIndex(x => x.actEnd), i = (SA.profile.mq || {}).i || 0; return { n: Math.min(i + 1, end), total: end, done: i >= end }; };
  const tag = () => { const g = prog(); return g.done ? '메인 · 1막 완료' : `메인 1막 · ${g.n}/${g.total}`; };
  // 마우스 올리면 뜨는 1막 단계 목록 (끝낸 것 ✓ · 지금 강조 · 마지막은 보스)
  const listHtml = () => {
    const M = SA.STORY.main, end = M.findIndex(x => x.actEnd), i = (SA.profile.mq || {}).i || 0;
    const short = (t) => t.replace(/\s*\([^)]*\)/g, '').split(' — ')[0];
    return '<b>1막 메인 퀘스트</b><br>' + M.slice(0, end).map((x, k) => {
      const nm = x.id === 'mL' ? '보스: 루미나 — 출격 맵의 보라색 균열' : short(x.text);
      return k < i ? `<span class="dim">✓ ${k + 1}. ${nm}</span>` : k === i ? `<span style="color:#ffd166">▶ ${k + 1}. ${nm}</span>` : `<span style="color:#8f9bb8">· ${k + 1}. ${nm}</span>`;
    }).join('<br>');
  };
  return { event, label, rewardText, cur, sync, ravenCaught, prog, tag, listHtml };
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
      for (const id of ['alloy', 'alloy', 'qcircuit']) if (!SA.Grid.add(p.stash, id)) p.credits += SA.ITEMS[id].val;   // 테오의 선물: 펄스건 행성 강화(2연장 등)에 딱 맞는 재료
      msg += ' — 테오가 합류했다. 작업대 강화 의뢰가 열렸다 (작업대 → 작업대 단계 탭). 선물: 강화 합금 2 · 양자 회로 1'; SA.Contracts.sync();
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
  const counted = () => active().filter(c => !c.auto);   // 테오 의뢰(auto)는 수주 한도에 안 센다
  const canClaim = (c) => {
    const s = st(c.id); if (!s.accepted || s.done) return false;
    if (c.type === 'deliver') return Object.keys(c.mats).every(k => SA.Grid.count(prof().stash, k) >= c.mats[k]);
    return s.progress >= (c.need || 1);
  };
  const accept = (id) => {
    if (counted().length >= SA.REP.maxActive) return `동시에 ${SA.REP.maxActive}개까지 수주할 수 있다.`;
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
    if (c.reward.bench) { const got = SA.Bench.setLv(c.reward.bench); rep += ` · ${SA.BENCH.name[c.reward.bench]} — 새 설계도 ${got.length}장`; }
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
      if (c.type === 'wing' && R.wingC === c.id && !R.wingFail && (c.goal === 'escort' ? R.convoyDone : R.hunterKilled)) s.progress = 1;
    }
    // 진영 학살: 한 판에 같은 진영을 너무 많이 격추하면 그 진영 호감도 하락
    const M = SA.REP.massacre, out = [];
    for (const [f, pre] of [['kingdom', 'k_'], ['empire', 'e_']]) {
      let n = 0; for (const t in (R.killTypes || {})) if (t.startsWith(pre)) n += R.killTypes[t];
      if (n > M.free) { const pen = Math.min(M.max, Math.ceil((n - M.free) / M.per)); prof().rep[f] -= pen; out.push(`${FAC[f]} 함선 ${n}기 격추 — ${FAC[f]} 호감도 -${pen}`); }
    }
    return out;
  };
  const open = (c) => !c.req || c.req(prof());   // 조건이 안 된 의뢰는 게시판에 안 보인다
  // 이번 출격에 함께 갈 윙맨 의뢰 (수주한 것 중 먼저 것 하나)
  const wingActive = () => active().find(c => c.type === 'wing') || null;
  const sync = () => {
    for (const c of SA.STORY.contracts) if (c.auto && open(c)) { const s = st(c.id); if (!s.done && !s.accepted) s.accepted = true; }
    for (const c of active()) if (c.type === 'raven' && prof().raven.done) st(c.id).progress = 1;
  };
  // 지금 기울어진 진영 (동점이면 마지막으로 의뢰를 끝낸 진영, 아무것도 안 했으면 null)
  const lean = () => { const r = prof().rep; return r.kingdom > r.empire ? 'kingdom' : r.empire > r.kingdom ? 'empire' : (r.last || null); };
  return { FAC, open, wingActive, st, def, active, counted, canClaim, accept, abandon, claim, onRaid, sync, lean };
})();

// 작업대 단계: 단계마다 설계도를 지급하고 강화 등급 제작 · 행성/은하 강화를 연다
SA.Bench = (() => {
  const lv = () => SA.profile.benchLv || 1;
  const grant = (ids) => {
    const p = SA.profile, got = [];
    for (const r of ids) if (SA.RECIPES[r] && !p.recipes.includes(r)) { p.recipes.push(r); (p.newRecipes = p.newRecipes || []).push(r); got.push(r); }
    return got;
  };
  const setLv = (n) => {
    const p = SA.profile, was = lv(); p.benchLv = Math.max(was, n);
    for (let i = was + 1; i <= p.benchLv; i++) p.pbpPick = (p.pbpPick || 0) + (SA.BENCH.pick[i] || 0);   // 행성 설계도 고르기
    let got = [];
    for (let i = 1; i <= p.benchLv; i++) got = got.concat(grant(SA.BENCH.give[i] || []));
    for (let i = 0; i < (SA.BENCH.bonusBp[n] || 0); i++) {
      const unk = SA.BP_POOL['강화'].filter(r => !p.recipes.includes(r));
      if (unk.length) got = got.concat(grant([unk[Math.floor(Math.random() * unk.length)]]));
    }
    if (got.length) p.bpMiss = 0;
    SA.Save.store(p);
    return got;
  };
  const canTier = (t) => t === '일반' || lv() >= 2;      // 강화 등급 제작
  const needFor = (toLv) => toLv === 1 ? 2 : 99;        // 행성은 2단계 (은하는 따로 제작)
  const canUp = (toLv) => lv() >= needFor(toLv);
  const knowsPlanet = (id) => (SA.profile.planetBp || []).includes(id);
  const grantPlanet = (id) => { const p = SA.profile; if (!SA.PLANET[id] || knowsPlanet(id)) return false; p.planetBp.push(id); (p.newRecipes = p.newRecipes || []).push('pl:' + id); return true; };
  const contract = (n) => SA.STORY.contracts.find(c => c.reward && c.reward.bench === n);
  return { lv, setLv, grant, canTier, canUp, needFor, contract, knowsPlanet, grantPlanet };
})();

// 필요 재료: 고정한 제작 목표 · 수주한 납품 의뢰 · 아는 제작법. 칸 표시와 툴팁에 쓴다
SA.Need = (() => {
  const nm = (id) => (SA.PARTS[id] || SA.ITEMS[id] || {}).name || id;
  const matsOf = (id) => (SA.RECIPES[id] || SA.CRAFT[id] || {}).mats || null;
  const map = () => {
    const p = SA.profile, out = {};
    const add = (id, use) => { const o = out[id] = out[id] || { mark: null, uses: [] }; o.uses.push(use); if (use.mark === 'pin' || (use.mark === 'q' && o.mark !== 'pin')) o.mark = use.mark; };
    const pm = p.pin && matsOf(p.pin);
    if (pm) for (const k in pm) add(k, { t: '제작 목표: ' + nm(p.pin), n: pm[k], mark: 'pin' });
    for (const c of SA.Contracts.active()) if (c.type === 'deliver') for (const k in c.mats) add(k, { t: '의뢰: ' + c.title, n: c.mats[k], mark: 'q' });
    const crafts = {};
    for (const r of p.recipes) { const m = matsOf(r); if (m) for (const k in m) (crafts[k] = crafts[k] || []).push(nm(r)); }
    for (const id in SA.CRAFT) for (const k in SA.CRAFT[id].mats) (crafts[k] = crafts[k] || []).push(nm(id));
    for (const k in crafts) add(k, { t: '제작: ' + crafts[k].slice(0, 3).join(', ') + (crafts[k].length > 3 ? ` 외 ${crafts[k].length - 3}` : ''), n: 0 });
    return out;
  };
  const have = (id) => { let n = SA.Grid.count(SA.profile.stash, id); const R = SA.R; if (R && !R.range) { if (R.cargo) n += SA.Grid.count(R.cargo, id); if (R.secure) n += SA.Grid.count(R.secure, id); } return n; };
  const tipHtml = (id, M) => {
    const o = (M || map())[id]; if (!o) return '';
    return '<div class="needtip">' + o.uses.map(u => `<div class="${u.mark || ''}">${u.t}${u.n ? ` — ${u.n}개 필요 (보유 ${have(id)})` : ''}</div>`).join('') + '</div>';
  };
  // 고정 목표 한 줄: [이름, 재료 문구, 다 모았나]
  const pinLine = () => {
    const p = SA.profile, m = p.pin && matsOf(p.pin); if (!m) return null;
    const ks = Object.keys(m), done = ks.every(k => have(k) >= m[k]);
    return [nm(p.pin), ks.map(k => `${nm(k)} ${Math.min(have(k), m[k])}/${m[k]}`).join(' · '), done];
  };
  return { map, tipHtml, pinLine, have, matsOf };
})();
