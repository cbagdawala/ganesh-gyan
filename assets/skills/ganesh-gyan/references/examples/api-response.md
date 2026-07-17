# API Response Examples

Standardized API response formats used across the Laravel 13 + Vue 3 application.

---

## Context

- **Framework**: Laravel 13 (resource controllers)
- **Frontend**: Vue 3 (Pinia stores, axios instances)
- **Auth**: Laravel Sanctum
- **Testing**: Pest

---

## Response Helper (app/Http/Resources/Responses/ApiResponse.php)

```php
<?php

namespace App\Http\Resources\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    public static function success(string $message = 'Success', mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    public static function created(string $message = 'Created', mixed $data = null): JsonResponse
    {
        return static::success($message, $data, 201);
    }

    public static function deleted(string $message = 'Deleted'): JsonResponse
    {
        // A 204 has no body, so a message would never reach the client.
        // Return 200 with the standard envelope instead.
        return response()->json([
            'success' => true,
            'message' => $message,
        ], 200);
    }

    public static function error(string $message = 'Error', int $status = 500, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], $status);
    }

    public static function unauthorized(string $message = 'Unauthorized'): JsonResponse
    {
        return static::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): JsonResponse
    {
        return static::error($message, 403);
    }

    public static function notFound(string $message = 'Not Found'): JsonResponse
    {
        return static::error($message, 404);
    }

    public static function validationErrors(array $errors, string $message = 'Validation Error'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], 422);
    }

    public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return static::success($message, [
            'data'    => $paginator->items(),
            'meta'    => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
            'links'   => [
                'first' => $paginator->url(1),
                'last'  => $paginator->url($paginator->lastPage()),
                'prev'  => $paginator->previousPageUrl(),
                'next'  => $paginator->nextPageUrl(),
            ],
        ]);
    }
}
```

---

## Success Response (200 OK)

```json
{
    "success": true,
    "message": "Products retrieved successfully",
    "data": {
        "data": [
            {
                "id": 1,
                "name": "Wireless Mouse",
                "sku": "WM-001",
                "price": 29.99,
                "stock_quantity": 150,
                "status": "active",
                "category": {
                    "id": 3,
                    "name": "Electronics"
                }
            }
        ],
        "meta": {
            "current_page": 1,
            "last_page": 12,
            "per_page": 15,
            "total": 173,
            "from": 1,
            "to": 15
        },
        "links": {
            "first": "http://localhost/api/products?page=1",
            "last": "http://localhost/api/products?page=12",
            "prev": null,
            "next": "http://localhost/api/products?page=2"
        }
    }
}
```

---

## Created Response (201 Created)

```json
{
    "success": true,
    "message": "Product created successfully",
    "data": {
        "id": 42,
        "name": "Mechanical Keyboard",
        "sku": "MK-100",
        "price": 89.99,
        "stock_quantity": 0,
        "status": "active",
        "created_at": "2026-07-16T10:30:00.000000Z",
        "updated_at": "2026-07-16T10:30:00.000000Z"
    }
}
```

---

## Deleted Response (200 OK)

A successful delete returns 200 with the standard envelope. (A 204 has no body, so the
`message` would never reach the client — use 200 when you want to send a confirmation.)

```json
{
    "success": true,
    "message": "Product deleted successfully"
}
```

---

## Validation Error Response (422 Unprocessable Entity)

```json
{
    "success": false,
    "message": "Validation Error",
    "errors": {
        "name": [
            "The name field is required."
        ],
        "sku": [
            "The sku field is required.",
            "The sku has already been taken."
        ],
        "price": [
            "The price must be a positive number."
        ]
    }
}
```

---

## Authorization Error (403 Forbidden)

```json
{
    "success": false,
    "message": "You do not have permission to perform this action.",
    "errors": null
}
```

---

## Authentication Error (401 Unauthorized)

```json
{
    "success": false,
    "message": "Unauthenticated.",
    "errors": null
}
```

---

## Not Found Error (404)

```json
{
    "success": false,
    "message": "Product not found.",
    "errors": null
}
```

---

## General Error (500)

```json
{
    "success": false,
    "message": "An unexpected error occurred.",
    "errors": null
}
```

---

## Vue 3 Usage Example

```ts
// Pinia store using the standardized response
import { defineStore } from 'pinia'
import api from '@/utils/api'

export const useProductsStore = defineStore('products', () => {
    const products = ref([])
    const meta = ref({})
    const loading = ref(false)
    const error = ref(null)

    async function fetchProducts(params = {}) {
        loading.value = true
        error.value = null

        try {
            const response = await api.get('/products', { params })
            const { success, message, data } = response.data

            if (!success) throw new Error(message)

            products.value = data.data
            meta.value = data.meta
        } catch (err) {
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    async function createProduct(formData: FormData) {
        const response = await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    }

    return { products, meta, loading, error, fetchProducts, createProduct }
})
```

---

## HTTP Status Code Reference

| Status | When | Response Type |
|--------|------|---------------|
| `200` | Successful GET, or DELETE with a confirmation body | `ApiResponse::success()` / `ApiResponse::deleted()` |
| `201` | Successful POST (create) | `ApiResponse::created()` |
| `401` | Missing or invalid Sanctum token | `ApiResponse::unauthorized()` |
| `403` | Authenticated but policy denies action | `ApiResponse::forbidden()` |
| `404` | Resource not found | `ApiResponse::notFound()` |
| `422` | Validation fails | `ApiResponse::validationErrors()` |
| `500` | Unexpected server error | `ApiResponse::error()` |

---

## Pest Test Example

```php
<?php

use App\Http\Resources\Responses\ApiResponse;

it('returns standardized success response', function () {
    $response = ApiResponse::success('Items loaded', ['count' => 5]);

    expect($response->getStatusCode())->toBe(200)
        ->and(json_decode($response->getContent(), true))->toMatchArray([
            'success' => true,
            'message' => 'Items loaded',
            'data'    => ['count' => 5],
        ]);
});

it('returns paginated response with correct structure', function () {
    $products = Product::factory()->count(5)->create();

    $paginator = Product::query()->paginate(5);

    $response = ApiResponse::paginated($paginator, 'Products loaded');

    $data = json_decode($response->getContent(), true);
    expect($data['success'])->toBeTrue()
        ->and($data['data']['data'])->toHaveCount(5)
        ->and($data['data']['meta'])->toHaveKeys(['current_page', 'last_page', 'per_page', 'total', 'from', 'to']);
});

it('returns validation errors with field names', function () {
    $errors = ['name' => ['The name field is required.'], 'price' => ['The price must be positive.']];

    $response = ApiResponse::validationErrors($errors);

    $data = json_decode($response->getContent(), true);
    expect($data['success'])->toBeFalse()
        ->and($data['message'])->toBe('Validation Error')
        ->and($data['errors']['name'])->toContain('The name field is required.');
});
```
