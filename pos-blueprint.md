# POS System — Enterprise-Grade Multi-Platform Blueprint

> Production-Ready · AI-Powered · Offline-First · SaaS-Capable
> Stack: NestJS · Next.js · React Native · Electron · PostgreSQL · Prisma · OpenAI · Docker

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Core Modules](#3-core-modules)
4. [AI Capabilities](#4-ai-capabilities)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Desktop App (Electron)](#7-desktop-app-electron)
8. [Mobile App (React Native)](#8-mobile-app-react-native)
9. [Web Admin Panel (Next.js)](#9-web-admin-panel-nextjs)
10. [Offline-First Sync Engine](#10-offline-first-sync-engine)
11. [Security](#11-security)
12. [Deployment (VPS + Docker)](#12-deployment-vps--docker)
13. [Folder Structure](#13-folder-structure)
14. [Development Roadmap](#14-development-roadmap)

---

## 1. Project Overview

### Vision
A **multi-platform, AI-powered POS ecosystem** that operates seamlessly online and offline, scales from a single shop to a multi-branch enterprise, and can be offered as a cloud SaaS product.

### Target Users
- **Retailers** — Supermarkets, boutiques, electronics shops
- **F&B** — Cafes, restaurants, food trucks
- **Enterprises** — Multi-branch chains with centralized management
- **SaaS Buyers** — Businesses subscribing to a hosted POS platform

### Goals
- Operate fully offline with instant sync on reconnection
- AI-assisted billing, forecasting, and fraud detection
- Multi-branch, multi-currency, multi-tax (VAT-ready for GCC)
- Production-deployable on a single VPS with Docker

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │
│  │ Desktop (Elec) │  │ Mobile (RN)    │  │  Web Admin (Next.js)   │ │
│  │ Full POS UI    │  │ Dashboard/Inv  │  │  Analytics / CMS       │ │
│  │ Offline SQLite │  │ AI Insights    │  │  Staff / Reports       │ │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬────────────┘ │
│          │                   │                        │              │
└──────────┼───────────────────┼────────────────────────┼──────────────┘
           │  HTTPS / WSS      │                        │
┌──────────▼───────────────────▼────────────────────────▼──────────────┐
│                    NGINX REVERSE PROXY (SSL)                         │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                    NESTJS BACKEND API (:5000)                        │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │   POS    │ │Inventory │ │ Reports  │ │    AI    │  │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │Customers │ │ Branches │ │   Sync   │ │  Admin   │               │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼────────┐  ┌─────────▼───────┐  ┌─────────▼────────┐
│  PostgreSQL DB  │  │  Redis Cache    │  │   OpenAI API     │
│  (Primary Data) │  │  (Sessions/Q)   │  │  (AI Features)   │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

### Offline Sync Flow
```
Desktop/Mobile
    │
    ├── [ONLINE]  → Direct API calls → PostgreSQL
    │
    └── [OFFLINE] → SQLite (local)
                        │
                    [RECONNECT]
                        │
                    Sync Engine
                        ├── Push local transactions
                        ├── Conflict resolution (last-write-wins / server-wins)
                        └── Pull latest catalog/prices
```

---

## 3. Core Modules

### 3.1 Sales & POS
- Fast touch/keyboard billing interface
- Barcode scanner integration (USB HID + camera)
- Split payments (cash + card + wallet)
- Discount rules (%, fixed, coupon codes)
- VAT calculation (5% UAE, configurable per product/branch)
- Receipt printing (thermal/PDF)
- Hold/park transactions
- Refund and void support

### 3.2 Inventory Management
- Real-time stock tracking per branch/warehouse
- Low-stock alerts (configurable threshold)
- Batch tracking (lot numbers, FIFO/FEFO)
- Expiry date tracking with auto-alerts
- Stock transfer between branches
- Purchase order creation and receiving
- Stocktake / physical inventory count

### 3.3 Customer Management
- Customer profiles (name, phone, email, address)
- Full purchase history
- Loyalty points system (earn on purchase, redeem at POS)
- Customer segments (VIP, Regular, New)
- SMS/email marketing triggers

### 3.4 Accounting & Reports
- Daily/weekly/monthly sales summaries
- Profit & loss per product, category, branch
- Tax reports (VAT-ready, exportable)
- Cash drawer reconciliation
- PDF and Excel export for all reports
- Scheduled email delivery of reports

### 3.5 Multi-Branch Management
- Centralized product catalog
- Branch-level pricing overrides
- Cross-branch stock visibility
- Branch performance comparison dashboard
- Manager-level access per branch

### 3.6 User Roles & Permissions
| Role | Permissions |
|------|------------|
| Super Admin | Full system access, billing, SaaS management |
| Admin | All branches, reports, staff management |
| Manager | Assigned branch, reports, inventory, staff |
| Cashier | POS terminal only, basic reports |
| Inventory | Stock management, purchase orders |

---

## 4. AI Capabilities

### 4.1 Desktop AI Features

**AI-Assisted Billing**
- Auto-detect products from partial name input
- Camera-based barcode/product recognition
- Smart cart completion ("customers who bought X also bought Y")

**Voice-Based Billing**
- Speech-to-text via Web Speech API / Whisper API
- Natural language: "Add 2 Pepsi and 1 large water"
- Cashier-free express checkout mode

**Fraud & Anomaly Detection**
- Flag transactions deviating from cashier's average pattern
- Detect unusual discount applications
- Alert on rapid successive voids/refunds
- Real-time scoring per transaction (0–100 risk score)

**Predictive Stock Alerts**
- ML model predicts stock-out date based on sales velocity
- Alert 3/7/14 days before predicted stock-out
- Auto-generates draft purchase order

### 4.2 Mobile AI Features

**AI Sales Insights Dashboard**
- "Your best day this week was Tuesday — here's why"
- Automated narrative summaries of performance
- Trend arrows with % change vs. prior period

**Demand Forecasting**
- 7/14/30-day sales forecast per product
- Confidence intervals displayed as chart bands
- Based on historical data + seasonal patterns

**Voice Assistant**
- "What were my top 5 products today?"
- "How much cash is in branch 2?"
- Natural language query to SQL via OpenAI

### 4.3 Backend / Cloud AI

**Inventory Optimization**
- Recommended reorder quantities per product
- Optimal stock levels per branch based on demand patterns
- Dead stock identification

**Customer Behavior Analysis**
- RFM scoring (Recency, Frequency, Monetary)
- Churn prediction
- Personalized product recommendations per customer

**Automated Report Generation**
- Natural language summaries generated by GPT-4
- Sent as daily/weekly digest emails
- Example: "Sales dropped 12% on Wednesday — likely due to public holiday"

**AI Chatbot Support**
- Embedded support chat trained on system docs
- Answers staff questions about features
- Escalates to human support if needed

**Natural Language Query**
```
User: "Show me top 10 products by revenue this month in Branch 2"
→ Backend parses with GPT-4 → generates SQL → executes → returns formatted result
```

---

## 5. Database Schema

See `server/prisma/schema.prisma` for full Prisma schema.

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | Staff accounts with roles |
| `branches` | Physical locations / stores |
| `products` | Product catalog |
| `product_variants` | Size, color, unit variants |
| `inventory` | Stock levels per product per branch |
| `sales` | Sale headers (transactions) |
| `sale_items` | Line items per sale |
| `payments` | Payment records per sale |
| `customers` | Customer profiles |
| `loyalty_points` | Points ledger |
| `purchase_orders` | Supplier orders |
| `stock_transfers` | Inter-branch stock moves |
| `sync_logs` | Offline sync tracking |
| `audit_logs` | Security audit trail |
| `devices` | Registered POS terminals |

---

## 6. API Design

### Base URL
```
Production:  https://api.yourdomain.com/v1
Development: http://localhost:5000/v1
```

### Authentication
```
POST   /v1/auth/login              # Email/password login
POST   /v1/auth/refresh            # Refresh JWT
POST   /v1/auth/logout             # Revoke token
POST   /v1/auth/pin                # PIN-based cashier login
GET    /v1/auth/me                 # Current user profile
```

### POS / Sales
```
POST   /v1/sales                   # Create new sale
GET    /v1/sales/:id               # Sale detail
GET    /v1/sales                   # Sales list (paginated, filterable)
POST   /v1/sales/:id/refund        # Refund a sale
POST   /v1/sales/:id/void          # Void a sale
GET    /v1/sales/:id/receipt       # Generate receipt PDF
POST   /v1/sales/hold              # Hold/park a transaction
GET    /v1/sales/held              # List held transactions
```

### Inventory
```
GET    /v1/products                # Product list
POST   /v1/products                # Create product
PUT    /v1/products/:id            # Update product
DELETE /v1/products/:id            # Archive product
GET    /v1/products/search?q=      # Search products (barcode/name)
GET    /v1/inventory               # Stock levels per branch
PUT    /v1/inventory/adjust        # Manual stock adjustment
POST   /v1/inventory/transfer      # Transfer stock between branches
POST   /v1/purchase-orders         # Create purchase order
PUT    /v1/purchase-orders/:id/receive  # Receive stock against PO
```

### Customers
```
GET    /v1/customers               # Customer list
POST   /v1/customers               # Create customer
GET    /v1/customers/:id           # Customer profile + history
PUT    /v1/customers/:id           # Update customer
GET    /v1/customers/:id/loyalty   # Loyalty points balance
POST   /v1/customers/:id/loyalty/redeem  # Redeem points
```

### Reports
```
GET    /v1/reports/sales           # Sales summary (date range, branch)
GET    /v1/reports/profit          # Profit & loss
GET    /v1/reports/tax             # VAT report
GET    /v1/reports/inventory       # Stock valuation report
GET    /v1/reports/cashier         # Cashier performance
GET    /v1/reports/export?type=pdf|excel  # Export report
```

### AI Endpoints
```
POST   /v1/ai/query                # Natural language → data query
GET    /v1/ai/recommendations/:productId  # Product recommendations
GET    /v1/ai/forecast/:productId  # Demand forecast
GET    /v1/ai/anomalies            # Flagged suspicious transactions
POST   /v1/ai/chat                 # AI chatbot message
GET    /v1/ai/insights/daily       # AI-generated daily summary
```

### Sync (Offline)
```
POST   /v1/sync/push               # Push offline transactions
GET    /v1/sync/pull               # Pull updates since timestamp
GET    /v1/sync/catalog            # Full product/price catalog
POST   /v1/sync/resolve            # Resolve sync conflicts
```

### Admin
```
GET    /v1/admin/users             # All staff
POST   /v1/admin/users             # Create staff account
PUT    /v1/admin/users/:id/role    # Change role
GET    /v1/admin/devices           # Registered POS devices
GET    /v1/admin/audit-logs        # Audit trail
GET    /v1/admin/stats             # Platform statistics
```

---

## 7. Desktop App (Electron)

### Tech Stack
- Electron 30+
- React (Vite bundler)
- SQLite (better-sqlite3) for offline
- Tailwind CSS for UI
- Web Serial API for receipt printers
- Web HID API for barcode scanners

### Key Screens
| Screen | Description |
|--------|-------------|
| POS Terminal | Main billing screen, product grid, cart |
| Product Search | Barcode scan + name search |
| Payment Screen | Cash/card/split payment + change calculator |
| Receipt | Print/email/WhatsApp receipt |
| End of Day | Cash drawer count, Z-report |
| Inventory | Quick stock check and adjustment |
| Settings | Printer, scanner, branch config |

### Hardware Integration
```javascript
// Barcode Scanner (USB HID)
navigator.hid.requestDevice({ filters: [{ usagePage: 0x01 }] });

// Receipt Printer (Serial/USB)
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 9600 });
const writer = port.writable.getWriter();
await writer.write(new TextEncoder().encode(receiptData + '\x1B\x69')); // ESC/POS cut
```

---

## 8. Mobile App (React Native)

### Tech Stack
- React Native 0.73+
- Expo (managed workflow)
- Zustand (state)
- React Query (data fetching)
- React Navigation (routing)
- Expo Camera (barcode scanning)

### Key Screens
| Screen | Description |
|--------|-------------|
| Dashboard | Revenue today, sales count, top products |
| Sales Feed | Real-time transaction list |
| Inventory | Stock levels, low stock alerts |
| Customers | Customer search and profiles |
| AI Insights | Demand forecasts, AI summaries |
| Notifications | Alerts, low stock, anomalies |
| Reports | Quick charts for key metrics |
| Settings | Profile, branch, notifications |

---

## 9. Web Admin Panel (Next.js)

### Tech Stack
- Next.js 14 (App Router, SSR)
- Tailwind CSS + shadcn/ui
- Recharts (analytics charts)
- Tanstack Table (data grids)
- React Hook Form + Zod (forms)

### Key Pages
| Page | Route |
|------|-------|
| Dashboard | `/` |
| Sales Analytics | `/analytics/sales` |
| Inventory | `/inventory` |
| Products | `/products` |
| Customers | `/customers` |
| Staff Management | `/staff` |
| Branches | `/branches` |
| Reports | `/reports` |
| AI Insights | `/ai` |
| Settings | `/settings` |
| Audit Logs | `/audit` |

---

## 10. Offline-First Sync Engine

### Strategy
1. **Local SQLite** stores all transactions made offline
2. **Sync Queue** maintains ordered list of unsynced operations
3. On reconnection, **push** queue to server in batches
4. Server applies **conflict resolution** (timestamp-based)
5. **Pull** latest catalog, prices, settings
6. **WebSocket** for real-time updates when online

### Conflict Resolution Rules
| Scenario | Resolution |
|----------|-----------|
| Same sale edited on 2 devices | Server timestamp wins |
| Stock adjusted offline + online | Sum both adjustments |
| Customer edited on 2 devices | Last-write-wins |
| Deleted on server, sold offline | Sale preserved, product marked deleted |

---

## 11. Security

### Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (30 days, stored in HTTP-only cookie)
- PIN-based cashier lock (4-6 digit PIN per session)
- Device registration (only known devices can sync)

### Authorization
- RBAC enforced at API gateway level
- Every route decorated with `@Roles()`
- Branch-level data isolation (managers see only their branch)

### Data Security
- Bcrypt (cost 12) for password hashing
- AES-256 encryption for sensitive customer PII at rest
- All API communication over HTTPS (TLS 1.3)
- Signed sync tokens prevent replay attacks

### Audit Logging
- Every create/update/delete logged with: user, timestamp, IP, before/after values
- Immutable audit log (append-only table)
- Exportable for compliance

### Rate Limiting
- 100 req/15min per IP (global)
- 10 req/15min on auth endpoints
- 1000 req/15min for sync endpoints (trusted devices)

---

## 12. Deployment (VPS + Docker)

### VPS Requirements
- **OS:** Ubuntu 22.04 LTS
- **RAM:** 4GB minimum (8GB recommended)
- **CPU:** 2 vCPU minimum
- **Storage:** 40GB SSD
- **Ports:** 80, 443 open

### Services
| Service | Container | Port |
|---------|-----------|------|
| NestJS API | `pos-backend` | 5000 |
| Next.js Admin | `pos-admin` | 3000 |
| PostgreSQL | `pos-db` | 5432 |
| Redis | `pos-redis` | 6379 |
| Nginx | `pos-nginx` | 80/443 |

### VPS Setup Steps
```bash
# 1. Update server
apt update && apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 3. Install Docker Compose
apt install docker-compose-plugin -y

# 4. Clone repo
git clone https://github.com/yourorg/pos-system.git /var/www/pos
cd /var/www/pos

# 5. Configure environment
cp .env.example .env
nano .env  # Fill in all values

# 6. Start services
docker compose up -d --build

# 7. Run migrations
docker compose exec backend npx prisma migrate deploy

# 8. Issue SSL certificate
docker compose exec nginx certbot --nginx -d yourdomain.com
```

### Domain & SSL
```bash
# Point DNS A record: yourdomain.com → VPS IP
# Point DNS A record: api.yourdomain.com → VPS IP

# Certbot auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 13. Folder Structure

```
pos-system/                          # Monorepo root
├── server/                          # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── dto/
│   │   │   ├── pos/
│   │   │   │   ├── pos.module.ts
│   │   │   │   ├── pos.controller.ts
│   │   │   │   └── pos.service.ts
│   │   │   ├── inventory/
│   │   │   ├── customers/
│   │   │   ├── reports/
│   │   │   ├── ai/
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   └── prompts/
│   │   │   ├── sync/
│   │   │   ├── branches/
│   │   │   └── admin/
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   ├── jwt.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   └── pipes/
│   │   │       └── validation.pipe.ts
│   │   ├── prisma/
│   │   │   └── prisma.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── Dockerfile
│   └── package.json
│
├── client/                          # Next.js Web Admin
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Main dashboard
│   │   │   │   ├── analytics/
│   │   │   │   ├── inventory/
│   │   │   │   ├── products/
│   │   │   │   ├── customers/
│   │   │   │   ├── staff/
│   │   │   │   ├── branches/
│   │   │   │   ├── reports/
│   │   │   │   ├── ai/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── charts/
│   │   │   ├── tables/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── api.ts                # API client
│   │   │   └── utils.ts
│   │   ├── store/                    # Zustand stores
│   │   └── types/
│   ├── Dockerfile
│   └── package.json
│
├── mobile/                          # React Native App
│   ├── src/
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Sales.tsx
│   │   │   ├── Inventory.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── AIInsights.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── store/
│   │   └── navigation/
│   ├── App.tsx
│   └── package.json
│
├── desktop/                         # Electron App
│   ├── src/
│   │   ├── main/                    # Electron main process
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   └── ipc/
│   │   │       ├── printer.ts
│   │   │       └── scanner.ts
│   │   ├── renderer/                # React UI
│   │   │   ├── screens/
│   │   │   │   ├── POS.tsx
│   │   │   │   ├── Payment.tsx
│   │   │   │   ├── Receipt.tsx
│   │   │   │   ├── EndOfDay.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/
│   │   │   └── store/
│   │   └── shared/
│   │       └── db/
│   │           ├── sqlite.ts        # Local SQLite
│   │           └── sync.ts          # Sync engine client
│   ├── electron-builder.json
│   └── package.json
│
├── shared/                          # Shared TypeScript types
│   └── types/
│       ├── pos.types.ts
│       ├── inventory.types.ts
│       ├── user.types.ts
│       └── api.types.ts
│
├── nginx/
│   └── nginx.conf
├── docs/
│   ├── api.md
│   └── deployment.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── package.json                     # Root workspace
```

---

## 14. Development Roadmap

### Phase 1 — Core POS MVP (Weeks 1–8)
- [ ] Project scaffolding (monorepo, Docker, CI/CD)
- [ ] Database schema + Prisma migrations
- [ ] NestJS API: Auth, Products, Sales, Inventory
- [ ] Desktop: POS terminal UI (online mode)
- [ ] Barcode scanner + receipt printer integration
- [ ] Web Admin: Dashboard, product management
- [ ] Basic reports (daily sales, stock levels)
- [ ] Deploy to VPS with SSL

### Phase 2 — Offline + Mobile (Weeks 9–14)
- [ ] SQLite offline database (desktop)
- [ ] Sync engine (push/pull with conflict resolution)
- [ ] React Native mobile app
- [ ] Customer management + loyalty
- [ ] Multi-branch support
- [ ] VAT/tax configuration
- [ ] PDF/Excel report exports
- [ ] Cash drawer reconciliation

### Phase 3 — AI Integration (Weeks 15–20)
- [ ] OpenAI natural language query system
- [ ] AI demand forecasting (per product)
- [ ] Voice billing (Whisper API)
- [ ] Fraud/anomaly detection
- [ ] AI daily/weekly summaries
- [ ] Smart product suggestions at POS
- [ ] Customer behavior analysis (RFM)
- [ ] AI chatbot support

### Phase 4 — SaaS & Scale (Months 6+)
- [ ] Multi-tenant architecture
- [ ] Subscription billing (Stripe)
- [ ] White-label theming
- [ ] Elasticsearch for product search
- [ ] Kubernetes deployment (multi-VPS)
- [ ] Mobile app store release (iOS + Android)
- [ ] Desktop auto-updater (electron-updater)
- [ ] API webhooks for third-party integrations
- [ ] Accounting software integrations (QuickBooks, Xero)

---

*Blueprint Version 1.0 | April 2026*
*Stack: NestJS · Next.js · React Native · Electron · PostgreSQL · Prisma · Redis · OpenAI · Docker*
