// STRAY//ACE — 모든 수치 데이터. 밸런스 조정은 이 파일에서만 한다.
window.SA = window.SA || {};

SA.CFG = {
  VIEW_W: 640, VIEW_H: 360, ZOOM: 2,      // 월드 640x360을 2배로 그림 (도트 정수배)
  MAP_SCALE: 1.0,                          // 맵 크기 배율 (1.2, 1.5로 키워보기)
  SCREENS_X: 6, SCREENS_Y: 6,              // 1번 맵 = 화면 6x6
  HIT_INVULN: 0.8,
  GRAZE_R: 14,
  TAB_TIMESCALE: 0.3,
  EXTRACT_TIME: 10,
  EXTRACT_R: 52,
  MAGNET_R: 42,
  SECURE_W: 2, SECURE_H: 2,
  STASH_W: 10, STASH_H: 14,
  MAX_ENEMY_BULLETS: 2600,
};

// 화물 아이템. w,h = 격자 칸, val = 판매가
SA.ITEMS = {
  scrap:    { name: '고철', w: 1, h: 1, val: 20, kind: 'mat', color: '#8a8f98', desc: '어느 쪽 함선이었는지 알 수 없는 쇳조각. 녹이면 다 똑같다.' },
  wire:     { name: '전선 다발', w: 2, h: 1, val: 45, kind: 'mat', color: '#c9a65b', desc: '왕국 규격 피복. 제국 함선에서 뜯어도 같은 규격이다.' },
  fuel:     { name: '연료 전지', w: 1, h: 1, val: 60, kind: 'mat', color: '#5bc98a', desc: '반쯤 남았다. 누군가는 이걸 아끼다 격추됐다.' },
  core:     { name: '코어', w: 1, h: 2, val: 90, kind: 'mat', color: '#5b9bd5', desc: '함선의 심장. 아직 따뜻하다.' },
  engine:   { name: '엔진', w: 2, h: 2, val: 160, kind: 'mat', color: '#d58a5b', desc: '제국 공방 각인이 긁혀 지워져 있다.' },
  goldchip: { name: '금빛 회로', w: 1, h: 1, val: 180, kind: 'mat', color: '#ffd166', desc: '작고 비싸다. 용병들이 제일 먼저 챙기는 것.' },
  crystal:  { name: '침식 결정', w: 1, h: 1, val: 220, kind: 'mat', color: '#b98cff', desc: '침식체가 남긴 결정. 만지면 손끝이 저린다.' },
  debris:   { name: '대형 잔해', w: 2, h: 3, val: 300, kind: 'mat', color: '#9aa3ad', desc: '크고 무겁고 비싸다. 화물칸이 운다.' },
  blackbox: { name: '블랙박스', w: 1, h: 1, val: 150, kind: 'lore', color: '#ff8f3d', desc: '격추된 함선의 기록 장치. 팔거나, 격납고에서 해독하거나.' },
  canister: { name: '정화 캐니스터', w: 1, h: 2, val: 70, kind: 'use', color: '#7ff0e0', desc: '사용: 침식률 -25%.' },
  repairkit:{ name: '수리킷', w: 1, h: 1, val: 60, kind: 'use', color: '#9df07f', desc: '사용: 체력 40 회복.' },
  bp_scatter: { name: '설계도: 산탄포', w: 1, h: 1, val: 100, kind: 'bp', recipe: 'scatter', color: '#e6edf3', desc: '격납고에서 영구 해금된다. 이미 있으면 판매.' },
  bp_cooler:  { name: '설계도: 냉각기', w: 1, h: 1, val: 100, kind: 'bp', recipe: 'cooler', color: '#e6edf3', desc: '격납고에서 영구 해금된다.' },
  bp_shield:  { name: '설계도: 일시 방패', w: 1, h: 1, val: 120, kind: 'bp', recipe: 'shield', color: '#e6edf3', desc: '격납고에서 영구 해금된다.' },
  bp_lance:   { name: '설계도: 관통 레이저', w: 1, h: 1, val: 140, kind: 'bp', recipe: 'lance', color: '#e6edf3', desc: '격납고에서 영구 해금된다.' },
  bp_drone:   { name: '설계도: 추적 드론', w: 1, h: 1, val: 140, kind: 'bp', recipe: 'drone', color: '#e6edf3', desc: '격납고에서 영구 해금된다.' },
  bp_raven:   { name: '설계도: 레이븐 추진기', w: 1, h: 1, val: 300, kind: 'bp', recipe: 'raven', color: '#ffd166', desc: '네임드 용병 레이븐의 추진기. 그는 이걸로 탄 사이를 미끄러졌다.' },
};

// 장비 부품. slot: main/sub/act/pas
SA.PARTS = {
  pulse:   { name: '펄스건', slot: 'main', tier: '일반', val: 150, rate: 9, dmg: 6, spd: 520, spread: 0.03, shots: 1, desc: '기본 연사.' },
  twin:    { name: '트윈 펄스', slot: 'main', tier: '강화', val: 420, rate: 9, dmg: 6, spd: 540, spread: 0.02, shots: 2, desc: '2줄 발사. 펄스건 계보.' },
  scatter: { name: '산탄포', slot: 'main', tier: '일반', val: 220, rate: 2.4, dmg: 5, spd: 430, spread: 0.32, shots: 6, desc: '가까울수록 강하다.' },
  lance:   { name: '관통 레이저', slot: 'main', tier: '일반', val: 300, rate: 3.2, dmg: 15, spd: 760, spread: 0, shots: 1, pierce: 3, desc: '적을 3기까지 관통.' },
  mg:      { name: '기관포 포탑', slot: 'sub', tier: '일반', val: 120, rate: 4, dmg: 3, range: 230, desc: '가장 가까운 적을 자동 조준.' },
  drone:   { name: '추적 드론', slot: 'sub', tier: '일반', val: 260, rate: 2.5, dmg: 5, range: 260, desc: '기체 주위를 돌며 자동 사격.' },
  missile: { name: '미사일 포드', slot: 'act', tier: '일반', val: 200, cd: 8, desc: '유도 미사일 6발.' },
  purge:   { name: '정화 펄스', slot: 'act', tier: '일반', val: 220, cd: 12, desc: '주변 적 탄을 지운다.' },
  shield:  { name: '일시 방패', slot: 'act', tier: '일반', val: 240, cd: 14, desc: '1.5초 무적.' },
  magnet:  { name: '자력 수집기', slot: 'pas', tier: '일반', val: 120, desc: '아이템 흡수 거리 2배.' },
  cooler:  { name: '냉각기', slot: 'pas', tier: '일반', val: 160, desc: '주무기 연사 +15%.' },
  plating: { name: '차폐 장갑', slot: 'pas', tier: '일반', val: 160, desc: '침식 상승 속도 -20%.' },
  engine2: { name: '추진 엔진', slot: 'pas', tier: '일반', val: 160, desc: '이동 속도 +12%.' },
  barrier: { name: '베리어 발생기', slot: 'pas', tier: '일반', val: 260, onlyShip: 'bastion', desc: '바스티온 전용. 4초간 안 맞으면 차오르는 보호막 40.' },
  raven:   { name: '레이븐 추진기', slot: 'pas', tier: '전설', val: 900, desc: '이동 +15%, 파일럿 기술 쿨타임 -20%.' },
};

// 제작법: 재료는 창고에서 소모
SA.RECIPES = {
  twin:    { from: 'pulse', mats: { core: 2, scrap: 4 }, note: '펄스건 → 트윈 펄스 (강화)' },
  scatter: { mats: { scrap: 6, wire: 2 } },
  cooler:  { mats: { wire: 2, scrap: 3 } },
  shield:  { mats: { core: 1, fuel: 2 } },
  lance:   { mats: { core: 2, engine: 1 } },
  drone:   { mats: { engine: 1, wire: 2, fuel: 1 } },
  raven:   { mats: { crystal: 2, goldchip: 2, engine: 1 } },
  plating: { mats: { scrap: 8 } },
  engine2: { mats: { engine: 1, fuel: 1 } },
  magnet:  { mats: { scrap: 4, fuel: 1 } },
  missile: { mats: { core: 1, fuel: 2 } },
  purge:   { mats: { crystal: 1, wire: 1 } },
  barrier: { mats: { core: 2, wire: 2 } },
};
SA.START_RECIPES = ['twin', 'plating', 'engine2', 'magnet', 'missile', 'barrier'];

// 기체. mount = 포탑/판정점 (도트 좌표, 0~1 비율)
SA.SHIPS = {
  hex:     { name: '헥스', role: '기본', price: 0, hp: 100, speed: 130, accel: 14, turn: 18, hitR: 2.5, sub: 2, act: 2, pas: 3, cargo: [4, 4],
             img: 'assets/hex_hull.png', turretImg: 'assets/hex_turret.png', size: [32, 32], mount: [16.5 / 32, 18.5 / 32],
             subMounts: [[-9, 4], [9, 4]], desc: '모든 능력치가 평균. 지급 기체.' },
  swift:   { name: '스위프트', role: '고속', price: 5000, hp: 70, speed: 168, accel: 18, turn: 22, hitR: 2, sub: 1, act: 2, pas: 3, cargo: [3, 4],
             img: 'assets/swift_hull.png', size: [21, 34], mount: [0.5, 0.587],
             subMounts: [[0, -8]], desc: '빠르고 판정이 작다. 맷집은 약하다.' },
  bastion: { name: '바스티온', role: '중장갑', price: 5500, hp: 160, speed: 104, accel: 9, turn: 7, hitR: 3, sub: 2, act: 2, pas: 3, cargo: [5, 5], barrierSlot: true,
             img: 'assets/bastion_hull.png', size: [44, 34], mount: [0.503, 0.523],
             subMounts: [[-14, 6], [14, 6]], desc: '느리지만 튼튼하다. 베리어를 달 수 있다. 포탑 회전이 느리다.' },
  arsenal: { name: '아스날', role: '다소켓', price: 6000, hp: 60, speed: 130, accel: 14, turn: 18, hitR: 2.5, sub: 5, act: 2, pas: 5, cargo: [3, 3],
             img: 'assets/arsenal_hull.png', size: [36, 37], mount: [0.5, 0.466],
             subMounts: [[-8.5, 2], [8.5, 2], [-13, 9.5], [13.5, 9.5], [0, 11.5]], desc: '포탑 소켓 5개가 알아서 쏜다. 실수 허용량 최저.' },
};

SA.PILOTS = {
  kai:   { name: '카이', title: '회전왕', color: '#5dffb0', quote: '빙글 돌면, 탄이 알아서 비켜 간다.', skill: 'roll', cd: 4, cost: 0, desc: '배럴 롤: 0.4초 무적 + 이동 방향으로 미끄러짐.' },
  mina:  { name: '미나', title: '정비병', color: '#ffd166', quote: '고칠 수 있으면, 아직 안 끝난 거야.', skill: 'repair', cd: 15, cost: 0, desc: '자가수리: 3초간 감속, 체력 25% 회복.' },
  bruno: { name: '브루노', title: '돌격대장', color: '#ff8f3d', quote: '정면이 제일 안전해. 뒤에서 맞으면 아프거든.', skill: 'ram', cd: 6, cost: 400, desc: '램 돌진: 앞으로 돌진, 부딪힌 적에게 피해 + 경로의 탄 삭제.' },
  jet:   { name: '제트', title: '애프터버너', color: '#6ec6ff', quote: '빨리 가면, 그만큼 덜 맞아.', skill: 'boost', cd: 8, cost: 300, desc: '가속 부스트: 2초간 이동 +60%.' },
  silva: { name: '실바', title: '유령', color: '#b3a1ff', quote: '네가 쏜 자리엔, 이미 내가 없어.', skill: 'warp', cd: 5, cost: 500, desc: '단거리 워프: 커서 방향으로 순간이동.' },
  raven: { name: '레이븐', title: '옛 제자', color: '#ff4d6d', quote: '탄 사이엔 길이 있어요. 가르쳐 주신 대로.', skill: 'slip', cd: 9, cost: 0, hidden: true, desc: '슬립스트림: 2초간 판정이 작아지고 스치기 범위 2배, 스칠 때마다 쿨타임 -0.2초.' },
  // 파일럿이 모두 부상일 때만 나가는 직접 출격 (기술 없음, 침식 3배)
  cmdr:  { name: '단장', title: '직접 출격', color: '#8f9bb8', quote: '전원 부상이다. 그래도 누군가는 떠야 한다.', skill: null, cd: 0, cost: 0, hidden: true, desc: '파일럿 기술 없음. 침식이 3배 빠르게 찬다.' },
};
SA.CMDR_CORR = 3;
SA.INJURY_RAIDS = 2;

// 적. drops: [아이템, 확률]
SA.ENEMIES = {
  // 왕국군: 파란 회색 + 크림 띠, 정석적인 조준 사격 / 제국군: 검정 + 붉은 날개, 공격적인 연사
  k_fighter: { name: '왕국 전투기', faction: 'kingdom', ai: 'fighter', hp: 14, r: 9, speed: 95, img: 'assets/k_fighter.png', size: [26, 24],
               drops: [['scrap', .6], ['wire', .25], ['fuel', .1]] },
  e_fighter: { name: '제국 전투기', faction: 'empire', ai: 'fighter', hp: 16, r: 9, speed: 108, img: 'assets/e_fighter.png', size: [26, 24],
               drops: [['scrap', .6], ['fuel', .2], ['core', .08]] },
  k_frigate: { name: '왕국 프리깃', faction: 'kingdom', ai: 'frigate', hp: 110, r: 20, speed: 38, img: 'assets/k_frigate.png', size: [28, 48],
               drops: [['core', .55], ['wire', .5], ['fuel', .35], ['scrap', .8], ['bp_cooler', .05]] },
  e_frigate: { name: '제국 순양함', faction: 'empire', ai: 'frigate', hp: 130, r: 20, speed: 34, img: 'assets/e_frigate.png', size: [34, 47],
               drops: [['core', .5], ['engine', .35], ['scrap', .8], ['bp_shield', .04]] },
  k_turret:  { name: '왕국 포대', faction: 'kingdom', ai: 'turret', hp: 70, r: 12, speed: 0, img: 'assets/k_turret.png', size: [18, 25], pivot: [0.5, 0.67],
               drops: [['scrap', .7], ['wire', .3], ['core', .25]] },
  e_turret:  { name: '제국 쌍포대', faction: 'empire', ai: 'turret', hp: 60, r: 10, speed: 0, img: 'assets/e_turret.png', size: [14, 21], pivot: [0.5, 0.72],
               drops: [['scrap', .7], ['fuel', .3], ['core', .25]] },
  m_turret:  { name: '폐광 포대', faction: 'mine', ai: 'turret', hp: 95, r: 13, speed: 0, img: 'assets/m_turret.png', size: [26, 33], pivot: [0.5, 0.57],
               drops: [['scrap', .8], ['engine', .25], ['core', .3], ['bp_cooler', .06]] },
  corrode: { name: '침식체', ai: 'corrode', hp: 34, r: 11, speed: 52, color: '#b98cff', drops: [['crystal', .7]] },
  hunter:  { name: '심연의 사냥꾼', ai: 'hunter', hp: 700, r: 28, speed: 70, color: '#8a5cff', boss: true, drops: [['crystal', 1], ['crystal', .6], ['bp_drone', .5], ['goldchip', .8]] },
  raven:   { name: '네임드 용병 레이븐', ai: 'raven', hp: 480, r: 12, speed: 150, color: '#ff4d6d', boss: true, drops: [['bp_raven', 1], ['goldchip', 1], ['goldchip', .7], ['blackbox', 1], ['engine', .6]] },
};

// 침식 단계: at = 침식률 하한(%)
SA.CORROSION = [
  { at: 0,  name: '안정', fire: 1.0,  speed: 1.0,  rate: 30 / 480 },
  { at: 30, name: '오염', fire: 0.9,  speed: 1.0,  rate: 30 / 240 },
  { at: 60, name: '침식', fire: 0.8,  speed: 0.85, rate: 30 / 240, durDrain: true, spawnCorrode: true },
  { at: 90, name: '붕괴', fire: 0.65, speed: 0.75, rate: 10 / 120, durDrain: true, spawnCorrode: true, hpDrain: 1, hunter: true },
];

SA.SHOP = {
  consumables: [['canister', 150], ['repairkit', 120]],
};

SA.MAPS = {
  mine: { name: '폐광 소행성대', act: 1, sx: 6, sy: 6, desc: '튜토리얼 겸 파밍 맵. 소행성이 엄폐물. 침식이 느리다.' },
  front: { name: '전선 궤도', act: 2, locked: true },
  grave: { name: '함대 묘지', act: 3, locked: true },
  abyss: { name: '심연 균열', act: 4, locked: true },
};
