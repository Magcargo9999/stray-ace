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
    SA.Quest.sync();
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
    { const rs = P().rescued || {}; $('#hg-line').textContent = SA.U.pick([...SA.STORY.broker, ...(rs.teo ? SA.STORY.mechanic : SA.STORY.mechanic0), ...(rs.deliv ? SA.STORY.deliv : [])]); }
    $('#hg-quest').innerHTML = `<b>목표</b>${SA.Quest.label()}${SA.Quest.rewardText()}`;
  };
  const go = (t) => { tab = t; SA.Audio.sfx('click'); render(); };

  // ── 출격 준비 ──
  const sortie = (body) => {
    const prof = P();
    const col1 = h('div', 'col'), col2 = h('div', 'col wide'), col3 = h('div', 'col');
    col1.appendChild(h('h3', '', '파일럿'));
    // 전원 부상이면 단장이 직접 나간다. 한 명이라도 회복하면 원래대로.
    const healthy = Object.keys(prof.pilots).filter(id => !prof.pilots[id].injury);
    if (!healthy.length) prof.pilot = 'cmdr';
    else if (prof.pilot === 'cmdr' || prof.pilots[prof.pilot].injury) prof.pilot = healthy[0];
    const portrait = (pl, id, inj) => `<div class="portrait" style="--pc:${pl.color}"><img src="assets/pilot_${id}.png" onerror="this.remove()"><span>${pl.name[0]}</span>${inj ? '<i class="x"></i>' : ''}</div>`;
    const cardOf = (id, pl, inj) => {
      const c = h('div', 'card pilot' + (prof.pilot === id ? ' on' : '') + (inj ? ' off' : ''),
        `${portrait(pl, id, inj)}<div class="pinfo"><b>${pl.name}</b> <span class="dim">${pl.title}</span>${inj ? ` <span class="bad">부상 · ${inj}회 휴식</span>` : ''}<div class="quote">“${pl.quote}”</div></div>`);
      c.title = pl.skill ? `${pl.desc} (쿨타임 ${pl.cd}초 · Space)` : pl.desc;
      return c;
    };
    if (!healthy.length) {
      col1.appendChild(h('div', 'warn small', '파일럿이 모두 부상이다. 단장이 직접 출격한다.'));
      col1.appendChild(cardOf('cmdr', SA.PILOTS.cmdr, 0));
    }
    for (const id in prof.pilots) {
      const pl = SA.PILOTS[id], inj = prof.pilots[id].injury, c = cardOf(id, pl, inj);
      c.onclick = () => { if (inj) { SA.Audio.sfx('deny'); toast(`${pl.name}은(는) 부상 중이다. ${inj}회 출격 동안 쉬어야 한다.`, '#ffb3b3'); return; } prof.pilot = id; save(); go('sortie'); };
      col1.appendChild(c);
    }
    const cur = SA.PILOTS[prof.pilot];
    col1.appendChild(h('div', 'small pskill', `<b>${cur.name}</b> — ${cur.desc}${cur.skill ? `<div class="dim">쿨타임 ${cur.cd}초 · Space</div>` : ''}`));
    const unhired = Object.keys(SA.PILOTS).filter(id => !prof.pilots[id] && !SA.PILOTS[id].hidden);
    if (unhired.length) col1.appendChild(h('div', 'dim small', `조난 신호를 구조하면 합류할 파일럿 ${unhired.length}명`));

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
    col2.appendChild(slotRow('주무기 1', 'main', 0, lo.main));
    col2.appendChild(slotRow('주무기 2 (휠)', 'main', 1, lo.main2));
    // 동력원: 창고에 있는 등급 중 하나를 꽂고 나간다 (예비는 아래 '가져갈 소모품'에서)
    {
      const cells = ['cell1', 'cell2', 'cell3'], cnt = (c) => SA.Grid.count(prof.stash, c);
      if (lo.cell && !cnt(lo.cell)) lo.cell = cells.slice().reverse().find(cnt) || lo.cell;
      const d = lo.cell && SA.ITEMS[lo.cell], has = d && cnt(lo.cell);
      const r = h('div', 'slot' + (has ? '' : ' empty'), `<span class="k">동력원</span><span>${has ? `${d.name} <span class="dim">창고 ${cnt(lo.cell)}개</span>` : '<span class="bad">없음 — 비상 발전만 (작업대에서 제작)</span>'}</span>`);
      r.onclick = () => { const own = cells.filter(cnt); if (!own.length) { SA.Audio.sfx('deny'); toast('창고에 동력원이 없다. 작업대에서 만들 수 있다 (고철 1 + 전선 1).', '#ffb3b3'); return; }
        lo.cell = own[(own.indexOf(lo.cell) + 1) % own.length]; save(); go('sortie'); };
      r.onmouseenter = (e) => SA.UI.showTipHtml(e, '클릭해서 등급을 바꾼다.<br>주무기는 동력원 에너지로 쏜다. 다 쓰면 R로 화물칸의 예비와 교체한다.<br>예비가 없으면 비상 발전(아주 느림)으로만 쏜다.'); r.onmouseleave = SA.UI.hideTip;
      col2.appendChild(r);
    }
    for (let i = 0; i < sh.sub; i++) col2.appendChild(slotRow(`서브웨폰 ${i + 1} (자동)`, 'sub', i, lo.sub[i]));
    col2.appendChild(slotRow('Q 액티브', 'act', 0, lo.act[0]));
    col2.appendChild(slotRow('E 액티브', 'act', 1, lo.act[1]));
    for (let i = 0; i < sh.pas; i++) col2.appendChild(slotRow(`패시브 ${i + 1}`, 'pas', i, lo.pas[i]));
    col2.appendChild(slotRow('관측 장비 (Z)', 'obs', 0, lo.obs));
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
    for (const id of [...SA.SHOP.consumables.map(x => x[0]), 'cell1', 'cell2', 'cell3']) {
      const d = SA.ITEMS[id], have = SA.Grid.count(prof.stash, id) - (lo.cell === id ? 1 : 0);   // 장착할 동력원 하나는 빼고 센다
      if (!have) continue;
      anyUse = true;
      if (prof.bring[id] === undefined && id === lo.cell && have > 0) prof.bring[id] = 1;   // 예비 동력원은 기본 1개
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

    const warn = (!lo.main && !lo.main2 ? '<div class="bad small">주무기가 없다.</div>' : '') + (!(lo.cell && SA.Grid.count(prof.stash, lo.cell)) ? '<div class="warn small">장착할 동력원이 없다 — 비상 발전으로만 쏜다.</div>' : '');
    const dmg = SA.loUids(lo).map(part).filter(p => p && p.dur / p.max < 0.5).length;
    col3.appendChild(h('div', '', warn + (dmg ? `<div class="warn small">내구도 50% 미만 부품 ${dmg}개 — 작업대에서 수리</div>` : '')));
    const b = h('button', 'btn big', '출격'); b.onclick = sortieGo;
    col3.appendChild(b);
    const rg = h('button', 'btn small', '연습장 (지금 장착으로 시험)'); rg.onclick = () => { const l = prof.loadouts[prof.ship]; if (!l.main && !l.main2) { toast('주무기를 장착해야 한다.', '#ffb3b3'); return; } close(); SA.Main.startRange(); };
    col3.appendChild(rg);
    { const dm = SA.DEATH_MODES[prof.deathMode] || SA.DEATH_MODES.normal; col3.appendChild(h('div', 'dim small', `격추되면 [${dm.name}]: ${dm.desc} 파일럿 부상 2회. (설정에서 변경)`)); }
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
  const pimg = (d) => d.img ? `<img src="${d.img}" style="height:34px;float:left;margin:0 8px 0 0">` : '';   // 도트 원본이 있는 부품은 그림을 같이 보여준다
  const partTip = (e, p) => {
    const d = SA.PARTS[p.id];
    SA.UI.showTipHtml(e, `${pimg(d)}<b>${d.name}</b> <span class="dim">${d.tier}</span><br><span class="desc">${d.desc}</span><br>내구도 ${Math.round(p.dur)} / ${Math.round(p.max)} · 성능 ${Math.round(SA.Combat.eff(p) * 100)}%`);
  };
  const pickPart = (e, kind, idx) => {
    const prof = P(), lo = prof.loadouts[prof.ship], sh = SA.SHIPS[prof.ship];
    const used = new Set(SA.loUids(lo));
    const opts = prof.parts.filter(p => {
      const d = SA.PARTS[p.id];
      if (d.slot !== kind || used.has(p.uid)) return false;
      if (d.onlyShip && d.onlyShip !== prof.ship) return false;
      return true;
    });
    const m = h('div', 'ctx wide');
    const set = (uid) => {
      if (kind === 'main') lo[idx ? 'main2' : 'main'] = uid; else if (kind === 'obs') lo.obs = uid; else lo[kind][idx] = uid;
      save(); document.querySelectorAll('.ctx').forEach(x => x.remove()); go('sortie');
    };
    if (!opts.length) m.appendChild(h('div', 'dim small pad', '장착할 수 있는 부품이 없다. 작업대에서 제작하자.'));
    for (const p of opts) {
      const d = SA.PARTS[p.id], b = h('button', '', `${pimg(d)}${d.name} <span class="dim">${d.tier} · ${Math.round(p.dur)}/${Math.round(p.max)}</span><div class="small dim">${d.desc}</div>`);
      b.onclick = () => set(p.uid); m.appendChild(b);
    }
    const cur = kind === 'main' ? lo[idx ? 'main2' : 'main'] : kind === 'obs' ? lo.obs : lo[kind][idx];
    if (cur) { const b = h('button', '', '<span class="bad">비우기</span>'); b.onclick = () => set(null); m.appendChild(b); }
    m.style.left = Math.min(innerWidth - 320, e.clientX) + 'px'; m.style.top = Math.min(innerHeight - 300, e.clientY) + 'px';
    document.querySelectorAll('.ctx').forEach(x => x.remove());
    document.body.appendChild(m);
    setTimeout(() => addEventListener('mousedown', function off(ev) { if (!m.contains(ev.target)) { m.remove(); removeEventListener('mousedown', off); } }), 0);
  };
  const autoEquip = (shipId) => {
    const prof = P(), lo = prof.loadouts[shipId], sh = SA.SHIPS[shipId];
    const used = () => new Set(SA.loUids(lo));
    const best = (kind, filt = () => true) => prof.parts.filter(p => SA.PARTS[p.id].slot === kind && !used().has(p.uid) && filt(p) && (!SA.PARTS[p.id].onlyShip || SA.PARTS[p.id].onlyShip === shipId))
      .sort((a, b) => SA.PARTS[b.id].val - SA.PARTS[a.id].val || b.dur - a.dur)[0];
    if (!lo.main) { const p = best('main'); if (p) lo.main = p.uid; }
    if (!lo.main2) { const p = best('main'); if (p) lo.main2 = p.uid; }
    if (!lo.cell) lo.cell = ['cell3', 'cell2', 'cell1'].find(c => SA.Grid.count(prof.stash, c)) || null;
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
    close(); SA.Main.startRaid();
  };

  // ── 창고 ──
  const stash = (body) => {
    const prof = P(), left = h('div', 'col'), right = h('div', 'col');
    left.appendChild(h('h3', '', `창고 <span class="dim small">${SA.Grid.used(prof.stash)}/${prof.stash.w * prof.stash.h}칸 · 총 ₵${SA.Grid.value(prof.stash)}</span>`));
    const g = h('div'); left.appendChild(g);
    SA.UI.gridView('stash', g, prof.stash, {
      menu: (it, grid) => {
        const d = SA.ITEMS[it.id];
        if (d.kind === 'ticket') return [['고용하기', () => hireRaven(it, grid)]];
        const a = [[`판매 ₵${d.val}`, () => { SA.Grid.remove(grid, it.uid); prof.credits += d.val; SA.Audio.sfx('buy'); save(); render(); }]];
        if (it.id === 'blackbox' || it.id === 'bb_reward') {
          a.unshift([`즉시 해독 ₵${SA.DECODE.instant}`, () => decode(it, true)]);
          if (!prof.decoding) a.unshift(['해독 맡기기 (다음 출격 뒤 완료)', () => decode(it, false)]);
        }
        if (d.kind === 'key') a.unshift([`해독기에 등록 (+${SA.CODES[d.code].uses}회)`, () => registerKey(it)]);
        if (d.kind === 'part') a.unshift(['부품함으로 옮기기', () => { SA.Grid.remove(prof.stash, it.uid); const np = SA.Save.newPart(d.part); np.dur = it.dur !== undefined ? it.dur : 60; prof.parts.push(np); save(); render(); }]);
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
      if (d.kind === 'ticket') {   // 고용권은 팔지 않고 쓴다
        r.innerHTML = `<img src="${SA.Render.iconSrc(id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name}<br><span class="dim small">${d.desc}</span></span>`;
        const hb = h('button', 'btn small', '고용하기'); hb.onclick = () => hireRaven(prof.stash.items.find(x => x.id === id), prof.stash);
        r.appendChild(hb); right.appendChild(r); continue;
      }
      r.innerHTML = `<img src="${SA.Render.iconSrc(id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name} ×${groups[id]}<br><span class="dim small">${d.kind === 'use' ? '출격 준비에서 골라 가져간다' : need ? `제작·의뢰에 ${need}개 필요` : '쓸 곳 없음'}</span></span>`;
      const b1 = h('button', 'btn small', `1개 ₵${d.val}`), b2 = h('button', 'btn small', `전부 ₵${d.val * groups[id]}`);
      b1.onclick = () => sell(id, 1); b2.onclick = () => sell(id, groups[id]);
      r.append(b1, b2); right.appendChild(r);
    }
    right.appendChild(h('div', 'dim small', '우클릭: 판매 · 블랙박스는 해독하면 기록이 열리지만 팔 수 없게 된다.'));
    body.append(left, right);
  };
  // 해독키 등록: 기지 기록에 코드가 남고(해독기를 잃어도 유지) 사용 횟수가 생긴다. 이후 상점에서 충전할 수 있다
  const registerKey = (it) => {
    const prof = P(), d = SA.ITEMS[it.id], c = SA.CODES[d.code];
    prof.codes = prof.codes || {}; prof.codeKnown = prof.codeKnown || {};
    SA.Grid.remove(prof.stash, it.uid);
    prof.codes[d.code] = (prof.codes[d.code] || 0) + c.uses; prof.codeKnown[d.code] = true;
    SA.Audio.sfx('unlock'); toast(`${c.name} 등록 — 남은 ${prof.codes[d.code]}회. 이제 상점에서 충전할 수 있다`, '#5dffb0'); save(); render();
  };
  const neededFor = (id) => {
    let n = 0;
    for (const r of P().recipes) { const m = (SA.RECIPES[r] || {}).mats || {}; n = Math.max(n, m[id] || 0); }
    for (const c of SA.STORY.contracts) if (c.mats && !(P().contracts[c.id] || {}).done) n = Math.max(n, c.mats[id] || 0);
    return n;
  };
  const hireRaven = (it, grid) => {
    const prof = P();
    if (prof.pilots.raven) { SA.Audio.sfx('deny'); toast('레이븐은 이미 용병단에 있다.', '#ffb3b3'); return; }
    SA.Grid.remove(grid, it.uid); prof.pilots.raven = { injury: 0 };
    SA.Audio.sfx('buy'); toast('레이븐이 용병단에 합류했다 — 파일럿으로 고를 수 있다', '#ffd166'); save(); render();
  };
  const sell = (id, n) => {
    const prof = P();
    for (let i = 0; i < n; i++) { const it = prof.stash.items.find(x => x.id === id); if (!it) break; SA.Grid.remove(prof.stash, it.uid); prof.credits += SA.ITEMS[id].val; }
    SA.Audio.sfx('buy'); save(); render();
  };
  const decode = (it, instant) => {
    const prof = P();
    if (instant && prof.credits < SA.DECODE.instant) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    if (!instant && prof.decoding) { toast('해독기가 이미 다른 블랙박스를 돌리고 있다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    SA.Grid.remove(prof.stash, it.uid);
    const r = SA.Decode.start(prof, it.id, instant);
    toast(r.text, '#ff8f3d'); SA.Audio.sfx('unlock'); save(); render();
  };

  // ── 작업대: 종류 탭 + 등급 탭 ──
  let benchKind = 'main', benchTier = '전체';
  const KINDS = [['main', '주무기'], ['sub', '서브웨폰'], ['act', '액티브'], ['pas', '패시브'], ['obs', '관측'], ['item', '동력원·소모품'], ['mat', '상위 재료']];
  const TIERS = ['전체', '일반', '강화', '전설'];
  const tierOf = (id) => (SA.PARTS[id] || SA.ITEMS[id] || {}).tier || '일반';
  const matLine = (mats, have) => Object.keys(mats).map(k => `<span class="${have(k) >= mats[k] ? 'ok' : 'bad'}">${SA.ITEMS[k].name} ${have(k)}/${mats[k]}</span>`).join(' · ');
  const bench = (body) => {
    const prof = P(), wrap = h('div', 'col wide benchwrap'), left = h('div', 'col wide'), right = h('div', 'col wide');
    const tabs = h('div', 'subtabs');
    for (const [k, nm] of KINDS) { const b = h('button', benchKind === k ? 'on' : '', nm); b.onclick = () => { benchKind = k; render(); }; tabs.appendChild(b); }
    const tiers = h('div', 'subtabs tiers');
    for (const t of TIERS) { const b = h('button', (benchTier === t ? 'on ' : '') + 't-' + t, t); b.onclick = () => { benchTier = t; render(); }; tiers.appendChild(b); }
    wrap.append(tabs, tiers);
    const tierOk = (id) => benchTier === '전체' || tierOf(id) === benchTier;
    const have = (k) => SA.Grid.count(prof.stash, k);
    const isPart = !['item', 'mat'].includes(benchKind);
    left.appendChild(h('h3', '', '제작'));
    if (isPart) {
      const ids = prof.recipes.filter(r => SA.RECIPES[r] && SA.PARTS[r] && SA.PARTS[r].slot === benchKind && tierOk(r))
        .sort((a, b) => TIERS.indexOf(tierOf(a)) - TIERS.indexOf(tierOf(b)));
      if (!ids.length) left.appendChild(h('div', 'dim small', '아는 설계도가 없다. 설계도는 필드에서 줍는다.'));
      for (const rid of ids) {
        const r = SA.RECIPES[rid], d = SA.PARTS[rid];
        const fromOk = !r.from || prof.parts.some(p => p.id === r.from);
        const locked = d.tier !== '일반' && !prof.rescued.teo;   // 정비사 테오를 구조해야 강화 등급 이상 제작 가능
        const ok = !locked && fromOk && Object.keys(r.mats).every(k => have(k) >= r.mats[k]);
        const row = h('div', 'recipe t-' + d.tier, `${pimg(d)}<b>${d.name}</b> <span class="tier">${d.tier}</span><div class="small">${d.desc}</div><div class="small">${r.from ? `<span class="${fromOk ? 'ok' : 'bad'}">${SA.PARTS[r.from].name} 1개</span> + ` : ''}${matLine(r.mats, have)}</div>`);
        const b = h('button', 'btn small' + (ok ? '' : ' dis'), locked ? '잠김' : '제작');
        if (locked) row.appendChild(h('div', 'small bad', '정비사 테오를 구조하면 제작할 수 있다'));
        b.onclick = () => craft(rid);
        row.appendChild(b); left.appendChild(row);
      }
    } else {
      const ids = Object.keys(SA.CRAFT).filter(id => { const k = SA.ITEMS[id].kind; return (benchKind === 'mat' ? k === 'umat' : k !== 'umat') && tierOk(id); });
      if (!ids.length) left.appendChild(h('div', 'dim small', '이 등급에는 만들 것이 없다.'));
      for (const id of ids) {
        const r = SA.CRAFT[id], d = SA.ITEMS[id], ok = Object.keys(r.mats).every(k => have(k) >= r.mats[k]);
        const row = h('div', 'recipe t-' + tierOf(id), `<img src="${SA.Render.iconSrc(id)}" style="height:34px;float:left;margin:0 8px 0 0"><b>${d.name}</b> <span class="tier">${tierOf(id)}</span> <span class="dim small">창고 ${have(id)}개</span><div class="small">${d.desc}</div><div class="small">${matLine(r.mats, have)}</div>`);
        const b = h('button', 'btn small' + (ok ? '' : ' dis'), '제작');
        b.onclick = () => craftItem(id);
        row.appendChild(b); left.appendChild(row);
      }
      if (benchKind === 'mat') left.appendChild(h('div', 'dim small', '상위 재료는 설계도 없이 만들 수 있고, 필드에서 줍기도 한다. 강화·전설 부품 제작에 들어간다.'));
    }
    if (isPart) {
      right.appendChild(h('h3', '', '보유 부품'));
      const needRep = prof.parts.filter(p => p.dur < p.max);
      const cost = needRep.reduce((n, p) => n + repairCost(p), 0);
      const all = h('button', 'btn' + (needRep.length ? '' : ' dis'), needRep.length ? `전부 수리 ₵${cost}` : '수리할 부품 없음');
      all.onclick = () => { if (!needRep.length) return; if (prof.credits < cost) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= cost; needRep.forEach(repair); SA.Audio.sfx('repair'); save(); render(); };
      right.appendChild(all);
      right.appendChild(h('div', 'dim small', '수리하면 내구도가 가득 차지만 최대 내구도가 3씩 줄어든다. 분해하면 제작 재료의 절반을 돌려받는다.'));
      const equipped = new Set(); for (const s in prof.loadouts) SA.loUids(prof.loadouts[s]).forEach(u => equipped.add(u));
      const mine = prof.parts.filter(p => SA.PARTS[p.id].slot === benchKind && tierOk(p.id)).sort((a, b) => TIERS.indexOf(tierOf(a.id)) - TIERS.indexOf(tierOf(b.id)));
      if (!mine.length) right.appendChild(h('div', 'dim small', '이 칸의 부품이 없다.'));
      for (const p of mine) {
        const d = SA.PARTS[p.id], r = p.dur / p.max;
        const row = h('div', 'slot t-' + d.tier, `<span>${d.name} <span class="tier">${d.tier}</span><span class="dim">${equipped.has(p.uid) ? ' · 장착 중' : ''}</span></span><span class="bar"><i style="width:${r * 100}%;background:${r >= 0.5 ? '#5dffb0' : r > 0 ? '#ffd166' : '#ff4d6d'}"></i></span><span class="dim small">${Math.round(p.dur)}/${Math.round(p.max)}</span>`);
        row.onmouseenter = (e) => partTip(e, p); row.onmouseleave = SA.UI.hideTip;
        if (p.dur < p.max) { const b = h('button', 'btn tiny', `수리 ₵${repairCost(p)}`); b.onclick = (e) => { e.stopPropagation(); if (prof.credits < repairCost(p)) { SA.Audio.sfx('deny'); return; } prof.credits -= repairCost(p); repair(p); SA.Audio.sfx('repair'); save(); render(); }; row.appendChild(b); }
        if (!equipped.has(p.uid)) { const b = h('button', 'btn tiny', '분해'); b.title = salvageText(p); b.onclick = (e) => { e.stopPropagation(); salvage(p); }; row.appendChild(b); }
        right.appendChild(row);
      }
    } else {
      right.appendChild(h('h3', '', '창고 재료'));
      const ids = [...new Set(prof.stash.items.map(it => it.id))].filter(id => { const k = SA.ITEMS[id].kind; return benchKind === 'mat' ? (k === 'mat' || k === 'umat') : (k === 'cell' || k === 'use'); });
      if (!ids.length) right.appendChild(h('div', 'dim small', '없다.'));
      for (const id of ids) right.appendChild(h('div', 'slot t-' + tierOf(id), `<span><img src="${SA.Render.iconSrc(id)}" style="height:18px;vertical-align:middle"> ${SA.ITEMS[id].name}</span><span class="dim">${have(id)}개</span>`));
    }
    const cols = h('div', 'benchcols'); cols.append(left, right); wrap.appendChild(cols);
    body.append(wrap);
  };
  // 분해: 제작 재료의 절반(내림)을 돌려준다. 레시피가 없는 부품은 고철 1
  const salvageMats = (p) => { const r = SA.RECIPES[p.id], out = {}; if (!r) return { scrap: 1 }; for (const k in r.mats) { const n = Math.floor(r.mats[k] / 2); if (n) out[k] = n; } if (!Object.keys(out).length) out.scrap = 1; return out; };
  const salvageText = (p) => '분해하면: ' + Object.entries(salvageMats(p)).map(([k, n]) => `${SA.ITEMS[k].name} ${n}`).join(', ');
  const salvage = (p) => {
    const prof = P(), out = salvageMats(p), ids = []; for (const k in out) for (let i = 0; i < out[k]; i++) ids.push(k);
    const tmp = SA.Grid.make(prof.stash.w, prof.stash.h, prof.stash.items.slice());
    if (!ids.every(id => SA.Grid.add(tmp, id))) { toast('창고에 재료를 넣을 자리가 없다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
    ids.forEach(id => SA.Grid.add(prof.stash, id));
    prof.parts = prof.parts.filter(x => x !== p);
    toast(`분해: ${SA.PARTS[p.id].name} → ${salvageText(p).slice(6)}`, '#cfe3ff'); SA.Audio.sfx('salvage', 1); save(); render();
  };
  const craftItem = (id) => {
    const prof = P(), r = SA.CRAFT[id];
    if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
    const tmp = SA.Grid.make(prof.stash.w, prof.stash.h, prof.stash.items.slice()); SA.Grid.takeMats(tmp, r.mats);
    if (!SA.Grid.add(tmp, id)) { SA.Audio.sfx('deny'); toast('창고에 자리가 없다.', '#ffb3b3'); return; }
    SA.Grid.takeMats(prof.stash, r.mats); SA.Grid.add(prof.stash, id);
    toast(`제작 완료: ${SA.ITEMS[id].name}`, '#5dffb0'); SA.Audio.sfx('buy'); SA.Quest.event('craft'); save(); render();
  };
  const repairCost = (p) => Math.ceil((p.max - p.dur) * SA.PARTS[p.id].val / 250);
  const repair = (p) => { p.max = Math.max(40, p.max - 3); p.dur = p.max; };
  const craft = (rid) => {
    const prof = P(), r = SA.RECIPES[rid];
    if (SA.PARTS[rid].tier !== '일반' && !prof.rescued.teo) { SA.Audio.sfx('deny'); toast('정비사 테오를 구조해야 강화 등급 이상을 만들 수 있다.', '#ffb3b3'); return; }
    if (r.from) {
      const src = prof.parts.filter(p => p.id === r.from).sort((a, b) => b.dur - a.dur)[0];
      if (!src) { SA.Audio.sfx('deny'); return; }
      if (!Object.keys(r.mats).every(k => SA.Grid.count(prof.stash, k) >= r.mats[k])) { SA.Audio.sfx('deny'); toast('재료가 부족하다.', '#ffb3b3'); return; }
      SA.Grid.takeMats(prof.stash, r.mats);
      prof.parts = prof.parts.filter(p => p !== src);
      const np = SA.Save.newPart(rid); prof.parts.push(np);
      for (const s in prof.loadouts) { const l = prof.loadouts[s]; for (const k of ['main', 'main2', 'obs']) if (l[k] === src.uid) l[k] = np.uid; for (const k of ['sub', 'act', 'pas']) l[k] = l[k].map(u => u === src.uid ? np.uid : u); }   // 장착 중이면 그대로 교체
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
      c.appendChild(h('div', '', `<b>${s.name}</b> <span class="dim">${s.role}</span><div class="small">${s.desc}</div><div class="small dim">HP ${s.hp} · 속도 ${s.speed} · 서브 ${s.sub} · 패시브 ${s.pas} · 화물 ${s.cargo[0]}×${s.cargo[1]}</div>`));
      const b = h('button', 'btn small' + (own ? ' dis' : ''), own ? '보유' : `구매 ₵${s.price}`);
      b.onclick = () => {
        if (own) return;
        if (prof.credits < s.price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
        prof.credits -= s.price; prof.ships.push(id);
        const cur = prof.loadouts[prof.ship];   // 지금 기체의 장착을 최대한 그대로 옮긴다
        prof.loadouts[id] = { main: cur.main, main2: cur.main2 || null, sub: cur.sub.slice(0, s.sub), act: cur.act.slice(), pas: cur.pas.slice(0, s.pas), obs: cur.obs || null, cell: cur.cell || null };
        autoEquip(id); prof.ship = id; toast(`${s.name} 구매 — 가진 부품으로 자동 장착했다`, '#5dffb0'); SA.Audio.sfx('buy'); save(); render();
      };
      c.appendChild(b); c1.appendChild(c);
    }
    c2.appendChild(h('h3', '', '파일럿'));
    c2.appendChild(h('div', 'dim small', '파일럿은 이제 고용하지 않는다. 조난 신호를 구조하면 합류한다 (테오를 구한 뒤부터, 탈출을 거듭하면 신호가 뜬다).'));
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
    // 해독 코드 충전 (등록한 코드만)
    c2.appendChild(h('h3', '', '해독 코드 충전'));
    const known = Object.keys(SA.CODES).filter(k => (prof.codeKnown || {})[k]);
    if (!known.length) c2.appendChild(h('div', 'dim small', '필드에서 해독키를 주워 창고에서 등록하면 여기서 충전할 수 있다. 여는 데는 보안해독기(패시브) 장착이 필요하다.'));
    for (const k of known) {
      const c = SA.CODES[k], cur = (prof.codes || {})[k] || 0, full = cur >= c.uses;
      const r = h('div', 'sellrow', `<span>${c.name} <b>${cur}</b>/${c.uses}회<br><span class="dim small">가득 채운다</span></span>`);
      const b = h('button', 'btn small' + (full ? ' dis' : ''), full ? '가득' : `₵${c.price}`);
      b.onclick = () => { if (full) return; if (prof.credits < c.price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; } prof.credits -= c.price; prof.codes[k] = c.uses; SA.Audio.sfx('buy'); save(); render(); };
      r.appendChild(b); c2.appendChild(r);
    }
    c2.appendChild(h('h3', '', '재료 배달'));
    if (!prof.rescued.deliv) {
      c2.appendChild(h('div', 'dim small', prof.rescued.teo ? '배달 상인 도리의 조난 신호를 구조하면 열린다. 다음 출격에 신호가 뜬다.' : '정비사 테오를 구조한 뒤에 도리의 조난 신호가 뜬다. 구조하면 열린다.'));
      body.append(c1, c2); return;
    }
    const D = SA.SHOP.delivery, dv = deliveryStock(), left = D.every - (Date.now() % D.every);
    c2.appendChild(h('div', 'dim small', `재고는 20분마다 바뀐다. 다음 교체까지 ${Math.floor(left / 60000)}분 ${Math.floor(left / 1000) % 60}초. 판매가의 ${D.mul}배.`));
    for (const st of dv.stock) {
      const d = SA.ITEMS[st.id], price = Math.ceil(d.val * D.mul);
      const c = h('div', 'sellrow', `<img src="${SA.Render.iconSrc(st.id)}" style="width:${d.w * 16}px;height:${d.h * 16}px"><span>${d.name} <b>${st.n}</b>개 남음<br><span class="dim small">${d.desc}</span></span>`);
      const b = h('button', 'btn small' + (st.n ? '' : ' dis'), st.n ? `₵${price}` : '품절');
      b.onclick = () => {
        if (!st.n) return;
        if (prof.credits < price) { toast('크레딧이 부족하다.', '#ffb3b3'); SA.Audio.sfx('deny'); return; }
        if (!SA.Grid.add(prof.stash, st.id)) { toast('창고가 가득 찼다.', '#ffb3b3'); return; }
        prof.credits -= price; st.n--; SA.Audio.sfx('buy'); save(); render();
      };
      c.appendChild(b); c2.appendChild(c);
    }
    body.append(c1, c2);
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

  // ── 의뢰 ── 수주(동시 3개) → 진행 → 보상. 받을 수 있는 것 위로, 완료는 접는다
  const contracts = (body) => {
    const prof = P(), K = SA.Contracts, col = h('div', 'col wide'), side = h('div', 'col');
    K.sync();
    col.appendChild(h('h3', '', `의뢰 게시판 <span class="dim small">수주 ${K.active().length}/${SA.REP.maxActive}</span>`));
    const rank = (c) => { const s = K.st(c.id); return s.done ? 4 : K.canClaim(c) ? 0 : s.accepted ? 1 : 2; };
    const list = SA.STORY.contracts.filter(K.open).sort((a, b) => rank(a) - rank(b) || (b.key ? 1 : 0) - (a.key ? 1 : 0));
    const RV = { kingdom: 'empire', empire: 'kingdom' };
    const done = h('details', 'donebox'); let nDone = 0;
    for (const c of list) {
      const st = K.st(c.id), can = K.canClaim(c);
      let prog = '';
      if (c.type === 'deliver') prog = Object.keys(c.mats).map(k => { const n = SA.Grid.count(prof.stash, k); return `<span class="${n >= c.mats[k] ? 'ok' : 'bad'}">${SA.ITEMS[k].name} ${Math.min(n, c.mats[k])}/${c.mats[k]}</span>`; }).join(' · ');
      else if (c.type === 'wing') prog = st.progress >= 1 ? '<span class="ok">완료 — 보상을 받아라</span>' : `${SA.NAMED[c.named].name}와 함께 출격해 ${c.goal === 'escort' ? '수송선을 탈출점까지 호위' : '심연의 사냥꾼 격추'} 후 탈출 <span class="dim">(G: 엄호 · 윙맨이 격추되면 그 판은 실패)</span>`;
      else if (c.type === 'raven') prog = prof.raven.done ? '<span class="ok">레이븐을 붙잡았다</span>' : prof.raven.stage ? '도주한 레이븐과 재대결 → 탈출 포드 회수' : '둥지에서 레이븐을 몰아붙여라';
      else prog = `${Math.min(st.progress, c.need)}/${c.need}${st.accepted ? '' : ' <span class="dim">(수주 후부터 센다)</span>'}`;
      const rw = `₵${c.reward.credits}${c.reward.item ? ' + ' + SA.ITEMS[c.reward.item].name : ''}`;
      const repTxt = RV[c.fac] ? ` · <span class="rep-${c.fac}">${K.FAC[c.fac]} +${SA.REP.gain}</span> <span class="rep-${RV[c.fac]}">${K.FAC[RV[c.fac]]} -${SA.REP.loss}</span>` : '';
      const state = st.done ? '' : can ? '<span class="ok">보상 받기 가능</span>' : st.accepted ? '<span class="dim">진행 중</span>' : '';
      const card = h('div', 'card fac-' + (c.fac || 'neutral') + (st.done ? ' off' : '') + (st.accepted && !st.done ? ' taken' : ''),
        `<span class="ftag">${K.FAC[c.fac || 'neutral']}</span>${c.key ? ' <span class="ftag key">중요</span>' : ''} <b>${c.title}</b> <span class="dim">${c.giver}</span> ${state}<div class="small">"${c.brief}"</div><div class="small">진행: ${prog}</div><div class="small">보상: ${rw}${repTxt}</div>`);
      if (st.done) { card.appendChild(h('div', 'ok small', '완료')); done.appendChild(card); nDone++; continue; }
      const row = h('div', 'row');
      if (!st.accepted) {
        const b = h('button', 'btn small' + (K.active().length >= SA.REP.maxActive ? ' dis' : ''), '수주');
        b.onclick = () => { const err = K.accept(c.id); if (err) { toast(err, '#ffb3b3'); SA.Audio.sfx('deny'); return; } SA.Audio.sfx('click'); render(); };
        row.appendChild(b);
      } else {
        const b = h('button', 'btn small' + (can ? '' : ' dis'), c.type === 'deliver' ? '납품' : '보상 받기');
        b.onclick = () => {
          const rep = K.claim(c.id);
          if (rep === null) { SA.Audio.sfx('deny'); return; }
          autoRegister();
          toast(`의뢰 완료: ${c.title} — ${rw}${rep}`, '#5dffb0'); SA.Audio.sfx('extract'); SA.Quest.event('contract'); save(); render();
        };
        const x = h('button', 'btn tiny', '포기');
        x.onclick = () => { K.abandon(c.id); SA.Audio.sfx('click'); render(); };
        row.append(b, x);
      }
      card.appendChild(row); col.appendChild(card);
    }
    if (nDone) { done.insertBefore(h('summary', 'dim', `완료한 의뢰 ${nDone}건`), done.firstChild); col.appendChild(done); }
    // 진영 호감도
    side.appendChild(h('h3', '', '진영 호감도'));
    const bar = (f) => { const v = prof.rep[f], w = Math.min(100, Math.abs(v)); return h('div', 'repbar', `<span class="rep-${f}">${K.FAC[f]}</span><span class="track"><i class="${v >= 0 ? 'pos' : 'neg'} rep-bg-${f}" style="width:${w / 2}%;${v >= 0 ? 'left:50%' : 'right:50%'}"></i></span><b>${v > 0 ? '+' : ''}${v}</b>`); };
    side.append(bar('kingdom'), bar('empire'));
    const ln = prof.route || K.lean();
    side.appendChild(h('div', 'small', prof.route ? `2막 루트 확정: <b class="rep-${prof.route}">${K.FAC[prof.route]}</b>` : `지금 기울어진 쪽: ${ln ? `<b class="rep-${ln}">${K.FAC[ln]}</b>` : '<span class="dim">없음</span>'}`));
    side.appendChild(h('div', 'dim small', `왕국·제국 의뢰를 끝내면 그 진영 +${SA.REP.gain}, 반대 진영 -${SA.REP.loss}. 중립(중개인 오스) 의뢰는 영향이 없다. 1막이 끝날 때 호감도가 높은 진영의 2막 루트로 간다.`));
    body.append(col, side);
  };

  // ── 기록 ──
  const records = (body) => {
    const prof = P(), c1 = h('div', 'col wide'), c2 = h('div', 'col');
    if (prof.decoding) c1.appendChild(h('div', 'warn small', `해독 중: ${SA.ITEMS[prof.decoding.id].name} — 다음 출격이 끝나면 완료`));
    if (prof.lastDecode && prof.lastDecode.log && !SA.STORY.blackbox.includes(prof.lastDecode.log)) {   // 보상형은 기록에 안 남고 최근 해독으로만 보인다
      const b = prof.lastDecode.log; c1.appendChild(h('div', 'card log', `<span class="dim small">최근 신호 해독 · ${b.src}</span><br><b>${b.title}</b>${b.lines.map(l => `<div class="small">${l}</div>`).join('')}<div class="small warn">다음 출격: ${b.signal.label}</div>`));
    }
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
