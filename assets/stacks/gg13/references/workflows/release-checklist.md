# Release Checklist

## When to Use

Before deploying to staging or production. Covers migrations, tests, environment variables, secrets, and documentation.

## Prerequisites

- All feature development complete
- All tests passing locally
- Code reviewed and approved
- Version bump decided

## Pre-Release Checklist

### 1. Code Quality

- [ ] All tests passing (`php artisan test` with 0 failures)
- [ ] No pending linting errors (`composer run lint`)
- [ ] No pending formatting issues (`composer run format:check`)
- [ ] No `dd()`, `dump()`, or `var_dump()` in code
- [ ] No `console.log()` or `alert()` in Vue components
- [ ] No commented-out code blocks
- [ ] No TODO/FIXME without ticket reference
- [ ] All files use proper line endings (LF)

### 2. Database Migrations

- [ ] All migrations run successfully (`php artisan migrate --force`)
- [ ] Migrations are idempotent (can be re-run safely)
- [ ] Data migrations include rollback logic
- [ ] Migration files are named with timestamps
- [ ] No raw SQL in migrations (use schema builder)
- [ ] Foreign keys defined correctly
- [ ] Indexes added for new queried columns
- [ ] Migration tested on a fresh database

```bash
# Test migration on fresh database
php artisan migrate:fresh
php artisan test
```

### 3. Environment Variables

- [ ] All new env vars documented in `.env.example`
- [ ] `.env` not committed to version control
- [ ] Required env vars have sensible defaults
- [ ] Secret values stored in environment, not code
- [ ] API keys rotated before release
- [ ] Database credentials not in code
- [ ] `APP_KEY` generated; `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN` set for production

**.env.example additions:**
```
NEW_FEATURE_ENABLED=false
API_RATE_LIMIT=60
CACHE_STORE=redis
QUEUE_CONNECTION=redis
```

### 4. Secrets Management

- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No private keys in code
- [ ] `.gitignore` includes `.env`, `storage/*.key`, `vendor/`
- [ ] Secrets rotated before production deploy
- [ ] AWS/GCP/Azure credentials not in code
- [ ] Third-party API keys not hardcoded

### 5. Configuration

- [ ] `config/app.php` version updated
- [ ] `config/database.php` production settings verified
- [ ] `config/cache.php` production cache driver set
- [ ] `config/queue.php` production queue driver set
- [ ] `config/mail.php` production SMTP settings
- [ ] `config/filesystems.php` S3/cloud storage configured
- [ ] CORS configured for production domains
- [ ] Rate limiting configured

### 6. Testing

- [ ] All Pest tests passing
- [ ] Feature tests passing
- [ ] No skipped tests without justification
- [ ] Tests cover new functionality
- [ ] Edge cases tested
- [ ] Error paths tested
- [ ] Test coverage report generated

```bash
# Run full test suite
php artisan test --coverage

# Check coverage
php artisan test --coverage=clover
```

### 7. Documentation

- [ ] API documentation updated
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)
- [ ] Code comments updated
- [ ] Database schema documented
- [ ] New endpoints documented

### 8. Performance

- [ ] No N+1 queries (checked with query detector)
- [ ] Database indexes added for new queries
- [ ] Cache configured for expensive queries
- [ ] Queue jobs for heavy operations
- [ ] Image optimization applied
- [ ] Response size reasonable

### 9. Security

- [ ] Input validation on all endpoints
- [ ] Authorization enforced
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] File upload validation
- [ ] XSS prevention in Vue templates

### 10. Deployment

- [ ] Deployment script/tested
- [ ] Database backup configured
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Error tracking (Sentry/Loggly) configured
- [ ] Health check endpoint available
- [ ] Logging configured for production

## Post-Release Checklist

- [ ] All tests pass on staging
- [ ] Smoke tests pass in production
- [ ] Error tracking shows no new errors
- [ ] Performance metrics stable
- [ ] Users can access all features
- [ ] API responses correct
- [ ] Database queries performing well

## Artisan Commands Reference

```bash
# Run tests
php artisan test
php artisan test --coverage

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Check environment
php artisan about
php artisan env

# Version check
php artisan --version
```

## Verification Checklist

- [ ] All tests passing (0 failures)
- [ ] Migrations tested on fresh database
- [ ] .env.example matches .env
- [ ] No secrets in code
- [ ] Configuration verified for production
- [ ] Documentation updated
- [ ] Performance verified
- [ ] Security scan passed
- [ ] Deployment script tested
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Release notes written
- [ ] Team notified of release
