// 격자 UI(화물칸·보안 칸·창고 공용), 끌어서 놓기, 툴팁, 우클릭 메뉴, Tab 창.
SA.UI = (() => {
  const CELL = 32;
  const views = {};                 // name -> { grid, el, opts }
  let drag = null, tip = null, menu = null;

  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const $ = (s) => document.querySelector(s);

  // ── 격자 그리기 ──
  const gridView = (name, el, grid, opts = {}) => {
    views[name] = { grid, el, opts };
    el.innerHTML = '';
    el.classList.add('grid');
    el.dataset.grid = name;
    el.style.width = grid.w * CELL + 'px'; el.style.height = grid.h * CELL + 'px';
    const NM = SA.Need && SA.profile ? SA.Need.map() : {};
    for (const it of grid.items) {
      const d = SA.ITEMS[it.id], [w, hh] = SA.Grid.dims(it);
      const tr = SA.itemTier(it.id, it);
      const n = h('div', 'item' + (tr ? ' g-' + tr : '') + (opts.sel && opts.sel === it.uid ? ' sel' : ''));
      n.style.left = it.x * CELL + 'px'; n.style.top = it.y * CELL + 'px';
      n.style.width = w * CELL + 'px'; n.style.height = hh * CELL + 'px';
      n.style.setProperty('--c', SA.itemCol(it.id, it));
      if (tr) n.appendChild(h('span', 'tg', SA.TIER_SHORT[tr]));   // 색을 못 구분해도 읽히는 등급 글자
      const img = h('img'); img.src = SA.Render.iconSrc(it.id); img.draggable = false;
      img.style.width = d.w * CELL + 'px'; img.style.height = d.h * CELL + 'px';
      if (it.rot) img.style.transform = `translate(-50%,-50%) rotate(90deg)`;
      else img.style.transform = 'translate(-50%,-50%)';
      n.appendChild(img);
      if (d.kind === 'cell' && it.ch !== undefined) n.appendChild(h('span', 'val', Math.round(it.ch * 100) + '%'));   // 동력원 충전량
      else if (opts.showVal !== false) n.appendChild(h('span', 'val', '₵' + SA.itemVal(it)));
      if (NM[it.id] && NM[it.id].mark) n.appendChild(h('span', 'need ' + NM[it.id].mark));   // 고정 목표(노랑)·납품 의뢰(초록) 재료
      n.addEventListener('mousedown', (e) => onItemDown(e, name, it));
      n.addEventListener('mouseenter', (e) => showTip(e, it.id, it.dur !== undefined ? `<br>내구도 ${it.dur}/${SA.LV_MAX[it.lv || 0]}` : it.ch !== undefined ? `<br>충전 ${Math.round(it.ch * 100)}%` : '', it));
      n.addEventListener('mouseleave', hideTip);
      n.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(e, name, it); });
      el.appendChild(n);
    }
    const prev = h('div', 'preview'); prev.style.display = 'none'; el.appendChild(prev);
  };
  const refreshAll = () => { for (const k in views) if (document.body.contains(views[k].el)) gridView(k, views[k].el, views[k].grid, views[k].opts); };

  // ── 툴팁 ──
  const showTip = (e, id, extra = '', it = null) => {
    if (drag) return;
    const d = SA.ITEMS[id];
    if (it && d.kind === 'part' && (it.lv || it.mod)) {   // 행성급 부품 완성품: 등급·개조까지 보여 준다
      const p = { id: d.part, lv: it.lv, mod: it.mod, awk: it.awk };
      if (!tip) { tip = h('div', 'tip'); document.body.appendChild(tip); }
      tip.innerHTML = `<b>${SA.partHtml(p)}</b> <span class="dim">${d.w}×${d.h} · 부품 · ${SA.partTier(p)}</span><br>₵${SA.itemVal(it)}<br><span class="desc">[부품] ${SA.partFullDesc(p)} 탈출하면 부품함으로 들어간다.</span>${extra}`;
      tip.style.display = 'block'; moveTip(e); return;
    }
    if (!tip) { tip = h('div', 'tip'); document.body.appendChild(tip); }
    const cells = d.w * d.h;
    const tier = SA.itemTier(id, it);
    tip.innerHTML = `<b style="color:${SA.itemCol(id, it)}">${d.name}</b> <span class="dim">${d.w}×${d.h} · ${SA.KIND_NAME[d.kind] || ''}${tier ? ' · ' + tier : ''}</span><br>` +
      `₵${d.val} <span class="dim">· 칸당 ₵${Math.round(d.val / cells)}</span><br><span class="desc">${d.desc}</span>${extra}${SA.Need && SA.profile ? SA.Need.tipHtml(id) : ''}` +
      `<div class="keys">끌기: 이동 · R: 회전 · 우클릭: 메뉴${SA.R && SA.R.tabOpen ? ' · Shift+클릭: 보안칸↔화물칸 · Ctrl+클릭: 버리기' : ''}</div>`;
    tip.style.display = 'block'; moveTip(e);
  };
  const showTipHtml = (e, html) => {
    if (drag) return;
    if (!tip) { tip = h('div', 'tip'); document.body.appendChild(tip); }
    tip.innerHTML = html; tip.style.display = 'block'; moveTip(e);
  };
  const moveTip = (e) => { if (!tip) return; tip.style.left = Math.min(innerWidth - 280, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - 140, e.clientY + 12) + 'px'; };
  const hideTip = () => { if (tip) tip.style.display = 'none'; };
  addEventListener('mousemove', (e) => { if (tip && tip.style.display === 'block') moveTip(e); if (drag) moveDrag(e); });

  // ── 우클릭 메뉴 ──
  const openMenu = (e, gname, it) => {
    closeMenu(); hideTip();
    const v = views[gname], acts = (v.opts.menu || (() => []))(it, v.grid);
    if (!acts.length) return;
    menu = h('div', 'ctx');
    for (const [label, fn] of acts) { const b = h('button', '', label); b.onclick = () => { closeMenu(); fn(); refreshAll(); SA.Audio.sfx('click'); }; menu.appendChild(b); }
    menu.style.left = e.clientX + 'px'; menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);
  };
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  addEventListener('mousedown', (e) => { if (menu && !menu.contains(e.target)) closeMenu(); });

  // ── 끌어서 놓기 ──
  const onItemDown = (e, gname, it) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const v = views[gname];
    if (e.ctrlKey && v.opts.onQuickDiscard) { v.opts.onQuickDiscard(it, v.grid); refreshAll(); return; }
    if (e.shiftKey && v.opts.onQuickMove) { v.opts.onQuickMove(it, v.grid); refreshAll(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    startDrag(e, { id: it.id, rot: it.rot, src: { kind: 'grid', name: gname, it },
      offX: Math.floor((e.clientX - r.left) / CELL), offY: Math.floor((e.clientY - r.top) / CELL) });
  };
  const startDrag = (e, d) => {
    hideTip(); closeMenu();
    d.sx = e.clientX; d.sy = e.clientY;
    drag = d;
    const it = SA.ITEMS[d.id];
    const g = h('div', 'ghost');
    const img = h('img'); img.src = SA.Render.iconSrc(d.id); img.style.width = it.w * CELL + 'px'; img.style.height = it.h * CELL + 'px';
    g.appendChild(img);
    document.body.appendChild(g);
    drag.el = g;
    layoutGhost(); moveDrag(e);
    SA.Audio.sfx('click');
  };
  const layoutGhost = () => {
    const d = SA.ITEMS[drag.id], w = drag.rot ? d.h : d.w, hh = drag.rot ? d.w : d.h;
    drag.el.style.width = w * CELL + 'px'; drag.el.style.height = hh * CELL + 'px';
    drag.el.firstChild.style.transform = `translate(-50%,-50%)${drag.rot ? ' rotate(90deg)' : ''}`;
    drag.offX = Math.min(drag.offX, w - 1); drag.offY = Math.min(drag.offY, hh - 1);
  };
  const targetAt = (cx, cy, d = drag) => {
    for (const k in views) {
      const v = views[k]; if (!document.body.contains(v.el)) continue;
      const r = v.el.getBoundingClientRect();
      if (cx >= r.left && cx < r.right && cy >= r.top && cy < r.bottom)
        return { name: k, v, x: Math.floor((cx - r.left) / CELL) - d.offX, y: Math.floor((cy - r.top) / CELL) - d.offY };
    }
    return null;
  };
  const moveDrag = (e) => {
    drag.cx = e.clientX; drag.cy = e.clientY;
    drag.el.style.left = (e.clientX - drag.offX * CELL - CELL / 2) + 'px';
    drag.el.style.top = (e.clientY - drag.offY * CELL - CELL / 2) + 'px';
    document.querySelectorAll('.grid .preview').forEach(p => p.style.display = 'none');
    const t = targetAt(e.clientX, e.clientY);
    const dz = document.elementFromPoint(e.clientX, e.clientY);
    const overDiscard = !t && dz && dz.closest && dz.closest('[data-discard]');
    drag.el.classList.toggle('discard', !!overDiscard);
    if (t) {
      const d = SA.ITEMS[drag.id], w = drag.rot ? d.h : d.w, hh = drag.rot ? d.w : d.h;
      const ok = SA.Grid.fits(t.v.grid, drag.id, t.x, t.y, drag.rot, drag.src.kind === 'grid' ? drag.src.it.uid : null);
      const p = t.v.el.querySelector('.preview');
      p.style.display = 'block'; p.style.left = t.x * CELL + 'px'; p.style.top = t.y * CELL + 'px';
      p.style.width = w * CELL + 'px'; p.style.height = hh * CELL + 'px';
      p.classList.toggle('bad', !ok);
    }
  };
  addEventListener('keydown', (e) => { if (drag && e.code === 'KeyR') { drag.rot = drag.rot ? 0 : 1; layoutGhost(); moveDrag({ clientX: drag.cx, clientY: drag.cy }); } });
  addEventListener('mouseup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    d.el.remove();
    document.querySelectorAll('.grid .preview').forEach(p => p.style.display = 'none');
    // 격납고 창고: 끌지 않고 클릭만 하면 고르기 (오른쪽 정보칸)
    if (d.src.kind === 'grid' && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5 && views[d.src.name].opts.onSelect) { views[d.src.name].opts.onSelect(d.src.it); return; }
    // 주변 아이템: 끌지 않고 좌클릭만 하면 화물칸 빈자리로
    if (d.src.kind === 'ground' && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) {
      if (SA.Grid.add(SA.R.cargo, d.id, d.src.item.ch !== undefined ? { ch: d.src.item.ch } : undefined)) { d.src.item.taken = true; SA.Audio.sfx('pickup', 1); } else { SA.Audio.sfx('deny'); SA.Raid.msg('화물칸에 자리가 없다', '#ffb3b3', 2); }
      refreshAll(); if (SA.R && SA.R.tabOpen) renderGround(); return;
    }
    const t = targetAt(e.clientX, e.clientY, d);
    const srcGrid = d.src.kind === 'grid' ? views[d.src.name].grid : null;
    // 수리킷을 장착 부품에 끌어다 놓으면 그 부품 내구도 +40 (최대 내구도는 그대로)
    const pz = !t && document.elementFromPoint(e.clientX, e.clientY);
    const pt = pz && pz.closest && pz.closest('[data-part]');
    if (pt && d.id === 'repairkit' && srcGrid && SA.R) {
      const P = SA.R.player, part = [P.main, ...P.subs.map(s => s.part), ...P.acts.map(a => a && a.part), ...P.pas].find(p => p && p.uid === pt.dataset.part);
      if (part && part.dur < part.max) {
        part.dur = Math.min(part.max, part.dur + SA.REPAIRKIT_DUR); SA.Grid.remove(srcGrid, d.src.it.uid);
        SA.Audio.sfx('repair'); SA.Raid.msg(`수리킷 — ${SA.PARTS[part.id].name} 내구도 +${SA.REPAIRKIT_DUR}`, '#9df07f', 2.5);
      } else SA.Audio.sfx('deny');
      refreshAll(); renderStatus(); return;
    }
    if (t) {
      const g = t.v.grid;
      if (d.src.kind === 'grid' && g === srcGrid) {
        if (SA.Grid.place(g, d.src.it, t.x, t.y, d.rot)) SA.Audio.sfx('click'); else SA.Audio.sfx('deny');
      } else if (SA.Grid.fits(g, d.id, t.x, t.y, d.rot)) {
        if (t.v.opts.accept && !t.v.opts.accept(d.id)) { SA.Audio.sfx('deny'); refreshAll(); return; }
        const it = d.src.kind === 'grid' ? SA.Grid.remove(srcGrid, d.src.it.uid) : Object.assign({ uid: SA.Grid.newUid(), id: d.id }, d.src.item.ch !== undefined ? { ch: d.src.item.ch } : {});
        if (d.src.kind === 'ground') d.src.item.taken = true;
        it.x = t.x; it.y = t.y; it.rot = d.rot; g.items.push(it);
        SA.Audio.sfx('pickup', 1);
      } else SA.Audio.sfx('deny');
    } else {
      const dz = document.elementFromPoint(e.clientX, e.clientY);
      const disc = dz && dz.closest && dz.closest('[data-discard]');
      if (disc && d.src.kind === 'grid' && views[d.src.name].opts.onDiscard) views[d.src.name].opts.onDiscard(d.src.it, srcGrid);
    }
    refreshAll();
    if (SA.R && SA.R.tabOpen) renderGround();
  });

  // ── Tab 창 (레이드 중) ──
  let statusTimer = null;
  const tabOpen = () => {
    const R = SA.R; if (!R || R.state !== 'play') return;
    R.tabOpen = true; R.timeScale = SA.CFG.TAB_TIMESCALE;
    const w = $('#tabwin'); w.style.display = 'block';
    const quickMove = (it, g) => {
      const other = g === R.cargo ? R.secure : R.cargo;
      const s = SA.Grid.findSpot(other, it.id);
      if (!s) { SA.Audio.sfx('deny'); return; }
      SA.Grid.remove(g, it.uid); Object.assign(it, s); other.items.push(it); SA.Audio.sfx('click');
    };
    const discard = (it, g) => { SA.Grid.remove(g, it.uid); SA.Raid.dropToSpace(it.id, it); };
    const menu = (it, g) => {
      const a = [];
      if (SA.ITEMS[it.id].kind === 'use' || it.id === 'stardata') a.push(['사용', () => SA.Raid.useItem(it, g)]);
      a.push([g === R.cargo ? '보안 칸으로' : '화물칸으로', () => quickMove(it, g)]);
      a.push(['버리기', () => discard(it, g)]);
      return a;
    };
    const opts = { onQuickMove: quickMove, onQuickDiscard: discard, onDiscard: discard, menu };
    gridView('cargo', $('#tw-cargo'), R.cargo, opts);
    gridView('secure', $('#tw-secure'), R.secure, opts);
    $('#tw-sort').onclick = () => { if (!SA.Grid.autoSort(R.cargo)) SA.Audio.sfx('deny'); else SA.Audio.sfx('click'); refreshAll(); };
    renderGround(); renderStatus();
    clearInterval(statusTimer); statusTimer = setInterval(() => { renderStatus(); renderGround(true); }, 250);
    SA.Audio.sfx('click');
  };
  const tabClose = () => {
    const R = SA.R;
    if (drag) { drag.el.remove(); drag = null; }
    hideTip(); closeMenu();
    $('#tabwin').style.display = 'none';
    const cw = $('#colwin'); if (cw) cw.remove();
    clearInterval(statusTimer);
    if (R) { R.tabOpen = false; if (R.state === 'play') R.timeScale = 1; }
  };
  // ── 수집가 거래 창 (레이드 중, F) ──
  const collectorOpen = () => {
    const R = SA.R; if (!R || R.state !== 'play' || !R.collector) return;
    R.tabOpen = true; R.timeScale = SA.CFG.TAB_TIMESCALE;
    let w = $('#colwin'); if (!w) { w = h('div', ''); w.id = 'colwin'; document.body.appendChild(w); }
    const CO = SA.COLLECTOR, stock = R.collector.stock;
    const draw = (note) => {
      w.innerHTML = '';
      const pn = h('div', 'panel shop');
      pn.appendChild(h('div', 'hd', `<img class="cpor" src="assets/collector.png"><div><b style="color:#ff9fd8">수집가</b><div class="small dim">"좋은 물건엔 좋은 값을. 둘 다 귀하지요."</div></div><span class="ccr">₵${SA.profile.credits.toLocaleString()}</span>`));
      if (note) pn.appendChild(h('div', 'small ' + (note[1] ? 'ok' : 'bad'), note[0]));
      pn.appendChild(h('h4', '', '판매 <span class="dim small">· 산 물건은 화물칸으로 — 들고 탈출해야 내 것</span>'));
      for (const st of stock) {
        const d = SA.ITEMS[st.id], nm = st.ex ? `<span style="color:${SA.itemCol(st.id, st.ex)}">${SA.partName({ id: d.part, lv: 1 })}</span> <span class="tier" style="color:${SA.itemCol(st.id, st.ex)};border-color:${SA.itemCol(st.id, st.ex)}66">행성</span>` : SA.itemNameHtml(st.id);
        const r = h('div', 'srow', `<img src="${SA.Render.iconSrc(st.id)}"><span class="nm">${nm}</span><span class="dim small">${st.n ? st.n + '개' : ''} · ${d.w}×${d.h}칸</span>`);
        r.addEventListener('mouseenter', (e) => st.ex ? showTipHtml(e, `<b>${SA.partHtml({ id: d.part, lv: 1 })}</b> <span class="dim">행성</span><br><span class="desc">${SA.partFullDesc({ id: d.part, lv: 1 })}</span>`) : showTip(e, st.id));
        r.addEventListener('mouseleave', hideTip);
        const b = h('button', 'btn small' + (st.n ? '' : ' dis'), st.n ? `₵${st.price}` : '품절');
        b.onclick = () => { const err = SA.Raid.collectorBuy(st); if (err) SA.Audio.sfx('deny'); draw(err ? [err, false] : [`${d.name} — 화물칸에 넣었다`, true]); };
        r.appendChild(b); pn.appendChild(r);
      }
      pn.appendChild(h('h4', '', `매입 <span class="dim small">· 블랙박스·에이스 각인·특수 재료를 시세의 ${CO.buyMul}배로</span>`));
      const mine = [[R.cargo, '화물'], [R.secure, '보안']].flatMap(([g, gn]) => g.items.filter(it => SA.collectorBuys(it.id)).map(it => ({ it, g, gn })));
      if (!mine.length) pn.appendChild(h('div', 'small dim', '팔 만한 물건이 없다.'));
      for (const { it, g, gn } of mine) {
        const d = SA.ITEMS[it.id], price = Math.ceil(SA.itemVal(it) * CO.buyMul);
        const r = h('div', 'srow', `<img src="${SA.Render.iconSrc(it.id)}"><span class="nm">${SA.itemNameHtml(it.id)}</span><span class="dim small">${gn} · 시세 ₵${SA.itemVal(it)}</span>`);
        r.addEventListener('mouseenter', (e) => showTip(e, it.id)); r.addEventListener('mouseleave', hideTip);
        const b = h('button', 'btn small', `팔기 ₵${price}`);
        b.onclick = () => { hideTip(); const got = SA.Raid.collectorSell(it, g); draw([`${d.name} 판매 +₵${got}`, true]); };
        r.appendChild(b); pn.appendChild(r);
      }
      const x = h('button', 'btn closeb', '닫기 (F · Esc)'); x.onclick = tabClose; pn.appendChild(x);
      w.appendChild(pn);
    };
    draw();
    SA.Audio.sfx('click');
  };
  let groundSig = '';
  const renderGround = (onlyIfChanged) => {
    const R = SA.R, box = $('#tw-ground');
    const list = SA.Raid.nearbyGround(90);
    const sig = list.map(i => i.id + (i.taken ? 1 : 0)).join(',');
    if (onlyIfChanged && sig === groundSig) return;
    groundSig = sig;
    box.innerHTML = list.length ? '' : '<div class="dim">근처에 떠 있는 아이템이 없다.<br>버린 아이템이나 칸이 부족해 못 주운 아이템이 여기 보인다.</div>';
    for (const gi of list) {
      const d = SA.ITEMS[gi.id], n = h('div', 'gitem');
      const img = h('img'); img.src = SA.Render.iconSrc(gi.id); img.style.width = d.w * 24 + 'px'; img.style.height = d.h * 24 + 'px';
      n.appendChild(img); n.appendChild(h('span', '', `${d.name}<br><span class="dim">${d.w}×${d.h} · ₵${d.val}</span>`));
      n.addEventListener('mousedown', (e) => { if (e.button !== 0) return; e.preventDefault(); startDrag(e, { id: gi.id, rot: 0, src: { kind: 'ground', item: gi }, offX: 0, offY: 0 }); });
      n.addEventListener('mouseenter', (e) => showTip(e, gi.id, '<div class="keys">좌클릭: 빈자리에 자동으로 · 끌어서 원하는 칸에 놓기</div>'));
      n.addEventListener('mouseleave', hideTip);
      box.appendChild(n);
    }
  };
  const durBar = (p) => {
    if (!p) return '';
    const d = SA.PARTS[p.id], r = p.dur / p.max, e = SA.Combat.eff(p);
    const col = r >= 0.5 ? '#5dffb0' : r > 0 ? '#ffd166' : '#ff4d6d';
    return `<div class="part" data-part="${p.uid}"><span>${d.name}</span><span class="bar"><i style="width:${r * 100}%;background:${col}"></i></span><span class="dim">${Math.round(p.dur)}/${Math.round(p.max)}${e < 1 ? ` · 성능 ${Math.round(e * 100)}%` : ''}</span></div>`;
  };
  const renderStatus = () => {
    const R = SA.R; if (!R) return;
    const P = R.player, st = SA.CORROSION[R.stage], gb = SA.Raid.grazeBonus(), gd = SA.Raid.grazeDmg();
    const val = SA.Grid.value(R.cargo) + SA.Grid.value(R.secure);
    const pl = SA.PILOTS[P.pilot];
    $('#tw-status').innerHTML = `
      <div class="row"><span>체력</span><b>${Math.ceil(P.hp)} / ${P.maxHp}${P.barrierMax ? ` <span class="dim">+ 베리어 ${Math.round(P.barrier)}</span>` : ''}</b></div>
      <div class="row"><span>침식</span><b style="color:#cbb8ff">${Math.floor(R.corr)}% · ${st.name}</b></div>
      <div class="dim small">${R.stage ? `연사 ${Math.round(st.fire * 100)}% · 이속 ${Math.round(st.speed * 100)}%` : '아직 영향 없음'}</div>
      <div class="row"><span>스침 보너스</span><b style="color:#fff3a8">${R.graze}스택 · 드랍 +${Math.round(gb * 100)}% · 피해 +${Math.round(gd * 100)}%</b></div>
      <div class="row"><span>운반 가치</span><b>₵${val}</b></div>
      <div class="row"><span>격추 · 시간</span><b>${R.kills}기 · ${Math.floor(R.t / 60)}:${String(Math.floor(R.t % 60)).padStart(2, '0')}</b></div>
      <h4>파일럿 — ${pl.name} (${pl.title})</h4><div class="dim small">${pl.desc}</div>
      <h4>장착 부품</h4>
      ${durBar(P.main)}${P.subs.map(s => durBar(s.part)).join('')}${P.acts.map(a => a && durBar(a.part)).join('')}${P.pas.map(durBar).join('')}
      <div class="dim small">내구도 50% 아래부터 성능이 서서히 떨어진다. 수리킷을 부품에 끌어다 놓으면 내구도 +${SA.REPAIRKIT_DUR}.</div>`;
  };

  return { gridView, refreshAll, tabOpen, tabClose, collectorOpen, showTip, showTipHtml, hideTip, h, CELL, views };
})();
