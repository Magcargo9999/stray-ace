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
      hit: o.pierce ? new Set() : null, col: o.col || '#bfe9ff', w: o.w || 1.6, homing: o.homing || 0, target: null, missile: !!o.missile });
  };

  // ── 효과 ──
  const fx = (R, x, y, n, col, spd = 80, life = 0.5, size = 2) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
      R.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.8), max: life, col, size });
    }
  };
  const text = (R, x, y, s, col = '#fff') => R.texts.push({ x, y, s, col, life: 1.1 });

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
    if (P.skillState === 'repair') spd *= 0.5;
    if (P.skillState === 'boost') spd *= 1.6;
    if (P.dash > 0) {
      P.dash -= dt;
      P.x += P.dvx * dt; P.y += P.dvy * dt;
      P.vx = P.dvx * 0.25; P.vy = P.dvy * 0.25;
      if (P.skillState === 'ram') ramHits(R, P);
      if (Math.random() < 0.8) R.after.push({ x: P.x, y: P.y, life: 0.25 });
    } else {
      const k = Math.min(1, P.accel * dt);
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
      const rate = d.rate * (hasPas(P, 'cooler') ? 1.15 : 1) * st.fire * me;
      P.fireCd = 1 / rate;
      const tx = P.x + Math.cos(P.aim) * 8, ty = P.y + Math.sin(P.aim) * 8;
      for (let i = 0; i < d.shots; i++) {
        let a = P.aim + U.rnd(-d.spread, d.spread);
        let ox = 0, oy = 0;
        if (main.id === 'twin') { const s = i ? 1 : -1; ox = Math.cos(P.aim + Math.PI / 2) * 3 * s; oy = Math.sin(P.aim + Math.PI / 2) * 3 * s; a = P.aim; }
        pb(R, tx + ox, ty + oy, a, d.spd * U.rnd(0.92, 1.05), d.dmg, { pierce: d.pierce, life: main.id === 'scatter' ? 0.45 : 1.1,
          col: main.id === 'lance' ? '#9ff' : '#bfe9ff', w: main.id === 'lance' ? 2.4 : 1.6 });
      }
      wear(main, 0.004);
      SA.Audio.sfx('shoot');
    }

    // 서브웨폰 (자동)
    for (const s of P.subs) {
      const e = eff(s.part); if (!e) continue;
      const d = SA.PARTS[s.part.id];
      if (s.part.id === 'drone') { s.orb += dt * 2.2; s.x = P.x + Math.cos(s.orb) * 22; s.y = P.y + Math.sin(s.orb) * 22; }
      else { s.x = P.x + s.ox; s.y = P.y + s.oy; }
      s.cd -= dt;
      const t = nearestEnemy(R, s.x, s.y, d.range);
      if (t) s.ang = U.ang(s.x, s.y, t.x, t.y);
      if (t && s.cd <= 0) {
        s.cd = 1 / (d.rate * st.fire * e);
        pb(R, s.x, s.y, s.ang + U.rnd(-0.05, 0.05), 460, d.dmg, { col: '#ffe6a8', w: 1.2, life: 0.7 });
        wear(s.part, 0.003);
        SA.Audio.sfx('sub');
      }
    }

    // 액티브 Q/E
    ['KeyQ', 'KeyE'].forEach((key, i) => {
      const a = P.acts[i]; if (!a) return;
      a.cd = Math.max(0, a.cd - dt);
      if (I.hit(key) && !R.tabOpen) {
        if (a.cd > 0 || !eff(a.part)) { SA.Audio.sfx('deny'); return; }
        useActive(R, P, a);
      }
    });

    // 파일럿 기술 (Space)
    P.skillCd = Math.max(0, P.skillCd - dt);
    if (P.skillT > 0) {
      P.skillT -= dt;
      if (P.skillState === 'repair') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.25 / 3 * dt);
      if (P.skillT <= 0) P.skillState = null;
    }
    if (I.hit('Space') && !R.tabOpen) {
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
    }
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
      case 'slip': P.skillState = 'slip'; P.skillT = 2; SA.Audio.sfx('boost'); break;
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
      if (U.d2(e.x, e.y, P.x, P.y) < (e.r + 10) ** 2) { P.rammed.add(e); damageEnemy(R, e, 45); R.shake = Math.max(R.shake, 4); }
    }
  };

  // ── 플레이어 피격 ──
  const hurtPlayer = (R, dmg) => {
    const P = R.player;
    if (P.invuln > 0 || P.dead || R.state !== 'play') return;
    if (P.barrier > 0) { const b = Math.min(P.barrier, dmg); P.barrier -= b; dmg -= b; }
    P.barrierT = 0;
    P.hp -= dmg; P.invuln = SA.CFG.HIT_INVULN;
    R.shake = 6; R.hurtFlash = 0.35;
    R.graze = Math.floor(R.graze / 2);
    const eq = [P.main, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas].filter(Boolean);
    if (eq.length) wear(U.pick(eq), 2);
    SA.Audio.sfx('hurt');
    fx(R, P.x, P.y, 14, '#ff8a8a', 120, 0.4);
    if (P.hp <= 0) { P.hp = 0; SA.Raid.playerDied(); }
  };

  // ── 적 ──
  const spawnEnemy = (R, type, x, y, o = {}) => {
    const d = SA.ENEMIES[type] || o.def;
    const e = Object.assign({ type, x, y, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, r: d.r, t: U.rnd(0, 2), t2: 0, flash: 0,
      dir: Math.random() < 0.5 ? 1 : -1, homeX: x, homeY: y, awake: false, a: 0, phase: 1, dead: false }, o);
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
      const dist = Math.sqrt(U.d2(e.x, e.y, P.x, P.y));
      if (dist > 900 && !e.boss) continue;           // 멀면 잠든다
      e.face = e.face === undefined ? Math.atan2(R.player.y - e.y, R.player.x - e.x) : e.face;
      if (e.crate) continue;
      e.t += dt;
      const aP = U.ang(e.x, e.y, P.x, P.y);
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
          } else if (cyc < 3) {            // 왕국 포대: 회전 나선
            e.t2 += dt;
            while (e.t2 > 0.11) { e.t2 -= 0.11; e.a += 0.23 * e.dir; eb(R, e.x, e.y, e.a, 88, { r: 3.5 }); eb(R, e.x, e.y, e.a + Math.PI, 88, { r: 3.5 }); }
          }
          break;
        }
        case 'corrode': {
          e.vx += (Math.cos(aP) * 52 - e.vx) * Math.min(1, 2 * dt); e.vy += (Math.sin(aP) * 52 - e.vy) * Math.min(1, 2 * dt);
          if (e.t > 3.2 && dist < 220 && alive) { e.t = 0; ring(R, e.x, e.y, 8, 58, Math.random(), { r: 4, col: '#c9a2ff' }); }
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
  const updateRaven = (R, e, dt, dist, aP, alive) => {
    if (!e.awake) { if (dist < 340 || e.hp < e.maxHp) { e.awake = true; SA.Raid.bossEngaged(e); } else return; }
    if (e.hp < e.maxHp * 0.5 && e.phase === 1) { e.phase = 2; SA.Raid.msg('레이븐: "제법이군. 이제 진짜다."', '#ff4d6d'); }
    const orbit = aP + Math.PI + e.dir * 0.9;
    const tx = R.player.x + Math.cos(orbit + Math.PI) * 170, ty = R.player.y + Math.sin(orbit + Math.PI) * 170;
    const sp = e.phase === 2 ? 175 : 150;
    if (e.roll > 0) { e.roll -= dt; }
    else {
      const a = U.ang(e.x, e.y, tx, ty);
      e.vx += (Math.cos(a) * sp - e.vx) * Math.min(1, 2.5 * dt); e.vy += (Math.sin(a) * sp - e.vy) * Math.min(1, 2.5 * dt);
    }
    e.t2 += dt;
    if (e.t2 > 4.5) {            // 배럴 롤
      e.t2 = 0; e.roll = 0.35; e.dir *= -1;
      const pa = aP + Math.PI / 2 * e.dir;
      e.vx = Math.cos(pa) * 420; e.vy = Math.sin(pa) * 420; e.inv = 0.4;
      R.after.push({ x: e.x, y: e.y, life: 0.3, enemy: true });
    }
    e.inv = Math.max(0, (e.inv || 0) - dt);
    if (!alive) return;
    const cyc = e.t % 2.2;
    e.fireT = (e.fireT || 0) + dt;
    if (cyc < 1.2 && e.fireT > (e.phase === 2 ? 0.11 : 0.14)) {
      e.fireT = 0; eb(R, e.x, e.y, aP + U.rnd(-0.08, 0.08), 175, { r: 2.6, dmg: 9, col: '#ff4d6d' });
      SA.Audio.sfx('enemyShot');
    }
    if (e.phase === 2) { e.ringT = (e.ringT || 0) + dt; if (e.ringT > 3) { e.ringT = 0; ring(R, e.x, e.y, 14, 85, Math.random(), { r: 4, col: '#ff7a9c' }); } }
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
      R.kills++;
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
    for (const b of R.eb) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      if (insideAsteroid(R, b.x, b.y)) { if (Math.random() < 0.3) fx(R, b.x, b.y, 1, b.col, 20, 0.2, 1); continue; }
      if (!P.dead && R.state === 'play') {
        const dx = b.x - P.x, dy = b.y - P.y, dd = dx * dx + dy * dy;
        if (dd < (b.r + hitR) ** 2 && P.invuln <= 0) { hurtPlayer(R, b.dmg); continue; }
        if (!b.grazed && dd < (b.r + G) ** 2) {
          b.grazed = true; R.graze++;
          if (slip) P.skillCd = Math.max(0, P.skillCd - 0.2);
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
      if (b.life <= 0) continue;
      if (insideAsteroid(R, b.x, b.y)) { fx(R, b.x, b.y, 2, '#c9b8a0', 40, 0.2, 1); continue; }
      let gone = false;
      for (const e of R.enemies) {
        if (e.dead) continue;
        if (b.hit && b.hit.has(e)) continue;
        if (U.d2(b.x, b.y, e.x, e.y) < (e.r + 2) ** 2) {
          damageEnemy(R, e, b.dmg);
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

  return { eff, wear, eb, ring, fan, fx, text, updatePlayer, updateEnemies, updateBullets, spawnEnemy, hurtPlayer, damageEnemy, insideAsteroid, hasPas };
})();
