// STRAY//ACE — 모든 수치 데이터. 밸런스 조정은 이 파일에서만 한다.
window.SA = window.SA || {};

SA.CFG = {
  VIEW_W: 640, VIEW_H: 360, ZOOM: 2,      // 월드 640x360을 2배로 그림 (도트 정수배)
  MAP_SCALE: 1.0,                          // 맵 크기 배율 (1.2, 1.5로 키워보기)
  SCREENS_X: 6, SCREENS_Y: 6,              // 1번 맵 = 화면 6x6
  HIT_INVULN: 0.8,
  GRAZE_R: 14,
  BULLET_HIT: 0.72,   // 적 탄의 피격 판정 = 보이는 반지름 × 이 값 (v0.79: 1 → 0.72, 동방식으로 그림보다 판정을 작게 · 임시). 스침 판정은 보이는 크기 그대로
  BODY_PAD: 2,        // 적 몸통에 닿아 입는 피해: 몸통 반지름 + 이 값 (v0.79: 5~6 → 2 · 임시)
  TAB_TIMESCALE: 0.3,
  EXTRACT_TIME: 10,
  EXTRACT_R: 78,   // 탈출 원 반지름 (v0.69: 52 → 78, 안에서 피할 공간 확보 · 임시)
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
  bb_lumina: { name: '블랙박스 (기록 포드)', w: 1, h: 1, val: 250, kind: 'lore', img: 'assets/i_blackbox.png', color: '#ffe9a8', desc: '3년 전 왕국 함대에서 쏘아 보낸 기록 포드의 기록 장치. 결정 가루가 앉아 있다.' },
  canister: { name: '정화 캐니스터', w: 1, h: 2, val: 70, kind: 'use', img: 'assets/i_canister.png', color: '#7ff0e0', desc: '사용: 침식률 -25%. 단축키 2.' },
  repairkit:{ name: '수리킷', w: 1, h: 1, val: 60, kind: 'use', img: 'assets/i_repairkit.png', color: '#9df07f', desc: '사용: 체력 40 회복 (단축키 1). Tab 화물칸에서 장착 부품에 끌어다 놓으면 그 부품 내구도 +40.' },
  // 상위 재료: 하위 재료 2~3개를 합성 (설계도 없이). 강화·행성 부품 제작에 들어간다 (임시)
  alloy:    { name: '강화 합금', w: 1, h: 1, val: 160, kind: 'umat', tier: '강화', color: '#9fd8c8', desc: '고철을 코어 열로 다시 녹여 만든 판재. 강화 부품의 뼈대.' },
  fcore:    { name: '융합 코어', w: 1, h: 2, val: 260, kind: 'umat', tier: '강화', color: '#6fb7ff', desc: '코어 둘을 엔진 냉각관으로 묶었다. 강화 액티브·서브웨폰에 들어간다.' },
  qcircuit: { name: '양자 회로', w: 1, h: 1, val: 520, kind: 'umat', tier: '행성', color: '#ffd166', desc: '금빛 회로 위에 침식 결정을 얹은 기판. 행성 부품의 심장.' },
  stardata: { name: '성구 데이터', w: 1, h: 1, val: 120, kind: 'data', tier: '일반', color: '#a8c8ff', desc: '사용: 이 구역의 지도를 한 번에 밝힌다 (소행성·장소 전부). 단축키 3.' },
  bb_reward: { name: '신호 블랙박스', w: 1, h: 1, val: 150, kind: 'lore', tier: '강화', color: '#ffb347', desc: '좌표가 남아 있는 블랙박스. 기지에서 해독하면 다음 출격 맵에 신호 지점이 뜬다.' },
  // 해독키: 필드에서 줍고 기지에서 보안해독기에 '등록'한다. 등록하면 사용 횟수가 생기고, 다 쓰면 상점에서 충전한다
  key_box1: { name: '상자 해독키 (일반)', w: 1, h: 1, val: 80, kind: 'key', tier: '일반', code: 'box1', color: '#9fb3c8', desc: '일반 등급 잠긴 상자의 코드 칩. 기지에서 등록하면 보안해독기로 5번 연다.' },
  key_box2: { name: '상자 해독키 (강화)', w: 1, h: 1, val: 220, kind: 'key', tier: '강화', code: 'box2', color: '#5dffb0', desc: '강화 등급 잠긴 상자의 코드 칩. 등록하면 3번. 2막 보급고에서 주로 쓰인다.' },
  key_box3: { name: '상자 해독키 (행성)', w: 1, h: 1, val: 600, kind: 'key', tier: '행성', code: 'box3', color: '#ffd166', desc: '행성 등급 잠긴 상자의 코드 칩. 등록하면 1번. 3막의 금고 규격이다.' },
  key_zone: { name: '왕국 산하 행성 해독키', w: 1, h: 1, val: 300, kind: 'key', tier: '강화', code: 'zone', color: '#8fb6ff', desc: '보안 구역 역장의 출입 코드. 어째서 이런 폐광 소행성대에 왕국 산하 행성의 해독키가…? 등록하면 3번.' },
  // 동력원: 주무기 에너지. 장착 1개 + 예비는 화물칸. 기지에 돌아오면 무료로 가득 찬다. cap = 펄스건 연사 기준 초, dmg = 주무기 피해 배율 (임시)
  cell1:    { name: '동력원 (일반)', w: 1, h: 1, val: 60, kind: 'cell', img: 'assets/i_cell1.png', tier: '일반', cap: 90, dmg: 1.0, color: '#7fe3ff', desc: '주무기 에너지. 펄스건으로 약 90초. 피해 ×1.0. R로 교체. 쓴 만큼 줄어든 채 유지된다. 다 쓰면 분해하거나 판다.' },
  cell2:    { name: '동력원 (강화)', w: 1, h: 1, val: 180, kind: 'cell', img: 'assets/i_cell2.png', tier: '강화', cap: 150, dmg: 1.2, color: '#5dffb0', desc: '주무기 에너지. 펄스건으로 약 150초. 피해 ×1.2. R로 교체. 쓴 만큼 줄어든 채 유지된다. 다 쓰면 분해하거나 판다.' },
  cell3:    { name: '동력원 (행성)', w: 1, h: 1, val: 420, kind: 'cell', img: 'assets/i_cell3.png', tier: '행성', cap: 240, dmg: 1.4, color: '#ffd166', desc: '주무기 에너지. 펄스건으로 약 240초. 피해 ×1.4. R로 교체. 쓴 만큼 줄어든 채 유지된다. 다 쓰면 분해하거나 판다.' },
  cell4:    { name: '동력원 (은하)', w: 1, h: 1, val: 900, kind: 'cell', img: 'assets/i_cell4.png', tier: '은하', cap: 330, dmg: 1.6, color: '#c08bff', desc: '주무기 에너지. 펄스건으로 약 330초. 피해 ×1.6. 심연 핵으로 만든다. R로 교체. 쓴 만큼 줄어든 채 유지된다. 다 쓰면 분해하거나 판다.' },
  // 보스 재료: 은하 각성에 들어간다 (보스마다 각성 규칙 1개)
  chip:     { name: '비행 기록 칩', w: 1, h: 1, val: 600, kind: 'umat', tier: '은하', color: '#ff8fb0', desc: '레이븐의 회피 기동이 통째로 기록된 칩. 은하 부품에 넣으면 스칠 때마다 위력이 오른다 (레이븐 각성).' },
  lumdust:  { name: '루미나의 인분', w: 1, h: 1, val: 800, kind: 'umat', tier: '은하', color: '#ffe9a8', desc: '성운 나방 루미나의 날개에서 떨어진 빛가루. 은하 제작 「인광 날개 포탑」에 들어간다 (탄막이 짙을수록 강해진다).' },
  abyss:    { name: '심연 핵', w: 1, h: 1, val: 700, kind: 'umat', tier: '은하', color: '#a06bff', desc: '사냥꾼의 몸속에서 뛰던 것. 은하 부품에 넣으면 침식이 깊을수록 위력이 오른다 (심연 각성).' },
  flamecore: { name: '화염 코어', w: 1, h: 1, val: 450, kind: 'umat', tier: '은하', color: '#ff7a3d', desc: '제국 순양함 기관부의 과열 코어. 아직 뜨겁다. 은하 부품 재료.' },
  klens:    { name: '왕국 렌즈', w: 1, h: 1, val: 450, kind: 'umat', tier: '은하', color: '#8fd3ff', desc: '왕국 함선의 조준 렌즈. 빛을 한 줄로 모은다. 은하 부품 재료.' },
  bp_raven:   { name: '설계도: 레이븐 추진기', w: 1, h: 1, val: 300, kind: 'bp', recipe: 'raven', color: '#ffd166', desc: '네임드 용병 레이븐의 추진기. 그녀는 이걸로 탄 사이를 미끄러졌다.' },
};

// 장비 부품. slot: main/sub/act/pas
// 부품. 수치는 임시 (밸런스 조정 예정). 효과 구현은 combat.js
// 부품: 일반·강화는 서로 다른 독립 부품. 행성·은하는 같은 부품을 키운 것 (lv 1·2, 아래 SA.UPGRADE)
// 패시브 fx = 효과 수치 (행성 ×1.3, 은하 ×1.6, 은하 각성도 곱해짐). noUp = 수치가 없어 키울 수 없는 부품
SA.PARTS = {
  // 주무기 (초당 피해: 일반 기준 펄스건 54). 저격총은 일반 사격은 기본 동력원으로 프리깃(110~130)을 한 발에 못 죽인다 — 정조준 150 (v0.88 100으로 조정, 임시)
  pulse:   { name: '펄스건', slot: 'main', tier: '일반', val: 150, rate: 9, dmg: 6, spd: 520, spread: 0.03, shots: 1, desc: '기본 연사. 초당 약 54.' },
  scatter: { name: '산탄포', slot: 'main', tier: '일반', val: 220, rate: 2.4, dmg: 5, spd: 430, spread: 0.32, shots: 6, life: 0.45, desc: '가까울수록 강하다. 근접 초당 약 72.' },
  lance:   { name: '관통 레이저', slot: 'main', tier: '일반', val: 240, rate: 3.2, dmg: 15, spd: 760, spread: 0, shots: 1, pierce: 3, desc: '적을 3기까지 관통. 초당 약 48.' },
  sniper:  { name: '저격총', slot: 'main', tier: '강화', val: 560, rate: 0.833, dmg: 100, spd: 1150, spread: 0.02, shots: 1, life: 1.2, sniper: true, desc: '한 발 100, 1.2초에 1발. 우클릭으로 끝까지 정조준하면 피해 ×1.5 (150). 초당 약 83, 정조준만 이어 가면 약 125. 에너지를 많이 먹는다.' },
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
SA.LV_MUL = [1, 1.3, 1.3];      // 주 스탯·패시브 효과 배율 (기준 / 행성). 은하는 별도 부품 (2번 칸은 옛 세이브 호환)
// 액티브 범위·지속 배율 (행성 +15%, 은하 +30%) — 쿨타임 단축은 LV_MUL로 따로 적용 (임시)
SA.LV_RANGE = [1, 1.15, 1.15];
SA.LV_MAX = [100, 120, 120];    // 최대 내구도
SA.LV_VAL = [1, 2, 2];        // 가치 배율
SA.partTier = (p) => p.lv ? '행성' : SA.PARTS[p.id].tier;
// 동력원: 쓴 만큼 충전량(ch 0~1)이 줄어든 채로 유지된다. 가치는 빈 것 25% ~ 가득 100% (임시)
SA.CELL = { emptyVal: 0.25, salvage: { cell1: { scrap: 1 }, cell2: { scrap: 1, wire: 1 }, cell3: { scrap: 2, prec: 1 }, cell4: { scrap: 2, crystal: 1 } } };
SA.cellCh = (it) => it.ch === undefined ? 1 : Math.max(0, Math.min(1, it.ch));
SA.itemVal = (it) => { const d = SA.ITEMS[it.id], v = Math.round(d.val * SA.LV_VAL[it.lv || 0]); return d.kind === 'cell' ? Math.round(v * (SA.CELL.emptyVal + (1 - SA.CELL.emptyVal) * SA.cellCh(it))) : v; };   // 화물 아이템 가치 (행성급 부품 완성품 포함)
SA.partVal = (p) => Math.round(SA.PARTS[p.id].val * SA.LV_VAL[p.lv || 0]);
SA.canUp = (id) => { const d = SA.PARTS[id]; return !!d && !d.noUp; };
// 패시브 fx 값 (i번째) × 배율
SA.fxv = (id, i = 0, mul = 1) => { const f = SA.PARTS[id].fx; const v = Array.isArray(f) ? f[i] : f; return (v || 0) * mul; };
SA.partDesc = (id, lv = 0) => {
  const d = SA.PARTS[id], m = d.gal ? SA.GAL_MUL : SA.LV_MUL[lv || 0], r2 = (x) => Math.round(x * 100) / 100;
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
// 행성 전용 (패시브·관측): 행성으로 올리면 붙는다 (임시)
Object.assign(SA.MODS, {
  p_magnet: { slot: 'pas', only: ['magnet'], name: '흡수 공명', desc: '아이템을 흡수할 때마다 스침 스택 +1.' },
  p_cool:   { slot: 'pas', only: ['cooler'], name: '급속 교체', desc: '동력원 교체 시간 절반, 교체 직후 2초간 연사 +30%.' },
  p_plate:  { slot: 'pas', only: ['plating'], name: '장판 차단', desc: '침식 장판 위에서 피해를 받지 않는다.' },
  p_engine: { slot: 'pas', only: ['engine2'], name: '잔상 추진', desc: '스칠 때마다 1초간 이동 속도 +20%.' },
  p_exit:   { slot: 'pas', only: ['exitacc'], name: '포트 방벽', desc: '귀환 포트 안에서 받는 피해 -50%.' },
  p_crush:  { slot: 'pas', only: ['shockplate'], name: '근접 분쇄', desc: '가까운 적(70)에게 피해 2배.' },
  p_scan:   { slot: 'obs', only: ['obs1'], name: '심우주 추적', desc: '보스·네임드가 미니맵에 항상 보인다.' },
  p_crit:   { slot: 'pas', only: ['sensor'], name: '약점 조준', desc: '주무기 탄이 10% 확률로 피해 2배.' },
  p_bar:    { slot: 'pas', only: ['barrier'], name: '과충전', desc: '보호막이 가득 찬 채 맞으면 주변 적 탄을 지운다.' },
  p_ctr:    { slot: 'pas', only: ['counter'], name: '역습', desc: '반격이 발동하면 주변 적이 1초 기절한다.' },
  p_gzkeep: { slot: 'pas', only: ['grazeamp'], name: '스택 보존', desc: '맞아도 스침 스택이 줄지 않는다 (5초에 한 번).' },
  p_flow:   { slot: 'pas', only: ['grazeflow'], name: '에너지 환류', desc: '5번 스칠 때마다 동력원 에너지 +3%.' },
  p_heart:  { slot: 'pas', only: ['redheart'], name: '불꽃 질주', desc: '체력 50% 이하에서 이동 속도 +15%.' },
  p_vault:  { slot: 'pas', only: ['vault'], name: '금고 요새', desc: '화물 가치가 ₵2000 이상이면 격추돼도 가장 비싼 화물 1개를 지킨다.' },
  p_defl:   { slot: 'pas', only: ['deflect'], name: '역편향', desc: '스친 탄의 10%가 가까운 적에게 되돌아간다.' },
  p_exec:   { slot: 'pas', only: ['execute'], name: '처형 연쇄', desc: '기절한 적을 처치하면 주변 적이 0.6초 기절한다.' },
  p_slip:   { slot: 'pas', only: ['raven'], name: '슬립스트림', desc: '스칠 때마다 파일럿 기술 쿨타임 -0.1초.' },
  p_reso:   { slot: 'pas', only: ['resonator'], name: '침식 동조', desc: '침식 3단계 이상에서 체력 초당 1 회복.' },
});
// 행성 부품: 이름 + 전용 개조 (임시). 행성 설계도가 있어야 올린다
SA.PLANET = {
  pulse: ['쌍열 펄스건', 'm_twin'], scatter: ['파편 산탄포', 'm_frag'], lance: ['절단 레이저', 'm_cut'],
  mg: ['공명 기관포', 's_graze'], mine: ['기뢰 투하기', 's_big'], flamer: ['소각 포탑', 's_burn'],
  missile: ['탄막 미사일 포드', 'a_m10'], purge: ['회수 펄스', 'a_conv'], shield: ['반사 방패', 'a_refl'], emp: ['원형 EMP', 'a_round'], harpoon: ['연쇄 작살', 'a_chain'], dump: ['비상 점화기', 'a_free'],
  magnet: ['인력 수집기', 'p_magnet'], cooler: ['극저온 냉각기', 'p_cool'], plating: ['침식 차단막', 'p_plate'], engine2: ['잔상 엔진', 'p_engine'], exitacc: ['긴급 귀환기', 'p_exit'], shockplate: ['분쇄 장갑', 'p_crush'], obs1: ['심우주 관측기', 'p_scan'],
  sniper: ['관통 저격총', 'm_spierce'], glass: ['강화유리 대포', 'm_tough'], beam: ['굵은 광선포', 'm_thick'], swarm: ['6연 군집 미사일', 'm_more'],
  drone: ['쌍둥이 드론', 's_two'], sdrone: ['광역 방패 드론', 's_wide'], intercept: ['반격 요격기', 's_ret'], hturret: ['2연발 유도탄 포탑', 's_dbl'], chain: ['연쇄 번개', 's_jump'],
  cannon: ['급속 충전 캐논', 'a_half'], orbital: ['집중 궤도 폭격', 'a_o10'], reflect: ['유도 반사막', 'a_home'], gravity: ['압착 우물', 'a_gstun'], overdrive: ['안정화 코어', 'a_od'], discharge: ['관통 방전기', 'a_dpierce'], timestop: ['장기 정지장', 'a_t4'],
  sensor: ['정밀 센서', 'p_crit'], barrier: ['과충전 베리어', 'p_bar'], counter: ['역습 장치', 'p_ctr'], grazeamp: ['공명 증폭기', 'p_gzkeep'], grazeflow: ['에너지 환류기', 'p_flow'], redheart: ['불꽃 심장', 'p_heart'],
  vault: ['금고 요새', 'p_vault'], deflect: ['역편향기', 'p_defl'], execute: ['처형 연쇄 회로', 'p_exec'], raven: ['슬립스트림 추진기', 'p_slip'], resonator: ['침식 동조기', 'p_reso'],
};
for (const id in SA.PARTS) if (!SA.PLANET[id]) SA.PARTS[id].noUp = true;   // 행성 표가 없는 부품은 올리지 않는다
SA.planetMod = (id) => (SA.PLANET[id] || [])[1] || null;
// 개조 칩: 공용 개조 (부품당 1칸, 빼면 돌려받는다)
SA.CHIPS = Object.keys(SA.MODS).filter(k => !SA.MODS[k].only);
SA.chipsFor = (id) => { const d = SA.PARTS[id]; return d ? SA.CHIPS.filter(k => SA.MODS[k].slot === d.slot) : []; };
SA.randChip = (id) => { const l = SA.chipsFor(id); return l.length ? l[Math.floor(Math.random() * l.length)] : null; };
// 부품에 붙은 개조 전부: 칩 + (행성이면) 전용
SA.modsOf = (p) => { if (!p) return []; const o = []; if (p.mod) o.push(p.mod); const d = SA.PARTS[p.id]; if (d && d.gal) o.push(SA.planetMod(d.base)); else if (p.lv && SA.planetMod(p.id)) o.push(SA.planetMod(p.id)); return o; };
SA.SLOT_NAME = { main: '주무기', sub: '서브', act: '액티브', pas: '패시브', obs: '관측' };
for (const k of SA.CHIPS) { const m = SA.MODS[k]; SA.ITEMS['mc_' + k] = { name: '개조 칩: ' + m.name, w: 1, h: 1, val: 80, kind: 'mchip', mod: k, color: '#7fd1ff', desc: `${SA.SLOT_NAME[m.slot]} 부품에 끼운다 (작업대 → 부품). ${m.desc}` }; }
// 은하 각성: 넣은 보스 재료에 따라 하나. 2·3막 보스는 규칙만 여기에 추가
SA.AWAKEN = {
  raven:  { name: '레이븐 각성', mat: 'chip', desc: '스칠 때마다 이 부품 위력 +3% (최대 +30%, 맞으면 초기화).' },
  hunter: { name: '심연 각성', mat: 'abyss', desc: '침식 단계마다 이 부품 위력 +10%. 침식으로 이 부품 내구도가 깎이지 않는다.' },
};
// 강화 비용 (임시, 중간 수준). 행성: 기준 부품 + 상위 재료 2 + 양자 회로 1 + 기준가 / 은하: 양자 회로 2 + 보스 재료 + 침식 결정 3 + 기준가 ×2
SA.UPGRADE = {
  cost: (p, awk) => {
    const d = SA.PARTS[p.id], um = (d.slot === 'act' || d.slot === 'sub') ? 'fcore' : 'alloy';
    return { mats: { [um]: 1, qcircuit: 1 }, cr: d.val };   // 행성: 행성 설계도 + 합금/융합 코어 1 + 양자 회로 1 + 부품값 (임시)
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
  if (lv && d.slot === 'obs') s += ` <span class="g-up">[${SA.partTier(p)}] 시야 ${lv + 1}단계</span>`;
  if (d.gal) s += ` <span class="g-awk">[은하] 주 스탯 +${Math.round((SA.GAL_MUL - 1) * 100)}%</span>`;
  const pm = d.gal ? SA.MODS[SA.planetMod(d.base)] : lv && SA.MODS[SA.planetMod(p.id)];
  if (pm) s += `<br><span class="g-up">전용 · ${pm.name}: ${pm.desc}</span>`;
  if (p.mod && SA.MODS[p.mod]) s += `<br><span class="g-mod">칩 · ${SA.MODS[p.mod].name}: ${SA.MODS[p.mod].desc}</span>`;
  return s;
};
SA.partHtml = (p) => `<span style="color:${SA.TIER_COL[SA.partTier(p)]}">${SA.partName(p)}</span>`;
// 부품 이름 (등급 표시는 색으로, 개조·각성은 뒤에)
SA.partName = (p, short) => {
  const d = SA.PARTS[p.id]; let s = p.lv && SA.PLANET[p.id] ? SA.PLANET[p.id][0] : d.name;
  if (!short && p.mod && SA.MODS[p.mod]) s += ' · ' + SA.MODS[p.mod].name;
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
  1: [['bp:일반', .5], ['bp:강화', .15], ['alloy', .5], ['cell1', .4], ['prec', .6], ['goldchip', .35], ['part:일반', .12], ['mchip', .2], ['key_box1', .08]],
  2: [['bp:강화', .5], ['alloy', 1], ['fcore', .5], ['qcircuit', .2], ['pbp', .15], ['cell2', .35], ['goldchip', .6], ['part:강화', .15], ['key_box2', .06]],
  3: [['bp:강화', .6], ['pbp', .4], ['qcircuit', 1], ['alloy', .6], ['cell3', .3], ['part:행성', .25]],
};
SA.LOOT_SECURE = [['part:강화', .5], ['part:행성', .25], ['bp:강화', .6], ['pbp', .3], ['qcircuit', .5], ['alloy', .8], ['fcore', .4], ['key_zone', .1]];
// 부품 완성품 필드 드랍: 화물칸 크기 (주무기 3×1, 그 외 2×1), 내구도 40~80 무작위. 적 격추 확률 (임시)
SA.PART_DROP = { size: { main: [3, 1], sub: [2, 1], act: [2, 1], pas: [2, 1], obs: [2, 1] }, dur: [40, 80],
  chip: 0.3, pbp: { frigate: 0.06, boss: 0.5 },   // 드랍 부품에 칩이 끼워져 있을 확률 · 행성 설계도 (임시)
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
SA.START_RECIPES = ['pulse', 'mg', 'purge', 'magnet', 'obs1'];   // = 작업대 1단계 지급분   // 처음 아는 제작법은 이것뿐 (임시). 보안해독기(강화)는 오스의 의뢰 '보안해독기 도면' 보상이나 설계도 드랍으로 얻는다 (제작은 테오 구조 후)
// 설계도 아이템은 부품마다 자동 생성. 등급별 풀에서 무작위로 떨어진다 (loot의 'bp:일반' 등)
SA.BP_POOL = { 일반: [], 강화: [] };
for (const id in SA.PARTS) {
  if (SA.START_RECIPES.includes(id)) continue;
  const d = SA.PARTS[id];
  if (!SA.ITEMS['bp_' + id]) SA.ITEMS['bp_' + id] = { name: '설계도: ' + d.name, w: 1, h: 1, val: { 일반: 100, 강화: 200 }[d.tier], kind: 'bp', recipe: id, color: '#e6edf3', desc: '격납고에서 영구 해금된다. 이미 알면 판매.' };
  if (id !== 'raven' && id !== 'sensor') SA.BP_POOL[d.tier].push(id);   // 레이븐 전용 설계도는 일반 드랍 풀에서 뺀다
}
// 작업대 단계 (임시): 1 기본 → 2 정비(테오 의뢰 · 일반 설계도 전부 + 행성 강화 + 강화 설계도 1) → 3 정밀(테오 의뢰 · 강화 설계도 일부 + 은하 강화)
SA.BENCH = {
  name: ['', '기본 작업대', '정비 작업대', '정밀 작업대'],
  give: { 1: SA.START_RECIPES, 2: Object.keys(SA.RECIPES).filter(id => SA.PARTS[id] && SA.PARTS[id].tier === '일반'),
          3: ['beam', 'swarm', 'drone', 'intercept', 'cannon', 'overdrive', 'barrier', 'grazeamp'] },
  opens: { 1: '일반 부품 기본기', 2: '일반 부품 설계도 전부 · 강화 등급 제작 · 행성 올리기 · 강화 설계도 1장 · 행성 설계도 고르기 1장', 3: '강화 설계도 8장 · 행성 설계도 고르기 1장 · 은하 제작' },
  pick: { 2: 1, 3: 1 },   // 행성 설계도 고르기 (임시)
  bonusBp: { 2: 1 },
  upRoll: 0.25,                              // 일반 설계도를 다 알면: 이 확률로 모르는 강화 설계도, 아니면 아래 재료
  fallback: ['alloy', 'fcore', 'qcircuit'],
};
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
// 레이드 소모품 단축키: 상단 숫자 1·2·3 = 숫자패드 1·2·3 (화물칸에서 알아서 찾아 쓴다)
SA.QUICK = [{ n: 1, id: 'repairkit' }, { n: 2, id: 'canister' }, { n: 3, id: 'stardata' }];
SA.KIND_NAME = { mchip: '개조 칩', pbp: '행성 설계도', mat: '재료', umat: '상위 재료', cell: '동력원', use: '소모품', key: '해독키', lore: '정보', data: '정보', bp: '설계도', capsule: '구조', part: '부품', ticket: '고용권' };
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
SA.ITEMS.cap_raven = { name: '레이븐의 탈출 포드', w: 2, h: 2, val: 0, kind: 'capsule', img: 'assets/i_pod.png', color: '#ff4d6d', desc: '격추된 레이븐이 갇힌 탈출 포드. 들고 탈출해야 그녀를 붙잡는다. 들고 있으면 이속 -10%.' };
// 난파선 (임시): 아이템 하나당 0.9초, 마지막 한 개는 4초. 벗어나면 진행 중 게이지가 초당 0.6씩 줄어든다.
// 마지막 보상은 위에서부터 굴려 처음 당첨된 것 하나 (좋은 것 확률 높게)
SA.WRECK = { maxItems: 5, per: 0.9, last: 4, decay: 0.6, final: [['bp:강화', .15], ['goldchip', .3], ['bp:일반', .35], ['engine', .35], ['prec', 1]] };
// 대사창 화자: 초상화는 assets/portrait_<id>.png (원화가 작업물이 오면 넣는다. 없으면 실루엣)
SA.SPEAKERS = {
  cmd:    { name: '???', title: '', color: '#e6edf3' },   // 튜토리얼 화자: 정체는 숨긴다 (튜토리얼이 끝난 뒤에야 단장이라고 불린다)
  raven:  { name: '레이븐', title: '네임드 용병', color: '#ff4d6d' },
  serena: { name: '세레나', title: '왕국 장군', color: '#8fb6ff' },
  volk:   { name: '볼크', title: '제국 돌격 에이스', color: '#ff7a6b' },
  mina:   { name: '미나', title: '정비병', color: '#ffd166' },
  dan:    { name: '단장', title: '', color: '#8f9bb8' },   // 튜토리얼 뒤의 단장 (통신)
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
             barks: { charge: '큰 놈이다! 내가 먼저 간다!', hunter: '…저건 내가 떨어뜨린다. 아무도 손대지 마.', low: '아직 날 수 있어! 물러나는 건 제국 돌격대가 아니야!' } },
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
               drops: [['core', .55], ['wire', .5], ['prec', .3], ['scrap', .8], ['bp:일반', .08], ['bp:강화', .05], ['key_box1', .05], ['key_zone', .03], ['bb_reward', .04], ['klens', .1]] },
  e_frigate: { name: '제국 순양함', faction: 'empire', ai: 'frigate', hp: 130, r: 20, speed: 34, img: 'assets/e_frigate.png', size: [34, 47],
               drops: [['core', .5], ['engine', .35], ['prec', .3], ['scrap', .8], ['bp:일반', .08], ['bp:강화', .05], ['key_box1', .05], ['key_zone', .03], ['bb_reward', .04], ['bb_empire', .08], ['flamecore', .12]] },
  k_turret:  { name: '왕국 포대', faction: 'kingdom', ai: 'turret', hp: 70, r: 12, speed: 0, img: 'assets/k_turret.png', size: [18, 25], pivot: [0.5, 0.67],
               drops: [['scrap', .7], ['wire', .3], ['core', .25], ['prec', .15], ['klens', .04]] },
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
  lumina:  { name: '성운 나방 루미나', ai: 'lumina', size: [130, 103], hp: 1, r: 26, speed: 0, color: '#ffe9a8', boss: true, drops: [],
    hb: { cx: 0, cy: 4, rx: 60, ry: 34 },              // 몸 전체 판정(타원): 날개까지 맞는다 (v0.94, 임시)
    weak: { x: 0, y: 32, r: 10, mul: 1.3 } },          // 약점 = 아래쪽 구슬. 맞추면 피해 ×1.3 (임시)   // 1막 최종 보스 (균열 아레나). 체력은 페이즈마다 SA.RIFT.hp
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
  chips: 300,   // 기본 개조 칩 가격 (오스 단말, 임시)
  // 도리 배달 (v0.70, 전부 임시): 출격이 끝날 때마다 새 재고. 재료 4칸 + 행성 설계도 1~2 + 부품 1~2 + 희귀 확률
  delivery: { mul: 2.5, pbpMul: 4, matKinds: 4, matN: [2, 5], pool: ['scrap', 'wire', 'core', 'engine', 'goldchip', 'prec'], pbp2: .4, ebp: 1, ebpMul: 4, ebpBench: 2, partKinds: [1, 2], partEnh: .3, noPart: ['raven', 'sensor'], rare: [['crystal', .2], ['ace', .05]] },
};

SA.MAPS = {
  mine: { name: '폐광 소행성대', act: 1, sx: 6, sy: 6, desc: '튜토리얼 겸 파밍 맵. 소행성이 엄폐물. 침식이 느리다.' },
  front: { name: '전선 궤도', act: 2, locked: true },
  grave: { name: '함대 묘지', act: 3, locked: true },
  abyss: { name: '심연 균열', act: 4, locked: true },
};

// 행성 설계도: 부품마다 1장. 등록하면 그 부품을 행성으로 올릴 수 있다
for (const id in SA.PLANET) SA.ITEMS['pbp_' + id] = { name: '행성 설계도: ' + SA.PARTS[id].name, w: 1, h: 1, val: 250, kind: 'pbp', part: id, color: '#ffd166', desc: `등록하면 ${SA.PARTS[id].name}을(를) 「${SA.PLANET[id][0]}」(으)로 올릴 수 있다. 이미 알면 판매.` };

// 은하 부품 (2차, 임시): 행성 부품 + 특수 재료로 만드는 다른 부품. 바탕 부품의 행동·행성 전용 개조를 그대로 물려받고 효과가 하나 붙는다
SA.GALAXY = {
  g_pulse:    { base: 'pulse',    name: '화염 펄스포',     mats: { flamecore: 2 },             fx: '맞은 적에 화상이 쌓인다 (쌓일수록 초당 피해 증가, 최대 10중첩).' },
  g_scatter:  { base: 'scatter',  name: '균열 산탄포',     mats: { crystal: 3 },               fx: '파편이 닿은 자리에 2초간 적만 다치는 균열이 남는다.' },
  g_lance:    { base: 'lance',    name: '태양창',          mats: { klens: 2 },                 fx: '적을 전부 관통하고 사거리 2배, 지나간 자리의 적 탄을 지운다.' },
  g_sniper:   { base: 'sniper',   name: '심연 저격총',     mats: { abyss: 1 },                 fx: '정조준 탄으로 처치하면 그 적이 폭발하고, 다음 발이 바로 정조준된다.' },
  g_beam:     { base: 'beam',     name: '성운 광선',       mats: { klens: 1, crystal: 2 },     fx: '광선이 세 갈래로 갈라진다 (옆 갈래는 피해 60%).' },
  g_missile:  { base: 'missile',  name: '소이 미사일 포드', mats: { flamecore: 2 },             fx: '미사일이 터진 자리에 3초간 화염 장판이 남는다.' },
  g_orbital:  { base: 'orbital',  name: '태양 낙하',       mats: { flamecore: 1, klens: 1 },   fx: '거대한 포격 한 발 + 넓은 화염 장판 4초.' },
  g_gravity:  { base: 'gravity',  name: '사건의 지평선',   mats: { abyss: 1 },                 fx: '끝날 때 빨아들인 적 탄을 사방으로 되쏜다.' },
  g_shield:   { base: 'shield',   name: '잔상 방패',       mats: { chip: 1 },                  fx: '방패 동안 잔상이 남아, 지나간 자리로 오는 적 탄을 1초간 지운다.' },
  g_mg:       { base: 'mg',       name: '인광 날개 포탑', mats: { lumdust: 1 },              fx: '화면의 적 탄 50발마다 위력 +5% (최대 +30%). 탄막이 짙을수록 강해진다 (루미나 각성).' },
  g_timestop: { base: 'timestop', name: '시간 결정',       mats: { crystal: 3 },               fx: '멈춘 적 탄이 풀릴 때 내 탄으로 바뀌어 적을 노린다.' },
};
SA.GAL_MUL = 1.5; SA.GAL_RANGE = 1.25; SA.GAL_MAX = 150;   // 은하: 주 스탯 ×1.5 · 액티브 범위 ×1.25 · 최대 내구도 150 (임시)
for (const gid in SA.GALAXY) {
  const g = SA.GALAXY[gid], b = SA.PARTS[g.base];
  SA.PARTS[gid] = Object.assign({}, b, { name: g.name, tier: '은하', val: b.val * 4, base: g.base, gal: true, noUp: true, desc: b.desc + ' ' + g.fx });
  const sz = SA.PART_DROP.size[b.slot];
  SA.ITEMS['pt_' + gid] = { name: g.name, w: sz[0], h: sz[1], val: Math.round(b.val * 4 * 0.6), kind: 'part', tier: '은하', part: gid, img: b.img, color: SA.TIER_COL['은하'], desc: `[부품] ${SA.PARTS[gid].desc} 탈출하면 부품함으로 들어간다.` };
}
SA.baseOf = (id) => (SA.PARTS[id] && SA.PARTS[id].base) || id;
SA.galCost = (gid) => { const g = SA.GALAXY[gid], b = SA.PARTS[g.base]; return { mats: Object.assign({ qcircuit: 2 }, g.mats), cr: b.val * 2 }; };

// ── 등급 색 단일 기준 (v0.70) ──
// 재료·소모품·칩·설계도·부품 전부 등급이 있고, 색은 SA.TIER_COL 하나에서만 정한다. (이야기 아이템인 블랙박스·고용권·구조 캡슐은 등급 없이 자기 색)
for (const id of ['scrap', 'wire', 'core', 'engine', 'debris', 'canister', 'repairkit']) SA.ITEMS[id].tier = '일반';
for (const k of SA.CHIPS) SA.ITEMS['mc_' + k].tier = '일반';
SA.TIER_SHORT = { 일반: '일', 강화: '강', 행성: '행', 은하: '은' };
SA.itemTier = (id, it) => {
  const d = SA.ITEMS[id]; if (!d) return null;
  if (it && it.lv) return it.lv === 2 ? '은하' : '행성';
  if (d.kind === 'bp') return (SA.PARTS[d.recipe] || {}).tier || '일반';
  if (d.kind === 'pbp') return '행성';
  return d.tier || null;
};
SA.itemCol = (id, it) => { const t = SA.itemTier(id, it); return t ? SA.TIER_COL[t] : SA.ITEMS[id].color; };
// 이름 + 등급 글자 (상점·목록용). 색만으로 구분하지 않도록 등급 글자를 같이 쓴다
SA.itemNameHtml = (id, it) => { const t = SA.itemTier(id, it), d = SA.ITEMS[id]; return t ? `<span style="color:${SA.TIER_COL[t]}">${d.name}</span> <span class="tier" style="color:${SA.TIER_COL[t]};border-color:${SA.TIER_COL[t]}66">${t}</span>` : d.name; };

// ── 수집가 (v0.71, 전부 임시): 출격 중 낮은 확률로 나타나는 중립 상인. 산 물건은 화물칸 → 들고 탈출해야 내 것
SA.COLLECTOR = {
  chance: 0.2, minRaids: 2, r: 85, w: 96, h: 88,
  pbp: 2, pbpMul: 5,                       // 아직 모르는 행성 설계도 2장 (도리 ×4보다 비쌈)
  part: 1, partMul: 3, partAdd: 1000,      // 행성 부품 완성품 1개 (내구도 가득) — 시세 ×3 + ₵1000 (설계도 없이 바로 행성이라)
  mats: ['flamecore', 'klens', 'crystal'], matKinds: 2, matN: [1, 2], matMul: 3,   // 특수 재료
  buy: ['ace', 'crystal', 'flamecore', 'klens', 'abyss', 'chip'], buyMul: 1.5,       // + 블랙박스 전부(lore)
};
SA.collectorBuys = (id) => { const d = SA.ITEMS[id]; return !!d && (d.kind === 'lore' || SA.COLLECTOR.buy.includes(id)); };

// ── 적별 전용 강화 설계도 (v0.72, 확률 임시) ──
// 그 적을 격추하면 이 목록 중 아직 모르는 설계도가 따로 굴려진다 (불운 보정·스침 보너스 적용). 일반 랜덤 설계도 드랍은 그대로
SA.SIG_BP = {
  k_frigate: ['sdrone', 'chain', 'counter'],   // 왕국: 방어·제어
  e_frigate: ['glass', 'orbital', 'redheart'],  // 제국: 공격
  k_turret:  ['sniper', 'deflect'],
  e_turret:  ['hturret', 'execute'],
  m_turret:  ['vault', 'secure2', 'decoder'],   // 폐광: 약탈 (보안해독기는 보안상자가 해독기를 요구해서 여기로)
  corrode:   ['resonator', 'timestop'],         // 침식·심연: 탄막 조작
  hunter:    ['gravity', 'grazeflow'],
  raven:     ['discharge'],
  mimic:     ['reflect'],
};
SA.SIG_RATE = { frigate: 0.08, turret: 0.04, corrode: 0.03, hunter: 0.4, raven: 0.4 };   // 적 ai 기준

// ── 파일럿 숙련도 (v0.74, 점수·등급 임시) ──
// 탈출에 성공한 판만 점수를 얻는다 (격추돼도 쌓인 점수는 줄지 않는다). 플레이 시간은 기록만, 점수에는 넣지 않는다
SA.MASTERY = {
  extract: 100,          // 탈출 성공
  perCr: 1 / 20,         // 가져온 화물 가치 ₵20당 1점
  perGraze: 0.5,         // 스친 탄 1발당
  perKill: 5,            // 격추 1기당
  boss: 150,             // 보스·네임드 격추 (사냥꾼·레이븐·실험 무인기)
  ranks: [[0, '신입'], [500, '숙련'], [2000, '베테랑'], [5000, '에이스'], [12000, '전설']],
};
SA.MASTERY_BOSS = ['hunter', 'raven', 'mimic', 'lumina'];
SA.masteryRank = (score) => { const R = SA.MASTERY.ranks; let i = 0; while (i + 1 < R.length && score >= R[i + 1][0]) i++; return { i, name: R[i][1], from: R[i][0], to: R[i + 1] ? R[i + 1][0] : null, next: R[i + 1] ? R[i + 1][1] : null }; };
SA.RANK_COL = ['#9fb3c8', '#5dffb0', '#7fd3ff', '#ffd166', '#ff8fb0'];

// ── 균열 · 1막 최종 보스 「성운 나방 루미나」 (v0.80, 수치 전부 임시) ──
// 균열에 들어가면 바깥 맵을 얼려 두고 화면 한 장 크기의 아레나로 넘어간다. 이기면 바로 귀환, 지면 내구도를 잃고 튕겨 나온다.
SA.RIFT = {
  w: 300, h: 340, zoom: 2,          // 아레나 크기 (월드 단위) · 화면 배율 (세로 340이 화면 높이 720에 꽉 찬다)
  near: 60,                         // 균열에 들어갈 수 있는 거리
  again: 0.15,                      // 한 번 이긴 뒤 출격마다 다시 나올 확률
  hp: [2400, 2700, 3000],           // 페이즈 1~3 체력 (펄스건 기본 기준 약 45~55초)
  phaseT: 60, lastT: 30,            // 페이즈 제한 시간 · 마지막 발악 버티는 시간
  gap: 1.6,                         // 페이즈 사이 쉬는 시간 (패턴 이름이 뜬다)
  phaseBonus: 200,                  // 체력으로 깨고 그 페이즈 동안 안 맞으면 ₵200
  durLoss: 35, outHp: 0.5,          // 아레나에서 격추: 장착 부품 내구도 -35, 체력 50%로 튕겨 나온다
  first: { items: [['lumdust', 1], ['qcircuit', 2], ['crystal', 3]], cr: 1500 },
  again2: { items: [['lumdust', 1]], cr: 600 },
  // v0.95 보스전 비주얼 (보스전_비주얼_사양_v1.md, 수치 임시)
  // 탄 색 규칙: 보스마다 역할별로 정한다. 루미나 = 일반 탄 연금빛 · 큰 구슬 은백 · 발악 주황, 날개무늬 두 나선만 하늘/분홍(차분하게)
  col: { main: '#ffe9a8', big: '#e8eefc', last: '#ffb347', sky: '#9bddf0', pink: '#e8a8d6' },
  hud: ['#ffe9a8', '#9bddf0', '#e8eefc', '#ffb347'],          // 페이즈별 포인트 색 (HUD·틈 빛)
  tint: [[255, 150, 215, 0.05], [120, 205, 255, 0.10], [220, 228, 255, 0.07], [170, 45, 35, 0.09]],   // 페이즈별 배경 색 덮개 (r,g,b,알파)
  riftW: [40, 70, 100, 140],        // 위쪽 틈 폭 (월드) 페이즈 1·2·3·발악
  flow: 6,                          // 배경 그림이 아래로 흐르는 속도 (월드/초)
  pulse: 0.06,                      // 마디 첫 박 맥동 세기 (배경 밝기 덮개 알파)
  spr: { w: 130, h: 103, py: 0.5426 },   // 루미나 도트(assets/lumina_*.png, 505x399) 월드 크기 · 몸통(얼굴) 중심 높이 비율. 보스 중심(e.x,e.y)이 이 점에 온다 (임시 크기)
};
