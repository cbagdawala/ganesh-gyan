# Release Readiness Checklist

Use this checklist before deploying to production. The exact commands for each step (formatter, linters, test runner, cache warm-up, asset build) are in your stack pack's `references/rules/` and deploy workflow.

---

## Checklist

### Code Quality

- [ ] All feature branches merged to `main`
- [ ] No merge conflicts
- [ ] Backend formatter / style check passes
- [ ] Frontend linter passes
- [ ] Type checking / static analysis passes (if the stack uses it)
- [ ] No debug dumps or leftover debugging output in backend code
- [ ] No console logging or debugger statements in frontend code
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Example environment file matches the real environment file's keys
- [ ] No uncommitted changes on `main`

### Testing

- [ ] All tests passing (full suite, in parallel if supported)
- [ ] Test coverage > 80% for new code
- [ ] No failing tests in CI
- [ ] Feature / integration tests cover all new endpoints
- [ ] Component tests cover all new UI components
- [ ] Edge cases tested (empty data, large payloads, invalid input)
- [ ] Race conditions considered (concurrent updates)
- [ ] Test database cleaned between runs

### Database

- [ ] All migrations run on staging (non-interactive / forced mode)
- [ ] Migrations are backward compatible (no breaking changes)
- [ ] Seeded test data matches production structure
- [ ] Old migrations removed (no stale migrations)
- [ ] Database backup created before deploy
- [ ] Migration tested with production-like data volume
- [ ] Index additions tested for performance impact
- [ ] Schema changes are additive only (no column drops)

### Security

- [ ] Application encryption key set; session / cookie domains correct for the environment
- [ ] All API endpoints authenticated
- [ ] Authorization policies enforced
- [ ] File uploads validated and scanned
- [ ] Rate limiting configured
- [ ] CORS restricted to frontend domain
- [ ] HTTPS enforced
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)
- [ ] No sensitive data in logs
- [ ] Dependencies audited with each package manager's audit command
- [ ] No known vulnerabilities in dependencies

### Performance

- [ ] No N+1 queries in new code (verified with the stack's query profiler / debug toolbar)
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

- [ ] Production environment file configured
- [ ] Debug mode disabled in production
- [ ] Environment set to production
- [ ] Application base URL set correctly
- [ ] Authentication / session config correct (trusted domains, cookie domain, secure cookies)
- [ ] Database connection configured
- [ ] Cache store configured (if used)
- [ ] Queue driver configured
- [ ] Mail driver configured
- [ ] Object / file storage configured (if used)
- [ ] Third-party API keys configured
- [ ] Analytics/monitoring configured

### Deployment

- [ ] CI/CD pipeline passes
- [ ] Deploy script tested on staging
- [ ] Zero-downtime deployment strategy (blue-green or rolling)
- [ ] Database migrations run as first deploy step
- [ ] Application cache cleared after deploy
- [ ] Configuration cached (if the framework supports it)
- [ ] Routes cached (if the framework supports it)
- [ ] Templates / views precompiled (if the framework supports it)
- [ ] Queue workers restarted
- [ ] Frontend assets built for production
- [ ] CDN cache purged (if applicable)
- [ ] SSL certificate valid
- [ ] Domain DNS propagated

### Monitoring

- [ ] Error tracking configured (Sentry, Logtail, etc.)
- [ ] Performance monitoring enabled (New Relic, Datadog, etc.)
- [ ] Uptime monitoring configured
- [ ] Log aggregation configured (see `references/principles/logging.md`)
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
