# Deployment Guide

Hướng dẫn deploy SplitBuddy lên production.

## Architecture Overview

```
                    ┌─────────────────┐
                    │     Heroku      │
                    │   (Container)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Frontend    │  │     Backend     │  │   PostgreSQL    │
│ (Static/CDN)  │  │  (Rust/Axum)    │  │   (Heroku)      │
└───────────────┘  └─────────────────┘  └─────────────────┘
```

## Heroku Deployment

### Prerequisites

- Heroku account
- Heroku CLI installed
- Git repository connected

### Environment Variables

Set these in Heroku Dashboard → Settings → Config Vars:

```
DATABASE_URL          # Auto-set by Heroku Postgres addon
JWT_SECRET            # Strong random string
RUST_LOG              # info (production) or debug
HOST                  # 0.0.0.0
PORT                  # Auto-set by Heroku
```

### Deployment Flow

```
dev branch
    │
    │ (PR + CI pass)
    ▼
main branch
    │
    │ (auto-deploy)
    ▼
Heroku Production
```

### CI/CD Pipeline

The project uses GitHub Actions for CI:

```yaml
# .github/workflows/ci.yml
on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]

jobs:
  frontend:
    - npm install
    - npm run build
    
  backend:
    - cargo check
    - cargo test
```

### Manual Deployment

```bash
# Login to Heroku
heroku login

# Add Heroku remote (if not already)
heroku git:remote -a splitbuddy

# Deploy
git push heroku main
```

### Deploy from dev branch

```bash
# Deploy dev to Heroku (for testing)
git push heroku dev:main
```

## Docker Deployment

### Build Image

```bash
# Build backend
docker build -t splitbuddy-backend .

# Run locally
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  splitbuddy-backend
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

# Run migrations
heroku run "cd backend && sqlx migrate run"
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

### Database Migrations

```bash
# Run migrations on Heroku
heroku run bash
cd backend
sqlx migrate run
exit
```

## Monitoring

### Logs

```bash
# View live logs
heroku logs --tail

# Filter by dyno
heroku logs --tail --dyno web
```

### Metrics

- Heroku Dashboard → Metrics
- Response time, throughput, errors
- Memory and CPU usage

### Health Check

```bash
# Backend health
curl https://splitbuddy.herokuapp.com/health

# Expected response
{"status": "healthy"}
```

## Troubleshooting

### App crashes on startup

```bash
# Check logs
heroku logs --tail -n 200

# Common causes:
# - Missing env vars
# - Database connection failed
# - Port binding issue
```

### Database connection errors

```bash
# Verify DATABASE_URL
heroku config:get DATABASE_URL

# Check Postgres status
heroku pg:info

# Restart database
heroku pg:restart
```

### Slow performance

- Check dyno metrics
- Review database queries (N+1 problem)
- Consider upgrading dyno type
- Enable caching

### Out of memory

```bash
# Check memory usage
heroku logs --tail | grep Memory

# Solutions:
# - Optimize code
# - Upgrade dyno
# - Add swap
```

## Rollback

```bash
# List releases
heroku releases

# Rollback to previous
heroku rollback

# Rollback to specific version
heroku rollback v42
```

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] DATABASE_URL uses SSL
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (SQLx parameterized queries)
- [ ] XSS prevention (React handles this)
- [ ] HTTPS enforced

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
- Use connection pooling

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
- [ ] Monthly: Database maintenance
- [ ] Monthly: Security updates
- [ ] Quarterly: Performance review

### Database Maintenance

```bash
# Vacuum database
heroku pg:vacuum

# Analyze tables
heroku pg:diagnose
```
