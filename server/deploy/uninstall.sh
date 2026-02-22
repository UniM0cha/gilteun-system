#!/bin/bash
set -e

PLIST_NAME="com.gilteun.server"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "=== 길튼 시스템 서버 서비스 해제 ==="

if [ -f "$PLIST_DST" ]; then
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    rm "$PLIST_DST"
    echo "서비스 해제 완료."
else
    echo "설치된 서비스를 찾을 수 없습니다."
fi
