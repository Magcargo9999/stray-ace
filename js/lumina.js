// 1막 최종 보스 「성운 나방 루미나」: 균열 아레나 안에서만 나온다.
// 동방식: 루미나는 위, 기체는 아래. 페이즈마다 체력바가 새로 차고, 패턴 이름이 뜬다.
// 3페이즈 + 마지막 발악(무적, 30초 버티기). 수치는 SA.RIFT (전부 임시).
// v0.92 리듬 리워크: 모든 탄을 보스곡 박자(136BPM)에 맞춰 쏜다. 8마디 한 바퀴(7마디 + 쉬며 자리 이동 1마디), 바퀴마다 단계가 오른다.
// 탄 간격 원칙 (사양서 0장): 탄 사이 통과 폭 ≥ 기체 판정 + 탄 판정 ×2 + 여유 6px. 느린 큰 구슬은 피할 길이 항상 남게.
SA.Lumina = (() => {
  const U = SA.U, C = () => SA.Combat, CL = () => SA.RIFT.col;   // 탄 색은 SA.RIFT.col (역할별 3색 + 날개무늬 나선 2색)
  const PH = [
    { name: '인분 「인광의 비」' },
    { name: '날개무늬 「두 개의 눈」' },
    { name: '고치 「은빛 실타래」' },
    { name: '「타오르는 날개」', last: true },
  ];

  // ── 박자 (v0.92 리듬 리워크, 수치 임시) ──
  // 보스곡 136BPM에 맞춰 쏜다. 시계는 보스곡 재생 시각(SA.Audio.musicTime), 곡이 없으면 아레나 시간.
  // 박자 단위: 1박 = 60/136초, 32분음표(1/8박)마다 한 번 확인한다. 4박 = 1마디.
  // 페이즈는 마디 머리에서 시작하고, 8마디(32박, 약 14초)가 한 바퀴: 7마디 쏘고 마지막 1마디는 쉬면서 자리를 옮긴다.
  // 바퀴가 지날 때마다 단계가 오른다: 0 가르치기 → 1 기본 → 2 → 3 (최대). 한 번 이긴 뒤 다시 만나면 1단계부터.
  const BEAT = 60 / 136, CYC = 32, REST = 30;          // 한 바퀴 32박, 30박째부터 2박 쉼 (v0.106: 1마디 → 2박)
  const TEACH = 16, LVSTEP = 16, LVMAX = 4;             // 가르치기 4마디, 이후 4마디마다 단계 +1, 최대 4단계 (v0.106, 임시)
  const SPOT = [150, 95, 205, 150];                      // 쉬는 마디마다 옮겨 갈 자리 (x)
  const clock = (R) => {
    const m = SA.Audio.musicTime ? SA.Audio.musicTime('lumina') : null;
    return (m != null ? m : R.arena.t) - (SA.RIFT.beatOff || 0);   // beatOff: 곡 첫 박 위치 보정 (초, 해 보고 맞춘다)
  };

  const init = (R, e) => {
    e.ph = -1; e.intro = 2.2; e.noHit = true; e.face = Math.PI / 2;
    e.onZero = onZero; e.tx = SA.RIFT.w / 2;
    e.again = !!(SA.profile && SA.profile.lumina && SA.profile.lumina.wins > 0);
    R.arena.card = null; R.arena.bonus = 0; R.arena.hits = 0;
  };

  const start = (R, e, i) => {
    const RF = SA.RIFT, ph = PH[i];
    e.ph = i; e.pt = 0; e.gap = RF.gap; e.noHit = true;
    e.k1 = 0; e.k2 = 0; e.k3 = 0; e.v = 0; e.sa = 0; e.n = 0;
    e.t0 = null; e.last32 = null; e.warn = [];
    e.hp = e.maxHp = ph.last ? 1 : RF.hp[i];
    e.hits0 = R.arena.hits;
    R.arena.card = { name: ph.name, t: 0, last: !!ph.last };
    phaseLine(R, i);
    SA.Audio.sfx('stage');
  };

  // 페이즈 끝: 화면의 적 탄이 반짝이는 가루로 바뀌며 사라진다
  const clearBullets = (R, e) => {   // v0.114: 보스에서 쓸어 내리며 탄이 작은 점으로 흩어진다
    const cut = R.eb; R.eb = [];
    SA.FX.sweep(R, e ? e.x : SA.RIFT.w / 2, e ? e.y : 70, cut);
  };
  // 루미나의 파편 대사 (v0.112): 첫 도전은 멈추고 Space로 계속, 두 번째 도전부터 첫 격추 전까지는 패턴 이름 아래에 잠깐, 첫 격추 뒤·연습장은 무언
  const LP = ['…빛을 따라왔다.', '이름을… 불러 줬는데.', '아래가 가까워. 더 위로.', '꿈이… 아니었구나.'];
  const phaseLine = (R, i) => {
    if (R.range || !LP[i]) return;
    const lu = SA.profile.lumina || {}; if ((lu.wins || 0) > 0) return;
    if ((lu.tries || 0) <= 1) { R.freeze = { i }; R.dialog = [{ who: 'lumfrag', text: LP[i], life: 1e9, hold: true, t: 0 }]; }
    else R.arena.card.line = LP[i];
  };
  const end = (R, e, byDmg) => {
    const ok = byDmg && R.arena.hits === e.hits0;
    if (ok) { R.arena.bonus += SA.RIFT.phaseBonus; SA.Raid.msg(`보너스 ₵${SA.RIFT.phaseBonus} — 안 맞고 깼다`, '#ffd166', 3); }
    else SA.Raid.msg(byDmg ? '페이즈 돌파 (보너스 없음 — 맞았다)' : '시간 초과 — 다음 페이즈로 (보너스 없음)', '#cfe3ff', 3);
    clearBullets(R, e);
    R.shake = Math.max(R.shake, 6);
    start(R, e, e.ph + 1);
  };
  // 체력이 0이 되면 죽지 않고 다음 페이즈로 (마지막 발악은 무적이라 여기 오지 않는다)
  const onZero = (R, e) => {
    if (e.ph >= 0 && e.ph < PH.length && !PH[e.ph].last) { e.hp = 1; end(R, e, true); return true; }
    return false;
  };
  // 마지막 발악을 버텼다 → 격추 처리 (보상은 SA.Raid.bossKilled → riftWin)
  const win = (R, e) => {
    clearBullets(R, e);
    e.noHit = false; e.onZero = null; e.inv = 0; e.hp = 1;
    C().damageEnemy(R, e, 99);
  };

  // 큰 패턴(큰 구슬 r6·r9)이 q칸 뒤에 나가는지: step()의 조건을 그대로 따라 미리 본다 (v0.114 발사 예고용, 패턴을 바꾸면 같이 고칠 것)
  const bigAhead = (e, qf) => {
    const beat = qf >> 3, cb = beat % CYC;
    if ((qf & 7) !== 0 || cb >= REST) return false;
    const lv = Math.min(LVMAX, e.again ? 1 + Math.floor(beat / LVSTEP) : beat < TEACH ? 0 : 1 + Math.floor((beat - TEACH) / LVSTEP));
    if (e.ph === 1) return beat % 4 === 3 && (lv >= 1 || beat % 8 === 7);   // 큰 구슬 고리 (r6)
    if (e.ph === 2) return cb % (lv >= 4 ? 4 : 6) === 0;                    // 느린 큰 구슬 3발 (r9)
    return false;
  };

  // 32분음표 한 칸마다 부른다. q = 페이즈 시작부터 센 32분음표 번호
  // v0.106 난이도 상향 (수치 임시): 가르치기 4마디 → 이후 4마디마다 단계 +1 (최대 4). 한 바퀴 8마디 중 마지막 2박만 쉬며 자리 이동.
  // 아레나 안에서는 기체 판정이 작아지므로(SA.RIFT.hitMul) 그만큼 촘촘하게 쏜다. 2막용으로 아낀 패턴(홀짝 교대·저격·예고 구역 등)은 쓰지 않는다.
  const step = (R, e, q) => {
    const W = SA.RIFT.w, H = SA.RIFT.h, P = R.player, S = C(), eb = S.eb, fan = S.fan, ring = S.ring;
    const beat = q >> 3, sub = q & 7, onBeat = sub === 0, on8 = (sub & 3) === 0, on16 = (sub & 1) === 0;
    const cyc = Math.floor(beat / CYC), cb = beat % CYC;           // 몇 번째 바퀴, 바퀴 안 몇 번째 박
    const lv = Math.min(LVMAX, e.again ? 1 + Math.floor(beat / LVSTEP) : beat < TEACH ? 0 : 1 + Math.floor((beat - TEACH) / LVSTEP));   // 단계 0~4
    const last = PH[e.ph].last;
    if (!last && bigAhead(e, q + 6)) SA.FX.tele(R, e.x, e.y + 9, CL().big);   // v0.114 발사 예고: 큰 구슬 패턴 약 0.33초 전 (임시)
    // 쉬는 박: 쏘지 않고 다음 자리로 옮긴다 (발악은 쉬지 않고 가운데)
    if (!last && cb >= REST) { if (cb === REST && onBeat) e.tx = SPOT[(cyc + 1) % SPOT.length]; return; }
    switch (e.ph) {
      case 0: {   // 인광의 비: 2박마다 날개 9갈래(0~1단계 한쪽씩 번갈아, 2단계부터 양쪽, 3단계부터 마디 첫 박 11갈래) + 가루
        if (onBeat && beat % 2 === 0) {
          e.v++;
          const sw = Math.sin(e.v * 0.7) * 0.35, alt = e.v % 2 ? -1 : 1;
          const sides = lv >= 2 ? [-1, 1] : [alt];
          const n = lv >= 3 && beat % 4 === 0 ? 11 : 9;
          for (const side of sides) {
            const wx = e.x + side * 38, wy = e.y + 6;
            fan(R, wx, wy, U.ang(wx, wy, P.x, P.y) + side * sw, n, n === 11 ? 1.2 : 1.0, lv >= 4 ? 108 : 100, { r: 3, col: CL().main });
          }
          SA.Audio.sfx('enemyShot');
        }
        if (lv >= 1 ? on8 : onBeat) {
          const k = lv >= 4 ? 3 : lv >= 2 ? 2 : 1;
          for (let i = 0; i < k; i++) eb(R, U.rnd(8, W - 8), -4, Math.PI / 2 + U.rnd(-0.15, 0.15), U.rnd(44, 68), { r: 2.5, col: CL().main, turn: U.rnd(-0.25, 0.25), life: 9 });
        }
        break;
      }
      case 1: {   // 두 개의 눈: 마디의 1~3박은 서로 반대로 도는 3갈래 나선(두 눈), 4박째는 나선을 멈추고 큰 구슬 고리
        if (beat % 4 !== 3) {
          if (on16) {
            e.sa += 0.2;
            const lx = e.x - 34, rx = e.x + 34, y = e.y + 12, arms = lv >= 1 ? 3 : 2;
            for (let arm = 0; arm < arms; arm++) {
              const o = arm * Math.PI * 2 / arms;
              const sp = lv >= 3 ? 86 : 79;
              eb(R, lx, y, e.sa + o, sp, { r: 3.2, col: CL().sky });
              if (lv >= 1) eb(R, rx, y, Math.PI - e.sa + o, sp, { r: 3.2, col: CL().pink });
            }
          }
        } else if (onBeat && (lv >= 1 || beat % 8 === 7)) {        // 0단계만 2마디마다, 1단계부터 마디마다
          const n = lv >= 4 ? 20 : lv >= 2 ? 16 : 12;
          e.n++; ring(R, e.x, e.y + 8, n, 53, (e.n % 2) * Math.PI / n + e.n * 0.07, { r: 6, col: CL().big });
          SA.Audio.sfx('enemyShot');
        }
        break;
      }
      case 2: {   // 은빛 실타래: 2박마다 처음 0.33초 동안 휘는 탄줄(6가닥, 3단계부터 8가닥) + 6박마다(4단계 4박마다) 느린 큰 구슬 3발 + 아래 벽 구슬
        e.k3 += 0.25 * BEAT / 8;
        if (beat % 2 === 0 && sub < 6) {
          const k = lv >= 3 ? 8 : 6;                                // 3단계부터 8가닥
          for (let i = 0; i < k; i++) eb(R, e.x, e.y + 8, e.k3 + i * Math.PI * 2 / k, 84, { r: 2.8, col: CL().main, turn: i % 2 ? 0.55 : -0.55 });
        }
        if (onBeat && cb % (lv >= 4 ? 4 : 6) === 0) {              // 바퀴 안 0·6·12·18·24박 (4단계는 4박마다)
          e.n++;
          const aP = U.ang(e.x, e.y, P.x, P.y);   // 3발 고정 (홀짝 교대는 2막 보스용으로 아껴 둔다)
          fan(R, e.x, e.y + 10, aP, 3, 0.9, 42, { r: 9, col: CL().big, dmg: 14 });
          SA.Audio.sfx('enemyShot');
        }
        if (lv >= 2 && onBeat && cb < REST - 2 && cb % 8 === 4) {   // 2단계부터: 2박 뒤 아래 벽에서 구슬이 올라온다. 지금 예고 원
          const wx = Math.max(20, Math.min(W - 20, P.x));
          e.warn.push({ x: wx, at: q + 16 });
          R.rings.push({ x: wx, y: H - 6, r: 4, max: 22, life: 2 * BEAT, col: CL().big });
        }
        for (const w of e.warn) if (w.at === q) eb(R, w.x, H + 4, -Math.PI / 2, 42, { r: 9, col: CL().big, dmg: 14 });
        e.warn = e.warn.filter(w => w.at > q);
        break;
      }
      case 3: {   // 타오르는 날개: 무적. 16분음표마다 대칭 4갈래 나선 두 벌(점점 빨라진다), 2마디마다 마지막 박은 쉼 + 불씨
        const s = Math.min(1, e.pt / SA.RIFT.lastT);
        if (on16 && beat % 8 !== 7) {
          e.sa += 0.19 + 0.03 * s;
          for (let k = 0; k < 4; k++) {
            const a = e.sa + k * Math.PI / 2;
            eb(R, e.x, e.y + 10, a, 77 + 27 * s, { r: 3, col: CL().last });
            eb(R, e.x, e.y + 10, Math.PI - a, 77 + 27 * s, { r: 3, col: CL().last });
          }
        }
        if (on8) { const k = SA.RIFT.lastT - e.pt < 10 ? 3 : 2; for (let i = 0; i < k; i++) eb(R, U.rnd(8, W - 8), -4, Math.PI / 2 + U.rnd(-0.1, 0.1), U.rnd(60, 99), { r: 2.6, col: CL().last, turn: U.rnd(-0.3, 0.3), life: 9 }); }
        if (onBeat && beat % 4 === 0) R.rings.push({ x: e.x, y: e.y, r: 20, max: 70, life: 0.35, col: CL().last });   // 마디 첫 박: 빛 고리 (탄 아님)
        break;
      }
    }
  };

  const update = (R, e, dt, aP) => {
    const W = SA.RIFT.w, P = R.player, A = R.arena;
    if (!A) return;
    if (A.card) A.card.t += dt;
    // 등장: 위에서 내려온다
    if (e.ph < 0) {
      e.x = W / 2; e.y += (70 - e.y) * Math.min(1, 2.2 * dt);
      e.intro -= dt; if (e.intro <= 0) start(R, e, e.startPh || 0);   // startPh: 연습장에서 고른 시작 페이즈
      return;
    }
    // 정한 자리(e.tx) 둘레에서 살짝 떠다닌다 (발악 때는 가운데)
    const last = PH[e.ph].last;
    if (last) e.tx = W / 2;
    const tx = e.tx + Math.sin(A.t * 0.5) * (last ? 0 : 8), ty = 70 + Math.sin(A.t * 1.3) * 6;
    e.x += (tx - e.x) * Math.min(1, 3 * dt); e.y += (ty - e.y) * Math.min(1, 2 * dt);
    if (e.gap > 0) { e.gap -= dt; if (e.gap <= 0) e.noHit = !!last; return; }
    // 페이즈 시작을 다음 마디 머리에 맞춘다 (최대 1마디 기다림)
    const q32 = Math.floor(clock(R) / BEAT * 8);
    if (e.t0 === null) { e.t0 = Math.ceil(q32 / 32) * 32; e.last32 = e.t0 - 1; }
    if (q32 < e.t0) return;
    e.pt += dt;
    const limit = last ? SA.RIFT.lastT : SA.RIFT.phaseT;
    if (e.pt >= limit) { if (last) win(R, e); else end(R, e, false); return; }
    if (P.dead) return;
    // 지나간 32분음표 칸을 차례로 처리 (멈췄다 돌아오면 밀린 칸은 버리고 지금 칸부터)
    if (q32 - e.last32 > 8) e.last32 = q32 - 1;
    while (e.last32 < q32) { e.last32++; step(R, e, e.last32 - e.t0); }
  };

  // 남은 시간 (HUD)
  const left = (e) => {
    if (!e || e.ph < 0) return null;
    const limit = PH[e.ph].last ? SA.RIFT.lastT : SA.RIFT.phaseT;
    return Math.max(0, limit - (e.pt || 0));
  };

  // 사용자 도트: 평소에는 날개 3프레임을 0-1-2-1 순서로 퍼덕이고, 마지막 발악에는 불꽃이 붙은 프레임으로 바뀐다.
  // 6장 모두 몸통 자리가 같아서 프레임이 바뀌어도 흔들리지 않는다. 몸통(얼굴)이 보스 중심(e.x, e.y)에 온다.
  const SEQ = [0, 1, 2, 1];
  const draw = (ctx, R, e) => {
    const burn = e.ph >= 0 && PH[e.ph] && PH[e.ph].last, fl = e.flash > 0;
    const spr = SA.Render.pre[(burn ? 'lumina_burn_' : 'lumina_') + SEQ[Math.floor(R.t * (burn ? 7 : 4)) % 4]];   // 퍼덕임 속도: 평소 초당 4프레임 · 발악 7프레임 (임시)
    if (!spr) { drawTemp(ctx, R, e); return; }   // 도트가 안 불러와졌으면 아래 임시 나방
    const S = SA.RIFT.spr, bob = Math.sin(R.t * (burn ? 3.2 : 1.8)) * 2;   // 떠 있는 느낌의 위아래 흔들림
    ctx.save(); ctx.translate(e.x, e.y + bob);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fl ? SA.Render.flashOf(spr) : spr, -S.w / 2, -S.h * S.py, S.w, S.h);
    drawWeak(ctx, R, e);
    ctx.restore();
  };

  // 약점 표시 (v0.94): 도트 위에 코드로 얹는 표식이라 도트 원본은 그대로. 몸 가운데 아래 구슬 자리에 맞춘다.
  // 맞출 수 있는 동안(무적이 아닐 때)은 또렷하게, 무적일 때(발악·페이즈 사이)는 흐리게 보여 준다.
  const drawWeak = (ctx, R, e) => {
    const W = SA.ENEMIES.lumina.weak;
    if (!W || e.ph < 0) return;
    const k = 0.5 + 0.5 * Math.sin(R.t * 5), r = W.r + 1 + k * 1.5;
    ctx.save(); ctx.translate(W.x, W.y);
    ctx.globalAlpha = e.noHit ? 0.22 : 0.6 + 0.35 * k;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.stroke();
    ctx.beginPath();                                          // 바깥으로 뻗은 눈금 네 개
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.moveTo(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1)); ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4)); }
    ctx.stroke();
    ctx.restore();
  };

  // 임시 나방: 코드로 그린 그림 (도트가 없을 때만 쓴다)
  const drawTemp = (ctx, R, e) => {
    const t = R.t, burn = e.ph >= 0 && PH[e.ph] && PH[e.ph].last, fl = e.flash > 0;
    const flap = 0.78 + 0.22 * Math.sin(t * (burn ? 7 : 4));
    const wing = burn ? '#5a2410' : '#2d2150', edge = burn ? '#ffb347' : '#ffe9a8';
    ctx.save(); ctx.translate(e.x, e.y);
    // 뒤쪽 빛 (단색 원 몇 겹, 그라데이션 없이)
    ctx.globalAlpha = 0.12; ctx.fillStyle = burn ? '#ff7a3d' : '#b98cff';
    for (const r of [70, 54, 40]) { ctx.beginPath(); ctx.arc(0, 4, r, 0, 6.29); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side * flap, 1);
      // 윗날개
      ctx.fillStyle = fl ? '#ffffff' : wing; ctx.strokeStyle = edge; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(4, -4); ctx.quadraticCurveTo(30, -46, 62, -30); ctx.quadraticCurveTo(66, 0, 40, 10); ctx.quadraticCurveTo(18, 10, 4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 아랫날개
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.quadraticCurveTo(34, 12, 40, 34); ctx.quadraticCurveTo(22, 46, 6, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 눈 무늬 (왼쪽 하늘색 · 오른쪽 분홍)
      const eye = side < 0 ? '#8fe9ff' : '#ff9de2';
      ctx.fillStyle = burn ? '#ffd166' : eye; ctx.beginPath(); ctx.arc(34, -12, 8, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(34, -12, 3.5, 0, 6.29); ctx.fill();
      ctx.fillStyle = edge; ctx.beginPath(); ctx.arc(26, 24, 3, 0, 6.29); ctx.fill();
      ctx.restore();
    }
    // 몸통 · 더듬이
    ctx.fillStyle = fl ? '#ffffff' : (burn ? '#ffd0a0' : '#d9c9ff');
    ctx.beginPath(); ctx.ellipse(0, 4, 6, 20, 0, 0, 6.29); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2, -14); ctx.quadraticCurveTo(-10, -30, -16, -32); ctx.moveTo(2, -14); ctx.quadraticCurveTo(10, -30, 16, -32); ctx.stroke();
    ctx.restore();
  };

  return { init, update, draw, left, PH, clock, BEAT };
})();
