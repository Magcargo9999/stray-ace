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
  scrap:    { name: '고철', w: 1, h: 1, val: 20, kind: 'mat', img: 'assets/i_scrap.png', color: '#8a8f98', desc: '어느 쪽 함선이었는지 알 수 없는 쇳조각. 녹이면 다 똑같다.' },
  wire:     { name: '전선 다발', w: 2, h: 1, val: 45, kind: 'mat', color: '#c9a65b', desc: '왕국 규격 피복. 제국 함선에서 뜯어도 같은 규격이다.' },
  core:     { name: '코어', w: 1, h: 2, val: 90, kind: 'mat', img: 'assets/i_core.png', color: '#5b9bd5', desc: '함선의 심장. 아직 따뜻하다.' },
  engine:   { name: '엔진', w: 2, h: 2, val: 160, kind: 'mat', img: 'assets/i_engine.png', color: '#d58a5b', desc: '제국 공방 각인이 긁혀 지워져 있다.' },
  goldchip: { name: '금빛 회로', w: 1, h: 1, val: 180, kind: 'mat', color: '#ffd166', desc: '작고 비싸다. 용병들이 제일 먼저 챙기는 것.' },
  prec:     { name: '정밀 부품', w: 1, h: 1, val: 120, kind: 'mat', color: '#7fd3ff', desc: '군용 규격 베어링과 회로. 강화 부품에 들어간다.' },
  ace:      { name: '에이스 각인', w: 1, h: 1, val: 400, kind: 'mat', color: '#ff4d6d', desc: '이름 있는 자의 기체에서 뜯어낸 각인. 전설 부품에 들어간다.' },
  raven_ticket: { name: '레이븐 고용권', w: 2, h: 1, val: 0, kind: 'ticket', img: 'assets/raven_ticket.png', color: '#c49ac0', desc: '창고에서 사용하면 레이븐이 용병단에 합류한다.' },
  crystal:  { name: '침식 결정', w: 1, h: 1, val: 220, kind: 'mat', img: 'assets/i_crystal.png', color: '#b98cff', desc: '침식체가 남긴 결정. 만지면 손끝이 저린다.' },
  debris:   { name: '대형 잔해', w: 2, h: 3, val: 300, kind: 'mat', color: '#9aa3ad', desc: '크고 무겁고 비싸다. 화물칸이 운다.' },
  blackbox: { name: '블랙박스', w: 1, h: 1, val: 150, kind: 'lore', img: 'assets/i_blackbox.png', color: '#ff8f3d', desc: '격추된 함선의 기록 장치. 팔거나, 격납고에서 해독하거나.' },
  canister: { name: '정화 캐니스터', w: 1, h: 2, val: 70, kind: 'use', img: 'assets/i_canister.png', color: '#7ff0e0', desc: '사용: 침식률 -25%.' },
  repairkit:{ name: '수리킷', w: 1, h: 1, val: 60, kind: 'use', img: 'assets/i_repairkit.png', color: '#9df07f', desc: '사용: 체력 40 회복. Tab 화물칸에서 장착 부품에 끌어다 놓으면 그 부품 내구도 +40.' },
  bp_raven:   { name: '설계도: 레이븐 추진기', w: 1, h: 1, val: 300, kind: 'bp', recipe: 'raven', color: '#ffd166', desc: '네임드 용병 레이븐의 추진기. 그는 이걸로 탄 사이를 미끄러졌다.' },
};

// 장비 부품. slot: main/sub/act/pas
// 부품. 수치는 임시 (밸런스 조정 예정). 효과 구현은 combat.js
SA.PARTS = {
  // 주무기
  pulse:   { name: '펄스건', slot: 'main', tier: '일반', val: 150, rate: 9, dmg: 6, spd: 520, spread: 0.03, shots: 1, desc: '기본 연사.' },
  twin:    { name: '트윈 펄스', slot: 'main', tier: '강화', val: 420, rate: 9, dmg: 6, spd: 540, spread: 0.02, shots: 2, desc: '2줄 발사. 펄스건 계보.' },
  scatter: { name: '산탄포', slot: 'main', tier: '일반', val: 220, rate: 2.4, dmg: 5, spd: 430, spread: 0.32, shots: 6, life: 0.45, desc: '가까울수록 강하다.' },
  shard:   { name: '파편포', slot: 'main', tier: '강화', val: 480, rate: 2.4, dmg: 6, spd: 440, spread: 0.3, shots: 7, life: 0.45, frag: 3, desc: '맞은 탄이 한 번 더 터져 파편을 흩뿌린다. 산탄포 계보.' },
  crusher: { name: '분쇄포', slot: 'main', tier: '전설', val: 1200, rate: 2.3, dmg: 8, spd: 450, spread: 0.3, shots: 8, life: 0.45, frag: 3, close: true, desc: '가까운 적에게 피해 2배, 기절한 적에게 1.5배. 파편 포함. 산탄포 계보.' },
  lance:   { name: '관통 레이저', slot: 'main', tier: '일반', val: 300, rate: 3.2, dmg: 15, spd: 760, spread: 0, shots: 1, pierce: 3, desc: '적을 3기까지 관통.' },
  rail:    { name: '레일건', slot: 'main', tier: '강화', val: 560, rate: 2.6, dmg: 26, spd: 950, spread: 0, shots: 1, pierce: 99, desc: '적을 전부 관통. 관통 레이저 계보.' },
  breaker: { name: '탄막 관통포', slot: 'main', tier: '전설', val: 1300, rate: 2.4, dmg: 32, spd: 950, spread: 0, shots: 1, pierce: 99, erase: true, desc: '적 전부 관통 + 지나간 자리의 적 탄을 지운다. 관통 레이저 계보.' },
  glass:   { name: '유리 대포', slot: 'main', tier: '강화', val: 520, rate: 6, dmg: 14, spd: 620, spread: 0.03, shots: 1, desc: '화력이 아주 세다. 대신 맞을 때마다 장착 부품 내구도가 크게 깎인다.' },
  // 서브웨폰 (자동)
  mg:      { name: '기관포 포탑', slot: 'sub', tier: '일반', val: 120, rate: 4, dmg: 3, range: 230, desc: '가장 가까운 적을 자동 조준.' },
  mine:    { name: '지뢰 투하기', slot: 'sub', tier: '일반', val: 150, rate: 0.45, dmg: 30, range: 0, desc: '지나간 자리에 지뢰를 깐다. 쫓아오는 적에게.' },
  flamer:  { name: '화염 방사 포탑', slot: 'sub', tier: '일반', val: 160, rate: 14, dmg: 1.6, range: 75, desc: '사거리는 짧지만 초당 피해가 높다.' },
  drone:   { name: '추적 드론', slot: 'sub', tier: '강화', val: 260, rate: 2.5, dmg: 5, range: 260, leash: 150, desc: '적에게 날아가 붙어서 쏜다. 기체에서 150까지 떨어질 수 있어 엄폐 뒤의 적도 잡는다.' },
  sdrone:  { name: '방패 드론', slot: 'sub', tier: '강화', val: 300, rate: 4, dmg: 3, range: 200, desc: '기체 가까이를 돌며 닿는 적 탄을 지운다(초당 4발까지). 공격은 약하다.' },
  intercept: { name: '요격 레이저', slot: 'sub', tier: '강화', val: 320, rate: 3, dmg: 0, range: 90, desc: '가까운 적 탄을 쏘아 떨어뜨린다.' },
  hturret: { name: '유도탄 포탑', slot: 'sub', tier: '강화', val: 320, rate: 0.8, dmg: 22, range: 320, desc: '느리지만 한 방이 센 유도탄.' },
  chain:   { name: '전기 사슬', slot: 'sub', tier: '강화', val: 340, rate: 1.2, dmg: 8, range: 140, desc: '가까운 적에게 번개. 주변 적 2기에게 튄다.' },
  gzcharge:{ name: '스침 충전', slot: 'sub', tier: '강화', val: 300, rate: 3, dmg: 4, range: 230, desc: '스칠 때마다 1.5초간 연사 2.5배.' },
  // 액티브 (Q/E)
  missile: { name: '미사일 포드', slot: 'act', tier: '일반', val: 200, cd: 8, desc: '유도 미사일 6발.' },
  purge:   { name: '정화 펄스', slot: 'act', tier: '일반', val: 220, cd: 12, desc: '주변 적 탄을 지운다.' },
  shield:  { name: '일시 방패', slot: 'act', tier: '일반', val: 240, cd: 14, desc: '1.5초 무적.' },
  emp:     { name: 'EMP 충격파', slot: 'act', tier: '일반', val: 220, cd: 7, desc: '앞쪽 짧은 부채꼴. 맞은 적은 2초 기절(이동·사격 불가).' },
  harpoon: { name: '작살 견인', slot: 'act', tier: '일반', val: 200, cd: 6, desc: '조준 방향의 적 하나를 내 앞으로 끌어온다. 잠깐 기절.' },
  dump:    { name: '비상 투기', slot: 'act', tier: '일반', val: 180, cd: 15, desc: '값싼 화물 2개를 버리고 1.2초 무적 + 2초간 이속 1.8배.' },
  cannon:  { name: '충전 캐논', slot: 'act', tier: '강화', val: 520, cd: 10, desc: '누르고 있으면 충전, 떼면 화면을 가르는 광선. 충전 중 느려진다.' },
  orbital: { name: '궤도 폭격', slot: 'act', tier: '강화', val: 560, cd: 14, desc: '커서 위치에 잠시 뒤 위성 포격 6발.' },
  reflect: { name: '탄막 반사', slot: 'act', tier: '강화', val: 540, cd: 12, desc: '2.5초간 닿는 적 탄을 적에게 되돌려 보낸다.' },
  gravity: { name: '중력 우물', slot: 'act', tier: '강화', val: 540, cd: 14, desc: '커서 위치에 3초간 적·적 탄·아이템을 끌어당긴다.' },
  overdrive: { name: '폭주 코어', slot: 'act', tier: '강화', val: 480, cd: 20, desc: '5초간 다른 쿨타임이 3배 빨리 돈다. 대신 받는 피해 2배.' },
  discharge: { name: '스침 방전', slot: 'act', tier: '강화', val: 500, cd: 6, desc: '지난 사용 뒤 스친 횟수만큼 번개를 쏜다.' },
  convert: { name: '탄 변환기', slot: 'act', tier: '강화', val: 500, cd: 18, desc: '주변 적 탄을 고철(많으면 금빛 회로)로 바꾼다.' },
  timestop:{ name: '탄막 정지', slot: 'act', tier: '전설', val: 1400, cd: 25, desc: '주변 적 탄이 2.5초 멈췄다가 느리게 움직인다.' },
  // 패시브
  sensor:  { name: '조준 센서', slot: 'pas', tier: '강화', val: 520, img: 'assets/sensor.png', desc: '탄 퍼짐 60% 감소, 주무기 탄속 +10%. 조준선이 붉고 좁아진다. 레이븐이 가끔 설계도를 떨군다.' },
  magnet:  { name: '자력 수집기', slot: 'pas', tier: '일반', val: 120, desc: '아이템 흡수 거리 2배.' },
  cooler:  { name: '냉각기', slot: 'pas', tier: '일반', val: 160, desc: '주무기 연사 +15%.' },
  plating: { name: '차폐 장갑', slot: 'pas', tier: '일반', val: 160, desc: '침식 상승 속도 -20%.' },
  engine2: { name: '추진 엔진', slot: 'pas', tier: '일반', val: 160, desc: '이동 속도 +12%.' },
  cargo:   { name: '화물칸 확장', slot: 'pas', tier: '일반', val: 180, desc: '화물칸 한 줄 추가.' },
  exitacc: { name: '탈출 가속기', slot: 'pas', tier: '일반', val: 160, desc: '탈출 카운트다운 30% 단축, 구역을 벗어나도 덜 줄어든다.' },
  shockplate: { name: '충격 장갑', slot: 'pas', tier: '일반', val: 180, desc: '가까운 적(80 이내)에게 피해 +20%, 기절 시간 +50%.' },
  barrier: { name: '베리어 발생기', slot: 'pas', tier: '강화', val: 260, desc: '4초간 안 맞으면 차오르는 보호막 40.' },
  counter: { name: '반격 장치', slot: 'pas', tier: '강화', val: 320, desc: '맞으면 주변 적 탄을 지우고 0.6초 더 무적. (5초마다)' },
  grazeamp:{ name: '스침 증폭기', slot: 'pas', tier: '강화', val: 300, desc: '스침 스택 보너스 상한 증가: 드랍 +40% → +60%, 피해 +20% → +30%.' },
  grazeflow:{ name: '스침 환류기', slot: 'pas', tier: '강화', val: 300, desc: '5번 스칠 때마다 액티브 쿨타임 -1초.' },
  redheart:{ name: '붉은 심장', slot: 'pas', tier: '강화', val: 300, desc: '체력 50% 이하일 때 주무기 피해 +30%.' },
  vault:   { name: '금고 장갑', slot: 'pas', tier: '강화', val: 320, desc: '화물 가치가 높을수록 받는 피해 감소 (최대 -25%).' },
  secure2: { name: '보안 확장', slot: 'pas', tier: '강화', val: 360, desc: '보안 칸 2×2 → 3×2.' },
  slowfield:{ name: '시간 감속기', slot: 'pas', tier: '강화', val: 340, desc: '판정 주변(60) 적 탄 속도 -15%.' },
  deflect: { name: '편향기', slot: 'pas', tier: '강화', val: 320, desc: '가까이 날아오는 적 탄이 조금씩 비껴간다.' },
  execute: { name: '처형 회로', slot: 'pas', tier: '강화', val: 320, desc: '기절한 적에게 주는 피해 +40%.' },
  raven:   { name: '레이븐 추진기', slot: 'pas', tier: '전설', val: 900, desc: '이동 +15%, 파일럿 기술 쿨타임 -20%.' },
  resonator:{ name: '침식 공명기', slot: 'pas', tier: '전설', val: 1200, desc: '침식 연사 페널티 무시. 침식 단계마다 피해 +10/25/45%.' },
};

// 제작법: 재료는 창고에서 소모
SA.RECIPES = {
  pulse:   { mats: { scrap: 4, wire: 1 } },
  scatter: { mats: { scrap: 5, wire: 1 } },
  lance:   { mats: { core: 2, wire: 1 } },
  twin:    { from: 'pulse', mats: { core: 2, prec: 1 } },
  shard:   { from: 'scatter', mats: { scrap: 6, prec: 2 } },
  rail:    { from: 'lance', mats: { engine: 1, prec: 2 } },
  glass:   { mats: { core: 2, goldchip: 1, prec: 2 } },
  crusher: { from: 'shard', mats: { ace: 2, prec: 3, engine: 1 } },
  breaker: { from: 'rail', mats: { ace: 2, prec: 3, crystal: 1 } },
  mg:      { mats: { scrap: 4, wire: 1 } },
  mine:    { mats: { scrap: 3, core: 1 } },
  flamer:  { mats: { core: 1, wire: 2 } },
  drone:   { mats: { engine: 1, wire: 2, prec: 1 } },
  sdrone:  { mats: { core: 1, wire: 2, prec: 1 } },
  intercept: { mats: { core: 2, prec: 1 } },
  hturret: { mats: { core: 1, engine: 1, prec: 1 } },
  chain:   { mats: { wire: 3, goldchip: 1, prec: 1 } },
  gzcharge:{ mats: { goldchip: 1, prec: 2 } },
  missile: { mats: { core: 1, scrap: 3 } },
  purge:   { mats: { crystal: 1, wire: 1 } },
  shield:  { mats: { core: 2 } },
  emp:     { mats: { core: 1, wire: 2 } },
  harpoon: { mats: { scrap: 4, wire: 2 } },
  dump:    { mats: { engine: 1, scrap: 2 } },
  cannon:  { mats: { core: 2, engine: 1, prec: 2 } },
  orbital: { mats: { goldchip: 2, core: 1, prec: 2 } },
  reflect: { mats: { crystal: 1, goldchip: 1, prec: 2 } },
  gravity: { mats: { crystal: 2, engine: 1, prec: 1 } },
  overdrive: { mats: { core: 3, prec: 1 } },
  discharge: { mats: { goldchip: 1, wire: 2, prec: 1 } },
  convert: { mats: { goldchip: 1, scrap: 4, prec: 1 } },
  timestop:{ mats: { ace: 3, crystal: 2, prec: 3 } },
  magnet:  { mats: { scrap: 4, core: 1 } },
  sensor:  { mats: { prec: 3, core: 2, wire: 2 } },
  cooler:  { mats: { wire: 2, scrap: 3 } },
  plating: { mats: { scrap: 8 } },
  engine2: { mats: { engine: 1 } },
  cargo:   { mats: { scrap: 6, wire: 1 } },
  exitacc: { mats: { engine: 1, wire: 1 } },
  shockplate: { mats: { scrap: 6, core: 1 } },
  barrier: { mats: { core: 2, wire: 2, prec: 1 } },
  counter: { mats: { core: 1, goldchip: 1, prec: 1 } },
  grazeamp:{ mats: { goldchip: 2, prec: 1 } },
  grazeflow:{ mats: { goldchip: 1, wire: 2, prec: 1 } },
  redheart:{ mats: { core: 2, crystal: 1, prec: 1 } },
  vault:   { mats: { scrap: 6, goldchip: 1, prec: 1 } },
  secure2: { mats: { goldchip: 2, prec: 2 } },
  slowfield:{ mats: { crystal: 2, prec: 2 } },
  deflect: { mats: { wire: 2, core: 1, prec: 1 } },
  execute: { mats: { goldchip: 1, core: 1, prec: 2 } },
  raven:   { mats: { ace: 2, goldchip: 2, engine: 1 } },
  resonator:{ mats: { ace: 2, crystal: 3, prec: 2 } },
};
SA.START_RECIPES = ['pulse', 'mg', 'magnet'];   // 처음 아는 제작법은 이것뿐 (임시). 나머지는 초반 퀘스트 보상·설계도 드랍으로
// 설계도 아이템은 부품마다 자동 생성. 등급별 풀에서 무작위로 떨어진다 (loot의 'bp:일반' 등)
SA.BP_POOL = { 일반: [], 강화: [], 전설: [] };
for (const id in SA.PARTS) {
  if (SA.START_RECIPES.includes(id)) continue;
  const d = SA.PARTS[id];
  if (!SA.ITEMS['bp_' + id]) SA.ITEMS['bp_' + id] = { name: '설계도: ' + d.name, w: 1, h: 1, val: { 일반: 100, 강화: 200, 전설: 400 }[d.tier], kind: 'bp', recipe: id, color: '#e6edf3', desc: '격납고에서 영구 해금된다. 이미 알면 판매.' };
  if (id !== 'raven' && id !== 'sensor') SA.BP_POOL[d.tier].push(id);   // 레이븐 전용 설계도는 일반 드랍 풀에서 뺀다
}
SA.ITEMS.bp_sensor.img = 'assets/bp_sensor.png';   // 도트 설계도 카드

// 기체. mount = 포탑/판정점 (도트 좌표, 0~1 비율)
SA.SHIPS = {
  hex:     { name: '헥스', role: '기본', price: 0, hp: 100, speed: 130, accel: 14, turn: 18, hitR: 2.5, sub: 2, act: 2, pas: 3, cargo: [4, 4],
             flames: [[11.5, 30.5], [21.5, 30.5]], img: 'assets/hex_hull.png', turretImg: 'assets/hex_turret.png', size: [32, 32], mount: [16.5 / 32, 18.5 / 32],
             subMounts: [[-9, 4], [9, 4]], desc: '모든 능력치가 평균. 지급 기체.' },
  swift:   { name: '스위프트', role: '고속', price: 5000, hp: 70, speed: 168, accel: 18, turn: 22, hitR: 2, sub: 1, act: 2, pas: 3, cargo: [3, 4],
             flames: [[10.5, 33]], img: 'assets/swift_hull.png', size: [21, 34], mount: [0.5, 0.587],
             subMounts: [[0, -8]], desc: '빠르고 판정이 작다. 맷집은 약하다.' },
  bastion: { name: '바스티온', role: '중장갑', price: 5500, hp: 160, speed: 104, accel: 9, turn: 7, hitR: 3, sub: 2, act: 2, pas: 4, cargo: [5, 5],
             flames: [[16.5, 33], [28, 33]], img: 'assets/bastion_hull.png', size: [44, 34], mount: [0.503, 0.523],
             subMounts: [[-14, 6], [14, 6]], desc: '느리지만 튼튼하다. 패시브 칸이 넉넉하다. 포탑 회전이 느리다.' },
  arsenal: { name: '아스날', role: '다소켓', price: 6000, hp: 60, speed: 130, accel: 14, turn: 18, hitR: 2.5, sub: 5, act: 2, pas: 5, cargo: [3, 3],
             flames: [[14.2, 35], [21.8, 35]], img: 'assets/arsenal_hull.png', size: [36, 37], mount: [0.5, 0.466],
             subMounts: [[-8.5, 2], [8.5, 2], [-13, 9.5], [13.5, 9.5], [0, 11.5]], desc: '포탑 소켓 5개가 알아서 쏜다. 실수 허용량 최저.' },
};

// 스침 스택 (모든 파일럿 공통, 임시 수치): 20스택마다 드랍 +5%·피해 +2%. 피격 시 스택 20% 감소
SA.GRAZE = { per: 20, drop: 0.05, dmg: 0.02, cap: [0.4, 0.2], capAmp: [0.6, 0.3], hitKeep: 0.8 };

SA.PILOTS = {
  kai:   { name: '카이', title: '회전왕', color: '#5dffb0', quote: '빙글 돌면, 탄이 알아서 비켜 간다.', skill: 'roll', cd: 4, cost: 0, desc: '배럴 롤: 0.4초 무적 + 이동 방향으로 미끄러짐.' },
  mina:  { name: '미나', title: '정비병', color: '#ffd166', quote: '고칠 수 있으면, 아직 안 끝난 거야.', skill: 'repair', cd: 15, cost: 0, desc: '자가수리: 3초간 감속, 체력 25% 회복.' },
  bruno: { name: '브루노', title: '돌격대장', color: '#ff8f3d', quote: '정면이 제일 안전해. 뒤에서 맞으면 아프거든.', skill: 'ram', cd: 6, cost: 400, desc: '램 돌진: 앞으로 돌진, 부딪힌 적에게 피해 + 경로의 탄 삭제.' },
  jet:   { name: '제트', title: '애프터버너', color: '#6ec6ff', quote: '빨리 가면, 그만큼 덜 맞아.', skill: 'boost', cd: 8, cost: 300, desc: '가속 부스트: 2초간 이동 +60%.' },
  silva: { name: '실바', title: '유령', color: '#b3a1ff', quote: '네가 쏜 자리엔, 이미 내가 없어.', skill: 'warp', cd: 5, cost: 500, desc: '단거리 워프: 커서 방향으로 순간이동.' },
  raven: { name: '레이븐', title: '옛 제자', color: '#ff4d6d', quote: '탄 사이엔 길이 있어요. 가르쳐 주신 대로.', skill: 'slip', cd: 18, cost: 0, hidden: true, desc: '슬립스트림: 3초간 이동을 AI가 맡아 탄 사이를 아슬아슬하게 빠져나간다(조준·사격은 직접). 그동안 피격 무효, 스치기 범위 2배, 스침 1회에 스택 +2, 스칠 때마다 쿨타임 -0.2초.' },
  // 파일럿이 모두 부상일 때만 나가는 직접 출격 (기술 없음, 침식 3배)
  cmdr:  { name: '단장', title: '직접 출격', color: '#8f9bb8', quote: '전원 부상이다. 그래도 누군가는 떠야 한다.', skill: null, cd: 0, cost: 0, hidden: true, desc: '파일럿 기술 없음. 침식이 3배 빠르게 찬다.' },
};
// 조난 구조 (임시 수치): 구조해야 얻는 인물들. 캡슐은 2x2, 탈출해야 구조 확정
SA.RESCUE = {
  teoBp: 5,                 // 테오 신호가 열리는 일반 설계도(시작 제작법 제외) 수 — 임시
  pilotEscapes: 3, chance0: 0.4, chanceUp: 0.2,   // 파일럿 신호: 직전 구조 후 탈출 3회부터 40%, 안 뜰 때마다 +20% — 임시
  hold: 10, speedMul: 0.9,  // 구조 유지 시간(초), 캡슐 운반 중 이속
  pilots: ['bruno', 'jet', 'silva'],
  targets: {
    teo:   { name: '정비사 테오', color: '#9fd4ff' },
    deliv: { name: '배달 상인 도리', color: '#ffd166' },
    bruno: { name: '브루노', color: '#ff8f3d' },
    jet:   { name: '제트', color: '#6ec6ff' },
    silva: { name: '실바', color: '#b3a1ff' },
  },
};
for (const id in SA.RESCUE.targets) {
  const t = SA.RESCUE.targets[id];
  SA.ITEMS['cap_' + id] = { name: '구조 캡슐: ' + t.name, w: 2, h: 2, val: 0, kind: 'capsule', color: t.color, desc: '탈출해야 구조가 확정된다. 들고 있으면 이속 -10%. 잃으면 다음 출격에 신호가 다시 뜬다.' };
}
// 네임드 레이븐 (임시 수치): 둥지에서 체력 30%가 되면 도주 → 다음 출격부터 다른 위치에서 재대결 → 격추하면 탈출 포드를 들고 탈출해야 완료
SA.RAVEN = { hp: 1500, fleeAt: 0.3, phase3At: 0.25, dodgeCd: [1.8, 1.5, 1.1],
  fleeDrops: [['goldchip', 1], ['prec', .6], ['bp:강화', .3]] };
SA.ITEMS.cap_raven = { name: '레이븐의 탈출 포드', w: 2, h: 2, val: 0, kind: 'capsule', color: '#ff4d6d', desc: '격추된 레이븐이 갇힌 탈출 포드. 들고 탈출해야 그를 붙잡는다. 들고 있으면 이속 -10%.' };
// 난파선 (임시): 아이템 하나당 0.9초, 마지막 한 개는 4초. 벗어나면 진행 중 게이지가 초당 0.6씩 줄어든다.
// 마지막 보상은 위에서부터 굴려 처음 당첨된 것 하나 (좋은 것 확률 높게)
SA.WRECK = { per: 0.9, last: 4, decay: 0.6, final: [['bp:강화', .1], ['goldchip', .3], ['bp:일반', .25], ['engine', .35], ['prec', 1]] };
// 윙맨 AI 공통 (임시): leash = 플레이어에게서 최대 거리, 세레나 후퇴/복귀 체력 비율, 탄 회피 확률, 볼크 도발 확률
SA.WING = { leash: 250, retreatAt: 0.35, backAt: 0.7, dodgeCmd: 0.95, dodgeAce: 0.3, taunt: 0.35 };
// 네임드 윙맨 (초안·임시 수치). 중립 의뢰로 함께 출격한다. 기체 그림은 진영 전투기 도트를 빌려 쓴다
SA.NAMED = {
  kingdom: { name: '세레나', title: '왕국 장군', color: '#8fb6ff', sprite: 'k_fighter', style: 'cmd', hp: 160, regen: 4, speed: 175, range: 320,
             rate: 2.6, shots: 1, spread: 0.01, dmg: 12, spd: 760,
             hello: '수송선이 먼저다. 내 뒤는 당신이 봐. …그 기동, 어디서 본 것 같은데.', coverOn: '붙겠다. 대신 맞아 주겠다니… 예전에도 그런 사람이 있었지.', coverOff: '흩어진다. 시야 넓게.',
             arrive: '도착이다. 하나만 묻지. 당신에게 그 비행을 가르친 사람, 아직 살아 있나?',
             down: '기체 손상… 이탈한다. 그 사람에게 전해. …아니, 됐다.',
             barks: { retreat: '손상 3할 초과. 잠시 물러난다. 앞을 맡아.', back: '복귀한다. 좌측으로 돈다.' } },
  empire:  { name: '볼크', title: '제국 돌격 에이스', color: '#ff7a6b', sprite: 'e_fighter', style: 'ace', hp: 180, regen: 4, speed: 185, range: 260,
             rate: 8, shots: 2, spread: 0.12, dmg: 3.5, spd: 560,
             hello: '제국 돌격대 볼크다. 사냥꾼 머리는 내 거다. 넌 뒤만 받쳐.', coverOn: '좋아, 방패는 네가 해라!', coverOff: '흩어져! 각자 사냥이다.',
             down: '젠장, 엔진이… 먼저 빠진다!',
             barks: { charge: '큰 놈이다! 내가 먼저 간다!', low: '아직 날 수 있어! 물러나는 건 제국 돌격대가 아니야!' } },
};
SA.CONVOY = { hp: 420, r: 18, speed: 42, waveEvery: 20, waveN: 3 };   // 호위 수송선 (임시)
SA.REPAIRKIT_DUR = 40;   // 수리킷을 부품에 쓰면 내구도 +40 (최대 내구도는 그대로)
SA.DEATH_PART_LOSS = 1;   // 격추 시 장착 부품 하나를 잃을 확률 (임시)
// 진영 호감도 (임시): 왕국·제국 의뢰 완료 시 그 진영 +10, 반대 진영 -5. 중립 의뢰는 영향 없음. 동시 수주 최대 3개
SA.REP = { gain: 10, loss: 5, maxActive: 3, massacre: { free: 10, per: 5, max: 5 } };   // 한 판에 같은 진영 10기 초과부터 5기마다 -1, 최대 -5
SA.CMDR_CORR = 3;
SA.INJURY_RAIDS = 2;

// 적. drops: [아이템, 확률]
SA.ENEMIES = {
  // 왕국군: 파란 회색 + 크림 띠, 정석적인 조준 사격 / 제국군: 검정 + 붉은 날개, 공격적인 연사
  k_fighter: { name: '왕국 전투기', faction: 'kingdom', ai: 'fighter', hp: 14, r: 9, speed: 95, img: 'assets/k_fighter.png', size: [26, 24],
               drops: [['scrap', .6], ['wire', .25], ['bp:일반', .02]] },
  e_fighter: { name: '제국 전투기', faction: 'empire', ai: 'fighter', hp: 16, r: 9, speed: 108, img: 'assets/e_fighter.png', size: [26, 24],
               drops: [['scrap', .6], ['core', .12], ['bp:일반', .02]] },
  k_frigate: { name: '왕국 프리깃', faction: 'kingdom', ai: 'frigate', hp: 110, r: 20, speed: 38, img: 'assets/k_frigate.png', size: [28, 48],
               drops: [['core', .55], ['wire', .5], ['prec', .3], ['scrap', .8], ['bp:일반', .05], ['bp:강화', .03]] },
  e_frigate: { name: '제국 순양함', faction: 'empire', ai: 'frigate', hp: 130, r: 20, speed: 34, img: 'assets/e_frigate.png', size: [34, 47],
               drops: [['core', .5], ['engine', .35], ['prec', .3], ['scrap', .8], ['bp:일반', .05], ['bp:강화', .03]] },
  k_turret:  { name: '왕국 포대', faction: 'kingdom', ai: 'turret', hp: 70, r: 12, speed: 0, img: 'assets/k_turret.png', size: [18, 25], pivot: [0.5, 0.67],
               drops: [['scrap', .7], ['wire', .3], ['core', .25], ['prec', .15]] },
  e_turret:  { name: '제국 쌍포대', faction: 'empire', ai: 'turret', hp: 60, r: 10, speed: 0, img: 'assets/e_turret.png', size: [14, 21], pivot: [0.5, 0.72],
               drops: [['scrap', .7], ['core', .3], ['prec', .15]] },
  m_turret:  { name: '폐광 포대', faction: 'mine', ai: 'turret', hp: 95, r: 13, speed: 0, img: 'assets/m_turret.png', size: [26, 33], pivot: [0.5, 0.57],
               drops: [['scrap', .8], ['engine', .25], ['core', .3], ['prec', .2], ['bp:일반', .04]] },
  corrode: { name: '침식체', ai: 'corrode', hp: 110, r: 11, speed: 80, color: '#b98cff', img: 'assets/corrode.png', size: [18, 32], drops: [['crystal', .4]] },
  hunter:  { name: '심연의 사냥꾼', ai: 'hunter', img: 'assets/hunter_0.png', anim: { n: 6, fps: 8 }, size: [64, 81], hp: 1400, r: 28, speed: 90, color: '#8a5cff', boss: true, drops: [['crystal', 1], ['crystal', 1], ['crystal', .5], ['ace', 1], ['ace', .4], ['bp:전설', .6], ['goldchip', 1], ['goldchip', .5]] },
  raven:   { name: '네임드 용병 레이븐', ai: 'raven', img: 'assets/raven_hull.png', size: [30, 27], pivot: [0.5, 0.5], hp: 1500, r: 12, speed: 150, color: '#ff4d6d', boss: true, drops: [['bp_raven', .5], ['bp_sensor', .3], ['ace', 1], ['ace', .4], ['bp:강화', .8], ['goldchip', 1], ['goldchip', .6], ['blackbox', .8], ['engine', .5]] },
};

// 침식 단계: at = 침식률 하한(%)
// 침식 진행 시간(일반): 안정 3:30 → 오염 2:30 → 침식 2:00 → 붕괴 1:30 (100%까지 약 9:30)
SA.CORROSION = [
  // 붕괴(90%)까지 약 6분 (임시). 침식체 리젠은 SA.CORRODE_SPAWN에서 단계별로 따로 정한다
  { at: 0,  name: '안정', fire: 1.0,  speed: 1.0,  rate: 30 / 158 },
  { at: 30, name: '오염', fire: 0.9,  speed: 1.0,  rate: 30 / 112 },
  { at: 60, name: '침식', fire: 0.8,  speed: 0.85, rate: 30 / 90, durDrain: true, hunterWake: true },
  { at: 90, name: '붕괴', fire: 0.65, speed: 0.75, rate: 10 / 68, durDrain: true, hpDrain: 1, hunter: true },
];
// 함선 리스폰 (임시): 왕국·제국 함선을 격추하면 delay초 뒤 그만큼의 '리스폰 점수'가 쌓이고, 점수로 편대를 화면 밖에서 부른다.
// 주변(near 이내) 위협 점수 합이 침식 단계별 상한(budget)을 넘으면 미룬다. 위협: 전투기 1, 프리깃 3, 침식체 1, 사냥꾼 4
SA.RESPAWN = { delay: [25, 35], near: 700, budget: [5, 6, 6, 7], threat: { fighter: 1, frigate: 3, turret: 1, corrode: 1, hunter: 4 },
  squads: [[0.6, ['fighter', 'fighter']], [0.25, ['fighter', 'fighter', 'fighter']], [0.15, ['frigate', 'fighter']]], dual: 0.2, dist: [430, 470] };
// 심연의 사냥꾼 (임시): 침식 2단계에 멀리서 깨어나 천천히 다가오고(stalk), 붕괴 단계·근접(wake)·피격 시 추격한다.
// 지나간 자리에 침식 장판을 남긴다: 밟으면 초당 체력 -pool.dps, 침식 +pool.corr%. 체력 50%에서 광폭화
SA.HUNTER = { spawnDist: [900, 1150], stalk: 30, hunt: 90, rage: 110, rageAt: 0.5, wake: 320,
  pool: { every: 0.45, r: 24, rRage: 32, life: 12, dps: 8, corr: 0.5 } };
// 침식체 리젠 (왕국·제국 함선 리젠과 별개). every초마다 n기, 동시에 max기까지 (임시)
SA.CORRODE_SPAWN = [null, { every: 18, n: 1, max: 3 }, { every: 10, n: 1, max: 5 }, { every: 6, n: 2, max: 8 }];

SA.SHOP = {
  consumables: [['canister', 150], ['repairkit', 120]],
  delivery: { every: 20 * 60 * 1000, mul: 2.5, kinds: 4, pool: ['scrap', 'wire', 'core', 'engine', 'goldchip', 'prec'], rare: [['crystal', .2], ['ace', .05]] },
};

SA.MAPS = {
  mine: { name: '폐광 소행성대', act: 1, sx: 6, sy: 6, desc: '튜토리얼 겸 파밍 맵. 소행성이 엄폐물. 침식이 느리다.' },
  front: { name: '전선 궤도', act: 2, locked: true },
  grave: { name: '함대 묘지', act: 3, locked: true },
  abyss: { name: '심연 균열', act: 4, locked: true },
};
