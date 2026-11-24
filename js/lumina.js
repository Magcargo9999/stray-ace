// 1막 최종 보스 「성운 나방 루미나」: 균열 아레나 안에서만 나온다.
// 동방식: 루미나는 위, 기체는 아래. 페이즈마다 체력바가 새로 차고, 패턴 이름이 뜬다.
// 3페이즈 + 마지막 발악(무적, 30초 버티기). 수치는 SA.RIFT (전부 임시).
// 탄 간격 원칙 (사양서 0장): 탄 사이 통과 폭 ≥ 기체 판정 + 탄 판정 ×2 + 여유 6px. 느린 큰 구슬은 피할 길이 항상 남게.
SA.Lumina = (() => {
  const U = SA.U, C = () => SA.Combat;
  const PH = [
    { name: '인분 「인광의 비」' },
    { name: '날개무늬 「두 개의 눈」' },
    { name: '고치 「은빛 실타래」' },
    { name: '「타오르는 날개」', last: true },
  ];

  const init = (R, e) => {
    e.ph = -1; e.intro = 2.2; e.noHit = true; e.face = Math.PI / 2;
    e.onZero = onZero;
    R.arena.card = null; R.arena.bonus = 0; R.arena.hits = 0;
  };

  const start = (R, e, i) => {
    const RF = SA.RIFT, ph = PH[i];
    e.ph = i; e.pt = 0; e.gap = RF.gap; e.noHit = true;
    e.k1 = 0; e.k2 = 0; e.k3 = 0; e.v = 0; e.sa = 0;
    e.hp = e.maxHp = ph.last ? 1 : RF.hp[i];
    e.hits0 = R.arena.hits;
    R.arena.card = { name: ph.name, t: 0, last: !!ph.last };
    SA.Audio.sfx('stage');
  };

  // 페이즈 끝: 화면의 적 탄이 반짝이는 가루로 바뀌며 사라진다
  const clearBullets = (R) => {
    let n = 0;
    for (const b of R.eb) if (n++ < 160) C().fx(R, b.x, b.y, 1, '#fff3c4', 30, 0.5, 1);
    R.eb = [];
  };
  const end = (R, e, byDmg) => {
    const ok = byDmg && R.arena.hits === e.hits0;
    if (ok) { R.arena.bonus += SA.RIFT.phaseBonus; SA.Raid.msg(`보너스 ₵${SA.RIFT.phaseBonus} — 안 맞고 깼다`, '#ffd166', 3); }
    else SA.Raid.msg(byDmg ? '페이즈 돌파 (보너스 없음 — 맞았다)' : '시간 초과 — 다음 페이즈로 (보너스 없음)', '#cfe3ff', 3);
    clearBullets(R);
    R.rings.push({ x: e.x, y: e.y, r: 10, max: 160, life: 0.5, col: '#ffe9a8' });
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
    clearBullets(R);
    e.noHit = false; e.onZero = null; e.inv = 0; e.hp = 1;
    C().damageEnemy(R, e, 99);
  };

  const update = (R, e, dt, aP) => {
    const W = SA.RIFT.w, P = R.player, A = R.arena;
    if (!A) return;
    if (A.card) A.card.t += dt;
    // 등장: 위에서 내려온다
    if (e.ph < 0) {
      e.x = W / 2; e.y += (70 - e.y) * Math.min(1, 2.2 * dt);
      e.intro -= dt; if (e.intro <= 0) start(R, e, 0);
      return;
    }
    // 위쪽에서 천천히 좌우로 떠다닌다 (발악 때는 가운데)
    const last = PH[e.ph].last, sway = last ? 0 : [40, 26, 34][e.ph];
    const tx = W / 2 + Math.sin(A.t * 0.5) * sway, ty = 70 + Math.sin(A.t * 1.3) * 6;
    e.x += (tx - e.x) * Math.min(1, 2 * dt); e.y += (ty - e.y) * Math.min(1, 2 * dt);
    if (e.gap > 0) { e.gap -= dt; if (e.gap <= 0) e.noHit = !!last; return; }
    e.pt += dt;
    const limit = last ? SA.RIFT.lastT : SA.RIFT.phaseT;
    if (e.pt >= limit) { if (last) win(R, e); else end(R, e, false); return; }
    if (P.dead) return;
    const S = C(), eb = S.eb, fan = S.fan, ring = S.ring;
    switch (e.ph) {
      case 0: {   // 인광의 비: 양 날개에서 좌우 대칭 부채꼴 + 위에서 흩날리는 가루
        e.k1 += dt;
        if (e.k1 > 1.0) {
          e.k1 = 0; e.v++;
          const sw = Math.sin(e.v * 0.7) * 0.35;
          for (const side of [-1, 1]) {
            const wx = e.x + side * 38, wy = e.y + 6;
            fan(R, wx, wy, U.ang(wx, wy, P.x, P.y) + side * sw, 7, 0.95, 92, { r: 3, col: side < 0 ? '#ffd98a' : '#ffb3e6' });
          }
          SA.Audio.sfx('enemyShot');
        }
        e.k2 += dt;
        while (e.k2 > 0.14) { e.k2 -= 0.14; eb(R, U.rnd(8, W - 8), -4, Math.PI / 2 + U.rnd(-0.15, 0.15), U.rnd(40, 62), { r: 2.5, col: '#fff3c4', turn: U.rnd(-0.25, 0.25), life: 9 }); }
        break;
      }
      case 1: {   // 두 개의 눈: 날개의 눈 무늬 두 곳에서 서로 반대로 도는 나선 + 가끔 큰 고리
        e.k1 += dt;
        while (e.k1 > 0.1) {
          e.k1 -= 0.1; e.sa += 0.23;
          const lx = e.x - 34, rx = e.x + 34, y = e.y + 12;
          for (let arm = 0; arm < 2; arm++) {
            eb(R, lx, y, e.sa + arm * Math.PI, 72, { r: 3.2, col: '#8fe9ff' });
            eb(R, rx, y, Math.PI - e.sa + arm * Math.PI, 72, { r: 3.2, col: '#ff9de2' });
          }
        }
        e.k2 += dt;
        if (e.k2 > 3.2) { e.k2 = 0; ring(R, e.x, e.y + 8, 16, 48, Math.random(), { r: 6, col: '#ffe9a8' }); SA.Audio.sfx('enemyShot'); }
        break;
      }
      case 2: {   // 은빛 실타래: 휘어 들어오는 끊긴 탄줄 6가닥(서로 반대로 휜다) + 느린 큰 구슬
        e.k3 += dt * 0.25;
        e.k1 += dt;
        const cyc = e.k1 % 0.9;
        if (cyc < 0.36) {
          e.k2 += dt;
          while (e.k2 > 0.06) {
            e.k2 -= 0.06;
            for (let i = 0; i < 6; i++) eb(R, e.x, e.y + 8, e.k3 + i * Math.PI / 3, 80, { r: 2.8, col: '#e8eefc', turn: i % 2 ? 0.55 : -0.55 });
          }
        } else e.k2 = 0;
        e.v += dt;
        if (e.v > 2.6) { e.v = 0; fan(R, e.x, e.y + 10, aP, 3, 0.9, 38, { r: 9, col: '#c9d6ff', dmg: 14 }); SA.Audio.sfx('enemyShot'); }
        break;
      }
      case 3: {   // 타오르는 날개: 무적. 대칭 나선(점점 빨라진다) + 위에서 떨어지는 불씨
        const s = Math.min(1, e.pt / SA.RIFT.lastT);
        e.k1 += dt;
        while (e.k1 > 0.1) {
          e.k1 -= 0.1; e.sa += 0.19 + 0.06 * s;
          for (let k = 0; k < 3; k++) {
            const a = e.sa + k * Math.PI * 2 / 3;
            eb(R, e.x, e.y + 10, a, 70 + 30 * s, { r: 3, col: '#ffb347' });
            eb(R, e.x, e.y + 10, Math.PI - a, 70 + 30 * s, { r: 3, col: '#ff7a5c' });
          }
        }
        e.k2 += dt;
        while (e.k2 > 0.16) { e.k2 -= 0.16; eb(R, U.rnd(8, W - 8), -4, Math.PI / 2 + U.rnd(-0.1, 0.1), U.rnd(55, 90), { r: 2.6, col: '#ff5d3a', turn: U.rnd(-0.3, 0.3), life: 9 }); }
        if (Math.random() < 0.3) S.fx(R, e.x + U.rnd(-50, 50), e.y + U.rnd(-20, 20), 1, '#ffb347', 40, 0.5, 1.5);
        break;
      }
    }
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

  return { init, update, draw, left, PH };
})();
