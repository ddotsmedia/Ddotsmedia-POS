#!/bin/bash
# POS System — VPS Deployment Script
# Run as root (or with sudo) on Ubuntu 22.04+
#
# Usage:
#   1. Copy project to VPS:  scp -r pos-system/ user@your-vps:/opt/pos-system
#   2. SSH into VPS:          ssh user@your-vps
#   3. Run:                   cd /opt/pos-system && chmod +x deploy.sh && sudo ./deploy.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Load .env ─────────────────────────────────────────────────────────────────
[[ -f .env ]] || error ".env file not found. Copy .env.example to .env and fill in all values."
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# ── Validate required variables ───────────────────────────────────────────────
for var in DOMAIN DB_PASSWORD REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET NEXT_PUBLIC_API_URL ALLOWED_ORIGINS; do
  [[ -z "${!var:-}" ]] && error "Required variable '$var' is not set in .env"
done

[[ "$DB_PASSWORD" == *"CHANGE_THIS"* ]] && error "DB_PASSWORD still has placeholder value. Set a real password in .env"
[[ "$JWT_SECRET"  == *"CHANGE_THIS"* ]] && error "JWT_SECRET still has placeholder value. Generate one with: openssl rand -base64 64"

info "Deploying POS System for domain: $DOMAIN"

# ── Install Docker & Docker Compose if missing ────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &>/dev/null; then
  info "Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# ── Configure nginx with actual domain ────────────────────────────────────────
info "Configuring nginx for domain: $DOMAIN"
sed "s/__DOMAIN__/$DOMAIN/g" nginx/nginx.conf > /tmp/nginx-final.conf

# ── Step 1: Start nginx on HTTP only to get SSL cert ─────────────────────────
info "Starting nginx in HTTP-only mode for SSL certificate issuance..."
cp nginx/nginx-init.conf nginx/nginx-active.conf
# Temporarily mount nginx-active.conf
cat > /tmp/docker-compose-init.yml <<EOF
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx-active.conf:/etc/nginx/nginx.conf:ro
      - certbot_www:/var/www/certbot
    networks:
      - pos-network
  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    networks:
      - pos-network
volumes:
  certbot_www:
  certbot_conf:
networks:
  pos-network:
    driver: bridge
EOF

docker compose -f /tmp/docker-compose-init.yml up -d nginx

info "Waiting for nginx to be ready..."
sleep 5

# ── Step 2: Issue SSL certificate ─────────────────────────────────────────────
info "Issuing SSL certificate for $DOMAIN ..."
docker compose -f /tmp/docker-compose-init.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "admin@$DOMAIN" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  || warn "SSL cert issuance failed. If DNS isn't ready yet, run the full deploy again after DNS propagates."

docker compose -f /tmp/docker-compose-init.yml down

# ── Step 3: Activate full nginx config with SSL ───────────────────────────────
cp /tmp/nginx-final.conf nginx/nginx.conf

# ── Step 4: Build and start all services ──────────────────────────────────────
info "Building Docker images (this takes a few minutes)..."
docker compose build --no-cache

info "Starting all services..."
docker compose up -d

# ── Step 5: Wait for backend health check ─────────────────────────────────────
info "Waiting for backend to be healthy..."
ATTEMPTS=0
until docker compose exec -T backend curl -sf http://localhost:5100/health &>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [[ $ATTEMPTS -gt 30 ]] && error "Backend did not become healthy after 150s. Check logs: docker compose logs backend"
  sleep 5
done
info "Backend is healthy!"

# ── Step 6: Seed initial admin user ───────────────────────────────────────────
info "Running database seed (creates default admin if not exists)..."
docker compose exec -T backend node dist-seed/seed.js 2>/dev/null \
  || warn "Seed skipped (may already be seeded or seed script not compiled)"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        POS System deployed successfully!                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Admin Panel:  https://$DOMAIN${NC}"
echo -e "${GREEN}║  API:          https://$DOMAIN/api/v1${NC}"
echo -e "${GREEN}║  Health:       https://$DOMAIN/api/health${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Useful commands:                                         ║${NC}"
echo -e "${GREEN}║    docker compose logs -f backend                         ║${NC}"
echo -e "${GREEN}║    docker compose logs -f frontend                        ║${NC}"
echo -e "${GREEN}║    docker compose ps                                       ║${NC}"
echo -e "${GREEN}║    docker compose restart backend                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
