#!/bin/bash
curl -s -o /dev/null http://localhost:8765/index.html || (cd /home/claude/strayace && setsid nohup python3 -m http.server 8765 >/dev/null 2>&1 < /dev/null & sleep 1)
