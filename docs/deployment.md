# VPS Deployment Guide

## Prerequisites
- Ubuntu 22.04 LTS VPS (4GB RAM, 2 vCPU, 40GB SSD)
- Domain name pointed to VPS IP (A record)
- SSH access to VPS

---

## Step 1 — Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

---

## Step 2 — Clone & Configure

```bash
# Clone repo
git clone https://github.com/yourorg/pos-system.git /var/www/pos
cd /var/www/pos

# Copy and edit environment file
cp .env.example .env
nano .env
# Fill in: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY, DOMAIN
```

---

## Step 3 — SSL Certificate

```bash
# Update nginx.conf — replace yourdomain.com with your actual domain

# Start nginx first (HTTP only for certbot challenge)
docker compose up -d nginx

# Issue SSL certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Restart nginx with SSL
docker compose restart nginx
```

---

## Step 4 — Start All Services

```bash
# Build and start all containers
docker compose up -d --build

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Seed initial data (optional)
docker compose exec backend npx prisma db seed

# Check all services are running
docker compose ps

# View logs
docker compose logs -f backend
```

---

## Step 5 — Verify Deployment

```bash
# API health check
curl https://yourdomain.com/api/health

# Expected: { "status": "ok", "timestamp": "..." }
```

---

## Maintenance

```bash
# Update application
cd /var/www/pos
git pull origin main
docker compose down
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy

# Backup database
docker compose exec postgres pg_dump -U posuser posdb > backup_$(date +%Y%m%d).sql

# Auto-renew SSL (add to crontab)
# 0 12 * * * docker compose -f /var/www/pos/docker-compose.yml run --rm certbot renew --quiet && docker compose -f /var/www/pos/docker-compose.yml restart nginx
```
