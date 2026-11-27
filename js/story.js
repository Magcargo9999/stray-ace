// 대사·의뢰·블랙박스. 플래그 키로 묶어 둔다 (나중에 2막·3막을 여기에 추가).
SA.STORY = {
  // (예전 대사 묶음, 지금 화면에는 쓰지 않는다. 격납고 말은 아래 SA.HG_LINES)
  broker: [
    '중개인 오스: "왕국이든 제국이든 돈은 같은 색이야. 살아서만 돌아와."',
    '중개인 오스: "폐광은 아직 조용해. 조용한 데가 제일 시끄럽지."',
  ],
  mechanic0: ['정비병 미나: "고칠 수 있으면 아직 안 끝난 거예요. 일반 부품이라면요."'],
  mechanic: ['정비사 테오: "부품이 반 넘게 닳으면 성능이 떨어져요."'],
  deliv: ['배달 상인 도리: "필요한 건 뭐든 가져다 드릴게요. 값은 조금 쳐주셔야겠지만요."'],
  // 조난 신호 (구조 신호가 맵에 뜰 때 한 번 보인다)
  signals: {
    teo: '[조난] 정비사 테오예요… 시네라 철수선이 끝내 안 왔어요. 위치 보낼게요. 누구라도 와 줘요.',
    deliv: '[조난] 배달선 도리호, 화물째 표류 중이에요. 구해 주시면 값은 확실히 쳐 드릴게요.',
    bruno: '[조난] 브루노다. 은퇴한 몸이라 길눈이 어두워졌어. 정면으로 가다 길을 잃었다. 데리러 와라.',
    jet: '[조난] 제트야, 연료 바닥났어. 뒤에 누가 따라붙었고. 빨리 와 줘—느리면 곤란해.',
    silva: '[조난] ……실바. 위치는 보냈어. 늦으면 그 자리엔 이미 없을 거야.',
  },
  // 의뢰: 게시판에서 수주해야 진행된다(동시 3개). 왕국·제국 의뢰는 진영 호감도를 바꾼다 — 1막이 끝날 때 호감도가 높은 진영의 2막 루트로 간다.
  // type: extract(탈출) · deliver(납품) · kill(target 접두어의 적 격추 후 탈출) · raven(레이븐을 붙잡기, 수주 전에 했어도 인정)
  contracts: [
    // 정비사 테오: 작업대 강화 (구조하면 자동 수주, 수주 한도에 안 센다)
    { id: 'teo_bench2', title: '작업대 강화 I', giver: '정비사 테오', fac: 'neutral', key: true, auto: true, type: 'deliver', mats: { scrap: 6, wire: 2, core: 1 }, req: p => p.rescued.teo,
      brief: '이 작업대로는 못 버텨요. 재료만 구해 오시면 손볼게요. 그럼 일반 부품은 전부 찍어 낼 수 있어요.', reward: { credits: 0, bench: 2 } },
    { id: 'teo_bench3', title: '작업대 강화 II', giver: '정비사 테오', fac: 'neutral', key: true, auto: true, type: 'deliver', mats: { alloy: 3, fcore: 2, qcircuit: 2 }, req: p => (p.benchLv || 1) >= 2,
      brief: '정밀 공구까지 갖추면 은하급도 손댈 수 있어요. 시네라가 두고 간 도면도 몇 장 살려 둘게요.', reward: { credits: 0, bench: 3 } },
    { id: 'first', title: '첫 출격', giver: '중개인 오스', fac: 'neutral', type: 'extract', need: 1,
      brief: '아무 탈출점으로든 살아서 돌아와. 그거면 돼.', reward: { credits: 300, item: 'bp_scatter' } },
    { id: 'decode1', title: '보안해독기 도면', giver: '중개인 오스', fac: 'neutral', type: 'extract', need: 2,
      brief: '잠긴 상자 여는 법을 아는 사람이 있어. 두 번 살아 돌아오면 도면을 넘겨줄게.', reward: { credits: 400, item: 'bp_decoder' } },
    { id: 'raven1', title: '표적: 레이븐', giver: '중개인 오스', fac: 'neutral', key: true, type: 'raven', need: 1,
      brief: '레이븐이 소행성대 중심에 둥지를 틀었어. 죽이지 말고 데려와. …할 얘기가 있는 건 내가 아니야.', reward: { credits: 1200, item: 'bp_lance' } },
    // 1막 후반 (레이븐을 붙잡은 뒤): 네임드 윙맨과 함께 출격. 윙맨·수송선이 격추되면 그 판은 실패 (수주는 유지)
    // 세레나 호위는 메인 목표(mS)이기도 하다
    { id: 'w_kingdom', title: '호위: 왕국 수송선', giver: '중개인 오스', fac: 'neutral', key: true, type: 'wing', named: 'kingdom', goal: 'escort', need: 1, req: p => p.raven.done,
      brief: '왕국 장군 세레나가 직접 수송선을 끌고 소행성대를 지나. 같이 붙어서 탈출점까지 데려다줘. 수송선도 장군도 잃으면 안 돼. …장군이 직접 왔다는 건, 왕국이 급하다는 뜻이야.', reward: { credits: 1500, item: 'ace' } },
    { id: 'w_empire', title: '사냥: 심연의 사냥꾼', giver: '중개인 오스', fac: 'neutral', key: true, type: 'wing', named: 'empire', goal: 'hunter', need: 1, req: p => p.raven.done,
      brief: '제국 에이스 볼크가 사냥꾼을 잡겠다고 난리야. 꼭 자기 손으로 잡아야 한대. 침식이 짙어지면 그놈이 깨어나. 같이 떨어뜨리고 나와.', reward: { credits: 1800, item: 'ace' } },
    { id: 'deliver1', title: '납품: 고철과 코어', giver: '왕국 보급관', fac: 'kingdom', type: 'deliver', mats: { scrap: 8, core: 2 },
      brief: '전선 수리에 쓸 고철 8개, 코어 2개. 출처는 묻지 않겠다.', reward: { credits: 700 } },
    { id: 'k_hunt', title: '소탕: 제국 초계대', giver: '왕국 보급관', fac: 'kingdom', type: 'kill', target: 'e_', need: 12,
      brief: '소행성대의 제국 함선 12기. 격추하고 살아서 돌아와야 보고가 된다.', reward: { credits: 900 } },
    { id: 'k_wire', title: '납품: 통신 부품', giver: '왕국 보급관', fac: 'kingdom', type: 'deliver', mats: { wire: 4, prec: 2 },
      brief: '전선 다발 4개, 정밀 부품 2개. 왕국 규격이면 더 좋고.', reward: { credits: 800, item: 'klens' } },
    { id: 'blackbox1', title: '블랙박스 회수', giver: '제국 보급관', fac: 'empire', type: 'deliver', mats: { blackbox: 1 },
      brief: '소행성대에 추락한 정찰선의 블랙박스. 해독하지 말고 그대로 가져와.', reward: { credits: 500, item: 'bp_shield' } },
    { id: 'e_hunt', title: '소탕: 왕국 초계대', giver: '제국 보급관', fac: 'empire', type: 'kill', target: 'k_', need: 12,
      brief: '왕국 함선 12기. 숫자만 맞추면 돼. 살아서 돌아와야 셈에 넣는다.', reward: { credits: 900 } },
    { id: 'e_engine', title: '납품: 엔진 부품', giver: '제국 보급관', fac: 'empire', type: 'deliver', mats: { engine: 2, core: 2 },
      brief: '엔진 2기, 코어 2개. 각인은 긁어 오지 않아도 된다.', reward: { credits: 800, item: 'flamecore' } },
  ],
  // 스토리형 블랙박스 (1막 9개, 출처별 묶음). 해독하면 그 묶음에서 안 읽은 다음 기록이 열린다.
  // 원칙: 주인공의 비밀은 냄새만 — '격리 명령'과 '명령을 거부한 왕국 에이스'가 있었다는 것까지. 그게 단장이라는 건 말하지 않는다
  bbSrc: {
    kingdom: { name: '왕국 정찰선', item: 'blackbox', where: '추락한 정찰선 (매 출격 난파선 중 1곳)' },
    raven:   { name: '레이븐', item: 'bb_raven', where: '레이븐 재대결에서 격추' },
    mimic:   { name: '제국 실험 무인기', item: 'bb_mimic', where: '제국 실험 무인기 격추 (레이븐 합류 뒤)' },
    empire:  { name: '제국 순양함', item: 'bb_empire', where: '제국 순양함 격추 (가끔)' },
    hunter:  { name: '심연의 사냥꾼', item: 'bb_hunter', where: '심연의 사냥꾼 격추' },
    lumina:  { name: '격리 함대 파일럿', item: 'bb_lumina', where: '추락한 기록 포드 · 균열 속' },
  },
  blackbox: [
    { id: 'k1', src: 'kingdom', title: '정찰선 KR-07 교신 기록', lines: [
      '[KR-07] 소행성대 외곽 순찰 중. 이상 없음.',
      '[KR-07] 잠깐, 왕국 주파수다. 아군 함선이 무기를 켜고 따라온다.',
      '[관제] KR-07, 귀함은 격리 대상으로 분류됐다. 엔진을 끄고 대기하라.',
      '[KR-07] 격리? 우린 오염된 적 없— (기록 끊김)' ] },
    { id: 'k2', src: 'kingdom', title: 'KR-07 승무원의 사적 메모', lines: [
      '[승무원] 3년 전 그 함대도 이렇게 끝났다고들 한다. 격리 명령 한 줄로.',
      '[승무원] 그때 명령을 거부한 에이스가 하나 있었다지. 이름은 기록에서 지워졌고.',
      '[승무원] 오염된 함선에서 사람을 끌어냈다던데. 살아 있다면 지금 어디서 뭘 하고 있을까.' ] },
    { id: 'r1', src: 'raven', title: '레이븐의 개인 로그', lines: [
      '[레이븐] 졌다. 3년 동안 한 번도 안 졌는데.',
      '[레이븐] 반 박자 늦게 꺾는 그 버릇. 대장이 나한테만 가르쳐 준 거라고 생각했는데.',
      '[레이븐] …살아 있었으면 연락 한 번은 했어야지.' ] },
    { id: 'm1', src: 'mimic', title: '제국 실험 무인기 학습 기록', lines: [
      '[학습 기록] 표본 R(용병 레이븐) 비행 데이터 412시간 학습 완료.',
      '[학습 기록] 표본 R의 회피 기동 중 37%는 왕국군 교범에 없는 동작. 출처 추정: 왕국 에이스 1명의 개인 기술.',
      '[학습 기록] 해당 에이스의 기록은 말소됨. 표본 R을 통해 간접 학습을 계속한다.' ] },
    { id: 'e1', src: 'empire', title: '제국 순양함 함장 보고서', lines: [
      '[함장] 왕국이 이 소행성대에서 결정을 캐 간다. 우리도 캔다. 누가 먼저 쓰느냐의 문제다.',
      '[함장] 결정 근처에 오래 있던 승무원 둘이 말을 잃었다. 기술부는 피로라고 한다.',
      '[함장] 피로가 선체에 금을 내나?' ] },
    { id: 'e2', src: 'empire', title: '제국 기술부 지시문', lines: [
      '[기술부] 침식 결정 회수를 최우선으로 한다. 함선 손실은 감수한다.',
      '[기술부] 왕국은 이미 결정을 무기로 썼다. 3년 전, 자기 함대에.',
      '[기술부] 같은 실수를 하지 않으려면, 우리가 먼저 제대로 써야 한다.' ] },
    { id: 'h1', src: 'hunter', title: '침식된 함선의 마지막 기록', lines: [
      '[???] 선체 온도 정상. 승무원 전원 정상. 정상. 정상.',
      '[???] 밖에서 누가 선체를 두드린다. 여긴 진공인데.',
      '[???] 문을 열지 마라. 열지 마라. 열지— (긴 잡음) …깨어 있다. 아래에서.' ] },
    // 루미나: 3년 전 격리 함대의 파일럿(미나의 상관). 이름은 끝까지 나오지 않는다
    { id: 'l1', src: 'lumina', title: '기록 포드: 격리 함대 파일럿', lines: [
      '[???] 격리 명령이 떨어진 지 4일째. 결정 빛이 선체 안까지 들어온다.',
      '[???] 정비병 아이는 탈출정에 태웠다. 그 사람이 데려갔다.',
      '[???] 나는 남는다. 이 기록만 포드에 실어 보낸다.',
      '[???] …몸이 가볍다. 날개가 돋는 꿈을 꾼다.' ] },
    { id: 'l2', src: 'lumina', title: '균열 속 기록', lines: [
      '[???] 빛을 따라가면 아래에서 멀어질 수 있다.',
      '[???] 이름이 기억나지 않는다. 정비병 아이가 불러 주던 이름.',
      '[???] 누가 오면 전해 줘. 고쳐 줘서 고마웠다고.' ] },
  ],
  // 보상형 블랙박스 (신호 7개): 해독하면 다음 출격 맵에 신호 지점. 무작위, 바로 전 신호는 다시 안 나온다. 기록에는 안 남는다
  bbReward: [
    { src: '왕국', title: '왕국 보급선 KS-12', lines: ['[KS-12] 보급품 일부를 소행성 그늘에 내려 둔다. 회수조가 올 때까지만.', '[KS-12] 좌표를 남긴다. …회수조가 오기는 할까.'],
      signal: { kind: 'cache', label: '왕국 숨은 보급고', loot: [['alloy', 1], ['cell2', .6], ['prec', 1], ['goldchip', .7], ['bp:강화', .5]] } },
    { src: '제국', title: '제국 순찰대 교신', lines: ['[순찰대] 이 좌표는 함정이다. 용병이 오면 기다렸다가 친다.', '[순찰대] 미끼 상자에는 진짜 설계도를 넣어 둬라. 그래야 문다.'],
      signal: { kind: 'ambush', label: '수상한 미끼 상자', loot: [['bp:강화', 1], ['part:강화', .4], ['goldchip', 1]] } },
    { src: '폐광', title: '폐광 감독관 일지', lines: ['[감독관] 금고 해독키는 내 책상 서랍에 있다. 금고는 B갱 끝.', '[감독관] 시네라 철수선이 오기 전에 누가 가져가 주면 좋겠군. 장부만은 넘기기 싫다.'],
      signal: { kind: 'cache', label: '감독관의 서랍', loot: [['key_box2', 1], ['alloy', 1], ['cell1', 1]] } },
    { src: '정체불명', title: '정체불명 송신', lines: ['[???] ……다음 좌표. 다음 좌표. 다음 좌표.', '[???] 받는 이가 있다면, 이어서 들어라.'],
      signal: { kind: 'next', label: '정체불명 송신원', loot: [['bb_reward', 1], ['stardata', 1], ['crystal', .7]] } },
    { src: '왕국', title: '왕국 기술병의 메모', lines: ['[기술병] 보안 구역 해독키를 정비창에 두고 왔다. 들키면 끝장인데.', '[기술병] 폐광에 왕국 보안 구역이 있다는 걸 아는 사람은 거의 없다.'],
      signal: { kind: 'cache', label: '정비창 잔해', loot: [['key_zone', 1], ['cell2', 1], ['prec', 1]] } },
    { src: '제국', title: '제국 에이스 비행 기록', lines: ['[에이스] 소행성대 사냥 기록. 오늘은 셋.', '[에이스] 내 격납고 좌표를 아는 놈이 있다면… 와 봐라. 상대해 주지.'],
      signal: { kind: 'ambush', label: '제국 에이스의 은신처', elite: true, loot: [['part:강화', 1], ['part:행성', .3], ['ace', .6], ['qcircuit', .5]] } },
    { src: '폐광', title: '광부 대피 방송 잔향', lines: ['[방송] B갱 폐쇄. 결정 노출 구역입니다. 접근하지 마십시오.', '[방송] 갱 안에서 움직이는 것은 광부가 아닙니다. 반복합니다. 광부가 아닙니다.'],
      signal: { kind: 'nest', label: '침식 둥지', loot: [['crystal', 1], ['crystal', 1], ['crystal', .6], ['qcircuit', .4], ['part:강화', .3], ['goldchip', .8]] } },
  ],
  // 메인퀘스트: '다음에 뭘 해야 하는지'만. 한 번에 하나, HUD 한 줄로 보인다. giver=의뢰인 · brief=목표가 열릴 때 격납고 브리핑 · comm=출격 시작 통신 · done=완료 대사 ([화자, 대사, 꼬리표?] 목록, v0.112)
  // 순서를 바꾸면 SA.Save.migrate의 mqV2 표도 같이 본다
  main: [
    { id: 'm1', giver: 'os', text: '폐광 소행성대에서 탈출점으로 귀환', ev: 'extract', need: 1, reward: 200, bp: 'plating',
      brief: [['os', '새로 판 차린 용병단이라며. 첫 일은 단순해. 들어가서, 뭐든 들고, 탈출점으로 나와.'], ['os', '들고 나온 만큼 쳐 줄게. 못 나오면 아무것도 없어.'], ['mina', '기체는 제가 봐 둘게요. 무리만 하지 마세요.'], ['dan', '나오는 게 먼저다.']],
      comm: ['탈출점은 지도에 떠 있어. 늦지만 마.', '욕심은 다음 판에 부려.', '화물칸 꽉 차면 그게 신호야. 나와.'],
      done: [['os', '살아 돌아왔네. 이 바닥에선 그게 첫 번째 재능이야.']] },
    { id: 'm2', giver: 'mina', text: '작업대에서 부품 1개 제작', ev: 'craft', need: 1, reward: 150, bp: 'missile',
      brief: [['mina', '주워 온 걸로 부품 하나 만들어 봐요. 작업대는 제 자리 옆이에요.'], ['dan', '직접 만든 걸 믿어라.']],
      done: [['mina', '손에 익은 부품이 제일 좋은 부품이에요. 단장님도 그러셨잖아요.']] },
    { id: 'm3', giver: 'os', text: '의뢰 게시판에서 의뢰를 수주하고 1개 완료', ev: 'contract', need: 1, reward: 200, bp: 'scatter',
      brief: [['os', '게시판에 일거리 올려 뒀어. 왕국 것도, 제국 것도.'], ['os', '어느 쪽 돈이든 돈은 돈이야. …아직은.'], ['mina', '왕국 의뢰도 받는 거예요?'], ['dan', '지금은 돈이 필요하다.']],
      comm: ['의뢰 조건은 게시판에 적힌 그대로야. 토 달지 마.', '의뢰주는 결과만 봐. 어떻게 했는지는 안 물어.'],
      done: [['os', '왕국도 제국도 당신 이름을 묻기 시작했어. 좋은 징조는 아니야.']] },
    // 정비사 테오 구조: 일반 설계도 5종(시작 제작법 제외)을 모으면 조난 신호가 열린다. 구조하고 탈출해야 완료
    { id: 'mR', giver: 'mina', commWho: 'sig', text: '조난 신호로 정비사 구조', ev: 'rescue', need: 1, reward: 400, rescue: true, check: p => p.rescued && p.rescued.teo,
      brief: [['mina', '조난 신호가 잡혀요. 시네라 작업 주파수예요.'], ['mina', '철수선 떠난 지가 언젠데… 아직 누가 남아 있어요.'], ['dan', '데려온다.']],
      briefLow: ['mina', '신호가 약해서 위치를 못 잡겠어요. 설계도를 더 모으면 수신기를 손볼 수 있어요.'],   // 일반 설계도가 모자랄 때 b-mR-2 뒤에 한 줄 더
      comm: ['…거기 누구 있어요? 철수선이에요?', '산소가… 아직은 괜찮아요. 아직은.', '신호 끊지 마세요. 제발.'],
      done: [['teo', '…살았다. 철수선은 끝내 안 오더라고요. 고마워요, 단장님. 작업대는 제가 맡을게요.']] },
    { id: 'm4', giver: 'os', text: '추락한 정찰선에서 블랙박스를 가져오기', ev: 'blackbox', need: 1, reward: 300, bp: 'flamer',
      brief: [['os', '폐광 깊은 데 왕국 정찰선이 떨어졌대. 블랙박스를 찾는 사람이 많아.'], ['os', '먼저 가져오는 쪽이 값을 정하는 거야.'], ['teo', '정찰선이 폐광까지 뭘 보러 왔을까요.'], ['dan', '먼저 가져온다.']],
      comm: ['추락 지점은 지도에 찍어 뒀어. 다른 놈들도 알아.', '블랙박스는 보안 칸에 넣어. 떨어져도 그건 살아.'],
      done: [['mina', '왕국 정찰선이네요. …단장님, 이거 제가 해독해도 돼요?']] },
    // 레이븐: 둥지에서 몰아붙이면 도주 → 다른 곳에서 재대결 → 탈출 포드를 들고 탈출. 퀘스트 순서와 상관없이 해 두면 인정된다
    { id: 'm5', giver: 'os', text: '네임드 레이븐을 붙잡기', ev: 'raven', need: 1, reward: 500, raven: true, check: p => p.raven && p.raven.done,
      brief: [['os', '「표적: 레이븐」. 3년 동안 한 번도 안 진 파일럿이야.'], ['os', '…이건 돈 때문에 주는 일 아니야. 가 보면 알아.'], ['mina', '단장님… 레이븐이면.'], ['dan', '잡아 와라. 다치게 하지 말고.']],
      comm: ['둥지 근처에서 봤대. 몰아붙이면 도망가는 타입이야.', '놓쳐도 돼. 다른 데서 또 나타나.', '그 녀석, 꺾는 버릇이 누구 거랑 닮았더라.'],
      done: [['raven', '…역시 당신이었군요, 대장. 이번엔 안 떠나는 거죠?']] },
    // 세레나와의 첫 만남: 호위 의뢰를 끝내면 완료 (의뢰 보상은 게시판에서 따로)
    { id: 'mS', giver: 'serena', text: '왕국 장군의 수송선 호위 — 의뢰 「호위: 왕국 수송선」', ev: null, need: 1, reward: 300,
      check: p => { const c = (p.contracts || {}).w_kingdom; return !!(c && (c.done || c.progress >= 1)); },
      brief: [['serena', '왕국 수송선 호위. 게시판에 올렸다. 당신 단장 앞으로.', '통신'], ['serena', '보수는 왕국 기준이다. 화물은 묻지 마라.', '통신'], ['raven', '왕국 의뢰를 받으라고요? …대장 뜻이면 따를게요.'], ['dan', '받아라. 뭘 싣는지 봐 둬.']],
      comm: ['수송선은 예정대로 간다. 늦지 마라.', '화물칸 봉인에 손대지 마라.', '…편대 간격이 좋군. 누구한테 배웠지.'],
      done: [['serena', '호위 확인. 보수는 넣었다. …당신 단장에게 전해. 결정은 캐지 말라고.', '통신']] },
    { id: 'm6', giver: 'dan', text: '침식 결정 3개 가져오기 (침식 1단계부터 침식체가 나온다)', ev: 'crystal', need: 3, reward: 600,
      have: p => SA.Grid.count(p.stash, 'crystal'), check: p => SA.Grid.count(p.stash, 'crystal') >= 3,   // 창고에 이미 있는 결정도 인정
      brief: [['mina', '단장님이 결정을 모아 오래요. 왕국이 또 뭘 준비하는지 직접 보시겠대요.'], ['mina', '침식 1단계부터 침식체가 나와요. 오래 머물지 마세요.'], ['teo', '결정은 제가 열어 볼게요. 안에 뭐가 들었는지.'], ['dan', '세 개. 오래 있지 마라.']],
      comm: ['결정 셋. 침식 30% 넘으면 돌아와.', '빛이 짙은 데는 레이더가 먹통이다. 눈으로 봐.', '결정은 보안 칸에.'],
      done: [['teo', '단장님, 결정 하나에서 왕국 군용 식별 신호가 잡혀요. …이건 사람 신호예요.']] },
    // 식별 신호를 따라: 출격 맵에 '추락한 기록 포드'가 뜬다. 그 블랙박스를 들고 탈출하면 완료
    { id: 'mB', giver: 'teo', text: '식별 신호를 따라 추락한 기록 포드의 블랙박스 가져오기', ev: 'lumbox', need: 1, reward: 600,
      brief: [['teo', '그 사람 신호, 좌표로 바꿨어요. 폐광 아래쪽이에요.'], ['teo', '추락한 기록 포드예요. 왕국 군용. 3년쯤 떠돌았어요.'], ['mina', '……가져와 주세요. 꼭요.'], ['dan', '가져온다.']],
      comm: ['포드는 지도에 찍었어요. 침식체가 붙어 있어요.', '신호가 흐려지면 결정 때문이에요. 가까이 가면 다시 잡혀요.'],
      done: [['mina', '포드 각인… 3년 전 그 함대 거예요. 해독은 제가 할게요.']] },
    // 1막 최종 보스: 출격 맵의 균열로 들어가 루미나를 쓰러뜨린다 (보상은 균열에서 따로 받는다)
    { id: 'mL', giver: 'serena', text: '균열 속 존재를 처리하기 (출격 맵의 보라색 균열)', ev: null, need: 1, reward: 0, check: p => p.lumina && p.lumina.wins > 0,
      brief: [['serena', '소행성대에 균열이 열렸다. 안의 것을 처리해라.', '통신'], ['serena', '기록은 왕국으로 가져와. 보수는 두 배다.', '통신'], ['mina', '그 함대 사람이… 아직 그 안에 있을지도 몰라요.'], ['dan', '들어가서 본다.']],
      comm: ['균열은 보라색이다. 출격 맵에 떠 있다.', '그 안에서 들리는 말은 듣지 마라.', '처리했으면 바로 나와라. 오래 있으면 소행성대가 먹힌다.'],
      done: [['os', '왕국에서도 제국에서도 연락이 왔어. 이제 양쪽 다 당신 이름을 안다는 뜻이야.'], ['raven', '왕국 통신이에요? …대장, 설마 받을 거 아니죠.']] },
    { id: 'm7', text: '2막 「전선 궤도」 — 다음 업데이트에서 열린다', ev: null, need: 1, reward: 0, actEnd: true,
      brief: [['dan', '…다음은 전선이다.']], done: [] },
  ],
  tips: [
    'Tab으로 화물칸을 열면 시간이 느려진다. 정리는 안전할 때.',
    '탄을 스치면(그레이즈) 드랍률이 오른다. 맞으면 절반을 잃는다.',
    '침식이 30%를 넘으면 기체가 약해진다. 욕심과 탈출 사이.',
    '보안 칸(2x2)에 넣은 건 격추돼도 살아남는다.',
  ],
};

// 블랙박스 해독: 맡기면(최대 SA.DECODE.slots개) 다음 출격이 끝날 때 한꺼번에 완료, 크레딧을 내면 즉시.
// 스토리형 → 그 출처 묶음의 다음 기록 (기록 탭). 묶음을 다 모았으면 신호로 바뀐다 · 보상형(bb_reward) → 다음 출격 맵에 신호 지점
SA.Decode = (() => {
  const srcOf = (id) => Object.keys(SA.STORY.bbSrc).find(k => SA.STORY.bbSrc[k].item === id);
  const nextLog = (prof, src) => SA.STORY.blackbox.find(b => b.src === src && !prof.logs.includes(b.id));
  const srcDone = (prof, src) => !nextLog(prof, src);
  const signal = (prof) => {
    const L = SA.STORY.bbReward; let i;
    do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === prof.lastSignal);
    prof.lastSignal = i; prof.signals = prof.signals || []; prof.signals.push(i);
    const b = L[i]; return { text: `신호 해독: ${b.title} — 다음 출격 맵에 '${b.signal.label}' 신호가 뜬다`, sig: i };
  };
  const done = (prof, id) => {
    const src = srcOf(id);
    if (src) {
      const b = nextLog(prof, src);
      if (!b) { const r = signal(prof); r.text = `${SA.STORY.bbSrc[src].name} 기록은 이미 다 안다 — 남은 좌표를 풀었다. ` + r.text; return r; }
      prof.logs.push(b.id); prof.logsNew = prof.logsNew || []; prof.logsNew.push(b.id);
      return { text: `기록 해독: ${b.title} — 기록 탭`, log: b.id };
    }
    return signal(prof);
  };
  const remember = (prof, r) => { prof.lastDecode = r; prof.recentSig = (prof.recentSig || []).concat(r.sig !== undefined ? [r.sig] : []).slice(-3); };
  const start = (prof, id, instant) => {
    if (instant) { if (prof.credits < SA.DECODE.instant) return null; prof.credits -= SA.DECODE.instant; const r = done(prof, id); remember(prof, r); return r; }
    prof.decoding = prof.decoding || [];
    if (prof.decoding.length >= SA.DECODE.slots) return null;
    prof.decoding.push({ id, raids: SA.DECODE.raids }); return { text: `해독을 맡겼다 (${prof.decoding.length}/${SA.DECODE.slots}) — 다음 출격이 끝나면 완료된다` };
  };
  // 출격이 끝날 때마다 호출 (탈출·격추 상관없이). 다 된 것을 한꺼번에 푼다
  const tick = (prof) => {
    if (!prof.decoding || !prof.decoding.length) return null;
    const out = [];
    for (const d of prof.decoding) if (--d.raids <= 0) { const r = done(prof, d.id); remember(prof, r); out.push(r.text); }
    prof.decoding = prof.decoding.filter(d => d.raids > 0);
    return out.length ? { text: out.join('<br>') } : null;
  };
  // 드랍할 때: 다 모은 출처의 스토리형은 신호 블랙박스로 바뀐다 (가지고 있는 것·맡긴 것까지 센다)
  const dropId = (prof, id) => {
    const src = srcOf(id); if (!src) return id;
    const total = SA.STORY.blackbox.filter(b => b.src === src).length;
    const read = prof.logs.filter(l => (SA.STORY.blackbox.find(b => b.id === l) || {}).src === src).length;
    const held = prof.stash.items.filter(it => it.id === id).length + (prof.decoding || []).filter(d => d.id === id).length + ((SA.R && SA.R.cargo) ? SA.R.cargo.items.concat(SA.R.secure.items).filter(it => it.id === id).length : 0);
    // 메인퀘스트 '블랙박스 가져오기'가 남아 있으면 정찰선 블랙박스는 그대로
    if (src === 'kingdom' && SA.Quest && SA.Quest.cur && (SA.Quest.cur().q || {}).id === 'm4') return id;
    if (src === 'lumina') return id;   // 루미나 기록은 기록 포드(mB)와 균열에서만 나온다 — 신호 블랙박스로 바꾸지 않는다
    return read + held >= total ? 'bb_reward' : id;
  };
  return { start, tick, srcOf, dropId, srcDone };
})();

// 격납고 NPC 말풍선 (임시, 과묵하게). 이름표는 HG_NPC, 대사는 상황별
SA.HG_NPC = {
  os:   { name: '오스', title: '중개인', color: '#8f9bb8' },
  teo:  { name: '테오', title: '정비사', color: '#9a7262', portrait: 'assets/npc_teo.png' },
  mina: { name: '미나', title: '정비병', color: '#ffd166' },
  dori: { name: '도리', title: '배달 상인', color: '#c9a96b' },
};
SA.HG_LINES = {
  // 평소 (오스는 팁도 섞는다). 미나의 혼잣말은 반말, 단장에게 하는 말은 존댓말
  idle: {
    os: ['왕국이든 제국이든 돈은 같은 색이야.', '폐광은 아직 조용해. 조용한 데가 제일 시끄럽지.', '살아서만 돌아와. 나머진 내가 팔아 줄게.', '여기선 아무도 이름을 안 물어. 그게 이 구역 규칙이야.'],
    teo: ['부품이 반 넘게 닳으면 성능이 떨어져요.', '제국 엔진에 왕국 전선… 요즘 배는 다 짜깁기예요.', '고칠 때마다 조금씩 못 쓰게 돼요. 그래도 고쳐야죠.', '시네라 사람들은 공구도 안 챙겨 갔어요. 사람도요.'],
    mina: ['고칠 수 있으면 아직 안 끝난 거야.', '단장님 손을 보면… 아니, 됐어.'],
    dori: ['필요한 건 뭐든 가져다 드려요.', '재고는 20분마다 새로 들여요.', '구해 주신 값은 할인으로 갚을게요. 조금씩요.'],
  },
  // 진행에 따라 섞이는 말: after = 그 메인 목표를 끝낸 뒤부터, before = 그 목표를 끝내기 전까지
  stage: [
    { who: 'os', before: 'm5', lines: ['레이븐… 요즘 양쪽 일을 다 받는다더군.'] },
    { who: 'mina', before: 'mR', lines: ['강화 도면은… 테오가 있었으면.'] },
    { who: 'mina', after: 'm4', lines: ['왕국 주파수… 오랜만에 들었어.'] },
    { who: 'os', after: 'm5', lines: ['둘이 할 얘기는 했어? …안 했겠지.'] },
    { who: 'os', after: 'mS', lines: ['장군이 직접 왔다는 건, 왕국이 급하다는 뜻이야.'] },
    { who: 'teo', after: 'm6', lines: ['결정 속 신호, 아직도 잡혀요. 꺼지질 않아요.'] },
    { who: 'mina', after: 'mB', lines: ['그분은 늘 내 정비가 제일이라고 했는데.'] },
    { who: 'teo', after: 'mB', lines: ['미나 씨, 요즘 밤에 작업대에서 안 내려와요.'] },
    { who: 'mina', after: 'mL', lines: ['저게 하나뿐일까.'] },
    { who: 'os', after: 'mL', lines: ['양쪽 다 당신 이름을 알아. 이제 고를 차례야.'] },
  ],
  // 대기실 파일럿 혼잣말 (인용문과 섞인다). after/before는 위와 같다
  pilot: {
    kai: [{ lines: ['단장이 그러는데, 난 너무 일찍 돈대. 반 박자 늦게.', '광부 아이가 파일럿이라니. 엄마가 보면 기절했겠지.'] }, { after: 'm5', lines: ['레이븐 누나, 진짜 빨라… 금방 따라잡을 거야.'] }],
    mina: [{ lines: ['정비도 출격도 내가 해. 사람이 없잖아.'] }],
    bruno: [{ lines: ['왕국군에선 정면으로 가면 훈장을 줬지. 여긴 살아서 오면 돈을 주고.', '은퇴했다더니 또 조종간을 잡네. 이 손이 문제야.'] }, { after: 'm4', lines: ['명령을 거부한 에이스 얘기, 들어는 봤지. …못 들은 걸로 해.'] }],
    jet: [{ lines: ['번호로 불리는 건 질색이야. 이름 불러.', '빚은 다 갚았어. …아마도.'] }],
    silva: [{ lines: ['……실바. 아직 어색해.', '여긴 아무도 날 미끼로 안 써. 이상해.'] }],
    raven: [{ lines: ['대장, 그 버릇 아직 그대로네요.', '…제국이 훔쳐 간 내 비행, 언젠가 돌려받을 거예요.'] }],
  },
  // 레이븐이 합류한 뒤 처음 말을 걸 때 한 번 (단장은 대답하지 않는다)
  ravenFirst: '그 좌표에서 사흘 기다렸어요. …… 괜찮아요. 이제 여기 있으니까.',
  tips: ['Tab 열면 시간이 느려져. 정리는 안전할 때.', '탄을 스치면 드랍이 올라. 맞으면 절반 날아가고.', '침식 30% 넘으면 기체가 무거워져.', '보안 칸에 넣은 건 격추돼도 남아.'],
  // 지금 상태
  claim: '보상 챙겨 가. 게시판에.',
  noJob: '빈손으로 나가지 말고 일거리 하나 받아 가.',
  worn: { teo: '부품이… 많이 상했어요. 작업대로 가져와요.', mina: '부품 상태 별로야. 작업대에서 고쳐.' },
  // 귀환 직후 (결과에 맞는 사람 한 명)
  crash: { teo: '또 이렇게… 아니, 살아 왔으니 됐어요. 고칠게요.', mina: '기체는 고치면 돼. 사람이 돌아왔잖아.', os: '격추라… 보안 칸이라도 챙겼길.' },
  rich: '이번엔 제법이네. 팔기 아까울 정도로.',
  empty: '빈손이야? …괜찮아, 살아 왔잖아.',
  back: '살아 왔으면 됐어.',
  found: { kai: '건졌어. 빙글 돌다 보니 손에 있더라.', mina: '주워 왔어. 고치면 쓸 만할걸.', bruno: '정면으로 뚫고 가져왔다. 옛날 버릇이지.', jet: '빨리 갔다 빨리 왔지.', silva: '…가져왔어. 아무도 못 봤어.', raven: '가져왔어요. 가르쳐 주신 대로.' },
  // 첫 방문 안내 (오스)
  guide: ['왼쪽 위 줄이 메인 퀘스트야. 순서대로 깨면 1막 끝에 균열이 열려. 마우스를 올리면 남은 단계가 다 보여.', '거치대야. 기체 고르고 장비 끼워서 나가.', '일거리는 저 게시판에 붙어. 하나 받아 가.', '준비되면 다시 거치대. 살아서만 돌아와.'],
};
// 진행 단계에 맞는 추가 대사를 고른다 ({lines, after?, before?} 목록)
SA.stageLines = (list, prof) => {
  const M = SA.STORY.main, i = ((prof || SA.profile).mq || {}).i || 0;
  const done = (id) => { const k = M.findIndex(q => q.id === id); return k >= 0 && i > k; };
  return (list || []).filter(s => (!s.after || done(s.after)) && (!s.before || !done(s.before))).flatMap(s => s.lines);
};
