# Backend Endpoint Implementation Guide

## Where to Implement the `/applications/submit-from-ai` Endpoint

Based on your project structure, the BLOX AI backend is a **separate Python/FastAPI service** (not in this repository). Here's where and how to implement the endpoint:

## Option 1: BLOX AI Backend (Python/FastAPI) - Recommended

Since your BLOX AI API is a separate service (with endpoints like `/upload`, `/assistant/`, `/ws`, etc.), you should implement the endpoint in **that backend service**.

### Location
If your BLOX AI backend is in a separate repository/folder, add the endpoint to your main API file (typically `main.py`, `app.py`, or `api.py`).

### Implementation Example

**File: `api.py` or `main.py` (in your BLOX AI backend)**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from supabase import create_client, Client

app = FastAPI()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for backend
supabase: Client = create_client(supabase_url, supabase_key)


class ApplicationSubmissionRequest(BaseModel):
    customerInfo: Dict[str, Any]
    vehicleId: str
    offerId: Optional[str] = None
    loanAmount: float
    downPayment: float
    documents: Optional[List[Dict[str, Any]]] = []
    installmentPlan: Optional[Dict[str, Any]] = None


@app.post("/applications/submit-from-ai")
async def submit_application_from_ai(request: ApplicationSubmissionRequest):
    """
    Create an application from AI-collected data.
    Status is set to 'under_review' and origin is marked as 'ai'.
    """
    try:
        # Extract customer info
        customer_info = request.customerInfo
        first_name = customer_info.get("firstName", "")
        last_name = customer_info.get("lastName", "")
        email = customer_info.get("email", "")
        phone = customer_info.get("phone", "")
        
        # Validate required fields
        if not all([first_name, last_name, email, phone, request.vehicleId]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: firstName, lastName, email, phone, vehicleId"
            )
        
        # Mark origin as AI in customer_info metadata
        customer_info["_origin"] = "ai"
        customer_info["_createdByAI"] = True
        
        # Prepare application data for Supabase
        application_data = {
            "customer_name": f"{first_name} {last_name}".strip(),
            "customer_email": email,
            "customer_phone": phone,
            "customer_info": customer_info,
            "vehicle_id": request.vehicleId,
            "offer_id": request.offerId,
            "status": "under_review",  # Always under_review for AI submissions
            "loan_amount": request.loanAmount,
            "down_payment": request.downPayment,
            "installment_plan": request.installmentPlan,
            "documents": request.documents,
            "submission_date": datetime.utcnow().isoformat(),
        }
        
        # Create application in Supabase
        response = supabase.table("applications").insert(application_data).execute()
        
        if response.data and len(response.data) > 0:
            application_id = response.data[0]["id"]
            return {
                "application_id": application_id,
                "status": "under_review",
                "message": "Application created successfully from AI"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to create application in database"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating application: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
```

### Required Dependencies

Make sure you have the Supabase Python client installed:

```bash
pip install supabase
```

### Environment Variables

Set these in your BLOX AI backend environment:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Use the **service role key** (not the anon key) so the backend can bypass Row Level Security (RLS) to create applications.

## Option 2: Supabase Edge Function (Alternative)

If you prefer to keep everything in Supabase, you can create an Edge Function instead.

### Location
Create a new folder in: `supabase/functions/submit-ai-application/`

### Implementation

**File: `supabase/functions/submit-ai-application/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const applicationData = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Extract and validate data
    const customerInfo = applicationData.customerInfo || {}
    const firstName = customerInfo.firstName || ''
    const lastName = customerInfo.lastName || ''
    const email = customerInfo.email || ''
    const phone = customerInfo.phone || ''
    const vehicleId = applicationData.vehicleId
    
    if (!firstName || !lastName || !email || !phone || !vehicleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Mark origin as AI
    customerInfo._origin = 'ai'
    customerInfo._createdByAI = true
    
    // Prepare application data
    const appData = {
      customer_name: `${firstName} ${lastName}`.trim(),
      customer_email: email,
      customer_phone: phone,
      customer_info: customerInfo,
      vehicle_id: vehicleId,
      offer_id: applicationData.offerId || null,
      status: 'under_review',
      loan_amount: applicationData.loanAmount || 0,
      down_payment: applicationData.downPayment || 0,
      installment_plan: applicationData.installmentPlan || null,
      documents: applicationData.documents || [],
      submission_date: new Date().toISOString(),
    }
    
    // Create application
    const { data, error } = await supabase
      .from('applications')
      .insert(appData)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return new Response(
      JSON.stringify({
        application_id: data.id,
        status: 'under_review',
        message: 'Application created successfully from AI'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

Then update your frontend to use the Edge Function endpoint:

```typescript
// In bloxAiClient.ts, update submitApplicationFromAI to use Supabase function
async submitApplicationFromAI(applicationData: {...}): Promise<{...}> {
  const supabaseUrl = this.baseUrl; // Or get from env
  const response = await fetch(
    `${supabaseUrl}/functions/v1/submit-ai-application`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}` // Or use anon key if RLS allows
      },
      body: JSON.stringify(applicationData)
    }
  );
  // ... rest of the code
}
```

## Recommendation

**Use Option 1 (Python/FastAPI backend)** if:
- Your BLOX AI backend is already a separate service
- You want to keep all AI-related endpoints together
- You're already using Python/FastAPI for the AI backend

**Use Option 2 (Supabase Edge Function)** if:
- You want to keep everything in one codebase
- You prefer TypeScript/Deno
- You want to leverage Supabase's infrastructure

## Testing the Endpoint

Once implemented, test with:

```bash
curl -X POST http://localhost:8000/applications/submit-from-ai \
  -H "Content-Type: application/json" \
  -d '{
    "customerInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+97412345678"
    },
    "vehicleId": "vehicle-uuid",
    "loanAmount": 50000,
    "downPayment": 10000,
    "documents": []
  }'
```

## Next Steps

1. ✅ Choose implementation option (Option 1 recommended)
2. ✅ Add the endpoint to your backend
3. ✅ Set up Supabase credentials (service role key)
4. ✅ Test the endpoint
5. ✅ Verify application appears in admin panel with status "under_review" and origin "ai"
