// 입력: 누르고 있는 키 + 이번 프레임에 눌린 키 + 마우스(캔버스 내부 좌표)
SA.Input = (() => {
  const down = new Set(), pressed = new Set();
  const mouse = { x: 640, y: 360, down: false, right: false, inCanvas: true, wheel: 0 };
  let canvas = null;

  const attach = (cv) => {
    canvas = cv;
    addEventListener('keydown', (e) => {
      const k = e.code;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(k) && !(e.target && e.target.tagName === 'INPUT')) e.preventDefault();
      if (!down.has(k)) pressed.add(k);
      down.add(k);
      SA.Audio.init();
    });
    addEventListener('keyup', (e) => down.delete(e.code));
    addEventListener('blur', () => { down.clear(); mouse.down = false; mouse.right = false; });
    addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width * canvas.width;
      mouse.y = (e.clientY - r.top) / r.height * canvas.height;
      mouse.cx = e.clientX; mouse.cy = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      SA.Audio.init();
      if (e.button === 0) mouse.down = true;
      if (e.button === 2) mouse.right = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.right = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  };
  const endFrame = () => { pressed.clear(); mouse.wheel = 0; };
  const isDown = (k) => down.has(k);
  const hit = (k) => pressed.has(k);
  const consume = (k) => pressed.delete(k);
  // 자동 촬영용: 키·마우스를 코드에서 직접 누른다
  const sim = {
    key(k, on) { if (on) { if (!down.has(k)) pressed.add(k); down.add(k); } else down.delete(k); },
    tap(k) { pressed.add(k); },
    mouse(x, y, l, r) { mouse.x = x; mouse.y = y; if (l != null) mouse.down = l; if (r != null) mouse.right = r; },
  };
  return { attach, endFrame, isDown, hit, consume, mouse, sim };
})();
