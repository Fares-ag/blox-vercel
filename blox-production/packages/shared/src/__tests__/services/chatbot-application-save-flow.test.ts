import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BloxAIClient } from '../../services/bloxAiClient';
import { supabaseApiService } from '../../services/supabase-api.service';
import { supabase } from '../../services/supabase.service';
import { supabaseCache } from '../../services/supabase-cache.service';
import type { Application } from '../../models/application.model';

// Mock Supabase
vi.mock('../../services/supabase.service', () => ({
  supabase: {
    from: vi.fn(),
  },
  handleSupabaseResponse: vi.fn((response: any) => {
    if (response.error) {
      throw new Error(response.error.message || 'An error occurred');
    }
    return response.data;
  }),
  mapSupabaseRow: vi.fn((row: any) => {
    if (!row || typeof row !== 'object') {
      return row;
    }
    const mapped: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      mapped[camelKey] = value;
    }
    return mapped;
  }),
}));

// Mock cache
vi.mock('../../services/supabase-cache.service', () => ({
  supabaseCache: {
    clear: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
  },
}));

describe('Chatbot Application Save Flow - Complete Integration Test', () => {
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseCache.clear();
    
    // Create a chainable query builder mock
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);
  });

  describe('Complete Flow: Chatbot → Format → Save → Database', () => {
    it('should successfully save application from chatbot with all data', async () => {
      // Step 1: Simulate data collected by chatbot
      const chatbotCollectedData = {
        customerInfo: {
          firstName: 'Ahmed',
          lastName: 'Al-Suwaidi',
          email: 'ahmed@example.com',
          phone: '+97470012345',
          dateOfBirth: '1990-03-15',
          nationality: 'Qatari',
          qid: '12345678901',
          employment: {
            company: 'Qatar Energy',
            position: 'Engineer',
            employmentType: 'employed',
            employmentDuration: '3 years',
            salary: 25000,
          },
          income: {
            monthlyIncome: 25000,
            totalIncome: 300000,
          },
        },
        vehicleId: 'vehicle-abc123',
        offerId: 'offer-xyz789',
        loanAmount: 150000,
        downPayment: 30000,
        installmentPlan: {
          tenure: '60 months',
          interval: 'Monthly',
          monthlyAmount: 3000,
          totalAmount: 180000,
          downPayment: 30000,
        },
        documents: [
          {
            file_id: 'file-qid-123',
            document_type: 'Qatar_national_id',
            name: 'Qatar ID.pdf',
          },
          {
            file_id: 'file-bank-456',
            document_type: 'Bank_statements',
            name: 'Bank Statement.pdf',
          },
          {
            file_id: 'file-salary-789',
            document_type: 'Salary_certificates',
            name: 'Salary Certificate.pdf',
          },
        ],
      };

      // Step 2: Format data using BloxAIClient helper
      const formattedData = BloxAIClient.createApplicationFromAIData(chatbotCollectedData);

      // Verify formatting
      expect(formattedData).toBeDefined();
      expect(formattedData.customerName).toBe('Ahmed Al-Suwaidi');
      expect(formattedData.customerEmail).toBe('ahmed@example.com');
      expect(formattedData.customerPhone).toBe('+97470012345');
      expect(formattedData.vehicleId).toBe('vehicle-abc123');
      expect(formattedData.offerId).toBe('offer-xyz789');
      expect(formattedData.loanAmount).toBe(150000);
      expect(formattedData.downPayment).toBe(30000);
      
      // Verify status is set to 'under_review' for admin review
      expect(formattedData.status).toBe('under_review');
      
      // Verify AI origin markers
      expect(formattedData.origin).toBe('ai');
      expect(formattedData.customerInfo._origin).toBe('ai');
      expect(formattedData.customerInfo._createdByAI).toBe(true);
      
      // Verify documents are formatted correctly
      expect(formattedData.documents).toHaveLength(3);
      expect(formattedData.documents[0].category).toBe('id'); // Qatar_national_id → id
      expect(formattedData.documents[1].category).toBe('bank'); // Bank_statements → bank
      expect(formattedData.documents[2].category).toBe('salary'); // Salary_certificates → salary
      expect(formattedData.documents[0].url).toContain('file-qid-123');
      expect(formattedData.documents[0].type).toBe('application/pdf');

      // Step 3: Mock successful database insert
      const mockDatabaseResponse = {
        id: 'app-uuid-12345',
        customer_name: 'Ahmed Al-Suwaidi',
        customer_email: 'ahmed@example.com',
        customer_phone: '+97470012345',
        vehicle_id: 'vehicle-abc123',
        offer_id: 'offer-xyz789',
        status: 'under_review',
        loan_amount: 150000,
        down_payment: 30000,
        installment_plan: formattedData.installmentPlan,
        documents: formattedData.documents,
        customer_info: formattedData.customerInfo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockDatabaseResponse,
        error: null,
      });

      // Step 4: Save to database via supabaseApiService
      const result = await supabaseApiService.createApplication(formattedData);

      // Step 5: Verify successful save
      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(result.message).toContain('successfully');

      // Step 6: Verify database insert was called correctly
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(1);
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      
      // Verify snake_case conversion
      expect(insertCall.customer_name).toBe('Ahmed Al-Suwaidi');
      expect(insertCall.customer_email).toBe('ahmed@example.com');
      expect(insertCall.customer_phone).toBe('+97470012345');
      expect(insertCall.vehicle_id).toBe('vehicle-abc123');
      expect(insertCall.offer_id).toBe('offer-xyz789');
      expect(insertCall.status).toBe('under_review');
      expect(insertCall.loan_amount).toBe(150000);
      expect(insertCall.down_payment).toBe(30000);
      
      // Verify customer_info contains AI markers
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
      expect(insertCall.customer_info.firstName).toBe('Ahmed');
      expect(insertCall.customer_info.lastName).toBe('Al-Suwaidi');
      
      // Verify documents array
      expect(Array.isArray(insertCall.documents)).toBe(true);
      expect(insertCall.documents).toHaveLength(3);
      
      // Verify cache was invalidated
      expect(supabaseCache.invalidate).toHaveBeenCalledWith('applications:all');
    });

    it('should save application with minimal required data', async () => {
      // Minimal data that chatbot might collect
      const minimalData = {
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+97412345678',
        },
        vehicleId: 'vehicle-minimal',
        loanAmount: 50000,
        downPayment: 10000,
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(minimalData);

      const mockResponse = {
        id: 'app-minimal-123',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        status: 'under_review',
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await supabaseApiService.createApplication(formattedData);

      expect(result.status).toBe('SUCCESS');
      expect(formattedData.status).toBe('under_review');
      expect(formattedData.origin).toBe('ai');
      
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('under_review');
      expect(insertCall.customer_info._origin).toBe('ai');
    });

    it('should handle database errors gracefully', async () => {
      const chatbotData = {
        customerInfo: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+97411111111',
        },
        vehicleId: 'vehicle-error',
        loanAmount: 30000,
        downPayment: 5000,
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(chatbotData);

      // Simulate database error
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await supabaseApiService.createApplication(formattedData);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.data).toEqual({} as Application);
    });

    it('should preserve all customer info fields in database', async () => {
      const richData = {
        customerInfo: {
          firstName: 'Fatima',
          lastName: 'Al-Kuwari',
          email: 'fatima@example.com',
          phone: '+97470099999',
          dateOfBirth: '1988-07-20',
          nationality: 'Qatari',
          qid: '98765432109',
          address: {
            street: '123 Main Street',
            city: 'Doha',
            state: 'Doha',
            postalCode: '12345',
            country: 'Qatar',
          },
          employment: {
            company: 'Qatar Airways',
            position: 'Manager',
            employmentType: 'employed',
            employmentDuration: '7 years',
            salary: 30000,
          },
          income: {
            monthlyIncome: 30000,
            totalIncome: 360000,
          },
        },
        vehicleId: 'vehicle-rich',
        loanAmount: 200000,
        downPayment: 40000,
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(richData);

      const mockResponse = {
        id: 'app-rich-456',
        customer_name: 'Fatima Al-Kuwari',
        customer_info: formattedData.customerInfo,
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await supabaseApiService.createApplication(formattedData);

      expect(result.status).toBe('SUCCESS');
      
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      
      // Verify all customer info fields are preserved
      expect(insertCall.customer_info.firstName).toBe('Fatima');
      expect(insertCall.customer_info.lastName).toBe('Al-Kuwari');
      expect(insertCall.customer_info.dateOfBirth).toBe('1988-07-20');
      expect(insertCall.customer_info.nationality).toBe('Qatari');
      expect(insertCall.customer_info.qid).toBe('98765432109');
      expect(insertCall.customer_info.employment?.company).toBe('Qatar Airways');
      expect(insertCall.customer_info.income?.monthlyIncome).toBe(30000);
      
      // Verify AI markers are still present
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
    });

    it('should construct document URLs from file_ids correctly', async () => {
      const dataWithFiles = {
        customerInfo: {
          firstName: 'Khalid',
          lastName: 'Al-Attiyah',
          email: 'khalid@example.com',
          phone: '+97470088888',
        },
        vehicleId: 'vehicle-files',
        loanAmount: 80000,
        downPayment: 15000,
        documents: [
          {
            file_id: 'file-abc-123',
            document_type: 'Qatar_national_id',
            name: 'ID.pdf',
          },
          {
            file_id: 'file-def-456',
            document_type: 'Bank_statements',
            name: 'Statement.pdf',
          },
        ],
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(dataWithFiles);

      // Verify document URLs are constructed
      expect(formattedData.documents[0].url).toContain('file-abc-123');
      expect(formattedData.documents[1].url).toContain('file-def-456');
      expect(formattedData.documents[0].category).toBe('id');
      expect(formattedData.documents[1].category).toBe('bank');

      const mockResponse = {
        id: 'app-files-789',
        documents: formattedData.documents,
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await supabaseApiService.createApplication(formattedData);

      expect(result.status).toBe('SUCCESS');
      
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.documents).toHaveLength(2);
      expect(insertCall.documents[0].url).toContain('file-abc-123');
    });
  });

  describe('Data Transformation: camelCase ↔ snake_case', () => {
    it('should convert application data to snake_case for database', async () => {
      const formattedData = BloxAIClient.createApplicationFromAIData({
        customerInfo: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+97412345678',
        },
        vehicleId: 'vehicle-123',
        loanAmount: 50000,
        downPayment: 10000,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'app-123',
          customer_name: 'Test User',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      await supabaseApiService.createApplication(formattedData);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      
      // Verify camelCase → snake_case conversion
      expect(insertCall.customer_name).toBeDefined(); // customerName → customer_name
      expect(insertCall.customer_email).toBeDefined(); // customerEmail → customer_email
      expect(insertCall.customer_phone).toBeDefined(); // customerPhone → customer_phone
      expect(insertCall.vehicle_id).toBeDefined(); // vehicleId → vehicle_id
      expect(insertCall.loan_amount).toBeDefined(); // loanAmount → loan_amount
      expect(insertCall.down_payment).toBeDefined(); // downPayment → down_payment
    });
  });

  describe('Status and Origin Verification', () => {
    it('should always set status to under_review for chatbot applications', async () => {
      const data = {
        customerInfo: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+97412345678',
        },
        vehicleId: 'vehicle-123',
        loanAmount: 50000,
        downPayment: 10000,
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(data);
      expect(formattedData.status).toBe('under_review');

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'app-123', status: 'under_review', created_at: new Date().toISOString() },
        error: null,
      });

      await supabaseApiService.createApplication(formattedData);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('under_review');
    });

    it('should always mark origin as ai for chatbot applications', async () => {
      const data = {
        customerInfo: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+97412345678',
        },
        vehicleId: 'vehicle-123',
        loanAmount: 50000,
        downPayment: 10000,
      };

      const formattedData = BloxAIClient.createApplicationFromAIData(data);
      expect(formattedData.origin).toBe('ai');
      expect(formattedData.customerInfo._origin).toBe('ai');
      expect(formattedData.customerInfo._createdByAI).toBe(true);

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'app-123', created_at: new Date().toISOString() },
        error: null,
      });

      await supabaseApiService.createApplication(formattedData);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
    });
  });
});
