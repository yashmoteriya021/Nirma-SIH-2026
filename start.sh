#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh  —  Start all SchemeSetu services in parallel
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
#
# Services started:
#   1. ML FastAPI service  (Python) → http://localhost:8000
#   2. Express backend              → http://localhost:5000
#   3. Vite frontend (React)        → http://localhost:5173
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[SchemeSetu]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }

# ── Dependency checks ─────────────────────────────────────────────────────────
info "Checking dependencies…"

if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
  echo -e "${RED}[✗] Python not found. Install Python 3.10+ and try again.${NC}"; exit 1
fi
PYTHON=$(command -v python3 || command -v python)

if ! command -v uvicorn &>/dev/null; then
  warn "uvicorn not found — installing ML requirements…"
  pip install -r "$ROOT/ml/requirements.txt" -q
fi

if ! command -v node &>/dev/null; then
  echo -e "${RED}[✗] Node.js not found. Install Node 18+ and try again.${NC}"; exit 1
fi

# ── Cleanup on exit ───────────────────────────────────────────────────────────
ML_PID=; BACKEND_PID=; FRONTEND_PID=
cleanup() {
  echo ""
  info "Shutting down…"
  [ -n "$ML_PID" ]       && kill "$ML_PID"       2>/dev/null || true
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait
  info "All services stopped."
}
trap cleanup EXIT INT TERM

# ── 1. ML FastAPI service ─────────────────────────────────────────────────────
info "Starting ML service on :8000 …"
cd "$ROOT/ml"
uvicorn service.app:app --port 8000 --reload \
  > "$ROOT/ml/.service.log" 2>&1 &
ML_PID=$!
ok "ML service PID=$ML_PID  (log: ml/.service.log)"

# ── 2. Express backend ────────────────────────────────────────────────────────
info "Starting Express backend on :5001 …"
cd "$ROOT/backend"
npm run dev \
  > "$ROOT/backend/.server.log" 2>&1 &
BACKEND_PID=$!
ok "Backend PID=$BACKEND_PID  (log: backend/.server.log)"

# ── 3. Vite frontend ──────────────────────────────────────────────────────────
info "Starting Vite frontend on :5173 …"
cd "$ROOT/frontend"
npm run dev \
  > "$ROOT/frontend/.dev.log" 2>&1 &
FRONTEND_PID=$!
ok "Frontend PID=$FRONTEND_PID  (log: frontend/.dev.log)"

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  SchemeSetu is starting up.  Give it ~5s to be ready.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BLUE}Frontend${NC}   →  http://localhost:5173"
echo -e "  ${BLUE}Backend API${NC} →  http://localhost:5001/api/health"
echo -e "  ${BLUE}ML service${NC}  →  http://localhost:8000/docs"
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# ── Keep running ──────────────────────────────────────────────────────────────
wait $ML_PID $BACKEND_PID $FRONTEND_PID
