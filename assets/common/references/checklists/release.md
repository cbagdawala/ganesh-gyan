# Release Readiness Checklist

Use this checklist before deploying to production.

---

## Checklist

### Code Quality

- [ ] All feature branches merged to `main`
- [ ] No merge conflicts
- [ ] `php artisan pint --test` passes (PSR-12)
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] No `dd()`, `dump()`, `var_dump()` in code
- [ ] No `console.log` or `debugger` in Vue files
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] `.env.example` matches `.env` structure
- [ ] No uncommitted changes on `main`

### Testing

- [ ] All tests passing (`./vendor/bin/pest --parallel`)
- [ ] Test coverage > 80% for new code
- [ ] No failing tests in CI
- [ ] Feature tests cover all new endpoints
- [ ] Component tests cover all new Vue components
- [ ] Edge cases tested (empty data, large payloads, invalid input)
- [ ] Race conditions considered (concurrent updates)
- [ ] Test database cleaned between runs

### Database

- [ ] All migrations run on staging (`php artisan migrate --force`)
- [ ] Migrations are backward compatible (no breaking changes)
- [ ] Seeded test data matches production structure
- [ ] Old migrations removed (no stale migrations)
- [ ] Database backup created before deploy
- [ ] Migration tested with production-like data volume
- [ ] Index additions tested for performance impact
- [ ] Schema changes are additive only (no column drops)

### Security

- [ ] `APP_KEY` set; `SANCTUM_STATEFUL_DOMAINS` / `SESSION_DOMAIN` correct for the environment
- [ ] All API endpoints authenticated
- [ ] Authorization policies enforced
- [ ] File uploads validated and scanned
- [ ] Rate limiting configured
- [ ] CORS restricted to frontend domain
- [ ] HTTPS enforced
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)
- [ ] No sensitive data in logs
- [ ] Dependencies updated (`composer audit`, `npm audit`)
- [ ] No known vulnerabilities in dependencies

### Performance

- [ ] No N+1 queries in new code (verified with Telescope/Debugbar)
- [ ] Pagination on all list endpoints
- [ ] Database indexes added for new queries
- [ ] API response size checked (not too large)
- [ ] Page load time < 2s (Lighthouse)
- [ ] Time to Interactive < 5s
- [ ] Images optimized (WebP, lazy-loaded)
- [ ] Assets minified and cached
- [ ] Cache headers set correctly
- [ ] Queue workers tested for heavy operations

### Configuration

- [ ] `.env.production` configured
- [ ] `APP_DEBUG=false` in production
- [ ] `APP_ENV=production` set
- [ ] `APP_URL` set correctly
- [ ] Sanctum config correct (`SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`)
- [ ] Database connection configured
- [ ] Redis/Memcached configured (if used)
- [ ] Queue driver configured (Redis/SQS/Database)
- [ ] Mail driver configured
- [ ] S3/storage driver configured (if used)
- [ ] Third-party API keys configured
- [ ] Analytics/monitoring configured

### Deployment

- [ ] CI/CD pipeline passes
- [ ] Deploy script tested on staging
- [ ] Zero-downtime deployment strategy (blue-green or rolling)
- [ ] Database migrations run as first deploy step
- [ ] Cache cleared after deploy (`php artisan cache:clear`)
- [ ] Config cached (`php artisan config:cache`)
- [ ] Routes cached (`php artisan route:cache`)
- [ ] View compiled (`php artisan view:cache`)
- [ ] Queue workers restarted
- [ ] Frontend assets built (`npm run build`)
- [ ] CDN cache purged (if applicable)
- [ ] SSL certificate valid
- [ ] Domain DNS propagated

### Monitoring

- [ ] Error tracking configured (Sentry, Logtail, etc.)
- [ ] Performance monitoring enabled (New Relic, Datadog, etc.)
- [ ] Uptime monitoring configured
- [ ] Log aggregation configured
- [ ] Alert thresholds set
- [ ] API response time alerts
- [ ] Error rate alerts
- [ ] Queue depth alerts

### Documentation

- [ ] API documentation updated
- [ ] Changelog entry written
- [ ] README updated (if structure changed)
- [ ] Migration guide written (if breaking changes)
- [ ] ADRs updated (if architecture changed)
- [ ] Runbook updated (if operational changes)

### Rollback Plan

- [ ] Rollback procedure documented
- [ ] Previous version available for quick rollback
- [ ] Database rollback migrations ready
- [ ] Backup verified (can be restored)
- [ ] Rollback tested on staging
- [ ] Team notified of maintenance window
- [ ] On-call engineer identified

### Pre-Deploy Verification

- [ ] Staging environment matches production config
- [ ] Smoke tests pass on staging
- [ ] All API endpoints respond correctly
- [ ] Authentication/authorization works
- [ ] File uploads work
- [ ] Email notifications work
- [ ] Queue jobs process correctly
- [ ] Mobile responsive design verified
- [ ] Cross-browser testing done (Chrome, Firefox, Safari, Edge)
- [ ] Accessibility audit passed

### Post-Deploy Verification

- [ ] Health check endpoint responds OK
- [ ] API endpoints return expected responses
- [ ] Frontend loads without errors
- [ ] No increase in error rate
- [ ] Queue processing normally
- [ ] Performance metrics normal
- [ ] Monitoring alerts clear
- [ ] User feedback monitored for 24h

---

## Sign-off

- [ ] Tech lead approved
- [ ] QA tested on staging
- [ ] Product owner approved
- [ ] Security review passed (if required)
- [ ] On-call engineer acknowledged
