# Add New Field to Existing Resource

## When to Use

When you need to add a new field to an existing resource in the application. This covers database changes through to the Vue form and API layer.

## Prerequisites

- Existing module with database table, model, controller, and Vue page
- Migration system configured
- Database backed up before running migrations in production
- Understanding of the data type needed (string, integer, boolean, date, JSON, etc.)

## Step-by-Step Workflow

### 1. Create Migration to Add Field

```bash
php artisan make:migration add_<field>_to_<table>_table --table=<table>
```

```php
Schema::table('<table>', function (Blueprint $table) {
    $table->string('<field>', 255)->nullable()->after('<previous_field>');
});
```

- Use `after()` to control column position
- Use `nullable()` if existing rows should not require a value
- Use `default()` for default values
- Use `index()` for single-column indexes
- Use `foreign()` for foreign key constraints

### 2. Update Model

In `app/Models/<Model>.php`:

- Add field to `$fillable` array
- Add to `$casts` if it needs type casting (bool, int, float, array, json, date, datetime)
- Add to `$hidden` if sensitive (e.g., temporary tokens)
- Add accessors/mutators if needed

```php
protected $fillable = [
    // existing fields...
    '<new_field>',
];

protected $casts = [
    // existing casts...
    '<new_field>' => 'boolean',
];

// Optional accessor
public function get<UpperField>Attribute(): string
{
    // transform before returning
}
```

### 3. Update Validation

In `app/Http/Requests/Store<Model>Request.php` and `Update<Model>Request.php`:

```php
public function rules(): array
{
    return [
        // existing rules...
        '<new_field>' => 'required|string|max:255',
    ];
}
```

Update rules based on field type:
- Strings: `string`, `max:255`, `min:3`
- Integers: `integer`, `min:0`, `max:100`
- Booleans: `boolean`
- Emails: `email`
- URLs: `url`
- Dates: `date`, `date_format:Y-m-d`
- Foreign keys: `exists:table,column`
- JSON: `array`, `json`

### 4. Update Resource/Transformer

In `app/Http/Resources/<Model>Resource.php`:

```php
public function toArray(Request $request): array
{
    return [
        // existing fields...
        '<new_field>' => $this-><new_field>,
    ];
}
```

### 5. Update API Controller

In `app/Http/Controllers/<Model>Controller.php`:
- `index()` - add field to query scope/filter if it's filterable
- `store()` - field is handled by Form Request validation
- `update()` - field is handled by Form Request validation
- `show()` - field is automatically included via Resource

### 6. Update Vue Form Component

In `resources/js/Pages/<Model>/Create.vue` or `Edit.vue`:

```vue
<AutoComplete
    v-model="form.<new_field>"
    :field-label="'<Field Label>'"
    :required="true"
/>
```

- Map field to form data object
- Add to form validation if using client-side validation
- Add to `data()` or `useState()`

### 7. Update Vue List/Table Component

In `resources/js/Pages/<Model>/List.vue`:

```vue
<Column field="<new_field>" header="<Field Label>" sortable filterable />
```

- Add column to DataTable
- Apply appropriate formatter (date, boolean badge, etc.)
- Add filter if needed

### 8. Run Migration

```bash
php artisan migrate
```

## Artisan Commands Reference

```bash
php artisan make:migration add_<field>_to_<table>_table --table=<table>
php artisan migrate
php artisan route:list --path=api/<resource>
php artisan test --filter=<Model>
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `database/migrations/*_<field>_to_<table>_table.php` | Create | Schema change |
| `app/Models/<Model>.php` | Modify | Fillable, casts |
| `app/Http/Requests/Store<Model>Request.php` | Modify | Validation rules |
| `app/Http/Requests/Update<Model>Request.php` | Modify | Validation rules |
| `app/Http/Resources/<Model>Resource.php` | Modify | Include in response |
| `resources/js/Pages/<Model>/Create.vue` | Modify | Add form field |
| `resources/js/Pages/<Model>/Edit.vue` | Modify | Add form field |
| `resources/js/Pages/<Model>/List.vue` | Modify | Add table column |
| `resources/js/Pages/<Model>/Show.vue` | Modify | Add detail field |

## Testing

```bash
# Test the new field via API
php artisan test --filter=<Model>Api

# Test validation still works
php artisan test --filter=<Model>Test

# Test with new field present
php artisan test tests/Feature/<Model>Test.php::test_create_with_new_field
```

## Verification Checklist

- [ ] Migration runs without errors
- [ ] New field appears in database schema (`DESCRIBE <table>`)
- [ ] Model `$fillable` includes new field
- [ ] Validation accepts valid data, rejects invalid data
- [ ] API response includes new field
- [ ] Vue form submits new field
- [ ] Vue table displays new field
- [ ] Existing records have nullable/default values
- [ ] All existing tests still pass
- [ ] New field appears in API documentation
