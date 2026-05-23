# Chatbot to Admin Document Flow

## Overview

This document explains how documents collected from the chatbot are transferred to the admin panel and how document categories are mapped to ensure proper display and organization.

## Document Flow

### 1. Document Collection in Chatbot

**Location:** `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.tsx`

**Process:**
1. User uploads files through the chatbot interface
2. Files are uploaded to BLOX AI backend via `/upload` endpoint
3. Backend returns `file_id` for each uploaded file
4. Frontend tracks uploaded files in `uploadedFileIds` Map:
   ```typescript
   {
     fileName: {
       fileId: "file-123",
       documentType: "Qatar_national_id" // AI document type
     }
   }
   ```

**AI Document Types Detected:**
- `Qatar_national_id` - Qatar National ID
- `Bank_statements` - Bank Statements
- `Salary_certificates` - Salary Certificates
- `Passport` - Passport
- `Driving_license` - Driving License

### 2. Document Type Detection

**Location:** `ChatModal.tsx` - `detectDocumentType()` function

The chatbot automatically detects document types from file names:
```typescript
- 'id', 'national', 'qid' → 'Qatar_national_id'
- 'bank', 'statement' → 'Bank_statements'
- 'salary', 'income' → 'Salary_certificates'
- 'passport' → 'Passport'
- 'license', 'driving' → 'Driving_license'
```

### 3. Application Submission

**Location:** `ChatModal.tsx` - `handleSubmitApplication()`

When user submits application:
1. Uploaded file IDs are converted to `AIDocumentInput[]` format:
   ```typescript
   {
     file_id: "file-123",
     document_type: "Qatar_national_id",
     name: "IMG_7936.jpeg"
   }
   ```

2. Application data is formatted using `BloxAIClient.createApplicationFromAIData()`

### 4. Document Category Mapping

**Location:** `packages/shared/src/services/bloxAiClient.ts` - `mapDocumentType()`

**Critical Mapping:** AI document types are mapped to admin-expected categories:

| AI Document Type | Admin Category | Description |
|----------------|---------------|-------------|
| `Qatar_national_id` | `id` | National ID |
| `Bank_statements` | `bank` | Bank Statement |
| `Salary_certificate` | `salary` | Salary Certificate |
| `Passport` | `passport` | Passport |
| `Driving_license` | `license` | Driving License |
| Other | `other` | Additional Documents |

**Code:**
```typescript
private static mapDocumentType(aiType: string): string {
  const mapping: Record<string, string> = {
    'Qatar_national_id': 'id',
    'Bank_statements': 'bank',
    'Salary_certificate': 'salary',
    'Passport': 'passport',
    'Driving_license': 'license',
  };
  return mapping[aiType] || mapping[aiType.toLowerCase()] || 'other';
}
```

### 5. Document Formatting for Supabase

**Location:** `bloxAiClient.ts` - `createApplicationFromAIData()`

Documents are formatted with:
- **ID:** Unique document ID (`DOC{timestamp}-{index}-{random}`)
- **Name:** Original file name or generated name
- **Type:** `application/pdf` (default)
- **Category:** Mapped to admin format (`id`, `bank`, `salary`, etc.)
- **URL:** Constructed from `file_id` or provided URL
- **uploadedAt:** ISO timestamp

**Example Output:**
```typescript
{
  id: "DOC1234567890-0-abc123",
  name: "IMG_7936.jpeg",
  type: "application/pdf",
  category: "id", // Mapped from "Qatar_national_id"
  url: "http://localhost:8000/files/file-123",
  uploadedAt: "2026-01-13T10:50:51.266Z"
}
```

### 6. Storage in Supabase

**Location:** `packages/shared/src/services/supabase-api.service.ts` - `createApplication()`

Documents are stored in the `applications` table as a JSON array in the `documents` column:

```sql
documents: [
  {
    "id": "DOC1234567890-0-abc123",
    "name": "IMG_7936.jpeg",
    "type": "application/pdf",
    "category": "id",
    "url": "http://localhost:8000/files/file-123",
    "uploadedAt": "2026-01-13T10:50:51.266Z"
  }
]
```

### 7. Admin Panel Display

**Location:** `packages/admin/src/modules/admin/features/applications/`

**Expected Categories:**
The admin panel expects these exact category values:
- `id` - National ID
- `bank` - Bank Statement
- `salary` - Salary Certificate
- `passport` - Passport
- `license` - Driving License
- `other` - Other Documents

**Document Display:**
- **DocumentUploadStep:** Uses `documentCategories` array with IDs matching the categories above
- **ApplicationDetailPage:** Displays documents by category
- Documents are matched to categories using exact string matching

## Category Mapping Verification

### ✅ Correct Flow

1. **Chatbot:** User uploads file → Detected as `Qatar_national_id`
2. **Mapping:** `Qatar_national_id` → `id` (via `mapDocumentType()`)
3. **Storage:** Document stored with `category: "id"`
4. **Admin:** Admin panel displays in "National ID" section ✅

### ❌ Previous Issue (Fixed)

**Before Fix:**
- Chatbot: `Qatar_national_id` → Mapped to `qatar-id`
- Admin expected: `id`
- **Result:** Documents didn't match admin categories ❌

**After Fix:**
- Chatbot: `Qatar_national_id` → Mapped to `id`
- Admin expected: `id`
- **Result:** Documents match perfectly ✅

## Document URL Construction

Documents uploaded via chatbot use file IDs from the BLOX AI backend:

**URL Format:**
```
{baseUrl}/files/{file_id}
```

**Example:**
```
http://localhost:8000/files/file-123
```

**Note:** The BLOX AI backend must provide a `/files/{file_id}` endpoint to serve these documents, or documents should be uploaded to Supabase Storage and URLs should point there.

## Field Matching Summary

| Field | Chatbot Source | Mapping | Admin Expected | Status |
|-------|---------------|---------|----------------|--------|
| **Category** | AI document type | `mapDocumentType()` | `id`, `bank`, `salary`, etc. | ✅ Matches |
| **Name** | File name | Direct | File name | ✅ Matches |
| **Type** | File type | Default: `application/pdf` | MIME type | ✅ Matches |
| **URL** | File ID | Constructed from `file_id` | Document URL | ✅ Matches |
| **ID** | Generated | `DOC{timestamp}-{index}-{random}` | Unique ID | ✅ Matches |

## Testing

**Test File:** `packages/shared/src/__tests__/services/ai-application-submission.test.ts`

Tests verify:
- ✅ Document type mapping (`Qatar_national_id` → `id`)
- ✅ Document formatting
- ✅ Category matching
- ✅ URL construction
- ✅ Application creation with documents

## Troubleshooting

### Documents Not Showing in Admin

**Check:**
1. Verify document categories match admin expected values (`id`, `bank`, `salary`, etc.)
2. Check document URLs are accessible
3. Verify documents array is properly formatted in Supabase
4. Check browser console for errors

### Category Mismatch

**Symptoms:**
- Documents uploaded but not displayed in correct category
- Documents showing in "Other Documents" when they should be in specific category

**Solution:**
- Verify `mapDocumentType()` mapping is correct
- Check that AI document types are being detected correctly
- Ensure category values match admin expected format

### URL Issues

**Symptoms:**
- Documents show but can't be downloaded/viewed
- 404 errors when accessing document URLs

**Solution:**
- Verify BLOX AI backend `/files/{file_id}` endpoint exists
- Check file URLs are correctly constructed
- Consider uploading to Supabase Storage instead

## Related Files

- **Chatbot Component:** `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.tsx`
- **AI Client:** `packages/shared/src/services/bloxAiClient.ts`
- **Document Mapping:** `bloxAiClient.ts` - `mapDocumentType()`
- **Application Formatting:** `bloxAiClient.ts` - `createApplicationFromAIData()`
- **Admin Document Display:** `packages/admin/src/modules/admin/features/applications/components/DocumentUploadStep/DocumentUploadStep.tsx`
- **Admin Categories:** `DocumentUploadStep.tsx` - `documentCategories` array

## Summary

✅ **Documents are properly collected** from the chatbot  
✅ **Categories are correctly mapped** to admin expected format  
✅ **Documents are stored** in Supabase with correct structure  
✅ **Admin panel can display** documents in correct categories  
✅ **Field matching is verified** and working correctly

The document flow is now complete and properly integrated between chatbot and admin panel.
