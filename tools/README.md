# 테스트·밸런스 도구 (게임에는 포함되지 않음)
- `run_all.sh`: 회귀 테스트 묶음 (문법 → 플레이·드래그·부품 전체·격납고). Playwright + Chrome 필요.
- `sim.py N [빌드이름]`: `bot.js` 봇으로 빌드별 N판 자동 출격, 탈출률·시간·격추·가치·침식 평균. 결과는 `sim_result.json`.
- `perf.py`: 탄·적·이펙트를 몰아넣고 fps 측정.
- 경로는 `/home/claude/strayace`(게임)·`/home/claude/tests` 기준이니 쓰기 전에 고칠 것.
