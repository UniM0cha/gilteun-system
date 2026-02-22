#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.gilteun.server"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

# Node.js 경로 자동 감지
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js를 찾을 수 없습니다. Node.js를 설치해주세요."
    exit 1
fi

echo "=== 길튼 시스템 서버 설치 ==="
echo "서버 경로: $SERVER_DIR"
echo "Node.js 경로: $NODE_PATH"
echo ""

# 기존 서비스 해제
if launchctl list | grep -q "$PLIST_NAME" 2>/dev/null; then
    echo "기존 서비스 해제 중..."
    launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

# LaunchAgents 디렉토리 확인
mkdir -p "$HOME/Library/LaunchAgents"

# plist 복사 및 경로 치환
cp "$PLIST_SRC" "$PLIST_DST"
sed -i '' "s|__NODE_PATH__|$NODE_PATH|g" "$PLIST_DST"
sed -i '' "s|__WORKING_DIR__|$SERVER_DIR|g" "$PLIST_DST"

# 서비스 등록
launchctl load "$PLIST_DST"

echo ""
echo "설치 완료!"
echo ""
echo "서비스 상태 확인: launchctl list | grep gilteun"
echo "로그 확인: tail -f /tmp/gilteun-server.log"
echo "에러 로그: tail -f /tmp/gilteun-server.error.log"
echo ""
echo "서버 접속: http://localhost:3000"
