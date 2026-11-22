// 시작점: 화면 전환(타이틀 → 격납고 → 레이드 → 결과)과 게임 루프
SA.Main = (() => {
  const $ = (s) => document.querySelector(s);
  let cv, ctx, scene = 'title', last = 0;

  const fit = () => {
    const k = Math.min(innerWidth / cv.width, innerHeight / cv.height);
    cv.style.width = cv.width * k + 'px'; cv.style.height = cv.height * k + 'px';
  };

  const boot = () => {
    cv = $('#game'); ctx = cv.getContext('2d');
    cv.width = SA.CFG.VIEW_W * SA.CFG.ZOOM; cv.height = SA.CFG.VIEW_H * SA.CFG.ZOOM;
    fit(); addEventListener('resize', fit);
    SA.profile = SA.Save.load();
    SA.Input.attach(cv);
    $('#title-start').onclick = () => { SA.Audio.init(); $('#title').style.display = 'none'; beginFlow(); };
    $('#title-reset').onclick = twice($('#title-reset'), () => { SA.profile = SA.Save.reset(); SA.Hangar.toast('초기화했다.'); });
    $('#hg-settings').onclick = () => openSettings(false);
    $('#result-go').onclick = () => { $('#result').style.display = 'none'; scene = 'hangar'; SA.R = null; SA.Hangar.open(); };
    $('#tw-close').onclick = () => SA.UI.tabClose();
    SA.Render.load(() => { $('#loading').style.display = 'none'; $('#title').style.display = 'flex'; });
    requestAnimationFrame(loop);
  };

  // 브라우저 확인창 대신 두 번 누르기 (미리보기 화면에서는 confirm이 막힌다)
  const twice = (btn, fn) => {
    let armed = false; const orig = btn.textContent;
    return () => {
      if (armed) { fn(); btn.textContent = orig; armed = false; return; }
      armed = true; btn.textContent = '한 번 더 누르면 지운다';
      setTimeout(() => { armed = false; btn.textContent = orig; }, 2500);
    };
  };

  // 출격 직전 의뢰 진행을 찍어 두고, 결과창에서 이번 판에 오른 것만 보여 준다
  let preC = {};
  const cSnap = () => { const K = SA.Contracts, o = {}; for (const c of SA.STORY.contracts) { const st = K.st(c.id); if (st.accepted && !st.done && K.open(c)) o[c.id] = SA.Hangar.progOf(c); } return o; };
  const startRaid = () => {
    preC = cSnap();
    scene = 'raid';
    document.querySelectorAll('.ctx').forEach(x => x.remove()); SA.UI.hideTip();
    SA.Raid.start(SA.profile);
  };

  // 사망 처리 방식 고르기 (처음 한 번 + 설정에서 언제든)
  const modeButtons = (cur) => Object.entries(SA.DEATH_MODES).map(([k, m]) => `<button class="btn modebtn${cur === k ? ' on' : ''}" data-mode="${k}"><b>${m.name}</b><div class="small dim">${m.desc}</div></button>`).join('');
  // 첫 접속: 난이도(사망 처리)를 고르면 바로 튜토리얼 프롤로그. 끝나면 격납고
  const beginFlow = () => {
    scene = 'hangar'; SA.Hangar.open();
    const next = () => { if (!SA.profile.tutDone) startTutorial(); };
    if (!SA.profile.deathModeSet) pickDeathMode(next); else next();
  };
  const startTutorial = () => {
    scene = 'raid'; document.querySelectorAll('.ctx').forEach(x => x.remove()); SA.UI.hideTip();
    SA.Hangar.close();
    SA.Tutorial.start();
  };
  const endTutorial = (got) => {
    SA.UI.tabClose(); SA.R = null; scene = 'hangar'; SA.Hangar.open();
    SA.Hangar.toast(got.length ? `3년 후 — 보안 칸에 남아 있던 것: ${got.join(', ')}` : '3년 후 — 보안 칸은 비어 있었다', '#ffd166');
  };
  const pickDeathMode = (cb) => {
    const w = $('#settings'); w.style.display = 'flex';
    w.querySelector('.inner').innerHTML = `<h2>격추되면 무엇을 잃을까</h2><div class="dim small">언제든 설정에서 바꿀 수 있다. 보안 칸은 어느 방식이든 남는다.</div><div class="modes">${modeButtons(SA.profile.deathMode || 'normal')}</div>`;
    w.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { SA.profile.deathMode = b.dataset.mode; SA.profile.deathModeSet = true; SA.Save.store(SA.profile); w.style.display = 'none'; SA.Hangar.toast(`사망 처리: ${SA.DEATH_MODES[b.dataset.mode].name}`); if (cb) cb(); });
  };
  // ── 연습장 ──
  const startRange = () => {
    scene = 'raid'; document.querySelectorAll('.ctx').forEach(x => x.remove()); SA.UI.hideTip();
    SA.Hangar.close();
    SA.Raid.start(SA.profile, { range: true });
    const pnl = document.createElement('div'); pnl.id = 'rangepanel';
    const types = [['k_fighter', '전투기'], ['e_frigate', '프리깃'], ['k_turret', '포대'], ['corrode', '침식체'], ['hunter', '사냥꾼'], ['raven', '레이븐']];
    const modes = [['still', '가만히'], ['move', '움직임'], ['fight', '반격']];
    const draw = () => {
      const R = SA.R; if (!R) return;
      pnl.innerHTML = `<b>연습장</b><div class="small dim">허수아비 부르기</div>${types.map(([t, n]) => `<button class="btn tiny" data-t="${t}">${n}</button>`).join('')}
        <div class="small dim">행동</div>${modes.map(([m, n]) => `<button class="btn tiny${R.dummyMode === m ? ' on' : ''}" data-m="${m}">${n}</button>`).join('')}
        <div class="small dim">설정</div><button class="btn tiny${R.rangeGod ? ' on' : ''}" data-god>피해 무효</button><button class="btn tiny" data-clear>모두 치우기</button>
        <button class="btn small" data-out>격납고로</button>`;
      pnl.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SA.Raid.spawnDummy(b.dataset.t); });
      pnl.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { R.dummyMode = b.dataset.m; for (const e of R.enemies) if (e.dummy) e.dummy = R.dummyMode; draw(); });
      pnl.querySelector('[data-god]').onclick = () => { R.rangeGod = !R.rangeGod; draw(); };
      pnl.querySelector('[data-clear]').onclick = () => { R.enemies.forEach(e => e.dead = true); R.eb = []; R.boss = null; };
      pnl.querySelector('[data-out]').onclick = () => leaveRange();
      pnl.querySelectorAll('button').forEach(b => b.addEventListener('mouseup', () => b.blur()));
    };
    draw(); document.body.appendChild(pnl);
  };
  const leaveRange = () => {
    const p = $('#rangepanel'); if (p) p.remove();
    SA.UI.tabClose(); SA.R = null; scene = 'hangar'; SA.Hangar.open();
  };
  const openSettings = (inRaid) => {
    const s = SA.profile.settings, w = $('#settings');
    w.style.display = 'flex';
    w.querySelector('.inner').innerHTML = `
      <h2>${inRaid ? '일시정지' : '설정'}</h2>
      <label>배경음악 <input type="range" min="0" max="1" step="0.05" value="${s.music}" id="set-music"></label>
      <label>효과음 <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" id="set-sfx"></label>
      <div class="small"><b>격추 시 잃는 것</b> <span class="dim">(바로 적용)</span></div><div class="modes">${modeButtons(SA.profile.deathMode || 'normal')}</div>
      <div class="small dim keys-help">WASD 이동 · 마우스 조준 · 좌클릭 주무기 · Q/E 액티브 · Space 파일럿 기술<br>휠 주무기 교체 · 우클릭 조준 · Shift 저속 이동 · R 동력원 교체 · X 길게 비상탈출<br>Tab 화물칸(시간 30%, 화물칸 안에서 R 회전) · F 싼 것 버리고 줍기 · Esc 일시정지</div>
      <button class="btn" id="set-close">${inRaid ? '계속하기' : '닫기'}</button>
      ${inRaid ? (SA.R && SA.R.tut ? '' : '<button class="btn danger" id="set-abandon">출격 포기 (격추로 처리)</button>') : '<button class="btn danger" id="set-reset">저장 데이터 초기화</button>'}`;
    $('#set-music').oninput = (e) => { s.music = +e.target.value; SA.Audio.setVolumes(); SA.Save.store(SA.profile); };
    $('#set-sfx').oninput = (e) => { s.sfx = +e.target.value; SA.Audio.setVolumes(); SA.Audio.sfx('pickup', 2); SA.Save.store(SA.profile); };
    w.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { SA.profile.deathMode = b.dataset.mode; SA.profile.deathModeSet = true; SA.Save.store(SA.profile); w.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); });
    $('#set-close').onclick = () => { w.style.display = 'none'; if (SA.R) SA.R.paused = false; };
    if (inRaid && $('#set-abandon')) $('#set-abandon').onclick = () => { w.style.display = 'none'; SA.R.paused = false; if (SA.R.range) { leaveRange(); return; } SA.R.player.hp = 0; SA.Raid.playerDied(); };
    else if (!inRaid) $('#set-reset').onclick = twice($('#set-reset'), () => { SA.profile = SA.Save.reset(); w.style.display = 'none'; beginFlow(); });
    if (inRaid && SA.R) SA.R.paused = true;
  };

  const showResult = (r) => {
    scene = 'result';
    SA.UI.tabClose(); SA.UI.hideTip();
    SA.Hangar.setResult(r);
    const w = $('#result'); w.style.display = 'flex';
    const list = (items) => items.length ? items.map(it => `<img title="${SA.ITEMS[it.id].name}" src="${SA.Render.iconSrc(it.id)}" style="width:${SA.ITEMS[it.id].w * 24}px;height:${SA.ITEMS[it.id].h * 24}px">`).join('') : '<span class="dim">없음</span>';
    const pl = SA.PILOTS[r.pilot];
    const sub = r.ok ? (r.emergency ? '비상탈출 — 보안 칸과 장착 부품만 남았다.' : '화물을 전부 창고로 옮겼다.') : '화물을 잃었다. 보안 칸만 남았다.';
    // 알림: 한 줄씩 짧게 (자세한 건 마우스를 올리면)
    const notes = [];
    const n = (cls, txt, tipTxt) => notes.push(`<div class="${cls}"${tipTxt ? ` title="${tipTxt}"` : ''}>${txt}</div>`);
    if (!r.ok && r.pilot !== 'cmdr') n('warn', `${pl.name} 부상 · ${SA.INJURY_RAIDS}회 휴식`, SA.profile.pilot !== r.pilot ? `다음 출격은 ${SA.PILOTS[SA.profile.pilot].name}` : '');
    if (!r.ok && r.mode === 'normal') n('dim', '장착 부품 내구도 -40%', '작업대에서 수리할 수 있다');
    if (!r.ok && r.mode === 'easy') n('dim', '쉬움 — 장착 부품 무사');
    if (!r.ok && r.mode === 'recover') n('warn', '다음 출격에 잔해 신호', '찾아서 들고 탈출하면 부품을 되찾는다 (한 번뿐)');
    if (r.lostPart) n('bad', `잃은 부품: ${r.lostPart}`);
    if (r.lostAll && r.lostAll.length) n('bad', `${r.mode === 'recover' ? '떨어뜨린' : '잃은'} 부품: ${r.lostAll.join(', ')}`);
    if (r.overflow) n('warn', `창고가 가득 차 일부 자동 판매 ₵${r.overflow}`);
    (r.rescued || []).forEach(m => n('ok', m));
    (r.lostCaps || []).forEach(x => n('warn', `${x}을(를) 잃었다`, '다음 출격에 다시 기회가 온다'));
    (r.repMsgs || []).forEach(m => n('warn', m));
    if (r.ravenFled) n('ok', '레이븐 도주 — 다음 출격 미니맵의 붉은 신호');
    if (r.recovered) n('ok', r.recovered);
    if (r.decoded) n('ok', r.decoded);
    if (r.partsIn && r.partsIn.length) n('ok', `부품함: ${r.partsIn.join(', ')}`);
    if (r.giftPulse) n('warn', '용병단이 펄스건을 지급했다', '주무기가 남지 않아 내구도 60짜리를 받았다');
    // 의뢰 진행: 이번 판에 오른 것만
    const post = cSnap(), crows = [];
    for (const c of SA.STORY.contracts) {
      const before = preC[c.id], after = post[c.id] || (before && SA.Hangar.progOf(c));
      if (!before || !after || after[0] <= before[0]) continue;
      const done = after[0] >= after[1];
      crows.push(`<div class="rc"><b>${c.title}</b><span class="pb"><i class="was" style="width:${before[0] / after[1] * 100}%"></i><i class="now" style="left:${before[0] / after[1] * 100}%;width:${(after[0] - before[0]) / after[1] * 100}%"></i></span><span>${before[0]} → ${after[0]}/${after[1]}</span>${done ? '<span class="ok">✓</span>' : ''}</div>`);
    }
    const tm = `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`;
    w.querySelector('.inner').innerHTML = `
      <h1 class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '탈출 성공' : '격추'}</h1>
      <div class="dim">${sub}</div>
      <div class="stats"><span title="출격 시간">시간 <b>${tm}</b></span><span title="격추한 적">격추 <b>${r.kills}</b></span><span title="스친 탄">스침 <b>${r.graze}</b></span><span title="침식률">침식 <b>${Math.floor(r.corr)}%</b></span></div>
      <h3>가져온 것 <span class="ok">₵${r.value}</span></h3><div class="icons">${list(r.brought)}</div>
      ${r.lost.length ? `<h3>잃은 것</h3><div class="icons lost">${list(r.lost)}</div>` : ''}
      ${notes.length ? `<div class="notes">${notes.join('')}</div>` : ''}
      ${crows.length ? `<h3>의뢰 진행</h3><div class="rcs">${crows.join('')}</div>` : ''}`;
  };

  const loop = (t) => {
    const rdt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    const I = SA.Input;
    if (scene === 'raid' && SA.R) {
      const R = SA.R;
      if (I.hit('Escape')) { if (R.tabOpen) SA.UI.tabClose(); else if (!R.paused) openSettings(true); }
      if (I.hit('Tab') && !R.paused) { if (R.tabOpen) SA.UI.tabClose(); else SA.UI.tabOpen(); }
      // 마우스 → 월드 좌표
      const zw = R.zoom || SA.CFG.ZOOM;   // 시야 배율 반영
      R.mouseWorld.x = R.cam.x + (I.mouse.x - cv.width / 2) / zw;
      R.mouseWorld.y = R.cam.y + (I.mouse.y - cv.height / 2) / zw;
      SA.Raid.update(rdt);
      if (SA.R) SA.Render.draw(ctx, SA.R);
    } else if (scene !== 'raid') {
      // 메뉴 배경: 별만 흐른다
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#3b4a6b';
      for (let i = 0; i < 120; i++) { const x = (i * 97 + t * 0.02 * (1 + i % 3)) % cv.width, y = (i * 53) % cv.height; ctx.fillRect(x, y, 2, 2); }
    }
    I.endFrame();
    requestAnimationFrame(loop);
  };

  addEventListener('load', boot);
  return { startRaid, startRange, leaveRange, showResult, openSettings, startTutorial, endTutorial };
})();
