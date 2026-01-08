# BLOX AI Assessment Integration Guide

This guide shows how to integrate the BLOX AI assessment feature into your application submission flow.

## Overview

The assessment feature allows you to automatically evaluate applications using the BLOX AI API when users submit their applications. The API returns a decision (Approved/Denied) and reasons.

## Integration Location

The assessment should be called in the `CreateApplicationPage` component, specifically in the `onSubmit` function after form validation but before saving the application.

**File:** `packages/customer/src/modules/customer/features/applications/pages/CreateApplicationPage/CreateApplicationPage.tsx`

## Example Integration

Here's how you can integrate the assessment:

```typescript
import { bloxAIClient } from '@shared/services';

// In the onSubmit function, after validation and before saving:

const onSubmit = async (data: ApplicationFormData) => {
  // ... existing validation code ...

  try {
    setSubmitting(true);

    // Prepare application data for assessment
    // Note: The API expects data in UserData format with specific field names
    const assessmentData = {
      first_name: data.firstName,
      last_name: data.lastName,
      employment_type: employmentType,
      monthly_income: salary,
      // Add documents if available (must be valid URLs)
      documents: Object.values(documents || {})
        .filter((doc) => doc?.url)
        .map((doc) => ({
          document_type: doc.category || 'other',
          document_path: doc.url,
        })),
      // Add any other relevant fields
      email: data.email,
      phone: data.phone,
      national_id: data.nationalId,
      nationality: data.nationality,
      gender: data.gender,
      duration_of_residence: data.durationOfResidence,
      monthly_liabilities: data.monthlyLiabilities || 0,
      down_payment: downPayment,
      loan_amount: loanAmount,
      term_months: termMonths,
      vehicle_make: vehicle?.make,
      vehicle_model: vehicle?.model,
      vehicle_year: vehicle?.year,
      vehicle_price: vehicle?.price,
    };

    // Call BLOX AI assessment
    // Note: The client automatically wraps this in { user_data: ... }
    try {
      const assessment = await bloxAIClient.assessApplication(assessmentData);
      
      // Handle the assessment result
      if (assessment.decision === 'Denied') {
        // Show denial reasons to user
        const reasonsText = assessment.reasons.join('\n');
        toast.warning(
          `Application Assessment: ${assessment.decision}\n\nReasons:\n${reasonsText}`,
          { autoClose: 10000 }
        );
        
        // Option 1: Block submission
        // setSubmitting(false);
        // return;
        
        // Option 2: Allow submission but warn user
        // Continue with submission but show warning
      } else if (assessment.decision === 'Approved') {
        toast.success('Application pre-approved by BLOX AI!');
      }
    } catch (assessmentError) {
      // If assessment fails, log but don't block submission
      console.error('Assessment failed:', assessmentError);
      toast.warning('Assessment service unavailable. Application will be reviewed manually.');
    }

    // Continue with existing application submission code...
    // ... rest of your submission logic ...

  } catch (error) {
    // ... existing error handling ...
  } finally {
    setSubmitting(false);
  }
};
```

## Integration Options

### Option 1: Block Submission on Denial
If the assessment returns "Denied", prevent the user from submitting:

```typescript
if (assessment.decision === 'Denied') {
  toast.error(`Application cannot be submitted: ${assessment.reasons.join(', ')}`);
  setSubmitting(false);
  return;
}
```

### Option 2: Warn but Allow Submission
Show a warning but allow the user to proceed:

```typescript
if (assessment.decision === 'Denied') {
  const proceed = window.confirm(
    `Assessment Result: ${assessment.decision}\n\nReasons:\n${assessment.reasons.join('\n')}\n\nDo you want to proceed anyway?`
  );
  if (!proceed) {
    setSubmitting(false);
    return;
  }
}
```

### Option 3: Save Assessment Result
Store the assessment result with the application for later reference:

```typescript
// After creating the application
const applicationPayload = {
  // ... existing application data ...
  assessmentResult: {
    decision: assessment.decision,
    reasons: assessment.reasons,
    assessedAt: new Date().toISOString(),
  },
};
```

## Displaying Assessment Results

You can display assessment results in the application detail page:

```typescript
// In ApplicationDetailPage.tsx
{application.assessmentResult && (
  <Alert severity={application.assessmentResult.decision === 'Approved' ? 'success' : 'warning'}>
    <Typography variant="subtitle2">BLOX AI Assessment</Typography>
    <Typography variant="body2">
      Decision: {application.assessmentResult.decision}
    </Typography>
    {application.assessmentResult.reasons.length > 0 && (
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" fontWeight="bold">Reasons:</Typography>
        <ul>
          {application.assessmentResult.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </Box>
    )}
  </Alert>
)}
```

## Testing

1. **Test with valid data** - Submit an application that should be approved
2. **Test with invalid data** - Submit an application that should be denied
3. **Test API failure** - Temporarily use an invalid API URL to test error handling
4. **Test WebSocket** - Verify chat feature works independently

## Notes

- The assessment is optional - if it fails, the application can still be submitted for manual review
- Assessment results can be stored with the application for audit purposes
- Consider caching assessment results to avoid re-assessing the same application
- The assessment API format may need to be adjusted based on your actual API requirements

## Next Steps

1. Review the actual API documentation for the exact request/response format
2. Update the `AssessmentRequest` and `AssessmentResponse` interfaces in `bloxAiClient.ts` to match your API
3. Adjust the assessment data mapping to match your API's expected format
4. Decide on the integration option (block, warn, or save only)
5. Test thoroughly with real API responses

