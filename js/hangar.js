// 격납고: 출격 준비, 창고, 작업대, 상점, 의뢰, 기록
SA.Hangar = (() => {
  const h = (...a) => SA.UI.h(...a), $ = (s) => document.querySelector(s);
  let tab = 'sortie';
  const P = () => SA.profile;
  const part = (uid) => P().parts.find(p => p.uid === uid);
  const save = () => SA.Save.store(P());

  const toast = (s, col = '#e6edf3') => {
    const t = h('div', 'toast', s); t.style.color = col;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
  };

  const open = () => {
    $('#hangar').style.display = 'flex';
    SA.Audio.play('hangar');
    autoRegister();
    render();
  };
  const close = () => { $('#hangar').style.display = 'none'; SA.UI.hideTip(); };

  // 가져온 설계도는 자동 등록 (스트레스 줄이기). 이미 아는 건 판매용으로 남긴다.
  const autoRegister = () => {
    const st = P().stash;
    for (const it of st.items.slice()) {
      const d = SA.ITEMS[it.id];
      if (d.kind === 'bp' && !P().recipes.includes(d.recipe)) {
        P().recipes.push(d.recipe); P().bpMiss = 0; SA.Grid.remove(st, it.uid);
        toast(`설계도 등록: ${SA.PARTS[d.recipe].name} — 작업대에서 제작 가능`, '#ffd166');
      }
    }
    save();
  };

  const render = () => {
    $('#hg-credits').textContent = '₵' + P().credits;
    document.querySelectorAll('#hg-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('#hg-body'); body.innerHTML = '';
    ({ sortie, stash, bench, shop, contracts, records })[tab](body);
    $('#hg-line').textContent = SA.U.pick([...SA.STORY.broker, ...SA.STORY.mechanic]);
    $('#hg-quest').innerHTML = `<b>목표</b>${SA.Quest.label()}`;
  };
  const go = (t) => { tab = t; SA.Audio.sfx('click'); render(); };

  // ── 출격 준비 ──
  const sortie = (body) => {
    const prof = P();
    const col1 = h('div', 'col'), col2 = h('div', 'col wide'), col3 = h('div', 'col');
    col1.appendChild(h('h3', '', '파일럿'));
    for (const id in prof.pilots) {
      const pl = SA.PILOTS[id], inj = prof.pilots[id].injury;
      const c = h('div', 'card' + (prof.pilot === id ? ' on' : '') + (inj ? ' off' : ''),
        `<b>${pl.name}</b> <span class="dim">${pl.title}</span>${inj ? ` <span class="bad">부상 · ${inj}회 휴식</span>` : ''}<div class="small">${pl.desc}</div><div class="dim small">쿨타임 ${pl.cd}초 · Space</div>`);
      c.onclick = () => { if (inj) { SA.Audio.sfx('deny'); toast(`${pl.name}은(는) 부상 중이다. ${inj}회 출격 동안 쉬어야 한다.`, '#ffb3b3'); return; } prof.pilot = id; save(); go('sortie'); };
      col1.appendChild(c);
    }
    const unhired = Object.keys(SA.PILOTS).filter(id => !prof.pilots[id] && !SA.PILOTS[id].hidden);
    if (unhired.length) col1.appendChild(h('div', 'dim small', `고용 가능한 파일럿 ${unhired.length}명 — 상점`));

    col2.appendChild(h('h3', '', '기체'));
    const ships = h('div', 'ships');
    for (const id of prof.ships) {
      const s = SA.SHIPS[id];
      const c = h('div', 'card ship' + (prof.ship === id ? ' on' : ''));
      c.appendChild(shipImg(id));
      c.appendChild(h('div', '', `<b>${s.name}</b> <span class="dim">${s.role}</span><div class="small dim">HP ${s.hp} · 속도 ${s.speed} · 화물 ${s.cargo[0]}×${s.cargo[1]}</div>`));
      c.onclick = () => { prof.ship = id; save(); go('sortie'); };
      ships.appendChild(c);
    }
    col2.appendChild(ships);
    const sh = SA.SHIPS[prof.ship], lo = prof.loadouts[prof.ship];
    col2.appendChild(h('div', 'small', sh.desc));
    col2.appendChild(h('h3', '', `장착 — ${sh.name}`));
    const slotRow = (label, kind, idx, uid) => {
      const p = uid && part(uid), d = p && SA.PARTS[p.id];
      const r = h('div', 'slot' + (p ? '' : ' empty'));
      r.innerHTML = `<span class="k">${label}</span><span>${d ? `${d.name} <span class="dim">${d.tier}</span>` : '<span class="dim">비어 있음 — 클릭</span>'}</span>` +
        (p ? `<span class="bar"><i style="width:${p.dur / p.max * 100}%;background:${p.dur / p.max >= 0.5 ? '#5dffb0' : p.dur > 0 ? '#ffd166' : '#ff4d6d'}"></i></span>` : '');
      r.onclick = (e) => pickPart(e, kind, idx);
      if (p) { r.onmouseenter = (e) => partTip(e, p); r.onmouseleave = SA.UI.hideTip; }
      return r;
    };
    col2.appendChild(slotRow('좌클릭 주무기', 'main', 0, lo.main));
    for (let i = 0; i < sh.sub; i++) col2.appendChild(slotRow(`서브웨폰 ${i + 1} (자동)`, 'sub', i, lo.sub[i]));
    col2.appendChild(slotRow('Q 액티브', 'act', 0, lo.act[0]));
    col2.appendChild(slotRow('E 액티브', 'act', 1, lo.act[1]));
    const nPas = sh.pas + (sh.barrierSlot ? 1 : 0);
    for (let i = 0; i < nPas; i++) col2.appendChild(slotRow(i === sh.pas ? '베리어 전용' : `패시브 ${i + 1}`, 'pas', i, lo.pas[i]));
    const auto = h('button', 'btn small', '빈 칸 자동 장착'); auto.onclick = () => { autoEquip(prof.ship); go('sortie'); };
    col2.appendChild(auto);

    col3.appendChild(h('h3', '', '작전 구역'));
    for (const id in SA.MAPS) {
      const m = SA.MAPS[id];
      col3.appendChild(h('div', 'card' + (m.locked ? ' off' : ' on'), `<b>${m.name}</b> <span class="dim">${m.act}막</span><div class="small dim">${m.locked ? `${m.act}막에서 열린다` : m.desc}</div>`));
    }
    // 가져갈 소모품 (직접 고른다. 격추되면 잃는다)
    col3.appendChild(h('h3', '', '가져갈 소모품'));
    prof.bring = prof.bring || {};
    const cg = SA.SHIPS[prof.ship].cargo, cap = cg[0] * cg[1];
    const usedCells = () => Object.keys(prof.bring).reduce((n, k) => n + prof.bring[k] * SA.ITEMS[k].w * SA.ITEMS[k].h, 0);
    let anyUse = false;
    for (const [id] of SA.SHOP.consumables) {
      const d = SA.ITEMS[id], have = SA.Grid.count(prof.stash, id);
      if (!have) continue;
      anyUse = true;
      const n = Math.min(prof.bring[id] || 0, have); prof.bring[id] = n;
      const r = h('div', 'sellrow', `<img src="${SA.Render.iconSrc(id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name} <b>${n}</b> / ${have}<br><span class="dim small">${d.desc}</span></span>`);
      const minus = h('button', 'btn tiny', '−'), plus = h('button', 'btn tiny', '+');
      minus.onclick = () => { if (prof.bring[id] > 0) { prof.bring[id]--; save(); go('sortie'); } };
      plus.onclick = () => {
        if (prof.bring[id] >= have) return SA.Audio.sfx('deny');
        if (usedCells() + d.w * d.h > cap) { toast('화물칸에 더 실을 자리가 없다.', '#ffb3b3'); return SA.Audio.sfx('deny'); }
        prof.bring[id]++; save(); go('sortie');
      };
      r.append(minus, plus); col3.appendChild(r);
    }
    if (!anyUse) col3.appendChild(h('div', 'dim small', '창고에 소모품이 없다. 상점에서 살 수 있다.'));
    else col3.appendChild(h('div', 'dim small', `화물칸 ${usedCells()}/${cap}칸 차지 · 격추되면 잃는다`));

    const warn = !lo.main ? '<div class="bad small">주무기가 없다.</div>' : '';
    const dmg = [lo.main, ...lo.sub, ...lo.act, ...lo.pas].map(part).filter(p => p && p.dur / p.max < 0.5).length;
    col3.appendChild(h('div', '', warn + (dmg ? `<div class="warn small">내구도 50% 미만 부품 ${dmg}개 — 작업대에서 수리</div>` : '')));
    const b = h('button', 'btn big', '출격'); b.onclick = sortieGo;
    col3.appendChild(b);
    col3.appendChild(h('div', 'dim small', '격추되면: 화물 손실 (보안 칸 2×2 제외) · 장착 부품 내구도 -40% · 파일럿 부상 2회'));
    body.append(col1, col2, col3);
  };
  const shipImg = (id) => {
    const s = SA.SHIPS[id], c = document.createElement('canvas');
    c.width = 72; c.height = 72; c.className = 'shipimg';
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const k = id === 'hex' ? 2 : Math.min(66 / s.size[0], 66 / s.size[1]);
    const w = s.size[0] * k, hh = s.size[1] * k;
    if (id === 'hex' && SA.Render.IMG.hex) x.drawImage(SA.Render.IMG.hex, (72 - w) / 2, (72 - hh) / 2, w, hh);
    else if (SA.Render.pre[id]) { x.imageSmoothingEnabled = true; x.drawImage(SA.Render.pre[id], (72 - w) / 2, (72 - hh) / 2, w, hh); }
    else { x.fillStyle = '#3b4050'; x.beginPath(); x.moveTo(36, 12); x.lineTo(60, 46); x.lineTo(36, 56); x.lineTo(12, 46); x.closePath(); x.fill(); x.fillStyle = '#ffb347'; x.fillRect(34, 24, 4, 4); }
    return c;
  };
  const partTip = (e, p) => {
    const d = SA.PARTS[p.id];
    SA.UI.showTipHtml(e, `<b>${d.name}</b> <span class="dim">${d.tier}</span><br><span class="desc">${d.desc}</span><br>내구도 ${Math.round(p.dur)} / ${Math.round(p.max)} · 성능 ${Math.round(SA.Combat.eff(p) * 100)}%`);
  };
  const pickPart = (e, kind, idx) => {
    const prof = P(), lo = prof.loadouts[prof.ship], sh = SA.SHIPS[prof.ship];
    const isBarrierSlot = kind === 'pas' && sh.barrierSlot && idx === sh.pas;
    const used = new Set([lo.main, ...lo.sub, ...lo.act, ...lo.pas].filter(Boolean));
    const opts = prof.parts.filter(p => {
      const d = SA.PARTS[p.id];
      if (d.slot !== kind || used.has(p.uid)) return false;
      if (d.onlyShip && d.onlyShip !== prof.ship) return false;
      if (isBarrierSlot) return p.id === 'barrier';
      if (kind === 'pas' && p.id === 'barrier') return false;
      return true;
    });
    const m = h('div', 'ctx wide');
    const set = (uid) => {
      if (kind === 'main') lo.main = uid; else lo[kind][idx] = uid;
      save(); document.querySelectorAll('.ctx').forEach(x => x.remove()); go('sortie');
    };
    if (!opts.length) m.appendChild(h('div', 'dim small pad', '장착할 수 있는 부품이 없다. 작업대에서 제작하자.'));
    for (const p of opts) {
      const d = SA.PARTS[p.id], b = h('button', '', `${d.name} <span class="dim">${d.tier} · ${Math.round(p.dur)}/${Math.round(p.max)}</span><div class="small dim">${d.desc}</div>`);
      b.onclick = () => set(p.uid); m.appendChild(b);
    }
    const cur = kind === 'main' ? lo.main : lo[kind][idx];
    if (cur) { const b = h('button', '', '<span class="bad">비우기</span>'); b.onclick = () => set(null); m.appendChild(b); }
    m.style.left = Math.min(innerWidth - 320, e.clientX) + 'px'; m.style.top = Math.min(innerHeight - 300, e.clientY) + 'px';
    document.querySelectorAll('.ctx').forEach(x => x.remove());
    document.body.appendChild(m);
    setTimeout(() => addEventListener('mousedown', function off(ev) { if (!m.contains(ev.target)) { m.remove(); removeEventListener('mousedown', off); } }), 0);
  };
  const autoEquip = (shipId) => {
    const prof = P(), lo = prof.loadouts[shipId], sh = SA.SHIPS[shipId];
    const used = () => new Set([lo.main, ...lo.sub, ...lo.act, ...lo.pas].filter(Boolean));
    const best = (kind, filt = () => true) => prof.parts.filter(p => SA.PARTS[p.id].slot === kind && !used().has(p.uid) && filt(p) && (!SA.PARTS[p.id].onlyShip || SA.PARTS[p.id].onlyShip === shipId))
      .sort((a, b) => SA.PARTS[b.id].val - SA.PARTS[a.id].val || b.dur - a.dur)[0];
    if (!lo.main) { const p = best('main'); if (p) lo.main = p.uid; }
    for (let i = 0; i < sh.sub; i++) if (!lo.sub[i]) { const p = best('sub'); if (p) lo.sub[i] = p.uid; }
    for (let i = 0; i < 2; i++) if (!lo.act[i]) { const p = best('act'); if (p) lo.act[i] = p.uid; }
    for (let i = 0; i < sh.pas; i++) if (!lo.pas[i]) { const p = best('pas', q => q.id !== 'barrier'); if (p) lo.pas[i] = p.uid; }
    if (sh.barrierSlot && !lo.pas[sh.pas]) { const p = best('pas', q => q.id === 'barrier'); if (p) lo.pas[sh.pas] = p.uid; }
    save();
  };
  const sortieGo = () => {
    const prof = P(), lo = prof.loadouts[prof.ship];
    if (prof.pilots[prof.pilot].injury) { toast('선택한 파일럿이 부상 중이다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    if (!lo.main) { toast('주무기를 장착해야 출격할 수 있다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    close(); SA.Main.startRaid();
  };

  // ── 창고 ──
  const stash = (body) => {
    const prof = P(), left = h('div', 'col'), right = h('div', 'col');
    left.appendChild(h('h3', '', `창고 <span class="dim small">${SA.Grid.used(prof.stash)}/${prof.stash.w * prof.stash.h}칸 · 총 ₵${SA.Grid.value(prof.stash)}</span>`));
    const g = h('div'); left.appendChild(g);
    SA.UI.gridView('stash', g, prof.stash, {
      menu: (it, grid) => {
        const d = SA.ITEMS[it.id], a = [[`판매 ₵${d.val}`, () => { SA.Grid.remove(grid, it.uid); prof.credits += d.val; SA.Audio.sfx('buy'); save(); render(); }]];
        if (it.id === 'blackbox') a.unshift(['해독 (기록 열람)', () => decode(it)]);
        if (d.kind === 'bp' && prof.recipes.includes(d.recipe)) a.push(['(이미 아는 설계도 — 판매)', () => {}]);
        return a;
      },
      onQuickDiscard: null,
    });
    const sortB = h('button', 'btn small', '정렬'); sortB.onclick = () => { SA.Grid.autoSort(prof.stash); save(); render(); };
    left.appendChild(sortB);
    right.appendChild(h('h3', '', '빠른 판매'));
    const groups = {};
    for (const it of prof.stash.items) groups[it.id] = (groups[it.id] || 0) + 1;
    const ids = Object.keys(groups).sort((a, b) => SA.ITEMS[b].val - SA.ITEMS[a].val);
    if (!ids.length) right.appendChild(h('div', 'dim', '창고가 비어 있다. 출격해서 채워 오자.'));
    for (const id of ids) {
      const d = SA.ITEMS[id], need = neededFor(id);
      const r = h('div', 'sellrow');
      r.innerHTML = `<img src="${SA.Render.iconSrc(id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name} ×${groups[id]}<br><span class="dim small">${d.kind === 'use' ? '출격 준비에서 골라 가져간다' : need ? `제작·의뢰에 ${need}개 필요` : '쓸 곳 없음'}</span></span>`;
      const b1 = h('button', 'btn small', `1개 ₵${d.val}`), b2 = h('button', 'btn small', `전부 ₵${d.val * groups[id]}`);
      b1.onclick = () => sell(id, 1); b2.onclick = () => sell(id, groups[id]);
      r.append(b1, b2); right.appendChild(r);
    }
    right.appendChild(h('div', 'dim small', '우클릭: 판매 · 블랙박스는 해독하면 기록이 열리지만 팔 수 없게 된다.'));
    body.append(left, right);
  };
  const neededFor = (id) => {
    let n = 0;
    for (const r of P().recipes) { const m = (SA.RECIPES[r] || {}).mats || {}; n = Math.max(n, m[id] || 0); }
    for (const c of SA.STORY.contracts) if (c.mats && !(P().contracts[c.id] || {}).done) n = Math.max(n, c.mats[id] || 0);
    return n;
  };
  const sell = (id, n) => {
    const prof = P();
    for (let i = 0; i < n; i++) { const it = prof.stash.items.find(x => x.id === id); if (!it) break; SA.Grid.remove(prof.stash, it.uid); prof.credits += SA.ITEMS[id].val; }
    SA.Audio.sfx('buy'); save(); render();
  };
  const decode = (it) => {
    const prof = P();
    SA.Grid.remove(prof.stash, it.uid);
    const next = SA.STORY.blackbox.findIndex((_, i) => !prof.logs.includes(i));
    if (next < 0) { prof.credits += 150; toast('이미 다 아는 내용이다. 부품값 ₵150을 받았다.'); }
    else { prof.logs.push(next); toast(`기록 해독: ${SA.STORY.blackbox[next].title} — 기록 탭`, '#ff8f3d'); }
    save(); render();
  };

  // ── 작업대 ──
  const bench = (body) => {
    const prof = P(), left = h('div', 'col wide'), right = h('div', 'col wide');
    left.appendChild(h('h3', '', '제작'));
    for (const rid of prof.recipes) {
      const r = SA.RECIPES[rid], d = SA.PARTS[rid]; if (!r || !d) continue;
      const have = (k) => SA.Grid.count(prof.stash, k);
      const fromOk = !r.from || prof.parts.some(p => p.id === r.from);
      const ok = fromOk && Object.keys(r.mats).every(k => have(k) >= r.mats[k]);
      const mats = Object.keys(r.mats).map(k => `<span class="${have(k) >= r.mats[k] ? 'ok' : 'bad'}">${SA.ITEMS[k].name} ${have(k)}/${r.mats[k]}</span>`).join(' · ');
      const row = h('div', 'recipe', `<b>${d.name}</b> <span class="dim">${d.tier} · ${{ main: '주무기', sub: '서브웨폰', act: '액티브', pas: '패시브' }[d.slot]}</span><div class="small">${d.desc}</div><div class="small">${r.from ? `<span class="${fromOk ? 'ok' : 'bad'}">${SA.PARTS[r.from].name} 1개</span> + ` : ''}${mats}</div>`);
      const b = h('button', 'btn small' + (ok ? '' : ' dis'), '제작');
      b.onclick = () => craft(rid);
      row.appendChild(b); left.appendChild(row);
    }
    right.appendChild(h('h3', '', '보유 부품'));
    const needRep = prof.parts.filter(p => p.dur < p.max);
    const cost = needRep.reduce((n, p) => n + repairCost(p), 0);
    const all = h('button', 'btn' + (needRep.length ? '' : ' dis'), needRep.length ? `전부 수리 ₵${cost}` : '수리할 부품 없음');
    all.onclick = () => { if (!needRep.length) return; if (prof.credits < cost) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= cost; needRep.forEach(repair); SA.Audio.sfx('repair'); save(); render(); };
    right.appendChild(all);
    right.appendChild(h('div', 'dim small', '수리하면 내구도가 가득 차지만 최대 내구도가 3씩 줄어든다. 너무 닳으면 분해하고 새로 만들자.'));
    const equipped = new Set(); for (const s in prof.loadouts) { const l = prof.loadouts[s]; [l.main, ...l.sub, ...l.act, ...l.pas].forEach(u => u && equipped.add(u)); }
    for (const p of prof.parts.slice().sort((a, b) => SA.PARTS[a.id].slot.localeCompare(SA.PARTS[b.id].slot))) {
      const d = SA.PARTS[p.id], r = p.dur / p.max;
      const row = h('div', 'slot', `<span>${d.name} <span class="dim">${d.tier}${equipped.has(p.uid) ? ' · 장착 중' : ''}</span></span><span class="bar"><i style="width:${r * 100}%;background:${r >= 0.5 ? '#5dffb0' : r > 0 ? '#ffd166' : '#ff4d6d'}"></i></span><span class="dim small">${Math.round(p.dur)}/${Math.round(p.max)}</span>`);
      if (p.dur < p.max) { const b = h('button', 'btn tiny', `수리 ₵${repairCost(p)}`); b.onclick = (e) => { e.stopPropagation(); if (prof.credits < repairCost(p)) { SA.Audio.sfx('deny'); return; } prof.credits -= repairCost(p); repair(p); SA.Audio.sfx('repair'); save(); render(); }; row.appendChild(b); }
      if (!equipped.has(p.uid)) { const b = h('button', 'btn tiny', `분해 ₵${Math.round(d.val * 0.4)}`); b.onclick = (e) => { e.stopPropagation(); prof.parts = prof.parts.filter(x => x !== p); prof.credits += Math.round(d.val * 0.4); SA.Audio.sfx('buy'); save(); render(); }; row.appendChild(b); }
      right.appendChild(row);
    }
    body.append(left, right);
  };
  const repairCost = (p) => Math.ceil((p.max - p.dur) * SA.PARTS[p.id].val / 250);
  const repair = (p) => { p.max = Math.max(40, p.max - 3); p.dur = p.max; };
  const craft = (rid) => {
    const prof = P(), r = SA.RECIPES[rid];
    if (r.from) {
      const src = prof.parts.filter(p => p.id === r.from).sort((a, b) => b.dur - a.dur)[0];
      if (!src) { SA.Audio.sfx('deny'); return; }
      if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
      SA.Grid.takeMats(prof.stash, r.mats);
      prof.parts = prof.parts.filter(p => p !== src);
      const np = SA.Save.newPart(rid); prof.parts.push(np);
      for (const s in prof.loadouts) { const l = prof.loadouts[s]; if (l.main === src.uid) l.main = np.uid; }   // 장착 중이면 그대로 교체
    } else {
      if (!SA.Grid.takeMats(prof.stash, r.mats)) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
      prof.parts.push(SA.Save.newPart(rid));
    }
    toast(`제작 완료: ${SA.PARTS[rid].name}`, '#5dffb0'); SA.Audio.sfx('buy'); SA.Quest.event('craft'); save(); render();
  };

  // ── 상점 ──
  const shop = (body) => {
    const prof = P(), c1 = h('div', 'col wide'), c2 = h('div', 'col');
    c1.appendChild(h('h3', '', '기체'));
    for (const id in SA.SHIPS) {
      const s = SA.SHIPS[id], own = prof.ships.includes(id);
      const c = h('div', 'card ship');
      c.appendChild(shipImg(id));
      c.appendChild(h('div', '', `<b>${s.name}</b> <span class="dim">${s.role}</span><div class="small">${s.desc}</div><div class="small dim">HP ${s.hp} · 속도 ${s.speed} · 서브 ${s.sub} · 패시브 ${s.pas}${s.barrierSlot ? '+베리어' : ''} · 화물 ${s.cargo[0]}×${s.cargo[1]}</div>`));
      const b = h('button', 'btn small' + (own ? ' dis' : ''), own ? '보유' : `구매 ₵${s.price}`);
      b.onclick = () => {
        if (own) return;
        if (prof.credits < s.price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
        prof.credits -= s.price; prof.ships.push(id);
        const cur = prof.loadouts[prof.ship];   // 지금 기체의 장착을 최대한 그대로 옮긴다
        prof.loadouts[id] = { main: cur.main, sub: cur.sub.slice(0, s.sub), act: cur.act.slice(), pas: cur.pas.filter(u => { const q = part(u); return q && q.id !== 'barrier'; }).slice(0, s.pas) };
        autoEquip(id); prof.ship = id; toast(`${s.name} 구매 — 가진 부품으로 자동 장착했다`, '#5dffb0'); SA.Audio.sfx('buy'); save(); render();
      };
      c.appendChild(b); c1.appendChild(c);
    }
    c2.appendChild(h('h3', '', '파일럿 고용'));
    for (const id in SA.PILOTS) {
      if (prof.pilots[id] || SA.PILOTS[id].hidden) continue;
      const pl = SA.PILOTS[id], c = h('div', 'card', `<b>${pl.name}</b> <span class="dim">${pl.title}</span><div class="small">${pl.desc}</div>`);
      const b = h('button', 'btn small', `고용 ₵${pl.cost}`);
      b.onclick = () => { if (prof.credits < pl.cost) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= pl.cost; prof.pilots[id] = { injury: 0 }; SA.Audio.sfx('buy'); save(); render(); };
      c.appendChild(b); c2.appendChild(c);
    }
    c2.appendChild(h('h3', '', '소모품'));
    for (const [id, price] of SA.SHOP.consumables) {
      const d = SA.ITEMS[id], c = h('div', 'sellrow', `<img src="${SA.Render.iconSrc(id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name}<br><span class="dim small">${d.desc}</span></span>`);
      const b = h('button', 'btn small', `₵${price}`);
      b.onclick = () => {
        if (prof.credits < price) { SA.Audio.sfx('deny'); return; }
        if (!SA.Grid.add(prof.stash, id)) { toast('창고가 가득 찼다.', '#ffb3b3'); return; }
        prof.credits -= price; SA.Audio.sfx('buy'); toast(`${d.name} 구매 — 창고로. 출격 준비에서 가져갈 개수를 고른다.`); save(); render();
      };
      c.appendChild(b); c2.appendChild(c);
    }
    body.append(c1, c2);
  };

  // ── 의뢰 ──
  const contracts = (body) => {
    const prof = P(), col = h('div', 'col wide');
    col.appendChild(h('h3', '', '의뢰 게시판'));
    for (const c of SA.STORY.contracts) {
      const st = prof.contracts[c.id] || { progress: 0, done: false };
      let prog = '', can = false;
      if (c.type === 'deliver') {
        prog = Object.keys(c.mats).map(k => { const n = SA.Grid.count(prof.stash, k); return `<span class="${n >= c.mats[k] ? 'ok' : 'bad'}">${SA.ITEMS[k].name} ${Math.min(n, c.mats[k])}/${c.mats[k]}</span>`; }).join(' · ');
        can = Object.keys(c.mats).every(k => SA.Grid.count(prof.stash, k) >= c.mats[k]);
      } else { prog = `${Math.min(st.progress, c.need)}/${c.need}`; can = st.progress >= c.need; }
      const rw = `₵${c.reward.credits}${c.reward.item ? ' + ' + SA.ITEMS[c.reward.item].name : ''}`;
      const card = h('div', 'card' + (st.done ? ' off' : ''), `<b>${c.title}</b> <span class="dim">${c.giver}</span><div class="small">"${c.brief}"</div><div class="small">진행: ${prog} · 보상: ${rw}</div>`);
      if (!st.done) {
        const b = h('button', 'btn small' + (can ? '' : ' dis'), c.type === 'deliver' ? '납품' : '보상 받기');
        b.onclick = () => {
          if (!can) { SA.Audio.sfx('deny'); return; }
          if (c.type === 'deliver') SA.Grid.takeMats(prof.stash, c.mats);
          prof.contracts[c.id] = Object.assign(st, { done: true });
          prof.credits += c.reward.credits;
          if (c.reward.item) SA.Grid.add(prof.stash, c.reward.item);
          autoRegister();
          toast(`의뢰 완료: ${c.title} — ${rw}`, '#5dffb0'); SA.Audio.sfx('extract'); SA.Quest.event('contract'); save(); render();
        };
        card.appendChild(b);
      } else card.appendChild(h('div', 'ok small', '완료'));
      col.appendChild(card);
    }
    body.appendChild(col);
  };

  // ── 기록 ──
  const records = (body) => {
    const prof = P(), c1 = h('div', 'col wide'), c2 = h('div', 'col');
    c1.appendChild(h('h3', '', `블랙박스 기록 ${prof.logs.length}/${SA.STORY.blackbox.length}`));
    if (!prof.logs.length) c1.appendChild(h('div', 'dim', '아직 해독한 기록이 없다. 블랙박스는 추락한 정찰선과 네임드에게서 나온다.'));
    for (const i of prof.logs) { const b = SA.STORY.blackbox[i]; c1.appendChild(h('div', 'card log', `<b>${b.title}</b>${b.lines.map(l => `<div class="small">${l}</div>`).join('')}`)); }
    const s = prof.stats;
    c2.appendChild(h('h3', '', '전적'));
    c2.appendChild(h('div', 'card', `출격 ${s.raids} · 탈출 ${s.extracts} · 격추당함 ${s.deaths}<br>격추 ${s.kills}기<br>최고 운반 가치 ₵${s.bestValue}`));
    c2.appendChild(h('h3', '', '팁'));
    SA.STORY.tips.forEach(t => c2.appendChild(h('div', 'small dim', '· ' + t)));
    body.append(c1, c2);
  };

  return { open, close, go, toast, render };
})();
