// 대사·의뢰·블랙박스. 플래그 키로 묶어 둔다 (나중에 2막·3막을 여기에 추가).
SA.STORY = {
  broker: [
    '중개인 오스: "왕국이든 제국이든 돈은 같은 색이야. 살아서만 돌아와."',
    '중개인 오스: "폐광 소행성대는 아직 조용해. 전선이 여기까지 오기 전까진."',
    '중개인 오스: "레이븐 봤어? 그 녀석, 요즘 양쪽 의뢰를 다 받는다더군."',
  ],
  // 테오를 구조하기 전에는 미나가 정비를 맡는다
  mechanic0: [
    '정비병 미나: "작업대는 쓸 만해요. 그런데 강화 부품 도면은… 테오가 있었으면 좋았을 텐데."',
    '정비병 미나: "고칠 수 있으면 아직 안 끝난 거예요. 일반 부품이라면요."',
  ],
  mechanic: [
    '정비사 테오: "부품이 반 넘게 닳으면 성능이 떨어져. 고칠 때마다 조금씩 못 쓰게 되고."',
    '정비사 테오: "제국 엔진에 왕국 전선이라... 요즘 함선은 다 짜깁기야."',
  ],
  deliv: [
    '배달 상인 도리: "필요한 건 뭐든 가져다 드리죠. 값은 조금 쳐주셔야겠지만요."',
    '배달 상인 도리: "구해 주신 은혜는 잊지 않아요. 그래서 재고는 20분마다 새로 들여요."',
  ],
  // 조난 신호 (구조 대상의 첫 구조 신호 문구)
  signals: {
    teo: '[조난] 이쪽은 정비사 테오… 기체가 멈췄어요. 위치 송신합니다. 누가 좀 와 줘요.',
    deliv: '[조난] 배달선 도리호, 화물을 싣고 표류 중입니다. 구조해 주시면 사례는 확실히 할게요.',
    bruno: '[조난] 돌격대 브루노. 정면으로 갔다가 길을 잃었다. 데리러 와라.',
    jet: '[조난] 제트야, 연료가 바닥났어. 빨리 와 줘—느리면 곤란해.',
    silva: '[조난] ……실바. 위치는 보냈어. 늦으면 그 자리엔 이미 없을 거야.',
  },
  // 의뢰: 게시판에서 수주해야 진행된다(동시 3개). 왕국·제국 의뢰는 진영 호감도를 바꾼다 — 1막이 끝날 때 호감도가 높은 진영의 2막 루트로 간다.
  // type: extract(탈출) · deliver(납품) · kill(target 접두어의 적 격추 후 탈출) · raven(레이븐을 붙잡기, 수주 전에 했어도 인정)
  contracts: [
    { id: 'first', title: '첫 출격', giver: '중개인 오스', fac: 'neutral', type: 'extract', need: 1,
      brief: '아무 탈출점으로든 살아서 돌아와. 그거면 돼.', reward: { credits: 300, item: 'bp_scatter' } },
    { id: 'raven1', title: '표적: 레이븐', giver: '중개인 오스', fac: 'neutral', key: true, type: 'raven', need: 1,
      brief: '레이븐이 소행성대 중심에 둥지를 틀었어. 죽이지 말고 데려와. 할 얘기가 있거든.', reward: { credits: 1200, item: 'bp_lance' } },
    // 1막 후반 (레이븐을 붙잡은 뒤): 네임드 윙맨과 함께 출격. 윙맨·수송선이 격추되면 그 판은 실패 (수주는 유지)
    { id: 'w_kingdom', title: '호위: 왕국 수송선', giver: '중개인 오스', fac: 'neutral', key: true, type: 'wing', named: 'kingdom', goal: 'escort', need: 1, req: p => p.raven.done,
      brief: '왕국 장군 세레나가 직접 수송선을 끌고 소행성대를 지나. 같이 붙어서 탈출점까지 데려다줘. 수송선도 장군도 잃으면 안 돼.', reward: { credits: 1500, item: 'ace' } },
    { id: 'w_empire', title: '사냥: 심연의 사냥꾼', giver: '중개인 오스', fac: 'neutral', key: true, type: 'wing', named: 'empire', goal: 'hunter', need: 1, req: p => p.raven.done,
      brief: '제국 에이스 볼크가 사냥꾼을 잡겠다고 난리야. 침식이 짙어지면 그놈이 깨어나. 같이 그놈을 떨어뜨리고 나와.', reward: { credits: 1800, item: 'ace' } },
    { id: 'deliver1', title: '납품: 고철과 코어', giver: '왕국 보급관', fac: 'kingdom', type: 'deliver', mats: { scrap: 8, core: 2 },
      brief: '전선 수리에 쓸 고철 8개, 코어 2개. 출처는 묻지 않겠다.', reward: { credits: 700 } },
    { id: 'k_hunt', title: '소탕: 제국 초계대', giver: '왕국 보급관', fac: 'kingdom', type: 'kill', target: 'e_', need: 12,
      brief: '소행성대의 제국 함선 12기. 격추하고 살아서 돌아와야 보고가 된다.', reward: { credits: 900 } },
    { id: 'k_wire', title: '납품: 통신 부품', giver: '왕국 보급관', fac: 'kingdom', type: 'deliver', mats: { wire: 4, prec: 2 },
      brief: '전선 다발 4개, 정밀 부품 2개. 왕국 규격이면 더 좋고.', reward: { credits: 800 } },
    { id: 'blackbox1', title: '블랙박스 회수', giver: '제국 보급관', fac: 'empire', type: 'deliver', mats: { blackbox: 1 },
      brief: '소행성대에 추락한 정찰선의 블랙박스. 해독하지 말고 그대로 가져와.', reward: { credits: 500, item: 'bp_shield' } },
    { id: 'e_hunt', title: '소탕: 왕국 초계대', giver: '제국 보급관', fac: 'empire', type: 'kill', target: 'k_', need: 12,
      brief: '왕국 함선 12기. 숫자만 맞추면 돼. 살아서 돌아와야 셈에 넣는다.', reward: { credits: 900 } },
    { id: 'e_engine', title: '납품: 엔진 부품', giver: '제국 보급관', fac: 'empire', type: 'deliver', mats: { engine: 2, core: 2 },
      brief: '엔진 2기, 코어 2개. 각인은 긁어 오지 않아도 된다.', reward: { credits: 800 } },
  ],
  blackbox: [
    { title: '정찰선 KR-07 교신 기록', lines: [
      '[KR-07] 소행성대 외곽, 이상 없음.',
      '[KR-07] ...잠깐. 제국 신호가 아니다. 왕국 주파수인데, 왕국 함선이 우릴 따라오고 있다.',
      '[관제] KR-07, 아군이다. 경계 해제.',
      '[KR-07] 아군이 왜 무기를 켜고— (기록 끊김)' ] },
    { title: '용병 레이븐의 개인 로그', lines: [
      '[레이븐] 이번 주 의뢰: 왕국 3건, 제국 2건. 같은 화물을 양쪽에 팔았다.',
      '[레이븐] 장군 휘하 함대가 소행성대에 뭘 숨기고 있다. 지도에 없는 정거장.',
      '[레이븐] 이걸 아는 놈은 오래 못 산다는데. 그럼 나도 곧이겠군.' ] },
    { title: '광산 정거장 최후 방송', lines: [
      '[방송] 전 광부에게 알림. 왕국군이 정거장을 접수합니다.',
      '[방송] 제국 국적 광부는 격납고로... 아니, 정정합니다. 격납고로 가지 마십시오.',
      '[방송] 반복합니다. 격납고로 가지 마— (잡음)' ] },
  ],
  // 메인퀘스트: '다음에 뭘 해야 하는지'만. 한 번에 하나, HUD 한 줄로 보인다.
  main: [
    { id: 'm1', text: '폐광 소행성대에서 탈출점으로 귀환', ev: 'extract', need: 1, reward: 200, bp: 'plating',
      line: '중개인 오스: "살아 돌아왔군. 이 바닥에선 그게 첫 번째 재능이야."' },
    { id: 'm2', text: '작업대에서 부품 1개 제작', ev: 'craft', need: 1, reward: 150, bp: 'missile',
      line: '정비병 미나: "손에 익은 부품이 제일 좋은 부품이죠. 단장님도 그랬잖아요."' },
    { id: 'm3', text: '의뢰 게시판에서 의뢰를 수주하고 1개 완료', ev: 'contract', need: 1, reward: 200, bp: 'scatter',
      line: '중개인 오스: "양쪽 다 당신 이름을 묻기 시작했어. 좋은 징조는 아니야."' },
    // 정비사 테오 구조: 일반 설계도 5종(시작 제작법 제외)을 모으면 조난 신호가 열린다. 구조하고 탈출해야 완료
    { id: 'mR', text: '조난 신호로 정비사 구조', ev: 'rescue', need: 1, reward: 400, rescue: true, check: p => p.rescued && p.rescued.teo,
      line: '정비사 테오: "…살았다. 고마워요, 단장님. 작업대, 이제 제대로 쓸 수 있어요."' },
    { id: 'm4', text: '추락한 정찰선에서 블랙박스를 가져오기', ev: 'blackbox', need: 1, reward: 300, bp: 'flamer',
      line: '정비병 미나: "왕국 정찰선이네요. 왕국 주파수… 단장님 옛날 부대 거 아닌가요?"' },
    // 레이븐: 둥지에서 몰아붙이면 도주 → 다른 곳에서 재대결 → 탈출 포드를 들고 탈출. 퀘스트 순서와 상관없이 해 두면 인정된다
    { id: 'm5', text: '네임드 레이븐을 붙잡기', ev: 'raven', need: 1, reward: 500, raven: true, check: p => p.raven && p.raven.done,
      line: '레이븐: "…역시 당신이었군요, 대장. 이번엔 안 떠나는 거죠?"' },
    { id: 'm6', text: '침식 결정 3개 가져오기 (침식 1단계부터 침식체가 나온다)', ev: 'crystal', need: 3, reward: 600,
      line: '왕국 장군의 통신: "…오랜만이야. 그 결정, 어디서 났는지 직접 말해 줘야겠어."' },
    { id: 'm7', text: '2막 「전선 궤도」 — 다음 업데이트에서 열린다', ev: null, need: 1, reward: 0, line: '', actEnd: true },
  ],
  tips: [
    'Tab으로 화물칸을 열면 시간이 느려진다. 정리는 안전할 때.',
    '탄을 스치면(그레이즈) 드랍률이 오른다. 맞으면 절반을 잃는다.',
    '침식이 30%를 넘으면 기체가 약해진다. 욕심과 탈출 사이.',
    '보안 칸(2x2)에 넣은 건 격추돼도 살아남는다.',
  ],
};
