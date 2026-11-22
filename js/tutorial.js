// 튜토리얼 (프롤로그): 3년 전, 단장이 전용기를 타고 쫓긴다.
// 구간 ① 도주 → ② 탄막·스침 → ③ 매복(기술·장비) → ④ 난파선(화물칸·보안 칸) → ⑤ 탈출 → 격추 연출 → "3년 후."
// 죽지 않는다(체력 1에서 멈춤). 보안 칸에 넣은 것만 3년 후 창고로 간다. 추격대의 정체와 이유는 말하지 않는다.
// 수치·대사는 전부 임시 (Claude 초안)
SA.Tutorial = (() => {
  const U = SA.U, C = () => SA.Combat;
  let R = null;

  // 3년 전 단장의 장비: 행성·은하급 에이스 장비 (격추로 전부 잃는다)
  const start = () => {
    const parts = [];
    const mk = (id, lv = 0, mod = null) => { const p = SA.Save.newPart(id); p.lv = lv; if (mod) p.mod = mod; p.max = p.dur = SA.LV_MAX[lv]; parts.push(p); return p.uid; };
    const tp = {
      ship: 'ace', pilot: 'kai', parts, stash: SA.Grid.make(1, 1), bring: {}, recipes: [], credits: 0,
      loadouts: { ace: { main: mk('lance', 2, 'm_pierce'), main2: null, sub: [mk('hturret', 1, 's_dbl'), mk('hturret', 1, 's_dbl')],   // 양쪽 날개 포 2문
        act: [mk('orbital', 1, 'a_o10'), mk('timestop')], pas: [mk('barrier', 2), mk('sensor'), mk('cooler', 1)], obs: null, cell: null } },
    };
    return SA.Raid.start(tp, { tut: true });
  };

  // SA.Raid.start가 기체를 만든 뒤 부른다: 대본용 맵
  const setup = (r) => {
    R = r;
    R.map = { w: 5200, h: 1500, name: '3년 전' };
    const P = R.player;
    P.x = 700; P.y = R.map.h / 2; P.aim = 0;
    P.cell = { id: 'cell3', e: SA.ITEMS.cell3.cap };
    R.extracts = []; R.beaconQ = []; R.beaconN = SA.EXIT.max; R.distressAt = 0; R.hunterSpawned = true;
    R.zoom = R.zoomTarget = SA.OBS.levels[0]; R.zoomLv = 0; R.obsLv = 0;
    R.fogW = Math.ceil(R.map.w / SA.OBS.fogCell); R.fogH = Math.ceil(R.map.h / SA.OBS.fogCell); R.fog = new Uint8Array(R.fogW * R.fogH).fill(1); R.fogT = 0;
    R.cam.x = P.x; R.cam.y = P.y; R.allies = [];
    R.tut = { st: 0, t: 0, rt: 0, goal: '', card: '3년 전.', cardA: 1, white: 0, f: {}, pq: [], prompt: null };
    SA.Audio.play('raid');
    return R;
  };

  // ── 도우미 ──
  const say = (t) => SA.Raid.say('cmd', t);
  const msg = (t, c, l) => SA.Raid.msg(t, c, l);
  const alive = (tag) => R.enemies.filter(e => !e.dead && e.tut === tag).length;
  // 튜토리얼 적 드랍: 화물칸이 작고 어차피 잃으니 기본 재료 조금만 (설계도·해독키·블랙박스·부품 완성품 없음)
  const LOOT = { fighter: [['scrap', .3]], frigate: [['scrap', 1], ['core', .4], ['wire', .3]] };
  const spawn = (type, dx, dy, tag) => {
    const P = R.player, ai = (SA.ENEMIES[type] || {}).ai;
    const e = C().spawnEnemy(R, type, U.clamp(P.x + dx, 40, R.map.w - 40), U.clamp(P.y + dy, 40, R.map.h - 40), { awake: true, noRespawn: true, noDrop: true, loot: LOOT[ai] || [] });
    e.tut = tag; return e;
  };
  // 조작 안내: 시간이 느려지고 화면 가운데에 누를 키가 뜬다. 해내면 풀린다 (한 번에 하나씩)
  const I = () => SA.Input;
  const prompt = (keys, text, done, sub) => R.tut.pq.push({ keys, text, done, sub, t: 0 });
  const updPrompt = (rdt) => {
    const T = R.tut;
    if (!T.prompt && T.pq.length) { T.prompt = T.pq.shift(); SA.Audio.sfx('beep'); }
    const p = T.prompt;
    if (!p) return;
    p.t += rdt;
    if (!R.tabOpen) R.timeScale = 0.2;
    if (p.t > 0.5 && p.done(p)) {
      T.prompt = null; if (!R.tabOpen) R.timeScale = 1; SA.Audio.sfx('pickup', 2);
    }
  };
  const go = (st) => { const T = R.tut; T.st = st; T.t = 0; T.f = {}; T.n = 0; SA.Audio.sfx('beep'); ENTER[st] && ENTER[st](); };
  const ck = (b) => b ? '✓' : '·';

  // 구간에 들어갈 때
  const ENTER = {
    1: () => {   // ① 도주 시작
      say('…따라붙었군.');
      spawn('k_fighter', -340, -70, 1); spawn('k_fighter', -340, 70, 1);
      SA.Audio.sfx('siren');
      const P = R.player, x0 = P.x, y0 = P.y;
      prompt(['W', 'A', 'S', 'D'], '이동', () => Math.hypot(P.x - x0, P.y - y0) > 40, '누르는 방향으로 움직인다');
      prompt(['마우스', '좌클릭'], '조준 · 사격', () => I().mouse.down, '마우스로 겨누고, 좌클릭을 누르고 있으면 쏜다');
    },
    2: () => {   // ② 탄막 — Shift 저속·스침을 알려 주고 순양함을 잡는다
      const fr = spawn('k_frigate', 380, 0, 2); fr.hp = fr.maxHp = 260; R.tut.fr = fr;
      spawn('k_fighter', 420, -160, 2);
      prompt(['Shift'], '저속 이동', () => I().isDown('ShiftLeft') || I().isDown('ShiftRight'), '누르는 동안 느려지고 판정점이 보인다. 맞는 곳은 기체 한가운데 점 하나뿐');
      prompt([], '스침', (p) => R.graze > 0 || p.t > 5, '적 탄을 아슬아슬하게 스치면 스택이 쌓이고, 쌓일수록 피해·드랍이 오른다');
    },
    3: () => {   // ③ 매복 편대 — 기술과 장비를 아끼지 말 것
      msg('매복!', '#ff6b7a', 2.5); SA.Audio.sfx('siren'); R.shake = 6;
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.3; spawn('k_fighter', Math.cos(a) * 300, Math.sin(a) * 260, 3); }
      spawn('k_frigate', 360, -40, 3);
      R.tut.total = 7;
      const P = R.player, a = P.acts;
      prompt(['Space'], '파일럿 기술 · 배럴 롤', () => P.rollT > 0 || P.skillCd > 0, '잠깐 무적이 되어 이동 방향으로 미끄러진다');
      prompt(['Q'], '액티브 · 궤도 폭격', () => a[0] && a[0].cd > 0, '마우스 커서 위치에 잠시 뒤 포격이 떨어진다');
      prompt(['E'], '액티브 · 탄막 정지', () => a[1] && a[1].cd > 0, '주변 적 탄이 잠깐 멈춘다');
    },
    4: () => {   // ④ 난파선 — 보안 칸 2×2보다 많이 나온다. 무엇을 지킬지 고른다
      const P = R.player, x = U.clamp(P.x + 420, 80, R.map.w - 80), y = U.clamp(P.y, 120, R.map.h - 120);
      const fit = Object.keys(SA.PARTS).filter(k => SA.PARTS[k].tier === '강화' && !['raven', 'resonator', 'timestop', 'decoder', 'secure2'].includes(k) && SA.ITEMS['pt_' + k] && SA.ITEMS['pt_' + k].w <= 2 && SA.ITEMS['pt_' + k].h <= 2);
      const loot = ['qcircuit', 'alloy', 'scrap', 'bp:강화', 'core', 'pt_' + U.pick(fit), 'wire', 'alloy', 'scrap'];
      const w = { type: 'wreck', x, y, label: '떠다니는 수송선 잔해', fast: true, seen: true, done: false, prog: 0, seed: Math.random(), loot, total: loot.length + 1, cur: 0 };
      R.pois.push(w); R.tut.wreck = w;
    },
    5: () => {   // ⑤ 탈출 — 귀환 비콘 → 포트에서 버티기
      const P = R.player, x = { x: U.clamp(P.x + 480, 80, R.map.w - 80), y: U.clamp(P.y - 60, 120, R.map.h - 120), active: false, prog: 0, beepT: 0 };
      R.extracts.push(x); R.tut.ex = x;
      x.beacon = C().spawnEnemy(R, 'crate', x.x, x.y, { crate: true, beaconOf: x, def: { hp: SA.EXIT.hp, r: 13 }, hp: SA.EXIT.hp, maxHp: SA.EXIT.hp, r: 13, loot: [] });
      msg('귀환 비콘 신호 — 부수면 귀환 포트가 열린다', '#ffb347', 5);
    },
    6: () => {   // 격추 연출: 화면 밖 거대 광선. 정체는 보여 주지 않는다
      msg('!!! 경고 — 거대한 에너지 반응', '#ff4d6d', 3); SA.Audio.sfx('siren');
      for (const e of R.enemies) if (e.tut === 5) e.dead = true;
      R.eb = [];
    },
  };

  const update = (r, dt, rdt) => {
    R = r; const T = R.tut, P = R.player;
    T.t += dt; T.rt += rdt;
    P.x = U.clamp(P.x, 16, R.map.w - 16); P.y = U.clamp(P.y, 16, R.map.h - 16);
    if (T.st >= 1 && T.st <= 5) updPrompt(rdt);
    switch (T.st) {
      case 0:   // 검은 화면 "3년 전."
        T.goal = '';
        if (T.rt > 2.4) T.cardA = Math.max(0, T.cardA - rdt * 1.5);
        if (T.cardA <= 0) { T.card = null; go(1); }
        break;
      case 1: {
        T.goal = `추격기 격추 ${2 - alive(1)}/2  (WASD 이동 · 좌클릭 사격)`;
        if (!alive(1) && T.t > 1 && !T.prompt && !T.pq.length) go(2);
        break;
      }
      case 2: {   // 기능만 알려 주고 목표치는 없다: 순양함만 잡으면 된다
        T.goal = '순양함 격추';
        if (T.fr.dead && !T.prompt && !T.pq.length) { for (const e of R.enemies) if (e.tut === 2) e.dead = true; go(3); }
        break;
      }
      case 3: {
        const f = T.f, a = P.acts;
        if (P.rollT > 0 || P.skillCd > 0) f.roll = true;
        if (a[0] && (a[0].cd > 0 || a[0].ch < 2)) f.q = true;
        if (a[1] && a[1].cd > 0) f.e = true;
        T.goal = `${ck(f.roll)} Space 배럴 롤(잠깐 무적)  ${ck(f.q)} Q 궤도 폭격(커서 위치)  ${ck(f.e)} E 탄막 정지 — 편대 ${T.total - alive(3)}/${T.total}`;
        if (!alive(3) && T.t > 1 && !T.prompt && !T.pq.length) go(4);
        break;
      }
      case 4: {
        const w = T.wreck, f = T.f;
        if (!w.done) T.goal = '잔해 위에 머물러 뒤지기 — 나온 것은 기체로 끌려와 화물칸에 들어간다';
        else if (!f.told) {
          f.told = true;
          prompt(['Tab'], '화물칸 열기', () => R.tabOpen, '여는 동안 시간이 느려진다. 이동은 되지만 사격은 못 한다');
          msg('격추되면 화물칸은 날아간다. 보안 칸(2×2)에 넣은 것만 살아남는다 — 다 넣을 수는 없다. 가장 값진 것을 골라라', '#ffd166', 10);
        }
        if (w.done) {
          const n = R.secure.items.length;
          if (!R.tabOpen && !n) T.goal = 'Tab — 화물칸 열기';
          else if (R.tabOpen) T.goal = `좋은 것(양자 회로·설계도·부품)을 끌어서 보안 칸에 넣기 — 지금 ${n}개 · 다 됐으면 Tab으로 닫기`;
          else T.goal = `보안 칸 ${n}개 — 더 넣으려면 Tab, 됐으면 그대로 출발`;
          if (n && !R.tabOpen) { T.n += rdt; if (T.n > 1.2) go(5); } else T.n = 0;
        }
        break;
      }
      case 5: {
        const x = T.ex, E = SA.CFG.EXTRACT_TIME;
        if (!x.active) { T.goal = '귀환 비콘(주황) 부수기'; break; }
        if (!T.f.open) { T.f.open = true; msg('귀환 포트 개방 — 안에서 버티면 탈출', '#5dffb0', 4); SA.Audio.sfx('unlock'); T.wave = 1.5; say('…조금만 더.'); }
        const inside = U.d2(x.x, x.y, P.x, P.y) < SA.CFG.EXTRACT_R ** 2;
        if (inside) { const b = Math.floor(x.prog); x.prog += dt; if (Math.floor(x.prog) !== b) SA.Audio.sfx('beep'); }
        else x.prog = Math.max(0, x.prog - dt * 3);
        T.goal = `귀환 포트 안에서 버티기 ${x.prog.toFixed(1)}/${E}초 — 벗어나면 줄어든다`;
        T.wave -= dt;
        if (T.wave <= 0 && alive(5) < 6) { T.wave = 5; for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; spawn('k_fighter', Math.cos(a) * 360, Math.sin(a) * 300, 5); } }
        if (x.prog >= E - 1.4) go(6);
        break;
      }
      case 6: {   // 연출은 실제 시간(rdt) 기준
        T.goal = '';
        T.rt6 = (T.rt6 || 0) + rdt;
        const t6 = T.rt6;
        if (!T.f.beam && t6 > 1.6) {
          T.f.beam = true;
          R.beams.push({ x: P.x + 1100, y: P.y + 6, a: Math.PI, len: 2400, w: 90, life: 1.2, max: 1.2, col: '#ffffff' });
          R.shake = 26; SA.Audio.sfx('bigboom'); SA.Audio.play('death');
          C().fx(R, P.x, P.y, 90, '#ffb347', 260, 1.0, 2); C().fx(R, P.x, P.y, 40, '#fff', 160, 0.6, 1.5);
          P.dead = true; R.timeScale = 0.3; R.tabOpen && SA.UI.tabClose();
        }
        if (!T.f.beam) T.warnA = Math.min(1, t6 / 1.4);
        if (T.f.beam) T.white = Math.min(1, (t6 - 1.6) / 1.4);
        if (t6 > 3.4 && !T.f.c1) { T.f.c1 = true; T.card = '보안 칸은 남았다.'; T.cardA = 0; }
        if (t6 > 3.4 && t6 < 6) T.cardA = Math.min(1, T.cardA + rdt * 1.5);
        if (t6 > 6 && !T.f.c2) { T.f.c2 = true; T.card = '3년 후.'; }
        if (t6 > 8.6 && !T.f.end) { T.f.end = true; end(); }
        break;
      }
    }
  };

  // 보안 칸에 넣은 것 → 3년 후 창고 (기본 지급품에 더해서). 부품은 부품함으로
  const end = () => {
    const prof = SA.profile, got = [];
    for (const it of R.secure.items) {
      const d = SA.ITEMS[it.id];
      if (d.kind === 'part') { prof.parts.push(SA.Save.fromItem(it)); got.push(d.name); continue; }
      const ex = {}; for (const k of ['ch', 'dur', 'lv', 'mod']) if (it[k] !== undefined) ex[k] = it[k];
      if (SA.Grid.add(prof.stash, it.id, ex)) got.push(d.name); else { prof.credits += d.val; got.push(`${d.name}(₵${d.val})`); }
    }
    prof.tutDone = true; SA.Save.store(prof);
    SA.Main.endTutorial(got);
  };

  // ── 화면: 목표 한 줄 · 경고선 · 검은 화면 글귀 · 화이트아웃 ──
  const txt = (ctx, s, x, y, col, size, align = 'left') => {
    ctx.font = `bold ${size}px "Galmuri11", "Malgun Gothic", sans-serif`; ctx.textAlign = align;
    ctx.fillStyle = '#05070d'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  const draw = (ctx, R) => {
    const T = R.tut, W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (T.goal) {
      ctx.font = 'bold 14px "Galmuri11", "Malgun Gothic", sans-serif';
      const w = ctx.measureText('목표  ' + T.goal).width;
      ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(14, 14, w + 24, 30);
      txt(ctx, '목표', 26, 34, '#8f9bb8', 14); txt(ctx, T.goal, 66, 34, '#ffd166', 14);
    }
    if (T.prompt) {   // 키 안내 (시간이 느려진 동안)
      const p = T.prompt, a = Math.min(1, p.t * 4), y = R.tabOpen ? 70 : Math.round(H * 0.27);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(5,7,13,0.78)'; ctx.fillRect(W / 2 - 300, y - 46, 600, p.sub ? 112 : 92);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 300 + 0.5, y - 45.5, 599, (p.sub ? 112 : 92) - 1);
      ctx.font = 'bold 18px "Galmuri11", "Malgun Gothic", sans-serif';
      const ws = p.keys.map(k => Math.max(36, ctx.measureText(k).width + 22)), gap = 8, tw = ws.reduce((n, w) => n + w, 0) + gap * Math.max(0, ws.length - 1);
      let x = W / 2 - tw / 2;
      const pulse = 0.5 + 0.5 * Math.sin(p.t * 8);
      p.keys.forEach((k, i) => {   // 키 모양 상자
        ctx.fillStyle = '#1b2233'; ctx.fillRect(x, y - 34, ws[i], 34);
        ctx.fillStyle = `rgba(255,209,102,${0.5 + 0.5 * pulse})`; ctx.fillRect(x, y - 4, ws[i], 4);
        ctx.strokeStyle = '#e6edf3'; ctx.strokeRect(x + 0.5, y - 33.5, ws[i] - 1, 33);
        txt(ctx, k, x + ws[i] / 2, y - 11, '#ffffff', 18, 'center');
        x += ws[i] + gap;
      });
      txt(ctx, p.text, W / 2, y + (p.keys.length ? 26 : -8), '#ffd166', 18, 'center');
      if (p.sub) txt(ctx, p.sub, W / 2, y + (p.keys.length ? 52 : 22), '#cfe3ff', 13, 'center');
      ctx.globalAlpha = 1;
    }
    if (T.st === 6 && !T.f.beam && T.warnA) {   // 화면 오른쪽 밖에서 겨누는 붉은 선
      const y = H / 2 + 6 * (R.zoom || 2);
      ctx.globalAlpha = 0.35 + 0.5 * T.warnA * (0.5 + 0.5 * Math.sin(T.rt6 * 30));
      ctx.fillStyle = '#ff3355'; ctx.fillRect(0, y - 1 - T.warnA * 2, W, 2 + T.warnA * 4);
      ctx.globalAlpha = 1;
    }
    if (T.white > 0) { ctx.fillStyle = `rgba(255,255,255,${T.white})`; ctx.fillRect(0, 0, W, H); }
    if (T.card) {
      const fade = T.st === 6 ? Math.min(1, Math.max(0, (T.rt6 - 3.2) / 1.2)) : 1;   // 하양 → 검정
      ctx.fillStyle = T.st === 6 ? `rgba(5,7,13,${fade})` : `rgba(5,7,13,${T.cardA})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = T.st === 6 ? Math.min(1, T.cardA) : T.cardA;
      txt(ctx, T.card, W / 2, H / 2, '#e6edf3', 24, 'center');
      ctx.globalAlpha = 1;
    }
  };

  return { start, setup, update, draw };
})();
