// 자동 촬영 키트 (게임 밖, 촬영 때만 주입): 장면 연출 + 자동 조종사
window.CapKit = (() => {
  const K = SA.Input.sim;
  const DIRS = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const bot = { goal: null, stopAt: 30, fire: true, orbit: 170, aggro: 520, actives: true, skill: true, on: true, look: null };
  let prev = 0, aimX = 640, aimY = 300, f = 0;
  const cv = () => document.querySelector('#game');
  const scr = (R, x, y) => { const c = cv(), Z = R.zoom || 2; return [c.width / 2 + (x - R.cam.x) * Z, c.height / 2 + (y - R.cam.y) * Z]; };
  const keys = (dx, dy) => { K.key('KeyD', dx > 0); K.key('KeyA', dx < 0); K.key('KeyS', dy > 0); K.key('KeyW', dy < 0); };

  // 탄을 피하면서 표적 둘레를 돈다: 9방향 후보를 점수로 고른다
  const think = (R) => {
    f++;
    const P = R.player; if (!P || P.dead || !bot.on) { keys(0, 0); K.mouse(aimX, aimY, false, false); return; }
    let tgt = null, bd = 1e12;
    for (const e of R.enemies) { if (e.dead || e.ally || e.friendly) continue; const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < bd) { bd = d; tgt = e; } }
    const engage = tgt && bd < bot.aggro ** 2;
    const sp = P.speed || 160;
    let best = 0, bs = -1e9;
    DIRS.forEach(([dx, dy], i) => {
      const n = Math.hypot(dx, dy) || 1, vx = dx / n * sp, vy = dy / n * sp;
      let s = 0;
      for (const b of R.eb) {
        const ox = b.x - P.x, oy = b.y - P.y; if (ox * ox + oy * oy > 240 * 240) continue;
        for (const tau of [0.05, 0.12, 0.22, 0.35]) {
          const ex = ox + (b.vx - vx) * tau, ey = oy + (b.vy - vy) * tau, d = Math.hypot(ex, ey), R0 = (b.r || 3) + 14;
          if (d < R0 + 16) s -= (R0 + 16 - d) * 0.35 / tau;
        }
      }
      const nx = P.x + vx * 0.3, ny = P.y + vy * 0.3;
      if (SA.Combat.insideAsteroid(R, nx, ny)) s -= 60;
      if (nx < 40 || ny < 40 || nx > R.map.w - 40 || ny > R.map.h - 40) s -= 60;
      if (engage) { const d = Math.hypot(tgt.x - nx, tgt.y - ny); s -= Math.abs(d - bot.orbit) * 0.04; }
      if (bot.goal) {
        const gx = bot.goal.x - P.x, gy = bot.goal.y - P.y, gd = Math.hypot(gx, gy);
        if (gd > bot.stopAt) s += (dx * gx + dy * gy) / (n * gd) * (engage ? 1.5 : 4);
        else if (i === 0) s += 3;
      }
      if (i === prev) s += 0.8;
      if (s > bs) { bs = s; best = i; }
    });
    prev = best; keys(DIRS[best][0], DIRS[best][1]);
    let tx, ty;
    if (engage) { const d = Math.sqrt(bd), lead = d / 520; [tx, ty] = scr(R, tgt.x + (tgt.vx || 0) * lead, tgt.y + (tgt.vy || 0) * lead); }
    else if (bot.look) [tx, ty] = scr(R, bot.look.x, bot.look.y);
    else { const [px, py] = scr(R, P.x, P.y), d = DIRS[best]; tx = px + (d[0] || 0) * 160; ty = py + (d[1] || (d[0] ? 0 : -1)) * 160; }
    aimX += (tx - aimX) * 0.22; aimY += (ty - aimY) * 0.22;
    K.mouse(aimX, aimY, !!(engage && bot.fire), false);
    if (engage && bot.actives && bd < 300 * 300) { if (f % 300 === 90) K.tap('KeyQ'); if (f % 300 === 240) K.tap('KeyE'); }
    if (engage && bot.skill && f % 420 === 200) K.tap('Space');
  };

  const spawnRing = (R, types, r, awake = true) => {
    const P = R.player;
    types.forEach((t, i) => {
      const a = i / types.length * Math.PI * 2 + Math.random() * 0.4;
      let x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      for (let k = 0; k < 8 && SA.Combat.insideAsteroid(R, x, y); k++) { x += 30; y += 20; }
      const e = SA.Combat.spawnEnemy(R, t, x, y); e.awake = awake;
    });
  };
  const clearNear = (R, x, y, r) => { R.enemies = R.enemies.filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 > r * r); R.eb.length = 0; };
  const moveTo = (R, x, y) => { const P = R.player; P.x = x; P.y = y; R.cam.x = x; R.cam.y = y; };
  const openSpot = (R, x, y) => { for (let k = 0; k < 40 && SA.Combat.insideAsteroid(R, x, y); k++) { x += 37; y -= 23; } return [x, y]; };

  // 장면: setup(R)은 첫 프레임 전에 한 번, tick(R, t)는 매 프레임(선택)
  const SCENES = {
    fight: { setup(R) { const [x, y] = openSpot(R, R.map.w * 0.45, R.map.h * 0.5); moveTo(R, x, y); clearNear(R, x, y, 900); spawnRing(R, ['k_fighter', 'k_fighter', 'k_tracker', 'k_fighter', 'k_frigate', 'k_fighter'], 300); } },
    swarm: { setup(R) { const [x, y] = openSpot(R, R.map.w * 0.45, R.map.h * 0.5); moveTo(R, x, y); clearNear(R, x, y, 900); spawnRing(R, ['k_fighter', 'k_tracker', 'e_fighter', 'k_fighter', 'k_tracker', 'e_fighter', 'k_frigate', 'e_frigate', 'k_fighter', 'k_tracker'], 340); },
      tick(R, t) { if (t > 6 && t < 6.02) spawnRing(R, ['k_fighter', 'k_tracker', 'k_fighter', 'e_fighter'], 380); } },
    wreck: { setup(R) {
      const P = R.player, w = R.pois.filter(p => p.type === 'wreck' && !p.done).sort((a, b) => ((a.x - P.x) ** 2 + (a.y - P.y) ** 2) - ((b.x - P.x) ** 2 + (b.y - P.y) ** 2))[0];
      const [x, y] = openSpot(R, w.x - 230, w.y + 60); moveTo(R, x, y); clearNear(R, w.x, w.y, 700);
      bot.goal = w; bot.stopAt = 14; bot.look = w;
    } },
    wreckfight: { setup(R) { SCENES.wreck.setup(R); spawnRing(R, ['k_fighter', 'k_fighter', 'k_tracker'], 420, false); bot.orbit = 120; } },
    tour: { setup(R) {
      const pts = R.pois.filter(p => p.type !== 'wreck').slice(0, 6); bot.tour = pts; bot.goal = pts[0]; bot.stopAt = 60;
    }, tick(R) { if (!bot.goal) return; const P = R.player; if ((bot.goal.x - P.x) ** 2 + (bot.goal.y - P.y) ** 2 < 80 * 80) { bot.tour.push(bot.tour.shift()); bot.goal = bot.tour[0]; } } },
    idle: { setup() { bot.on = false; } },
  };
  return { bot, think, SCENES, spawnRing, clearNear, moveTo };
})();
