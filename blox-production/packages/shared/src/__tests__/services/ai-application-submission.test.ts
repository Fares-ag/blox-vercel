import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BloxAIClient, AIApplicationError } from '../../services/bloxAiClient';
import { supabaseApiService } from '../../services/supabase-api.service';
import { supabase } from '../../services/supabase.service';
import { supabaseCache } from '../../services/supabase-cache.service';

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

describe('AI Application Submission', () => {
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

  describe('BloxAIClient.createApplicationFromAIData', () => {
    it('should format application data correctly with AI origin markers', () => {
      const inputData = {
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+97412345678',
          nationality: 'Qatari',
        },
        vehicleId: 'vehicle-123',
        offerId: 'offer-456',
        loanAmount: 50000,
        downPayment: 10000,
        installmentPlan: {
          tenure: '36 months',
          monthlyAmount: 1500,
        },
        documents: [
          {
            file_id: 'file-1',
            document_type: 'Qatar_national_id',
            name: 'ID.pdf',
          },
          {
            document_type: 'Bank_statements',
            category: 'bank-statement',
          },
        ],
      };

      const result = BloxAIClient.createApplicationFromAIData(inputData);

      // Check basic fields
      expect(result.customerName).toBe('John Doe');
      expect(result.customerEmail).toBe('john@example.com');
      expect(result.customerPhone).toBe('+97412345678');
      expect(result.vehicleId).toBe('vehicle-123');
      expect(result.offerId).toBe('offer-456');
      expect(result.loanAmount).toBe(50000);
      expect(result.downPayment).toBe(10000);

      // Check status is always 'under_review'
      expect(result.status).toBe('under_review');

      // Check origin is 'ai'
      expect(result.origin).toBe('ai');

      // Check customerInfo has AI markers
      expect(result.customerInfo._origin).toBe('ai');
      expect(result.customerInfo._createdByAI).toBe(true);
      expect(result.customerInfo.firstName).toBe('John');
      expect(result.customerInfo.lastName).toBe('Doe');
      expect(result.customerInfo.email).toBe('john@example.com');

      // Check documents are formatted
      expect(result.documents).toBeDefined();
      expect(result.documents.length).toBe(2);
      // Document type mapping: Qatar_national_id -> id (matches admin expected format)
      expect(result.documents[0].category).toBe('id');
      expect(result.documents[0].type).toBe('application/pdf');
      expect(result.documents[0].url).toContain('file-1'); // URL constructed from file_id
      expect(result.documents[1].category).toBe('bank'); // Already mapped category preserved
      
      // Check document IDs are unique
      expect(result.documents[0].id).not.toBe(result.documents[1].id);
      expect(result.documents[0].id).toMatch(/^DOC\d+-\d+-/); // Format: DOC{timestamp}-{index}-{random}
    });

    it('should handle missing optional fields', () => {
      const inputData = {
        customerInfo: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+97498765432',
        },
        vehicleId: 'vehicle-789',
        loanAmount: 30000,
        downPayment: 5000,
      };

      const result = BloxAIClient.createApplicationFromAIData(inputData);

      expect(result.customerName).toBe('Jane Smith');
      expect(result.offerId).toBeUndefined();
      expect(result.installmentPlan).toBeUndefined();
      expect(result.documents).toEqual([]);
      expect(result.customerInfo._origin).toBe('ai');
      expect(result.customerInfo._createdByAI).toBe(true);
    });

    it('should handle empty customer names gracefully', () => {
      const inputData = {
        customerInfo: {
          firstName: '',
          lastName: '',
          email: 'test@example.com',
          phone: '+97411111111',
        },
        vehicleId: 'vehicle-999',
        loanAmount: 10000,
        downPayment: 2000,
      };

      const result = BloxAIClient.createApplicationFromAIData(inputData);

      expect(result.customerName).toBe('Unknown Customer');
      expect(result.customerInfo._origin).toBe('ai');
    });

    it('should preserve all customerInfo fields', () => {
      const inputData = {
        customerInfo: {
          firstName: 'Ahmed',
          lastName: 'Ali',
          email: 'ahmed@example.com',
          phone: '+97455555555',
          dateOfBirth: '1990-01-01',
          nationality: 'Qatari',
          qid: '12345678901',
          employment: {
            company: 'Company XYZ',
            position: 'Engineer',
            employmentType: 'employed',
            salary: 15000,
          },
          income: {
            monthlyIncome: 15000,
            totalIncome: 180000,
          },
        },
        vehicleId: 'vehicle-111',
        loanAmount: 75000,
        downPayment: 15000,
      };

      const result = BloxAIClient.createApplicationFromAIData(inputData);

      expect(result.customerInfo.dateOfBirth).toBe('1990-01-01');
      expect(result.customerInfo.nationality).toBe('Qatari');
      expect(result.customerInfo.qid).toBe('12345678901');
      expect(result.customerInfo.employment?.company).toBe('Company XYZ');
      expect(result.customerInfo.income?.monthlyIncome).toBe(15000);
      expect(result.customerInfo._origin).toBe('ai');
      expect(result.customerInfo._createdByAI).toBe(true);
    });
  });

  describe('Creating Application with AI Origin via supabaseApiService', () => {
    it('should create application with origin "ai" and status "under_review"', async () => {
      const applicationData = BloxAIClient.createApplicationFromAIData({
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

      const mockCreatedApplication = {
        id: 'app-123',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        customer_phone: '+97412345678',
        vehicle_id: 'vehicle-123',
        status: 'under_review',
        loan_amount: 50000,
        down_payment: 10000,
        customer_info: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+97412345678',
          _origin: 'ai',
          _createdByAI: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCreatedApplication,
        error: null,
      });

      const result = await supabaseApiService.createApplication(applicationData);

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      
      // Verify the insert was called with correct data
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('under_review');
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
    });

    it('should store origin metadata in customer_info', async () => {
      const applicationData = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+97412345678',
        vehicleId: 'vehicle-123',
        status: 'under_review' as const,
        loanAmount: 50000,
        downPayment: 10000,
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+97412345678',
        },
        origin: 'ai' as const,
      };

      const mockCreatedApplication = {
        id: 'app-456',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        status: 'under_review',
        customer_info: {
          firstName: 'John',
          lastName: 'Doe',
          _origin: 'ai',
          _createdByAI: true,
        },
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCreatedApplication,
        error: null,
      });

      const result = await supabaseApiService.createApplication(applicationData);

      expect(result.status).toBe('SUCCESS');
      
      // Verify origin was stored in customer_info
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
    });

    it('should handle errors when creating application', async () => {
      const applicationData = BloxAIClient.createApplicationFromAIData({
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
        data: null,
        error: { message: 'Database error' },
      });

      const result = await supabaseApiService.createApplication(applicationData);

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('error');
    });

    it('should format documents correctly when creating application', async () => {
      const applicationData = BloxAIClient.createApplicationFromAIData({
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+97412345678',
        },
        vehicleId: 'vehicle-123',
        loanAmount: 50000,
        downPayment: 10000,
        documents: [
          {
            file_id: 'file-1',
            document_type: 'Qatar_national_id',
            name: 'ID.pdf',
          },
          {
            document_type: 'Bank_statements',
            name: 'Statement.pdf',
            url: 'https://example.com/statement.pdf',
          },
        ],
      });

      const mockCreatedApplication = {
        id: 'app-789',
        customer_name: 'John Doe',
        status: 'under_review',
        documents: applicationData.documents,
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCreatedApplication,
        error: null,
      });

      const result = await supabaseApiService.createApplication(applicationData);

      expect(result.status).toBe('SUCCESS');
      
      // Verify documents were formatted
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(Array.isArray(insertCall.documents)).toBe(true);
      expect(insertCall.documents.length).toBe(2);
      expect(insertCall.documents[0].category).toBeDefined();
      expect(insertCall.documents[0].type).toBe('application/pdf');
    });
  });

  describe('Integration: Complete AI Application Flow', () => {
    it('should create complete application from AI-collected data', async () => {
      // Simulate data collected by AI chatbot
      const aiCollectedData = {
        customerInfo: {
          firstName: 'Mohammed',
          lastName: 'Al-Thani',
          email: 'mohammed@example.com',
          phone: '+97470000000',
          dateOfBirth: '1985-05-15',
          nationality: 'Qatari',
          qid: '12345678901',
          employment: {
            company: 'Qatar Company',
            position: 'Manager',
            employmentType: 'employed',
            employmentDuration: '5 years',
            salary: 20000,
          },
          income: {
            monthlyIncome: 20000,
            totalIncome: 240000,
          },
        },
        vehicleId: 'vehicle-555',
        offerId: 'offer-777',
        loanAmount: 100000,
        downPayment: 20000,
        installmentPlan: {
          tenure: '48 months',
          interval: 'Monthly',
          monthlyAmount: 2500,
          totalAmount: 120000,
        },
        documents: [
          {
            file_id: 'file-id-1',
            document_type: 'Qatar_national_id',
            name: 'Qatar ID.pdf',
          },
          {
            file_id: 'file-id-2',
            document_type: 'Bank_statements',
            name: 'Bank Statement.pdf',
          },
        ],
      };

      // Format data using helper
      const formattedData = BloxAIClient.createApplicationFromAIData(aiCollectedData);

      // Verify formatting
      expect(formattedData.status).toBe('under_review');
      expect(formattedData.origin).toBe('ai');
      expect(formattedData.customerInfo._origin).toBe('ai');
      expect(formattedData.customerInfo._createdByAI).toBe(true);
      expect(formattedData.customerName).toBe('Mohammed Al-Thani');

      // Mock successful creation
      const mockCreatedApplication = {
        id: 'app-999',
        customer_name: 'Mohammed Al-Thani',
        customer_email: 'mohammed@example.com',
        status: 'under_review',
        customer_info: formattedData.customerInfo,
        created_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCreatedApplication,
        error: null,
      });

      // Create application
      const result = await supabaseApiService.createApplication(formattedData);

      // Verify success
      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      
      // Verify data sent to database
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('under_review');
      expect(insertCall.customer_info._origin).toBe('ai');
      expect(insertCall.customer_info._createdByAI).toBe(true);
      expect(insertCall.customer_name).toBe('Mohammed Al-Thani');
    });
  });
});
