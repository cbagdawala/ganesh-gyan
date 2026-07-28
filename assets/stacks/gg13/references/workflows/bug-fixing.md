# Bug Fixing

## When to Use

When encountering a bug, test failure, or unexpected behavior. Systematic approach to reproduction, analysis, isolation, fix, and verification.

## Prerequisites

- Laravel 13 project running
- Pest tests available
- Logging configured
- Access to logs and error tracking

## Step-by-Step Workflow

### 1. Reproduce the Bug

**Document the bug:**
- What is happening vs. what should happen
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs if available

**Reproduce in a consistent environment:**
```bash
# Ensure fresh state
php artisan migrate:fresh --seed
php artisan config:clear
php artisan cache:clear

# Reproduce the issue
curl -X POST http://localhost:8000/api/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"field": "value"}'
```

### 2. Analyze Logs

**Check Laravel logs:**
```bash
tail -f storage/logs/laravel.log
grep -i "error" storage/logs/laravel.log
grep -i "exception" storage/logs/laravel.log
```

**Check PHP error logs:**
```bash
# On Linux/Mac
tail -f /var/log/php-fpm/error.log

# On Windows (XAMPP)
tail -f C:\xampp\php\logs\php_error.log
```

**Use Telescope for request analysis:**
```bash
php artisan telescope:install
# Visit http://localhost:8000/telescope
```

### 3. Isolate the Problem

**Narrow down the source:**
```bash
# Check if it's a controller, model, or middleware issue
# Add strategic logging
logger()->info('Method called', ['params' => $params]);
logger()->info('Query executed', ['sql' => $query->toSql()]);

# Check database state
DB::enableQueryLog();
$items = Item::all();
dd(DB::getQueryLog());
```

**Create a minimal reproduction test:**
```php
// tests/Feature/BugReproductionTest.php
it('reproduces the bug', function () {
    // Minimal steps to trigger bug
    $response = $this->postJson('/api/items', [
        'name' => 'test',
    ]);

    // Should fail before fix
    $response->assertStatus(201);
});
```

### 4. Identify Root Cause

**Common bug sources:**
- Missing validation rules
- Incorrect relationship queries
- Timezone issues
- Migration not run
- Wrong data type casting
- Authorization bypass
- Race conditions
- Memory leaks

**Debug with dd() strategically:**
```php
dd($request->all()); // Check input
dd($model->toArray()); // Check model state
dd($query->toSql(), $query->getBindings()); // Check SQL
dd($validated); // Check validated data
```

### 5. Implement Fix

**Write the test first (TDD approach):**
```php
it('handles the bug scenario', function () {
    // Set up data that triggers bug
    $item = Item::create(['name' => '']);

    // Fix should make this pass
    $response = $this->putJson("/api/items/{$item->id}", [
        'name' => 'updated',
    ]);

    $response->assertSuccessful();
});
```

**Implement minimal fix:**
- Fix the smallest possible change
- Don't introduce new features
- Consider edge cases

### 6. Test the Fix

```bash
# Run the reproduction test
php artisan test tests/Feature/BugReproductionTest.php

# Run full test suite
php artisan test

# Check for regressions
php artisan test --filter=<Resource>
```

### 7. Verify in Browser/API

```bash
# Test the fix manually
curl -X PUT http://localhost:8000/api/items/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "fixed"}'
```

## Artisan Commands Reference

```bash
# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Check logs
tail -f storage/logs/laravel.log

# Run tests
php artisan test
php artisan test --filter=<Resource>
php artisan test --coverage

# Debug
php artisan tinker
>>> Item::find(1)->toArray()
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `tests/Feature/BugReproductionTest.php` | Reproduction test |
| `app/Http/Controllers/*.php` | Controller fix |
| `app/Models/*.php` | Model fix |
| `database/migrations/*.php` | Migration fix |
| `resources/js/Pages/*.vue` | Frontend fix |

## Verification Checklist

- [ ] Bug reproduced consistently
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Reproduction test passes
- [ ] All existing tests pass
- [ ] No regressions introduced
- [ ] Fix verified in browser/API
- [ ] Logs show no errors
- [ ] Performance not degraded
- [ ] Security not compromised
