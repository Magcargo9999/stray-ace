// 격납고: 장면(hangarScene.js) 위에 바로가기 막대·목표 카드, 물건을 누르면 뜨는 창들
// 창: 출격 준비(sortie) · 창고(stash) · 작업대(bench) · 의뢰(contracts) · 해독기(decoder) · 상점(shop) · 배달(deliv) · 거치대(rack)
SA.Hangar = (() => {
  const h = (...a) => SA.UI.h(...a), $ = (s) => document.querySelector(s);
  const P = () => SA.profile;
  const part = (uid) => P().parts.find(p => p.uid === uid);
  const save = () => SA.Save.store(P());
  const S = () => SA.HangarScene;
  let panel = null, panelArg = null, lastResult = null, ready = false;

  const toast = (s, col = '#e6edf3') => {
    const t = h('div', 'toast', s); t.style.color = col;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
  };
  const tip = (el, html) => { el.onmouseenter = (e) => SA.UI.showTipHtml(e, typeof html === 'function' ? html() : html); el.onmouseleave = SA.UI.hideTip; return el; };
  const ico = (name, cls = '') => `<img class="hgi ${cls}" src="assets/hangar/${name}.png">`;

  // 바로가기 막대 (숫자키 1~7)
  const BAR = [['sortie', 'ic_rack', '출격 준비'], ['stash', 'ic_locker', '창고'], ['bench', 'ic_tools', '작업대'], ['contracts', 'ic_note', '의뢰'],
    ['decoder', 'ic_decoder', '해독기'], ['shop', 'ic_coins', '상점'], ['deliv', 'ic_crate', '배달']];
  const AC = { sortie: '#5dffb0', stash: '#d8e6ff', bench: '#4bb4f4', contracts: '#f335a5', decoder: '#f03960', shop: '#3fede3', deliv: '#ffd166', rack: '#5dffb0' };   // 장면 속 물건 빛과 같은 색
  // 장면 왼쪽→오른쪽 순서 (SA.HGUI.barOrder를 끄면 예전 순서)
  const BAR_SCENE = ['stash', 'bench', 'sortie', 'deliv', 'contracts', 'shop', 'decoder'];
  const barList = () => SA.HGUI.barOrder ? BAR_SCENE.map(id => BAR.find(b => b[0] === id)) : BAR;
  const locked = (id) => id === 'deliv' && !P().rescued.deliv;
  const TITLE = { sortie: '출격 준비', stash: '창고', bench: '작업대', contracts: '의뢰 게시판', decoder: '해독기', shop: '상점 · 오스의 단말', deliv: '배달 · 도리', rack: '기체' };
  const WHO = { bench: () => P().rescued.teo ? 'teo' : 'mina', contracts: () => 'os', shop: () => 'os', deliv: () => 'dori' };

  const init = () => {
    if (ready) return; ready = true;
    S().init();
    const bar = $('#hg-bar');
    barList().forEach(([id, ic, nm], i) => {
      const b = h('button', 'hb' + (SA.HGUI.pixelFont ? ' px' : ''), `${ico(ic)}<span>${nm}</span><i class="${SA.HGUI.pixelFont ? 'kc' : ''}">${i + 1}</i><b class="al">!</b>`); b.dataset.p = id;
      b.onclick = () => openPanel(id);
      tip(b, () => locked(id) ? '도리를 구조하면 열린다' : `${nm} <span class="dim">(${i + 1})</span>`);
      const en = b.onmouseenter, lv = b.onmouseleave;
      b.onmouseenter = (e) => { en(e); S().setBarHi(id); }; b.onmouseleave = (e) => { lv(e); S().setBarHi(null); };   // 막대 ↔ 장면 물건 같이 강조
      bar.appendChild(b);
    });
    $('#hg-goal').onclick = () => openPanel('contracts');
    $('#hg-panel').addEventListener('mousedown', (e) => { if (e.target.id === 'hg-panel') closePanel(); });
    $('#hg-panel .x').onclick = closePanel;
    addEventListener('keydown', onKey);
  };
  const visibleNow = () => $('#hangar').style.display !== 'none' && $('#settings').style.display !== 'flex' && $('#result').style.display !== 'flex';
  const onKey = (e) => {
    if (!visibleNow() || S().isAnim()) return;
    if (e.code === 'Escape') {
      if (document.querySelector('.ctx')) { document.querySelectorAll('.ctx').forEach(x => x.remove()); return; }
      if (panel) closePanel(); else SA.Main.openSettings(false);
      return;
    }
    const m = /^Digit([1-7])$/.exec(e.code);
    if (m && !S().guideOn()) openPanel(barList()[+m[1] - 1][0]);
    if (SA.HGUI.sortieTag && (e.code === 'Enter' || e.code === 'NumpadEnter') && !S().guideOn()) { e.preventDefault(); if (panel === 'sortie') sortieGo(); else if (!panel) openPanel('sortie'); }   // Enter: 출격 준비 → 한 번 더 누르면 출격
  };

  const open = () => {
    init();
    $('#hangar').style.display = 'block';
    SA.Audio.play('hangar');
    autoRegister();
    SA.Quest.sync();
    hud();
    S().load(() => {
      S().start();
      const r = lastResult; lastResult = null;
      if (r) { S().play(r.ok ? 'land' : 'crash'); S().react(r); }
      else if (P().tutDone && !P().hgGuide && P().deathModeSet) setTimeout(() => S().startGuide(), 400);
    });
  };
  const close = () => { closePanel(); S().stop(); $('#hangar').style.display = 'none'; SA.UI.hideTip(); };
  const setResult = (r) => { lastResult = r; if (!r.ok) { P().scorched = true; save(); } };   // 격추되면 다음 출격까지 그을린 기체

  // 목표 카드 · 크레딧 · 막대 상태
  const hud = () => {
    SA.Contracts.sync(); credits();
    const g = goalParts();
    const pl = SA.Need.pinLine();
    $('#hg-goal').innerHTML = `<span class="k">목표</span>${g[0]}${g[1] ? `<div class="hint">${g[1]}</div>` : ''}${pl ? `<div class="pinl${pl[2] ? ' ok' : ''}"><span class="k">제작</span>${pl[0]} — ${pl[2] ? '재료 다 모았다, 작업대에서 제작' : pl[1]}</div>` : ''}`;
    document.querySelectorAll('#hg-bar .hb').forEach(b => b.classList.toggle('alert', !!(SA.HGUI.barAlerts && S().alerts()[b.dataset.p])));
    tip($('#hg-goal'), () => `${SA.Quest.label()}${SA.Quest.rewardText()}<br><span class="dim">누르면 의뢰 게시판</span>`);
    document.querySelectorAll('#hg-bar .hb').forEach(b => { b.classList.toggle('lock', locked(b.dataset.p)); b.classList.toggle('on', b.dataset.p === panel); });
  };
  // 목표: 괄호 속 힌트(진행 숫자 말고)와 ' — ' 뒤 설명은 흐린 보조 줄로
  const goalParts = () => {
    const t = SA.Quest.label(); if (!SA.HGUI.goalSplit) return [t, ''];
    let main = t, hint = '';
    const dash = main.indexOf(' — '); if (dash > 0) { hint = main.slice(dash + 3); main = main.slice(0, dash); }
    main = main.replace(/\s*\(([^)]*)\)/g, (all, inner) => { if (/^\d+\/\d+$/.test(inner.trim())) return all; hint = hint ? inner + ' · ' + hint : inner; return ''; });
    return [main, hint];
  };
  // 재화: 쉼표 + 바뀌면 증감 숫자가 잠깐 떠오른다
  let lastCr = null;
  const credits = () => {
    const c = P().credits, el = $('#hg-credits');
    el.textContent = '₵' + (SA.HGUI.creditFx ? c.toLocaleString('ko-KR') : c);
    if (SA.HGUI.creditFx && lastCr !== null && c !== lastCr) {
      const d = c - lastCr, f = h('span', 'crfx ' + (d > 0 ? 'up' : 'dn'), `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('ko-KR')}`);
      $('#hg-top').appendChild(f); setTimeout(() => f.remove(), 1400);
    }
    lastCr = c;
  };
  const barHover = (pid) => document.querySelectorAll('#hg-bar .hb').forEach(b => b.classList.toggle('hi', b.dataset.p === pid));

  // ── 창 ──
  const isPanelOpen = () => !!panel;
  const openPanel = (id, arg) => {
    if (locked(id)) { SA.Audio.sfx('deny'); toast('도리를 구조하면 열린다.', '#ffb3b3'); return; }
    panel = id; panelArg = arg; SA.Audio.sfx('click');
    $('#hg-panel').style.display = 'flex';
    render();
  };
  const closePanel = () => { if (panel === 'bench' && (P().newRecipes || []).length) { P().newRecipes = []; save(); } panel = null; $('#hg-panel').style.display = 'none'; document.querySelectorAll('.ctx').forEach(x => x.remove()); SA.UI.hideTip(); if (ready) hud(); };
  const render = () => {
    hud();
    if (!panel) return;
    const pn = $('#hg-panel .pn'), body = $('#hg-body');
    pn.className = 'pn p-' + panel;
    $('#hg-panel .ttl').textContent = TITLE[panel];
    const who = WHO[panel] && WHO[panel](), por = $('#hg-panel .por');
    const N = who && SA.HG_NPC[who];
    por.innerHTML = N ? (N.portrait ? `<img src="${N.portrait}">` : `<span class="ini" style="--c:${N.color}">${N.name[0]}</span>`) : '';
    const pt = $('#hg-panel .pt');
    pt.style.display = N ? '' : 'none';
    pt.querySelector('.pnm').textContent = N ? N.name : '';
    pt.querySelector('.pjob').textContent = N ? N.title : '';
    body.innerHTML = '';
    ({ sortie, stash, bench, contracts, decoder, shop, deliv, rack })[panel](body);
  };
  const go = (t) => openPanel(t);   // 예전 호출 호환

  // 가져온 설계도는 자동 등록 (스트레스 줄이기). 이미 아는 건 판매용으로 남긴다.
  const autoRegister = () => {
    const st = P().stash;
    for (const it of st.items.slice()) {
      const d = SA.ITEMS[it.id];
      if (d.kind === 'bp' && !P().recipes.includes(d.recipe)) {
        P().recipes.push(d.recipe); (P().newRecipes = P().newRecipes || []).push(d.recipe); P().bpMiss = 0; SA.Grid.remove(st, it.uid);
        toast(`설계도 등록: ${SA.PARTS[d.recipe].name} — 작업대에서 제작 가능`, '#ffd166');
      } else if (d.kind === 'pbp' && SA.Bench.grantPlanet(d.part)) {
        SA.Grid.remove(st, it.uid);
        toast(`행성 설계도 등록: ${SA.PLANET[d.part][0]} — 작업대 → 행성`, SA.TIER_COL['행성']);
      }
    }
    save();
  };

  // ── 공용: 부품 그림 · 툴팁 · 비교 ──
  const KIND_IC = { main: 'pt_main', sub: 'pt_sub', act: 'pt_act', pas: 'pt_pas', obs: 'pt_obs' };
  const partIcon = (p) => { const d = SA.PARTS[p.id]; return d.img ? `<img class="pimg" src="${d.img}">` : ico(KIND_IC[d.slot] || 'pt_pod', 'pimg'); };
  const durCol = (r) => r >= 0.5 ? '#5dffb0' : r > 0 ? '#ffd166' : '#ff4d6d';
  const partTipHtml = (p) => `<b>${SA.partHtml(p)}</b> <span class="dim">${SA.partTier(p)}</span><br><span class="desc">${SA.partFullDesc(p)}</span><br>내구도 ${Math.round(p.dur)} / ${Math.round(p.max)} · 성능 ${Math.round(SA.Combat.eff(p) * 100)}%`;
  const partTip = (e, p) => SA.UI.showTipHtml(e, partTipHtml(p));
  const stat = (p) => {   // 비교용 수치 하나: [이름, 값, 클수록 좋은가]
    if (!p) return null;
    const d = SA.PARTS[p.id], m = SA.LV_MUL[p.lv || 0];
    if (d.slot === 'main') return ['피해', Math.round((d.dmg || 0) * (d.rate || 0) * (d.shots || 1) * m), true];
    if (d.slot === 'sub') return ['피해', Math.round((d.dmg || 0) * (d.rate || 0) * m * 10) / 10, true];
    if (d.slot === 'act' && d.cd) return ['쿨', Math.round(d.cd / m * 10) / 10, false];
    return null;
  };
  const cmpHtml = (p, cur) => {
    const a = stat(p), b = stat(cur); let s = '';
    if (a && b && a[0] === b[0]) { const dv = Math.round((a[1] - b[1]) * 10) / 10; if (dv) { const good = a[2] ? dv > 0 : dv < 0; s += `<span class="${good ? 'up' : 'dn'}">${a[0]} ${dv > 0 ? '▲' : '▼'} ${dv > 0 ? '+' : ''}${dv}</span>`; } else s += `<span class="dim">${a[0]} =</span>`; }
    else if (a) s += `<span class="dim">${a[0]} ${a[1]}</span>`;
    if (cur) { const dd = Math.round(p.dur - cur.dur); if (dd) s += ` <span class="${dd > 0 ? 'up' : 'dn'}">내구 ${dd > 0 ? '▲' : '▼'}</span>`; }
    return s;
  };

  // ── 출격 준비: 파일럿 | 기체 둘레 장착 칸 | 지역·소모품·출격 ──
  const sortie = (body) => {
    const prof = P();
    const healthy = Object.keys(prof.pilots).filter(id => !prof.pilots[id].injury);
    if (!healthy.length) prof.pilot = 'cmdr';
    else if (prof.pilot === 'cmdr' || prof.pilots[prof.pilot].injury) prof.pilot = healthy[0];
    const L = h('div', 'sx-l'), C = h('div', 'sx-c'), R = h('div', 'sx-r');
    // 파일럿
    L.appendChild(h('h4', '', '파일럿'));
    const chip = (id, inj) => {
      const pl = SA.PILOTS[id], c = h('div', 'pchip' + (prof.pilot === id ? ' on' : '') + (inj ? ' off' : ''),
        `<span class="ini" style="--c:${pl.color}">${pl.name[0]}</span><span><b>${pl.name}</b> <span class="dim">${pl.title}</span>${inj ? `<br><span class="bad small">휴식 ${inj}</span>` : ''}</span>`);
      tip(c, `“${pl.quote}”<br><span class="desc">${pl.desc}</span>${pl.skill ? `<br><span class="dim">쿨타임 ${pl.cd}초 · Space</span>` : ''}`);
      c.onclick = () => { if (inj) { SA.Audio.sfx('deny'); return; } prof.pilot = id; save(); render(); };
      return c;
    };
    if (!healthy.length) L.appendChild(chip('cmdr', 0));
    for (const id in prof.pilots) L.appendChild(chip(id, prof.pilots[id].injury));
    // 보유 기체 바꾸기
    if (prof.ships.length > 1) {
      L.appendChild(h('h4', '', '기체'));
      const row = h('div', 'shiprow');
      for (const id of prof.ships) { const c = h('div', 'shipchip' + (prof.ship === id ? ' on' : '')); c.appendChild(shipCanvas(id, 44)); tip(c, `<b>${SA.SHIPS[id].name}</b> ${SA.SHIPS[id].role}`); c.onclick = () => { prof.ship = id; save(); render(); }; row.appendChild(c); }
      L.appendChild(row);
    }
    // 기체 둘레 장착 칸
    const sh = SA.SHIPS[prof.ship], lo = prof.loadouts[prof.ship];
    C.appendChild(h('div', 'shipname', `<b>${sh.name}</b> <span class="dim">${sh.role}</span>`));
    tip(C.lastChild, `${sh.desc}<br><span class="dim">HP ${sh.hp} · 속도 ${sh.speed} · 화물 ${sh.cargo[0]}×${sh.cargo[1]}</span>`);
    const fig = h('div', 'shipfig'), colL = h('div', 'scol'), colR = h('div', 'scol'), bot = h('div', 'srow');
    const mid = h('div', 'smid'); mid.appendChild(shipCanvas(prof.ship, 200));
    const slot = (key, kind, idx, uid) => {
      const p = uid && part(uid), r = p ? p.dur / p.max : 0;
      const s = h('div', 'ps' + (p ? ' t-' + SA.partTier(p) : ' empty'), `${p ? partIcon(p) : '<span class="plus">+</span>'}<span class="kk">${key}</span>${p ? `<span class="db"><i style="width:${r * 100}%;background:${durCol(r)}"></i></span>` : ''}`);
      s.onmouseenter = (e) => SA.UI.showTipHtml(e, p ? partTipHtml(p) : `${key} — 비어 있음`); s.onmouseleave = SA.UI.hideTip;
      s.onclick = (e) => pickPart(e, kind, idx);
      s.oncontextmenu = (e) => { e.preventDefault(); if (p) { setSlot(kind, idx, null); } };
      return s;
    };
    colL.appendChild(slot('주무기 1', 'main', 0, lo.main));
    colL.appendChild(slot('주무기 2', 'main', 1, lo.main2));
    colL.appendChild(cellSlot(lo));
    colL.appendChild(slot('관측 Z', 'obs', 0, lo.obs));
    for (let i = 0; i < sh.sub; i++) colR.appendChild(slot(`서브 ${i + 1}`, 'sub', i, lo.sub[i]));
    colR.appendChild(slot('Q', 'act', 0, lo.act[0]));
    colR.appendChild(slot('E', 'act', 1, lo.act[1]));
    for (let i = 0; i < sh.pas; i++) bot.appendChild(slot(`패시브 ${i + 1}`, 'pas', i, lo.pas[i]));
    fig.append(colL, mid, colR); C.append(fig, bot);
    // 지역 (작은 항로 지도)
    R.appendChild(h('h4', '', '작전 지역'));
    const map = h('div', 'routemap', `<img src="assets/hangar/route_map.png">`);
    const NODES = { mine: [15, 75], front: [38, 55], grave: [62, 40], abyss: [85, 22] };
    for (const id in SA.MAPS) {
      const m = SA.MAPS[id], [x, y] = NODES[id] || [50, 50];
      const n = h('div', 'node' + (m.locked ? ' lock' : ' on'), m.locked ? ico('ic_lock') : ''); n.style.left = x + '%'; n.style.top = y + '%';
      tip(n, `<b>${m.name}</b> <span class="dim">${m.act}막</span><br>${m.locked ? `<span class="dim">${m.act}막에서 열린다</span>` : `<span class="desc">${m.desc}</span>`}`);
      map.appendChild(n);
    }
    R.appendChild(map);
    // 소모품
    R.appendChild(h('h4', '', '소모품'));
    prof.bring = prof.bring || {};
    const cg = sh.cargo, cap = cg[0] * cg[1];
    const usedCells = () => Object.keys(prof.bring).reduce((n, k) => n + prof.bring[k] * SA.ITEMS[k].w * SA.ITEMS[k].h, 0);
    let any = false;
    for (const id of [...SA.SHOP.consumables.map(x => x[0]), 'cell1', 'cell2', 'cell3', 'cell4']) {
      const d = SA.ITEMS[id], have = SA.Grid.count(prof.stash, id) - (lo.cell === id ? 1 : 0);
      if (have <= 0) continue;
      any = true;
      if (prof.bring[id] === undefined && id === lo.cell) prof.bring[id] = 1;   // 예비 동력원은 기본 1개
      const n = Math.min(prof.bring[id] || 0, have); prof.bring[id] = n;
      const r = h('div', 'cons', `<img src="${SA.Render.iconSrc(id)}"><span>${d.name}</span><b>${n}</b><span class="dim">/${have}</span>`);
      tip(r, `<b>${d.name}</b><br><span class="desc">${d.desc}</span><br><span class="dim">격추되면 잃는다</span>`);
      const minus = h('button', 'btn tiny', '−'), plus = h('button', 'btn tiny', '+');
      minus.onclick = () => { if (prof.bring[id] > 0) { prof.bring[id]--; save(); render(); } };
      plus.onclick = () => {
        if (prof.bring[id] >= have) return SA.Audio.sfx('deny');
        if (usedCells() + d.w * d.h > cap) { toast('화물칸에 더 실을 자리가 없다.', '#ffb3b3'); return SA.Audio.sfx('deny'); }
        prof.bring[id]++; save(); render();
      };
      r.append(minus, plus); R.appendChild(r);
    }
    if (!any) R.appendChild(h('div', 'dim small', '창고에 소모품이 없다.'));
    else R.appendChild(h('div', 'dim small', `화물칸 ${usedCells()}/${cap}칸`));
    // 경고 (짧게)
    const warn = [];
    if (!lo.main && !lo.main2) warn.push('<span class="bad">주무기 없음</span>');
    if (!(lo.cell && SA.Grid.count(prof.stash, lo.cell))) warn.push('<span class="warn">동력원 없음</span>');
    const dmg = SA.loUids(lo).map(part).filter(p => p && p.dur / p.max < 0.5).length;
    if (dmg) warn.push(`<span class="warn">닳은 부품 ${dmg}</span>`);
    if (warn.length) R.appendChild(h('div', 'small warns', warn.join(' · ')));
    // 출격
    const go = h('div', 'gorow');
    const dm = SA.DEATH_MODES[prof.deathMode] || SA.DEATH_MODES.normal;
    const rule = tip(h('span', 'rule', `<span class="sk">✕</span>${dm.name}`), `<b>격추되면 [${dm.name}]</b><br><span class="desc">${dm.desc}</span><br>파일럿 부상 ${SA.INJURY_RAIDS}회 휴식 · <span class="dim">설정에서 바꿀 수 있다</span>`);
    const noMain = !lo.main && !lo.main2;
    const b = h('button', 'btn big' + (noMain ? ' dis' : ''), noMain ? '주무기 없음' : '출격'); b.onclick = sortieGo;
    if (SA.HGUI.sortieTag && !noMain) tip(b, 'Enter');
    const rg = h('button', 'btn small', '시험 비행'); rg.onclick = () => { const l = prof.loadouts[prof.ship]; if (!l.main && !l.main2) { toast('주무기를 장착해야 한다.', '#ffb3b3'); return; } close(); SA.Main.startRange(); };
    tip(rg, '연습장에서 지금 장착으로 시험한다');
    go.append(rule, rg, b); R.appendChild(go);
    body.append(L, C, R);
  };
  // 동력원 칸: 누르면 창고에 있는 등급을 돌려 가며 고른다
  const cellSlot = (lo) => {
    const prof = P(), cells = ['cell1', 'cell2', 'cell3', 'cell4'], cnt = (c) => SA.Grid.count(prof.stash, c);
    if (lo.cell && !cnt(lo.cell)) lo.cell = cells.slice().reverse().find(cnt) || lo.cell;
    const d = lo.cell && SA.ITEMS[lo.cell], has = d && cnt(lo.cell);
    const s = h('div', 'ps' + (has ? ' t-' + (d.tier || '일반') : ' empty'), `${has ? `<img class="pimg" src="${SA.Render.iconSrc(lo.cell)}">` : '<span class="plus">!</span>'}<span class="kk">동력원</span>${has ? `<span class="cnt">${cnt(lo.cell)}</span>` : ''}`);
    tip(s, has ? `<b>${d.name}</b> <span class="dim">창고 ${cnt(lo.cell)}개</span><br><span class="desc">주무기 에너지. 다 쓰면 R로 예비와 교체.</span><br><span class="dim">누르면 등급을 바꾼다</span>` : '<span class="bad">동력원 없음</span> — 비상 발전으로만 쏜다<br><span class="dim">작업대에서 만든다 (고철 1 + 전선 1)</span>');
    s.onclick = () => { const own = cells.filter(cnt); if (!own.length) { SA.Audio.sfx('deny'); return; } lo.cell = own[(own.indexOf(lo.cell) + 1) % own.length]; save(); render(); };
    return s;
  };
  const shipCanvas = (id, size) => {
    const s = SA.SHIPS[id], c = document.createElement('canvas');
    c.width = size; c.height = size; c.className = 'shipimg';
    const x = c.getContext('2d');
    const k = Math.min(size * 0.9 / s.size[0], size * 0.9 / s.size[1]), w = s.size[0] * k, hh = s.size[1] * k;
    const im = id === 'hex' ? SA.Render.IMG.hex : SA.Render.IMG[id];
    x.imageSmoothingEnabled = id !== 'hex';
    if (im) x.drawImage(im, (size - w) / 2, (size - hh) / 2, w, hh);
    if (id === 'hex' && SA.Render.IMG.hexTurret) { x.imageSmoothingEnabled = false; const m = 13 * k; x.drawImage(SA.Render.IMG.hexTurret, (size - w) / 2 + s.mount[0] * w - m / 2, (size - hh) / 2 + s.mount[1] * hh - m / 2, m, m); }
    return c;
  };
  const curUid = (lo, kind, idx) => kind === 'main' ? lo[idx ? 'main2' : 'main'] : kind === 'obs' ? lo.obs : lo[kind][idx];
  const setSlot = (kind, idx, uid) => {
    const lo = P().loadouts[P().ship];
    if (kind === 'main') lo[idx ? 'main2' : 'main'] = uid; else if (kind === 'obs') lo.obs = uid; else lo[kind][idx] = uid;
    save(); document.querySelectorAll('.ctx').forEach(x => x.remove()); SA.UI.hideTip(); render();
  };
  // 칸을 누르면 옆에 끼울 수 있는 부품 목록 (비교 화살표)
  const pickPart = (e, kind, idx) => {
    const prof = P(), lo = prof.loadouts[prof.ship];
    const used = new Set(SA.loUids(lo)), cur = part(curUid(lo, kind, idx));
    const opts = prof.parts.filter(p => { const d = SA.PARTS[p.id]; return d.slot === kind && !used.has(p.uid) && (!d.onlyShip || d.onlyShip === prof.ship); })
      .sort((a, b) => ((stat(b) || [0, 0])[1] - (stat(a) || [0, 0])[1]) * ((stat(a) || [0, 0, true])[2] ? 1 : -1) || b.dur - a.dur);
    const m = h('div', 'ctx wide pick');
    if (!opts.length) m.appendChild(h('div', 'dim small pad', '끼울 부품이 없다 — 작업대에서 만든다'));
    for (const p of opts) {
      const r = p.dur / p.max, b = h('button', 'prow', `${partIcon(p)}<span class="nm">${SA.partHtml(p)}</span><span class="cmp">${cmpHtml(p, cur)}</span><span class="db"><i style="width:${r * 100}%;background:${durCol(r)}"></i></span>`);
      b.onmouseenter = (ev) => partTip(ev, p); b.onmouseleave = SA.UI.hideTip;
      b.onclick = () => setSlot(kind, idx, p.uid); m.appendChild(b);
    }
    if (cur) { const b = h('button', 'prow', '<span class="bad">비우기</span> <span class="dim small">(우클릭으로도)</span>'); b.onclick = () => setSlot(kind, idx, null); m.appendChild(b); }
    const rc = e.currentTarget.getBoundingClientRect();
    m.style.left = Math.min(innerWidth - 360, rc.right + 8) + 'px'; m.style.top = Math.max(8, Math.min(innerHeight - 340, rc.top - 8)) + 'px';
    document.querySelectorAll('.ctx').forEach(x => x.remove());
    document.body.appendChild(m);
    setTimeout(() => addEventListener('mousedown', function off(ev) { if (!m.contains(ev.target)) { m.remove(); removeEventListener('mousedown', off); } }), 0);
  };
  const autoEquip = (shipId) => {
    const prof = P(), lo = prof.loadouts[shipId], sh = SA.SHIPS[shipId];
    const used = () => new Set(SA.loUids(lo));
    const best = (kind) => prof.parts.filter(p => SA.PARTS[p.id].slot === kind && !used().has(p.uid) && (!SA.PARTS[p.id].onlyShip || SA.PARTS[p.id].onlyShip === shipId))
      .sort((a, b) => SA.PARTS[b.id].val - SA.PARTS[a.id].val || b.dur - a.dur)[0];
    if (!lo.main) { const p = best('main'); if (p) lo.main = p.uid; }
    if (!lo.main2) { const p = best('main'); if (p) lo.main2 = p.uid; }
    if (!lo.cell) lo.cell = ['cell4', 'cell3', 'cell2', 'cell1'].find(c => SA.Grid.count(prof.stash, c)) || null;
    for (let i = 0; i < sh.sub; i++) if (!lo.sub[i]) { const p = best('sub'); if (p) lo.sub[i] = p.uid; }
    for (let i = 0; i < 2; i++) if (!lo.act[i]) { const p = best('act'); if (p) lo.act[i] = p.uid; }
    for (let i = 0; i < sh.pas; i++) if (!lo.pas[i]) { const p = best('pas'); if (p) lo.pas[i] = p.uid; }
    if (!lo.obs) { const p = best('obs'); if (p) lo.obs = p.uid; }
    save();
  };
  const sortieGo = () => {
    const prof = P(), lo = prof.loadouts[prof.ship];
    if (prof.pilot !== 'cmdr' && prof.pilots[prof.pilot].injury) { toast('선택한 파일럿이 부상 중이다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    if (!lo.main && !lo.main2) { toast('주무기를 장착해야 출격할 수 있다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    closePanel(); SA.Audio.sfx('launch');
    prof.scorched = false; save();
    S().play('launch', () => { close(); SA.Main.startRaid(); });
  };

  // ── 거치대 (뒷줄): 보유 기체는 바로 교체, 안 산 기체는 구매 ──
  const openRack = (id) => {
    if (P().ships.includes(id)) { P().ship = id; save(); toast(`출격 기체: ${SA.SHIPS[id].name}`, '#5dffb0'); hud(); return; }
    openPanel('rack', id);
  };
  const rack = (body) => {
    const prof = P(), id = panelArg, s = SA.SHIPS[id];
    const box = h('div', 'rackbox'); box.appendChild(shipCanvas(id, 220));
    const info = h('div', 'rackinfo', `<h3>${s.name} <span class="dim">${s.role}</span></h3><div class="small">${s.desc}</div>
      <div class="chips"><span>HP ${s.hp}</span><span>속도 ${s.speed}</span><span>서브 ${s.sub}</span><span>패시브 ${s.pas}</span><span>화물 ${s.cargo[0]}×${s.cargo[1]}</span></div>`);
    const b = h('button', 'btn', `구매 ₵${s.price}`);
    b.onclick = () => {
      if (prof.credits < s.price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
      prof.credits -= s.price; prof.ships.push(id);
      const cur = prof.loadouts[prof.ship];   // 지금 기체의 장착을 최대한 그대로 옮긴다
      prof.loadouts[id] = { main: cur.main, main2: cur.main2 || null, sub: cur.sub.slice(0, s.sub), act: cur.act.slice(), pas: cur.pas.slice(0, s.pas), obs: cur.obs || null, cell: cur.cell || null };
      autoEquip(id); prof.ship = id; toast(`${s.name} 구매 — 가진 부품으로 자동 장착했다`, '#5dffb0'); SA.Audio.sfx('buy'); save(); closePanel();
    };
    info.appendChild(b); box.appendChild(info); body.appendChild(box);
  };

  // ── 창고: 격자 + 고른 것 정보칸 ──
  let stashSel = null;
  const stash = (body) => {
    const prof = P(), left = h('div', 'st-l'), right = h('div', 'st-r');
    left.appendChild(h('div', 'small dim', `${SA.Grid.used(prof.stash)}/${prof.stash.w * prof.stash.h}칸 · 총 ₵${SA.Grid.value(prof.stash)}`));
    const g = h('div'); left.appendChild(g);
    if (stashSel && !prof.stash.items.includes(stashSel)) stashSel = null;
    SA.UI.gridView('stash', g, prof.stash, { menu: (it) => itemActs(it), onSelect: (it) => { stashSel = it; render(); }, sel: stashSel && stashSel.uid });
    const sortB = h('button', 'btn small', '정렬'); sortB.onclick = () => { SA.Grid.autoSort(prof.stash); save(); render(); };
    left.appendChild(sortB);
    // 정보칸
    if (!stashSel) right.appendChild(h('div', 'dim small pad', '아이템을 누르면 여기에 나온다.<br>끌어서 옮기고, 우클릭하면 바로 판다.'));
    else {
      const it = stashSel, d = SA.ITEMS[it.id], need = neededFor(it.id);
      right.appendChild(h('div', 'iinfo', `<img src="${SA.Render.iconSrc(it.id)}"><div><b style="color:${d.color}">${d.name}</b><div class="small dim">${SA.KIND_NAME[d.kind] || ''} · ₵${SA.itemVal(it)}</div></div>`));
      right.appendChild(h('div', 'small use', d.kind === 'use' ? '출격 준비에서 골라 가져간다' : need ? '' : SA.Decode.srcOf(it.id) || it.id === 'bb_reward' ? '해독기에 맡기면 기록이 열린다' : '<span class="dim">쓸 곳 없음</span>'));
      right.appendChild(h('div', 'small desc', d.desc));
      const nt = SA.Need.tipHtml(it.id); if (nt) right.appendChild(h('div', 'small', nt));
      const row = h('div', 'acts');
      for (const [lab, fn] of itemActs(it)) { const b = h('button', 'btn small', lab); b.onclick = () => { fn(); SA.Audio.sfx('click'); }; row.appendChild(b); }
      right.appendChild(row);
    }
    // 쓸 곳 없는 것 모두 팔기
    const junk = prof.stash.items.filter(isJunk), tot = junk.reduce((n, it) => n + SA.itemVal(it), 0);
    const jb = h('button', 'btn small' + (junk.length ? '' : ' dis'), junk.length ? `쓸 곳 없는 것 모두 팔기 ₵${tot}` : '팔 것 없음');
    tip(jb, () => junk.length ? junk.map(it => SA.ITEMS[it.id].name).filter((v, i, a) => a.indexOf(v) === i).join(', ') : '');
    jb.onclick = () => { if (!junk.length) return; junk.forEach(it => { SA.Grid.remove(prof.stash, it.uid); prof.credits += SA.itemVal(it); }); stashSel = null; SA.Audio.sfx('buy'); save(); render(); };
    right.appendChild(h('div', 'grow')); right.appendChild(jb);
    body.append(left, right);
  };
  const isJunk = (it) => { const d = SA.ITEMS[it.id]; if (SA.Decode.srcOf(it.id) || it.id === 'bb_reward') return false; if (d.kind === 'bp') return P().recipes.includes(d.recipe); if (d.kind === 'pbp') return SA.Bench.knowsPlanet(d.part); return ['mat', 'lore', 'data'].includes(d.kind) && !neededFor(it.id); };   // 이미 아는 설계도 · 안 쓰는 기본 재료 · 정보
  const itemActs = (it) => {
    const prof = P(), d = SA.ITEMS[it.id], grid = prof.stash;
    if (d.kind === 'ticket') return [['고용하기', () => hireRaven(it, grid)]];
    const a = [[`판매 ₵${SA.itemVal(it)}`, () => { SA.Grid.remove(grid, it.uid); prof.credits += SA.itemVal(it); SA.Audio.sfx('buy'); stashSel = null; save(); render(); }]];
    if (it.id === 'bb_reward' || SA.Decode.srcOf(it.id)) {
      a.unshift([`즉시 해독 ₵${SA.DECODE.instant}`, () => decode(it, true)]);
      if ((prof.decoding || []).length < SA.DECODE.slots) a.unshift(['해독기에 맡기기', () => decode(it, false)]);
    }
    if (d.kind === 'key') a.unshift([`해독 코드 등록 (+${SA.CODES[d.code].uses}회)`, () => registerKey(it)]);
    if (d.kind === 'part') a.unshift(['부품함으로', () => { SA.Grid.remove(prof.stash, it.uid); prof.parts.push(SA.Save.fromItem(it)); stashSel = null; save(); render(); }]);
    return a;
  };
  const registerKey = (it) => {
    const prof = P(), d = SA.ITEMS[it.id], c = SA.CODES[d.code];
    prof.codes = prof.codes || {}; prof.codeKnown = prof.codeKnown || {};
    SA.Grid.remove(prof.stash, it.uid);
    prof.codes[d.code] = (prof.codes[d.code] || 0) + c.uses; prof.codeKnown[d.code] = true;
    SA.Audio.sfx('unlock'); toast(`${c.name} 등록 — 남은 ${prof.codes[d.code]}회. 상점에서 충전할 수 있다`, '#5dffb0'); stashSel = null; save(); render();
  };
  const neededFor = (id) => {
    let n = 0;
    for (const r of P().recipes) { const m = (SA.RECIPES[r] || {}).mats || {}; n = Math.max(n, m[id] || 0); }
    for (const id2 in SA.CRAFT) n = Math.max(n, (SA.CRAFT[id2].mats || {})[id] && SA.ITEMS[id].kind !== 'mat' ? SA.CRAFT[id2].mats[id] : 0);
    for (const c of SA.STORY.contracts) if (c.mats && !(P().contracts[c.id] || {}).done) n = Math.max(n, c.mats[id] || 0);
    return n;
  };
  const hireRaven = (it, grid) => {
    const prof = P();
    if (prof.pilots.raven) { SA.Audio.sfx('deny'); toast('레이븐은 이미 용병단에 있다.', '#ffb3b3'); return; }
    SA.Grid.remove(grid, it.uid); prof.pilots.raven = { injury: 0 };
    SA.Audio.sfx('buy'); toast('레이븐이 용병단에 합류했다 — 파일럿으로 고를 수 있다', '#ffd166'); stashSel = null; save(); render();
  };
  const decode = (it, instant) => {
    const prof = P();
    if (instant && prof.credits < SA.DECODE.instant) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    if (!instant && (prof.decoding || []).length >= SA.DECODE.slots) { toast(`해독은 ${SA.DECODE.slots}개까지 맡길 수 있다.`, '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    SA.Grid.remove(prof.stash, it.uid);
    const r = SA.Decode.start(prof, it.id, instant);
    toast(r.text, '#ff8f3d'); SA.Audio.sfx('unlock'); stashSel = null; save(); render();
  };

  // ── 작업대: [부품] 고르면 할 수 있는 것만 · [제작] 만들 수 있는 것부터 ──
  let benchTab = 'parts', benchKind = 'all', benchSel = null;
  const KINDS = [['all', '전체', 'pt_emblem'], ['main', '주무기', 'pt_main'], ['sub', '서브', 'pt_sub'], ['act', '액티브', 'pt_act'], ['pas', '패시브', 'pt_pas'], ['obs', '관측', 'pt_obs']];
  const CKINDS = [...KINDS, ['item', '동력원·소모품', 'pt_cell'], ['mat', '상위 재료', 'pt_pod']];
  const TIERS = ['일반', '강화', '행성', '은하'];
  const tierOf = (id) => (SA.PARTS[id] || SA.ITEMS[id] || {}).tier || '일반';
  const matIcons = (mats, have) => Object.keys(mats).map(k => { const n = have(k), ok = n >= mats[k]; return `<span class="mat ${ok ? 'ok' : 'bad'}"><img src="${SA.Render.iconSrc(k)}">${SA.ITEMS[k].name} ${n}/${mats[k]}${ok || !n ? '' : `<i class="short">${mats[k] - n} 부족</i>`}</span>`; }).join('');
  const costHtml = (c, have) => matIcons(c.mats, have) + ` <span class="mat ${P().credits >= c.cr ? 'ok' : 'bad'}">₵${c.cr}</span>`;
  const benchClaimable = () => { const c = SA.Bench.contract(SA.Bench.lv() + 1); return !!c && SA.Contracts.open(c) && SA.Contracts.canClaim(c); };
  let benchOnlyOk = false;
  const bench = (body) => {
    const prof = P(), top = h('div', 'bn-top');
    SA.Contracts.sync();
    for (const [k, nm] of [['parts', '부품'], ['craft', '제작'], ['up', '행성·은하'], ['lv', `작업대 ${SA.Bench.lv()}단계`]]) {
      const b = h('button', 'tabb' + (benchTab === k ? ' on' : '') + (k === 'lv' && benchClaimable() ? ' alert' : ''), nm);
      if (k === 'up') tip(b, '부품을 행성으로 올리고(행성 설계도 필요), 행성 부품으로 은하 부품을 만든다');
      if (k === 'up' && (prof.newRecipes || []).some(r => r.startsWith('pl:'))) b.classList.add('alert');
      if (k === 'lv') tip(b, '테오의 의뢰로 작업대를 키우면 설계도와 행성이 열린다');
      if (k === 'lv' && prof.pbpPick > 0) b.classList.add('alert');
      b.onclick = () => { benchTab = k; render(); }; top.appendChild(b);
    }
    top.appendChild(h('div', 'grow'));
    if (benchTab === 'parts') {
      const needRep = prof.parts.filter(p => p.dur < p.max), cost = needRep.reduce((n, p) => n + repairCost(p), 0);
      const all = h('button', 'btn small' + (needRep.length ? '' : ' dis'), needRep.length ? `전부 수리 ₵${cost}` : '수리할 것 없음');
      tip(all, '수리하면 내구도가 가득 차지만 최대 내구도가 3씩 준다');
      all.onclick = () => { if (!needRep.length) return; if (prof.credits < cost) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= cost; needRep.forEach(repair); SA.Audio.sfx('repair'); save(); render(); };
      top.appendChild(all);
    }
    if (benchTab === 'craft') { const b = h('button', 'btn small tog' + (benchOnlyOk ? ' on' : ''), (benchOnlyOk ? '✓ ' : '') + '만들 수 있는 것만'); b.onclick = () => { benchOnlyOk = !benchOnlyOk; render(); }; top.appendChild(b); }
    body.appendChild(top);
    if (benchTab !== 'lv') {
      const kinds = h('div', 'kinds');
      for (const [k, nm, ic] of (benchTab === 'craft' ? CKINDS : KINDS)) { const b = h('button', 'kb' + (benchKind === k ? ' on' : ''), `${ico(ic)}<span>${nm}</span>`); b.onclick = () => { benchKind = k; render(); }; kinds.appendChild(b); }
      body.appendChild(kinds);
    }
    if (benchTab !== 'craft' && ['item', 'mat'].includes(benchKind)) benchKind = 'all';
    const wrap = h('div', 'bn-wrap'); body.appendChild(wrap);
    ({ parts: benchParts, craft: benchCraft, up: benchUp, lv: benchLvTab })[benchTab](wrap);
  };
  const benchParts = (wrap) => {
    const prof = P(), left = h('div', 'bn-grid'), right = h('div', 'bn-info');
    const equipped = new Set(); for (const s in prof.loadouts) SA.loUids(prof.loadouts[s]).forEach(u => equipped.add(u));
    const list = prof.parts.filter(p => benchKind === 'all' || SA.PARTS[p.id].slot === benchKind)
      .sort((a, b) => TIERS.indexOf(SA.partTier(b)) - TIERS.indexOf(SA.partTier(a)) || a.id.localeCompare(b.id));
    if (benchSel && !prof.parts.includes(benchSel)) benchSel = null;
    if (!benchSel) benchSel = list[0] || null;
    if (!list.length) left.appendChild(h('div', 'dim small pad', '부품이 없다.'));
    for (const p of list) {
      const r = p.dur / p.max, tl = h('div', 'ptile t-' + SA.partTier(p) + (benchSel === p ? ' on' : ''), `${partIcon(p)}${equipped.has(p.uid) ? '<span class="eq">장착</span>' : ''}${p.lv ? `<span class="lv">${'★'.repeat(p.lv)}</span>` : ''}<span class="db"><i style="width:${r * 100}%;background:${durCol(r)}"></i></span>`);
      tl.onmouseenter = (e) => SA.UI.showTipHtml(e, `<b>${SA.partHtml(p)}</b>`); tl.onmouseleave = SA.UI.hideTip;
      tl.onclick = () => { benchSel = p; render(); };
      left.appendChild(tl);
    }
    if (benchSel) {
      const p = benchSel, d = SA.PARTS[p.id], r = p.dur / p.max;
      right.appendChild(h('div', 'iinfo', `${partIcon(p)}<div><b>${SA.partHtml(p)}</b><div class="small"><span class="tier t-${SA.partTier(p)}">${SA.partTier(p)}</span> ${equipped.has(p.uid) ? '<span class="dim">· 장착 중</span>' : ''}</div></div>`));
      right.appendChild(h('div', 'small', `내구도 <span class="db wide"><i style="width:${r * 100}%;background:${durCol(r)}"></i></span> ${Math.round(p.dur)}/${Math.round(p.max)} · 성능 ${Math.round(SA.Combat.eff(p) * 100)}%`));
      right.appendChild(h('div', 'small desc', SA.partFullDesc(p)));
      const acts = h('div', 'acts');
      if (p.dur < p.max) { const b = h('button', 'btn small', `수리 ₵${repairCost(p)}`); tip(b, '최대 내구도가 3 준다'); b.onclick = () => { if (prof.credits < repairCost(p)) { SA.Audio.sfx('deny'); toast('크레딧이 부족하다.', '#ffb3b3'); return; } prof.credits -= repairCost(p); repair(p); SA.Audio.sfx('repair'); save(); render(); }; acts.appendChild(b); }
      if (SA.canUp(p.id) && !p.lv) { const [ok, why] = planetCheck(p), b = h('button', 'btn small up' + (ok ? '' : ' dis'), `행성으로 → ${SA.PLANET[p.id][0]}`); tip(b, `주 스탯 +30% · 전용 개조 「${SA.MODS[SA.planetMod(p.id)].name}」: ${SA.MODS[SA.planetMod(p.id)].desc}${ok ? '' : `<br><span class="bad">${why}</span>`}`); b.onclick = (e) => upMenu(e, p); acts.appendChild(b); }
      if (SA.chipsFor(p.id).length) { const b = h('button', 'btn small', p.mod ? '칩 교체' : '칩 끼우기'); tip(b, '개조 칩 (부품당 1칸). 빼면 창고로 돌아온다'); b.onclick = (e) => chipMenu(e, p); acts.appendChild(b); }
      if (!equipped.has(p.uid)) { const b = h('button', 'btn small', '분해'); tip(b, salvageText(p)); b.onclick = () => salvage(p); acts.appendChild(b); }
      if (SA.canUp(p.id) && !p.lv) acts.appendChild(h('div', 'small dim', SA.Bench.canUp(1) ? (SA.Bench.knowsPlanet(p.id) ? '행성 설계도 있음' : '행성 설계도 없음 — 필드·도리 배달·수집가') : '행성은 작업대 2단계부터'));
      right.appendChild(acts);
    }
    wrap.append(left, right);
  };
  const benchCraft = (wrap) => {
    const prof = P(), list = h('div', 'bn-list'), have = (k) => SA.Grid.count(prof.stash, k);
    const rows = [];
    // 부품 (아는 설계도)
    if (!['item', 'mat'].includes(benchKind)) for (const rid of prof.recipes) {
      const r = SA.RECIPES[rid], d = SA.PARTS[rid]; if (!r || !d || (benchKind !== 'all' && d.slot !== benchKind)) continue;
      const fromOk = !r.from || prof.parts.some(p => p.id === r.from), lock = !SA.Bench.canTier(d.tier);
      const ok = !lock && fromOk && Object.keys(r.mats).every(k => have(k) >= r.mats[k]);
      rows.push({ ok, lock, id: rid, tier: d.tier, isNew: (prof.newRecipes || []).includes(rid), html: `${d.img ? `<img class="pimg" src="${d.img}">` : ico(KIND_IC[d.slot], 'pimg')}<span class="nm" style="color:${SA.TIER_COL[d.tier]}">${d.name}</span><span class="mats">${r.from ? `<span class="mat ${fromOk ? 'ok' : 'bad'}">${SA.PARTS[r.from].name}</span>` : ''}${matIcons(r.mats, have)}</span>`, tip: `<b>${d.name}</b> <span class="dim">${d.tier}</span><br><span class="desc">${d.desc}</span>${lock ? '<br><span class="bad">작업대 2단계(테오의 의뢰)부터 만들 수 있다</span>' : ''}`, fn: () => craft(rid) });
    }
    // 동력원·소모품·상위 재료
    if (['all', 'item', 'mat'].includes(benchKind)) for (const id in SA.CRAFT) {
      const k = SA.ITEMS[id].kind; if (benchKind === 'mat' && k !== 'umat') continue; if (benchKind === 'item' && k === 'umat') continue;
      const r = SA.CRAFT[id], d = SA.ITEMS[id], ok = Object.keys(r.mats).every(m => have(m) >= r.mats[m]);
      rows.push({ ok, id, tier: tierOf(id), html: `<img class="pimg" src="${SA.Render.iconSrc(id)}"><span class="nm">${d.name} <span class="dim small">${have(id)}개</span></span><span class="mats">${matIcons(r.mats, have)}</span>`, tip: `<b>${d.name}</b><br><span class="desc">${d.desc}</span>`, fn: () => craftItem(id) });
    }
    rows.sort((a, b) => (b.id === prof.pin) - (a.id === prof.pin) || (!!b.isNew - !!a.isNew) || (b.ok - a.ok) || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
    const shown = benchOnlyOk ? rows.filter(r => r.ok) : rows;
    if (!shown.length) list.appendChild(h('div', 'dim small pad', benchOnlyOk ? '지금 재료로 만들 수 있는 것이 없다. 「만들 수 있는 것만」을 끄면 전부 보인다.' : '만들 수 있는 것이 없다. 설계도는 필드에서 줍거나 작업대를 키우면 받는다.'));
    for (const r of shown) {
      const pinned = prof.pin === r.id;
      const row = h('div', 'crow2' + (r.ok ? '' : ' no') + (r.lock ? ' lock' : '') + (r.isNew ? ' isnew' : '') + (pinned ? ' pinned' : ''), (r.isNew ? '<span class="newtag">NEW</span>' : '') + r.html + (r.lock ? ico('ic_lock', 'lk') : ''));
      tip(row, r.tip);
      const pb = h('button', 'btn tiny pin' + (pinned ? ' on' : ''), pinned ? '고정 중' : '고정');
      tip(pb, '제작 목표로 고정 — 필요한 재료가 창고·화물칸·필드에서 표시되고 목표 줄에 뜬다');
      pb.onclick = (e) => { e.stopPropagation(); prof.pin = pinned ? null : r.id; SA.Audio.sfx('click'); save(); render(); hud(); };
      row.appendChild(pb);
      const b = h('button', 'btn small' + (r.ok ? '' : ' dis'), '제작'); b.onclick = r.fn; row.appendChild(b);
      list.appendChild(row);
    }
    wrap.appendChild(list);
  };
  // [행성] 올릴 수 있는 부품 목록 · 행성 설계도 현황
  const benchUp = (wrap) => {
    const prof = P(), list = h('div', 'bn-list'), have = (k) => SA.Grid.count(prof.stash, k);
    const equipped = new Set(); for (const s in prof.loadouts) SA.loUids(prof.loadouts[s]).forEach(u => equipped.add(u));
    const nKnow = (prof.planetBp || []).length, nAll = Object.keys(SA.PLANET).length;
    list.appendChild(h('div', 'small pad dim', `행성으로 올리기: 작업대 2단계 ${SA.Bench.canUp(1) ? '<span class="ok">✓</span>' : '(잠김)'} · 행성 설계도 ${nKnow}/${nAll} · 주 스탯 +30% + 부품마다 정해진 전용 개조`));
    const ps = prof.parts.filter(p => SA.canUp(p.id) && !p.lv && (benchKind === 'all' || SA.PARTS[p.id].slot === benchKind));
    const rk = (p) => planetCheck(p)[0] ? 0 : SA.Bench.knowsPlanet(p.id) ? 1 : 2;
    ps.sort((a, b) => rk(a) - rk(b) || equipped.has(b.uid) - equipped.has(a.uid));
    if (!ps.length) list.appendChild(h('div', 'dim small pad', '행성으로 올릴 부품이 없다.'));
    for (const p of ps) {
      const [ok, why, c] = planetCheck(p), know = SA.Bench.knowsPlanet(p.id), nw = (prof.newRecipes || []).includes('pl:' + p.id), pm = SA.MODS[SA.planetMod(p.id)];
      const row = h('div', 'crow2' + (know && SA.Bench.canUp(1) ? '' : ' lock') + (nw ? ' isnew' : ''), `${nw ? '<span class="newtag">NEW</span>' : ''}${partIcon(p)}<span class="nm">${SA.partHtml(p)}${equipped.has(p.uid) ? ' <span class="dim small">장착</span>' : ''}<br><span class="small">→ <span style="color:${SA.TIER_COL['행성']}">${SA.PLANET[p.id][0]}</span></span></span><span class="mats">${know ? costHtml(c, have) : `<span class="small ${SA.Bench.canUp(1) ? 'bad' : 'dim'}">${why}</span>`}</span>`);
      row.onmouseenter = (e) => SA.UI.showTipHtml(e, `${partTipHtml(p)}<br><span style="color:${SA.TIER_COL['행성']}">→ ${SA.PLANET[p.id][0]}</span>: 주 스탯 +30% · 전용 「${pm.name}」 ${pm.desc}`); row.onmouseleave = SA.UI.hideTip;
      const b = h('button', 'btn small up' + (ok ? '' : ' dis'), '행성으로'); b.onclick = (e) => upMenu(e, p); row.appendChild(b);
      list.appendChild(row);
    }
    // 은하 제작: 행성 부품 + 특수 재료 (작업대 3단계)
    const L3 = SA.Bench.lv() >= 3;
    list.appendChild(h('div', 'small pad dim gal-hd', `<b class="g-awk">은하 제작</b> · 작업대 3단계 ${L3 ? '<span class="ok">✓</span>' : '(잠김)'} · 바탕 행성 부품을 써서 만든다 (칩은 옮겨진다)`));
    for (const gid in SA.GALAXY) {
      const g = SA.GALAXY[gid], b = SA.PARTS[g.base];
      if (benchKind !== 'all' && b.slot !== benchKind) continue;
      const src = galSrc(gid), c = SA.galCost(gid), okM = prof.credits >= c.cr && Object.keys(c.mats).every(k => have(k) >= c.mats[k]), ok = L3 && src && okM;
      const row = h('div', 'crow2' + (L3 ? '' : ' lock') + (ok ? '' : ' no'), `${b.img ? `<img class="pimg" src="${b.img}">` : ico(KIND_IC[b.slot], 'pimg')}<span class="nm"><span style="color:${SA.TIER_COL['은하']}">${g.name}</span><br><span class="small ${src ? 'ok' : 'bad'}">${SA.PLANET[g.base][0]} ${src ? '있음' : '필요'}</span></span><span class="mats">${costHtml(c, have)}</span>`);
      tip(row, `<b style="color:${SA.TIER_COL['은하']}">${g.name}</b> ← ${SA.PLANET[g.base][0]}<br><span class="desc">${g.fx}</span><br><span class="dim">주 스탯 ×${SA.GAL_MUL} · 최대 내구도 ${SA.GAL_MAX} · 전용 「${SA.MODS[SA.planetMod(g.base)].name}」 유지</span>`);
      const bb = h('button', 'btn small up' + (ok ? '' : ' dis'), '은하 제작'); bb.onclick = () => galCraft(gid); row.appendChild(bb);
      list.appendChild(row);
    }
    wrap.appendChild(list);
  };
  const galSrc = (gid) => P().parts.filter(p => p.id === SA.GALAXY[gid].base && p.lv === 1).sort((a, b) => b.dur - a.dur)[0] || null;
  const galCraft = (gid) => {
    const prof = P(), src = galSrc(gid), c = SA.galCost(gid), have = (k) => SA.Grid.count(prof.stash, k);
    if (SA.Bench.lv() < 3) { SA.Audio.sfx('deny'); toast('은하 제작은 작업대 3단계부터.', '#ffb3b3'); return; }
    if (!src) { SA.Audio.sfx('deny'); toast(`바탕이 될 「${SA.PLANET[SA.GALAXY[gid].base][0]}」이(가) 필요하다.`, '#ffb3b3'); return; }
    if (prof.credits < c.cr || !Object.keys(c.mats).every(k => have(k) >= c.mats[k])) { SA.Audio.sfx('deny'); toast('재료나 크레딧이 부족하다.', '#ffb3b3'); return; }
    SA.Grid.takeMats(prof.stash, c.mats); prof.credits -= c.cr;
    const np = SA.Save.newPart(gid); np.max = np.dur = SA.GAL_MAX; if (src.mod) np.mod = src.mod;
    prof.parts = prof.parts.filter(p => p !== src); prof.parts.push(np);
    for (const s in prof.loadouts) { const l = prof.loadouts[s]; for (const k of ['main', 'main2', 'obs']) if (l[k] === src.uid) l[k] = np.uid; for (const k of ['sub', 'act', 'pas']) l[k] = l[k].map(u => u === src.uid ? np.uid : u); }   // 장착 중이면 그대로 교체
    toast(`은하 제작: ${SA.GALAXY[gid].name}`, SA.TIER_COL['은하']); SA.Audio.sfx('rare2'); SA.Quest.event('craft'); save(); render(); hud();
  };
  // [작업대 N단계] 단계 카드 3장 · 다음 단계는 테오의 납품 의뢰
  const benchLvTab = (wrap) => {
    const prof = P(), L = SA.Bench.lv(), K = SA.Contracts, have = (k) => SA.Grid.count(prof.stash, k), box = h('div', 'bn-lv');
    if (prof.pbpPick > 0) {   // 행성 설계도 고르기
      const eq = new Set(); for (const s in prof.loadouts) for (const u of SA.loUids(prof.loadouts[s])) { const q = prof.parts.find(x => x.uid === u); if (q) eq.add(q.id); }
      const own = new Set(prof.parts.map(q => q.id)), rk = (id) => eq.has(id) ? 0 : own.has(id) ? 1 : prof.recipes.includes(id) ? 2 : 3;
      const ids = Object.keys(SA.PLANET).filter(id => !SA.Bench.knowsPlanet(id) && id !== 'raven' && rk(id) < 3).sort((a, b) => rk(a) - rk(b));
      const pk = h('div', 'lvcard next', `<div class="hd"><b>행성 설계도 고르기</b><span class="chip">${prof.pbpPick}장 남음</span></div><div class="small dim">테오: "하나 골라요. 도면은 제가 복원해 둘게요." — 장착 중 → 가진 부품 → 아는 제작법 순</div>`);
      const g = h('div', 'pkgrid');
      for (const id of ids) {
        const pm = SA.MODS[SA.planetMod(id)], d = SA.PARTS[id], b = h('button', 'pk', `${d.img ? `<img src="${d.img}">` : ico(KIND_IC[d.slot], '')}<span><b style="color:${SA.TIER_COL['행성']}">${SA.PLANET[id][0]}</b><br><span class="small dim">${d.name}${eq.has(id) ? ' · 장착 중' : own.has(id) ? ' · 보유' : ''}</span></span>`);
        tip(b, `<b>${SA.PLANET[id][0]}</b> ← ${d.name}<br>전용 「${pm.name}」 ${pm.desc}`);
        b.onclick = () => { if (prof.pbpPick <= 0) return; SA.Bench.grantPlanet(id); prof.pbpPick--; toast(`행성 설계도 등록: ${SA.PLANET[id][0]}`, SA.TIER_COL['행성']); SA.Audio.sfx('unlock'); save(); render(); hud(); };
        g.appendChild(b);
      }
      if (!ids.length) g.appendChild(h('div', 'small dim', '고를 수 있는 행성 설계도가 없다.'));
      pk.appendChild(g); box.appendChild(pk);
    }
    const pname = (id) => (SA.PARTS[id] || {}).name || id;
    for (let n = 1; n <= 3; n++) {
      const st = n <= L ? 'done' : n === L + 1 ? 'next' : 'lock';
      const chip = n < L ? '완료' : n === L ? '지금' : n === L + 1 ? '다음' : '잠김';
      const give = n === 2 ? `일반 부품 ${SA.BENCH.give[2].length}종` : (SA.BENCH.give[n] || []).map(pname).join(', ');
      const card = h('div', 'lvcard ' + st, `<div class="hd"><b>${n}단계 · ${SA.BENCH.name[n]}</b><span class="chip">${chip}</span></div><div class="small">${SA.BENCH.opens[n]}</div><div class="small dim">설계도: ${give}</div>`);
      if (n === L + 1) {
        const c = SA.Bench.contract(n);
        if (!c || !K.open(c)) card.appendChild(h('div', 'small warn', '정비사 테오를 구조하면 테오가 이 일을 맡아 준다. (출격 중 조난 신호)'));
        else {
          card.appendChild(h('div', 'small', `<span class="dim">${c.giver}:</span> "${c.brief}"`));
          card.appendChild(h('div', 'small mats', '필요한 재료 ' + matIcons(c.mats, have)));
          const can = K.canClaim(c), b = h('button', 'btn' + (can ? '' : ' dis'), '재료 넘기고 작업대 강화');
          b.onclick = () => {
            const rp = K.claim(c.id);
            if (rp === null) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
            toast(`작업대 강화 완료${rp}`, '#5dffb0'); SA.Audio.sfx('extract'); SA.Quest.event('contract'); save(); render(); hud();
          };
          card.appendChild(b);
        }
      }
      box.appendChild(card);
    }
    wrap.appendChild(box);
  };
  // 분해: 제작 재료의 절반(내림)을 돌려준다. 레시피가 없는 부품은 고철 1
  const salvageMats = (p) => { if (SA.PARTS[p.id].gal) return { qcircuit: 2 }; const r = SA.RECIPES[p.id], out = {}; if (!r) return { scrap: 1 }; for (const k in r.mats) { const n = Math.floor(r.mats[k] / 2); if (n) out[k] = n; } if (p.lv) out.qcircuit = p.lv; if (!Object.keys(out).length) out.scrap = 1; return out; };
  const salvageText = (p) => '분해하면: ' + Object.entries(salvageMats(p)).map(([k, n]) => `${SA.ITEMS[k].name} ${n}`).join(', ');
  const salvage = (p) => {
    const prof = P(), out = salvageMats(p), ids = []; for (const k in out) for (let i = 0; i < out[k]; i++) ids.push(k);
    const tmp = SA.Grid.make(prof.stash.w, prof.stash.h, prof.stash.items.slice());
    if (!ids.every(id => SA.Grid.add(tmp, id))) { toast('창고에 재료를 넣을 자리가 없다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    ids.forEach(id => SA.Grid.add(prof.stash, id));
    prof.parts = prof.parts.filter(x => x !== p); benchSel = null;
    toast(`분해: ${SA.partName(p)} → ${salvageText(p).slice(6)}`, '#cfe3ff'); SA.Audio.sfx('salvage', 1); save(); render();
  };
  const craftItem = (id) => {
    const prof = P(), r = SA.CRAFT[id];
    if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
    const tmp = SA.Grid.make(prof.stash.w, prof.stash.h, prof.stash.items.slice()); SA.Grid.takeMats(tmp, r.mats);
    if (!SA.Grid.add(tmp, id)) { SA.Audio.sfx('deny'); toast('창고에 자리가 없다.', '#ffb3b3'); return; }
    SA.Grid.takeMats(prof.stash, r.mats); SA.Grid.add(prof.stash, id);
    if (prof.pin === id) prof.pin = null;
    toast(`제작 완료: ${SA.ITEMS[id].name}`, '#5dffb0'); SA.Audio.sfx('buy'); SA.Quest.event('craft'); save(); render(); hud();
  };
  const repairCost = (p) => Math.ceil((p.max - p.dur) * SA.partVal(p) / 250);
  // ── 행성·은하 강화 / 개조 교체 ──
  // 행성으로 올리기: 그 부품의 행성 설계도 + 비용. 전용 개조는 정해져 있다
  const planetCheck = (p) => {
    const prof = P(), have = (k) => SA.Grid.count(prof.stash, k), c = SA.UPGRADE.cost(p);
    if (!SA.canUp(p.id) || p.lv) return [false, '올릴 수 없다', c];
    if (!SA.Bench.canUp(1)) return [false, `작업대 ${SA.Bench.needFor(1)}단계 필요`, c];
    if (!SA.Bench.knowsPlanet(p.id)) return [false, '행성 설계도 필요', c];
    if (prof.credits < c.cr || !Object.keys(c.mats).every(k => have(k) >= c.mats[k])) return [false, '재료·크레딧 부족', c];
    return [true, '', c];
  };
  const upMenu = (e, p) => {
    const [ok, why, c] = planetCheck(p);
    if (!ok) { SA.Audio.sfx('deny'); toast(why === '행성 설계도 필요' ? `「${SA.PLANET[p.id][0]}」 행성 설계도가 필요하다 — 필드·도리 배달·수집가에서 구한다.` : why.includes('작업대') ? `${why} — 작업대 단계 탭에서 테오의 의뢰를 보자.` : why, '#ffb3b3'); return; }
    const prof = P();
    SA.Grid.takeMats(prof.stash, c.mats); prof.credits -= c.cr;
    const lost = Math.max(0, SA.LV_MAX[0] - p.max);   // 수리로 깎인 최대 내구도는 유지
    p.lv = 1; p.max = Math.max(40, SA.LV_MAX[1] - lost); p.dur = p.max;
    toast(`행성으로: ${SA.partName(p, true)} — 전용 개조 「${SA.MODS[SA.planetMod(p.id)].name}」`, SA.TIER_COL['행성']); SA.Quest.event('craft');
    SA.Audio.sfx('buy'); save(); render(); hud();
  };
  // 개조 칩: 창고의 칩을 끼운다 (원래 칩은 창고로) · 빼면 창고로
  const chipMenu = (e, p) => {
    const prof = P(), opts = SA.chipsFor(p.id).filter(k => SA.Grid.count(prof.stash, 'mc_' + k) > 0);
    const m = h('div', 'ctx wide'), closeM = () => document.querySelectorAll('.ctx').forEach(x => x.remove());
    m.appendChild(h('div', 'pad small', `${SA.partHtml(p)} — 개조 칩 (지금: ${p.mod ? SA.MODS[p.mod].name : '없음'})`));
    if (!opts.length) m.appendChild(h('div', 'pad small dim', `창고에 ${SA.SLOT_NAME[SA.PARTS[p.id].slot]}용 칩이 없다. 오스의 단말에서 사거나 필드에서 줍는다.`));
    for (const k of opts) {
      if (k === p.mod) continue;
      const b = h('button', '', `<b>${SA.MODS[k].name}</b> <span class="dim small">×${SA.Grid.count(prof.stash, 'mc_' + k)}</span><div class="small dim">${SA.MODS[k].desc}</div>`);
      b.onclick = () => {
        const it = prof.stash.items.find(x => x.id === 'mc_' + k); if (!it) return;
        SA.Grid.remove(prof.stash, it.uid);
        if (p.mod && !SA.Grid.add(prof.stash, 'mc_' + p.mod)) { SA.Grid.add(prof.stash, 'mc_' + k); toast('창고에 빼낸 칩을 넣을 자리가 없다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
        p.mod = k; closeM(); toast(`칩 장착: ${SA.partName(p)}`, '#7fd1ff'); SA.Audio.sfx('equip'); save(); render();
      };
      m.appendChild(b);
    }
    if (p.mod) {
      const b = h('button', '', '<b>칩 빼기</b> <span class="small dim">창고로 돌아간다</span>');
      b.onclick = () => { if (!SA.Grid.add(prof.stash, 'mc_' + p.mod)) { toast('창고에 자리가 없다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } p.mod = null; closeM(); SA.Audio.sfx('click'); save(); render(); };
      m.appendChild(b);
    }
    m.style.left = Math.min(innerWidth - 340, e.clientX) + 'px'; m.style.top = Math.min(innerHeight - 360, e.clientY) + 'px';
    closeM(); document.body.appendChild(m);
    setTimeout(() => addEventListener('mousedown', function off(ev) { if (!m.contains(ev.target)) { m.remove(); removeEventListener('mousedown', off); } }), 0);
  };
  const repair = (p) => { p.max = Math.max(40, p.max - 3); p.dur = p.max; };
  const craft = (rid) => {
    const prof = P(), r = SA.RECIPES[rid];
    if (!SA.Bench.canTier(SA.PARTS[rid].tier)) { SA.Audio.sfx('deny'); toast('강화 등급은 작업대 2단계부터 만들 수 있다.', '#ffb3b3'); return; }
    if (r.from) {
      const src = prof.parts.filter(p => p.id === r.from).sort((a, b) => b.dur - a.dur)[0];
      if (!src) { SA.Audio.sfx('deny'); return; }
      if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
      SA.Grid.takeMats(prof.stash, r.mats);
      prof.parts = prof.parts.filter(p => p !== src);
      const np = SA.Save.newPart(rid); prof.parts.push(np);
      for (const s in prof.loadouts) { const l = prof.loadouts[s]; for (const k of ['main', 'main2', 'obs']) if (l[k] === src.uid) l[k] = np.uid; for (const k of ['sub', 'act', 'pas']) l[k] = l[k].map(u => u === src.uid ? np.uid : u); }   // 장착 중이면 그대로 교체
    } else {
      if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
      SA.Grid.takeMats(prof.stash, r.mats);
      prof.parts.push(SA.Save.newPart(rid));
    }
    if (prof.pin === rid) prof.pin = null;
    toast(`제작 완료: ${SA.PARTS[rid].name}`, '#5dffb0'); SA.Audio.sfx('buy'); SA.Quest.event('craft'); save(); render(); hud();
  };

  // ── 상점 (오스의 단말): 소모품 · 해독 코드 충전 ──
  const shop = (body) => {
    const prof = P(), c = h('div', 'shop');
    for (const [id, price] of SA.SHOP.consumables) {
      const d = SA.ITEMS[id], r = h('div', 'srow', `<img src="${SA.Render.iconSrc(id)}"><span class="nm">${d.name}</span><span class="dim small">창고 ${SA.Grid.count(prof.stash, id)}</span>`);
      tip(r, `<b>${d.name}</b><br><span class="desc">${d.desc}</span>`);
      const b = h('button', 'btn small', `₵${price}`);
      b.onclick = () => {
        if (prof.credits < price) { SA.Audio.sfx('deny'); toast('크레딧이 부족하다.', '#ffb3b3'); return; }
        if (!SA.Grid.add(prof.stash, id)) { toast('창고가 가득 찼다.', '#ffb3b3'); return; }
        prof.credits -= price; SA.Audio.sfx('buy'); save(); render();
      };
      r.appendChild(b); c.appendChild(r);
    }
    c.appendChild(h('h4', '', `개조 칩 <span class="dim small">· 작업대 → 부품에서 끼운다</span>`));
    for (const k of SA.CHIPS) {
      const id = 'mc_' + k, d = SA.ITEMS[id], price = SA.SHOP.chips, M = SA.MODS[k];
      const r = h('div', 'srow', `<img src="${SA.Render.iconSrc(id)}"><span class="nm">${M.name} <span class="dim small">${SA.SLOT_NAME[M.slot]}</span></span><span class="dim small">창고 ${SA.Grid.count(prof.stash, id)}</span>`);
      tip(r, `<b>${d.name}</b><br><span class="desc">${d.desc}</span>`);
      const b = h('button', 'btn small', `₵${price}`);
      b.onclick = () => {
        if (prof.credits < price) { SA.Audio.sfx('deny'); toast('크레딧이 부족하다.', '#ffb3b3'); return; }
        if (!SA.Grid.add(prof.stash, id)) { toast('창고가 가득 찼다.', '#ffb3b3'); return; }
        prof.credits -= price; SA.Audio.sfx('buy'); save(); render();
      };
      r.appendChild(b); c.appendChild(r);
    }
    const known = Object.keys(SA.CODES).filter(k => (prof.codeKnown || {})[k]);
    if (known.length) c.appendChild(h('h4', '', '해독 코드 충전'));
    for (const k of known) {
      const cd = SA.CODES[k], cur = (prof.codes || {})[k] || 0, full = cur >= cd.uses;
      const r = h('div', 'srow', `${ico('ic_decoder', 'pimg')}<span class="nm">${cd.name}</span><span class="dim small">${cur}/${cd.uses}회</span>`);
      const b = h('button', 'btn small' + (full ? ' dis' : ''), full ? '가득' : `₵${cd.price}`);
      b.onclick = () => { if (full) return; if (prof.credits < cd.price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= cd.price; prof.codes[k] = cd.uses; SA.Audio.sfx('buy'); save(); render(); };
      r.appendChild(b); c.appendChild(r);
    }
    body.appendChild(c);
  };
  // ── 배달 (도리) ──
  const deliv = (body) => {
    const prof = P(), D = SA.SHOP.delivery, dv = deliveryStock(), left = D.every - (Date.now() % D.every), c = h('div', 'shop');
    c.appendChild(h('div', 'small dim', `재고 교체까지 ${Math.floor(left / 60000)}분`));
    for (const st of dv.stock) {
      const d = SA.ITEMS[st.id], price = Math.ceil(d.val * D.mul);
      const r = h('div', 'srow', `<img src="${SA.Render.iconSrc(st.id)}"><span class="nm">${d.name}</span><span class="dim small">${st.n}개 남음</span>`);
      tip(r, `<b>${d.name}</b><br><span class="desc">${d.desc}</span><br><span class="dim">판매가의 ${D.mul}배</span>`);
      const b = h('button', 'btn small' + (st.n ? '' : ' dis'), st.n ? `₵${price}` : '품절');
      b.onclick = () => {
        if (!st.n) return;
        if (prof.credits < price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
        if (!SA.Grid.add(prof.stash, st.id)) { toast('창고가 가득 찼다.', '#ffb3b3'); return; }
        prof.credits -= price; st.n--; SA.Audio.sfx('buy'); save(); render();
      };
      r.appendChild(b); c.appendChild(r);
    }
    body.appendChild(c);
  };
  // 20분 단위 시간 칸마다 재고를 새로 뽑는다 (게임을 꺼 둔 동안에도 흐른다)
  const deliveryStock = () => {
    const prof = P(), D = SA.SHOP.delivery, slot = Math.floor(Date.now() / D.every);
    if (!prof.deliv || prof.deliv.slot !== slot) {
      const pool = D.pool.slice().sort(() => Math.random() - 0.5).slice(0, D.kinds);
      const stock = pool.map(id => ({ id, n: 2 + Math.floor(Math.random() * 4) }));
      for (const [id, p] of D.rare) if (Math.random() < p) stock.push({ id, n: 1 + Math.floor(Math.random() * 2) });
      prof.deliv = { slot, stock }; save();
    }
    return prof.deliv;
  };

  // ── 의뢰: 접힌 한 줄 (색 띠 · 제목 · 진행 막대 · 보상), 누르면 펼침 ──
  let openC = null;
  const progOf = (c) => {   // [지금, 목표, 상세 html]
    const prof = P(), K = SA.Contracts, st = K.st(c.id);
    if (c.type === 'deliver') { let a = 0, b = 0; const t = Object.keys(c.mats).map(k => { const n = Math.min(SA.Grid.count(prof.stash, k), c.mats[k]); a += n; b += c.mats[k]; return `<span class="mat ${n >= c.mats[k] ? 'ok' : 'bad'}"><img src="${SA.Render.iconSrc(k)}">${n}/${c.mats[k]}</span>`; }).join(''); return [a, b, t]; }
    if (c.type === 'wing') return [st.progress >= 1 ? 1 : 0, 1, `${SA.NAMED[c.named].name}와 출격해 ${c.goal === 'escort' ? '수송선 호위' : '사냥꾼 격추'} 후 탈출`];
    if (c.type === 'raven') return [prof.raven.done ? 1 : 0, 1, prof.raven.done ? '붙잡았다' : prof.raven.stage ? '도주한 레이븐과 재대결 → 포드 회수' : '둥지에서 레이븐을 몰아붙여라'];
    return [Math.min(st.progress, c.need), c.need, st.accepted ? '' : '수주한 뒤부터 센다'];
  };
  const contracts = (body) => {
    const prof = P(), K = SA.Contracts;
    K.sync();
    // 진영 줄다리기
    const kv = prof.rep.kingdom, ev = prof.rep.empire, ln = prof.route || K.lean();
    const tug = h('div', 'tug', `<span class="rep-kingdom">왕국 ${kv > 0 ? '+' : ''}${kv}</span><div class="track"><i class="k" style="width:${Math.max(0, Math.min(50, kv / 2))}%"></i><i class="e" style="width:${Math.max(0, Math.min(50, ev / 2))}%"></i><b></b></div><span class="rep-empire">제국 ${ev > 0 ? '+' : ''}${ev}</span>`);
    tip(tug, `왕국·제국 의뢰를 끝내면 그 진영 +${SA.REP.gain}, 반대 -${SA.REP.loss}. 중립은 영향 없음.<br>1막이 끝날 때 높은 쪽의 2막 루트로 간다.<br>${prof.route ? `루트 확정: ${K.FAC[prof.route]}` : `지금 기울어진 쪽: ${ln ? K.FAC[ln] : '없음'}`}`);
    body.appendChild(tug);
    body.appendChild(h('div', 'small dim', `수주 ${K.counted().length}/${SA.REP.maxActive}`));
    const rank = (c) => { const s = K.st(c.id); return s.done ? 4 : K.canClaim(c) ? 0 : s.accepted ? 1 : 2; };
    const list = SA.STORY.contracts.filter(K.open).sort((a, b) => rank(a) - rank(b) || (b.key ? 1 : 0) - (a.key ? 1 : 0));
    const RV = { kingdom: 'empire', empire: 'kingdom' };
    const done = h('details', 'donebox'); let nDone = 0;
    for (const c of list) {
      const st = K.st(c.id), can = K.canClaim(c), [a, b, det] = progOf(c);
      const rwIc = c.reward.bench ? `<span class="rw">작업대 ${c.reward.bench}단계</span>` : `<span class="rw">₵${c.reward.credits}${c.reward.item ? `<img src="${SA.Render.iconSrc(c.reward.item)}" title="${SA.ITEMS[c.reward.item].name}">` : ''}</span>`;
      const chipT = st.done ? '<span class="chip">완료</span>' : can ? `<span class="chip ok">${ico('ic_gift')}보상</span>` : st.accepted ? '<span class="chip">진행 중</span>' : '';
      const row = h('div', 'cr fac-' + (c.fac || 'neutral') + (st.accepted && !st.done ? ' taken' : '') + (openC === c.id ? ' open' : '') + (st.done ? ' off' : ''),
        `<div class="hd"><b>${c.key ? '<span class="key">중요</span> ' : ''}${c.title}</b><span class="cbar"><i style="width:${b ? a / b * 100 : 0}%"></i></span><span class="cnum">${a}/${b}</span>${rwIc}${chipT}</div>`);
      row.querySelector('.hd').onclick = () => { openC = openC === c.id ? null : c.id; render(); };
      if (openC === c.id) {
        const rep = RV[c.fac] ? ` · <span class="rep-${c.fac}">${K.FAC[c.fac]} +${SA.REP.gain}</span> <span class="rep-${RV[c.fac]}">${K.FAC[RV[c.fac]]} -${SA.REP.loss}</span>` : '';
        const dd = h('div', 'dt', `<div class="small"><span class="dim">${c.giver}</span> "${c.brief}"</div>${det ? `<div class="small">${det}</div>` : ''}<div class="small dim">보상 ${c.reward.bench ? `작업대 ${c.reward.bench}단계 (${SA.BENCH.name[c.reward.bench]})` : '₵' + c.reward.credits}${c.reward.item ? ' + ' + SA.ITEMS[c.reward.item].name : ''}${rep}</div>`);
        const r2 = h('div', 'acts');
        if (!st.done && !st.accepted) {
          const bb = h('button', 'btn small' + (K.counted().length >= SA.REP.maxActive ? ' dis' : ''), '수주');
          bb.onclick = () => { const err = K.accept(c.id); if (err) { toast(err, '#ffb3b3'); SA.Audio.sfx('deny'); return; } SA.Audio.sfx('click'); render(); };
          r2.appendChild(bb);
        } else if (!st.done) {
          const bb = h('button', 'btn small' + (can ? '' : ' dis'), c.type === 'deliver' ? '납품' : '보상 받기');
          bb.onclick = () => { const rp = K.claim(c.id); if (rp === null) { SA.Audio.sfx('deny'); return; } autoRegister(); toast(`의뢰 완료: ${c.title}${rp}`, '#5dffb0'); SA.Audio.sfx('extract'); SA.Quest.event('contract'); save(); render(); };
          const x = h('button', 'btn tiny', '포기'); x.onclick = () => { K.abandon(c.id); SA.Audio.sfx('click'); render(); };
          if (c.auto) r2.append(bb); else r2.append(bb, x);
        }
        dd.appendChild(r2); row.appendChild(dd);
      }
      if (st.done) { done.appendChild(row); nDone++; } else body.appendChild(row);
    }
    if (nDone) { done.insertBefore(h('summary', 'dim small', `완료 ${nDone}건`), done.firstChild); body.appendChild(done); }
  };

  // ── 해독기: 해독 칸 3 · 창고의 블랙박스 · 출처별 기록 · 구석에 전적 ──
  const decoder = (body) => {
    const prof = P(), ST = SA.STORY, top = h('div', 'dc-top'), dec = prof.decoding || [];
    const slots = h('div', 'dslots');
    for (let i = 0; i < SA.DECODE.slots; i++) { const d = dec[i]; slots.appendChild(h('div', 'dslot' + (d ? ' busy' : ''), d ? `<img src="${SA.Render.iconSrc(d.id)}"><span class="small">다음 출격 뒤</span>` : '<span class="dim small">빈 칸</span>')); }
    top.appendChild(slots);
    const s = prof.stats;
    top.appendChild(tip(h('div', 'stats small dim', `출격 ${s.raids} · 탈출 ${s.extracts}`), `출격 ${s.raids} · 탈출 ${s.extracts} · 격추당함 ${s.deaths}<br>격추 ${s.kills}기 · 최고 운반 가치 ₵${s.bestValue}`));
    body.appendChild(top);
    const boxes = prof.stash.items.filter(it => it.id === 'bb_reward' || SA.Decode.srcOf(it.id));
    for (const it of boxes) {
      const r = h('div', 'srow', `<img src="${SA.Render.iconSrc(it.id)}"><span class="nm">${SA.ITEMS[it.id].name}</span>`);
      if (dec.length < SA.DECODE.slots) { const b = h('button', 'btn small', '맡기기'); tip(b, '다음 출격이 끝나면 열린다'); b.onclick = () => decode(it, false); r.appendChild(b); }
      const b2 = h('button', 'btn small', `즉시 ₵${SA.DECODE.instant}`); b2.onclick = () => decode(it, true); r.appendChild(b2);
      body.appendChild(r);
    }
    for (const i of prof.signals || []) { const b = ST.bbReward[i]; body.appendChild(h('div', 'card log sig', `<b>${b.title}</b> <span class="warn small">다음 출격: ${b.signal.label}</span>${b.lines.map(l => `<div class="small">${l}</div>`).join('')}`)); }
    body.appendChild(h('h4', '', `블랙박스 기록 ${prof.logs.length}/${ST.blackbox.length}`));
    const fresh = new Set(prof.logsNew || []);
    for (const src in ST.bbSrc) {
      const Sx = ST.bbSrc[src], L = ST.blackbox.filter(b => b.src === src), got = L.filter(b => prof.logs.includes(b.id)).length;
      body.appendChild(h('div', 'log-src', `<b>${Sx.name}</b> <span class="dim small">${got}/${L.length}</span>`));
      for (const b of L) {
        if (prof.logs.includes(b.id)) body.appendChild(h('div', 'card log', `${fresh.has(b.id) ? '<span class="new">NEW</span> ' : ''}<b>${b.title}</b>${b.lines.map(l => `<div class="small">${l}</div>`).join('')}`));
        else body.appendChild(tip(h('div', 'card log unknown', '<b>???</b>'), `<span class="dim">${Sx.where}</span>`));
      }
    }
    if (fresh.size) { prof.logsNew = []; save(); }   // 한 번 보면 NEW 표시는 사라진다
  };

  return { open, close, go, toast, render, openPanel, closePanel, isPanelOpen, openRack, barHover, setResult, hud, progOf };
})();
