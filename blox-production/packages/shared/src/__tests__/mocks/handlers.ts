import { http, HttpResponse } from 'msw';

// Mock Supabase API handlers
export const handlers = [
  // Products
  http.get('*/rest/v1/products', () => {
    return HttpResponse.json([
      {
        id: '1',
        make: 'Toyota',
        model: 'Camry',
        trim: 'LE',
        model_year: 2023,
        condition: 'new',
        price: 30000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  // Applications
  http.get('*/rest/v1/applications', () => {
    return HttpResponse.json([
      {
        id: '1',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
        status: 'draft',
        loan_amount: 50000,
        down_payment: 10000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  // Offers
  http.get('*/rest/v1/offers', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Standard Offer',
        annual_rent_rate: 5.5,
        status: 'active',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),
];

