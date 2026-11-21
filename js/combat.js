// 전투: 플레이어 조작, 무기, 적 AI·탄막 패턴, 충돌, 그레이즈.
SA.U = {
  rnd: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  d2: (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by),
  ang: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  angDiff: (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
};

SA.Combat = (() => {
  const U = SA.U;
  // 부품 내구도 효율: 50% 이상이면 100%, 0~50%면 50~100%, 0이면 정지
  const eff = (part) => {
    if (!part) return 0;
    const d = part.dur / part.max;
    return d >= 0.5 ? 1 : d <= 0 ? 0 : 0.5 + d;
  };
  const wear = (part, amt) => { if (part) part.dur = Math.max(0, part.dur - amt); };
  const hasPas = (P, id) => P.pas.some(p => p && p.id === id && eff(p) > 0);

  // ── 탄 ──
  const eb = (R, x, y, a, spd, o = {}) => {
    if (R.eb.length >= SA.CFG.MAX_ENEMY_BULLETS) return;
    R.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 3, dmg: o.dmg || 10,
      col: o.col || '#ff5d8f', life: o.life || 7, grazed: false, acc: o.acc || 0, big: (o.r || 3) >= 6 });
  };
  const ring = (R, x, y, n, spd, off = 0, o) => { for (let i = 0; i < n; i++) eb(R, x, y, off + i / n * Math.PI * 2, spd, o); };
  const fan = (R, x, y, a, n, spread, spd, o) => {
    for (let i = 0; i < n; i++) eb(R, x, y, a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), spd, o);
  };
  const pb = (R, x, y, a, spd, dmg, o = {}) => {
    R.pb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, life: o.life || 1.1, pierce: o.pierce || 0,
      hit: o.pierce ? new Set() : null, col: o.col || '#bfe9ff', w: o.w || 1.6, homing: o.homing || 0, target: null, missile: !!o.missile,
      main: !!o.main, frag: o.frag || 0, close: !!o.close, erase: !!o.erase, mine: o.mine || 0, aoe: o.aoe || 0, flame: !!o.flame });
  };

  // ── 효과 ──
  const fx = (R, x, y, n, col, spd = 80, life = 0.5, size = 2) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
      R.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.8), max: life, col, size });
    }
  };
  const text = (R, x, y, s, col = '#fff') => R.texts.push({ x, y, s, col, life: 1.1 });

  // ── 레이븐 슬립스트림 이동 AI ──
  // 0.5초 앞까지 탄 궤적을 예측해 17개 방향(정지 포함) 중 고른다: 충돌 경로는 크게 감점, 스침 범위를 지나는 경로는 가점.
  // 피격은 어차피 무효라 AI는 '아슬아슬한 연출'과 스침 스택 수집을 맡는다.
  const SLIP_DIRS = [[0, 0]]; for (let i = 0; i < 16; i++) SLIP_DIRS.push([Math.cos(i / 8 * Math.PI), Math.sin(i / 8 * Math.PI)]);
  const slipSteer = (R, P, spd, dt) => {
    P.slipAiT = (P.slipAiT || 0) - dt;
    if (P.slipAiT > 0 && P.slipDir) return P.slipDir;
    P.slipAiT = 0.08;
    const G = SA.CFG.GRAZE_R * 2, home = P.slipHome || { x: P.x, y: P.y };
    const near = R.eb.filter(b => U.d2(b.x, b.y, P.x, P.y) < 240 * 240).slice(0, 160);
    let best = SLIP_DIRS[0], bestS = -Infinity;
    for (const dir of SLIP_DIRS) {
      let s = 0;
      for (let i = 1; i <= 5; i++) {
        const t = i * 0.1, px = P.x + dir[0] * spd * t, py = P.y + dir[1] * spd * t;
        if (insideAsteroid(R, px, py)) { s -= 80; break; }
        for (const b of near) {
          const k = b.frz > 0 ? 0 : (b.slow || 1), q = U.d2(px, py, b.x + b.vx * t * k, b.y + b.vy * t * k);
          if (q < (b.r + 7) ** 2) s -= 30 / t;
          else if (!b.grazed && q < (b.r + G) ** 2) s += 1.5;
        }
      }
      s -= Math.max(0, Math.hypot(P.x + dir[0] * spd * 0.5 - home.x, P.y + dir[1] * spd * 0.5 - home.y) - 140) * 0.05;
      if (P.slipDir) s += (dir[0] * P.slipDir[0] + dir[1] * P.slipDir[1]) * 0.8;
      if (s > bestS) { bestS = s; best = dir; }
    }
    P.slipDir = best; return best;
  };

  // ── 플레이어 ──
  const updatePlayer = (R, dt, rdt) => {
    const P = R.player, I = SA.Input, st = SA.CORROSION[R.stage];
    if (P.dead) return;
    // 이동
    let mx = (I.isDown('KeyD') ? 1 : 0) - (I.isDown('KeyA') ? 1 : 0);
    let my = (I.isDown('KeyS') ? 1 : 0) - (I.isDown('KeyW') ? 1 : 0);
    const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
    if (ml) { P.lastMx = mx; P.lastMy = my; }
    let spd = P.speed * st.speed * (hasPas(P, 'engine2') ? 1.12 : 1) * (hasPas(P, 'raven') ? 1.15 : 1);
    if (R.cargo && R.cargo.items.some(i => SA.ITEMS[i.id].kind === 'capsule')) spd *= SA.RESCUE.speedMul;   // 구조 캡슐 운반 중
    if (P.skillState === 'repair') spd *= 0.5;
    if (P.skillState === 'boost') spd *= 1.6;
    if (P.dumpT > 0) { P.dumpT -= dt; spd *= 1.8; }
    if (P.charging) spd *= 0.45;
    const slipping = P.skillState === 'slip' && !(P.dash > 0);
    if (slipping) { const d = slipSteer(R, P, spd, dt); mx = d[0]; my = d[1]; if (Math.random() < 0.5) R.after.push({ x: P.x, y: P.y, life: 0.3 }); }
    // 폭주 코어·반사·반격 타이머
    P.odT = Math.max(0, (P.odT || 0) - dt); P.reflectT = Math.max(0, (P.reflectT || 0) - dt); P.counterCd = Math.max(0, (P.counterCd || 0) - dt);
    const cdk = P.odT > 0 ? 3 : 1;
    if (P.dash > 0) {
      P.dash -= dt;
      P.x += P.dvx * dt; P.y += P.dvy * dt;
      P.vx = P.dvx * 0.25; P.vy = P.dvy * 0.25;
      if (P.skillState === 'ram') ramHits(R, P);
      if (Math.random() < 0.8) R.after.push({ x: P.x, y: P.y, life: 0.25 });
    } else {
      const k = Math.min(1, P.accel * dt * (slipping ? 3 : 1));
      P.vx += (mx * spd - P.vx) * k; P.vy += (my * spd - P.vy) * k;
      P.x += P.vx * dt; P.y += P.vy * dt;
    }
    // 맵 경계: 120px 바깥까지만
    P.x = U.clamp(P.x, -120, R.map.w + 120); P.y = U.clamp(P.y, -120, R.map.h + 120);
    P.outside = P.x < 0 || P.y < 0 || P.x > R.map.w || P.y > R.map.h;
    pushOutAsteroids(R, P, 9);

    // 조준 (포탑만 회전)
    const target = U.ang(P.x, P.y, R.mouseWorld.x, R.mouseWorld.y);
    const turn = P.turn * dt;
    P.aim += U.clamp(U.angDiff(P.aim, target), -turn, turn);

    P.invuln = Math.max(0, P.invuln - dt);
    if (P.barrierMax) {
      P.barrierT += dt;
      if (P.barrierT > 4) P.barrier = Math.min(P.barrierMax, P.barrier + 20 * dt);
    }

    // 주무기
    P.fireCd -= dt;
    const firing = I.mouse.down && !R.tabOpen && !R.paused;
    const main = P.main, me = eff(main);
    if (firing && main && me > 0 && P.fireCd <= 0) {
      const d = SA.PARTS[main.id];
      const rate = d.rate * (hasPas(P, 'cooler') ? 1.15 : 1) * (hasPas(P, 'resonator') ? 1 : st.fire) * me;
      P.fireCd = 1 / rate;
      const tx = P.x + Math.cos(P.aim) * 8, ty = P.y + Math.sin(P.aim) * 8, sn = hasPas(P, 'sensor');   // 조준 센서: 집탄 ↑ (퍼짐 ×0.4), 탄속 +10%
      for (let i = 0; i < d.shots; i++) {
        let a = P.aim + U.rnd(-d.spread, d.spread) * (sn ? 0.4 : 1);
        let ox = 0, oy = 0;
        if (main.id === 'twin') { const s = i ? 1 : -1; ox = Math.cos(P.aim + Math.PI / 2) * 3 * s; oy = Math.sin(P.aim + Math.PI / 2) * 3 * s; a = P.aim; }
        const beam = d.pierce >= 3;
        pb(R, tx + ox, ty + oy, a, d.spd * (sn ? 1.1 : 1) * U.rnd(0.92, 1.05), d.dmg, { pierce: d.pierce, life: d.life || 1.1, main: true, frag: d.frag, close: d.close, erase: d.erase,
          col: d.erase ? '#ffe9a8' : beam ? '#9ff' : main.id === 'glass' ? '#ffd0f0' : '#bfe9ff', w: d.pierce >= 99 ? 3 : beam ? 2.4 : main.id === 'glass' ? 2.4 : 1.6 });
      }
      wear(main, 0.004);
      SA.Audio.sfx('shoot');
    }

    // 서브웨폰 (자동)
    for (const s of P.subs) {
      const e = eff(s.part); if (!e) continue;
      const id = s.part.id, d = SA.PARTS[id];
      if (id === 'drone') {                // 추적 드론: 적에게 날아가 주위를 돌며 쏜다 (기체에서 leash 이내)
        s.orb += dt * 2.2;
        if (s.x === 0 && s.y === 0) { s.x = P.x; s.y = P.y; }
        const t = !R.tabOpen && nearestEnemy(R, P.x, P.y, d.range);
        let tx = P.x + Math.cos(s.orb) * 22, ty = P.y + Math.sin(s.orb) * 22;
        if (t) {
          tx = t.x + Math.cos(s.orb) * (t.r + 30); ty = t.y + Math.sin(s.orb) * (t.r + 30);
          const q = Math.hypot(tx - P.x, ty - P.y); if (q > d.leash) { tx = P.x + (tx - P.x) / q * d.leash; ty = P.y + (ty - P.y) / q * d.leash; }
        }
        const k = Math.min(1, 6 * dt); s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
        if (Math.random() < 0.3) R.after.push({ x: s.x, y: s.y, life: 0.12, dot: '#ffe6a8' });
      } else if (id === 'sdrone') {        // 방패 드론: 기체 가까이 돌며 닿는 탄을 지운다
        let th = null, tq = 70 * 70;       // 기체로 다가오는 가장 가까운 탄 쪽으로 돈다
        for (const b of R.eb) { const dx = b.x - P.x, dy = b.y - P.y, q = dx * dx + dy * dy; if (q < tq && dx * b.vx + dy * b.vy < 0) { tq = q; th = b; } }
        if (th) s.orb += U.clamp(U.angDiff(s.orb, U.ang(P.x, P.y, th.x, th.y)), -14 * dt, 14 * dt); else s.orb += dt * 3;
        s.x = P.x + Math.cos(s.orb) * 20; s.y = P.y + Math.sin(s.orb) * 20;
      }
      else { s.x = P.x + s.ox; s.y = P.y + s.oy; }
      if (R.tabOpen) continue;   // 화물칸(Tab)을 여는 동안 서브웨폰은 멈춘다
      s.cd -= dt; s.boost = Math.max(0, (s.boost || 0) - dt);
      const rate = d.rate * st.fire * e * (s.boost > 0 ? 2.5 : 1);
      if (id === 'mine') {                 // 지나간 자리에 지뢰
        if (s.cd <= 0 && Math.hypot(P.vx, P.vy) > 30) { s.cd = 1 / rate; pb(R, s.x, s.y, 0, 0, d.dmg, { mine: 20, aoe: 46, life: 9, col: '#ffcf6b' }); wear(s.part, 0.02); }
        continue;
      }
      if (id === 'sdrone') {
        s.ecd = Math.max(0, (s.ecd || 0) - dt);
        if (s.ecd <= 0) for (const b of R.eb) if (b.life > 0 && U.d2(b.x, b.y, s.x, s.y) < (b.r + 8) ** 2) {
          b.life = 0; s.ecd = 1 / (d.rate * e); fx(R, b.x, b.y, 4, '#8ff0ff', 50, 0.2, 1); wear(s.part, 0.004); break;
        }
        const t = nearestEnemy(R, s.x, s.y, d.range);
        if (t) s.ang = U.ang(s.x, s.y, t.x, t.y);
        if (t && s.cd <= 0) { s.cd = 0.8; pb(R, s.x, s.y, s.ang, 420, d.dmg, { col: '#8ff0ff', w: 1, life: 0.6 }); }
        continue;
      }
      if (id === 'intercept') {            // 가까운 적 탄 격추
        if (s.cd > 0) continue;
        let best = null, bd = d.range * d.range;
        for (const b of R.eb) { const q = U.d2(b.x, b.y, s.x, s.y); if (q < bd) { bd = q; best = b; } }
        if (best) { s.cd = 1 / rate; best.life = 0; R.bolts.push({ pts: [[s.x, s.y], [best.x, best.y]], life: 0.08, col: '#7fe3ff' }); fx(R, best.x, best.y, 3, '#7fe3ff', 40, 0.2, 1); s.ang = U.ang(s.x, s.y, best.x, best.y); wear(s.part, 0.003); }
        continue;
      }
      const t = nearestEnemy(R, s.x, s.y, d.range);
      if (t) s.ang = U.ang(s.x, s.y, t.x, t.y);
      if (!t || s.cd > 0) continue;
      s.cd = 1 / rate;
      if (id === 'flamer') pb(R, s.x, s.y, s.ang + U.rnd(-0.25, 0.25), U.rnd(300, 380), d.dmg, { col: U.pick(['#ffb347', '#ff7a3d', '#ffe08a']), w: 3, life: 0.2, flame: true });
      else if (id === 'hturret') { pb(R, s.x, s.y, s.ang, 140, d.dmg, { homing: 6, life: 2.4, missile: true, col: '#ffb347', w: 2.2 }); SA.Audio.sfx('missile'); }
      else if (id === 'chain') zap(R, s.x, s.y, t, d.dmg, 2, 70);
      else pb(R, s.x, s.y, s.ang + U.rnd(-0.05, 0.05), 460, d.dmg, { col: id === 'gzcharge' ? '#fff3a8' : '#ffe6a8', w: 1.2, life: 0.7 });
      wear(s.part, 0.003);
      SA.Audio.sfx('sub');
    }

    // 액티브 Q/E
    ['KeyQ', 'KeyE'].forEach((key, i) => {
      const a = P.acts[i]; if (!a) return;
      a.cd = Math.max(0, a.cd - dt * (a.part.id === 'overdrive' ? 1 : cdk));
      if (a.charge !== undefined) {        // 충전 캐논: 누르는 동안 충전, 떼면 발사
        a.charge = Math.min(1.5, a.charge + dt);
        if (!I.isDown(key) || R.tabOpen) { fireCannon(R, P, a.charge); delete a.charge; P.charging = false; a.cd = SA.PARTS.cannon.cd; }
        return;
      }
      if (I.hit(key) && !R.tabOpen) {
        if (a.cd > 0 || !eff(a.part)) { SA.Audio.sfx('deny'); return; }
        useActive(R, P, a);
      }
    });

    // 파일럿 기술 (Space)
    P.skillCd = Math.max(0, P.skillCd - dt * cdk);
    if (P.skillT > 0) {
      P.skillT -= dt;
      if (P.skillState === 'repair') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.25 / 3 * dt);
      if (P.skillT <= 0) P.skillState = null;
    }
    if (I.hit('Space') && !R.tabOpen && SA.PILOTS[P.pilot].skill) {
      if (P.skillCd > 0) SA.Audio.sfx('deny');
      else useSkill(R, P, mx, my);
    }
  };

  const useActive = (R, P, a) => {
    const id = a.part.id, d = SA.PARTS[id];
    a.cd = d.cd; wear(a.part, 1.5);
    if (id === 'missile') {
      for (let i = 0; i < 6; i++) pb(R, P.x, P.y, P.aim + (i - 2.5) * 0.35, 150, 24, { homing: 7, life: 2.4, missile: true, col: '#ffb347', w: 2 });
      SA.Audio.sfx('missile');
    } else if (id === 'purge') {
      let n = 0;
      R.eb = R.eb.filter(b => { if (U.d2(b.x, b.y, P.x, P.y) < 130 * 130) { n++; fx(R, b.x, b.y, 1, '#7ff0e0', 30, 0.3); return false; } return true; });
      R.rings.push({ x: P.x, y: P.y, r: 10, max: 130, life: 0.35, col: '#7ff0e0' });
      SA.Audio.sfx('purge');
    } else if (id === 'shield') {
      P.invuln = Math.max(P.invuln, 1.5); P.shieldT = 1.5;
      SA.Audio.sfx('shield');
    } else if (id === 'emp') {             // 앞쪽 부채꼴 기절
      for (const e of R.enemies) {
        if (e.dead || e.crate) continue;
        const dd = Math.sqrt(U.d2(e.x, e.y, P.x, P.y));
        if (dd < 80 + e.r && Math.abs(U.angDiff(P.aim, U.ang(P.x, P.y, e.x, e.y))) < 0.65) { stun(R, e, 2); hitEnemy(R, e, 10); }
      }
      R.beams.push({ x: P.x, y: P.y, a: P.aim, cone: 0.65, len: 80, life: 0.25, max: 0.25, col: '#8fd3ff' });
      R.shake = Math.max(R.shake, 3); SA.Audio.sfx('purge');
    } else if (id === 'harpoon') {         // 조준선 근처 적 하나를 끌어온다
      let best = null, bs = 1e9;
      for (const e of R.enemies) {
        if (e.dead || e.crate) continue;
        const dd = Math.sqrt(U.d2(e.x, e.y, P.x, P.y)), da = Math.abs(U.angDiff(P.aim, U.ang(P.x, P.y, e.x, e.y)));
        if (dd < 280 && da < 0.35 && dd * (1 + da * 3) < bs) { bs = dd * (1 + da * 3); best = e; }
      }
      if (!best) { a.cd = 1; SA.Audio.sfx('deny'); return; }
      R.bolts.push({ pts: [[P.x, P.y], [best.x, best.y]], life: 0.25, col: '#e6edf3' });
      const D = SA.ENEMIES[best.type] || {};
      if (!best.boss && D.speed) { best.pullX = P.x + Math.cos(P.aim) * 42; best.pullY = P.y + Math.sin(P.aim) * 42; best.pullT = 0.25; }
      stun(R, best, 0.8); hitEnemy(R, best, 8); SA.Audio.sfx('ram');
    } else if (id === 'dump') {            // 값싼 화물 2개를 버리고 무적+가속
      const cheap = R.cargo.items.slice().sort((p, q) => SA.ITEMS[p.id].val / (SA.ITEMS[p.id].w * SA.ITEMS[p.id].h) - SA.ITEMS[q.id].val / (SA.ITEMS[q.id].w * SA.ITEMS[q.id].h)).slice(0, 2);
      for (const it of cheap) { SA.Grid.remove(R.cargo, it.uid); SA.Raid.dropToSpace(it.id); }
      P.invuln = Math.max(P.invuln, 1.2); P.dumpT = 2; fx(R, P.x, P.y, 16, '#ffd166', 140, 0.4); SA.Audio.sfx('boost');
    } else if (id === 'cannon') { a.cd = 0; a.charge = 0; P.charging = true; SA.Audio.sfx('repair');
    } else if (id === 'orbital') {
      const mx = R.mouseWorld.x, my = R.mouseWorld.y;
      for (let i = 0; i < 6; i++) R.strikes.push({ x: mx + U.rnd(-55, 55), y: my + U.rnd(-55, 55), t: 0.8 + i * 0.2, r: 42, dmg: 30 });
      SA.Audio.sfx('missile');
    } else if (id === 'reflect') { P.reflectT = 2.5; SA.Audio.sfx('shield');
    } else if (id === 'gravity') { R.wells.push({ x: R.mouseWorld.x, y: R.mouseWorld.y, t: 3, r: 150 }); SA.Audio.sfx('warp');
    } else if (id === 'overdrive') { P.odT = 5; fx(R, P.x, P.y, 20, '#ff4d6d', 120, 0.5); SA.Audio.sfx('boost');
    } else if (id === 'discharge') {
      const n = P.gzc || 0, k = Math.min(8, 1 + Math.floor(n / 4)), dmg = 10 + Math.min(30, n / 2);
      const ts = R.enemies.filter(e => !e.dead && !e.crate && U.d2(e.x, e.y, P.x, P.y) < 230 * 230).sort((p, q) => U.d2(p.x, p.y, P.x, P.y) - U.d2(q.x, q.y, P.x, P.y)).slice(0, k);
      for (const e of ts) { R.bolts.push({ pts: bolt(P.x, P.y, e.x, e.y), life: 0.2, col: '#fff3a8' }); hitEnemy(R, e, dmg); }
      P.gzc = 0; SA.Audio.sfx('purge');
    } else if (id === 'convert') {
      let n = 0;
      R.eb = R.eb.filter(b => { if (U.d2(b.x, b.y, P.x, P.y) < 120 * 120) { n++; return false; } return true; });
      for (let i = 0; i < Math.min(4, Math.floor(n / 10)); i++) SA.Raid.spawnItem(R, 'scrap', P.x, P.y, 90);
      if (n >= 40) SA.Raid.spawnItem(R, 'goldchip', P.x, P.y, 90);
      R.rings.push({ x: P.x, y: P.y, r: 10, max: 120, life: 0.35, col: '#ffd166' }); SA.Audio.sfx('pickup');
    } else if (id === 'timestop') {
      for (const b of R.eb) if (U.d2(b.x, b.y, P.x, P.y) < 220 * 220) { b.frz = 2.5; b.slow = 0.4; }
      R.rings.push({ x: P.x, y: P.y, r: 10, max: 220, life: 0.5, col: '#e6edf3' }); R.shake = 5; SA.Audio.sfx('bigboom');
    }
  };
  // 충전 캐논 발사: 조준선 위 적 전부 + 적 탄 삭제
  const fireCannon = (R, P, c) => {
    const len = 720, w = 6 + c * 10, dmg = 40 + c * 80, ca = Math.cos(P.aim), sa = Math.sin(P.aim);
    const onLine = (x, y, pad) => { const dx = x - P.x, dy = y - P.y, t = dx * ca + dy * sa; return t > 0 && t < len && Math.abs(-dx * sa + dy * ca) < w / 2 + pad; };
    for (const e of R.enemies) if (!e.dead && !e.crate && onLine(e.x, e.y, e.r)) hitEnemy(R, e, dmg);
    R.eb = R.eb.filter(b => !onLine(b.x, b.y, b.r));
    R.beams.push({ x: P.x, y: P.y, a: P.aim, len, w, life: 0.35, max: 0.35, col: '#9ff' });
    R.shake = Math.max(R.shake, 4 + c * 4); SA.Audio.sfx('bigboom');
  };
  // 번개: 지그재그 점 목록
  const bolt = (x0, y0, x1, y1) => { const pts = [[x0, y0]]; for (let i = 1; i < 5; i++) { const t = i / 5; pts.push([x0 + (x1 - x0) * t + U.rnd(-6, 6), y0 + (y1 - y0) * t + U.rnd(-6, 6)]); } pts.push([x1, y1]); return pts; };
  const zap = (R, x, y, first, dmg, jumps, jr) => {
    let cur = first, px = x, py = y; const done = new Set();
    for (let j = 0; j <= jumps && cur; j++) {
      R.bolts.push({ pts: bolt(px, py, cur.x, cur.y), life: 0.15, col: '#9fd8ff' });
      hitEnemy(R, cur, j ? dmg * 0.75 : dmg); done.add(cur); px = cur.x; py = cur.y;
      let nx = null, nd = jr * jr;
      for (const e of R.enemies) { if (e.dead || e.crate || done.has(e)) continue; const q = U.d2(e.x, e.y, px, py); if (q < nd) { nd = q; nx = e; } }
      cur = nx;
    }
  };
  const stun = (R, e, t) => {
    if (e.crate) return;
    const P = R.player;
    t *= (hasPas(P, 'shockplate') ? 1.5 : 1) * (e.boss ? 0.4 : 1);
    e.stun = Math.max(e.stun || 0, t);
  };
  // 플레이어가 주는 피해: 패시브 배율을 여기서 한 번에
  const hitEnemy = (R, e, dmg, b) => {
    const P = R.player, d = Math.sqrt(U.d2(e.x, e.y, P.x, P.y));
    let m = 1;
    if (hasPas(P, 'shockplate') && d < 80 + e.r) m *= 1.2;
    if (e.stun > 0 && hasPas(P, 'execute')) m *= 1.4;
    if (hasPas(P, 'resonator')) m *= [1, 1.1, 1.25, 1.45][R.stage];
    m *= 1 + SA.Raid.grazeDmg();   // 스침 스택 피해 보너스
    if (b && b.main && hasPas(P, 'redheart') && P.hp < P.maxHp * 0.5) m *= 1.3;
    if (b && b.close) { if (d < 70 + e.r) m *= 2; if (e.stun > 0) m *= 1.5; }
    damageEnemy(R, e, dmg * m);
  };

  const useSkill = (R, P, mx, my) => {
    const pl = SA.PILOTS[P.pilot];
    P.skillCd = pl.cd * (hasPas(P, 'raven') ? 0.8 : 1);
    let dx = mx, dy = my;
    if (!dx && !dy) { dx = Math.cos(P.aim); dy = Math.sin(P.aim); }
    switch (pl.skill) {
      case 'roll':
        P.dash = 0.3; P.dvx = dx * P.speed * 2.4; P.dvy = dy * P.speed * 2.4;
        P.invuln = Math.max(P.invuln, 0.4); P.rollT = 0.4; P.skillState = 'roll'; P.skillT = 0.4;
        SA.Audio.sfx('roll'); break;
      case 'ram': {
        const a = mx || my ? Math.atan2(dy, dx) : P.aim;
        P.dash = 0.35; P.dvx = Math.cos(a) * P.speed * 3.2; P.dvy = Math.sin(a) * P.speed * 3.2;
        P.invuln = Math.max(P.invuln, 0.45); P.skillState = 'ram'; P.skillT = 0.4; P.rammed = new Set();
        SA.Audio.sfx('ram'); break;
      }
      case 'repair': P.skillState = 'repair'; P.skillT = 3; SA.Audio.sfx('repair'); break;
      case 'boost': P.skillState = 'boost'; P.skillT = 2; SA.Audio.sfx('boost'); break;
      case 'slip': P.skillState = 'slip'; P.skillT = 3; P.slipHome = { x: P.x, y: P.y }; P.slipDir = null; P.slipAiT = 0; SA.Audio.sfx('boost'); break;
      case 'warp': {
        const a = U.ang(P.x, P.y, R.mouseWorld.x, R.mouseWorld.y);
        const dist = Math.min(95, Math.sqrt(U.d2(P.x, P.y, R.mouseWorld.x, R.mouseWorld.y)));
        R.after.push({ x: P.x, y: P.y, life: 0.4 });
        let nx = P.x + Math.cos(a) * dist, ny = P.y + Math.sin(a) * dist;
        for (let k = 0; k < 8 && insideAsteroid(R, nx, ny); k++) { nx -= Math.cos(a) * 12; ny -= Math.sin(a) * 12; }
        P.x = nx; P.y = ny; P.invuln = Math.max(P.invuln, 0.2);
        fx(R, P.x, P.y, 10, '#b3a1ff', 60, 0.35);
        SA.Audio.sfx('warp'); break;
      }
    }
  };

  const ramHits = (R, P) => {
    R.eb = R.eb.filter(b => U.d2(b.x, b.y, P.x, P.y) > 20 * 20);
    for (const e of R.enemies) {
      if (P.rammed.has(e) || e.dead) continue;
      if (U.d2(e.x, e.y, P.x, P.y) < (e.r + 10) ** 2) { P.rammed.add(e); hitEnemy(R, e, 45); stun(R, e, 0.6); R.shake = Math.max(R.shake, 4); }
    }
  };

  // ── 플레이어 피격 ──
  const hurtPlayer = (R, dmg) => {
    const P = R.player;
    if (P.invuln > 0 || P.dead || R.state !== 'play') return;
    if (P.skillState === 'slip') return;   // 레이븐 슬립스트림: 피격 무효
    if (P.odT > 0) dmg *= 2;
    if (hasPas(P, 'vault')) dmg *= 1 - Math.min(0.25, (SA.Grid.value(R.cargo) + SA.Grid.value(R.secure)) / 4000);
    if (P.barrier > 0) { const b = Math.min(P.barrier, dmg); P.barrier -= b; dmg -= b; }
    P.barrierT = 0;
    P.hp -= dmg; P.invuln = SA.CFG.HIT_INVULN;
    R.shake = 6; R.hurtFlash = 0.35;
    R.graze = Math.floor(R.graze * SA.GRAZE.hitKeep);
    const eq = [P.main, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas].filter(Boolean);
    if (eq.length) wear(U.pick(eq), 2);
    if (P.main && P.main.id === 'glass') eq.forEach(p => wear(p, 4));
    if (hasPas(P, 'counter') && P.counterCd <= 0) {
      P.counterCd = 5; P.invuln += 0.6;
      R.eb = R.eb.filter(b => U.d2(b.x, b.y, P.x, P.y) > 90 * 90);
      R.rings.push({ x: P.x, y: P.y, r: 10, max: 90, life: 0.3, col: '#ff8a8a' });
    }
    SA.Audio.sfx('hurt');
    fx(R, P.x, P.y, 14, '#ff8a8a', 120, 0.4);
    if (P.hp <= 0) { P.hp = 0; SA.Raid.playerDied(); }
  };

  // ── 적 ──
  const spawnEnemy = (R, type, x, y, o = {}) => {
    const d = SA.ENEMIES[type] || o.def;
    const e = Object.assign({ type, x, y, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, r: d.r, t: U.rnd(0, 2), t2: 0, flash: 0,
      dir: Math.random() < 0.5 ? 1 : -1, homeX: x, homeY: y, awake: false, a: 0, phase: 1, dead: false, boss: !!d.boss }, o);   // boss: 격추 처리·기절 감소에 쓴다
    R.enemies.push(e);
    return e;
  };
  const nearestEnemy = (R, x, y, range) => {
    let best = null, bd = range * range;
    for (const e of R.enemies) {
      if (e.dead || e.crate) continue;
      const d = U.d2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  const updateEnemies = (R, dt) => {
    const P = R.player;
    for (const e of R.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      let dist = Math.sqrt(U.d2(e.x, e.y, P.x, P.y));
      if (dist > 900 && !e.boss && !e.tgt) continue;           // 멀면 잠든다
      e.face = e.face === undefined ? Math.atan2(R.player.y - e.y, R.player.x - e.x) : e.face;
      if (e.crate) continue;
      if (e.pullT > 0) { e.pullT -= dt; e.x += (e.pullX - e.x) * Math.min(1, 14 * dt); e.y += (e.pullY - e.y) * Math.min(1, 14 * dt); }
      if (e.stun > 0) { e.stun -= dt; e.vx *= 0.9; e.vy *= 0.9; e.x += e.vx * dt; e.y += e.vy * dt; pushOutAsteroids(R, e, e.r); continue; }
      e.t += dt;
      const T = e.tgt && !e.tgt.dead ? e.tgt : P;   // 수송선·윙맨을 노리는 적은 그쪽을 조준한다
      const aP = U.ang(e.x, e.y, T.x, T.y);
      if (T !== P) dist = Math.sqrt(U.d2(e.x, e.y, T.x, T.y));
      const alive = !P.dead && R.state === 'play';
      const D = SA.ENEMIES[e.type] || {}, emp = D.faction === 'empire';
      switch (D.ai) {
        case 'fighter': {
          if (!e.awake && dist < 420) e.awake = true;
          if (!e.awake) { e.x += Math.cos(e.t * 0.5) * 12 * dt; e.y += Math.sin(e.t * 0.4) * 12 * dt; break; }
          const want = dist > 210 ? 1 : dist < 140 ? -1 : 0;
          const tx = Math.cos(aP) * want + Math.cos(aP + Math.PI / 2) * e.dir * 0.7;
          const ty = Math.sin(aP) * want + Math.sin(aP + Math.PI / 2) * e.dir * 0.7;
          e.vx += (tx * D.speed - e.vx) * Math.min(1, 3 * dt); e.vy += (ty * D.speed - e.vy) * Math.min(1, 3 * dt);
          if (e.t > (emp ? 1.6 : 1.9) && alive && dist < 360) {
            e.t = U.rnd(0, 0.4);
            if (emp) { e.burst = 3; e.burstT = 0; }                          // 제국: 빠른 3연사
            else fan(R, e.x, e.y, aP, 3, 0.42, 112, { col: '#ff8fb0' });      // 왕국: 3갈래 조준탄
            SA.Audio.sfx('enemyShot');
          }
          if (e.burst > 0 && (e.burstT -= dt) <= 0) { e.burst--; e.burstT = 0.12; eb(R, e.x, e.y, aP + U.rnd(-0.05, 0.05), 135, { r: 2.6, dmg: 8, col: '#ff4d6d' }); }
          if (Math.random() < dt * 0.3) e.dir *= -1;
          break;
        }
        case 'frigate': {
          if (!e.awake && dist < 440) e.awake = true;
          if (!e.awake) break;
          const want = dist > 240 ? 1 : dist < 170 ? -0.6 : 0;
          e.vx += (Math.cos(aP) * want * 38 - e.vx) * Math.min(1, dt); e.vy += (Math.sin(aP) * want * 38 - e.vy) * Math.min(1, dt);
          if (e.t > 2.7 && alive && dist < 420) {
            e.t = 0; e.a = (e.a + 1) % 2;
            if (emp) { for (let k = 0; k < 3; k++) ring(R, e.x, e.y, 10, 70 + k * 14, e.a * 0.3 + k * 0.1, { r: 3.5, col: '#ff5d6d' }); }   // 제국: 겹친 고리
            else ring(R, e.x, e.y, 18, 78, e.a * Math.PI / 18, { r: 4, col: '#ff7a9c' });
            SA.Audio.sfx('enemyShot');
          }
          e.t2 += dt;
          if (e.t2 > 4.3 && alive && dist < 420) { e.t2 = 0; e.burst = 3; e.burstT = 0; }
          if (e.burst > 0 && (e.burstT -= dt) <= 0) { e.burst--; e.burstT = 0.18; eb(R, e.x, e.y, aP, 105, { r: 6, dmg: 16, col: '#ff4d6d' }); }
          break;
        }
        case 'turret': {
          if (dist > 330 || !alive) { e.t = 0; break; }
          const cyc = e.t % 4.5;
          if (emp) {                       // 제국 쌍포대: 플레이어를 노리고 두 줄 연사
            e.a += U.clamp(U.angDiff(e.a, aP), -2 * dt, 2 * dt);
            e.t2 += dt;
            if (cyc < 2.5) while (e.t2 > 0.16) { e.t2 -= 0.16; for (const s of [-1, 1]) eb(R, e.x + Math.cos(e.a + 1.57) * 3 * s, e.y + Math.sin(e.a + 1.57) * 3 * s, e.a, 120, { r: 3, col: '#ff4d6d' }); }
          } else if (D.faction === 'mine') {   // 폐광 포대: 느린 4갈래 회전 + 주기마다 조준 3연발
            e.t2 += dt;
            if (cyc < 3) while (e.t2 > 0.16) { e.t2 -= 0.16; e.a += 0.17 * e.dir; for (let k = 0; k < 4; k++) eb(R, e.x, e.y, e.a + k * 1.5708, 70, { r: 3.5, col: '#ffcf6b' }); }
            else if (cyc > 3.6 && e.t2 > 0.3) { e.t2 = 0; eb(R, e.x, e.y, aP, 110, { r: 5, dmg: 16, col: '#ffb040' }); }
          } else if (cyc < 3) {            // 왕국 포대: 회전 나선
            e.t2 += dt;
            while (e.t2 > 0.11) { e.t2 -= 0.11; e.a += 0.23 * e.dir; eb(R, e.x, e.y, e.a, 88, { r: 3.5 }); eb(R, e.x, e.y, e.a + Math.PI, 88, { r: 3.5 }); }
          }
          break;
        }
        case 'corrode': {
          const D0 = SA.ENEMIES.corrode;
          e.lungeCd = (e.lungeCd || U.rnd(1, 3)) - dt;
          if (e.lungeT > 0) e.lungeT -= dt;   // 돌진 중에는 방향 유지
          else if (e.lungeCd <= 0 && dist < 150 && alive) { e.lungeCd = 3.5; e.lungeT = 0.35; e.vx = Math.cos(aP) * 230; e.vy = Math.sin(aP) * 230; }
          else { e.vx += (Math.cos(aP) * D0.speed - e.vx) * Math.min(1, 2 * dt); e.vy += (Math.sin(aP) * D0.speed - e.vy) * Math.min(1, 2 * dt); }
          if (e.t > 2.4 && dist < 240 && alive) { e.t = 0; ring(R, e.x, e.y, 8, 62, Math.random(), { r: 4, col: '#c9a2ff' }); }
          if (dist < e.r + 6) hurtPlayer(R, 14);
          break;
        }
        case 'hunter': {
          e.vx += (Math.cos(aP) * 70 - e.vx) * Math.min(1, dt); e.vy += (Math.sin(aP) * 70 - e.vy) * Math.min(1, dt);
          const c = e.t % 9;
          e.t2 += dt;
          if (c < 3) { if (e.t2 > 0.55) { e.t2 = 0; fan(R, e.x, e.y, aP, 5, 0.7, 120, { r: 5, dmg: 14, col: '#a37bff' }); } }
          else if (c < 6) { if (e.t2 > 0.9) { e.t2 = 0; e.a += 0.3; ring(R, e.x, e.y, 24, 70, e.a, { r: 4, col: '#c9a2ff' }); } }
          else if (e.t2 > 0.09) { e.t2 = 0; e.a += 0.19; for (let k = 0; k < 3; k++) eb(R, e.x, e.y, e.a + k * Math.PI * 2 / 3, 95, { r: 3.5, col: '#c9a2ff' }); }
          if (dist < e.r + 5) hurtPlayer(R, 20);
          break;
        }
        case 'raven': updateRaven(R, e, dt, dist, aP, alive); break;
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (!e.crate) e.face += U.clamp(U.angDiff(e.face, aP), -3 * dt, 3 * dt);
      pushOutAsteroids(R, e, e.r);
    }
    R.enemies = R.enemies.filter(e => !e.dead);
  };

  // 네임드 용병: 플레이어처럼 연사하고 회피기동한다
  // 레이븐: 1페이즈 예측 사격 · 2페이즈(60%) 예측+직격 교차 + 원형탄 · 3페이즈(25%, 재대결만) 슬립스트림 돌진(잔상이 탄을 뿌림)
  // 첫 대결(둥지)에서는 체력 30%에서 도주한다. 날아오는 탄은 옆으로 미끄러지듯 피한다(쿨타임).
  const updateRaven = (R, e, dt, dist, aP, alive) => {
    const P = R.player, RV = SA.RAVEN;
    if (!e.awake) { if (dist < 340 || e.hp < e.maxHp) { e.awake = true; SA.Raid.bossEngaged(e); } else return; }
    e.inv = Math.max(0, (e.inv || 0) - dt);
    // 도주
    if (e.fleeing) {
      e.fleeT -= dt; e.inv = 1;
      const a = U.ang(P.x, P.y, e.x, e.y);
      e.vx += (Math.cos(a) * 340 - e.vx) * Math.min(1, 4 * dt); e.vy += (Math.sin(a) * 340 - e.vy) * Math.min(1, 4 * dt);
      if (Math.random() < 0.5) R.after.push({ x: e.x, y: e.y, life: 0.25, enemy: true });
      if (e.fleeT <= 0) { e.dead = true; SA.Raid.ravenFled(e); }
      return;
    }
    if (!e.rematch && e.hp <= e.maxHp * RV.fleeAt) {
      e.fleeing = true; e.fleeT = 2.2; e.inv = 1;
      SA.Raid.msg('레이븐: "…오늘은 여기까지. 다음엔 제대로 해요, 대장."', '#ff4d6d', 5);
      SA.Raid.ravenFlee(e);
      return;
    }
    if (e.hp < e.maxHp * 0.6 && e.phase === 1) { e.phase = 2; SA.Raid.msg('레이븐: "제법이군. 이제 진짜다."', '#ff4d6d'); }
    if (e.rematch && e.hp < e.maxHp * RV.phase3At && e.phase === 2) { e.phase = 3; e.slipT = 0.5; SA.Raid.msg('레이븐: "탄 사이엔 길이 있어요. 따라와 봐요."', '#ff4d6d', 4); SA.Audio.sfx('siren'); }

    // 탄 회피: 맞을 궤도의 탄이 가까우면 옆으로 미끄러진다
    e.dodgeCd = Math.max(0, (e.dodgeCd || 0) - dt);
    if (!e.dodgeCd && !e.dashT) {
      for (const b of R.pb) {
        const rx = e.x - b.x, ry = e.y - b.y, v2 = b.vx * b.vx + b.vy * b.vy;
        if (rx * rx + ry * ry > 130 * 130 || !v2) continue;
        const tt = (rx * b.vx + ry * b.vy) / v2;          // 최근접 시각
        if (tt < 0 || tt > 0.35) continue;
        const cx = b.x + b.vx * tt - e.x, cy = b.y + b.vy * tt - e.y;
        if (cx * cx + cy * cy > (e.r + 10) ** 2) continue;
        const ba = Math.atan2(b.vy, b.vx), side = (cx * -Math.sin(ba) + cy * Math.cos(ba)) > 0 ? -1 : 1;
        const pa = ba + side * Math.PI / 2;
        e.vx = Math.cos(pa) * 340; e.vy = Math.sin(pa) * 340; e.roll = 0.17;
        e.dodgeCd = RV.dodgeCd[e.phase - 1];
        R.after.push({ x: e.x, y: e.y, life: 0.3, enemy: true });
        break;
      }
    }

    // 3페이즈: 슬립스트림 돌진 — 플레이어를 꿰뚫고 지나가며 잔상을 남기고, 잔상이 잠시 뒤 원형탄을 뿌린다
    e.ghosts = e.ghosts || [];
    for (const g of e.ghosts) { g.t -= dt; if (g.t <= 0 && !g.fired) { g.fired = true; if (alive) ring(R, g.x, g.y, 6, 70, g.off, { r: 3, col: '#ff7a9c' }); } }
    e.ghosts = e.ghosts.filter(g => !g.fired);
    if (e.phase === 3) {
      if (e.dashT > 0) {
        e.dashT -= dt; e.ghostT = (e.ghostT || 0) + dt;
        if (e.ghostT > 0.07) { e.ghostT = 0; e.ghosts.push({ x: e.x, y: e.y, t: 0.55, off: Math.random() }); R.after.push({ x: e.x, y: e.y, life: 0.6, enemy: true }); }
        return;
      }
      e.slipT -= dt;
      if (e.slipT <= 0) {
        e.slipT = 2.6;
        const a = U.ang(e.x, e.y, P.x, P.y) + U.rnd(-0.25, 0.25);
        e.dashT = 0.45; e.vx = Math.cos(a) * 470; e.vy = Math.sin(a) * 470; e.inv = 0.45;
        SA.Audio.sfx('boost');
        return;
      }
    }

    // 궤도 비행
    const orbit = aP + Math.PI + e.dir * 0.9;
    const tx = P.x + Math.cos(orbit + Math.PI) * 170, ty = P.y + Math.sin(orbit + Math.PI) * 170;
    const sp = [150, 175, 190][e.phase - 1];
    if (e.roll > 0) { e.roll -= dt; }
    else {
      const a = U.ang(e.x, e.y, tx, ty);
      e.vx += (Math.cos(a) * sp - e.vx) * Math.min(1, 2.5 * dt); e.vy += (Math.sin(a) * sp - e.vy) * Math.min(1, 2.5 * dt);
    }
    e.t2 += dt;
    if (e.t2 > 4.5) {            // 배럴 롤 (방향 전환)
      e.t2 = 0; e.roll = 0.35; e.dir *= -1;
      const pa = aP + Math.PI / 2 * e.dir;
      e.vx = Math.cos(pa) * 420; e.vy = Math.sin(pa) * 420; e.inv = 0.4;
      R.after.push({ x: e.x, y: e.y, life: 0.3, enemy: true });
    }
    if (!alive) return;
    // 예측 사격: 플레이어의 이동을 앞질러 쏜다. 2페이즈부터 직격탄을 섞어 멈춰 있어도 맞는다
    const BS = 185, tt = Math.min(1.2, dist / BS);
    const la = U.ang(e.x, e.y, P.x + (P.vx || 0) * tt * 0.9, P.y + (P.vy || 0) * tt * 0.9);
    const cyc = e.t % 2.2;
    e.fireT = (e.fireT || 0) + dt;
    if (cyc < 1.2 && e.fireT > [0.13, 0.1, 0.12][e.phase - 1]) {
      e.fireT = 0; e.shotN = (e.shotN || 0) + 1;
      const a = e.phase >= 2 && e.shotN % 2 ? aP : la;
      eb(R, e.x, e.y, a + U.rnd(-0.05, 0.05), BS, { r: 2.6, dmg: 9, col: '#ff4d6d' });
      SA.Audio.sfx('enemyShot');
    }
    if (e.phase >= 2) { e.ringT = (e.ringT || 0) + dt; if (e.ringT > 3) { e.ringT = 0; ring(R, e.x, e.y, 16, 85, Math.random(), { r: 4, col: '#ff7a9c' }); } }
  };

  const damageEnemy = (R, e, dmg) => {
    if (e.dead || e.inv > 0) return;
    e.hp -= dmg; e.flash = 0.08;
    if (!e.awake && !e.crate) e.awake = true;
    if (e.type === 'raven' && !R.bossEngaged) SA.Raid.bossEngaged(e);
    if (e.hp <= 0) killEnemy(R, e);
  };
  const killEnemy = (R, e) => {
    e.dead = true;
    if (e.crate) { SA.Audio.sfx('open'); fx(R, e.x, e.y, 10, '#ffd166', 60, 0.4); }
    else {
      R.kills++; R.killTypes = R.killTypes || {}; R.killTypes[e.type] = (R.killTypes[e.type] || 0) + 1;
      const big = e.r > 15 ? 2 : 1;
      SA.Audio.sfx(e.boss ? 'bigboom' : 'boom', big);
      fx(R, e.x, e.y, e.boss ? 60 : 16 * big, '#ffb347', e.boss ? 200 : 110, 0.6, 2);
      fx(R, e.x, e.y, 8 * big, '#fff3c4', 60, 0.3, 1.5);
      R.rings.push({ x: e.x, y: e.y, r: 4, max: e.r * 2.5, life: 0.3, col: '#ffcf8a' });
      R.shake = Math.max(R.shake, e.boss ? 12 : 2 * big);
      if (e.boss) SA.Raid.bossKilled(e);
    }
    SA.Raid.dropLoot(e);
  };

  // ── 소행성 ──
  const astNear = (R, x, y) => R.astGrid.get(((x / 160) | 0) + ',' + ((y / 160) | 0)) || [];
  const insideAsteroid = (R, x, y) => astNear(R, x, y).some(a => U.d2(x, y, a.x, a.y) < (a.r * 0.92) ** 2);
  const pushOutAsteroids = (R, o, r) => {
    for (const a of astNear(R, o.x, o.y)) {
      const d = Math.sqrt(U.d2(o.x, o.y, a.x, a.y)), min = a.r * 0.92 + r;
      if (d < min && d > 0.01) { const k = (min - d) / d; o.x += (o.x - a.x) * k; o.y += (o.y - a.y) * k; }
    }
  };

  // ── 탄 이동·충돌 ──
  const updateBullets = (R, dt) => {
    const P = R.player, slip = P.skillState === 'slip';
    const G = SA.CFG.GRAZE_R * (slip ? 2 : 1), hitR = slip ? 1 : P.hitR;
    const out = [];
    const slowF = hasPas(P, 'slowfield'), defl = hasPas(P, 'deflect'), refl = P.reflectT > 0;
    for (const b of R.eb) {
      let k = 1;
      if (b.frz > 0) { b.frz -= dt; k = 0; } else if (b.slow) k = b.slow;
      if (slowF && U.d2(b.x, b.y, P.x, P.y) < 60 * 60) k *= 0.85;
      for (const w of R.wells) { const dx = w.x - b.x, dy = w.y - b.y, q = dx * dx + dy * dy; if (q < w.r * w.r && q > 4) { const s = 160 * dt / Math.sqrt(q); b.vx = b.vx * (1 - 1.5 * dt) + dx * s; b.vy = b.vy * (1 - 1.5 * dt) + dy * s; } }
      if (defl) { const dx = b.x - P.x, dy = b.y - P.y, q = dx * dx + dy * dy; if (q < 42 * 42 && b.vx * dx + b.vy * dy < 0) { const r = (dx * b.vy - dy * b.vx > 0 ? -1 : 1) * 1.6 * dt, c = Math.cos(r), s2 = Math.sin(r); const vx = b.vx * c - b.vy * s2; b.vy = b.vx * s2 + b.vy * c; b.vx = vx; } }
      b.x += b.vx * dt * k; b.y += b.vy * dt * k; b.life -= dt;
      if (b.life <= 0) continue;
      if (refl && U.d2(b.x, b.y, P.x, P.y) < 34 * 34) {
        const t = nearestEnemy(R, b.x, b.y, 500), a = t ? U.ang(b.x, b.y, t.x, t.y) : Math.atan2(-b.vy, -b.vx);
        pb(R, b.x, b.y, a, 320, 8, { col: '#ffd0f0', w: 2, life: 1.5 }); continue;
      }
      if (insideAsteroid(R, b.x, b.y)) { if (Math.random() < 0.3) fx(R, b.x, b.y, 1, b.col, 20, 0.2, 1); continue; }
      if (R.allies && R.allies.length) { let hit = false; for (const a of R.allies) if (!a.dead && U.d2(b.x, b.y, a.x, a.y) < (b.r + a.r) ** 2) { hurtAlly(R, a, b.dmg); hit = true; break; } if (hit) continue; }
      if (!P.dead && R.state === 'play') {
        const dx = b.x - P.x, dy = b.y - P.y, dd = dx * dx + dy * dy;
        if (!slip && dd < (b.r + hitR) ** 2 && P.invuln <= 0) { hurtPlayer(R, b.dmg); continue; }
        if (!b.grazed && dd < (b.r + G) ** 2) {
          b.grazed = true; R.grazeN++; R.graze += slip ? 2 : 1;
          if (slip) P.skillCd = Math.max(0, P.skillCd - 0.2);
          P.gzc = Math.min(40, (P.gzc || 0) + 1);
          for (const sb of P.subs) if (sb.part.id === 'gzcharge') sb.boost = 1.5;
          if (hasPas(P, 'grazeflow') && R.grazeN % 5 === 0) for (const a of P.acts) if (a) a.cd = Math.max(0, a.cd - 1);
          if (P.invuln <= 0 || P.rollT > 0) SA.Audio.sfx('graze');
          fx(R, (b.x + P.x) / 2, (b.y + P.y) / 2, 2, '#fff7c2', 60, 0.18, 1);
        }
      }
      out.push(b);
    }
    R.eb = out;

    const outP = [];
    for (const b of R.pb) {
      if (b.homing) {
        if (!b.target || b.target.dead) b.target = nearestEnemy(R, b.x, b.y, 420);
        if (b.target) {
          const a = Math.atan2(b.vy, b.vx), ta = U.ang(b.x, b.y, b.target.x, b.target.y);
          const na = a + U.clamp(U.angDiff(a, ta), -b.homing * dt, b.homing * dt);
          const sp = Math.min(380, Math.hypot(b.vx, b.vy) + 500 * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
        if (Math.random() < 0.6) R.fx.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25, col: '#ffcf8a', size: 1.5 });
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) { if (b.mine) boom(R, b); continue; }
      if (b.mine) {                        // 지뢰: 적이 닿으면 폭발
        if (R.enemies.some(e => !e.dead && !e.crate && U.d2(b.x, b.y, e.x, e.y) < (b.mine + e.r) ** 2)) boom(R, b); else outP.push(b);
        continue;
      }
      if (insideAsteroid(R, b.x, b.y)) { fx(R, b.x, b.y, 2, '#c9b8a0', 40, 0.2, 1); continue; }
      if (b.erase) R.eb = R.eb.filter(q => U.d2(q.x, q.y, b.x, b.y) > 12 * 12);
      let gone = false;
      for (const e of R.enemies) {
        if (e.dead) continue;
        if (b.hit && b.hit.has(e)) continue;
        if (U.d2(b.x, b.y, e.x, e.y) < (e.r + 2) ** 2) {
          hitEnemy(R, e, b.dmg, b);
          if (b.frag) for (let k = 0; k < b.frag; k++) pb(R, b.x, b.y, Math.random() * 6.28, 260, b.dmg * 0.5, { life: 0.18, col: '#ffcf8a', w: 1.2 });
          SA.Audio.sfx('hitEnemy');
          fx(R, b.x, b.y, 2, '#e6f7ff', 50, 0.15, 1);
          if (b.pierce && b.hit.size < b.pierce) { b.hit.add(e); continue; }
          gone = true; break;
        }
      }
      if (!gone) outP.push(b);
    }
    R.pb = outP;
  };

  const boom = (R, b) => {
    for (const e of R.enemies) if (!e.dead && !e.crate && U.d2(b.x, b.y, e.x, e.y) < (b.aoe + e.r) ** 2) hitEnemy(R, e, b.dmg);
    fx(R, b.x, b.y, 14, '#ffb347', 120, 0.4); R.rings.push({ x: b.x, y: b.y, r: 4, max: b.aoe, life: 0.3, col: '#ffcf8a' });
    SA.Audio.sfx('boom'); R.shake = Math.max(R.shake, 3);
  };
  // 궤도 폭격·중력 우물·번개·광선 수명
  // ── 아군: 네임드 윙맨 · 호위 수송선 ──
  // 윙맨이 맞으면 엄호(G) 중일 때 절반을 플레이어가 대신 맞는다
  const hurtAlly = (R, a, dmg) => {
    if (a.dead) return;
    if (a.kind === 'wing' && a.cover && Math.sqrt(U.d2(a.x, a.y, R.player.x, R.player.y)) < 60) { hurtPlayer(R, dmg * 0.5); dmg *= 0.5; }
    a.hp -= dmg; a.flash = 0.08; a.calm = 0;
    if (a.hp <= 0) { a.hp = 0; a.dead = true; fx(R, a.x, a.y, 30, '#ffb347', 140, 0.6, 2); SA.Audio.sfx('bigboom'); SA.Raid.allyDown(a); }
  };
  // ── 네임드 윙맨 AI (임시 수치) ──
  // 공통: 플레이어에게서 SA.WING.leash까지 나가 싸운다. G(엄호)를 켜면 사냥을 멈추고 플레이어 뒤에 붙는다.
  // 세레나 = 냉정한 지휘관: 측면 저격, 수송선·플레이어를 노리는 적 우선, 탄을 정확히 피함, 체력이 낮으면 물러나 회복.
  // 볼크 = 무모한 돌격: 가까운 적 주위를 돌며 난사, 탄을 잘 안 피함, 주변 적의 시선을 끈다, 물러나지 않음.
  const alive = (e) => e && !e.dead && !e.crate;
  const wingThreat = (R, a, look) => {      // look초 안에 부딪힐 탄 중 가장 빠른 것
    let best = null, bt = look;
    for (const b of R.eb) {
      const dx = b.x - a.x, dy = b.y - a.y; if (dx * dx + dy * dy > 110 * 110) continue;
      const vv = b.vx * b.vx + b.vy * b.vy; if (!vv) continue;
      const t = -(dx * b.vx + dy * b.vy) / vv; if (t < 0 || t > bt) continue;
      const cx = dx + b.vx * t, cy = dy + b.vy * t;
      if (cx * cx + cy * cy < (b.r + a.r + 4) ** 2) { bt = t; best = { b, cx, cy }; }
    }
    return best;
  };
  const wingBark = (R, a, N, key) => { if (!N.barks || !N.barks[key] || (a.barkT || 0) > 0) return; a.barkT = 10; SA.Raid.msg(`${N.name}: "${N.barks[key]}"`, N.color, 3); };
  const wingAI = (R, a, N, dt) => {
    const P = R.player, W = SA.WING, style = N.style;
    a.barkT = Math.max(0, (a.barkT || 0) - dt);
    if (!a.side) a.side = Math.random() < 0.5 ? -1 : 1;
    const inZone = (e) => U.d2(e.x, e.y, P.x, P.y) < (W.leash + 60) ** 2;
    let t = null, tx, ty, sp = N.speed;
    if (style === 'cmd') {                  // 세레나: 후퇴 판단
      if (a.retreat && a.hp > a.maxHp * W.backAt) { a.retreat = false; a.barkT = 0; wingBark(R, a, N, 'back'); }
      else if (!a.retreat && a.hp < a.maxHp * W.retreatAt) { a.retreat = true; a.barkT = 0; wingBark(R, a, N, 'retreat'); }
    }
    if (a.cover || a.retreat) {             // 엄호·후퇴: 플레이어 뒤로
      const back = P.aim + Math.PI, off = a.cover ? 18 : 40;
      tx = P.x + Math.cos(back) * off; ty = P.y + Math.sin(back) * off;
      t = nearestEnemy(R, a.x, a.y, N.range);
    } else if (style === 'cmd') {
      // 우선순위: 수송선·윙맨을 노리는 적 > 플레이어 가까이 온 적 > 가까운 적
      let bs = Infinity;
      for (const e of R.enemies) {
        if (!alive(e) || !inZone(e)) continue;
        let s = Math.sqrt(U.d2(e.x, e.y, a.x, a.y));
        if (e.tgt && !e.tgt.dead) s -= 200;
        if (R.convoy && !R.convoy.dead && U.d2(e.x, e.y, R.convoy.x, R.convoy.y) < 170 * 170) s -= 150;
        if (U.d2(e.x, e.y, P.x, P.y) < 170 * 170) s -= 100;
        if (e === a.tgtE) s -= 60;          // 표적을 자주 바꾸지 않는다
        if (s < bs) { bs = s; t = e; }
      }
      if (t !== a.tgtE) { a.tgtE = t; a.side = -a.side; }
      if (t) {                              // 측면으로 돌아 거리 190에서 저격
        const ang = U.ang(t.x, t.y, P.x, P.y) + a.side * 1.1;
        tx = t.x + Math.cos(ang) * 190; ty = t.y + Math.sin(ang) * 190;
      } else { const s2 = P.aim + Math.PI / 2 * a.side; tx = P.x + Math.cos(s2) * 70; ty = P.y + Math.sin(s2) * 70; }
    } else {                                // 볼크: 가까운 적에게 달려들어 돈다
      if (!alive(a.tgtE) || !inZone(a.tgtE)) {
        a.tgtE = null; let bd = 320 * 320;
        for (const e of R.enemies) { if (!alive(e) || !inZone(e)) continue; const q = U.d2(e.x, e.y, a.x, a.y); if (q < bd) { bd = q; a.tgtE = e; } }
        if (a.tgtE && (a.tgtE.boss || (SA.ENEMIES[a.tgtE.type] || {}).hp >= 100)) wingBark(R, a, N, 'charge');
      }
      t = a.tgtE;
      if (t) {
        a.orbA = (a.orbA || 0) + 2.2 * a.side * dt;
        tx = t.x + Math.cos(a.orbA) * (t.r + 48); ty = t.y + Math.sin(a.orbA) * (t.r + 48); sp *= 1.15;
      } else { tx = P.x + Math.cos(P.aim) * 90; ty = P.y + Math.sin(P.aim) * 90; }
      // 도발: 주변 적이 볼크를 노린다
      a.tauntT = (a.tauntT || 0) - dt;
      if (a.tauntT <= 0) {
        a.tauntT = 1;
        for (const e of R.enemies) if (alive(e) && !e.boss && !e.tgt && U.d2(e.x, e.y, a.x, a.y) < 170 * 170 && Math.random() < W.taunt) { e.tgt = a; e.tauntT = 4; }
      }
      if (a.hp < a.maxHp * 0.3) wingBark(R, a, N, 'low');
    }
    // 플레이어에게서 leash 밖으로 나가지 않는다
    const lx = tx - P.x, ly = ty - P.y, lq = Math.hypot(lx, ly);
    if (lq > W.leash) { tx = P.x + lx / lq * W.leash; ty = P.y + ly / lq * W.leash; }
    const dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy);
    sp = Math.min(sp * (Math.hypot(a.x - P.x, a.y - P.y) > W.leash + 40 ? 1.7 : 1), dd * 6);
    let vx = (dd ? dx / dd : 0) * sp, vy = (dd ? dy / dd : 0) * sp, kk = 5;
    // 탄 회피: 세레나는 거의 다, 볼크는 가끔
    const th = wingThreat(R, a, style === 'cmd' ? 0.45 : 0.3);
    if (th && (th.b.wd === undefined ? (th.b.wd = Math.random() < (style === 'cmd' ? W.dodgeCmd : W.dodgeAce)) : th.b.wd)) {
      let ox = -th.cx, oy = -th.cy, oq = Math.hypot(ox, oy);
      if (oq < 0.5) { ox = -th.b.vy; oy = th.b.vx; oq = Math.hypot(ox, oy); }
      vx = ox / oq * 280; vy = oy / oq * 280; kk = 14;
    }
    a.vx += (vx - a.vx) * Math.min(1, kk * dt); a.vy += (vy - a.vy) * Math.min(1, kk * dt);
    a.x += a.vx * dt; a.y += a.vy * dt;
    pushOutAsteroids(R, a, a.r);
    // 사격
    if (!t || U.d2(t.x, t.y, a.x, a.y) > N.range * N.range) t = nearestEnemy(R, a.x, a.y, N.range);
    a.face = t ? U.ang(a.x, a.y, t.x, t.y) : Math.atan2(a.vy, a.vx) || P.aim;
    a.cd -= dt;
    if (t && a.cd <= 0 && R.state === 'play') {
      a.cd = 1 / N.rate;
      for (let k = 0; k < N.shots; k++) pb(R, a.x, a.y, a.face + U.rnd(-N.spread, N.spread), N.spd, N.dmg, { col: N.color, w: 2, life: 0.9 });
    }
  };
  // 볼크의 도발이 끝나면 적은 다시 플레이어를 노린다
  const updateTaunts = (R, dt) => { for (const e of R.enemies) if (e.tauntT > 0) { e.tauntT -= dt; if (e.tauntT <= 0 && e.tgt && e.tgt.kind === 'wing') e.tgt = null; } };

  const updateAllies = (R, dt) => {
    if (!R.allies) return;
    const P = R.player;
    updateTaunts(R, dt);
    for (const a of R.allies) {
      if (a.dead) continue;
      a.flash = Math.max(0, (a.flash || 0) - dt);
      a.calm = (a.calm || 0) + dt;
      if (a.calm > 4) a.hp = Math.min(a.maxHp, a.hp + a.regen * dt);   // 4초 동안 안 맞으면 천천히 회복
      if (a.kind === 'wing') {
        const N = SA.NAMED[a.named];
        if (SA.Input.hit('KeyG') && !R.tabOpen) { a.cover = !a.cover; SA.Raid.msg(a.cover ? `${N.name}: "${N.coverOn}" — 엄호: 받는 피해 절반을 내가 대신 맞는다` : `${N.name}: "${N.coverOff}"`, N.color, 3); }
        wingAI(R, a, N, dt);
      } else if (a.kind === 'convoy') {
        // 플레이어가 너무 멀면 기다린다. 소행성은 밀어낸다
        if (a.arrived) continue;
        const far = U.d2(a.x, a.y, P.x, P.y) > 420 * 420;
        const ang = U.ang(a.x, a.y, a.to.x, a.to.y), sp = far ? 0 : SA.CONVOY.speed;
        a.vx += (Math.cos(ang) * sp - a.vx) * Math.min(1, 2 * dt); a.vy += (Math.sin(ang) * sp - a.vy) * Math.min(1, 2 * dt);
        a.x += a.vx * dt; a.y += a.vy * dt; a.face = ang; a.waiting = far;
        pushOutAsteroids(R, a, a.r);
        if (U.d2(a.x, a.y, a.to.x, a.to.y) < 60 * 60) { a.arrived = true; a.vx = a.vy = 0; SA.Raid.convoyArrived(a); }
      }
    }
  };
  const updateExtra = (R, dt) => {
    for (const s of R.strikes) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; boom(R, { x: s.x, y: s.y, aoe: s.r, dmg: s.dmg }); R.eb = R.eb.filter(b => U.d2(b.x, b.y, s.x, s.y) > s.r * s.r); } }
    R.strikes = R.strikes.filter(s => s.t > -0.2);
    for (const w of R.wells) {
      w.t -= dt;
      for (const e of R.enemies) { if (e.dead || e.crate || e.boss || !(SA.ENEMIES[e.type] || {}).speed) continue; const dx = w.x - e.x, dy = w.y - e.y, q = Math.hypot(dx, dy); if (q < w.r && q > 6) { e.x += dx / q * 90 * dt; e.y += dy / q * 90 * dt; } }
      for (const it of R.items) { const dx = w.x - it.x, dy = w.y - it.y, q = Math.hypot(dx, dy); if (q < w.r && q > 6) { it.vx += dx / q * 200 * dt; it.vy += dy / q * 200 * dt; } }
    }
    R.wells = R.wells.filter(w => w.t > 0);
    for (const b of R.bolts) b.life -= dt; R.bolts = R.bolts.filter(b => b.life > 0);
    for (const b of R.beams) b.life -= dt; R.beams = R.beams.filter(b => b.life > 0);
  };

  return { updateAllies, hurtAlly, updateExtra, stun, hitEnemy, eff, wear, eb, ring, fan, fx, text, updatePlayer, updateEnemies, updateBullets, spawnEnemy, hurtPlayer, damageEnemy, insideAsteroid, hasPas };
})();
