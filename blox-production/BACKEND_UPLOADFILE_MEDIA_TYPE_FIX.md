# Backend UploadFile media_type Error - Fix Guide

## Issue Summary

The backend is throwing an error when processing file uploads:
```
UploadFile.__init__() got an unexpected keyword argument 'media_type'
```

**Root Cause**: The backend code is trying to use a `media_type` parameter when creating an `UploadFile` object, but this parameter is not available in the version of FastAPI/Starlette being used.

**Impact**: All file uploads are failing, preventing users from uploading documents through the chatbot.

---

## Error Details

### Error Message
```
UploadFile.__init__() got an unexpected keyword argument 'media_type'
```

### When It Occurs
- When uploading files through the `/upload` endpoint
- When uploading files through the `/batch/upload` endpoint
- The error occurs during file processing on the backend

### Frontend Request
The frontend sends a standard `FormData` request:
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('document_type', documentType);
formData.append('file_size', Math.floor(file.size).toString());
```

**No `media_type` is sent from the frontend** - this is a backend-only issue.

---

## Root Cause Analysis

### FastAPI/Starlette Version Compatibility

The `media_type` parameter was added to `UploadFile` in **FastAPI 0.100.0+** and **Starlette 0.27.0+**.

**If you're using an older version**, the parameter doesn't exist and will cause this error.

### Common Backend Code Pattern (Causing the Error)

```python
# ❌ This will fail in older FastAPI versions
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_file(file: UploadFile = File(..., media_type="application/pdf")):
    # This will fail if FastAPI < 0.100.0
    pass
```

Or:

```python
# ❌ This will also fail
upload_file = UploadFile(
    file=file_obj,
    filename=filename,
    media_type="application/pdf"  # This parameter doesn't exist in older versions
)
```

---

## Solutions

### Solution 1: Update FastAPI/Starlette (Recommended)

**Update to a version that supports `media_type`:**

```bash
pip install --upgrade fastapi>=0.100.0 starlette>=0.27.0
```

**Or update requirements.txt:**
```txt
fastapi>=0.100.0
starlette>=0.27.0
```

**Benefits**:
- ✅ Uses latest features and security patches
- ✅ Supports `media_type` parameter
- ✅ Better type hints and validation

**Drawbacks**:
- ⚠️ May require testing other parts of the application
- ⚠️ May need to update other dependencies

---

### Solution 2: Remove media_type Parameter (Quick Fix)

**If you can't update FastAPI immediately**, remove the `media_type` parameter from your code:

#### Before (❌ Fails):
```python
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(..., media_type="application/pdf")
):
    # Process file
    pass
```

#### After (✅ Works):
```python
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)  # Remove media_type parameter
):
    # Process file
    # Access content type via file.content_type if needed
    content_type = file.content_type
    pass
```

#### Alternative: Get Content Type from File Object

If you need the content type, access it from the `UploadFile` object:

```python
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Get content type from the file object
    content_type = file.content_type
    
    # Validate content type if needed
    if content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail=f"File type {content_type} not allowed"
        )
    
    # Process file
    pass
```

---

### Solution 3: Conditional Parameter (Backward Compatible)

**Use a try-except or version check to handle both cases:**

```python
from fastapi import UploadFile, File
import fastapi

# Check FastAPI version
FASTAPI_VERSION = tuple(map(int, fastapi.__version__.split('.')))

if FASTAPI_VERSION >= (0, 100, 0):
    # Use media_type parameter
    @app.post("/upload")
    async def upload_file(
        file: UploadFile = File(..., media_type="application/pdf")
    ):
        pass
else:
    # Don't use media_type parameter
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...)):
        # Validate content type manually
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )
        pass
```

---

## Implementation Guide

### Step 1: Identify Where media_type is Used

Search your backend codebase for:
```bash
grep -r "media_type" .
grep -r "UploadFile" .
```

Common locations:
- Upload endpoint handlers (`/upload`, `/batch/upload`)
- File validation functions
- File processing utilities

### Step 2: Choose Your Solution

**Option A**: Update FastAPI (if possible)
```bash
pip install --upgrade fastapi starlette
```

**Option B**: Remove `media_type` parameters
- Find all instances
- Remove the parameter
- Use `file.content_type` instead if needed

### Step 3: Update Your Code

#### Example: Single File Upload Endpoint

**Before:**
```python
from fastapi import UploadFile, File, HTTPException

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(..., media_type="application/pdf"),
    document_type: str = Form(...),
    file_size: str = Form(...)
):
    # Process file
    return {"file_id": "...", "status": "processed"}
```

**After (Option 1 - Remove media_type):**
```python
from fastapi import UploadFile, File, HTTPException, Form

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),  # Removed media_type
    document_type: str = Form(...),
    file_size: str = Form(...)
):
    # Validate content type if needed
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Process file
    return {"file_id": "...", "status": "processed"}
```

**After (Option 2 - Update FastAPI):**
```python
# After updating FastAPI >= 0.100.0
from fastapi import UploadFile, File, Form

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(..., media_type="application/pdf"),  # Now works!
    document_type: str = Form(...),
    file_size: str = Form(...)
):
    # Process file
    return {"file_id": "...", "status": "processed"}
```

#### Example: Batch Upload Endpoint

**Before:**
```python
@app.post("/batch/upload")
async def batch_upload(
    files: List[UploadFile] = File(..., media_type="application/pdf")
):
    # Process files
    pass
```

**After:**
```python
@app.post("/batch/upload")
async def batch_upload(
    files: List[UploadFile] = File(...)  # Removed media_type
):
    # Validate each file's content type
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} has invalid type {file.content_type}"
            )
    
    # Process files
    pass
```

### Step 4: Test the Fix

1. **Test single file upload:**
   ```bash
   curl -X POST "http://your-api/upload" \
     -F "file=@test.pdf" \
     -F "document_type=Qatar_national_id" \
     -F "file_size=12345"
   ```

2. **Test batch upload:**
   ```bash
   curl -X POST "http://your-api/batch/upload" \
     -F "files=@file1.pdf" \
     -F "files=@file2.jpg" \
     -F "document_types=Qatar_national_id" \
     -F "document_types=Bank_statements"
   ```

3. **Verify error is gone:**
   - Check backend logs for the error
   - Test from frontend chatbot
   - Verify files are processed correctly

---

## FastAPI Version Check

### Check Current Version

```python
import fastapi
print(f"FastAPI version: {fastapi.__version__}")

import starlette
print(f"Starlette version: {starlette.__version__}")
```

### Version Requirements

| Feature | FastAPI Version | Starlette Version |
|---------|----------------|-------------------|
| `media_type` parameter | >= 0.100.0 | >= 0.27.0 |
| Basic `UploadFile` | >= 0.68.0 | >= 0.13.0 |

---

## Alternative: Content Type Validation

If you need to validate file types, do it manually:

```python
from fastapi import UploadFile, File, HTTPException

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg"
}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}",
                "error_code": "INVALID_FILE_TYPE"
            }
        )
    
    # Process file
    pass
```

---

## Testing Checklist

After implementing the fix, verify:

- [ ] Single file upload works (`/upload`)
- [ ] Batch file upload works (`/batch/upload`)
- [ ] Different file types are accepted (PDF, JPG, PNG)
- [ ] Invalid file types are rejected with clear error
- [ ] Error messages are user-friendly
- [ ] Backend logs show no `media_type` errors
- [ ] Frontend can successfully upload files through chatbot

---

## Frontend Changes (Already Implemented)

The frontend has been updated to show a user-friendly error message:

```typescript
// Error message shown to users:
"File upload error: Backend configuration issue. Please contact support."
```

**No frontend changes needed** - error handling is already in place.

---

## Related Issues

This error is similar to other FastAPI version compatibility issues:
- `UploadFile` parameter changes
- `File()` validation changes
- Content type handling differences

---

## Quick Reference

### FastAPI Version Compatibility

| FastAPI Version | media_type Support | Recommended Action |
|----------------|-------------------|-------------------|
| < 0.100.0 | ❌ Not supported | Remove `media_type` parameter |
| >= 0.100.0 | ✅ Supported | Can use `media_type` parameter |

### Quick Fix Command

```bash
# Option 1: Update FastAPI
pip install --upgrade fastapi>=0.100.0 starlette>=0.27.0

# Option 2: Check current version
pip show fastapi starlette
```

---

## Support

If you need help:
1. Check your FastAPI version: `pip show fastapi`
2. Review the code examples above
3. Test with a simple upload endpoint first
4. Check FastAPI documentation for your version

---

**Last Updated**: January 2025  
**Status**: Frontend error handling complete, backend fix needed  
**Priority**: High (blocks all file uploads)  
**Related**: `BACKEND_FILE_UPLOAD_FIX.md`, `BACKEND_PDF_JAVASCRIPT_VALIDATION_FIX.md`
