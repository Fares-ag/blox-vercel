# AI Application Submission Feature

## Overview

This feature allows the AI chatbot to collect customer information, vehicle information, and documents, then automatically create an application in the admin system with status "under_review" and origin marked as "from AI".

## Implementation Details

### 1. Application Model Update

Added `origin` field to the `Application` interface to track the source of the application:

```typescript
interface Application {
  // ... other fields
  origin?: 'manual' | 'ai' | 'api'; // Source/origin of the application
}
```

### 2. AI Client Method

Added `submitApplicationFromAI()` method to `bloxAiClient`:

```typescript
const result = await bloxAIClient.submitApplicationFromAI({
  customerInfo: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+97412345678",
    // ... other customer info
  },
  vehicleId: "vehicle-uuid",
  offerId: "offer-uuid",
  loanAmount: 50000,
  downPayment: 10000,
  documents: [
    { file_id: "file-uuid-1", document_type: "Qatar_national_id" },
    { file_id: "file-uuid-2", document_type: "Bank_statements" }
  ],
  installmentPlan: {
    // ... installment plan details
  }
});
```

### 3. Backend API Endpoint Required

The BLOX AI backend needs to implement the following endpoint:

**POST** `/applications/submit-from-ai`

**Request Body:**
```json
{
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+97412345678",
    "dateOfBirth": "1990-01-01",
    "nationality": "Qatari",
    "qid": "12345678901",
    "address": {
      "street": "123 Main St",
      "city": "Doha",
      "country": "Qatar",
      "postalCode": "12345"
    },
    "employment": {
      "company": "Company Name",
      "position": "Position",
      "employmentType": "employed",
      "employmentDuration": "5 years",
      "salary": 10000
    },
    "income": {
      "monthlyIncome": 10000,
      "totalIncome": 10000
    }
  },
  "vehicleId": "vehicle-uuid",
  "offerId": "offer-uuid",
  "loanAmount": 50000,
  "downPayment": 10000,
  "documents": [
    {
      "file_id": "file-uuid-1",
      "document_type": "Qatar_national_id",
      "name": "Qatar ID.pdf"
    }
  ],
  "installmentPlan": {
    "tenure": "36 months",
    "interval": "Monthly",
    "monthlyAmount": 1500,
    "totalAmount": 54000,
    "schedule": [...]
  },
  "origin": "ai",
  "status": "under_review"
}
```

**Response:**
```json
{
  "application_id": "application-uuid",
  "status": "under_review",
  "message": "Application created successfully from AI"
}
```

### 4. Backend Implementation Requirements

The backend endpoint should:

1. **Validate the data** - Ensure all required fields are present
2. **Create application in Supabase** - Use the Supabase API to create the application
3. **Set status to "under_review"** - Applications from AI should be reviewed by admin
4. **Mark origin as "ai"** - Store origin in `customer_info._origin` field (metadata)
5. **Link uploaded files** - Use the `file_id`s from documents array to link uploaded files
6. **Return application ID** - Return the created application ID

**Example Backend Implementation (Python/FastAPI):**
```python
@app.post("/applications/submit-from-ai")
async def submit_application_from_ai(application_data: dict):
    # Extract data
    customer_info = application_data.get("customerInfo", {})
    vehicle_id = application_data.get("vehicleId")
    offer_id = application_data.get("offerId")
    loan_amount = application_data.get("loanAmount", 0)
    down_payment = application_data.get("downPayment", 0)
    documents = application_data.get("documents", [])
    installment_plan = application_data.get("installmentPlan", {})
    
    # Mark origin as AI in customer_info
    customer_info["_origin"] = "ai"
    customer_info["_createdByAI"] = True
    
    # Prepare application data for Supabase
    app_data = {
        "customer_name": f"{customer_info.get('firstName', '')} {customer_info.get('lastName', '')}".strip(),
        "customer_email": customer_info.get("email"),
        "customer_phone": customer_info.get("phone"),
        "customer_info": customer_info,
        "vehicle_id": vehicle_id,
        "offer_id": offer_id,
        "status": "under_review",  # Always under_review for AI submissions
        "loan_amount": loan_amount,
        "down_payment": down_payment,
        "installment_plan": installment_plan,
        "documents": documents,
        "submission_date": datetime.utcnow().isoformat(),
    }
    
    # Create application in Supabase
    response = supabase.table("applications").insert(app_data).execute()
    
    if response.data:
        application_id = response.data[0]["id"]
        return {
            "application_id": application_id,
            "status": "under_review",
            "message": "Application created successfully from AI"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to create application")
```

### 5. Database Schema Note

The `origin` field is stored in the `customer_info` JSONB field as metadata:
- `customer_info._origin`: "ai" | "manual" | "api"
- `customer_info._createdByAI`: true/false

This allows tracking without requiring a database schema migration. If you prefer a dedicated column, you can add:
```sql
ALTER TABLE applications ADD COLUMN origin VARCHAR(50) DEFAULT 'manual';
```

### 6. Admin Interface Display

In the admin application list, you can filter/display applications by origin:

```typescript
// Filter applications by origin
const aiApplications = applications.filter(app => 
  app.customerInfo?._origin === 'ai' || 
  app.customerInfo?._createdByAI === true
);

// Display badge/indicator
{app.customerInfo?._createdByAI && (
  <Chip label="Created by AI" color="primary" size="small" />
)}
```

### 7. Usage in Chatbot

When the AI chatbot has collected all necessary information:

```typescript
// After collecting all data in chatbot
const applicationData = {
  customerInfo: collectedCustomerInfo,
  vehicleId: selectedVehicleId,
  offerId: selectedOfferId,
  loanAmount: calculatedLoanAmount,
  downPayment: selectedDownPayment,
  documents: uploadedDocuments.map(doc => ({
    file_id: doc.file_id,
    document_type: doc.document_type,
    name: doc.name
  })),
  installmentPlan: calculatedInstallmentPlan
};

try {
  const result = await bloxAIClient.submitApplicationFromAI(applicationData);
  console.log('Application created:', result.application_id);
  // Notify user that application was submitted successfully
} catch (error) {
  console.error('Failed to submit application:', error);
  // Handle error
}
```

## Benefits

1. **Automated Application Creation** - No manual data entry required
2. **Consistent Status** - All AI-created applications are marked as "under_review"
3. **Origin Tracking** - Easy to identify applications created by AI
4. **Admin Review** - Applications are automatically flagged for admin review
5. **Audit Trail** - Clear tracking of application source

## Next Steps

1. ✅ Frontend client method added
2. ✅ Application model updated
3. ⏳ Backend API endpoint needs to be implemented
4. ⏳ Database schema update (optional - can use metadata)
5. ⏳ Admin UI updates to display origin
6. ⏳ Chatbot integration to collect and submit data

## Testing

Once the backend endpoint is implemented:

1. Test with minimal data
2. Test with complete data
3. Verify status is "under_review"
4. Verify origin is marked as "ai"
5. Verify application appears in admin panel
6. Test error handling
