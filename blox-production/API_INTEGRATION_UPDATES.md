# API Integration Updates

Based on the official BLOX AI API documentation, the following updates have been made to align the frontend client with the actual API responses and endpoints.

## ✅ Changes Made

### 1. Updated FileUploadResponse Interface

**Before:**
```typescript
interface FileUploadResponse {
  success: boolean;
  file_id?: string;
  message?: string;
  error?: string;
}
```

**After (matches API):**
```typescript
interface FileUploadResponse {
  file_id: string;
  file_url: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  document_type?: string;
  content_type: string;
}
```

### 2. Updated BatchUploadResponse Interface

**Before:**
```typescript
interface BatchUploadResponse {
  success: boolean;
  results: Array<{...}>;
  total_files: number;
  successful: number;
  failed: number;
}
```

**After (matches API):**
```typescript
interface BatchUploadResponse {
  total: number;
  processed: number;
  failed: number;
  files: Array<{
    filename: string;
    status: 'processed' | 'failed';
    file_id?: string;
    extracted_data?: any;
    error?: string;
  }>;
  processing_time_seconds: number;
}
```

### 3. Fixed Upload Endpoint Path

- Changed from `/upload/` (with trailing slash) to `/upload` (no trailing slash)
- This matches the API documentation

### 4. Enhanced WebSocket Message Support

**Updated `sendUserQuery()` method:**
- Now accepts optional `fileIds` parameter
- Includes `file_ids` in WebSocket message when provided
- Matches the API documentation format:

```json
{
  "session_type": "user_chatbot",
  "user_query": "What cars do you have?",
  "file_ids": ["file-id-1", "file-id-2"]
}
```

### 5. Updated Upload and Chat Methods

**`uploadAndChat()`:**
- Now passes `file_id` from upload response to WebSocket message
- Removed check for `success` field (API doesn't return it)
- File IDs are automatically included in the chat message

**`uploadMultipleAndChat()`:**
- Extracts `file_id` from each processed file in batch response
- Passes all file IDs to WebSocket message
- Updated to use new batch response structure

### 6. Health Check Endpoint

- Updated to try `/health` endpoint first (as per API docs)
- Falls back to `/weaviate_status/` for backward compatibility
- Updated return type to match API response structure

## 🔄 Migration Guide

### For Existing Code Using uploadAndChat

**No changes needed!** The method signature is the same:

```typescript
// This still works the same way
await bloxAIClient.uploadAndChat(ws, 'Review this document', file, 'Qatar_national_id');
```

However, the response structure has changed:

**Before:**
```typescript
const result = await bloxAIClient.uploadFile(file, 'Qatar_national_id');
if (result.success) {
  console.log(result.file_id);
}
```

**After:**
```typescript
const result = await bloxAIClient.uploadFile(file, 'Qatar_national_id');
console.log(result.file_id); // Always present (no success check needed)
console.log(result.file_url); // New: URL to access the file
console.log(result.file_path); // New: Server file path
```

### For Existing Code Using sendUserQuery

**No changes needed!** The `fileIds` parameter is optional:

```typescript
// Still works (backward compatible)
bloxAIClient.sendUserQuery(ws, 'Hello');

// New: Can now include file IDs
bloxAIClient.sendUserQuery(ws, 'Review these documents', [fileId1, fileId2]);
```

## 📋 API Endpoint Summary

| Endpoint | Method | Status |
|----------|--------|--------|
| `/health` | GET | ✅ Updated (tries new endpoint, falls back to old) |
| `/upload` | POST | ✅ Fixed (removed trailing slash) |
| `/batch/upload` | POST | ✅ Updated (response structure matches API) |
| `/ws` | WebSocket | ✅ Enhanced (now supports file_ids in messages) |
| `/assistant/` | POST | ✅ No changes needed |
| `/voice/*` | POST/GET | ✅ No changes needed |

## 🐛 Bug Fixes

1. **File Upload Error**: Fixed by removing trailing slash from `/upload/` endpoint
2. **Response Parsing**: Removed check for `success` field that doesn't exist in API response
3. **Batch Upload**: Updated to extract file IDs from new response structure
4. **WebSocket Integration**: File IDs are now properly passed to chat messages

## ✅ Testing Checklist

- [x] Upload endpoint path corrected
- [x] File upload response structure updated
- [x] Batch upload response structure updated
- [x] WebSocket file_ids support added
- [x] TypeScript interfaces match API documentation
- [x] Backward compatibility maintained for sendUserQuery
- [x] Error handling improved with detailed logging

## 🚀 Next Steps

1. Test file uploads in the chatbot
2. Verify WebSocket messages include file_ids correctly
3. Test batch upload functionality
4. Verify health check endpoint works

## 📚 Reference

- API Documentation: See `FRONTEND_API_ENDPOINTS_REFERENCE.md` (provided by backend team)
- Client Code: `packages/shared/src/services/bloxAiClient.ts`
- Integration Guide: `CHATBOT_INTEGRATION.md`
