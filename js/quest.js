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
    return q.ev ? `${q.text} (${Math.min(st.p, q.need)}/${q.need})` : q.text;
  };
  const event = (ev, n = 1) => {
    const prof = SA.profile, { q, st } = cur();
    if (!q || q.ev !== ev || n <= 0) return;
    st.p += n;
    if (st.p < q.need) { SA.Save.store(prof); return; }
    prof.credits += q.reward;
    st.i++; st.p = 0;
    let ticketMsg = '';
    if (q.onDone === 'ravenJoins' && !prof.pilots.raven) {   // 레이븐 고용권: 창고에서 쓰면 합류. 창고가 가득 차 있으면 바로 합류시킨다
      if (SA.Grid.add(prof.stash, 'raven_ticket')) ticketMsg = '레이븐 고용권을 받았다 — 창고에서 사용하면 합류한다';
      else { prof.pilots.raven = { injury: 0 }; ticketMsg = '창고가 가득 차 레이븐이 바로 합류했다 — 파일럿으로 고를 수 있다'; }
    }
    let bpMsg = '';
    if (q.bp) {   // 초반 퀘스트 보상: 일반 설계도. 이미 아는 제작법이면 설계도 판매가만큼 크레딧으로
      const nm = SA.PARTS[q.bp].name;
      if (prof.recipes.includes(q.bp)) { prof.credits += SA.ITEMS['bp_' + q.bp].val; bpMsg = `이미 아는 설계도 「${nm}」 — 판매 ₵${SA.ITEMS['bp_' + q.bp].val}`; }
      else { prof.recipes.push(q.bp); bpMsg = `설계도 획득: ${nm} — 작업대에서 제작 가능`; }
    }
    SA.Save.store(prof);
    SA.Hangar.toast(`메인 목표 완료: ${q.text} — ₵${q.reward}`, '#5dffb0');
    if (q.line) setTimeout(() => SA.Hangar.toast(q.line, '#cfe3ff'), 600);
    if (bpMsg) setTimeout(() => SA.Hangar.toast(bpMsg, '#ffd166'), 1200);
    if (ticketMsg) setTimeout(() => SA.Hangar.toast(ticketMsg, '#ffd166'), 1200);
  };
  const rewardText = () => { const { q } = cur(); return q && q.bp ? ` · 보상 설계도: ${SA.PARTS[q.bp].name}` : q && q.rescue ? ' · 보상: 테오 합류(강화 등급 제작 해금) + 트윈 펄스 설계도' : ''; };
  return { event, label, rewardText, cur };
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
