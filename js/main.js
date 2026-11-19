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
    document.querySelectorAll('#hg-tabs button').forEach(b => b.onclick = () => SA.Hangar.go(b.dataset.tab));
    $('#title-start').onclick = () => { SA.Audio.init(); $('#title').style.display = 'none'; scene = 'hangar'; SA.Hangar.open(); };
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

  const startRaid = () => {
    scene = 'raid';
    SA.Raid.start(SA.profile);
  };

  const openSettings = (inRaid) => {
    const s = SA.profile.settings, w = $('#settings');
    w.style.display = 'flex';
    w.querySelector('.inner').innerHTML = `
      <h2>${inRaid ? '일시정지' : '설정'}</h2>
      <label>배경음악 <input type="range" min="0" max="1" step="0.05" value="${s.music}" id="set-music"></label>
      <label>효과음 <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" id="set-sfx"></label>
      <div class="small dim keys-help">WASD 이동 · 마우스 조준 · 좌클릭 주무기 · Q/E 액티브 · Space 파일럿 기술<br>Tab 화물칸(시간 30%) · R 회전 · F 싼 것 버리고 줍기 · Esc 일시정지</div>
      <button class="btn" id="set-close">${inRaid ? '계속하기' : '닫기'}</button>
      ${inRaid ? '<button class="btn danger" id="set-abandon">출격 포기 (격추로 처리)</button>' : '<button class="btn danger" id="set-reset">저장 데이터 초기화</button>'}`;
    $('#set-music').oninput = (e) => { s.music = +e.target.value; SA.Audio.setVolumes(); SA.Save.store(SA.profile); };
    $('#set-sfx').oninput = (e) => { s.sfx = +e.target.value; SA.Audio.setVolumes(); SA.Audio.sfx('pickup', 2); SA.Save.store(SA.profile); };
    $('#set-close').onclick = () => { w.style.display = 'none'; if (SA.R) SA.R.paused = false; };
    if (inRaid) $('#set-abandon').onclick = () => { w.style.display = 'none'; SA.R.paused = false; SA.R.player.hp = 0; SA.Raid.playerDied(); };
    else $('#set-reset').onclick = twice($('#set-reset'), () => { SA.profile = SA.Save.reset(); w.style.display = 'none'; SA.Hangar.render(); });
    if (inRaid && SA.R) SA.R.paused = true;
  };

  const showResult = (r) => {
    scene = 'result';
    SA.UI.tabClose(); SA.UI.hideTip();
    const w = $('#result'); w.style.display = 'flex';
    const list = (items) => items.length ? items.map(it => `<img title="${SA.ITEMS[it.id].name}" src="${SA.Render.iconSrc(it.id)}" style="width:${SA.ITEMS[it.id].w * 24}px;height:${SA.ITEMS[it.id].h * 24}px">`).join('') : '<span class="dim">없음</span>';
    const pl = SA.PILOTS[r.pilot];
    w.querySelector('.inner').innerHTML = `
      <h1 class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '탈출 성공' : '격추'}</h1>
      <div class="dim">${r.ok ? '살아서 돌아왔다. 화물은 전부 창고로.' : `화물을 잃었다. 보안 칸만 살아남았다. ${r.pilot === 'cmdr' ? '단장은 무사히 기체를 버리고 탈출했다.' : `${pl.name}은(는) ${SA.INJURY_RAIDS}회 출격 동안 쉬어야 한다.`}${SA.profile.pilot !== r.pilot ? ` 다음 출격은 ${SA.PILOTS[SA.profile.pilot].name}이(가) 나간다.` : ''}`}</div>
      <div class="stats"><span>시간 <b>${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</b></span><span>격추 <b>${r.kills}</b></span><span>스침 <b>${r.graze}</b></span><span>침식 <b>${Math.floor(r.corr)}%</b></span></div>
      <h3>가져온 것 <span class="ok">₵${r.value}</span></h3><div class="icons">${list(r.brought)}</div>
      ${r.lost.length ? `<h3>잃은 것</h3><div class="icons lost">${list(r.lost)}</div>` : ''}
      ${r.overflow ? `<div class="warn small">창고가 가득 차서 일부를 ₵${r.overflow}에 자동 판매했다.</div>` : ''}
      ${(r.rescued || []).map(m => `<div class="ok">${m}</div>`).join('')}
      ${(r.lostCaps || []).map(n => `<div class="warn small">${n}을(를) 잃었다. 다음 출격에 다시 기회가 온다.</div>`).join('')}
      ${(r.repMsgs || []).map(m => `<div class="warn small">${m}</div>`).join('')}
      ${r.lostPart ? `<div class="bad">잃은 부품: ${r.lostPart} — 장착 칸이 비었다</div>` : ''}
      ${r.ravenFled ? '<div class="ok">레이븐이 도주했다 — 다음 출격부터 미니맵의 붉은 신호에서 재대결</div>' : ''}
      ${!r.ok ? '<div class="small dim">장착 부품 내구도 -40%. 작업대에서 수리할 수 있다.</div>' : ''}`;
  };

  const loop = (t) => {
    const rdt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    const I = SA.Input;
    if (scene === 'raid' && SA.R) {
      const R = SA.R;
      if (I.hit('Escape')) { if (R.tabOpen) SA.UI.tabClose(); else if (!R.paused) openSettings(true); }
      if (I.hit('Tab') && !R.paused) { if (R.tabOpen) SA.UI.tabClose(); else SA.UI.tabOpen(); }
      // 마우스 → 월드 좌표
      R.mouseWorld.x = R.cam.x + (I.mouse.x - cv.width / 2) / SA.CFG.ZOOM;
      R.mouseWorld.y = R.cam.y + (I.mouse.y - cv.height / 2) / SA.CFG.ZOOM;
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
  return { startRaid, showResult, openSettings };
})();
