# Chatbot File Upload Troubleshooting

## Common Error: "File upload failed"

If you're seeing errors like:
```
Upload and chat failed: Error: File upload failed
Failed to upload files and send message: Error: Failed to upload and chat: File upload failed
```

### Possible Causes

1. **BLOX AI Server Not Running**
   - The chatbot tries to upload files to `${BLOX_AI_URL}/upload/`
   - Verify your BLOX AI server is running
   - Check that `VITE_BLOX_AI_URL` environment variable is set correctly

2. **Upload Endpoint Doesn't Exist**
   - The endpoint `/upload/` might not be implemented on your BLOX AI server
   - According to the implementation, the endpoint should be available
   - Verify the endpoint exists: `GET ${BLOX_AI_URL}/upload/` (should return method not allowed or similar)
   - Check your BLOX AI server routes/endpoints

3. **CORS Issues**
   - Browser might be blocking the request due to CORS
   - Check browser console for CORS errors
   - Ensure your BLOX AI server allows requests from your frontend domain

4. **Network/Connection Issues**
   - Verify the BLOX AI server is accessible from your browser
   - Try accessing `${BLOX_AI_URL}/weaviate_status/` in your browser
   - Check if the URL is correct (no typos, correct protocol http/https)

5. **Endpoint Path Mismatch**
   - The code uses `/upload/` but your server might use a different path
   - Check your BLOX AI server API documentation
   - Common alternatives: `/api/upload`, `/upload`, `/files/upload`

### Debugging Steps

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Look for detailed error messages in the Console tab
   - The improved error handling now shows more details:
     - HTTP status code
     - Error response text
     - Request URL

2. **Verify Server Endpoints**
   ```bash
   # Test if server is reachable
   curl ${BLOX_AI_URL}/weaviate_status/
   
   # Test upload endpoint (should fail with method not allowed or similar for GET)
   curl -X GET ${BLOX_AI_URL}/upload/
   ```

3. **Check Environment Variables**
   ```typescript
   // In browser console
   console.log('BLOX AI URL:', import.meta.env.VITE_BLOX_AI_URL);
   // Or check the actual base URL being used
   import { bloxAIClient } from '@shared/services';
   console.log('Base URL:', bloxAIClient.getBaseUrl());
   ```

4. **Test Upload Endpoint Directly**
   ```javascript
   // In browser console
   const formData = new FormData();
   formData.append('file', new File(['test'], 'test.txt'));
   formData.append('document_type', 'Other_documents');
   
   fetch('YOUR_BLOX_AI_URL/upload/', {
     method: 'POST',
     body: formData
   })
   .then(r => r.text())
   .then(console.log)
   .catch(console.error);
   ```

### Temporary Workaround

If the upload endpoint is not available, you can temporarily disable file uploads in the chatbot by modifying `ChatModal.tsx`:

```typescript
// In handleSendAfterConnection, comment out the upload logic:
// if (files.length > 0) {
//   // Upload logic...
// } else {
//   // Just send message
//   bloxAIClient.sendUserQuery(wsRef.current, message);
// }

// Always just send message for now:
bloxAIClient.sendUserQuery(wsRef.current, message);
```

Or modify the file selection to not trigger uploads until the endpoint is fixed.

### Expected Server Response

The `/upload/` endpoint should return a JSON response like:
```json
{
  "success": true,
  "file_id": "some-file-id",
  "message": "File uploaded successfully"
}
```

Or on error:
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Next Steps

1. Verify your BLOX AI server has the `/upload/` endpoint implemented
2. Check server logs for any errors
3. Verify CORS configuration on the server
4. Check network tab in browser DevTools to see the actual request/response
5. Contact your backend team if the endpoint needs to be implemented

## Other Errors

### Speech Synthesis Error
This is a browser API issue and is not critical. It just means text-to-speech failed. The chat will still work normally.

### JWT Expired (401 errors)
These are authentication errors from Supabase, not related to the chatbot file upload. The user needs to log in again.
