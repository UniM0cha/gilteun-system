#!/bin/bash
set -euo pipefail

# =============================================================================
# 길튼 시스템 인스톨러
# 사용법:
#   로컬:  bash setup.sh
#   원격:  bash <(curl -fsSL https://raw.githubusercontent.com/UniM0cha/gilteun-system/main/setup.sh)
# =============================================================================

REPO_URL="https://github.com/UniM0cha/gilteun-system.git"
DEFAULT_INSTALL_DIR="$HOME/gilteun-system"
PRODUCTION_PORT=3000
MIN_NODE_VERSION=18
NODE_FORMULA="node@24"
PLIST_NAME="com.gilteun.server"

PROJECT_DIR=""
INSTALL_MODE="fresh"

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
# 에러 트랩
# -----------------------------------------------------------------------------
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "${RED}[x] 설치 중 오류가 발생했습니다. 위의 출력을 확인해주세요.${RESET}"
  fi
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# 1. 전제조건 확인 & 자동 설치
# -----------------------------------------------------------------------------
check_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    error "이 스크립트는 macOS 전용입니다."
  fi
}

check_xcode_clt() {
  if ! xcode-select -p &>/dev/null; then
    warn "Xcode Command Line Tools가 설치되어 있지 않습니다."
    local answer
    answer=$(ask "설치할까요? (git, make 등 포함) [Y/n]" "Y")
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      info "Xcode CLT 설치를 시작합니다. 팝업에서 '설치'를 클릭해주세요..."
      xcode-select --install
      echo ""
      info "설치가 완료되면 이 스크립트를 다시 실행해주세요."
      exit 0
    else
      error "Xcode CLT가 필요합니다. 'xcode-select --install'로 설치해주세요."
    fi
  fi
  success "Xcode CLT 확인됨"
}

check_homebrew() {
  if ! command -v brew &>/dev/null; then
    warn "Homebrew가 설치되어 있지 않습니다."
    local answer
    answer=$(ask "Homebrew를 설치할까요? [Y/n]" "Y")
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      info "Homebrew 설치 중..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/tty

      # Apple Silicon: brew PATH 설정
      if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      fi

      if ! command -v brew &>/dev/null; then
        error "Homebrew 설치 후 brew 명령을 찾을 수 없습니다. 터미널을 재시작 후 다시 실행해주세요."
      fi
      success "Homebrew 설치 완료"
    else
      error "Homebrew가 필요합니다. https://brew.sh 에서 설치해주세요."
    fi
  else
    success "Homebrew 확인됨"
  fi
}

check_node() {
  if ! command -v node &>/dev/null; then
    warn "Node.js가 설치되어 있지 않습니다."
    local answer
    answer=$(ask "Node.js 24 LTS를 설치할까요? (brew install $NODE_FORMULA) [Y/n]" "Y")
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      info "Node.js 설치 중..."
      brew install "$NODE_FORMULA"

      # node@24는 keg-only일 수 있으므로 PATH에 추가
      if ! command -v node &>/dev/null; then
        local node_prefix
        node_prefix="$(brew --prefix "$NODE_FORMULA")"
        export PATH="$node_prefix/bin:$PATH"
      fi

      if ! command -v node &>/dev/null; then
        error "Node.js 설치 후 node 명령을 찾을 수 없습니다. 터미널을 재시작 후 다시 실행해주세요."
      fi
      success "Node.js $(node -v) 설치 완료"
    else
      error "Node.js가 필요합니다. https://nodejs.org 에서 설치해주세요."
    fi
    return
  fi

  local version
  version=$(node -v | sed 's/^v//' | cut -d. -f1)
  if [ "$version" -lt "$MIN_NODE_VERSION" ]; then
    error "Node.js $MIN_NODE_VERSION 이상이 필요합니다. (현재: $(node -v))"
  fi
  success "Node.js $(node -v) 확인됨"
}

check_npm() {
  if ! command -v npm &>/dev/null; then
    error "npm을 찾을 수 없습니다. Node.js가 올바르게 설치되었는지 확인해주세요."
  fi
  success "npm $(npm -v) 확인됨"
}

# -----------------------------------------------------------------------------
# 2. 레포 설정
# -----------------------------------------------------------------------------
ensure_repo() {
  # 현재 디렉토리가 gilteun-system 레포 안인지 확인
  if [ -f "./package.json" ] && grep -q '"gilteun-system"' ./package.json 2>/dev/null; then
    PROJECT_DIR="$(pwd)"
    info "기존 레포에서 실행 중: $PROJECT_DIR"

    if [ -d ".git" ]; then
      local answer
      answer=$(ask "최신 변경사항을 받아올까요? (git pull) [Y/n]" "Y")
      if [[ "$answer" =~ ^[Yy]$ ]]; then
        git pull --rebase origin main
        success "최신 버전으로 업데이트됨"
      fi
    fi
    INSTALL_MODE="update"
    return
  fi

  # 레포 밖에서 실행 (curl 시나리오)
  local target="${GILTEUN_DIR:-$DEFAULT_INSTALL_DIR}"

  if [ -d "$target/.git" ]; then
    info "기존 설치를 발견했습니다: $target"
    cd "$target"
    git pull --rebase origin main
    PROJECT_DIR="$target"
    INSTALL_MODE="update"
    success "최신 버전으로 업데이트됨"
  else
    info "레포를 클론합니다: $target"
    git clone "$REPO_URL" "$target"
    PROJECT_DIR="$target"
    INSTALL_MODE="fresh"
    success "클론 완료"
  fi

  cd "$PROJECT_DIR"
}

# -----------------------------------------------------------------------------
# 3. 의존성 설치
# -----------------------------------------------------------------------------
install_dependencies() {
  info "루트 의존성 설치 중..."
  npm install

  info "서버 & 클라이언트 의존성 설치 중..."
  npm run install:all

  # sharp 네이티브 모듈 확인
  if ! node -e "require('./server/node_modules/sharp')" 2>/dev/null; then
    warn "sharp (이미지 처리) 모듈이 올바르게 설치되지 않았을 수 있습니다."
    warn "문제 발생 시: cd server && npm rebuild sharp"
  fi

  success "의존성 설치 완료"
}

# -----------------------------------------------------------------------------
# 4. 클라이언트 빌드
# -----------------------------------------------------------------------------
build_client() {
  info "React 클라이언트 빌드 중..."
  npm run build

  if [ ! -f "client/dist/index.html" ]; then
    error "클라이언트 빌드 실패: client/dist/index.html을 찾을 수 없습니다."
  fi

  success "클라이언트 빌드 완료"
}

# -----------------------------------------------------------------------------
# 5. 데이터베이스 설정
# -----------------------------------------------------------------------------
setup_database() {
  mkdir -p server/data

  if [ ! -f "server/data/gilteun.db" ]; then
    info "데이터베이스가 첫 서버 실행 시 자동 생성됩니다."
    info "초기 데이터(역할, 예배 유형, 명령 등)를 투입합니다..."
    npm run db:seed
    success "초기 데이터 투입 완료"
  else
    info "기존 데이터베이스가 존재합니다."
    warn "seed를 실행하면 기존 데이터가 모두 초기화됩니다."
    local answer
    answer=$(ask "초기 데이터를 다시 투입할까요? [y/N]" "N")
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      npm run db:seed
      success "초기 데이터 재투입 완료"
    else
      info "기존 데이터베이스를 유지합니다."
    fi
  fi
}

# -----------------------------------------------------------------------------
# 6. launchd 서비스 등록
# -----------------------------------------------------------------------------
resolve_node_path() {
  local node_path
  node_path=$(command -v node)
  # nvm 등 심볼릭 링크 resolve
  if command -v realpath &>/dev/null; then
    node_path=$(realpath "$node_path")
  elif command -v readlink &>/dev/null; then
    local resolved
    resolved=$(readlink -f "$node_path" 2>/dev/null || echo "$node_path")
    node_path="$resolved"
  fi
  echo "$node_path"
}

setup_launchd() {
  local answer
  answer=$(ask "자동 시작 서비스를 등록할까요? (launchd) [Y/n]" "Y")
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    info "서비스 등록을 건너뜁니다."
    info "수동 시작: cd $PROJECT_DIR && npm start"
    return
  fi

  local node_path
  node_path=$(resolve_node_path)
  local server_dir="$PROJECT_DIR/server"
  local plist_src="$server_dir/deploy/$PLIST_NAME.plist"
  local plist_dst="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

  if [ ! -f "$plist_src" ]; then
    warn "plist 템플릿을 찾을 수 없습니다: $plist_src"
    warn "서비스 등록을 건너뜁니다."
    return
  fi

  # 기존 서비스 해제
  if launchctl list 2>/dev/null | grep -q "$PLIST_NAME"; then
    info "기존 서비스 해제 중..."
    launchctl unload "$plist_dst" 2>/dev/null || true
  fi

  mkdir -p "$HOME/Library/LaunchAgents"

  # plist 복사 및 경로 치환
  cp "$plist_src" "$plist_dst"
  sed -i '' "s|__NODE_PATH__|$node_path|g" "$plist_dst"
  sed -i '' "s|__WORKING_DIR__|$server_dir|g" "$plist_dst"

  # 서비스 등록
  launchctl load "$plist_dst"

  success "서비스 등록 완료 ($PLIST_NAME)"
  info "로그: tail -f /tmp/gilteun-server.log"
  info "에러 로그: tail -f /tmp/gilteun-server.error.log"
}

# -----------------------------------------------------------------------------
# 완료 요약
# -----------------------------------------------------------------------------
print_summary() {
  echo ""
  echo "${GREEN}${BOLD}  설치 완료!${RESET}"
  echo ""
  echo "  설치 경로:  $PROJECT_DIR"
  echo "  프로덕션:   http://localhost:$PRODUCTION_PORT"
  echo ""
  echo "  시작:       cd $PROJECT_DIR && npm start"
  echo "  개발 모드:  cd $PROJECT_DIR && npm run dev"
  echo ""

  if launchctl list 2>/dev/null | grep -q "$PLIST_NAME"; then
    echo "  서비스:     실행 중 (자동 시작 등록됨)"
    echo "  중지:       launchctl stop $PLIST_NAME"
    echo "  해제:       launchctl unload ~/Library/LaunchAgents/$PLIST_NAME.plist"
    echo ""
  fi
}

# -----------------------------------------------------------------------------
# 메인
# -----------------------------------------------------------------------------
main() {
  setup_colors

  echo ""
  echo "${BOLD}  길튼 시스템 인스톨러${RESET}"
  echo ""

  step "1/6 전제조건 확인"
  check_macos
  check_xcode_clt
  check_homebrew
  check_node
  check_npm

  step "2/6 레포 설정"
  ensure_repo

  step "3/6 의존성 설치"
  install_dependencies

  step "4/6 클라이언트 빌드"
  build_client

  step "5/6 데이터베이스 설정"
  setup_database

  step "6/6 서비스 등록"
  setup_launchd

  print_summary
}

main "$@"
