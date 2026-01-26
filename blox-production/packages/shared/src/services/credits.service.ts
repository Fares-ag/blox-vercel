import type { ApiResponse } from '../models/api.model';
import { supabase } from './supabase.service';

export interface UserCredits {
  userEmail: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreditTransaction {
  id: string;
  userEmail: string;
  transactionType: 'add' | 'subtract' | 'set' | 'topup' | 'payment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  adminEmail?: string;
  paymentTransactionId?: string;
  createdAt: string;
}

export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  message: string;
}

class CreditsService {
  /**
   * Get user credits balance (customer can read own, admin can read any)
   */
  async getUserCredits(userEmail: string): Promise<ApiResponse<UserCredits>> {
    try {
      // Use maybeSingle() so "no rows" does NOT produce a 406 response in the browser.
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to get user credits');
      }

      if (!data) {
        // Return zero balance if no record exists
        return {
          status: 'SUCCESS',
          data: {
            userEmail,
            balance: 0,
          },
          message: 'Credits retrieved successfully',
        };
      }

      return {
        status: 'SUCCESS',
        data: {
          userEmail: data.user_email,
          balance: parseFloat(data.balance) || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: 'Credits retrieved successfully',
      };
    } catch (error: any) {
      console.error('Failed to get user credits:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to get user credits',
        data: null as any,
      };
    }
  }

  /**
   * Add credits to user (admin only via RPC)
   */
  async addCredits(
    userEmail: string,
    amount: number,
    description?: string,
    adminEmail?: string
  ): Promise<ApiResponse<CreditOperationResult>> {
    try {
      if (amount <= 0) {
        return {
          status: 'ERROR',
          message: 'Amount must be greater than 0',
          data: undefined,
        };
      }

      const { data, error } = await supabase.rpc('admin_add_user_credits', {
        p_user_email: userEmail,
        p_amount: amount,
        p_description: description || null,
        p_admin_email: adminEmail || null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to add credits');
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return {
            status: 'SUCCESS',
            data: {
              success: result.success,
              newBalance: parseFloat(result.new_balance) || 0,
              message: result.message || 'Credits added successfully',
            },
            message: result.message || 'Credits added successfully',
          };
        } else {
          return {
            status: 'ERROR',
            message: result.message || 'Failed to add credits',
            data: {
              success: false,
              newBalance: 0,
              message: result.message || 'Failed to add credits',
            },
          };
        }
      }

      return {
        status: 'ERROR',
        message: 'Unexpected response from server',
        data: undefined,
      };
    } catch (error: any) {
      console.error('Failed to add credits:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to add credits',
        data: undefined,
      };
    }
  }

  /**
   * Subtract credits from user (admin only via RPC)
   */
  async subtractCredits(
    userEmail: string,
    amount: number,
    description?: string,
    adminEmail?: string
  ): Promise<ApiResponse<CreditOperationResult>> {
    try {
      if (amount <= 0) {
        return {
          status: 'ERROR',
          message: 'Amount must be greater than 0',
          data: undefined,
        };
      }

      const { data, error } = await supabase.rpc('admin_subtract_user_credits', {
        p_user_email: userEmail,
        p_amount: amount,
        p_description: description || null,
        p_admin_email: adminEmail || null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to subtract credits');
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return {
            status: 'SUCCESS',
            data: {
              success: result.success,
              newBalance: parseFloat(result.new_balance) || 0,
              message: result.message || 'Credits subtracted successfully',
            },
            message: result.message || 'Credits subtracted successfully',
          };
        } else {
          return {
            status: 'ERROR',
            message: result.message || 'Failed to subtract credits',
            data: {
              success: false,
              newBalance: 0,
              message: result.message || 'Failed to subtract credits',
            },
          };
        }
      }

      return {
        status: 'ERROR',
        message: 'Unexpected response from server',
        data: undefined,
      };
    } catch (error: any) {
      console.error('Failed to subtract credits:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to subtract credits',
        data: undefined,
      };
    }
  }

  /**
   * Set user credits to a specific amount (admin only via RPC)
   */
  async setCredits(
    userEmail: string,
    amount: number,
    description?: string,
    adminEmail?: string
  ): Promise<ApiResponse<CreditOperationResult>> {
    try {
      if (amount < 0) {
        return {
          status: 'ERROR',
          message: 'Amount cannot be negative',
          data: undefined,
        };
      }

      const { data, error } = await supabase.rpc('admin_set_user_credits', {
        p_user_email: userEmail,
        p_amount: amount,
        p_description: description || null,
        p_admin_email: adminEmail || null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to set credits');
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return {
            status: 'SUCCESS',
            data: {
              success: result.success,
              newBalance: parseFloat(result.new_balance) || 0,
              message: result.message || 'Credits set successfully',
            },
            message: result.message || 'Credits set successfully',
          };
        } else {
          return {
            status: 'ERROR',
            message: result.message || 'Failed to set credits',
            data: {
              success: false,
              newBalance: 0,
              message: result.message || 'Failed to set credits',
            },
          };
        }
      }

      return {
        status: 'ERROR',
        message: 'Unexpected response from server',
        data: undefined,
      };
    } catch (error: any) {
      console.error('Failed to set credits:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to set credits',
        data: undefined,
      };
    }
  }

  /**
   * Get credit transactions for a user (admin only via RPC)
   */
  async getUserCreditTransactions(
    userEmail: string,
    limit: number = 50
  ): Promise<ApiResponse<CreditTransaction[]>> {
    try {
      const { data, error } = await supabase.rpc('admin_get_user_credit_transactions', {
        p_user_email: userEmail,
        p_limit: limit,
      });

      if (error) {
        throw new Error(error.message || 'Failed to get credit transactions');
      }

      const transactions: CreditTransaction[] = (data || []).map((row: any) => ({
        id: row.id,
        userEmail: row.user_email,
        transactionType: row.transaction_type,
        amount: parseFloat(row.amount) || 0,
        balanceBefore: parseFloat(row.balance_before) || 0,
        balanceAfter: parseFloat(row.balance_after) || 0,
        description: row.description,
        adminEmail: row.admin_email,
        createdAt: row.created_at,
      }));

      return {
        status: 'SUCCESS',
        data: transactions,
        message: 'Credit transactions retrieved successfully',
      };
    } catch (error: any) {
      console.error('Failed to get credit transactions:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to get credit transactions',
        data: [],
      };
    }
  }
}

export const creditsService = new CreditsService();
