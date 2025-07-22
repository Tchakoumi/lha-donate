# Donate Dashboard

A modern dashboard application to track donations, donors, expenses and campaigns for Let’s Help Association. Built with Next.js, TypeScript, shadcn/ui, Recharts, Lucide React, Better‑Auth, PostgreSQL, Elasticsearch, Redis, Docker and Caddy.

---

## Features

- **User & Role Management**
  - Email & Password, OAuth (Google) & WebAuthn via Better‑Auth
  - Super‑admin, President, Vice‑President, Secretary, Finance, Partnerships, Visual Identity
  - Activate/deactivate users, email notifications
  - Full-text search with Elasticsearch

- **Campaigns & Donations**
  - Create & manage donation campaigns (objectives, goals, dates)
  - Register one‑time & recurring donations (MoMo, OM, PayPal…)
  - Auto‑create donor records & index in Elasticsearch

- **Expense Tracking**
  - Submit expenses with images & audit log
  - Stateful approval workflow (pending → validated → disbursed → done)

- **Dashboard & Statistics**
  - Sticky top nav, hero panel, summary cards, data tables
  - Recharts visualizations (bar, line, pie)
  - Aggregated stats by campaign, country, period

- **DevOps & Deployment**
  - Dockerized services (Next.js, Postgres, Elasticsearch, Redis)
  - Caddy reverse‑proxy + auto‑TLS
  - CI/CD via GitHub Actions
  - VPS deployment with Docker Compose

---

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **UI**: React, shadcn/ui, Tailwind CSS, Lucide React
- **Charts**: Recharts
- **Auth & Security**: Better‑Auth (OAuth + WebAuthn), OWASP best practices
- **Database**: PostgreSQL (Prisma ORM)
- **Search**: Elasticsearch
- **Cache & Session**: Redis
- **CI/CD**: GitHub Actions
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Caddy
- **Monitoring**: Prometheus, Grafana, Loki, Sentry
- **Testing**: Jest, React Testing Library, Supertest, Playwright

---

## Prerequisites

- Node.js v18+ & npm
- Docker & Docker Compose
- Ubuntu 20.04+ with Docker installed
- DNS & domain configured for Caddy TLS

---

## Installation & Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-org/donate-dashboard.git
   cd donate-dashboard
2. **Environment variables**
   Create a `.env.local` at project root:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/donate
   REDIS_URL=redis://localhost:6379
   ELASTIC_URL=http://localhost:9200
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   BETTER_AUTH_API_KEY=your_better_auth_key
   SENDGRID_API_KEY=your_sendgrid_key
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Run & develop**
   ```bash
   # start local Postgres, Redis, Elasticsearch via Docker Compose
   docker-compose up -d

   # generate Prisma client & run migrations
   npx prisma migrate dev

   # start dev server
   npm run dev
   ```
   Visit http://localhost:3000.

## Testing
- **Unit & Integration**
   ```bash
   npm run test
   ```
- **E2E (Playwright)**
   ```bash
   npm run test:e2e
   ```

## Deployment

Deployment is automated via **GitHub Actions** with images pushed to **GitHub Container Registry (GHCR)** and deployed to the server via **SSH**.

1. **Automated CI/CD Pipeline**
   - Push to `main` branch triggers GitHub Actions workflow
   - Builds Docker images and pushes to `ghcr.io`
   - Connects to VPS via SSH and deploys updated containers

2. **Setup Requirements**
   ```bash
   # GitHub repository secrets needed:
   GHCR_TOKEN=your_github_personal_access_token
   VPS_HOST=your.server.ip.address
   VPS_USER=your_vps_username
   VPS_SSH_KEY=your_private_ssh_key
   ```

4. **Caddy handles TLS & reverse‑proxy** on ports 80/443.

## Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/awesome`)
3. Commit your branch (`git commit -m "feat: add awesome feature"`)
4. Push to your branch (`git push origin feat/awesome`)
5. Open a Pull Request
---
Built with ❤️ by Tchakoumi Lorrain KOUATCHOUA.