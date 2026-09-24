# Validation Standards

## Form Request Classes

All API endpoints must use Form Request classes. Never validate directly in controllers.

```php
// app/Http/Requests/Api/StoreUserRequest.php
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'max:255',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
            'role' => ['required', 'string', Rule::enum(UserRole::class)],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.min' => 'Name must be at least 2 characters.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'avatar.max' => 'Avatar must not exceed 2MB.',
        ];
    }
}
```

## Validation Error Format

All validation errors follow a standard structure:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "email": [
        "The email has already been taken."
      ],
      "password": [
        "The password must contain at least one uppercase letter.",
        "The password must contain at least one number."
      ]
    },
    "reference": "req_abc123"
  }
}
```

## Custom Validation Rules

Place in `app/Rules/`:

The `Rule` interface (`passes()` / `message()`) was removed in Laravel 10+.
Implement `Illuminate\Contracts\Validation\ValidationRule` with a single
`validate()` method that reports failures through the `$fail` closure:

```php
// app/Rules/StrongPassword.php
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    public function __construct(
        private readonly array $requirements = ['lowercase', 'uppercase', 'numbers'],
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $missing = [];

        if (in_array('lowercase', $this->requirements, true) && ! preg_match('/[a-z]/', (string) $value)) {
            $missing[] = 'one lowercase letter';
        }
        if (in_array('uppercase', $this->requirements, true) && ! preg_match('/[A-Z]/', (string) $value)) {
            $missing[] = 'one uppercase letter';
        }
        if (in_array('numbers', $this->requirements, true) && ! preg_match('/[0-9]/', (string) $value)) {
            $missing[] = 'one number';
        }
        if (in_array('symbols', $this->requirements, true) && ! preg_match('/[^a-zA-Z0-9]/', (string) $value)) {
            $missing[] = 'one symbol';
        }

        if ($missing !== []) {
            $fail('The :attribute must contain at least ' . implode(', ', $missing) . '.');
        }
    }
}
```

> For standard password strength, prefer the built-in
> `Illuminate\Validation\Rules\Password` rule
> (`Password::min(8)->mixedCase()->numbers()->symbols()`) over a custom rule.

Use in Form Request:

```php
'password' => ['required', 'string', 'min:8', new StrongPassword()],
```

## Field-Level vs Form-Level Errors

### Field-Level Errors

Per-field validation failures (most common). Laravel Form Requests return these automatically:

```json
{
  "details": {
    "email": ["The email has already been taken."]
  }
}
```

### Form-Level Errors

Errors that relate to the entire form, not a single field. Return with empty key or use `__form`:

```json
{
  "details": {
    "__form": [
      "The selected combination of coupon and product is not valid."
    ]
  }
}
```

Or use a non-field key:

```json
{
  "details": {
    "credentials": [
      "The provided email or password is incorrect."
    ]
  }
}
```

## Client-Side Validation (Vue)

### Schema-Based Validation

Use a validation library (e.g., `vee-validate` with `zod` or `yup`) for form validation:

```typescript
// resources/js/validations/userValidation.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Must be a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  password_confirmation: z.string(),
  role: z.enum(['admin', 'moderator', 'user']),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export type CreateUserFormData = z.infer<typeof createUserSchema>
```

### Using with vee-validate

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createUserSchema, type CreateUserFormData } from '@/validations/userValidation'

const { handleSubmit, isSubmitting, errors } = useForm({
  validationSchema: toTypedSchema(createUserSchema),
})

const onSubmit = handleSubmit(async (values: CreateUserFormData) => {
  await userStore.createUser(values)
  router.push({ name: 'users' })
})
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div>
      <label for="name">Name</label>
      <InputText
        id="name"
        v-model="values.name"
        :class="{ 'p-invalid': errors.name }"
      />
      <Message v-if="errors.name" severity="error" size="small" :text="errors.name" />
    </div>
    <!-- ... more fields ... -->
    <Button type="submit" label="Create User" :disabled="isSubmitting" />
  </form>
</template>
```

### Handling Server Validation Errors

When server returns validation errors, sync them to the form:

```typescript
async function handleSubmit(values: CreateUserFormData) {
  try {
    await userStore.createUser(values)
    router.push({ name: 'users' })
  } catch (error) {
    if (error.response?.status === 422) {
      const details = error.response.data.error.details
      for (const [field, messages] of Object.entries(details)) {
        if (field !== '__form') {
          form.setFieldError(field, Array.isArray(messages) ? messages[0] : messages)
        }
      }
    }
  }
}
```

## Rule of Thumb

- **Always** validate on the backend with Form Requests (never trust frontend validation)
- **Always** validate on the frontend for better UX (but treat it as enhancement, not security)
- Use Laravel's built-in rules when possible
- Create custom Rule classes for complex business logic validation
- Provide human-readable error messages in the `messages()` method
