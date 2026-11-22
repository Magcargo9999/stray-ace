"""STRAY//ACE 자동 촬영: 게임을 한 프레임씩 진행시키며 찍고, 소리를 오프라인 합성해 영상·GIF로 만든다.

사용 예)
  python3 cap.py fight --sec 10 --out fight01 --clean --god
  python3 cap.py wreck --sec 12 --out wreck01 --zoom 2.4
  python3 cap.py hangar --sec 8 --out hangar01
옵션: --warm 웜업 초 · --seed 난수 고정 · --slow 슬로모션 · --vertical 9:16 쇼츠도 · --nogif
결과: ~/capout/<name>/  master_1440p.mp4 · trailer_1080p.mp4 · clip.gif · vertical_1080x1920.mp4 · audio.wav · frames/
"""
import argparse, asyncio, base64, json, os, shutil, subprocess, sys
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
URL = 'http://localhost:8765/index.html?dev&cap'

SEED_JS = """(() => { let s = %d >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();"""

async def run(a):
    out = os.path.join(a.root, a.out); fr = os.path.join(out, 'frames')
    shutil.rmtree(out, ignore_errors=True); os.makedirs(fr)
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        if a.seed is not None: await pg.add_init_script(SEED_JS % a.seed)
        await pg.goto(URL); await pg.wait_for_function("window.SA && SA.Render && document.querySelector('#title').style.display==='flex'", timeout=20000)
        await pg.add_script_tag(path=os.path.join(HERE, 'bot.js'))
        if a.setup: await pg.evaluate(open(a.setup).read())
        hangar = a.scene == 'hangar'
        await pg.evaluate("""(o) => {
          const P = SA.profile; P.tutDone = true; P.deathModeSet = true; P.hgGuide = true; SA.Save.store(P);
          document.querySelectorAll('.full').forEach(e => e.style.display = 'none');
          if (o.hangar) SA.Hangar.open(); else SA.Main.startRaid();
          SA.Cap.begin();
          Object.assign(SA.Rec.st, { clean: o.clean, god: o.god, slow: o.slow, zoom: o.zoom || 0 });
        }""", {'hangar': hangar, 'clean': a.clean, 'god': a.god, 'slow': a.slow, 'zoom': a.zoom})
        sel = '#hg-cv' if hangar else '#game'
        step = """(o) => { const R = SA.R, S = CapKit.SCENES[o.scene];
          if (o.first && R && S && S.setup) S.setup(R);
          const out = [];
          for (let i = 0; i < o.n; i++) {
            if (R && S && S.tick) S.tick(R, SA.Cap.t - (o.t0 || 0));
            if (R && !o.hangar) CapKit.think(R);
            SA.Cap.step(1 / 60);
            if (o.grab) out.push([document.querySelector(o.sel).toDataURL('image/png'), SA.Cap.playerScreen()]);
          }
          return out; }"""
        warm = int(a.warm * 60)
        await pg.evaluate(step, {'scene': a.scene, 'first': True, 'n': max(1, warm), 'grab': False, 'sel': sel, 'hangar': hangar})
        t0 = await pg.evaluate("SA.Cap.t")
        await pg.evaluate("SA.Audio.capStart()")
        total = int(a.sec * 60); n = 0; track = []
        while n < total:
            k = min(6, total - n)
            res = await pg.evaluate(step, {'scene': a.scene, 'first': False, 'n': k, 'grab': True, 'sel': sel, 'hangar': hangar, 't0': t0})
            for url, ps in res:
                with open(os.path.join(fr, f'f{n:05d}.png'), 'wb') as fh: fh.write(base64.b64decode(url.split(',', 1)[1]))
                track.append(ps); n += 1
            if n % 120 < 6: print(f'  {n}/{total} 프레임', flush=True)
        log = await pg.evaluate("SA.Audio.capStop()")
        wav = await pg.evaluate("([l, d, t]) => SA.Audio.renderLog(l, d, t)", [log, a.sec, t0])
        with open(os.path.join(out, 'audio.wav'), 'wb') as fh: fh.write(base64.b64decode(wav))
        json.dump({'track': track, 'sounds': len(log)}, open(os.path.join(out, 'track.json'), 'w'))
        if errs: print('페이지 오류:', errs[:5])
        await b.close()
    encode(a, out, fr, track)

def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); sys.exit(1)

def encode(a, out, fr, track):
    inp = ['-framerate', '60', '-i', os.path.join(fr, 'f%05d.png'), '-i', os.path.join(out, 'audio.wav')]
    x264 = ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest']
    # 마스터: 2배 정수 확대(도트 그대로) 2560x1440 · Steam/유튜브용 1080p
    sh(['ffmpeg', '-v', 'error', '-y', *inp, '-vf', 'scale=2560:1440:flags=neighbor', '-crf', '14', *x264, os.path.join(out, 'master_1440p.mp4')])
    sh(['ffmpeg', '-v', 'error', '-y', *inp, '-vf', 'scale=2560:1440:flags=neighbor,scale=1920:1080:flags=lanczos', '-crf', '16', *x264, os.path.join(out, 'trailer_1080p.mp4')])
    if not a.nogif:
        sh(['ffmpeg', '-v', 'error', '-y', '-framerate', '60', '-i', os.path.join(fr, 'f%05d.png'), '-vf',
            f'fps={a.gif_fps},scale={a.gif_w}:-2:flags=area,split[x][y];[x]palettegen=stats_mode=diff[p];[y][p]paletteuse=dither=none:diff_mode=rectangle',
            os.path.join(out, 'clip.gif')])
    if a.vertical:
        from PIL import Image
        vd = os.path.join(out, 'vframes'); os.makedirs(vd, exist_ok=True)
        cw = 405; xs = [p[0] for p in track]; sm = []
        for i in range(len(xs)):
            lo, hi = max(0, i - 36), min(len(xs), i + 37); sm.append(sum(xs[lo:hi]) / (hi - lo))
        for i, x in enumerate(sm):
            x0 = int(max(0, min(1280 - cw, round(x - cw / 2))))
            Image.open(os.path.join(fr, f'f{i:05d}.png')).crop((x0, 0, x0 + cw, 720)).save(os.path.join(vd, f'f{i:05d}.png'))
        sh(['ffmpeg', '-v', 'error', '-y', '-framerate', '60', '-i', os.path.join(vd, 'f%05d.png'), '-i', os.path.join(out, 'audio.wav'),
            '-vf', 'scale=810:1440:flags=neighbor,scale=1080:1920:flags=lanczos', '-crf', '16', *x264, os.path.join(out, 'vertical_1080x1920.mp4')])
        shutil.rmtree(vd)
    for f in sorted(os.listdir(out)):
        q = os.path.join(out, f)
        if os.path.isfile(q): print(f'  {f}  {os.path.getsize(q) / 1048576:.1f}MB')

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('scene'); ap.add_argument('--sec', type=float, default=8); ap.add_argument('--warm', type=float, default=2.5)
    ap.add_argument('--out', default=None); ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--clean', action='store_true'); ap.add_argument('--god', action='store_true'); ap.add_argument('--slow', action='store_true')
    ap.add_argument('--zoom', type=float, default=0); ap.add_argument('--vertical', action='store_true'); ap.add_argument('--nogif', action='store_true')
    ap.add_argument('--gif-w', type=int, default=640); ap.add_argument('--gif-fps', type=int, default=25)
    ap.add_argument('--root', default=os.path.expanduser('~/capout'), help='결과를 둘 폴더 (저장소 밖)')
    ap.add_argument('--setup', default=None, help='시작 전에 실행할 JS 파일(장비·프로필 세팅)')
    a = ap.parse_args(); a.out = a.out or a.scene
    asyncio.run(run(a))
