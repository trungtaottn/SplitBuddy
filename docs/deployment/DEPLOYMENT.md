# Deployment Guide

Hướng dẫn deploy SplitBuddy lên production.

**Last Updated:** January 2026

## Architecture Overview

```
                    ┌─────────────────┐
                    │  GitHub Actions │
                    │    (CI/CD)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │ Build & Test       │ Deploy             │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Test Jobs   │  │  Docker Build   │  │   Heroku        │
│ (path-based)  │  │  (5 stages)     │  │  Container      │
└───────────────┘  └─────────────────┘  └─────────────────┘
        │                    │                    │
        │              Push to Registry          │
        │                    ▼                    │
        │          ┌─────────────────┐           │
        │          │   Health Check  │◄──────────┤
        │          └─────────────────┘           │
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Frontend    │  │     Backend     │  │   PostgreSQL    │
│ (Static/CDN)  │  │  (Rust/Axum)    │  │   (Heroku)      │
└───────────────┘  └─────────────────┘  └─────────────────┘
```

## CI/CD Pipeline

### GitHub Actions Workflow

File: `.github/workflows/ci.yml`

#### Jobs

| Job | Trigger | Description |
|-----|---------|-------------|
| `changes` | Always | Detect changed paths for conditional execution |
| `test-backend` | `backend/**` changed | Lint, build, test Rust code |
| `test-frontend` | `frontend/**` changed | Type check, build React app |
| `deploy` | `main` branch only | Build Docker image, push to Heroku |
| `security-scan` | `main` branch | Trivy vulnerability scan (non-blocking) |
| `sync-revert-success` | Deploy success | Sync `revert` branch to current `main` |
| `sync-revert-failure` | Deploy failure | Keep `revert` at previous commit |

#### Key Features

```yaml
# Path filtering - chỉ chạy jobs khi cần
test-backend:
  if: needs.changes.outputs.backend == 'true'

# Concurrency - cancel runs cũ khi có push mới
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Caching - tăng tốc builds
- uses: Swatinem/rust-cache@v2
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

### Docker Build (5 Stages)

```dockerfile
# Stage 1: Frontend Builder
FROM node:20-alpine AS frontend-builder
# npm ci, npm run build

# Stage 2: Cargo Chef Planner
FROM rustlang/rust:nightly-slim AS planner
# cargo chef prepare

# Stage 3: Cargo Chef Cook (Cache Dependencies)
FROM rustlang/rust:nightly-slim AS cacher
# cargo chef cook --release

# Stage 4: Backend Builder
FROM rustlang/rust:nightly-slim AS backend-builder
# cargo build --release

# Stage 5: Runtime (Minimal)
FROM debian:bookworm-slim AS runtime
# Only binary + frontend static files
```

**Lợi ích:**
- ✅ Frontend và Backend build song song
- ✅ Rust dependencies được cache (chỉ rebuild khi Cargo.lock thay đổi)
- ✅ Runtime image nhỏ gọn (~100MB)

## Heroku Deployment

### Prerequisites

- Heroku account
- Heroku CLI installed
- GitHub repository connected

### Environment Variables

Set trong Heroku Dashboard → Settings → Config Vars:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-set by Heroku Postgres addon |
| `JWT_SECRET` | Strong random string |
| `RUST_LOG` | `info` (production) |
| `HOST` | `0.0.0.0` |
| `PORT` | Auto-set by Heroku |
| `GEMINI_API_KEY` | (Optional) Google Gemini API key |

### GitHub Secrets

Set trong GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `HEROKU_API_KEY` | Heroku API key (từ Account Settings) |
| `HEROKU_APP_NAME` | Tên Heroku app |

### Deployment Flow

```
dev branch
    │
    │ (PR + CI pass)
    ▼
main branch
    │
    │ (GitHub Actions CI/CD)
    ▼
┌─────────────────────────────────────────────┐
│ 1. Detect changes (path filtering)          │
│ 2. Run test-backend (if backend changed)    │
│ 3. Run test-frontend (if frontend changed)  │
│ 4. Build Docker image (5-stage)             │
│ 5. Push to Heroku Container Registry        │
│ 6. Release (heroku container:release)       │
│ 7. Health check verification                │
│ 8. Sync revert branch                       │
└─────────────────────────────────────────────┘
    │
    ▼
Heroku Production (https://your-app.herokuapp.com)
```

### Health Check Endpoint

```bash
# Backend health endpoint
GET /api/health

# Response (200 OK)
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-01-09T10:00:00Z"
}
```

CI/CD sẽ verify deployment bằng cách gọi endpoint này sau khi release.

## Revert Branch Strategy

### Automatic Sync

```
Deploy thành công → revert = main (current commit)
Deploy thất bại  → revert = main~1 (previous commit)
```

### Manual Rollback

```bash
# Xem commit trên revert branch
git log origin/revert -1

# Rollback main về revert
git checkout main
git reset --hard origin/revert
git push origin main --force
```

## Manual Deployment

### Emergency Deploy

```bash
# Login to Heroku
heroku login

# Push Docker image
heroku container:push web -a YOUR_APP_NAME

# Release
heroku container:release web -a YOUR_APP_NAME
```

### Deploy from dev branch

```bash
# Deploy dev to Heroku (for testing)
git push heroku dev:main
```

## Docker Deployment (Self-hosted)

### Build Image

```bash
# Build
docker build -t splitbuddy:latest .

# Run locally
docker run -p 8080:8080 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  splitbuddy:latest
```

### Docker Compose (Production)

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

## Database

### Heroku Postgres

```bash
# Add Postgres addon
heroku addons:create heroku-postgresql:mini

# Check database info
heroku pg:info

# Run migrations (sau khi app deploy)
# Migrations tự động chạy khi app start
```

### Backup & Restore

```bash
# Create backup
heroku pg:backups:capture

# Download backup
heroku pg:backups:download

# Restore
heroku pg:backups:restore
```

## Monitoring

### Logs

```bash
# View live logs
heroku logs --tail

# Filter by dyno
heroku logs --tail --dyno web

# View recent errors
heroku logs --tail | grep -i error
```

### Metrics

- Heroku Dashboard → Metrics
- Response time, throughput, errors
- Memory and CPU usage

### Health Check

```bash
# Check app health
curl https://your-app.herokuapp.com/api/health

# Expected response
{"status": "ok", "version": "1.0.0", ...}
```

## Troubleshooting

### App crashes on startup

```bash
# Check logs
heroku logs --tail -n 200

# Common causes:
# - Missing env vars (DATABASE_URL, JWT_SECRET)
# - Database connection failed
# - Port binding issue (phải dùng $PORT từ env)
```

### Docker build fails

```bash
# Build locally để test
docker build -t splitbuddy-test .

# Check specific stage
docker build --target backend-builder -t splitbuddy-backend .

# Common issues:
# - Cargo.lock v4 cần Rust nightly
# - Missing .sqlx folder
# - Build tools missing (curl, build-essential)
```

### CI/CD fails

```bash
# Check GitHub Actions logs
gh run list
gh run view <run-id>

# Re-run failed job
gh run rerun <run-id>

# Check path filter
# Đảm bảo dorny/paths-filter có permissions: pull-requests: read
```

### Deploy not updating

```bash
# Kiểm tra Heroku releases
heroku releases

# Force release
heroku container:release web -a YOUR_APP_NAME

# Restart dynos
heroku restart
```

## Security Checklist

- [x] JWT_SECRET is strong and unique
- [x] DATABASE_URL uses SSL
- [x] CORS configured correctly
- [x] Rate limiting enabled (Heroku built-in)
- [x] Input validation on all endpoints
- [x] SQL injection prevention (SQLx parameterized queries)
- [x] XSS prevention (React handles this)
- [x] HTTPS enforced (Heroku auto-redirect)
- [x] Security scanning with Trivy (non-blocking)

## Cost Optimization

### Heroku Pricing

| Resource | Plan | Cost |
|----------|------|------|
| Dyno | Eco | $5/month |
| Postgres | Mini | $5/month |
| **Total** | | **$10/month** |

### Tips

- Use Eco dynos for low traffic
- Scale down during off-peak
- Optimize database queries
- Use Docker layer caching

## Scaling

### Horizontal Scaling

```bash
# Scale web dynos
heroku ps:scale web=2
```

### Vertical Scaling

```bash
# Upgrade dyno type
heroku ps:type web=standard-1x
```

## Maintenance

### Regular Tasks

- [ ] Weekly: Review error logs
- [ ] Weekly: Check GitHub Actions runs
- [ ] Monthly: Database maintenance
- [ ] Monthly: Security updates (cargo update, npm update)
- [ ] Quarterly: Performance review

### Database Maintenance

```bash
# Vacuum database
heroku pg:vacuum

# Analyze tables
heroku pg:diagnose
```

### Dependency Updates

```bash
# Backend
cd backend
cargo update
cargo sqlx prepare
git add Cargo.lock .sqlx/

# Frontend
cd frontend
npm update
git add package-lock.json
```
