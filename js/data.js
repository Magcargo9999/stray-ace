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
  wire:     { name: '전선 다발', w: 2, h: 1, val: 45, kind: 'mat', img: 'assets/i_wire.png', color: '#c9a65b', desc: '왕국 규격 피복. 제국 함선에서 뜯어도 같은 규격이다.' },
  core:     { name: '코어', w: 1, h: 2, val: 90, kind: 'mat', img: 'assets/i_core.png', color: '#5b9bd5', desc: '함선의 심장. 아직 따뜻하다.' },
  engine:   { name: '엔진', w: 2, h: 2, val: 160, kind: 'mat', img: 'assets/i_engine.png', color: '#d58a5b', desc: '제국 공방 각인이 긁혀 지워져 있다.' },
  goldchip: { name: '금빛 회로', w: 1, h: 1, val: 180, kind: 'mat', tier: '강화', color: '#ffd166', desc: '작고 비싸다. 용병들이 제일 먼저 챙기는 것.' },
  prec:     { name: '정밀 부품', w: 1, h: 1, val: 120, kind: 'mat', tier: '강화', color: '#7fd3ff', desc: '군용 규격 베어링과 회로. 강화 부품에 들어간다.' },
  ace:      { name: '에이스 각인', w: 1, h: 1, val: 400, kind: 'mat', tier: '행성', color: '#ff4d6d', desc: '이름 있는 자의 기체에서 뜯어낸 각인. 행성 부품에 들어간다.' },
  raven_ticket: { name: '레이븐 고용권', w: 2, h: 1, val: 0, kind: 'ticket', img: 'assets/raven_ticket.png', color: '#c49ac0', desc: '창고에서 사용하면 레이븐이 용병단에 합류한다.' },
  crystal:  { name: '침식 결정', w: 1, h: 1, val: 220, kind: 'mat', tier: '강화', img: 'assets/i_crystal.png', color: '#b98cff', desc: '침식체가 남긴 결정. 만지면 손끝이 저린다.' },
  debris:   { name: '대형 잔해', w: 2, h: 3, val: 300, kind: 'mat', color: '#9aa3ad', desc: '크고 무겁고 비싸다. 화물칸이 운다.' },
  blackbox: { name: '블랙박스 (왕국 정찰선)', w: 1, h: 1, val: 150, kind: 'lore', img: 'assets/i_blackbox.png', color: '#ff8f3d', desc: '추락한 왕국 정찰선의 기록 장치. 팔거나, 격납고에서 해독하거나.' },
  bb_raven:  { name: '블랙박스 (레이븐)', w: 1, h: 1, val: 200, kind: 'lore', img: 'assets/i_blackbox.png', color: '#ff4d6d', desc: '레이븐 기체의 비행 기록 장치. 해독하면 그녀의 개인 로그가 나온다.' },
  bb_mimic:  { name: '블랙박스 (실험 무인기)', w: 1, h: 1, val: 200, kind: 'lore', img: 'assets/i_blackbox.png', color: '#c08bff', desc: '제국 실험 무인기의 학습 기록 장치.' },
  bb_empire: { name: '블랙박스 (제국 순양함)', w: 1, h: 1, val: 150, kind: 'lore', img: 'assets/i_blackbox.png', color: '#ff8f3d', desc: '제국 순양함의 기록 장치. 함장의 보고서가 남아 있을지도.' },
  bb_hunter: { name: '블랙박스 (심연)', w: 1, h: 1, val: 250, kind: 'lore', img: 'assets/i_blackbox.png', color: '#8a5cff', desc: '사냥꾼의 몸속에 박혀 있던 기록 장치. 차갑다.' },
  canister: { name: '정화 캐니스터', w: 1, h: 2, val: 70, kind: 'use', img: 'assets/i_canister.png', color: '#7ff0e0', desc: '사용: 침식률 -25%.' },
  repairkit:{ name: '수리킷', w: 1, h: 1, val: 60, kind: 'use', img: 'assets/i_repairkit.png', color: '#9df07f', desc: '사용: 체력 40 회복. Tab 화물칸에서 장착 부품에 끌어다 놓으면 그 부품 내구도 +40.' },
  // 상위 재료: 하위 재료 2~3개를 합성 (설계도 없이). 강화·행성 부품 제작에 들어간다 (임시)
  alloy:    { name: '강화 합금', w: 1, h: 1, val: 160, kind: 'umat', tier: '강화', color: '#9fd8c8', desc: '고철을 코어 열로 다시 녹여 만든 판재. 강화 부품의 뼈대.' },
  fcore:    { name: '융합 코어', w: 1, h: 2, val: 260, kind: 'umat', tier: '강화', color: '#6fb7ff', desc: '코어 둘을 엔진 냉각관으로 묶었다. 강화 액티브·서브웨폰에 들어간다.' },
  qcircuit: { name: '양자 회로', w: 1, h: 1, val: 520, kind: 'umat', tier: '행성', color: '#ffd166', desc: '금빛 회로 위에 침식 결정을 얹은 기판. 행성 부품의 심장.' },
  stardata: { name: '성구 데이터', w: 1, h: 1, val: 120, kind: 'data', tier: '일반', color: '#a8c8ff', desc: '사용: 이 구역의 지도를 한 번에 밝힌다 (소행성·장소 전부).' },
  bb_reward: { name: '신호 블랙박스', w: 1, h: 1, val: 150, kind: 'lore', tier: '강화', color: '#ffb347', desc: '좌표가 남아 있는 블랙박스. 기지에서 해독하면 다음 출격 맵에 신호 지점이 뜬다.' },
  // 해독키: 필드에서 줍고 기지에서 보안해독기에 '등록'한다. 등록하면 사용 횟수가 생기고, 다 쓰면 상점에서 충전한다
  key_box1: { name: '상자 해독키 (일반)', w: 1, h: 1, val: 80, kind: 'key', tier: '일반', code: 'box1', color: '#9fb3c8', desc: '일반 등급 잠긴 상자의 코드 칩. 기지에서 등록하면 보안해독기로 5번 연다.' },
  key_box2: { name: '상자 해독키 (강화)', w: 1, h: 1, val: 220, kind: 'key', tier: '강화', code: 'box2', color: '#5dffb0', desc: '강화 등급 잠긴 상자의 코드 칩. 등록하면 3번. 2막 보급고에서 주로 쓰인다.' },
  key_box3: { name: '상자 해독키 (행성)', w: 1, h: 1, val: 600, kind: 'key', tier: '행성', code: 'box3', color: '#ffd166', desc: '행성 등급 잠긴 상자의 코드 칩. 등록하면 1번. 3막의 금고 규격이다.' },
  key_zone: { name: '왕국 산하 행성 해독키', w: 1, h: 1, val: 300, kind: 'key', tier: '강화', code: 'zone', color: '#8fb6ff', desc: '보안 구역 역장의 출입 코드. 어째서 이런 폐광 소행성대에 왕국 산하 행성의 해독키가…? 등록하면 3번.' },
  // 동력원: 주무기 에너지. 장착 1개 + 예비는 화물칸. 기지에 돌아오면 무료로 가득 찬다. cap = 펄스건 연사 기준 초, dmg = 주무기 피해 배율 (임시)
  cell1:    { name: '동력원 (일반)', w: 1, h: 1, val: 60, kind: 'cell', tier: '일반', cap: 90, dmg: 1.0, color: '#7fe3ff', desc: '주무기 에너지. 펄스건으로 약 90초. 피해 ×1.0. R로 교체.' },
  cell2:    { name: '동력원 (강화)', w: 1, h: 1, val: 180, kind: 'cell', tier: '강화', cap: 150, dmg: 1.2, color: '#5dffb0', desc: '주무기 에너지. 펄스건으로 약 150초. 피해 ×1.2. R로 교체.' },
  cell3:    { name: '동력원 (행성)', w: 1, h: 1, val: 420, kind: 'cell', tier: '행성', cap: 240, dmg: 1.4, color: '#ffd166', desc: '주무기 에너지. 펄스건으로 약 240초. 피해 ×1.4. R로 교체.' },
  cell4:    { name: '동력원 (은하)', w: 1, h: 1, val: 900, kind: 'cell', tier: '은하', cap: 330, dmg: 1.6, color: '#c08bff', desc: '주무기 에너지. 펄스건으로 약 330초. 피해 ×1.6. 심연 핵으로 만든다. R로 교체.' },
  // 보스 재료: 은하 각성에 들어간다 (보스마다 각성 규칙 1개)
  chip:     { name: '비행 기록 칩', w: 1, h: 1, val: 600, kind: 'umat', tier: '은하', color: '#ff8fb0', desc: '레이븐의 회피 기동이 통째로 기록된 칩. 은하 부품에 넣으면 스칠 때마다 위력이 오른다 (레이븐 각성).' },
  abyss:    { name: '심연 핵', w: 1, h: 1, val: 700, kind: 'umat', tier: '은하', color: '#a06bff', desc: '사냥꾼의 몸속에서 뛰던 것. 은하 부품에 넣으면 침식이 깊을수록 위력이 오른다 (심연 각성).' },
  bp_raven:   { name: '설계도: 레이븐 추진기', w: 1, h: 1, val: 300, kind: 'bp', recipe: 'raven', color: '#ffd166', desc: '네임드 용병 레이븐의 추진기. 그는 이걸로 탄 사이를 미끄러졌다.' },
};

// 장비 부품. slot: main/sub/act/pas
// 부품. 수치는 임시 (밸런스 조정 예정). 효과 구현은 combat.js
// 부품: 일반·강화는 서로 다른 독립 부품. 행성·은하는 같은 부품을 키운 것 (lv 1·2, 아래 SA.UPGRADE)
// 패시브 fx = 효과 수치 (행성 ×1.3, 은하 ×1.6, 은하 각성도 곱해짐). noUp = 수치가 없어 키울 수 없는 부품
SA.PARTS = {
  // 주무기 (초당 피해: 일반 기준 펄스건 54)
  pulse:   { name: '펄스건', slot: 'main', tier: '일반', val: 150, rate: 9, dmg: 6, spd: 520, spread: 0.03, shots: 1, desc: '기본 연사. 초당 약 54.' },
  scatter: { name: '산탄포', slot: 'main', tier: '일반', val: 220, rate: 2.4, dmg: 5, spd: 430, spread: 0.32, shots: 6, life: 0.45, desc: '가까울수록 강하다. 근접 초당 약 72.' },
  lance:   { name: '관통 레이저', slot: 'main', tier: '일반', val: 240, rate: 3.2, dmg: 15, spd: 760, spread: 0, shots: 1, pierce: 3, desc: '적을 3기까지 관통. 초당 약 48.' },
  sniper:  { name: '저격총', slot: 'main', tier: '강화', val: 560, rate: 0.833, dmg: 150, spd: 1150, spread: 0.02, shots: 1, life: 1.2, sniper: true, desc: '한 발 150, 1.2초에 1발. 우클릭으로 끝까지 정조준하면 피해 ×1.5. 에너지를 많이 먹는다.' },
  glass:   { name: '유리 대포', slot: 'main', tier: '강화', val: 480, rate: 6, dmg: 14, spd: 620, spread: 0.03, shots: 1, desc: '초당 약 84로 아주 세다. 대신 맞을 때마다 장착 부품 내구도가 크게 깎인다.' },
  beam:    { name: '지속 광선', slot: 'main', tier: '강화', val: 520, rate: 10, dmg: 7.5, spd: 0, spread: 0, shots: 1, beam: 270, desc: '누르고 있으면 이어지는 광선. 맨 앞의 적 하나를 계속 태운다 (초당 약 75, 사거리 270). 에너지를 많이 먹는다.' },
  swarm:   { name: '군집 미사일', slot: 'main', tier: '강화', val: 520, rate: 1.5, dmg: 8, spd: 240, spread: 0.5, shots: 4, life: 2.2, homing: 5, desc: '작은 유도 미사일 4발을 연달아 쏜다 (초당 약 48, 거의 다 맞는다).' },
  // 서브웨폰 (자동)
  mg:      { name: '기관포 포탑', slot: 'sub', tier: '일반', val: 120, rate: 4, dmg: 3, range: 230, desc: '가장 가까운 적을 자동 조준. 초당 약 12.' },
  mine:    { name: '지뢰 투하기', slot: 'sub', tier: '일반', val: 150, rate: 0.45, dmg: 30, range: 0, desc: '지나간 자리에 지뢰를 깐다. 쫓아오는 적에게.' },
  flamer:  { name: '화염 방사 포탑', slot: 'sub', tier: '일반', val: 160, rate: 14, dmg: 1.6, range: 75, desc: '사거리는 짧지만 초당 피해가 높다 (약 22).' },
  drone:   { name: '추적 드론', slot: 'sub', tier: '강화', val: 300, rate: 2.5, dmg: 6, range: 260, leash: 150, desc: '적에게 날아가 붙어서 쏜다. 기체에서 150까지 떨어질 수 있어 엄폐 뒤의 적도 잡는다.' },
  sdrone:  { name: '방패 드론', slot: 'sub', tier: '강화', val: 300, rate: 4, dmg: 3, range: 200, desc: '기체 가까이를 돌며 다가오는 적 탄을 몸으로 지운다(초당 4발까지). 공격은 약하다.' },
  intercept: { name: '요격 레이저', slot: 'sub', tier: '강화', val: 320, rate: 3, dmg: 0, range: 90, desc: '주변 90 안의 적 탄을 골라 쏘아 떨어뜨린다 (초당 3발).' },
  hturret: { name: '유도탄 포탑', slot: 'sub', tier: '강화', val: 320, rate: 0.8, dmg: 22, range: 320, desc: '느리지만 한 방이 센 유도탄.' },
  chain:   { name: '전기 사슬', slot: 'sub', tier: '강화', val: 340, rate: 1.2, dmg: 8, range: 140, desc: '가까운 적에게 번개. 주변 적 2기에게 튄다.' },
  // 액티브 (Q/E). 행성·은하는 쿨타임이 짧아진다
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
  timestop:{ name: '탄막 정지', slot: 'act', tier: '강화', val: 600, cd: 25, desc: '주변 적 탄이 2.5초 멈췄다가 느리게 움직인다.' },
  // 패시브
  magnet:  { name: '자력 수집기', slot: 'pas', tier: '일반', val: 120, fx: 1.0, desc: '아이템 흡수 거리 +{0}%.' },
  cooler:  { name: '냉각기', slot: 'pas', tier: '일반', val: 160, fx: 0.15, desc: '주무기 연사 +{0}%.' },
  plating: { name: '차폐 장갑', slot: 'pas', tier: '일반', val: 160, fx: [0.2, 0.3], desc: '침식 상승 속도 -{0}%, 침식 디버프 -{1}% (연사·이속 감소, 내구도·체력 감소).' },
  engine2: { name: '추진 엔진', slot: 'pas', tier: '일반', val: 160, fx: 0.12, desc: '이동 속도 +{0}%.' },
  cargo:   { name: '화물칸 확장', slot: 'pas', tier: '일반', val: 180, noUp: true, desc: '화물칸 한 줄 추가.' },
  exitacc: { name: '탈출 가속기', slot: 'pas', tier: '일반', val: 150, fx: 0.3, desc: '귀환 포트 카운트다운 -{0}%, 포트를 벗어나도 덜 줄어든다.' },
  shockplate: { name: '충격 장갑', slot: 'pas', tier: '일반', val: 180, fx: [0.2, 0.5], desc: '가까운 적(80 이내)에게 피해 +{0}%, 기절 시간 +{1}%.' },
  sensor:  { name: '조준 센서', slot: 'pas', tier: '강화', val: 420, img: 'assets/sensor.png', fx: [0.6, 0.1], desc: '탄 퍼짐 -{0}%, 주무기 탄속 +{1}%. 조준선이 붉고 좁아진다.' },
  decoder: { name: '보안해독기', slot: 'pas', tier: '강화', val: 480, noUp: true, desc: '등록된 해독 코드로 잠긴 상자·보안 구역을 연다. 보안상자는 해독기만 있으면 해킹으로 연다 (5초 버티기).' },
  barrier: { name: '베리어 발생기', slot: 'pas', tier: '강화', val: 300, fx: 40, desc: '4초간 안 맞으면 차오르는 보호막 {v}.' },
  counter: { name: '반격 장치', slot: 'pas', tier: '강화', val: 320, fx: 0.6, desc: '맞으면 주변 적 탄을 지우고 {v}초 더 무적 (5초마다).' },
  grazeamp:{ name: '스침 증폭기', slot: 'pas', tier: '강화', val: 300, fx: [0.2, 0.1], desc: '스침 스택 보너스 상한: 드랍 +{0}%p, 피해 +{1}%p.' },
  grazeflow:{ name: '스침 환류기', slot: 'pas', tier: '강화', val: 300, fx: 1, desc: '5번 스칠 때마다 액티브 쿨타임 -{v}초.' },
  redheart:{ name: '붉은 심장', slot: 'pas', tier: '강화', val: 300, fx: 0.3, desc: '체력 50% 이하일 때 주무기 피해 +{0}%.' },
  vault:   { name: '금고 장갑', slot: 'pas', tier: '강화', val: 320, fx: 0.25, desc: '화물 가치가 높을수록 받는 피해 감소 (최대 -{0}%).' },
  secure2: { name: '보안 확장', slot: 'pas', tier: '강화', val: 360, noUp: true, desc: '보안 칸 2×2 → 3×2.' },
  deflect: { name: '편향기', slot: 'pas', tier: '강화', val: 340, fx: [1, 0.15], desc: '가까이 날아오는 적 탄이 비껴가고(세기 ×{v0}), 판정 주변 적 탄 속도 -{1}%.' },
  execute: { name: '처형 회로', slot: 'pas', tier: '강화', val: 320, fx: 0.4, desc: '기절한 적에게 주는 피해 +{0}%.' },
  raven:   { name: '레이븐 추진기', slot: 'pas', tier: '강화', val: 560, fx: [0.15, 0.2], desc: '이동 +{0}%, 파일럿 기술 쿨타임 -{1}%. 레이븐 합류 보상.' },
  resonator:{ name: '침식 공명기', slot: 'pas', tier: '강화', val: 600, fx: [0.1, 0.25, 0.45], desc: '침식 연사 페널티 무시. 침식 단계마다 피해 +{0}/{1}/{2}%.' },
  // 관측 장비 (전용 1칸): Z로 화면 배율. 행성·은하로 키우면 한 단계씩 더 넓게 본다
  obs1:    { name: '광역 관측기', slot: 'obs', tier: '일반', val: 200, desc: 'Z: 화면을 넓게 본다 (일반 1단계 · 행성 2단계 · 은하 3단계 + 보스 항상 표시). 미니맵 레이더 600/900/1200.' },
};

// 제작법 (일반·강화 부품만. 행성·은하는 SA.UPGRADE로 키운다). 재료는 창고에서 소모
SA.RECIPES = {
  pulse:   { mats: { scrap: 4, wire: 1 } },
  scatter: { mats: { scrap: 5, wire: 1 } },
  lance:   { mats: { core: 2, wire: 1 } },
  sniper:  { mats: { prec: 2, core: 1, engine: 1 } },
  glass:   { mats: { core: 2, goldchip: 1, prec: 2 } },
  beam:    { mats: { core: 2, prec: 2, wire: 1 } },
  swarm:   { mats: { engine: 1, core: 1, prec: 2 } },
  mg:      { mats: { scrap: 4, wire: 1 } },
  mine:    { mats: { scrap: 3, core: 1 } },
  flamer:  { mats: { core: 1, wire: 2 } },
  drone:   { mats: { engine: 1, wire: 2, prec: 1 } },
  sdrone:  { mats: { core: 1, wire: 2, prec: 1 } },
  intercept: { mats: { core: 2, prec: 1 } },
  hturret: { mats: { core: 1, engine: 1, prec: 1 } },
  chain:   { mats: { wire: 3, goldchip: 1, prec: 1 } },
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
  timestop:{ mats: { ace: 1, crystal: 2, prec: 2 } },
  magnet:  { mats: { scrap: 4, core: 1 } },
  cooler:  { mats: { wire: 2, scrap: 3 } },
  plating: { mats: { scrap: 8 } },
  engine2: { mats: { engine: 1 } },
  cargo:   { mats: { scrap: 6, wire: 1 } },
  exitacc: { mats: { engine: 1, wire: 1 } },
  shockplate: { mats: { scrap: 6, core: 1 } },
  sensor:  { mats: { prec: 3, core: 2, wire: 2 } },
  decoder: { mats: { prec: 2, wire: 2, goldchip: 1 } },
  barrier: { mats: { core: 2, wire: 2, prec: 1 } },
  counter: { mats: { core: 1, goldchip: 1, prec: 1 } },
  grazeamp:{ mats: { goldchip: 2, prec: 1 } },
  grazeflow:{ mats: { goldchip: 1, wire: 2, prec: 1 } },
  redheart:{ mats: { core: 2, crystal: 1, prec: 1 } },
  vault:   { mats: { scrap: 6, goldchip: 1, prec: 1 } },
  secure2: { mats: { goldchip: 2, prec: 2 } },
  deflect: { mats: { wire: 2, core: 1, crystal: 1, prec: 1 } },
  execute: { mats: { goldchip: 1, core: 1, prec: 2 } },
  raven:   { mats: { ace: 1, goldchip: 2, engine: 1 } },
  resonator:{ mats: { ace: 1, crystal: 2, prec: 2 } },
  obs1:    { mats: { wire: 2, prec: 1 } },
};

// ── 등급 · 행성/은하 강화 · 개조 · 각성 ──
SA.TIERS = ['일반', '강화', '행성', '은하'];
SA.TIER_COL = { 일반: '#9fb3c8', 강화: '#5dffb0', 행성: '#ffd166', 은하: '#c08bff' };
SA.LV_MUL = [1, 1.3, 1.6];      // 주 스탯·패시브 효과 배율 (기준 / 행성 / 은하)
// 액티브 범위·지속 배율 (행성 +15%, 은하 +30%) — 쿨타임 단축은 LV_MUL로 따로 적용 (임시)
SA.LV_RANGE = [1, 1.15, 1.3];
SA.LV_MAX = [100, 120, 150];    // 최대 내구도
SA.LV_VAL = [1, 2, 3.5];        // 가치 배율
SA.partTier = (p) => p.lv === 2 ? '은하' : p.lv === 1 ? '행성' : SA.PARTS[p.id].tier;
SA.itemVal = (it) => Math.round(SA.ITEMS[it.id].val * SA.LV_VAL[it.lv || 0]);   // 화물 아이템 가치 (행성급 부품 완성품 포함)
SA.partVal = (p) => Math.round(SA.PARTS[p.id].val * SA.LV_VAL[p.lv || 0]);
SA.canUp = (id) => { const d = SA.PARTS[id]; return !!d && !d.noUp; };
// 패시브 fx 값 (i번째) × 배율
SA.fxv = (id, i = 0, mul = 1) => { const f = SA.PARTS[id].fx; const v = Array.isArray(f) ? f[i] : f; return (v || 0) * mul; };
SA.partDesc = (id, lv = 0) => {
  const d = SA.PARTS[id], m = SA.LV_MUL[lv || 0], r2 = (x) => Math.round(x * 100) / 100;
  return d.desc.replace(/\{v(\d?)\}/g, (_, i) => r2(SA.fxv(id, +i || 0, m))).replace(/\{(\d)\}/g, (_, i) => Math.round(SA.fxv(id, +i, m) * 100));
};
// 행성 개조: 칸마다 공용 4개 + 계열 전용 (only). 수치 임시
SA.MODS = {
  // 주무기 공용
  m_rapid: { slot: 'main', name: '속사', desc: '연사 +25%, 한 발 피해 -10%.' },
  m_eco:   { slot: 'main', name: '절전', desc: '에너지 소모 -35%.' },
  m_long:  { slot: 'main', name: '장거리', desc: '탄속·사거리 +35%.' },
  m_stun:  { slot: 'main', name: '충격탄', desc: '맞은 적이 10% 확률로 0.6초 기절.' },
  // 주무기 전용
  m_twin:   { slot: 'main', only: ['pulse'], name: '2연장', desc: '두 줄로 쏜다. 한 발 피해 ×0.6 (합 ×1.2).' },
  m_frag:   { slot: 'main', only: ['scatter'], name: '파편', desc: '맞은 탄이 파편 3개로 터진다 (파편 피해 25%). 몰려 있는 적에게 강하다.' },
  m_crush:  { slot: 'main', only: ['scatter'], name: '근접 분쇄', desc: '가까운 적(70)에게 피해 2배, 기절한 적에게 1.5배.' },
  m_pierce: { slot: 'main', only: ['lance'], name: '완전 관통', desc: '적을 전부 관통하고 탄속 +25%.' },
  m_cut:    { slot: 'main', only: ['lance'], name: '탄막 절단', desc: '지나간 자리의 적 탄을 지운다.' },
  m_spierce:{ slot: 'main', only: ['sniper'], name: '관통 저격', desc: '적을 전부 관통한다.' },
  m_quick:  { slot: 'main', only: ['sniper'], name: '빠른 정조준', desc: '정조준 시간 절반.' },
  m_tough:  { slot: 'main', only: ['glass'], name: '강화 유리', desc: '맞을 때 장착 부품 내구도 손상이 절반.' },
  m_thick:  { slot: 'main', only: ['beam'], name: '굵은 광선', desc: '광선이 적 3기까지 관통하고, 닿는 적 탄을 지운다.' },
  m_more:   { slot: 'main', only: ['swarm'], name: '+2발', desc: '한 번에 6발을 쏜다. 한 발 피해 ×0.8 (합 ×1.2).' },
  // 서브웨폰 공용
  s_range: { slot: 'sub', name: '사거리', desc: '사거리 +40%.' },
  s_rate:  { slot: 'sub', name: '연사', desc: '연사 +30%.' },
  s_stun:  { slot: 'sub', name: '충격', desc: '맞은 적이 10% 확률로 0.6초 기절.' },
  s_dur:   { slot: 'sub', name: '내구', desc: '내구도 소모 절반.' },
  // 서브 전용
  s_graze: { slot: 'sub', only: ['mg'], name: '스침 연동', desc: '스칠 때마다 1.5초간 연사 2.5배.' },
  s_big:   { slot: 'sub', only: ['mine'], name: '대형 지뢰', desc: '폭발 범위 2배.' },
  s_burn:  { slot: 'sub', only: ['flamer'], name: '화상', desc: '맞은 적이 3초간 초당 4 피해로 탄다.' },
  s_two:   { slot: 'sub', only: ['drone'], name: '2기', desc: '드론이 2기가 된다.' },
  s_wide:  { slot: 'sub', only: ['sdrone'], name: '넓은 방패', desc: '탄을 지우는 범위 2배.' },
  s_ret:   { slot: 'sub', only: ['intercept'], name: '반격', desc: '떨어뜨린 탄의 절반을 가까운 적에게 되쏜다.' },
  s_dbl:   { slot: 'sub', only: ['hturret'], name: '2연발', desc: '유도탄을 2발씩 쏜다.' },
  s_jump:  { slot: 'sub', only: ['chain'], name: '연쇄', desc: '번개가 튀는 수 +2.' },
  // 액티브 공용
  a_cd:    { slot: 'act', name: '쿨타임', desc: '쿨타임 -20%.' },
  a_two:   { slot: 'act', name: '2회 충전', desc: '2번까지 모아 둔다 (쿨타임 1.5배).' },
  a_inv:   { slot: 'act', name: '회피', desc: '사용하면 0.5초 무적.' },
  a_gz:    { slot: 'act', name: '스침 점화', desc: '사용하면 스침 스택 +10.' },
  // 액티브 전용 (부품마다 1개)
  a_m10:   { slot: 'act', only: ['missile'], name: '10발', desc: '미사일 10발.' },
  a_conv:  { slot: 'act', only: ['purge'], name: '변환', desc: '지운 탄 10개마다 고철 1개 (최대 4), 40개 이상이면 금빛 회로.' },
  a_refl:  { slot: 'act', only: ['shield'], name: '반사막', desc: '방패 동안 닿는 적 탄을 되돌려 보낸다.' },
  a_round: { slot: 'act', only: ['emp'], name: '원형', desc: '부채꼴 대신 주변 전체(100)를 기절시킨다.' },
  a_chain: { slot: 'act', only: ['harpoon'], name: '연쇄 작살', desc: '앞쪽 적을 3기까지 끌어온다.' },
  a_free:  { slot: 'act', only: ['dump'], name: '무투기', desc: '화물을 버리지 않고 발동한다.' },
  a_half:  { slot: 'act', only: ['cannon'], name: '급속 충전', desc: '충전 속도 2배.' },
  a_o10:   { slot: 'act', only: ['orbital'], name: '10발', desc: '포격 10발.' },
  a_home:  { slot: 'act', only: ['reflect'], name: '유도 반사', desc: '되돌린 탄이 적을 쫓아가고 피해 2배.' },
  a_gstun: { slot: 'act', only: ['gravity'], name: '압착', desc: '우물에 끌려온 적이 기절한다.' },
  a_od:    { slot: 'act', only: ['overdrive'], name: '안정화', desc: '받는 피해 2배 → 1.3배.' },
  a_dpierce:{ slot: 'act', only: ['discharge'], name: '관통 방전', desc: '번개가 맞은 적 뒤로 한 번 더 튄다.' },
  a_t4:    { slot: 'act', only: ['timestop'], name: '4초', desc: '탄이 4초 멈춘다.' },
};
SA.modsFor = (id) => { const d = SA.PARTS[id]; if (!d || !['main', 'sub', 'act'].includes(d.slot)) return []; return Object.keys(SA.MODS).filter(k => SA.MODS[k].slot === d.slot && (!SA.MODS[k].only || SA.MODS[k].only.includes(id))); };
SA.randMod = (id) => { const l = SA.modsFor(id); return l.length ? l[Math.floor(Math.random() * l.length)] : null; };
// 은하 각성: 넣은 보스 재료에 따라 하나. 2·3막 보스는 규칙만 여기에 추가
SA.AWAKEN = {
  raven:  { name: '레이븐 각성', mat: 'chip', desc: '스칠 때마다 이 부품 위력 +3% (최대 +30%, 맞으면 초기화).' },
  hunter: { name: '심연 각성', mat: 'abyss', desc: '침식 단계마다 이 부품 위력 +10%. 침식으로 이 부품 내구도가 깎이지 않는다.' },
};
// 강화 비용 (임시, 중간 수준). 행성: 기준 부품 + 상위 재료 2 + 양자 회로 1 + 기준가 / 은하: 양자 회로 2 + 보스 재료 + 침식 결정 3 + 기준가 ×2
SA.UPGRADE = {
  cost: (p, awk) => {
    const d = SA.PARTS[p.id], um = (d.slot === 'act' || d.slot === 'sub') ? 'fcore' : 'alloy';
    if (!p.lv) return { mats: { [um]: 1, qcircuit: 1 }, cr: d.val };   // 첫 행성 업그레이드 문턱을 낮춤 (임시)
    return { mats: Object.assign({ qcircuit: 2, crystal: 3 }, awk ? { [SA.AWAKEN[awk].mat]: 1 } : {}), cr: d.val * 2 };
  },
  modCost: (p) => { const d = SA.PARTS[p.id]; return { mats: { [(d.slot === 'act' || d.slot === 'sub') ? 'fcore' : 'alloy']: 1 }, cr: Math.round(d.val * 0.5) }; },
};
// 부품 설명 전체 (등급 효과 · 개조 · 각성 포함, HTML)
SA.partFullDesc = (p) => {
  const d = SA.PARTS[p.id], lv = p.lv || 0, m = SA.LV_MUL[lv];
  let s = SA.partDesc(p.id, lv);
  if (lv && d.slot === 'main') s += ` <span class="g-up">[${SA.partTier(p)}] 피해 +${Math.round((m - 1) * 100)}%</span>`;
  if (lv && d.slot === 'sub') s += ` <span class="g-up">[${SA.partTier(p)}] 위력 +${Math.round((m - 1) * 100)}% (피해, 피해가 없으면 처리 속도)</span>`;
  if (lv && d.slot === 'act') s += ` <span class="g-up">[${SA.partTier(p)}] 쿨타임 -${Math.round((1 - 1 / m) * 100)}% · 범위·지속 +${Math.round((SA.LV_RANGE[lv] - 1) * 100)}%</span>`;
  if (lv && d.slot === 'pas') s += ` <span class="g-up">[${SA.partTier(p)}] 효과 수치 +${Math.round((m - 1) * 100)}% (위 수치에 반영)</span>`;
  if (lv && d.slot === 'obs') s += ` <span class="g-up">[${SA.partTier(p)}] 시야 ${lv + 1}단계${lv === 2 ? ' · 보스·사냥꾼 항상 표시' : ''}</span>`;
  if (p.mod && SA.MODS[p.mod]) s += `<br><span class="g-mod">개조 · ${SA.MODS[p.mod].name}: ${SA.MODS[p.mod].desc}</span>`;
  if (p.awk && SA.AWAKEN[p.awk]) s += `<br><span class="g-awk">${SA.AWAKEN[p.awk].name}: ${SA.AWAKEN[p.awk].desc}</span>`;
  return s;
};
SA.partHtml = (p) => `<span style="color:${SA.TIER_COL[SA.partTier(p)]}">${SA.partName(p)}</span>`;
// 부품 이름 (등급 표시는 색으로, 개조·각성은 뒤에)
SA.partName = (p, short) => {
  const d = SA.PARTS[p.id]; let s = d.name;
  if (p.lv) s += p.lv === 2 ? ' Ⅲ' : ' Ⅱ';
  if (!short && p.mod && SA.MODS[p.mod]) s += ' · ' + SA.MODS[p.mod].name;
  if (!short && p.awk && SA.AWAKEN[p.awk]) s += ' · ' + SA.AWAKEN[p.awk].name;
  return s;
};
// 에너지·사격 (임시). eps = 계속 쏠 때 초당 에너지 (펄스건 1.0 기준, 무기 성향별)
SA.ENERGY = { reload: 1.2, swap: 0.4, emerMax: 6, emerRegen: 0.25, hip: 1.6, aim: 0.5, aimSpeed: 0.75, slowSpeed: 0.5, sniperCharge: 0.8, sniperMul: 1.5,
  eps: { pulse: 1.0, scatter: 1.0, lance: 1.0, glass: 1.2, sniper: 1.35, beam: 1.4, swarm: 1.15 } };
// 아이템 제작 (설계도 없이 항상 가능). 동력원은 모두 고철 1개가 들어가고, 상위 동력원은 하위 동력원을 쓴다 (임시)
SA.CRAFT = {
  cell1: { mats: { scrap: 1, wire: 1 } },
  cell2: { mats: { cell1: 1, scrap: 1, core: 1 } },
  cell3: { mats: { cell2: 1, scrap: 1, goldchip: 1, crystal: 1 } },
  cell4: { mats: { cell3: 1, scrap: 1, abyss: 1 } },
  repairkit: { mats: { scrap: 2, wire: 1 } },
  alloy:    { mats: { scrap: 2, core: 1 } },
  fcore:    { mats: { core: 2, engine: 1 } },
  qcircuit: { mats: { goldchip: 1, prec: 1, crystal: 1 } },
};
// 강화 부품 제작에는 상위 재료가 들어간다 (강화 합금, 액티브·서브웨폰은 융합 코어 1)
SA.UMAT_ADD = (id) => { const d = SA.PARTS[id]; if (!d) return {}; if (d.tier === '강화') return (d.slot === 'act' || d.slot === 'sub') ? { fcore: 1 } : { alloy: 1 }; return {}; };
// 코드 사용 횟수 (등록 1회분)와 상점 충전 가격 (가득 채우기) (임시)
SA.CODES = { box1: { name: '일반 상자 코드', uses: 5, price: 150 }, box2: { name: '강화 상자 코드', uses: 3, price: 450 }, box3: { name: '행성 상자 코드', uses: 1, price: 900 }, zone: { name: '보안 구역 코드', uses: 3, price: 500 } };
// 상자: 일반(부수기) / 잠긴 상자(해독기+상자 코드, 머물러 열기) / 보안상자(해독기만, 해킹 5초 버티기) (임시)
SA.BOX = { openHold: 1.5, hackHold: 5, r: 46 };
SA.LOOT_LOCKED = {
  1: [['bp:일반', .5], ['bp:강화', .15], ['alloy', .5], ['cell1', .4], ['prec', .6], ['goldchip', .35], ['part:일반', .12], ['key_box1', .08]],
  2: [['bp:강화', .5], ['alloy', 1], ['fcore', .5], ['qcircuit', .2], ['cell2', .35], ['goldchip', .6], ['part:강화', .15], ['key_box2', .06]],
  3: [['bp:강화', .6], ['qcircuit', 1], ['alloy', .6], ['cell3', .3], ['part:행성', .25]],
};
SA.LOOT_SECURE = [['part:강화', .5], ['part:행성', .25], ['bp:강화', .6], ['qcircuit', .5], ['alloy', .8], ['fcore', .4], ['key_zone', .1]];
// 부품 완성품 필드 드랍: 화물칸 크기 (주무기 3×1, 그 외 2×1), 내구도 40~80 무작위. 적 격추 확률 (임시)
SA.PART_DROP = { size: { main: [3, 1], sub: [2, 1], act: [2, 1], pas: [2, 1], obs: [2, 1] }, dur: [40, 80],
  chance: { fighter: 0.01, turret: 0.015, frigate: 0.03, boss: 0.25 }, tierRoll: [['행성', .05], ['강화', .25], ['일반', 1]] };
// 설계도 확률: 일반은 그대로, 강화·행성은 낮추고 네임드·보스·대형은 높인다
SA.BP_MUL = { normal: 0.8, frigate: 1.8, boss: 2.5 };
SA.HIT_WEAR = 3;
// 사망 처리 방식 (시작할 때 고르고, 설정에서 언제든 바꾼다)
SA.DEATH_MODES = {
  hard:    { name: '완전 상실', desc: '화물과 장착한 부품·동력원을 전부 잃는다. 보안 칸만 남는다.' },
  recover: { name: '회수', desc: '화물과 장착 부품을 그 자리에 떨어뜨린다. 다음 출격 맵 어딘가에 잔해 신호가 뜨고, 찾아서 들고 탈출하면 되찾는다 (한 번만).' },
  normal:  { name: '보통', desc: '화물을 잃고, 장착 부품 하나를 확률로 잃는다. 장착 부품 내구도 -40%.' },
  easy:    { name: '쉬움', desc: '화물만 잃는다. 장착 부품은 그대로.' },
};
// 탈출: 귀환 비콘이 시간차로 나타나고, 부수면 그 자리에 귀환 포트가 열린다 (임시)
SA.EXIT = { first: 60, every: 60, max: 3, hp: 120, emHold: 3, emTime: 15 };
SA.RECOVER = { hold: 3 };
// 시야: 화면 배율 단계 (관측 장비 등급만큼 더 넓게) · 미니맵 레이더 범위 · 지도 안개 칸 크기·밝히는 반경 (임시)
SA.OBS = { levels: [2, 1.75, 1.5, 1.3], radar: [350, 600, 900, 1200], fogCell: 80, reveal: 330 };
// 블랙박스 해독: 출격 1회가 지나면 완료, 크레딧을 내면 즉시
SA.DECODE = { raids: 1, instant: 300, slots: 3 };   // 맡기기 최대 3개 (임시)   // 회수 잔해: 머물러서 회수하는 시간   // 피격 시 무작위 장착 부품 내구도 감소
SA.START_RECIPES = ['pulse', 'mg', 'magnet', 'obs1'];   // 처음 아는 제작법은 이것뿐 (임시). 보안해독기(강화)는 오스의 의뢰 '보안해독기 도면' 보상이나 설계도 드랍으로 얻는다 (제작은 테오 구조 후)
// 설계도 아이템은 부품마다 자동 생성. 등급별 풀에서 무작위로 떨어진다 (loot의 'bp:일반' 등)
SA.BP_POOL = { 일반: [], 강화: [] };
for (const id in SA.PARTS) {
  if (SA.START_RECIPES.includes(id)) continue;
  const d = SA.PARTS[id];
  if (!SA.ITEMS['bp_' + id]) SA.ITEMS['bp_' + id] = { name: '설계도: ' + d.name, w: 1, h: 1, val: { 일반: 100, 강화: 200 }[d.tier], kind: 'bp', recipe: id, color: '#e6edf3', desc: '격납고에서 영구 해금된다. 이미 알면 판매.' };
  if (id !== 'raven' && id !== 'sensor') SA.BP_POOL[d.tier].push(id);   // 레이븐 전용 설계도는 일반 드랍 풀에서 뺀다
}
SA.ITEMS.bp_sensor.img = 'assets/bp_sensor.png';   // 도트 설계도 카드
SA.PARTS.scatter.img = 'assets/p_scatter.png';   // 산탄 포탑 도트
SA.PARTS.missile.img = 'assets/p_missile.png';   // 미사일 포드 도트
SA.ITEMS.chip.img = 'assets/i_chip.png';   // 비행 기록 칩 도트
// 부품 완성품 아이템 (필드 드랍용). 탈출하면 부품함으로 들어간다
for (const id in SA.PARTS) {
  const d = SA.PARTS[id], sz = SA.PART_DROP.size[d.slot];
  SA.ITEMS['pt_' + id] = { name: d.name, w: sz[0], h: sz[1], val: Math.round(d.val * 0.6), kind: 'part', tier: d.tier, part: id, img: d.img, color: SA.TIER_COL[d.tier], desc: `[부품] ${SA.partDesc(id, 0)} 탈출하면 부품함으로 들어간다.` };
}
// 아이템 분류 이름
SA.KIND_NAME = { mat: '재료', umat: '상위 재료', cell: '동력원', use: '소모품', key: '해독키', lore: '정보', data: '정보', bp: '설계도', capsule: '구조', part: '부품', ticket: '고용권' };
// 강화·행성 레시피에 상위 재료 추가 (한 번만)
for (const id in SA.RECIPES) Object.assign(SA.RECIPES[id].mats, SA.UMAT_ADD(id));

// 기체. mount = 포탑/판정점 (도트 좌표, 0~1 비율)
SA.SHIPS = {
  // 단장 전용기 (튜토리얼 프롤로그 전용, 격납고에는 안 나온다). 양쪽 날개에 포 2문 (subScale: 포탑을 크게 그린다)
  ace:     { name: '전용기', role: '에이스', price: 0, hidden: true, hp: 120, speed: 165, accel: 18, turn: 22, hitR: 2, sub: 2, act: 2, pas: 3, cargo: [4, 3],
             img: 'assets/ace_hull.png', size: [27, 40], mount: [0.5, 0.52], subMounts: [[-9.5, 8.5], [9.5, 8.5]], subScale: 1.7, flames: [[10.1, 38.5], [16.4, 38.5]], desc: '3년 전, 단장의 기체.' },
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
  SA.ITEMS['cap_' + id] = { name: '구조 캡슐: ' + t.name, w: 2, h: 2, val: 0, kind: 'capsule', img: 'assets/i_pod.png', color: t.color, desc: '탈출해야 구조가 확정된다. 들고 있으면 이속 -10%. 잃으면 다음 출격에 신호가 다시 뜬다.' };
}
// 네임드 레이븐 (임시 수치): 둥지에서 체력 30%가 되면 도주 → 다음 출격부터 다른 위치에서 재대결 → 격추하면 탈출 포드를 들고 탈출해야 완료
SA.RAVEN = { leash: 900, hp: 1500, fleeAt: 0.3, phase3At: 0.25, dodgeCd: [1.8, 1.5, 1.1],
  fleeDrops: [['chip', 1], ['goldchip', 1], ['prec', .6], ['bp:강화', .3]] };
// 제국 실험 무인기: 레이븐 데이터를 학습한 기계. 레이븐 합류 뒤 출격의 mimicChance로 등장, 격추하면 비행 기록 칩 (임시)
SA.MIMIC = { chance: 0.3, hp: 900 };
SA.ITEMS.cap_raven = { name: '레이븐의 탈출 포드', w: 2, h: 2, val: 0, kind: 'capsule', img: 'assets/i_pod.png', color: '#ff4d6d', desc: '격추된 레이븐이 갇힌 탈출 포드. 들고 탈출해야 그를 붙잡는다. 들고 있으면 이속 -10%.' };
// 난파선 (임시): 아이템 하나당 0.9초, 마지막 한 개는 4초. 벗어나면 진행 중 게이지가 초당 0.6씩 줄어든다.
// 마지막 보상은 위에서부터 굴려 처음 당첨된 것 하나 (좋은 것 확률 높게)
SA.WRECK = { maxItems: 5, per: 0.9, last: 4, decay: 0.6, final: [['bp:강화', .15], ['goldchip', .3], ['bp:일반', .35], ['engine', .35], ['prec', 1]] };
// 대사창 화자: 초상화는 assets/portrait_<id>.png (원화가 작업물이 오면 넣는다. 없으면 실루엣)
SA.SPEAKERS = {
  cmd:    { name: '단장', title: '3년 전', color: '#e6edf3' },
  raven:  { name: '레이븐', title: '네임드 용병', color: '#ff4d6d' },
  serena: { name: '세레나', title: '왕국 장군', color: '#8fb6ff' },
  volk:   { name: '볼크', title: '제국 돌격 에이스', color: '#ff7a6b' },
};
SA.DIALOG = { min: 4, max: 9, perChar: 0.07, queue: 3 };
// 적이 쓰는 플레이어 스킬 (2막 보스·네임드용 구조. 적 정의에 skills: ['purge', ...] 를 넣으면 쓴다) (임시)
SA.ENEMY_SKILLS = {
  purge:   { cd: 10, desc: '주변 플레이어 탄을 지운다' },
  shield:  { cd: 12, desc: '1.5초 무적' },
  missile: { cd: 8, desc: '플레이어 쪽으로 부채꼴 탄 6발' },
  boost:   { cd: 9, desc: '1초간 플레이어 쪽으로 빠르게 돌진' },
};
// 윙맨 AI 공통 (임시): leash = 플레이어에게서 최대 거리, 세레나 후퇴/복귀 체력 비율, 탄 회피 확률, 볼크 도발 확률
SA.WING = { leash: 250, retreatAt: 0.35, backAt: 0.7, dodgeCmd: 0.95, dodgeAce: 0.3, taunt: 0.35 };
// 네임드 윙맨 (초안·임시 수치). 중립 의뢰로 함께 출격한다. 기체 그림은 진영 전투기 도트를 빌려 쓴다
SA.NAMED = {
  kingdom: { name: '세레나', title: '왕국 장군', color: '#8fb6ff', speaker: 'serena', sprite: 'n_serena', style: 'cmd', hp: 160, regen: 4, speed: 175, range: 320,
             rate: 2.6, shots: 1, spread: 0.01, dmg: 12, spd: 760,
             hello: '수송선이 먼저다. 내 뒤는 당신이 봐. …그 기동, 어디서 본 것 같은데.', coverOn: '붙겠다. 대신 맞아 주겠다니… 예전에도 그런 사람이 있었지.', coverOff: '흩어진다. 시야 넓게.',
             arrive: '도착이다. 하나만 묻지. 당신에게 그 비행을 가르친 사람, 아직 살아 있나?',
             down: '기체 손상… 이탈한다. 그 사람에게 전해. …아니, 됐다.',
             barks: { retreat: '손상 3할 초과. 잠시 물러난다. 앞을 맡아.', back: '복귀한다. 좌측으로 돈다.' } },
  empire:  { name: '볼크', title: '제국 돌격 에이스', color: '#ff7a6b', speaker: 'volk', sprite: 'n_volk', style: 'ace', hp: 180, regen: 4, speed: 185, range: 260,
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
               drops: [['scrap', .6], ['wire', .25], ['bp:일반', .04]] },
  // 튜토리얼 전용: 정체를 숨긴 왕국 추적기. 이름만 '미확인'으로 두고 진영은 왕국
  k_tracker: { name: '미확인 추적기', faction: 'kingdom', ai: 'fighter', hp: 14, r: 9, speed: 100, img: 'assets/k_tracker.png', size: [28, 28],
               drops: [['scrap', .3]] },
  e_fighter: { name: '제국 전투기', faction: 'empire', ai: 'fighter', hp: 16, r: 9, speed: 108, img: 'assets/e_fighter.png', size: [26, 24],
               drops: [['scrap', .6], ['core', .12], ['bp:일반', .04]] },
  k_frigate: { name: '왕국 프리깃', faction: 'kingdom', ai: 'frigate', hp: 110, r: 20, speed: 38, img: 'assets/k_frigate.png', size: [28, 48],
               drops: [['core', .55], ['wire', .5], ['prec', .3], ['scrap', .8], ['bp:일반', .08], ['bp:강화', .05], ['key_box1', .05], ['key_zone', .03], ['bb_reward', .04]] },
  e_frigate: { name: '제국 순양함', faction: 'empire', ai: 'frigate', hp: 130, r: 20, speed: 34, img: 'assets/e_frigate.png', size: [34, 47],
               drops: [['core', .5], ['engine', .35], ['prec', .3], ['scrap', .8], ['bp:일반', .08], ['bp:강화', .05], ['key_box1', .05], ['key_zone', .03], ['bb_reward', .04], ['bb_empire', .08]] },
  k_turret:  { name: '왕국 포대', faction: 'kingdom', ai: 'turret', hp: 70, r: 12, speed: 0, img: 'assets/k_turret.png', size: [18, 25], pivot: [0.5, 0.67],
               drops: [['scrap', .7], ['wire', .3], ['core', .25], ['prec', .15]] },
  e_turret:  { name: '제국 쌍포대', faction: 'empire', ai: 'turret', hp: 60, r: 10, speed: 0, img: 'assets/e_turret.png', size: [14, 21], pivot: [0.5, 0.72],
               drops: [['scrap', .7], ['core', .3], ['prec', .15]] },
  m_turret:  { name: '폐광 포대', faction: 'mine', ai: 'turret', hp: 95, r: 13, speed: 0, img: 'assets/m_turret.png', size: [26, 33], pivot: [0.5, 0.57],
               drops: [['scrap', .8], ['engine', .25], ['core', .3], ['prec', .2], ['bp:일반', .04]] },
  corrode: { name: '침식체', ai: 'corrode', hp: 110, r: 11, speed: 80, color: '#b98cff', img: 'assets/corrode.png', size: [18, 32], drops: [['crystal', .4]] },
  // 그림 전용 (스폰하지 않음): 네임드 윙맨 전용기 · 호위 화물선
  n_serena:  { name: '세레나 전용기', ai: 'none', img: 'assets/w_serena.png', size: [28, 31], hp: 1, r: 7 },
  n_volk:    { name: '볼크 전용기', ai: 'none', img: 'assets/w_volk.png', size: [31, 29], hp: 1, r: 7 },
  convoy_ship: { name: '호위 화물선', ai: 'none', img: 'assets/convoy.png', size: [27, 75], hp: 1, r: 18 },
  hunter:  { name: '심연의 사냥꾼', ai: 'hunter', img: 'assets/hunter_0.png', anim: { n: 6, fps: 8 }, size: [64, 81], hp: 1400, r: 28, speed: 90, color: '#8a5cff', boss: true, drops: [['crystal', 1], ['crystal', 1], ['crystal', .5], ['ace', 1], ['ace', .4], ['abyss', 1], ['bb_hunter', 1], ['qcircuit', .6], ['part:행성', .35], ['goldchip', 1], ['goldchip', .5]] },
  raven:   { name: '네임드 용병 레이븐', ai: 'raven', img: 'assets/raven_hull.png', size: [30, 27], pivot: [0.5, 0.5], hp: 1500, r: 12, speed: 150, color: '#ff4d6d', boss: true, drops: [['chip', 1], ['bp_raven', .5], ['bp_sensor', .3], ['ace', 1], ['ace', .4], ['bp:강화', .8], ['goldchip', 1], ['goldchip', .6], ['bb_raven', 1], ['engine', .5], ['key_box2', .3]] },
  mimic:   { name: '제국 실험 무인기', ai: 'raven', img: 'assets/raven_hull.png', size: [30, 27], pivot: [0.5, 0.5], hp: 900, r: 12, speed: 150, color: '#c08bff', boss: true, drops: [['chip', 1], ['bb_mimic', 1], ['goldchip', 1], ['prec', 1], ['bp:강화', .5], ['bp_sensor', .3], ['qcircuit', .3], ['ace', .3]] },
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
