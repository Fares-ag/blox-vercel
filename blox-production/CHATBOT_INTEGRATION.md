# Chatbot Integration with AI Model Features

## Overview

This document describes how the new AI model features have been integrated into the chatbot component (`ChatModal`).

## ✅ Completed Integrations

### 1. Enhanced AI Client (`bloxAiClient.ts`)

Added new helper methods to the BLOX AI client:

- **`uploadAndChat(ws, message, file, documentType)`** - Upload a single file and send a chat message in one call
- **`uploadMultipleAndChat(ws, message, files, documentTypes)`** - Upload multiple files and send a chat message
- **`createChatAndSend(sessionType, initialMessage)`** - Create a WebSocket connection and send an initial message
- **`getChatHistory(sessionId, authToken?)`** - Retrieve chat history for a session
- **`uploadFile(file, documentType)`** - Upload a single file
- **`batchUpload(files, documentTypes)`** - Batch upload multiple files
- **`speechToText(audioFile, language)`** - Convert speech to text using the voice API
- **`textToSpeech(text, language)`** - Convert text to speech using the voice API
- **`getVoiceStatus()`** - Check voice processing availability

### 2. ChatModal Updates

#### Session ID Management
- Added session ID generation and persistence using `localStorage`
- Session ID is stored as `blox-chat-session-id`
- Session ID is reused across chat sessions for history persistence
- Session ID format: `chat-{timestamp}-{random}`

#### File Upload Integration
- **Automatic Document Type Detection**: The chatbot now automatically detects document types from file names:
  - `id`, `national`, `qid` → `Qatar_national_id`
  - `bank`, `statement` → `Bank_statements`
  - `salary`, `income` → `Salary_certificates`
  - `passport` → `Passport`
  - `license`, `driving` → `Driving_license`
  - Defaults based on file type (images → `Qatar_national_id`, PDFs → `Bank_statements`)

- **Single File Upload**: When one file is selected, uses `uploadAndChat()` method
- **Multiple File Upload**: When multiple files are selected, uses `uploadMultipleAndChat()` method
- **Upload State Management**: Added `uploadingFiles` state to track upload progress
- Files are uploaded to the AI API with proper document type classification

#### Chat History (Prepared)
- Session ID management is in place
- Chat history retrieval is prepared but commented out (requires authentication token)
- To enable: uncomment the history loading code in the `useEffect` and provide an auth token

## 🔄 How It Works

### File Upload Flow

1. User selects file(s) in the chat modal
2. Files are stored locally for preview
3. User sends a message (with or without files)
4. `handleSend()` is called:
   - Files are converted to base64 for local preview display
   - User message is added to the chat UI
   - If files are present:
     - Document types are auto-detected
     - Files are uploaded using `uploadAndChat()` or `uploadMultipleAndChat()`
     - The chat message is sent after upload completes
   - If no files:
     - Message is sent directly via WebSocket

### Session Management Flow

1. When chat modal opens:
   - Checks for existing session ID in `localStorage`
   - If found, uses it; if not, generates a new one
   - Session ID is stored for future use
2. Session ID can be used to:
   - Retrieve chat history (requires auth token)
   - Track conversations across sessions
   - Enable chat persistence

## 📝 Usage Examples

### Using the New Methods in Code

```typescript
import { bloxAIClient } from '@shared/services';

// Upload single file and chat
const ws = bloxAIClient.createChatConnection('user_chatbot');
await bloxAIClient.uploadAndChat(
  ws, 
  'Please review this document', 
  file, 
  'Qatar_national_id'
);

// Upload multiple files and chat
await bloxAIClient.uploadMultipleAndChat(
  ws,
  'Review these documents',
  [file1, file2],
  ['Qatar_national_id', 'Bank_statements']
);

// Get chat history (requires auth token)
const history = await bloxAIClient.getChatHistory('session-123', authToken);
```

## 🎯 Features Available in ChatModal

- ✅ File upload with automatic document type detection
- ✅ Single and multiple file uploads
- ✅ Session ID management for chat persistence
- ✅ Integration with new AI API upload endpoints
- ✅ Proper error handling and user feedback
- ✅ Upload progress tracking

## 🔮 Future Enhancements

1. **Enable Chat History**: Uncomment and implement auth token retrieval for chat history
2. **Document Type Selector**: Add a UI dropdown to let users select document types manually
3. **Upload Progress Indicator**: Show progress bar for file uploads
4. **Voice API Integration**: Integrate server-side voice processing as an alternative to browser APIs
5. **Batch Processing UI**: Add UI for batch document processing

## 🔧 Configuration

No additional configuration is required. The integration uses:
- Existing `VITE_BLOX_AI_URL` environment variable
- LocalStorage for session ID persistence
- WebSocket connection for real-time chat

## 📚 Related Files

- `packages/shared/src/services/bloxAiClient.ts` - AI client with new methods
- `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.tsx` - Updated chatbot component
- `packages/customer/src/modules/customer/layouts/CustomerLayout/CustomerLayout.tsx` - Chatbot integration point

## 🐛 Troubleshooting

### Files not uploading
- Check that the BLOX AI server is running and accessible
- Verify the `VITE_BLOX_AI_URL` environment variable is set correctly
- Check browser console for error messages
- Ensure WebSocket connection is established

### Session ID issues
- Clear `localStorage` if session ID seems corrupted
- Check browser console for localStorage errors
- Session ID is stored in: `localStorage.getItem('blox-chat-session-id')`

### Document type detection
- If document type is incorrectly detected, file name keywords are used
- Default types are assigned based on file MIME type
- Consider adding manual document type selection in the future
