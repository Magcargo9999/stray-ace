# capkit — STRAY//ACE 자동 촬영 키트

게임을 헤드리스 크롬에서 **한 프레임씩 진행**시키며 찍는다. 컴퓨터가 느려도 60fps가 끊김 없이 나오고, 소리는 같은 합성기로 오프라인 렌더해 정확히 맞춘다.

## 준비
```
cd <저장소> && python3 -m http.server 8765      # 게임 서버
pip install playwright pillow && playwright install chrome
```
ffmpeg 필요 (libx264).

## 사용
```
python3 tools/capkit/cap.py fight --sec 10 --out fight01 --clean --god --seed 7 --vertical
```
| 옵션 | 뜻 |
|---|---|
| 장면 | `fight` 6기 교전 · `swarm` 대규모 교전(6초에 증원) · `wreck` 난파선 털기 · `wreckfight` 털다가 습격 · `tour` 지점 순회 · `idle` 정지 · `hangar` 격납고 |
| `--sec` / `--warm` | 촬영 길이 / 촬영 전 웜업(기본 2.5초, 시작 안내문이 사라지게) |
| `--clean` `--god` `--slow` `--zoom 2.4` | HUD 숨김 · 무적 · 슬로모션 0.5배 · 확대 |
| `--seed N` | 난수 고정 → 같은 장면 재촬영 |
| `--vertical` | 9:16 쇼츠(기체 추적 크롭) |
| `--setup file.js` | 촬영 전 프로필·장비 세팅 스크립트 |

결과 `~/capout/<out>/`: `master_1440p.mp4`(2배 정수 확대, 도트 그대로) · `trailer_1080p.mp4` · `clip.gif`(640px 25fps) · `vertical_1080x1920.mp4` · `audio.wav` · `frames/`

## 게임 쪽 연결
- `?dev&cap` 로 연다. `SA.Cap.begin()` → `SA.Cap.step(1/60)` 로 진행.
- 입력: `SA.Input.sim.key/tap/mouse`. 소리: `SA.Audio.capStart/capStop/renderLog`.
- 장면·자동 조종은 `bot.js`(게임 밖, 촬영 때만 주입).
