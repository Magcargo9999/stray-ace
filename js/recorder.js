// 녹화: F10 수동 녹화 · F9 방금 지나간 장면 저장(리플레이 버퍼, 설정에서 켜기) · 저장 뒤 편집창(자르기 → GIF / 영상 / 1:1 · 9:16 기체 추적 크롭)
// 개발자 모드(주소 뒤 ?dev): F8 촬영 모드(HUD 숨김 · 무적 · 슬로모션 · 확대) + 자동 촬영용 수동 프레임 진행(SA.Cap)
// 화면 밖 DOM(격납고 패널·결과창)은 찍히지 않는다. 게임 캔버스(전투)와 격납고 캔버스만 찍는다.
SA.Cap = { manual: false, t: 0 };

SA.Rec = (() => {
  const DEV = /[?&]dev\b/.test(location.search), CAPMODE = /[?&]cap\b/.test(location.search);
  const W = 1280, H = 720, FPS = 60;
  const REPLAY = 15;            // F9로 남기는 길이(초, 임시)
  const CYCLE = REPLAY * 2;     // 리플레이 녹화기 두 대를 이 주기로 번갈아 새로 시작한다
  const BPS_MAN = 20e6, BPS_REP = 10e6;   // 화질(비트레이트, 임시): 수동 녹화는 트레일러용으로 넉넉하게
  const st = { clean: false, god: false, slow: false, zoom: 0 };
  // H.264(MP4)이 SNS·Steam 업로드에 가장 무난하다. 안 되는 브라우저는 WebM(VP9)
  const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.640028,opus', 'video/mp4;codecs=avc1,opus',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = (window.MediaRecorder && MIMES.find(m => MediaRecorder.isTypeSupported(m))) || '';
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';

  let comp = null, cx = null, ui = null;
  let man = null;                // 수동 녹화기
  let reps = [];                 // 리플레이 녹화기 두 대
  let repOn = false, ed = null, busy = false;
  const track = [];              // [시각(ms), 화면 x, 화면 y]: 세로 크롭이 기체를 따라가게

  const $ = (s) => document.querySelector(s);
  const now = () => performance.now();
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
  const hangarUp = () => { const h = $('#hangar'); return h && h.style.display !== 'none' && h.style.display !== ''; };

  // ── 화면 합성: 지금 보이는 캔버스를 1280x720 한 장으로 ──
  const source = () => (hangarUp() ? $('#hg-cv') : $('#game'));
  const playerScreen = () => {
    const R = SA.R, src = source();
    if (!R || !R.player || hangarUp()) return [W / 2, H / 2];
    const Zw = R.zoom || SA.CFG.ZOOM, k = W / src.width;
    return [(src.width / 2 + (R.player.x - R.cam.x) * Zw) * k, (src.height / 2 + (R.player.y - R.cam.y) * Zw) * k];
  };
  const active = () => !!man || reps.length > 0;

  // 게임 루프 끝에서 매 프레임 부른다
  const frame = () => {
    if (st.zoom && SA.R) SA.R.zoomTarget = st.zoom;
    if (!active()) return;
    const src = source();
    cx.imageSmoothingEnabled = src.width !== W;
    cx.drawImage(src, 0, 0, W, H);
    const [x, y] = playerScreen(), t = now();
    track.push([t, x, y]);
    const keep = man ? man.t0 : t - (CYCLE + 10) * 1000;
    while (track.length && track[0][0] < keep - 1000) track.shift();
    for (const r of reps) if (t - r.t0 > CYCLE * 1000 && !r.stopping) restartRep(r);
    if (man && ui) ui.ind.querySelector('b').textContent = fmt((t - man.t0) / 1000);
  };

  // ── 녹화기 ──
  const mk = (bps) => {
    const s = comp.captureStream(FPS), a = SA.Audio.stream && SA.Audio.stream();
    const tr = a && a.getAudioTracks()[0];
    if (tr) s.addTrack(tr.clone());
    const opt = { videoBitsPerSecond: bps, audioBitsPerSecond: 192000 };
    if (mime) opt.mimeType = mime;
    const o = { r: new MediaRecorder(s, opt), chunks: [], t0: now(), s };
    o.r.ondataavailable = (e) => { if (e.data && e.data.size) o.chunks.push(e.data); };
    o.r.start(1000);
    return o;
  };
  const finish = (o) => new Promise((res) => {
    o.stopping = true;
    o.r.onstop = () => { o.s.getTracks().forEach(t => t.stop()); res({ blob: new Blob(o.chunks, { type: mime || 'video/webm' }), t0: o.t0, t1: now() }); };
    try { o.r.requestData(); } catch (e) {}
    o.r.stop();
  });
  const restartRep = (r) => {
    const i = reps.indexOf(r); if (i < 0) return;
    finish(r);   // 버린다
    reps[i] = mk(BPS_REP);
  };

  const supported = () => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('이 브라우저는 녹화를 지원하지 않는다 (크롬 권장)'); return false; }
    return true;
  };
  const toggleMan = async () => {
    if (busy || ed) return;
    if (!supported()) return;
    if (!man) {
      SA.Audio.init();
      man = mk(BPS_MAN); ui.ind.style.display = 'flex';
      toast('녹화 시작 — F10으로 끝');
      return;
    }
    busy = true; const o = man; man = null; ui.ind.style.display = 'none';
    const c = await finish(o); busy = false;
    openEditor(c, 0);
  };
  const setReplay = (on) => {
    if (on === repOn) return;
    repOn = on;
    if (on) {
      if (!window.MediaRecorder) return;
      SA.Audio.init();
      reps = [mk(BPS_REP)];
      setTimeout(() => { if (repOn && reps.length === 1) reps.push(mk(BPS_REP)); }, REPLAY * 1000);   // 두 번째는 절반 주기 늦게: 언제 눌러도 한 대는 15초 이상 쌓여 있다
    } else { reps.forEach(finish); reps = []; }
    ui.rep.style.display = on ? 'block' : 'none';
  };
  const saveReplay = async () => {
    if (busy || ed) return;
    if (!repOn) { toast('리플레이 버퍼가 꺼져 있다 — 설정에서 켠다'); return; }
    const r = reps.reduce((a, b) => (!b.stopping && (!a || b.t0 < a.t0) ? b : a), null);
    if (!r || now() - r.t0 < 2000) { toast('아직 쌓인 장면이 없다'); return; }
    busy = true;
    const i = reps.indexOf(r); reps[i] = mk(BPS_REP);
    const c = await finish(r); busy = false;
    const dur = (c.t1 - c.t0) / 1000;
    openEditor(c, Math.max(0, dur - REPLAY));
  };

  // ── 기체 추적 크롭 ──
  const cropW = (asp) => (asp === '1:1' ? H : asp === '9:16' ? Math.round(H * 9 / 16) : W);
  const centers = (c) => {   // 1/30초 간격으로 매끈하게 고른 기체 x 위치
    const pts = track.filter(p => p[0] >= c.t0 - 500 && p[0] <= c.t1 + 500).map(p => [(p[0] - c.t0) / 1000, p[1]]);
    const n = Math.ceil(c.dur * 30) + 1, out = new Float32Array(n);
    let a = 0;
    for (let i = 0; i < n; i++) {
      const t = i / 30; let s = 0, k = 0;
      while (a < pts.length && pts[a][0] < t - 0.6) a++;
      for (let j = a; j < pts.length && pts[j][0] <= t + 0.6; j++) { s += pts[j][1]; k++; }
      out[i] = k ? s / k : (i ? out[i - 1] : W / 2);
    }
    return out;
  };
  const cropAt = (c, t, cw) => {
    if (cw >= W) return 0;
    const i = Math.max(0, Math.min(c.cx.length - 1, Math.round(t * 30)));
    return Math.round(Math.max(0, Math.min(W - cw, c.cx[i] - cw / 2)));
  };

  // ── 편집창 ──
  const openEditor = (c, inT) => {
    c.dur = Math.max(0.1, (c.t1 - c.t0) / 1000); c.in = inT; c.out = c.dur;
    c.url = URL.createObjectURL(c.blob); c.cx = centers(c);
    c.asp = '16:9'; c.scale = 0.5; c.fps = 25;
    const R = SA.R; c.wasPaused = R ? R.paused : true; if (R) R.paused = true;
    ed = c;
    const e = ui.ed; e.style.display = 'flex';
    e.querySelector('.re-in').innerHTML = `
      <div class="re-head"><h2>클립 편집</h2><span class="dim" id="re-meta"></span><button class="set-x" id="re-x" title="닫기 (Esc)">✕</button></div>
      <canvas id="re-pv" width="640" height="360"></canvas>
      <canvas id="re-tl" width="640" height="40"></canvas>
      <div class="re-row"><span>구간</span><b id="re-len"></b><span class="dim">핸들을 끌거나 ← → 로 재생 위치, [ ] 로 시작·끝 지정 · Space 재생/정지</span></div>
      <div class="re-row"><span>화면</span>${['16:9', '1:1', '9:16'].map(a => `<button class="btn re-o" data-asp="${a}">${a === '16:9' ? '16:9 전체' : a === '1:1' ? '1:1 정사각' : '9:16 세로(쇼츠)'}</button>`).join('')}</div>
      <div class="re-row"><span>GIF 크기</span>${[[0.375, '작게'], [0.5, '보통'], [0.75, '크게'], [1, '원본']].map(([s, n]) => `<button class="btn re-o" data-sc="${s}">${n}</button>`).join('')}<span class="dim" id="re-px"></span></div>
      <div class="re-row"><span>GIF 초당</span>${[15, 20, 25, 30].map(f => `<button class="btn re-o" data-fps="${f}">${f}</button>`).join('')}<span class="dim">X·디스코드는 15MB 이하가 안전</span></div>
      <div class="re-row re-go"><button class="btn big" id="re-gif">GIF 만들기</button><button class="btn big" id="re-vid">영상 저장</button><button class="btn" id="re-raw">원본 그대로 저장 (.${ext})</button></div>
      <div id="re-prog"><i></i><span></span></div>`;
    const v = c.v = document.createElement('video');
    v.src = c.url; v.playsInline = true; v.volume = 0.6; v.loop = false;
    v.onloadedmetadata = () => { try { v.currentTime = c.in; } catch (er) {} v.play().catch(() => {}); };
    const sync = () => {
      e.querySelectorAll('[data-asp]').forEach(b => b.classList.toggle('on', b.dataset.asp === c.asp));
      e.querySelectorAll('[data-sc]').forEach(b => b.classList.toggle('on', +b.dataset.sc === c.scale));
      e.querySelectorAll('[data-fps]').forEach(b => b.classList.toggle('on', +b.dataset.fps === c.fps));
      const cw = cropW(c.asp), gw = Math.round(cw * c.scale) & ~1, gh = Math.round(H * c.scale) & ~1;
      $('#re-px').textContent = `${gw}×${gh}`;
      $('#re-len').textContent = `${(c.out - c.in).toFixed(1)}초 (${fmt(c.in)}–${fmt(c.out)})`;
      $('#re-meta').textContent = `전체 ${c.dur.toFixed(1)}초 · ${ext.toUpperCase()}`;
    };
    c.sync = sync; sync();
    e.querySelectorAll('[data-asp]').forEach(b => b.onclick = () => { c.asp = b.dataset.asp; sync(); });
    e.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { c.scale = +b.dataset.sc; sync(); });
    e.querySelectorAll('[data-fps]').forEach(b => b.onclick = () => { c.fps = +b.dataset.fps; sync(); });
    $('#re-x').onclick = closeEditor;
    $('#re-raw').onclick = () => download(c.blob, `strayace_${stamp()}.${ext}`);
    $('#re-gif').onclick = () => run(() => makeGif(c));
    $('#re-vid').onclick = () => run(() => makeVideo(c));
    timeline(c);
    const pv = $('#re-pv'), px = pv.getContext('2d');
    const draw = () => {
      if (ed !== c) return;
      if (!v.paused && v.currentTime >= c.out - 0.02) { try { v.currentTime = c.in; } catch (er) {} }
      px.imageSmoothingEnabled = true; px.fillStyle = '#05070d'; px.fillRect(0, 0, 640, 360);
      if (v.readyState >= 2) px.drawImage(v, 0, 0, 640, 360);
      const cw = cropW(c.asp);
      if (cw < W) {   // 크롭 바깥은 어둡게
        const x0 = cropAt(c, v.currentTime, cw) / 2;
        px.fillStyle = 'rgba(5,7,13,0.72)'; px.fillRect(0, 0, x0, 360); px.fillRect(x0 + cw / 2, 0, 640 - x0 - cw / 2, 360);
        px.strokeStyle = '#d8e6ff'; px.lineWidth = 1; px.strokeRect(x0 + 0.5, 0.5, cw / 2 - 1, 359);
      }
      c.drawTl();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  };
  const closeEditor = () => {
    if (!ed || busy) return;
    const c = ed; ed = null;
    c.v.pause(); c.v.removeAttribute('src'); c.v.load();
    URL.revokeObjectURL(c.url);
    ui.ed.style.display = 'none';
    if (SA.R && !c.wasPaused && $('#settings').style.display !== 'flex') SA.R.paused = false;
  };

  // 타임라인: 시작·끝 핸들 + 재생 위치
  const timeline = (c) => {
    const tl = $('#re-tl'), g = tl.getContext('2d'), L = 10, Wd = 640 - 20;
    const X = (t) => L + t / c.dur * Wd, T = (x) => Math.max(0, Math.min(c.dur, (x - L) / Wd * c.dur));
    c.drawTl = () => {
      g.clearRect(0, 0, 640, 40);
      g.fillStyle = '#1d2840'; g.fillRect(L, 14, Wd, 12);
      g.fillStyle = '#3a4a6b'; g.fillRect(X(c.in), 14, X(c.out) - X(c.in), 12);
      g.fillStyle = '#d8e6ff'; [c.in, c.out].forEach(t => g.fillRect(X(t) - 2, 8, 4, 24));
      g.fillStyle = '#f03960'; g.fillRect(X(c.v.currentTime) - 1, 4, 2, 32);
      g.fillStyle = '#8f9bb8'; g.font = '10px "Galmuri9", monospace'; g.textAlign = 'left';
      g.fillText(fmt(c.in), L, 40); g.textAlign = 'right'; g.fillText(fmt(c.out), 640 - L, 40);
    };
    let drag = null;
    const pos = (ev) => { const r = tl.getBoundingClientRect(); return (ev.clientX - r.left) / r.width * 640; };
    tl.onpointerdown = (ev) => {
      const x = pos(ev);
      drag = Math.abs(x - X(c.in)) < 10 ? 'in' : Math.abs(x - X(c.out)) < 10 ? 'out' : 'seek';
      tl.setPointerCapture(ev.pointerId); tl.onpointermove(ev);
    };
    tl.onpointermove = (ev) => {
      if (!drag) return;
      const t = T(pos(ev));
      if (drag === 'in') c.in = Math.min(t, c.out - 0.5);
      else if (drag === 'out') c.out = Math.max(t, c.in + 0.5);
      if (drag !== 'seek') c.sync();
      try { c.v.currentTime = drag === 'out' ? Math.max(c.in, c.out - 1.5) : drag === 'in' ? c.in : Math.max(c.in, Math.min(c.out, t)); } catch (er) {}
    };
    tl.onpointerup = () => { drag = null; };
  };

  // ── 내보내기 공통: 영상을 1배속으로 재생하며 프레임마다 그린다 ──
  const run = async (fn) => {
    if (busy) return; busy = true;
    ui.ed.classList.add('busy'); ed.v.pause();
    try { await fn(); } catch (er) { console.error(er); toast('내보내기 실패: ' + (er && er.message || er)); }
    busy = false; ui.ed.classList.remove('busy'); prog(0, '');
    if (ed) ed.v.play().catch(() => {});
  };
  const prog = (p, s) => { const b = $('#re-prog'); if (!b) return; b.querySelector('i').style.width = (p * 100) + '%'; b.querySelector('span').textContent = s; };
  const once = (el, ev, ms) => new Promise((res) => { let done = false; const f = () => { if (!done) { done = true; res(true); } }; el.addEventListener(ev, f, { once: true }); setTimeout(() => { if (!done) { done = true; res(false); } }, ms); });
  const playRange = async (c, v, fps, onFrame, label) => {
    if (v.readyState < 1) await once(v, 'loadedmetadata', 4000);
    if (c.in > 0.01) { v.currentTime = c.in; await once(v, 'seeked', 4000); }
    let next = c.in, n = 0;
    const total = Math.ceil((c.out - c.in) * fps);
    await new Promise((res) => {
      let done = false;
      const end = () => { if (done) return; done = true; v.pause(); res(); };
      const step = (mt) => {
        while (next <= mt + 1e-4 && next < c.out && n < total) { onFrame(next, n); n++; next = c.in + n / fps; }
        prog(Math.min(1, (mt - c.in) / (c.out - c.in)) * 0.6, `${label} ${Math.round(Math.min(1, (mt - c.in) / (c.out - c.in)) * 100)}%`);
        if (mt >= c.out - 1e-3 || n >= total) end();
      };
      if (v.requestVideoFrameCallback) { const cb = (t, meta) => { step(meta.mediaTime); if (!done) v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
      else { const tick = () => { step(v.currentTime); if (!done) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
      v.onended = () => { step(c.out); end(); };
      v.play().catch(end);
    });
  };
  const drawCrop = (g, c, v, t, ow, oh, cw) => {
    const x0 = cropAt(c, t, cw);   // t: 영상 기준 시각(= 녹화 시작부터 초)
    g.drawImage(v, x0, 0, cw, H, 0, 0, ow, oh);
  };

  // ── GIF ──
  const makeGif = async (c) => {
    const cw = cropW(c.asp), gw = Math.round(cw * c.scale) & ~1, gh = Math.round(H * c.scale) & ~1;
    const frames = Math.ceil((c.out - c.in) * c.fps);
    if (gw * gh * frames > 1.4e8) { toast('너무 길다 — 구간을 줄이거나 크기를 낮춘다'); return; }
    const v = document.createElement('video'); v.src = c.url; v.muted = true; v.playsInline = true;
    const cv = document.createElement('canvas'); cv.width = gw; cv.height = gh;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = c.scale !== 1; g.imageSmoothingQuality = 'high';
    const wk = gifWorker();
    wk.postMessage({ cmd: 'begin', w: gw, h: gh });
    let tPrev = 0;
    await playRange(c, v, c.fps, (t, n) => {
      drawCrop(g, c, v, t, gw, gh, cw);
      const img = g.getImageData(0, 0, gw, gh);
      const tc = Math.round((n + 1) * 100 / c.fps), d = tc - tPrev; tPrev = tc;   // 1/100초 단위 지연을 누적 반올림 (30fps면 3,3,4…)
      wk.postMessage({ cmd: 'frame', data: img.data.buffer, delay: d }, [img.data.buffer]);
    }, 'GIF 프레임');
    v.removeAttribute('src'); v.load();
    const blob = await new Promise((res, rej) => {
      wk.onmessage = (m) => { if (m.data.p != null) prog(0.6 + m.data.p * 0.4, `GIF 압축 ${Math.round(m.data.p * 100)}%`); if (m.data.blob) res(m.data.blob); if (m.data.err) rej(new Error(m.data.err)); };
      wk.postMessage({ cmd: 'end' });
    });
    wk.terminate();
    download(blob, `strayace_${stamp()}_${c.asp.replace(':', 'x')}.gif`);
    toast(`GIF 저장 · ${(blob.size / 1048576).toFixed(1)}MB${blob.size > 15 * 1048576 ? ' (15MB 넘음 — 크기·초당을 낮추면 줄어든다)' : ''}`);
  };

  // ── 영상(자르기·크롭) ──
  const makeVideo = async (c) => {
    const cw = cropW(c.asp);
    if (c.in <= 0.05 && c.out >= c.dur - 0.05 && cw === W) { download(c.blob, `strayace_${stamp()}.${ext}`); return; }
    const k = c.asp === '9:16' ? 2 : 1;           // 세로는 2배(810x1440): 도트가 정수배로 커진다
    const ow = cw * k, oh = H * k;
    const v = document.createElement('video'); v.src = c.url; v.playsInline = true;
    const cv = document.createElement('canvas'); cv.width = ow; cv.height = oh;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const s = cv.captureStream(FPS);
    let ac = null;
    try { ac = new AudioContext(); const srcN = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); srcN.connect(dst); dst.stream.getAudioTracks().forEach(t => s.addTrack(t)); } catch (er) {}
    const opt = { videoBitsPerSecond: BPS_MAN }; if (mime) opt.mimeType = mime;
    const r = new MediaRecorder(s, opt), chunks = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    // 영상 프레임이 올 때마다 그대로 옮겨 그린다 (초당 60)
    let started = false;
    await playRange(c, v, FPS, (t) => {
      if (!started) { started = true; r.start(500); }
      drawCrop(g, c, v, t, ow, oh, cw);
    }, '영상 기록');
    const blob = await new Promise((res) => { r.onstop = () => res(new Blob(chunks, { type: mime || 'video/webm' })); r.stop(); });
    s.getTracks().forEach(t => t.stop()); if (ac) ac.close();
    v.removeAttribute('src'); v.load();
    download(blob, `strayace_${stamp()}_${c.asp.replace(':', 'x')}.${ext}`);
    toast(`영상 저장 · ${ow}×${oh} · ${(blob.size / 1048576).toFixed(1)}MB`);
  };

  const download = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };

  // ── GIF 인코더 (워커): 전체 프레임에서 256색 팔레트를 뽑고(미디언 컷), 바뀐 픽셀만 저장해 용량을 줄인다 ──
  const gifWorker = () => {
    const src = '(' + function () {
      let w, h, frames = [], delays = [];
      const hist = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
      onmessage = (m) => {
        const d = m.data;
        try {
          if (d.cmd === 'begin') { w = d.w; h = d.h; }
          else if (d.cmd === 'frame') {
            const px = new Uint8Array(d.data), q = new Uint16Array(w * h);
            for (let i = 0, j = 0; j < q.length; i += 4, j++) {
              const r = px[i], g = px[i + 1], b = px[i + 2], k = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
              q[j] = k; hist[k]++; sr[k] += r; sg[k] += g; sb[k] += b;
            }
            frames.push(q); delays.push(d.delay);
          } else if (d.cmd === 'end') postMessage({ blob: encode() });
        } catch (er) { postMessage({ err: String(er) }); }
      };
      // 미디언 컷: 255색 (255번은 투명 = "이전 프레임 그대로")
      const palette = () => {
        const keys = []; for (let k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
        const ch = (k, c) => (k >> (10 - c * 5)) & 31;
        const box = (ks) => {
          let cnt = 0, mn = [31, 31, 31], mx = [0, 0, 0];
          for (const k of ks) { cnt += hist[k]; for (let c = 0; c < 3; c++) { const v = ch(k, c); if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; } }
          const rg = mx.map((v, c) => v - mn[c]), c = rg.indexOf(Math.max(...rg));
          return { ks, cnt, c, range: rg[c], score: ks.length > 1 ? (rg[c] + 1) * Math.sqrt(cnt) : -1 };
        };
        const boxes = [box(keys)];
        while (boxes.length < 255) {
          let bi = -1, bs = 0; boxes.forEach((b, i) => { if (b.score > bs) { bs = b.score; bi = i; } });
          if (bi < 0) break;
          const b = boxes[bi], c = b.c; b.ks.sort((x, y) => ch(x, c) - ch(y, c));
          let half = b.cnt / 2, acc = 0, cut = 1;
          for (let i = 0; i < b.ks.length - 1; i++) { acc += hist[b.ks[i]]; if (acc >= half) { cut = i + 1; break; } cut = i + 1; }
          boxes.splice(bi, 1, box(b.ks.slice(0, cut)), box(b.ks.slice(cut)));
        }
        const pal = new Uint8Array(256 * 3), lut = new Uint8Array(32768);
        boxes.forEach((b, i) => {
          let r = 0, g = 0, bl = 0; for (const k of b.ks) { r += sr[k]; g += sg[k]; bl += sb[k]; lut[k] = i; }
          pal[i * 3] = Math.round(r / b.cnt); pal[i * 3 + 1] = Math.round(g / b.cnt); pal[i * 3 + 2] = Math.round(bl / b.cnt);
        });
        return { pal, lut };
      };
      // GIF LZW (omggif와 같은 코드 크기 규칙)
      const stampA = new Uint32Array(4096 * 256), codeA = new Uint16Array(4096 * 256); let gen = 1;
      const lzw = (idx, out) => {
        const minc = 8, clear = 256, eoi = 257;
        let next = 258, size = 9, cur = 0, sh = 0; gen++;
        const bytes = []; const emit = (code) => { cur |= code << sh; sh += size; while (sh >= 8) { bytes.push(cur & 255); cur >>>= 8; sh -= 8; } };
        emit(clear);
        let ib = idx[0];
        for (let i = 1; i < idx.length; i++) {
          const k = idx[i], key = ib << 8 | k;
          if (stampA[key] === gen) { ib = codeA[key]; continue; }
          emit(ib);
          if (next === 4096) { emit(clear); next = 258; size = 9; gen++; }
          else { if (next >= (1 << size)) size++; stampA[key] = gen; codeA[key] = next++; }
          ib = k;
        }
        emit(ib); emit(eoi); if (sh > 0) bytes.push(cur & 255);
        out.push(minc);
        for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
        out.push(0);
      };
      const encode = () => {
        const { pal, lut } = palette(), parts = [];
        const u16 = (a, v) => { a.push(v & 255, v >> 8 & 255); };
        const hd = [...'GIF89a'].map(c => c.charCodeAt(0)); u16(hd, w); u16(hd, h); hd.push(0xF7, 255, 0);
        parts.push(new Uint8Array(hd), pal);
        parts.push(new Uint8Array([0x21, 0xFF, 0x0B, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0]));   // 무한 반복
        let prev = null;
        for (let f = 0; f < frames.length; f++) {
          const q = frames[f], cur = new Uint8Array(w * h);
          for (let i = 0; i < cur.length; i++) cur[i] = lut[q[i]];
          frames[f] = null;
          let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1, delay = delays[f];
          if (prev) {   // 바뀐 영역만
            x0 = w; y0 = h; x1 = -1; y1 = -1;
            for (let y = 0; y < h; y++) for (let x = 0, o = y * w; x < w; x++) if (cur[o + x] !== prev[o + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            if (x1 < 0) { // 완전히 같은 프레임: 앞 프레임 시간을 늘린다
              const last = parts[parts.lastGce]; const dd = (last[4] | last[5] << 8) + delay; last[4] = dd & 255; last[5] = dd >> 8; continue;
            }
          }
          const fw = x1 - x0 + 1, fh = y1 - y0 + 1, idx = new Uint8Array(fw * fh);
          for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
            const o = (y + y0) * w + x + x0, v = cur[o];
            idx[y * fw + x] = prev && v === prev[o] ? 255 : v;
          }
          const gce = new Uint8Array([0x21, 0xF9, 4, (1 << 2) | 1, delay & 255, delay >> 8, 255, 0]);
          parts.lastGce = parts.length; parts.push(gce);
          const id = [0x2C]; u16(id, x0); u16(id, y0); u16(id, fw); u16(id, fh); id.push(0);
          const out = id; lzw(idx, out); parts.push(new Uint8Array(out));
          prev = cur;
          if (f % 5 === 0) postMessage({ p: f / frames.length });
        }
        parts.push(new Uint8Array([0x3B]));
        return new Blob(parts, { type: 'image/gif' });
      };
    } + ')()';
    return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  };

  // ── 개발자 촬영 모드 (F8) ──
  const devPanel = () => {
    const p = ui.dev; p.style.display = p.style.display === 'block' ? 'none' : 'block';
    if (p.innerHTML) return;
    p.innerHTML = `<b>촬영 모드</b>
      <label><input type="checkbox" data-k="clean"> HUD 숨김 (H)</label>
      <label><input type="checkbox" data-k="god"> 무적</label>
      <label><input type="checkbox" data-k="slow"> 슬로모션 0.5배 (J)</label>
      <label>확대 <input type="range" min="0" max="3.2" step="0.1" value="0" id="rd-zoom"> <span id="rd-zv">기본</span></label>
      <div class="dim">F10 녹화 · F9 리플레이 저장</div>`;
    p.querySelectorAll('[data-k]').forEach(i => { i.checked = st[i.dataset.k]; i.onchange = () => { st[i.dataset.k] = i.checked; applyDev(); }; });
    const z = p.querySelector('#rd-zoom');
    z.oninput = () => { const v = +z.value; st.zoom = v < 1 ? 0 : v; p.querySelector('#rd-zv').textContent = st.zoom ? '×' + st.zoom.toFixed(1) : '기본'; applyDev(); if (!st.zoom && SA.R && SA.OBS) SA.R.zoomTarget = SA.OBS.levels[SA.R.zoomLv || 0]; };
  };
  const applyDev = () => {
    if (ui.dev.innerHTML) ui.dev.querySelectorAll('[data-k]').forEach(i => { i.checked = st[i.dataset.k]; });
    const g = $('#game'); if (g) g.style.cursor = st.clean ? 'none' : '';
    ui.tags.textContent = [st.clean && 'HUD 숨김', st.god && '무적', st.slow && '×0.5', st.zoom && '확대 ×' + st.zoom.toFixed(1)].filter(Boolean).join(' · ');
  };
  const speed = () => (st.slow ? 0.5 : 1);

  // ── UI ──
  const toast = (s) => {
    const t = ui.toast; t.textContent = s; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600);
  };
  const build = () => {
    const d = (id, cls) => { const e = document.createElement('div'); e.id = id; if (cls) e.className = cls; document.body.appendChild(e); return e; };
    ui = { ind: d('rec-ind'), rep: d('rec-rep'), toast: d('rec-toast'), ed: d('rec-ed'), dev: d('rec-dev'), tags: d('rec-tags') };
    ui.ind.innerHTML = '<i></i>REC <b>0:00</b>';
    ui.rep.textContent = '⟲ 리플레이'; ui.rep.title = 'F9: 방금 지나간 15초 저장';
    ui.ed.innerHTML = '<div class="re-in"></div>';
    comp = document.createElement('canvas'); comp.width = W; comp.height = H; cx = comp.getContext('2d');
    addEventListener('keydown', (e) => {
      const k = e.code;
      if (ed) {   // 편집창이 떠 있으면 게임으로 키가 가지 않게
        if (k === 'Escape') closeEditor();
        else if (k === 'Space') { ed.v.paused ? ed.v.play().catch(() => {}) : ed.v.pause(); }
        else if (k === 'ArrowLeft' || k === 'ArrowRight') { try { ed.v.currentTime = Math.max(ed.in, Math.min(ed.out, ed.v.currentTime + (k === 'ArrowLeft' ? -1 : 1) / (e.shiftKey ? 60 : 2))); } catch (er) {} }
        else if (k === 'BracketLeft') { ed.in = Math.min(ed.v.currentTime, ed.out - 0.5); ed.sync(); }
        else if (k === 'BracketRight') { ed.out = Math.max(ed.v.currentTime, ed.in + 0.5); ed.sync(); }
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (k === 'F10') { e.preventDefault(); e.stopImmediatePropagation(); toggleMan(); }
      else if (k === 'F9') { e.preventDefault(); e.stopImmediatePropagation(); saveReplay(); }
      else if (DEV && k === 'F8') { e.preventDefault(); e.stopImmediatePropagation(); devPanel(); }
      else if (DEV && ui.dev.style.display === 'block' && (k === 'KeyH' || k === 'KeyJ')) { if (k === 'KeyH') st.clean = !st.clean; else st.slow = !st.slow; applyDev(); e.stopImmediatePropagation(); }
    }, true);
    if (DEV) toast('개발자 모드 — F8 촬영 모드');
  };
  addEventListener('load', () => {
    build();
    const s = SA.profile && SA.profile.settings;
    if (!CAPMODE && (DEV || (s && s.replay))) setTimeout(() => { if (SA.Audio) setReplay(true); }, 500);
  });

  // 자동 촬영(개발용): 실시간이 아니라 한 프레임씩 진행시키며 찍는다
  Object.assign(SA.Cap, {
    begin() { this.manual = true; this.t = 0; },
    step(dt) {
      this.t += dt;
      if (hangarUp() && SA.HangarScene.step) SA.HangarScene.step(dt);
      SA.Main.step(dt);
    },
    playerScreen,
  });

  return { st, frame, speed, setReplay, toggleMan, saveReplay, get replayOn() { return repOn; }, DEV, playerScreen };
})();
