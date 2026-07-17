# Implement File Upload

## When to Use

When implementing file upload functionality: storage configuration, controller handling, validation, PrimeVue upload component, and file preview.

## Prerequisites

- Laravel 13 with filesystem configured
- Vue 3 + PrimeVue installed
- Sanctum authentication (for protected uploads)

## Step-by-Step Workflow

### 1. Configure Storage

Ensure `config/filesystems.php` has the desired disk:

```php
'disks' => [
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'serve' => true,
        'throw' => false,
    ],
    'public' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => env('APP_URL') . '/storage',
        'visibility' => 'public',
        'throw' => false,
    ],
    's3' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'throw' => false,
    ],
],
```

Run:
```bash
php artisan storage:link
```

### 2. Create Upload Controller

```bash
php artisan make:controller FileUploadController
```

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploadController extends Controller
{
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB
            'type' => 'sometimes|in:image,document,video',
        ]);

        $file = $request->file('file');
        $type = $request->input('type', 'document');
        $path = $type . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();

        $storedPath = $file->storeAs('', $path, 'public');

        return response()->json([
            'path' => $storedPath,
            'url' => Storage::url($storedPath),
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ], 201);
    }

    public function destroy(string $path)
    {
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
        return response()->json(null, 204);
    }
}
```

### 3. Create Validation Rules

```bash
php artisan make:request StoreFileRequest
```

```php
public function rules(): array
{
    return [
        // Base rules apply to every upload. Note: `svg` is intentionally excluded
        // from the allowed mimes because SVG files can carry embedded scripts
        // (stored-XSS vector).
        'file' => [
            'required',
            'file',
            'max:10240',
            'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,csv',
        ],
        'type' => 'sometimes|string|in:image,document,video',
    ];
}

public function withValidator($validator): void
{
    // The `dimensions` rule only makes sense for raster images. Applying it to
    // pdf/doc/xls/csv uploads would fail every non-image file, so add it
    // conditionally when the caller declares an image upload.
    $validator->sometimes('file', 'dimensions:max_width=4000,max_height=4000', function ($input) {
        return $input->type === 'image';
    });
}
```

### 4. Register Routes

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/upload', [FileUploadController::class, 'upload']);
    Route::delete('/upload/{path}', [FileUploadController::class, 'destroy']);
});
```

### 5. Create Vue Upload Component

```vue
<script setup>
import { ref } from 'vue';
import api from '@/api/client';
import FileUpload from 'primevue/fileupload';
import Button from 'primevue/button';
import Image from 'primevue/image';
import Message from 'primevue/message';
import Progressbar from 'primevue/progressbar';

const files = ref([]);
const uploading = ref(false);
const uploadError = ref(null);
const uploadedFiles = ref([]);
const progress = ref(0);

const onUpload = async (event) => {
    uploading.value = true;
    uploadError.value = null;
    const formData = new FormData();
    formData.append('file', event.files[0]);
    formData.append('type', 'image');

    try {
        // The shared axios client sends the Sanctum session cookie and
        // X-XSRF-TOKEN automatically (withCredentials). Override the content type
        // so the multipart boundary is set correctly.
        const { data } = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedFiles.value.push(data);
    } catch (e) {
        uploadError.value = e.response?.data?.message || 'Upload failed';
    }
    uploading.value = false;
};

const removeFile = async (index) => {
    const file = uploadedFiles.value[index];
    await api.delete(`/upload/${file.path}`);
    uploadedFiles.value.splice(index, 1);
};
</script>

<template>
    <div>
        <FileUpload
            name="file[]"
            :multiple="true"
            accept="image/*,.pdf,.doc,.docx"
            :maxFileSize="10240000"
            @select="files = $event.files"
            @upload="onUpload"
            :disabled="uploading"
        >
            <template #empty>
                <div class="p-upload-empty">
                    <i class="pi pi-cloud-upload" style="font-size: 2rem"></i>
                    <p>Drag and drop files here or click to upload</p>
                </div>
            </template>
            <template #content>
                <Progressbar v-if="uploading" :value="progress" />
            </template>
        </FileUpload>

        <Message v-if="uploadError" severity="error" :text="uploadError" />

        <div v-if="uploadedFiles.length" class="mt-4">
            <h3>Uploaded Files</h3>
            <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                <Image
                    v-if="file.mime_type?.startsWith('image/')"
                    :src="file.url"
                    :alt="file.name"
                    preview
                    width="100"
                />
                <span v-else>{{ file.name }}</span>
                <span>{{ (file.size / 1024).toFixed(1) }} KB</span>
                <Button icon="pi pi-trash" class="p-button-text p-button-danger" @click="removeFile(index)" />
            </div>
        </div>
    </div>
</template>
```

### 6. Create Storage Policy (Optional)

```bash
php artisan make:policy StoragePolicy
```

```php
class StoragePolicy
{
    public function upload(User $user): bool
    {
        return $user->hasPermission('upload-files');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('delete-files');
    }
}
```

## Artisan Commands Reference

```bash
php artisan storage:link
php artisan make:controller FileUploadController
php artisan make:request StoreFileRequest
php artisan route:list --path=api/upload
php artisan test --filter=Upload
```

## Files to Create

| File | Purpose |
|------|---------|
| `app/Http/Controllers/FileUploadController.php` | Upload/delete logic |
| `app/Http/Requests/StoreFileRequest.php` | Upload validation |
| `app/Policies/StoragePolicy.php` | Upload permissions |
| `resources/js/Pages/<Resource>/Upload.vue` | Upload component |
| `routes/api.php` | Upload routes |
| `tests/Feature/UploadTest.php` | Upload tests |

## Testing

```bash
php artisan test tests/Feature/UploadTest.php
php artisan test --filter=test_upload_valid_file
php artisan test --filter=test_upload_rejects_invalid_file
php artisan test --filter=test_upload_rejects_large_file
php artisan test --filter=test_delete_uploaded_file
php artisan test --filter=test_upload_requires_authentication
```

## Verification Checklist

- [ ] Storage disk configured correctly
- [ ] `storage:link` symlink created
- [ ] Upload endpoint accepts valid files
- [ ] Upload validates file type and size
- [ ] Files stored in correct directory
- [ ] API returns correct file metadata
- [ ] Vue component shows upload progress
- [ ] Image preview works for uploaded images
- [ ] File deletion works
- [ ] Unauthorized upload returns 401
- [ ] Large files rejected with proper error
- [ ] All tests pass
