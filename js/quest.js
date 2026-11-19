// 메인퀘스트 진행: 이벤트가 들어오면 지금 목표에만 센다.
SA.Quest = (() => {
  const cur = () => {
    const p = SA.profile; p.mq = p.mq || { i: 0, p: 0 };
    return { q: SA.STORY.main[p.mq.i], st: p.mq };
  };
  const label = () => {
    const { q, st } = cur(); if (!q) return '';
    return q.ev ? `${q.text} (${Math.min(st.p, q.need)}/${q.need})` : q.text;
  };
  const event = (ev, n = 1) => {
    const prof = SA.profile, { q, st } = cur();
    if (!q || q.ev !== ev || n <= 0) return;
    st.p += n;
    if (st.p < q.need) { SA.Save.store(prof); return; }
    prof.credits += q.reward;
    st.i++; st.p = 0;
    if (q.onDone === 'ravenJoins' && !prof.pilots.raven) prof.pilots.raven = { injury: 0 };
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
    if (q.onDone === 'ravenJoins') setTimeout(() => SA.Hangar.toast('레이븐이 용병단에 합류했다 — 파일럿으로 고를 수 있다', '#ffd166'), 1200);
  };
  const rewardText = () => { const { q } = cur(); return q && q.bp ? ` · 보상 설계도: ${SA.PARTS[q.bp].name}` : ''; };
  return { event, label, rewardText };
})();
