#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║         Ddotsmedia POS — Update & Deploy Script                  ║
# ║                                                                  ║
# ║  Run on VPS to pull & deploy latest changes:                     ║
# ║    cd /opt/ddotsmedia-pos && sudo bash update.sh                 ║
# ║                                                                  ║
# ║  Or from anywhere:                                               ║
# ║    sudo bash /opt/ddotsmedia-pos/update.sh                       ║
# ╚══════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✘]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
detail()  { echo -e "    ${NC}$1${NC}"; }

PROJECT_DIR="/opt/ddotsmedia-pos"
LOG_FILE="/var/log/ddotsmedia-pos-update.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║         Ddotsmedia POS — Update & Deploy                 ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Started:${NC} $TIMESTAMP"
echo ""

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash update.sh"

# ── Project directory must exist ──────────────────────────────────────────────
[[ ! -d "$PROJECT_DIR/.git" ]] && error "Project not found at $PROJECT_DIR — run install.sh first"

cd "$PROJECT_DIR"

# ── Start logging ─────────────────────────────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1
echo ""
echo "═══════════════════════════════════════"
echo "  Deploy started: $TIMESTAMP"
echo "═══════════════════════════════════════"

# ── Step 1: Pull latest code ──────────────────────────────────────────────────
step "1/6  Pulling latest code from GitHub"

BEFORE=$(git rev-parse HEAD)
git fetch origin main

REMOTE=$(git rev-parse origin/main)

if [[ "$BEFORE" == "$REMOTE" ]]; then
  warn "Already up to date ($(git log -1 --format='%h %s' HEAD))"
  echo ""
  echo -ne "${YELLOW}▶${NC} Force rebuild anyway? (y/N): "
  read -r FORCE_REBUILD
  [[ "$FORCE_REBUILD" != "y" && "$FORCE_REBUILD" != "Y" ]] && {
    info "Nothing to deploy. Exiting."
    exit 0
  }
  REBUILD_FORCED=true
else
  REBUILD_FORCED=false
fi

git pull origin main
AFTER=$(git rev-parse HEAD)

info "Updated: $(git log -1 --format='%h — %s' HEAD)"
echo ""

# Show what changed
CHANGED_FILES=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")
if [[ -n "$CHANGED_FILES" ]]; then
  detail "Changed files:"
  echo "$CHANGED_FILES" | while read -r f; do detail "  · $f"; done
fi

# ── Detect what needs rebuilding ──────────────────────────────────────────────
REBUILD_BACKEND=false
REBUILD_FRONTEND=false
HAS_MIGRATION=false

if [[ "$REBUILD_FORCED" == "true" ]]; then
  REBUILD_BACKEND=true
  REBUILD_FRONTEND=true
else
  echo "$CHANGED_FILES" | grep -qE '^server/' && REBUILD_BACKEND=true
  echo "$CHANGED_FILES" | grep -qE '^client/' && REBUILD_FRONTEND=true
  echo "$CHANGED_FILES" | grep -qE '^server/prisma/migrations/' && HAS_MIGRATION=true
  # Schema changes always require backend rebuild
  echo "$CHANGED_FILES" | grep -q 'server/prisma/schema.prisma' && { REBUILD_BACKEND=true; HAS_MIGRATION=true; }
fi

[[ "$REBUILD_BACKEND" == "true" ]]  && info "Backend rebuild needed" || info "Backend unchanged — skip rebuild"
[[ "$REBUILD_FRONTEND" == "true" ]] && info "Frontend rebuild needed" || info "Frontend unchanged — skip rebuild"
[[ "$HAS_MIGRATION" == "true" ]]    && warn "New DB migration(s) detected — will run after backend starts"

# ── Step 2: Backup database ───────────────────────────────────────────────────
step "2/6  Database backup"

BACKUP_DIR="/root/ddotsmedia-pos-backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date '+%Y%m%d-%H%M%S').sql.gz"

if docker compose ps db 2>/dev/null | grep -q "Up"; then
  # Load env for DB credentials
  source .env 2>/dev/null || true
  DB_NAME="${DB_NAME:-posdb}"
  DB_USER="${DB_USER:-posuser}"
  DB_PASSWORD="${DB_PASSWORD:-}"

  docker compose exec -T db \
    pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null \
    | gzip > "$BACKUP_FILE" \
    && info "Backup saved: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))" \
    || warn "Backup skipped (non-critical)"

  # Keep only last 7 backups
  ls -t "$BACKUP_DIR"/pre-deploy-*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
else
  warn "DB container not running — skipping backup"
fi

# ── Step 3: Rebuild changed images ────────────────────────────────────────────
step "3/6  Building Docker images"

if [[ "$REBUILD_BACKEND" == "true" && "$REBUILD_FRONTEND" == "true" ]]; then
  info "Rebuilding backend + frontend..."
  docker compose build --no-cache backend frontend
elif [[ "$REBUILD_BACKEND" == "true" ]]; then
  info "Rebuilding backend only..."
  docker compose build --no-cache backend
elif [[ "$REBUILD_FRONTEND" == "true" ]]; then
  info "Rebuilding frontend only..."
  docker compose build --no-cache frontend
else
  info "No images need rebuilding — skipping build"
fi

# ── Step 4: Zero-downtime rolling restart ─────────────────────────────────────
step "4/6  Deploying with minimal downtime"

if [[ "$REBUILD_FRONTEND" == "true" || "$REBUILD_BACKEND" == "true" || "$REBUILD_FORCED" == "true" ]]; then

  # Start new backend container, then swap (keeps DB+Redis untouched)
  if [[ "$REBUILD_BACKEND" == "true" || "$REBUILD_FORCED" == "true" ]]; then
    info "Restarting backend..."
    docker compose up -d --no-deps backend
  fi

  if [[ "$REBUILD_FRONTEND" == "true" || "$REBUILD_FORCED" == "true" ]]; then
    info "Restarting frontend..."
    docker compose up -d --no-deps frontend
  fi

else
  info "No restart needed"
fi

# ── Step 5: Run migrations ────────────────────────────────────────────────────
step "5/6  Database migrations"

# Wait for backend to be healthy before migrating
info "Waiting for backend to be ready..."
BACKEND_READY=false
for i in $(seq 1 40); do
  if docker compose exec -T backend curl -sf http://localhost:5100/health &>/dev/null; then
    BACKEND_READY=true
    info "Backend healthy"
    break
  fi
  sleep 5
  detail "  Attempt $i/40..."
done

if [[ "$BACKEND_READY" == "false" ]]; then
  warn "Backend not responding after 200s — check logs:"
  detail "  docker compose logs --tail=50 backend"
  error "Deploy failed — backend did not come up"
fi

if [[ "$HAS_MIGRATION" == "true" ]]; then
  info "Running Prisma migrations..."
  docker compose exec -T backend npx prisma migrate deploy \
    && info "Migrations applied successfully" \
    || error "Migration failed — check logs: docker compose logs backend"
else
  info "No new migrations to run"
fi

# ── Step 6: Verify deployment ─────────────────────────────────────────────────
step "6/6  Verification"

# Check all containers are up
ALL_GOOD=true
for SVC in db redis backend frontend; do
  STATUS=$(docker compose ps "$SVC" 2>/dev/null | tail -1 | grep -o 'Up\|running\|healthy' | head -1 || echo "unknown")
  if [[ "$STATUS" == "Up" || "$STATUS" == "running" || "$STATUS" == "healthy" ]]; then
    info "Container '$SVC': running"
  else
    warn "Container '$SVC': $STATUS"
    ALL_GOOD=false
  fi
done

# Quick API health check
source .env 2>/dev/null || true
DOMAIN="${DOMAIN:-localhost}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null \
  || curl -s -o /dev/null -w "%{http_code}" "http://localhost:5100/health" 2>/dev/null \
  || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
  info "API health check: HTTP $HTTP_CODE ✓"
else
  warn "API health check returned HTTP $HTTP_CODE — may still be warming up"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
DURATION=$SECONDS

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
if [[ "$ALL_GOOD" == "true" ]]; then
echo "  ║         Deploy completed successfully! ✓                 ║"
else
echo "  ║         Deploy completed with warnings ⚠                 ║"
fi
echo "  ╠══════════════════════════════════════════════════════════╣"
echo -e "  ║  Finished : $END_TIME"
echo -e "  ║  Duration : ${DURATION}s"
echo -e "  ║  Commit   : $(git log -1 --format='%h — %s' HEAD)"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Useful commands:                                        ║"
echo "  ║    docker compose ps                                     ║"
echo "  ║    docker compose logs -f backend                        ║"
echo "  ║    docker compose logs -f frontend                       ║"
echo "  ║    docker compose restart backend                        ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "  Deploy log: $LOG_FILE"
echo ""
echo "═══════════════════════════════════════"
echo "  Deploy finished: $END_TIME (${DURATION}s)"
echo "═══════════════════════════════════════"
