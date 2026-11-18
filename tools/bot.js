// 밸런스 봇: 페이지 안에서 SA.Raid.update를 직접 돌린다 (렌더 없음, 고정 dt)
window.BOT = (() => {
  const U = SA.U, keys = new Set(), hits = new Set();
  SA.Input.isDown = (k) => keys.has(k);
  SA.Input.hit = (k) => hits.has(k);
  const st = { goal: null, stuckT: 0, lastX: 0, lastY: 0, wander: 0, wa: 0, leaveAt: 0 };

  const start = (opt) => {
    SA.Main.startRaid();
    const R = SA.R; R.paused = false;
    st.leaveAt = opt.leaveAt || U.rnd(120, 240); st.goal = null; st.stuckT = 0; st.wander = 0;
    SA.Input.mouse.down = true;
  };

  const think = (R) => {
    const P = R.player;
    keys.clear(); hits.clear();
    // 목표: 체력 낮음/오래 있음/화물 가득 → 탈출, 아니면 가까운 미탐색 POI
    const full = SA.Grid.used(R.cargo) >= R.cargo.w * R.cargo.h - 1;
    const leave = R.t > st.leaveAt || P.hp < P.maxHp * 0.35 || full || R.stage >= 2;
    let goal;
    if (leave) goal = R.extracts.filter(x => x.active).sort((a, b) => U.d2(a.x, a.y, P.x, P.y) - U.d2(b.x, b.y, P.x, P.y))[0];
    else {
      const items = R.items.filter(it => !it.full && U.d2(it.x, it.y, P.x, P.y) < 200 * 200);
      goal = items[0] || R.pois.filter(p => !p.done && p.type !== 'turrets' && p.type !== 'nest' && p.type !== 'patrol').sort((a, b) => U.d2(a.x, a.y, P.x, P.y) - U.d2(b.x, b.y, P.x, P.y))[0]
        || R.extracts.filter(x => x.active)[0];
    }
    let gx = goal.x - P.x, gy = goal.y - P.y; const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    if (gl < 20) { gx = 0; gy = 0; }
    // 회피: 가까운 적 탄 반발
    let ax = 0, ay = 0, danger = 0;
    for (const b of R.eb) {
      const dx = P.x - b.x, dy = P.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 > 70 * 70) continue;
      const toward = -(dx * b.vx + dy * b.vy) > 0 ? 1 : 0.3, w = toward * 900 / (d2 + 30);
      // 탄 진행 방향의 수직으로 피한다
      const px = -b.vy, py = b.vx, s = (px * dx + py * dy) > 0 ? 1 : -1, pl = Math.hypot(px, py) || 1;
      ax += (px / pl * s * 0.7 + dx / Math.sqrt(d2 + 1) * 0.3) * w; ay += (py / pl * s * 0.7 + dy / Math.sqrt(d2 + 1) * 0.3) * w;
      if (d2 < 22 * 22) danger++;
    }
    // 적과 거리 유지
    const near = R.enemies.filter(e => !e.dead && !e.crate && U.d2(e.x, e.y, P.x, P.y) < 320 * 320);
    for (const e of near) { const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { ax += dx / d * 1.2; ay += dy / d * 1.2; } }
    // 막힘 감지
    st.stuckT += 1 / 30;
    if (st.stuckT > 1.5) { if (U.d2(P.x, P.y, st.lastX, st.lastY) < 15 * 15) { st.wander = 1; st.wa = Math.random() * 6.28; } st.stuckT = 0; st.lastX = P.x; st.lastY = P.y; }
    if (gl < 60) st.wander = 0;
    if (st.wander > 0) { st.wander -= 1 / 30; gx = Math.cos(st.wa); gy = Math.sin(st.wa); }
    const mx = gx + ax, my = gy + ay;
    if (mx > 0.3) keys.add('KeyD'); if (mx < -0.3) keys.add('KeyA');
    if (my > 0.3) keys.add('KeyS'); if (my < -0.3) keys.add('KeyW');
    // 조준: 가장 가까운 적 (없으면 상자)
    const tgt = near.sort((a, b) => U.d2(a.x, a.y, P.x, P.y) - U.d2(b.x, b.y, P.x, P.y))[0]
      || R.enemies.filter(e => e.crate && U.d2(e.x, e.y, P.x, P.y) < 200 * 200)[0];
    if (tgt) { R.mouseWorld.x = tgt.x; R.mouseWorld.y = tgt.y; }
    else { R.mouseWorld.x = P.x + gx * 100; R.mouseWorld.y = P.y + gy * 100; }
    SA.Input.mouse.down = !!tgt;
    // 액티브·기술
    if (near.length && tgt && U.d2(tgt.x, tgt.y, P.x, P.y) < 200 * 200) { if (Math.random() < 0.05) hits.add('KeyQ'); if (Math.random() < 0.05) hits.add('KeyE'); }
    if (danger >= 2) hits.add('Space');
    // 소모품: 체력 낮으면 수리킷
    if (P.hp < P.maxHp * 0.4) { for (const g of [R.cargo, R.secure]) { const k = g.items.find(i => i.id === 'repairkit'); if (k) { SA.Raid.useItem(k, g); break; } } }
  };

  // n초 진행. 끝나면 결과 반환
  const run = (sec) => {
    const R = SA.R, dt = 1 / 60; R.paused = false;
    for (let i = 0; i < sec * 60; i++) {
      if (!SA.R || SA.R !== R || R.finished) break;
      if (i % 2 === 0) think(R);
      if (R.state === 'extracting') { SA.Raid.finish(true); break; }
      SA.Raid.update(dt);
      hits.clear();
    }
    R.paused = !R.finished;
    return { done: R.finished, t: R.t, hp: R.player.hp, kills: R.kills, corr: R.corr, state: R.state, cargo: SA.Grid.value(R.cargo) };
  };
  return { start, run, keys };
})();
