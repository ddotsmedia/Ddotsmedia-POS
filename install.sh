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

info()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
step()   { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
prompt() { echo -ne "${YELLOW}▶${NC} $1 "; }

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "  ██████╗ ██████╗  ██████╗ ████████╗███████╗███╗   ███╗███████╗██████╗ ██╗  █████╗"
echo "  ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝████╗ ████║██╔════╝██╔══██╗██║ ██╔══██╗"
echo "  ██║  ██║██║  ██║██║   ██║   ██║   ███████╗██╔████╔██║█████╗  ██║  ██║██║ ███████║"
echo "  ██║  ██║██║  ██║██║   ██║   ██║   ╚════██║██║╚██╔╝██║██╔══╝  ██║  ██║██║ ██╔══██║"
echo "  ██████╔╝██████╔╝╚██████╔╝   ██║   ███████║██║ ╚═╝ ██║███████╗██████╔╝██║ ██║  ██║"
echo "  ╚═════╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${BOLD}POS System — Full VPS Installer${NC}  (supports shared VPS with existing sites)"
echo ""

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash install.sh"

# ── Detect port 80/443 usage ──────────────────────────────────────────────────
PORT80_CONTAINER=$(docker ps --format '{{.Names}}' --filter "publish=80" 2>/dev/null | head -1 || true)
PORT443_CONTAINER=$(docker ps --format '{{.Names}}' --filter "publish=443" 2>/dev/null | head -1 || true)
SHARED_VPS=false

if [[ -n "$PORT80_CONTAINER" || -n "$PORT443_CONTAINER" ]]; then
  SHARED_VPS=true
  warn "Detected existing site on port 80/443 (container: ${PORT80_CONTAINER:-${PORT443_CONTAINER}})"
  warn "Running in SHARED VPS mode — POS will get its own SSL and run behind your existing proxy."
  echo ""
fi

# ── Collect configuration ─────────────────────────────────────────────────────
step "Configuration"

prompt "Enter your domain (e.g. pos.yourdomain.com):"
read -r DOMAIN
[[ -z "$DOMAIN" ]] && error "Domain cannot be empty"

prompt "Enter your email (for SSL certificate):"
read -r SSL_EMAIL
[[ -z "$SSL_EMAIL" ]] && error "Email cannot be empty"

prompt "DB password (blank = auto-generate):"
read -rs DB_PASSWORD; echo ""
[[ -z "$DB_PASSWORD" ]] && DB_PASSWORD=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 24)

prompt "Redis password (blank = auto-generate):"
read -rs REDIS_PASSWORD; echo ""
[[ -z "$REDIS_PASSWORD" ]] && REDIS_PASSWORD=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 24)

prompt "OpenAI API key (blank = skip AI features):"
read -rs OPENAI_API_KEY; echo ""

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
info "Domain  : $DOMAIN"
info "Email   : $SSL_EMAIL"
info "Secrets : auto-generated"
[[ "$SHARED_VPS" == "true" ]] && warn "Mode    : Shared VPS (port 80/443 already in use)"
echo ""
prompt "Confirm and start installation? (y/N):"
read -r CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && error "Installation cancelled."

# ── Step 1: System packages ───────────────────────────────────────────────────
step "1/8  System packages"
apt-get update -qq
apt-get install -y -qq git curl wget nano unzip ufw certbot 2>/dev/null
info "Packages ready"

# ── Step 2: Docker ────────────────────────────────────────────────────────────
step "2/8  Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
fi
info "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
info "Compose: $(docker compose version --short)"

# ── Step 3: Clone project ─────────────────────────────────────────────────────
step "3/8  Project setup"
PROJECT_DIR="/opt/ddotsmedia-pos"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  info "Already cloned — pulling latest..."
  git -C "$PROJECT_DIR" pull
else
  git clone https://github.com/ddotsmedia/Ddotsmedia-POS.git "$PROJECT_DIR"
fi
cd "$PROJECT_DIR"
info "Project ready at: $PROJECT_DIR"

# ── Step 4: .env file ─────────────────────────────────────────────────────────
step "4/8  Environment config"
cat > .env <<EOF
DOMAIN=$DOMAIN
DB_NAME=posdb
DB_USER=posuser
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
ALLOWED_ORIGINS=https://$DOMAIN
OPENAI_API_KEY=${OPENAI_API_KEY:-}
EXPO_PUBLIC_API_URL=https://$DOMAIN/api
EOF
info ".env created"

# ── Step 5: Firewall ──────────────────────────────────────────────────────────
step "5/8  Firewall"
ufw allow ssh    >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp>/dev/null
ufw --force enable >/dev/null
info "Firewall: SSH + 80 + 443 open"

# ── Step 6: SSL certificate ───────────────────────────────────────────────────
step "6/8  SSL Certificate"

SSL_DIR="/etc/letsencrypt/live/$DOMAIN"
if [[ -d "$SSL_DIR" ]]; then
  info "SSL certificate already exists — skipping"
else
  if [[ "$SHARED_VPS" == "true" ]]; then
    # ── Shared VPS: temporarily stop container on port 80, use standalone certbot ──
    BLOCKED_CONTAINER="${PORT80_CONTAINER:-$PORT443_CONTAINER}"
    warn "Temporarily stopping '$BLOCKED_CONTAINER' to issue SSL cert (~30 seconds)..."
    docker stop "$BLOCKED_CONTAINER"

    certbot certonly \
      --standalone \
      --non-interactive \
      --agree-tos \
      --email "$SSL_EMAIL" \
      -d "$DOMAIN" \
      && info "SSL certificate issued for $DOMAIN" \
      || { docker start "$BLOCKED_CONTAINER"; error "SSL cert failed. Make sure DNS for $DOMAIN points to $(curl -s ifconfig.me)"; }

    info "Restarting '$BLOCKED_CONTAINER'..."
    docker start "$BLOCKED_CONTAINER"
    info "Existing site back online"
  else
    # ── Clean VPS: use webroot method ─────────────────────────────────────────
    mkdir -p /var/www/certbot
    # start temp nginx for ACME challenge
    docker run -d --rm --name tmp-certbot-nginx \
      -p 80:80 \
      -v /var/www/certbot:/var/www/certbot \
      nginx:alpine \
      sh -c 'mkdir -p /var/www/certbot && nginx -g "daemon off;"' &>/dev/null || true
    sleep 3

    certbot certonly \
      --webroot --webroot-path=/var/www/certbot \
      --non-interactive --agree-tos \
      --email "$SSL_EMAIL" \
      -d "$DOMAIN" \
      && info "SSL certificate issued for $DOMAIN" \
      || warn "SSL cert failed — check DNS for $DOMAIN points to $(curl -s ifconfig.me)"

    docker stop tmp-certbot-nginx 2>/dev/null || true
  fi
fi

# ── Step 7: Build images ──────────────────────────────────────────────────────
step "7/8  Building Docker images"

# Write nginx.conf with real domain substituted
sed "s/__DOMAIN__/$DOMAIN/g" nginx/nginx.conf > /tmp/nginx-pos.conf

if [[ "$SHARED_VPS" == "true" ]]; then
  # ── Shared VPS: no nginx container, run backend+frontend on internal ports ──
  # Create a docker-compose override that removes nginx and exposes backend+frontend
  cat > docker-compose.override.yml <<OVERRIDE
services:
  nginx:
    profiles:
      - disabled
  frontend:
    ports:
      - "3100:3000"
  backend:
    ports:
      - "5100:5100"
OVERRIDE
  info "Shared mode: backend on :5100, frontend on :3100 (no nginx container)"
else
  # Clean VPS: use our nginx with SSL
  cp /tmp/nginx-pos.conf nginx/nginx.conf
  rm -f docker-compose.override.yml
fi

info "Building images (3-5 min)..."
docker compose build --no-cache
info "Images built"

# ── Step 8: Start services ────────────────────────────────────────────────────
step "8/8  Starting services"
docker compose up -d
info "All containers started"

# Wait for backend health
info "Waiting for backend..."
for i in $(seq 1 36); do
  docker compose exec -T backend curl -sf http://localhost:5100/health &>/dev/null && { info "Backend healthy!"; break; } || sleep 5
  [[ $i -eq 36 ]] && warn "Backend slow — check: docker compose logs backend"
done

# Seed database
docker compose exec -T backend node dist-seed/seed.js 2>/dev/null \
  && info "Database seeded" \
  || warn "Seed skipped (already done or seed file missing)"

# ── Shared VPS: write nginx vhost config for existing proxy ───────────────────
VHOST_FILE="/etc/nginx/sites-available/ddotsmedia-pos.conf"
VHOST_ENABLED="/etc/nginx/sites-enabled/ddotsmedia-pos.conf"

if [[ "$SHARED_VPS" == "true" ]]; then
  step "Extra  Configuring existing nginx proxy"

  cat > "$VHOST_FILE" <<VHOST
# Ddotsmedia POS — virtual host
# Auto-generated by install.sh

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 20M;

    # API
    location /api/ {
        proxy_pass         http://localhost:5100/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    # WebSocket
    location /ws {
        proxy_pass         http://localhost:5100/ws;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_read_timeout 3600s;
    }

    # Frontend
    location / {
        proxy_pass         http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
VHOST

  # Try to enable it in host nginx (if nginx is installed on host)
  if command -v nginx &>/dev/null; then
    ln -sf "$VHOST_FILE" "$VHOST_ENABLED" 2>/dev/null || true
    nginx -t 2>/dev/null && nginx -s reload 2>/dev/null \
      && info "Existing nginx reloaded with new vhost" \
      || warn "nginx config test failed — check $VHOST_FILE manually"
  else
    # nginx is Docker-based — write config to a known path and instruct user
    warn "Your nginx is Docker-based. Copy the vhost config into your proxy container."
    warn "Config saved to: $VHOST_FILE"
  fi
fi

# ── Save credentials ──────────────────────────────────────────────────────────
CREDS_FILE="/root/ddotsmedia-pos-credentials.txt"
cat > "$CREDS_FILE" <<EOF
╔══════════════════════════════════════════════════════════╗
║         Ddotsmedia POS — Deployment Credentials          ║
╚══════════════════════════════════════════════════════════╝

  Installed : $(date)
  Server IP : $(curl -s ifconfig.me 2>/dev/null || echo "unknown")
  Domain    : $DOMAIN
  Mode      : $( [[ "$SHARED_VPS" == "true" ]] && echo "Shared VPS" || echo "Standalone" )

  Admin Panel : https://$DOMAIN
  API         : https://$DOMAIN/api/v1
  Health      : https://$DOMAIN/api/health

  ── Login Credentials ──────────────────────────────────
  Admin   : admin@mystore.com   / admin123
  Manager : manager@mystore.com / manager123
  Cashier : cashier@mystore.com / cashier123

  ── Database ───────────────────────────────────────────
  Host    : localhost (internal Docker network)
  Name    : posdb
  User    : posuser
  Pass    : $DB_PASSWORD

  ── Redis ──────────────────────────────────────────────
  Pass    : $REDIS_PASSWORD

  ── JWT ────────────────────────────────────────────────
  Secret  : $JWT_SECRET
  Refresh : $JWT_REFRESH_SECRET

  Project : $PROJECT_DIR
EOF
chmod 600 "$CREDS_FILE"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║       Ddotsmedia POS installed successfully!             ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo -e "  ║  Admin   : https://$DOMAIN"
echo -e "  ║  API     : https://$DOMAIN/api/v1"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Logins:                                                 ║"
echo "  ║    admin@mystore.com   / admin123                        ║"
echo "  ║    manager@mystore.com / manager123                      ║"
echo "  ║    cashier@mystore.com / cashier123                      ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Credentials saved: /root/ddotsmedia-pos-credentials.txt ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  Commands:                                               ║"
echo "  ║    cd $PROJECT_DIR"
echo "  ║    docker compose ps                                     ║"
echo "  ║    docker compose logs -f backend                        ║"
echo "  ║    docker compose restart backend                        ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
