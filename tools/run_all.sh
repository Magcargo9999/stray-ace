#!/bin/bash
# 회귀 테스트 묶음: 서버 → 문법 → 플레이·드래그·부품 전체·격납고
cd /home/claude/tests && ./srv.sh
for f in /home/claude/strayace/js/*.js; do node --check $f || exit 1; done
for t in play.py drag.py parts.py hg.py; do echo "== $t"; timeout 400 python3 $t 2>&1 | grep -v "proxy\|ERR_TUNNEL\|404\|allowed\|For details\|accounts.google\|cdn.jsdelivr" | tail -4; done
