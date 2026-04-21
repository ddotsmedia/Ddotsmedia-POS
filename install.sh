#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║         Ddotsmedia POS — Full VPS Install Script                ║
# ║                                                                  ║
# ║  Run this ONE command on a fresh Ubuntu 22.04 VPS:              ║
# ║  curl -fsSL https://raw.githubusercontent.com/ddotsmedia/       ║
# ║    Ddotsmedia-POS/main/install.sh | sudo bash                   ║
# ╚══════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✘]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
prompt()  { echo -e "${YELLOW}▶${NC} $1"; }

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "  ██████╗ ██████╗  ██████╗ ████████╗███████╗███╗   ███╗███████╗██████╗ ██╗ █████╗ "
echo "  ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝████╗ ████║██╔════╝██╔══██╗██║██╔══██╗"
echo "  ██║  ██║██║  ██║██║   ██║   ██║   ███████╗██╔████╔██║█████╗  ██║  ██║██║███████║"
echo "  ██║  ██║██║  ██║██║   ██║   ██║   ╚════██║██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║"
echo "  ██████╔╝██████╔╝╚██████╔╝   ██║   ███████║██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║"
echo "  ╚═════╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${BOLD}POS System — Full VPS Installer${NC}"
echo -e "  Ubuntu 22.04+ | Docker | Next.js | NestJS | PostgreSQL"
echo ""

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash install.sh"

# ── Collect configuration ─────────────────────────────────────────────────────
step "Configuration"

prompt "Enter your domain name (e.g. pos.yourdomain.com):"
read -r DOMAIN
[[ -z "$DOMAIN" ]] && error "Domain cannot be empty"

prompt "Enter your email (for SSL certificate notifications):"
read -r SSL_EMAIL
[[ -z "$SSL_EMAIL" ]] && error "Email cannot be empty"

prompt "Enter DB password (leave blank to auto-generate):"
read -rs DB_PASSWORD
echo ""
[[ -z "$DB_PASSWORD" ]] && DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 28)

prompt "Enter Redis password (leave blank to auto-generate):"
read -rs REDIS_PASSWORD
echo ""
[[ -z "$REDIS_PASSWORD" ]] && REDIS_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 28)

prompt "Enter OpenAI API key (leave blank to skip AI features):"
read -rs OPENAI_API_KEY
echo ""

# Auto-generate JWT secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
info "Domain:  $DOMAIN"
info "Email:   $SSL_EMAIL"
info "DB Pass: ${DB_PASSWORD:0:4}****(auto or entered)"
info "Secrets: auto-generated ✔"
echo ""
prompt "Confirm and start installation? (y/N):"
read -r CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && error "Installation cancelled."

# ── Step 1: System update ─────────────────────────────────────────────────────
step "1/8  Updating system packages"
apt-get update -qq
apt-get install -y -qq git curl wget nano unzip ufw 2>/dev/null
info "System packages ready"

# ── Step 2: Install Docker ────────────────────────────────────────────────────
step "2/8  Installing Docker"
if command -v docker &>/dev/null; then
  info "Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  info "Docker installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
fi
info "Docker Compose: $(docker compose version)"

# ── Step 3: Create project folder & clone ─────────────────────────────────────
step "3/8  Setting up project"
PROJECT_DIR="/opt/ddotsmedia-pos"
mkdir -p "$PROJECT_DIR"
info "Project folder: $PROJECT_DIR"

if [[ -d "$PROJECT_DIR/.git" ]]; then
  info "Repo already cloned — pulling latest..."
  cd "$PROJECT_DIR" && git pull
else
  info "Cloning from GitHub..."
  git clone https://github.com/ddotsmedia/Ddotsmedia-POS.git "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
info "Repository ready"

# ── Step 4: Create .env ───────────────────────────────────────────────────────
step "4/8  Writing environment config"
cat > .env <<EOF
# ─── DOMAIN ────────────────────────────────────────
DOMAIN=$DOMAIN

# ─── DATABASE ──────────────────────────────────────
DB_NAME=posdb
DB_USER=posuser
DB_PASSWORD=$DB_PASSWORD

# ─── REDIS ─────────────────────────────────────────
REDIS_PASSWORD=$REDIS_PASSWORD

# ─── JWT ───────────────────────────────────────────
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# ─── FRONTEND ──────────────────────────────────────
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
ALLOWED_ORIGINS=https://$DOMAIN

# ─── AI (optional) ─────────────────────────────────
OPENAI_API_KEY=$OPENAI_API_KEY

# ─── EXPO / MOBILE ─────────────────────────────────
EXPO_PUBLIC_API_URL=https://$DOMAIN/api
EOF

info ".env file created"

# ── Step 5: Configure firewall ────────────────────────────────────────────────
step "5/8  Configuring firewall"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow ssh >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
info "Firewall: SSH, HTTP(80), HTTPS(443) allowed"

# ── Step 6: Get SSL certificate ───────────────────────────────────────────────
step "6/8  Issuing SSL certificate"

# Prepare nginx init config (HTTP only for ACME challenge)
mkdir -p nginx
cp nginx/nginx-init.conf nginx/nginx-active.conf 2>/dev/null || cat > nginx/nginx-active.conf <<'NGINXEOF'
worker_processes auto;
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'Setting up SSL...'; add_header Content-Type text/plain; }
  }
}
NGINXEOF

cat > /tmp/dc-init.yml <<DCEOF
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - $PROJECT_DIR/nginx/nginx-active.conf:/etc/nginx/nginx.conf:ro
      - certbot_www:/var/www/certbot
    networks:
      - pos-net
  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    networks:
      - pos-net
volumes:
  certbot_www:
  certbot_conf:
networks:
  pos-net:
    driver: bridge
DCEOF

docker compose -f /tmp/dc-init.yml up -d nginx
sleep 5

docker compose -f /tmp/dc-init.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email "$SSL_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN" \
  && info "SSL certificate issued for $DOMAIN" \
  || warn "SSL cert failed — check DNS points to this server ($(curl -s ifconfig.me)). Re-run install.sh after DNS propagates."

docker compose -f /tmp/dc-init.yml down -v 2>/dev/null || true

# ── Step 7: Configure nginx with domain & build ───────────────────────────────
step "7/8  Building Docker images"

# Write final nginx.conf with real domain
sed "s/__DOMAIN__/$DOMAIN/g" nginx/nginx.conf > /tmp/nginx-final.conf
cp /tmp/nginx-final.conf nginx/nginx.conf

info "Building images (this takes 3-5 minutes)..."
docker compose build --no-cache

# ── Step 8: Start everything ──────────────────────────────────────────────────
step "8/8  Starting all services"
docker compose up -d
info "All containers started"

# Wait for backend
info "Waiting for backend to be healthy..."
ATTEMPTS=0
until docker compose exec -T backend curl -sf http://localhost:5100/health &>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [[ $ATTEMPTS -gt 36 ]] && { warn "Backend slow to start — check: docker compose logs backend"; break; }
  sleep 5
done
[[ $ATTEMPTS -le 36 ]] && info "Backend is healthy!"

# Seed database
info "Seeding database with default users..."
docker compose exec -T backend node dist-seed/seed.js 2>/dev/null \
  && info "Database seeded" \
  || warn "Seed skipped (already seeded or seed file missing)"

# ── Save credentials ──────────────────────────────────────────────────────────
CREDS_FILE="/root/ddotsmedia-pos-credentials.txt"
cat > "$CREDS_FILE" <<EOF
╔══════════════════════════════════════════════════════════╗
║          Ddotsmedia POS — Deployment Credentials         ║
╚══════════════════════════════════════════════════════════╝

  Installed:  $(date)
  Server IP:  $(curl -s ifconfig.me)
  Domain:     $DOMAIN

  Admin Panel:  https://$DOMAIN
  API:          https://$DOMAIN/api/v1
  Health:       https://$DOMAIN/api/health

  ── Login Credentials ──────────────────────────────────
  Admin    : admin@mystore.com   / admin123
  Manager  : manager@mystore.com / manager123
  Cashier  : cashier@mystore.com / cashier123

  ── Database ───────────────────────────────────────────
  DB Name  : posdb
  DB User  : posuser
  DB Pass  : $DB_PASSWORD

  ── Redis ──────────────────────────────────────────────
  Password : $REDIS_PASSWORD

  ── JWT Secrets ────────────────────────────────────────
  JWT      : $JWT_SECRET
  Refresh  : $JWT_REFRESH_SECRET

  Project folder: $PROJECT_DIR
EOF
chmod 600 "$CREDS_FILE"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║       Ddotsmedia POS installed successfully!             ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo -e "  ║  🌐 Admin:   https://$DOMAIN"
echo -e "  ║  📡 API:     https://$DOMAIN/api/v1"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Default logins:                                         ║"
echo "  ║    Admin   : admin@mystore.com   / admin123              ║"
echo "  ║    Manager : manager@mystore.com / manager123            ║"
echo "  ║    Cashier : cashier@mystore.com / cashier123            ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Credentials saved to: /root/ddotsmedia-pos-credentials.txt ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Useful commands:                                        ║"
echo "  ║    cd $PROJECT_DIR"
echo "  ║    docker compose ps                                     ║"
echo "  ║    docker compose logs -f backend                        ║"
echo "  ║    docker compose logs -f frontend                       ║"
echo "  ║    docker compose restart backend                        ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
