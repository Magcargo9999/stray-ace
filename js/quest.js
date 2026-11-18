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
    SA.Save.store(prof);
    SA.Hangar.toast(`메인 목표 완료: ${q.text} — ₵${q.reward}`, '#5dffb0');
    if (q.line) setTimeout(() => SA.Hangar.toast(q.line, '#cfe3ff'), 600);
    if (q.onDone === 'ravenJoins') setTimeout(() => SA.Hangar.toast('레이븐이 용병단에 합류했다 — 파일럿으로 고를 수 있다', '#ffd166'), 1200);
  };
  return { event, label };
})();
