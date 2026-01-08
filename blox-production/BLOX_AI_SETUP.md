# BLOX AI Integration Setup

This guide explains how to set up the BLOX AI API integration for the chat feature.

## Environment Variables

Add the following environment variable to your `.env.development` files:

### Required Files:
- Root: `.env.development`
- Customer: `packages/customer/.env.development`

### Add This Line:
```env
VITE_BLOX_AI_URL=https://abc123.ngrok.io
```

**Important:** Replace `https://abc123.ngrok.io` with your actual ngrok URL once it's running.

### Example `.env.development` file:
```env
# Existing variables
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here

# BLOX AI Configuration
VITE_BLOX_AI_URL=https://abc123.ngrok.io
```

## After Adding Environment Variables

1. **Restart your dev server** - Environment variables are only loaded when the server starts:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev:customer
   # or
   npm run dev:unified
   ```

2. **Verify the connection** - Open the chat modal and check the browser console for connection status.

## Features

### 1. Real-time Chat
- Click the chat button (floating action button) in the customer layout
- Chat with BLOX AI assistant via WebSocket
- Messages are sent and received in real-time

### 2. Application Assessment (Optional)
- The `bloxAiClient.assessApplication()` method is available
- Can be integrated into the application submission flow
- Returns decision (Approved/Denied) and reasons

## Usage Examples

### Using the Chat Feature
The chat feature is already integrated into the customer layout. Users can:
1. Click the floating chat button
2. Start chatting with the BLOX AI assistant
3. Messages are sent via WebSocket in real-time

### Using Assessment in Code
```typescript
import { bloxAIClient } from '@shared/services';

// Assess an application
// Note: The API expects UserData format with specific field names
try {
  const assessment = await bloxAIClient.assessApplication({
    first_name: "John",
    last_name: "Doe",
    employment_type: "Employed",
    monthly_income: 5000,
    documents: [{
      document_type: "Qatar_national_id",
      document_path: "https://example.com/id.pdf"
    }]
    // ... other fields
  });
  
  console.log('Decision:', assessment.decision); // 'Approved' or 'Denied'
  console.log('Reasons:', assessment.reasons);
} catch (error) {
  console.error('Assessment failed:', error);
}
```

## API Endpoints

The BLOX AI client uses these endpoints:
- **Assessment**: `POST /assistant/`
- **WebSocket Chat**: `ws://your-url/ws`
- **Health Check**: `GET /weaviate_status/`

## Troubleshooting

### Chat Not Connecting
1. Check that `VITE_BLOX_AI_URL` is set correctly
2. Verify your ngrok tunnel is running
3. Check browser console for WebSocket errors
4. Ensure the API URL doesn't have a trailing slash

### Assessment Not Working
1. Verify the API URL is correct
2. Check that the `/assistant/` endpoint is accessible
3. Review the request payload format matches API expectations

### Environment Variable Not Loading
1. Make sure you've restarted the dev server after adding the variable
2. Check that the variable name starts with `VITE_`
3. Verify the file is named `.env.development` (not `.env`)

## Next Steps

1. **Replace the placeholder client code** - The `bloxAiClient.ts` file contains a template. Replace it with your actual implementation when ready.

2. **Integrate assessment** (optional) - If you want to assess applications automatically:
   - Open `packages/customer/src/modules/customer/features/applications/pages/CreateApplicationPage/CreateApplicationPage.tsx`
   - Add assessment call in the `onSubmit` function after form validation
   - Display the decision and reasons to the user

3. **Customize chat UI** - The chat modal can be customized in:
   - `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.tsx`
   - `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.scss`

