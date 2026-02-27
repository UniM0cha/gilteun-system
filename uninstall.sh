#!/bin/bash
set -euo pipefail

# =============================================================================
# 길튼 시스템 언인스톨러
# 사용법:
#   로컬:  bash uninstall.sh
#   원격:  bash <(curl -fsSL https://raw.githubusercontent.com/UniM0cha/gilteun-system/main/uninstall.sh)
# =============================================================================

DEFAULT_INSTALL_DIR="$HOME/gilteun-system"
PLIST_NAME="com.gilteun.server"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

PROJECT_DIR=""
RAN_INSIDE_REPO=false

# -----------------------------------------------------------------------------
# 색상 & 출력 헬퍼
# -----------------------------------------------------------------------------
setup_colors() {
  if [ -t 1 ] && command -v tput &>/dev/null; then
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    BLUE=$(tput setaf 4)
    BOLD=$(tput bold)
    RESET=$(tput sgr0)
  else
    RED="" GREEN="" YELLOW="" BLUE="" BOLD="" RESET=""
  fi
}

info()    { echo "${BLUE}[i]${RESET} $*"; }
success() { echo "${GREEN}[v]${RESET} $*"; }
warn()    { echo "${YELLOW}[!]${RESET} $*"; }
error()   { echo "${RED}[x]${RESET} $*"; exit 1; }
step()    { echo ""; echo "${BOLD}==> $*${RESET}"; }

ask() {
  local prompt="$1" default="$2"
  local answer
  read -rp "$prompt " answer </dev/tty
  echo "${answer:-$default}"
}

# -----------------------------------------------------------------------------
# 1. 프로젝트 경로 탐색
# -----------------------------------------------------------------------------
find_project() {
  # 현재 디렉토리가 gilteun-system 레포인지 확인
  if [ -f "./package.json" ] && grep -q '"gilteun-system"' ./package.json 2>/dev/null; then
    PROJECT_DIR="$(pwd)"
    RAN_INSIDE_REPO=true
    info "프로젝트 발견: $PROJECT_DIR"
    return
  fi

  # 기본 설치 경로 확인
  local target="${GILTEUN_DIR:-$DEFAULT_INSTALL_DIR}"
  if [ -d "$target" ] && [ -f "$target/package.json" ] && grep -q '"gilteun-system"' "$target/package.json" 2>/dev/null; then
    PROJECT_DIR="$target"
    info "프로젝트 발견: $PROJECT_DIR"
    return
  fi

  # 못 찾으면 사용자에게 경로 입력 요청
  warn "길튼 시스템 설치 경로를 자동으로 찾을 수 없습니다."
  local custom_path
  custom_path=$(ask "설치 경로를 입력해주세요 (없으면 Enter):" "")
  if [ -n "$custom_path" ] && [ -d "$custom_path" ]; then
    PROJECT_DIR="$custom_path"
    info "프로젝트 경로: $PROJECT_DIR"
  else
    PROJECT_DIR=""
    info "프로젝트 경로 없이 서비스 해제만 진행합니다."
  fi
}

# -----------------------------------------------------------------------------
# 2. launchd 서비스 해제
# -----------------------------------------------------------------------------
remove_service() {
  if launchctl list 2>/dev/null | grep -q "$PLIST_NAME"; then
    info "서비스 중지 중..."
    launchctl stop "$PLIST_NAME" 2>/dev/null || true
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    success "서비스 중지 완료"
  else
    info "실행 중인 서비스가 없습니다."
  fi

  if [ -f "$PLIST_DST" ]; then
    rm "$PLIST_DST"
    success "plist 삭제: $PLIST_DST"
  fi
}

# -----------------------------------------------------------------------------
# 3. 로그 파일 삭제
# -----------------------------------------------------------------------------
remove_logs() {
  local removed=false
  if [ -f "/tmp/gilteun-server.log" ]; then
    rm "/tmp/gilteun-server.log"
    removed=true
  fi
  if [ -f "/tmp/gilteun-server.error.log" ]; then
    rm "/tmp/gilteun-server.error.log"
    removed=true
  fi

  if [ "$removed" = true ]; then
    success "로그 파일 삭제 완료"
  else
    info "삭제할 로그 파일이 없습니다."
  fi
}

# -----------------------------------------------------------------------------
# 4. 프로젝트 디렉토리 삭제
# -----------------------------------------------------------------------------
remove_project() {
  if [ -z "$PROJECT_DIR" ]; then
    return
  fi

  echo ""
  if [ "$RAN_INSIDE_REPO" = true ]; then
    warn "현재 이 스크립트가 프로젝트 디렉토리 안에서 실행 중입니다."
    warn "프로젝트 삭제는 직접 수행해주세요:"
    echo ""
    echo "  rm -rf $PROJECT_DIR"
    echo ""
    return
  fi

  warn "프로젝트 디렉토리를 삭제하면 데이터베이스와 업로드된 파일이 모두 사라집니다."
  local answer
  answer=$(ask "프로젝트 디렉토리를 삭제할까요? ($PROJECT_DIR) [y/N]" "N")
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    rm -rf "$PROJECT_DIR"
    success "프로젝트 삭제 완료: $PROJECT_DIR"
  else
    info "프로젝트 디렉토리를 유지합니다."
  fi
}

# -----------------------------------------------------------------------------
# 완료 요약
# -----------------------------------------------------------------------------
print_summary() {
  echo ""
  echo "${GREEN}${BOLD}  제거 완료!${RESET}"
  echo ""
}

# -----------------------------------------------------------------------------
# 메인
# -----------------------------------------------------------------------------
main() {
  setup_colors

  echo ""
  echo "${BOLD}  길튼 시스템 언인스톨러${RESET}"
  echo ""

  step "1/4 프로젝트 경로 확인"
  find_project

  step "2/4 서비스 해제"
  remove_service

  step "3/4 로그 파일 정리"
  remove_logs

  step "4/4 프로젝트 삭제"
  remove_project

  print_summary
}

main "$@"
