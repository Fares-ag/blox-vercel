import { supabase, handleSupabaseResponse, mapSupabaseRow } from './supabase.service';
import { supabaseCache } from './supabase-cache.service';
import type { 
  Application, 
  Company,
  Product, 
  Offer, 
  Package, 
  Promotion,
  InsuranceRate,
  Ledger,
  User,
  PaymentDeferral
} from '../models';
import type { ApiResponse } from '../models/api.model';

class SupabaseApiService {
  // Helper to detect and format DNS errors
  private detectDnsError(error: any): string | null {
    const errorMessage = error?.message || error?.toString() || '';
    const errorString = String(errorMessage).toLowerCase();
    
    if (errorString.includes('err_name_not_resolved') || 
        errorString.includes('failed to fetch') ||
        errorString.includes('networkerror') ||
        errorString.includes('network request failed')) {
      return 'DNS Resolution Error: Cannot connect to Supabase. ' +
        'Your DNS is redirecting *.supabase.co to *.supabase.co.q-auto.com. ' +
        'SOLUTION: Change DNS to 8.8.8.8 (Google DNS) or contact IT to whitelist *.supabase.co. ' +
        'See FIX_DNS_ERROR.md for detailed instructions.';
    }
    return null;
  }

  // ==================== PRODUCTS ====================
  async getProducts(): Promise<ApiResponse<Product[]>> {
    const cacheKey = 'products:all';
    const cached = supabaseCache.get<Product[]>(cacheKey);
    if (cached) {
      return {
        status: 'SUCCESS',
        data: cached,
        message: 'Products fetched successfully (cached)'
      };
    }

    try {
      const response = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      const products = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Product>);
      
      // Cache for 5 minutes
      supabaseCache.set(cacheKey, products, 5 * 60 * 1000);
      
      return {
        status: 'SUCCESS',
        data: products,
        message: 'Products fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch products',
        data: []
      };
    }
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    try {
      const response = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      const product = mapSupabaseRow<Product>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: product,
        message: 'Product fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch product',
        data: {} as Product
      };
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    try {
      const productData = {
        make: product.make,
        model: product.model,
        trim: product.trim,
        model_year: product.modelYear,
        condition: product.condition,
        engine: product.engine,
        color: product.color,
        mileage: product.mileage,
        price: product.price,
        status: product.status,
        images: product.images || [],
        documents: product.documents || [],
        attributes: product.attributes || [],
        description: product.description,
        chassis_number: product.chassisNumber,
        engine_number: product.engineNumber
      };

      const response = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      const createdProduct = mapSupabaseRow<Product>(handleSupabaseResponse<any>(response));

      // Invalidate products cache so newly created products appear immediately
      supabaseCache.invalidate('products:all');
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('create', 'product', {
          resourceId: createdProduct.id,
          resourceName: `${createdProduct.make} ${createdProduct.model} ${createdProduct.modelYear}`,
          description: `Created product: ${createdProduct.make} ${createdProduct.model}`,
          metadata: {
            make: createdProduct.make,
            model: createdProduct.model,
            price: createdProduct.price,
            status: createdProduct.status,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: createdProduct,
        message: 'Product created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create product',
        data: {} as Product
      };
    }
  }

  async bulkUpdateProductStatus(ids: string[], status: 'active' | 'inactive'): Promise<ApiResponse<{ updated: number }>> {
    try {
      if (!ids || ids.length === 0) {
        throw new Error('No product IDs provided');
      }

      const { error, count } = await supabase
        .from('products')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .in('id', ids);

      if (error) throw error;

      // Clear cache after bulk update
      supabaseCache.invalidate('products:all');

      return {
        status: 'SUCCESS',
        data: { updated: count || ids.length },
        message: `Successfully updated ${count || ids.length} product(s) to ${status}`
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to bulk update products',
        data: { updated: 0 }
      };
    }
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (product.make !== undefined) updateData.make = product.make;
      if (product.model !== undefined) updateData.model = product.model;
      if (product.trim !== undefined) updateData.trim = product.trim;
      if (product.modelYear !== undefined) updateData.model_year = product.modelYear;
      if (product.condition !== undefined) updateData.condition = product.condition;
      if (product.engine !== undefined) updateData.engine = product.engine;
      if (product.color !== undefined) updateData.color = product.color;
      if (product.mileage !== undefined) updateData.mileage = product.mileage;
      if (product.price !== undefined) updateData.price = product.price;
      if (product.status !== undefined) updateData.status = product.status;
      if (product.images !== undefined) updateData.images = product.images;
      if (product.documents !== undefined) updateData.documents = product.documents;
      if (product.attributes !== undefined) updateData.attributes = product.attributes;
      if (product.description !== undefined) updateData.description = product.description;
      if (product.chassisNumber !== undefined) updateData.chassis_number = product.chassisNumber;
      if (product.engineNumber !== undefined) updateData.engine_number = product.engineNumber;

      const response = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedProduct = mapSupabaseRow<Product>(handleSupabaseResponse<any>(response));
      
      // Invalidate products cache
      supabaseCache.invalidate('products:all');
      supabaseCache.invalidate(`products:${id}`);
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('update', 'product', {
          resourceId: id,
          resourceName: `${updatedProduct.make} ${updatedProduct.model} ${updatedProduct.modelYear}`,
          description: `Updated product: ${updatedProduct.make} ${updatedProduct.model}`,
          metadata: {
            changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
            status: updatedProduct.status,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: updatedProduct,
        message: 'Product updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update product',
        data: {} as Product
      };
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      handleSupabaseResponse(response);
      
      return {
        status: 'SUCCESS',
        message: 'Product deleted successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete product'
      };
    }
  }

  // ==================== APPLICATIONS ====================
  async getApplications(): Promise<ApiResponse<Application[]>> {
    const cacheKey = 'applications:all';
    const cached = supabaseCache.get<Application[]>(cacheKey);
    if (cached) {
      return {
        status: 'SUCCESS',
        data: cached,
        message: 'Applications fetched successfully (cached)'
      };
    }

    try {
      const response = await supabase
        .from('applications')
        .select(`
          *,
          vehicle:products!applications_vehicle_id_fkey(*),
          offer:offers!applications_offer_id_fkey(*)
        `)
        .order('created_at', { ascending: false });
      
      const applications = handleSupabaseResponse<any[]>(response).map((app: any) => {
        const mapped = mapSupabaseRow<Application>(app);
        if (app.vehicle) {
          mapped.vehicle = mapSupabaseRow<Product>(app.vehicle);
        }
        if (app.offer) {
          mapped.offer = mapSupabaseRow<Offer>(app.offer);
        }
        return mapped;
      });

      // Cache for 2 minutes (applications change more frequently)
      supabaseCache.set(cacheKey, applications, 2 * 60 * 1000);
      
      return {
        status: 'SUCCESS',
        data: applications,
        message: 'Applications fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch applications',
        data: []
      };
    }
  }

  async getApplicationById(id: string): Promise<ApiResponse<Application>> {
    try {
      const response = await supabase
        .from('applications')
        .select(`
          *,
          vehicle:products!applications_vehicle_id_fkey(*),
          offer:offers!applications_offer_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      const app = handleSupabaseResponse<any>(response);
      const mapped = mapSupabaseRow<Application>(app);
      if (app.vehicle) {
        mapped.vehicle = mapSupabaseRow<Product>(app.vehicle);
      }
      if (app.offer) {
        mapped.offer = mapSupabaseRow<Offer>(app.offer);
      }
      
      return {
        status: 'SUCCESS',
        data: mapped,
        message: 'Application fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch application',
        data: {} as Application
      };
    }
  }

  async createApplication(application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Application>> {
    try {
      const appData: any = {
        customer_name: application.customerName,
        customer_email: application.customerEmail,
        customer_phone: application.customerPhone,
        customer_info: (application as any).customerInfo || null,
        vehicle_id: application.vehicleId,
        offer_id: application.offerId,
        status: application.status,
        loan_amount: application.loanAmount,
        down_payment: application.downPayment,
        installment_plan: application.installmentPlan || null,
        documents: application.documents || [],
        submission_date: application.submissionDate || null,
        contract_generated: application.contractGenerated || false,
        contract_signed: application.contractSigned || false,
        contract_data: application.contractData || null,
        contract_review_comments: application.contractReviewComments || null,
        contract_review_date: application.contractReviewDate || null,
        contract_signature: application.contractSignature || null,
        resubmission_comments: application.resubmissionComments || null,
        resubmission_date: application.resubmissionDate || null,
        cancelled_by_customer: application.cancelledByCustomer || false,
        cancelled_at: application.cancelledAt || null,
        blox_membership: application.bloxMembership || null
      };

      // Store origin in customer_info metadata if provided
      if (application.origin) {
        if (!appData.customer_info) {
          appData.customer_info = {};
        }
        if (typeof appData.customer_info === 'object') {
          appData.customer_info._origin = application.origin;
          appData.customer_info._createdByAI = application.origin === 'ai';
        }
      }

      const response = await supabase
        .from('applications')
        .insert(appData)
        .select()
        .single();
      
      const createdApp = mapSupabaseRow<Application>(handleSupabaseResponse<any>(response));
      
      // Invalidate applications cache
      supabaseCache.invalidate('applications:all');
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('create', 'application', {
          resourceId: createdApp.id,
          resourceName: `Application #${createdApp.id.slice(0, 8)}`,
          description: `Created application for ${application.customerName} (${application.customerEmail})`,
          metadata: {
            status: application.status,
            loanAmount: application.loanAmount,
            origin: application.origin || 'manual',
            vehicleId: application.vehicleId,
          },
        });
      } catch (error) {
        // Activity logging should not break the app
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: createdApp,
        message: 'Application created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create application',
        data: {} as Application
      };
    }
  }

  async updateApplication(id: string, application: Partial<Application>): Promise<ApiResponse<Application>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (application.customerName !== undefined) updateData.customer_name = application.customerName;
      if (application.customerEmail !== undefined) updateData.customer_email = application.customerEmail;
      if (application.customerPhone !== undefined) updateData.customer_phone = application.customerPhone;
      if ((application as any).customerInfo !== undefined) updateData.customer_info = (application as any).customerInfo;
      if (application.vehicleId !== undefined) updateData.vehicle_id = application.vehicleId;
      if (application.offerId !== undefined) updateData.offer_id = application.offerId;
      if (application.companyId !== undefined) updateData.company_id = application.companyId;
      if (application.status !== undefined) updateData.status = application.status;
      if (application.loanAmount !== undefined) updateData.loan_amount = application.loanAmount;
      if (application.downPayment !== undefined) updateData.down_payment = application.downPayment;
      if (application.installmentPlan !== undefined) updateData.installment_plan = application.installmentPlan;
      if (application.documents !== undefined) {
        // Ensure documents is properly formatted as JSONB
        updateData.documents = Array.isArray(application.documents) 
          ? JSON.parse(JSON.stringify(application.documents)) 
          : application.documents;
      }
      if (application.submissionDate !== undefined) updateData.submission_date = application.submissionDate;
      if (application.contractGenerated !== undefined) updateData.contract_generated = application.contractGenerated;
      if (application.contractSigned !== undefined) updateData.contract_signed = application.contractSigned;
      if (application.contractData !== undefined) updateData.contract_data = application.contractData;
      if (application.contractReviewComments !== undefined) updateData.contract_review_comments = application.contractReviewComments;
      if (application.contractReviewDate !== undefined) updateData.contract_review_date = application.contractReviewDate;
      if (application.contractSignature !== undefined) updateData.contract_signature = application.contractSignature;
      if (application.resubmissionComments !== undefined) updateData.resubmission_comments = application.resubmissionComments;
      if (application.resubmissionDate !== undefined) updateData.resubmission_date = application.resubmissionDate;
      if (application.cancelledByCustomer !== undefined) updateData.cancelled_by_customer = application.cancelledByCustomer;
      if (application.cancelledAt !== undefined) updateData.cancelled_at = application.cancelledAt;
      if (application.bloxMembership !== undefined) updateData.blox_membership = application.bloxMembership;

      // Log what we're updating
      console.log('🔄 Updating application:', { id, updateData });
      
      // First, perform the update
      const updateResponse = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id);
      
      if (updateResponse.error) {
        console.error('❌ Update error:', updateResponse.error);
        throw new Error(updateResponse.error.message || 'Failed to update application');
      }
      
      console.log('✅ Update successful, rows affected:', updateResponse.data);

      // Then, fetch the updated application separately to avoid .single() issues
      const fetchResponse = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchResponse.error) {
        // If fetch fails, try without .single() and take first result
        const fetchResponseArray = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .limit(1);
        
        if (fetchResponseArray.error || !fetchResponseArray.data || fetchResponseArray.data.length === 0) {
          throw new Error(fetchResponse.error?.message || 'Failed to fetch updated application');
        }
        
        const updatedApp = mapSupabaseRow<Application>(fetchResponseArray.data[0]);
        
        // Invalidate applications cache
        supabaseCache.invalidate('applications:all');
        supabaseCache.invalidate(`applications:${id}`);
        
        // Log activity
        try {
          const { activityTrackingService } = await import('./activity-tracking.service');
          const changes: Record<string, any> = {};
          if (application.status !== undefined) changes.status = application.status;
          if (application.contractSigned !== undefined) changes.contractSigned = application.contractSigned;
          if (application.contractReviewComments !== undefined) changes.contractReviewComments = application.contractReviewComments;
          
          await activityTrackingService.logActivity('update', 'application', {
            resourceId: id,
            resourceName: `Application #${id.slice(0, 8)}`,
            description: `Updated application${application.status ? ` - status changed to ${application.status}` : ''}`,
            metadata: {
              changes,
              customerEmail: updatedApp.customerEmail,
            },
          });
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
        
        return {
          status: 'SUCCESS',
          data: updatedApp,
          message: 'Application updated successfully'
        };
      }
      
      const updatedApp = mapSupabaseRow<Application>(handleSupabaseResponse<any>(fetchResponse));
      
      // Invalidate applications cache
      supabaseCache.invalidate('applications:all');
      supabaseCache.invalidate(`applications:${id}`);
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        const changes: Record<string, any> = {};
        if (application.status !== undefined) changes.status = application.status;
        if (application.contractSigned !== undefined) changes.contractSigned = application.contractSigned;
        if (application.contractReviewComments !== undefined) changes.contractReviewComments = application.contractReviewComments;
        
        await activityTrackingService.logActivity('update', 'application', {
          resourceId: id,
          resourceName: `Application #${id.slice(0, 8)}`,
          description: `Updated application${application.status ? ` - status changed to ${application.status}` : ''}`,
          metadata: {
            changes,
            customerEmail: updatedApp.customerEmail,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: updatedApp,
        message: 'Application updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update application',
        data: {} as Application
      };
    }
  }

  /**
   * Delete an application from the database
   * @param id - The application ID to delete
   */
  async deleteApplication(id: string): Promise<ApiResponse<void>> {
    try {
      if (!id || id.trim() === '') {
        console.error('❌ Delete application: Invalid ID provided', id);
        return {
          status: 'ERROR',
          message: 'Invalid application ID',
          data: undefined
        };
      }

      console.log('🗑️ Deleting application from database:', id);

      // First, check if the application exists
      const { data: existingApp, error: checkError } = await supabase
        .from('applications')
        .select('id, status')
        .eq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error checking application existence:', checkError);
        const dnsError = this.detectDnsError(checkError);
        if (dnsError) {
          throw new Error(dnsError);
        }
        throw new Error(checkError.message || 'Failed to check application existence');
      }

      if (!existingApp) {
        console.warn('⚠️ Application not found:', id);
        return {
          status: 'ERROR',
          message: 'Application not found or already deleted',
          data: undefined
        };
      }

      console.log('✅ Application exists, proceeding with deletion:', existingApp);

      // Try using RPC function first (bypasses RLS issues)
      // If that fails, fall back to direct delete
      let deleteSuccess = false;
      let deleteError: any = null;
      
      try {
        console.log('🔄 Attempting delete via RPC function...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('admin_delete_application', { app_id: id });
        
        if (rpcError) {
          console.warn('⚠️ RPC delete failed, trying direct delete:', rpcError);
          deleteError = rpcError;
        } else if (rpcData === true) {
          console.log('✅ Application deleted successfully via RPC function');
          deleteSuccess = true;
        }
      } catch (rpcException) {
        console.warn('⚠️ RPC function may not exist, trying direct delete:', rpcException);
      }

      // If RPC didn't work, try direct delete
      if (!deleteSuccess) {
        console.log('🔄 Attempting direct delete...');
        const { error, data, count } = await supabase
          .from('applications')
          .delete()
          .eq('id', id)
          .select('id');
        
        deleteError = error;

        console.log('Direct delete response:', { error, data, count, hasData: !!data, dataLength: data?.length });
        
        const deletedCount = data?.length || count || 0;
        if (deletedCount > 0) {
          deleteSuccess = true;
          console.log(`✅ Application deleted successfully via direct delete. ${deletedCount} row(s) deleted.`);
        }
      }

      if (!deleteSuccess) {
        if (deleteError) {
          console.error('❌ Supabase delete error:', deleteError);
          console.error('Error details:', {
            message: deleteError.message,
            code: deleteError.code,
            details: deleteError.details,
            hint: deleteError.hint
          });
          
          // Check for RLS policy violation
          if (deleteError.code === '42501' || deleteError.message?.includes('row-level security') || deleteError.message?.includes('policy')) {
            throw new Error(`Permission denied: ${deleteError.message}. Make sure you are logged in as an admin user and have delete permissions.`);
          }
          
          const dnsError = this.detectDnsError(deleteError);
          if (dnsError) {
            throw new Error(dnsError);
          }
          throw new Error(deleteError.message || `Failed to delete application: ${deleteError.code || 'Unknown error'}`);
        } else {
          // No error but also no success - RLS is likely blocking silently
          // Verify if application still exists
          const { data: verifyData, error: verifyError } = await supabase
            .from('applications')
            .select('id, status')
            .eq('id', id)
            .single();
          
          if (verifyData) {
            // Application still exists - RLS is likely blocking the delete
            console.error('❌ Delete failed: Application still exists. RLS policy may be blocking deletion.');
            throw new Error('Delete operation failed: No rows were deleted. This may be due to insufficient permissions or RLS policy restrictions. Please run FIX_APPLICATION_DELETE_RLS.sql in Supabase SQL Editor to fix this issue.');
          } else if (verifyError?.code === 'PGRST116') {
            // Application doesn't exist - it was already deleted
            console.log('✅ Application was already deleted');
            deleteSuccess = true;
          } else {
            // Some other error checking
            console.warn('⚠️ Could not verify deletion status:', verifyError);
            throw new Error('Delete operation completed but could not verify result. Please check if the application was deleted.');
          }
        }
      }

      // Invalidate applications cache - clear all application-related cache
      supabaseCache.invalidate('applications:all');
      supabaseCache.invalidate(`applications:${id}`);
      // Also invalidate any pattern matches to ensure fresh data
      supabaseCache.invalidatePattern('^applications:');
      console.log('✅ Cache invalidated for all applications');

      return {
        status: 'SUCCESS',
        data: undefined,
        message: 'Application deleted successfully'
      };
    } catch (error: any) {
      console.error('❌ Exception in deleteApplication:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete application. Please check the console for details.',
        data: undefined
      };
    }
  }

  /**
   * Mark a specific installment as paid (fully or partially) in both payment_schedules and the application's installmentPlan.
   * This keeps the dashboard (which reads from payment_schedules) and the frontend views (which read from
   * application.installmentPlan.schedule) in sync.
   * 
   * @param applicationId - The application ID
   * @param paymentDueDate - The due date of the payment
   * @param paidAmount - The amount being paid (can be less than full amount for partial payments)
   * @param receiptUrl - Optional receipt URL for the payment
   */
  async markInstallmentAsPaid(
    applicationId: string,
    paymentDueDate: string,
    paidAmount: number,
    receiptUrl?: string
  ): Promise<ApiResponse<Application>> {
    try {
      const paidAt = new Date().toISOString();

      // 1) Get the application to find the payment schedule
      const appResponse = await this.getApplicationById(applicationId);
      if (appResponse.status !== 'SUCCESS' || !appResponse.data) {
        return {
          status: 'ERROR',
          message: appResponse.message || 'Application not found',
          data: {} as Application,
        };
      }

      const app = appResponse.data;
      const installmentPlan = app.installmentPlan;

      if (!installmentPlan || !Array.isArray(installmentPlan.schedule)) {
        return {
          status: 'ERROR',
          message: 'Application has no installment schedule',
          data: {} as Application,
        };
      }

      // Find the payment in the schedule by dueDate
      const paymentIndex = installmentPlan.schedule.findIndex(
        (payment: any) => payment.dueDate === paymentDueDate
      );

      if (paymentIndex === -1) {
        return {
          status: 'ERROR',
          message: 'Payment not found in schedule',
          data: {} as Application,
        };
      }

      const payment = installmentPlan.schedule[paymentIndex];
      const originalAmount = Number(payment.amount) || 0;
      const currentPaidAmount = Number(payment.paidAmount) || 0;
      const newPaidAmount = currentPaidAmount + paidAmount;
      const remainingAmount = originalAmount - newPaidAmount;
      
      // Determine status based on payment amount
      let newStatus: string;
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = payment.status || 'due';
      }

      // 2) Update payment_schedules table
      try {
        const { data: existingRows, error: selectError } = await supabase
          .from('payment_schedules')
          .select('id, paid_amount, paid_date')
          .eq('application_id', applicationId)
          .eq('due_date', paymentDueDate)
          .limit(1);

        if (selectError) {
          console.error('❌ markInstallmentAsPaid: select from payment_schedules failed', selectError);
        } else if (existingRows && existingRows.length > 0) {
          const existingId = existingRows[0].id;
          const existingPaidAmount = Number(existingRows[0].paid_amount) || 0;
          const updatedPaidAmount = existingPaidAmount + paidAmount;
          const updatedRemainingAmount = originalAmount - updatedPaidAmount;

          const { error: updateError } = await supabase
            .from('payment_schedules')
            .update({
              status: updatedRemainingAmount <= 0 ? 'paid' : 'partially_paid',
              paid_date: updatedRemainingAmount <= 0 ? paidAt : (existingRows[0].paid_date || paidAt),
              paid_amount: updatedPaidAmount,
              remaining_amount: Math.max(0, updatedRemainingAmount),
              updated_at: paidAt,
            })
            .eq('id', existingId);

          if (updateError) {
            console.error('❌ markInstallmentAsPaid: update payment_schedules failed', updateError);
          }
        } else {
          const { error: insertError } = await supabase
            .from('payment_schedules')
            .insert({
              application_id: applicationId,
              due_date: paymentDueDate,
              amount: originalAmount,
              paid_amount: paidAmount,
              remaining_amount: Math.max(0, remainingAmount),
              status: remainingAmount <= 0 ? 'paid' : 'partially_paid',
              paid_date: remainingAmount <= 0 ? paidAt : undefined,
              created_at: paidAt,
              updated_at: paidAt,
            });

          if (insertError) {
            console.error('❌ markInstallmentAsPaid: insert into payment_schedules failed', insertError);
          }
        }
      } catch (scheduleError) {
        console.error('❌ markInstallmentAsPaid: unexpected error updating payment_schedules', scheduleError);
      }

      // 3) Update the application installmentPlan JSON
      const updatedSchedule = [...installmentPlan.schedule];
      updatedSchedule[paymentIndex] = {
        ...payment,
        status: newStatus as any,
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        paidDate: remainingAmount <= 0 ? paidAt : (payment.paidDate || paidAt),
        receiptUrl: receiptUrl || payment.receiptUrl,
        receiptGeneratedAt: receiptUrl ? paidAt : (payment.receiptGeneratedAt || (remainingAmount <= 0 ? paidAt : undefined)),
      };

      const updateResult = await this.updateApplication(applicationId, {
        installmentPlan: {
          ...installmentPlan,
          schedule: updatedSchedule,
        } as any,
      });

      // updateApplication already invalidates caches and returns the fresh Application
      return updateResult;
    } catch (error: any) {
      console.error('❌ markInstallmentAsPaid: unexpected error', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to mark installment as paid',
        data: {} as Application,
      };
    }
  }

  // ==================== OFFERS ====================
  async getOffers(): Promise<ApiResponse<Offer[]>> {
    const cacheKey = 'offers:all';
    const cached = supabaseCache.get<Offer[]>(cacheKey);
    if (cached) {
      return {
        status: 'SUCCESS',
        data: cached,
        message: 'Offers fetched successfully (cached)'
      };
    }

    try {
      const response = await supabase
        .from('offers')
        .select(`
          *,
          insurance_rate:insurance_rates!offers_insurance_rate_id_fkey(*)
        `)
        .order('created_at', { ascending: false });
      
      const offers = handleSupabaseResponse<any[]>(response).map((offer: any) => {
        const mapped = mapSupabaseRow<Offer>(offer);
        if (offer.insurance_rate) {
          mapped.insuranceRate = mapSupabaseRow<InsuranceRate>(offer.insurance_rate);
        }
        return mapped;
      });

      // Cache for 5 minutes
      supabaseCache.set(cacheKey, offers, 5 * 60 * 1000);
      
      return {
        status: 'SUCCESS',
        data: offers,
        message: 'Offers fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch offers',
        data: []
      };
    }
  }

  async getOfferById(id: string): Promise<ApiResponse<Offer>> {
    try {
      const response = await supabase
        .from('offers')
        .select(`
          *,
          insurance_rate:insurance_rates!offers_insurance_rate_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      const offer = handleSupabaseResponse<any>(response);
      const mapped = mapSupabaseRow<Offer>(offer);
      if (offer.insurance_rate) {
        mapped.insuranceRate = mapSupabaseRow<InsuranceRate>(offer.insurance_rate);
      }
      
      return {
        status: 'SUCCESS',
        data: mapped,
        message: 'Offer fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch offer',
        data: {} as Offer
      };
    }
  }

  async createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Offer>> {
    try {
      const offerData: any = {
        name: offer.name,
        annual_rent_rate: offer.annualRentRate,
        annual_rent_rate_funder: offer.annualRentRateFunder,
        annual_insurance_rate: offer.annualInsuranceRate || null,
        annual_insurance_rate_provider: offer.annualInsuranceRateProvider || null,
        is_default: offer.isDefault,
        status: offer.status,
        is_admin: offer.isAdmin
      };
      
      // Only include insurance_rate_id if it's provided and not empty
      // This prevents foreign key errors if the insurance rate doesn't exist
      if (offer.insuranceRateId && offer.insuranceRateId.trim() !== '') {
        offerData.insurance_rate_id = offer.insuranceRateId;
      } else {
        offerData.insurance_rate_id = null;
      }

      const response = await supabase
        .from('offers')
        .insert(offerData)
        .select()
        .single();
      
      if (response.error) {
        console.error('❌ Supabase createOffer error:', response.error);
        throw new Error(response.error.message || 'Failed to create offer');
      }
      
      const createdOffer = mapSupabaseRow<Offer>(response.data);
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('create', 'offer', {
          resourceId: createdOffer.id,
          resourceName: createdOffer.name,
          description: `Created offer: ${createdOffer.name}`,
          metadata: {
            name: createdOffer.name,
            annualRentRate: createdOffer.annualRentRate,
            isDefault: createdOffer.isDefault,
            status: createdOffer.status,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: createdOffer,
        message: 'Offer created successfully'
      };
    } catch (error: any) {
      console.error('❌ createOffer error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create offer',
        data: {} as Offer
      };
    }
  }

  async updateOffer(id: string, offer: Partial<Offer>): Promise<ApiResponse<Offer>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (offer.name !== undefined) updateData.name = offer.name;
      if (offer.annualRentRate !== undefined) updateData.annual_rent_rate = offer.annualRentRate;
      if (offer.annualRentRateFunder !== undefined) updateData.annual_rent_rate_funder = offer.annualRentRateFunder;
      if (offer.insuranceRateId !== undefined) updateData.insurance_rate_id = offer.insuranceRateId;
      if (offer.annualInsuranceRate !== undefined) updateData.annual_insurance_rate = offer.annualInsuranceRate;
      if (offer.annualInsuranceRateProvider !== undefined) updateData.annual_insurance_rate_provider = offer.annualInsuranceRateProvider;
      if (offer.isDefault !== undefined) updateData.is_default = offer.isDefault;
      if (offer.status !== undefined) updateData.status = offer.status;
      if (offer.isAdmin !== undefined) updateData.is_admin = offer.isAdmin;

      const response = await supabase
        .from('offers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedOffer = mapSupabaseRow<Offer>(handleSupabaseResponse<any>(response));
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('update', 'offer', {
          resourceId: id,
          resourceName: updatedOffer.name,
          description: `Updated offer: ${updatedOffer.name}`,
          metadata: {
            changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
            status: updatedOffer.status,
            isDefault: updatedOffer.isDefault,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: updatedOffer,
        message: 'Offer updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update offer',
        data: {} as Offer
      };
    }
  }

  // ==================== PACKAGES ====================
  async getPackages(): Promise<ApiResponse<Package[]>> {
    try {
      const response = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });
      
      const packages = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Package>);
      
      return {
        status: 'SUCCESS',
        data: packages,
        message: 'Packages fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch packages',
        data: []
      };
    }
  }

  async createPackage(pkg: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Package>> {
    try {
      const pkgData = {
        name: pkg.name,
        description: pkg.description,
        items: pkg.items || [],
        price: pkg.price,
        status: pkg.status
      };

      const response = await supabase
        .from('packages')
        .insert(pkgData)
        .select()
        .single();
      
      const createdPkg = mapSupabaseRow<Package>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: createdPkg,
        message: 'Package created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create package',
        data: {} as Package
      };
    }
  }

  async updatePackage(id: string, pkg: Partial<Package>): Promise<ApiResponse<Package>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (pkg.name !== undefined) updateData.name = pkg.name;
      if (pkg.description !== undefined) updateData.description = pkg.description;
      if (pkg.items !== undefined) updateData.items = pkg.items;
      if (pkg.price !== undefined) updateData.price = pkg.price;
      if (pkg.status !== undefined) updateData.status = pkg.status;

      const response = await supabase
        .from('packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedPkg = mapSupabaseRow<Package>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: updatedPkg,
        message: 'Package updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update package',
        data: {} as Package
      };
    }
  }

  // ==================== PROMOTIONS ====================
  async getPromotions(): Promise<ApiResponse<Promotion[]>> {
    try {
      const response = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      const promotions = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Promotion>);
      
      return {
        status: 'SUCCESS',
        data: promotions,
        message: 'Promotions fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch promotions',
        data: []
      };
    }
  }

  async createPromotion(promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Promotion>> {
    try {
      const promoData = {
        name: promotion.name,
        description: promotion.description,
        discount_percentage: promotion.discountType === 'percentage' ? promotion.discountValue : null,
        discount_amount: promotion.discountType === 'fixed' ? promotion.discountValue : null,
        start_date: promotion.startDate,
        end_date: promotion.endDate,
        status: promotion.status
      };

      const response = await supabase
        .from('promotions')
        .insert(promoData)
        .select()
        .single();
      
      const createdPromo = mapSupabaseRow<Promotion>(handleSupabaseResponse<any>(response));
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('create', 'promotion', {
          resourceId: createdPromo.id,
          resourceName: createdPromo.name,
          description: `Created promotion: ${createdPromo.name}`,
          metadata: {
            name: createdPromo.name,
            discountType: createdPromo.discountType,
            discountValue: createdPromo.discountValue,
            status: createdPromo.status,
            startDate: createdPromo.startDate,
            endDate: createdPromo.endDate,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: createdPromo,
        message: 'Promotion created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create promotion',
        data: {} as Promotion
      };
    }
  }

  async updatePromotion(id: string, promotion: Partial<Promotion>): Promise<ApiResponse<Promotion>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (promotion.name !== undefined) updateData.name = promotion.name;
      if (promotion.description !== undefined) updateData.description = promotion.description;
      if (promotion.discountType !== undefined && promotion.discountValue !== undefined) {
        if (promotion.discountType === 'percentage') {
          updateData.discount_percentage = promotion.discountValue;
          updateData.discount_amount = null;
        } else {
          updateData.discount_amount = promotion.discountValue;
          updateData.discount_percentage = null;
        }
      }
      if (promotion.startDate !== undefined) updateData.start_date = promotion.startDate;
      if (promotion.endDate !== undefined) updateData.end_date = promotion.endDate;
      if (promotion.status !== undefined) updateData.status = promotion.status;

      const response = await supabase
        .from('promotions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedPromo = mapSupabaseRow<Promotion>(handleSupabaseResponse<any>(response));
      
      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('update', 'promotion', {
          resourceId: id,
          resourceName: updatedPromo.name,
          description: `Updated promotion: ${updatedPromo.name}`,
          metadata: {
            changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
            status: updatedPromo.status,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
      
      return {
        status: 'SUCCESS',
        data: updatedPromo,
        message: 'Promotion updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update promotion',
        data: {} as Promotion
      };
    }
  }

  async deletePromotion(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      handleSupabaseResponse(response);
      
      return {
        status: 'SUCCESS',
        message: 'Promotion deleted successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete promotion'
      };
    }
  }

  async deleteOffer(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await supabase
        .from('offers')
        .delete()
        .eq('id', id);
      
      handleSupabaseResponse(response);
      
      return {
        status: 'SUCCESS',
        message: 'Offer deleted successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete offer'
      };
    }
  }

  async deletePackage(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await supabase
        .from('packages')
        .delete()
        .eq('id', id);
      
      handleSupabaseResponse(response);
      
      return {
        status: 'SUCCESS',
        message: 'Package deleted successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete package'
      };
    }
  }

  async getPackageById(id: string): Promise<ApiResponse<Package>> {
    try {
      const response = await supabase
        .from('packages')
        .select('*')
        .eq('id', id)
        .single();
      
      const pkg = mapSupabaseRow<Package>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: pkg,
        message: 'Package fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch package',
        data: {} as Package
      };
    }
  }

  async getPromotionById(id: string): Promise<ApiResponse<Promotion>> {
    try {
      const response = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();
      
      const promo = mapSupabaseRow<Promotion>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: promo,
        message: 'Promotion fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch promotion',
        data: {} as Promotion
      };
    }
  }

  // ==================== INSURANCE RATES ====================
  async getInsuranceRates(): Promise<ApiResponse<InsuranceRate[]>> {
    try {
      const response = await supabase
        .from('insurance_rates')
        .select('*')
        .order('created_at', { ascending: false });
      
      const rates = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<InsuranceRate>);
      
      return {
        status: 'SUCCESS',
        data: rates,
        message: 'Insurance rates fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch insurance rates',
        data: []
      };
    }
  }

  async getInsuranceRateById(id: string): Promise<ApiResponse<InsuranceRate>> {
    try {
      const response = await supabase
        .from('insurance_rates')
        .select('*')
        .eq('id', id)
        .single();
      
      const rate = mapSupabaseRow<InsuranceRate>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: rate,
        message: 'Insurance rate fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch insurance rate',
        data: {} as InsuranceRate
      };
    }
  }

  async createInsuranceRate(rate: Omit<InsuranceRate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<InsuranceRate>> {
    try {
      const rateData = {
        name: rate.name,
        description: rate.description || null,
        annual_rate: rate.annualRate,
        annual_rate_provider: rate.providerRate,
        coverage_type: rate.coverageType,
        status: rate.status || 'active',
        is_default: rate.isDefault || false,
        min_vehicle_value: rate.minVehicleValue || null,
        max_vehicle_value: rate.maxVehicleValue || null,
        min_tenure: rate.minTenure || null,
        max_tenure: rate.maxTenure || null,
      };

      const response = await supabase
        .from('insurance_rates')
        .insert(rateData)
        .select()
        .single();
      
      const createdRate = mapSupabaseRow<InsuranceRate>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: createdRate,
        message: 'Insurance rate created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create insurance rate',
        data: {} as InsuranceRate
      };
    }
  }

  async updateInsuranceRate(id: string, rate: Partial<InsuranceRate>): Promise<ApiResponse<InsuranceRate>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (rate.name !== undefined) updateData.name = rate.name;
      if (rate.description !== undefined) updateData.description = rate.description;
      if (rate.annualRate !== undefined) updateData.annual_rate = rate.annualRate;
      if (rate.providerRate !== undefined) updateData.annual_rate_provider = rate.providerRate;
      if (rate.coverageType !== undefined) updateData.coverage_type = rate.coverageType;
      if (rate.status !== undefined) updateData.status = rate.status;
      if (rate.isDefault !== undefined) updateData.is_default = rate.isDefault;
      if (rate.minVehicleValue !== undefined) updateData.min_vehicle_value = rate.minVehicleValue;
      if (rate.maxVehicleValue !== undefined) updateData.max_vehicle_value = rate.maxVehicleValue;
      if (rate.minTenure !== undefined) updateData.min_tenure = rate.minTenure;
      if (rate.maxTenure !== undefined) updateData.max_tenure = rate.maxTenure;

      const response = await supabase
        .from('insurance_rates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedRate = mapSupabaseRow<InsuranceRate>(handleSupabaseResponse<any>(response));
      
      return {
        status: 'SUCCESS',
        data: updatedRate,
        message: 'Insurance rate updated successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update insurance rate',
        data: {} as InsuranceRate
      };
    }
  }

  async deleteInsuranceRate(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await supabase
        .from('insurance_rates')
        .delete()
        .eq('id', id);
      
      handleSupabaseResponse(response);
      
      return {
        status: 'SUCCESS',
        message: 'Insurance rate deleted successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to delete insurance rate'
      };
    }
  }

  // ==================== LEDGERS ====================
  async getLedgers(): Promise<ApiResponse<Ledger[]>> {
    try {
      const response = await supabase
        .from('ledgers')
        .select('*')
        .order('date', { ascending: false });
      
      const ledgers = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Ledger>);
      
      return {
        status: 'SUCCESS',
        data: ledgers,
        message: 'Ledgers fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch ledgers',
        data: []
      };
    }
  }

  // ==================== NOTIFICATIONS ====================
  async createNotification(data: {
    userEmail: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    link?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const notificationData = {
        user_email: data.userEmail,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
      };

      const response = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();
      
      if (response.error) {
        console.error('❌ Supabase createNotification error:', response.error);
        throw new Error(response.error.message || 'Failed to create notification');
      }
      
      const notification = mapSupabaseRow<any>(response.data);
      
      return {
        status: 'SUCCESS',
        data: notification,
        message: 'Notification created successfully'
      };
    } catch (error: any) {
      console.error('❌ createNotification error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create notification',
        data: null
      };
    }
  }

  async getNotifications(userEmail: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (response.error) {
        console.error('❌ Supabase getNotifications error:', response.error);
        throw new Error(response.error.message || 'Failed to fetch notifications');
      }
      
      const notifications = (response.data || []).map(mapSupabaseRow<any>);
      
      return {
        status: 'SUCCESS',
        data: notifications,
        message: 'Notifications fetched successfully'
      };
    } catch (error: any) {
      console.error('❌ getNotifications error:', error);
      
      // Check for DNS resolution errors
      const dnsError = this.detectDnsError(error);
      if (dnsError) {
        console.error('❌ ' + dnsError);
        return {
          status: 'ERROR',
          message: dnsError,
          data: []
        };
      }
      
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch notifications',
        data: []
      };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single();
      
      if (response.error) {
        console.error('❌ Supabase markNotificationAsRead error:', response.error);
        throw new Error(response.error.message || 'Failed to mark notification as read');
      }
      
      const notification = mapSupabaseRow<any>(response.data);
      
      return {
        status: 'SUCCESS',
        data: notification,
        message: 'Notification marked as read'
      };
    } catch (error: any) {
      console.error('❌ markNotificationAsRead error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to mark notification as read',
        data: null
      };
    }
  }

  async markAllNotificationsAsRead(userEmail: string): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_email', userEmail)
        .eq('read', false)
        .select('id');
      
      if (response.error) {
        console.error('❌ Supabase markAllNotificationsAsRead error:', response.error);
        throw new Error(response.error.message || 'Failed to mark all notifications as read');
      }
      
      return {
        status: 'SUCCESS',
        data: { count: response.data?.length || 0 },
        message: 'All notifications marked as read'
      };
    } catch (error: any) {
      console.error('❌ markAllNotificationsAsRead error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to mark all notifications as read',
        data: { count: 0 }
      };
    }
  }

  // ==================== COMPANIES ====================
  async getCompanies(): Promise<ApiResponse<Company[]>> {
    try {
      const response = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      const companies = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Company>);
      return { status: 'SUCCESS', data: companies, message: 'Companies fetched successfully' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to fetch companies', data: [] };
    }
  }

  async createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> {
    try {
      const response = await supabase
        .from('companies')
        .insert({
          name: company.name,
          code: company.code || null,
          description: company.description || null,
          can_pay: company.canPay,
          status: company.status,
          metadata: company.metadata || {},
        })
        .select()
        .single();

      const created = mapSupabaseRow<Company>(handleSupabaseResponse<any>(response));
      return { status: 'SUCCESS', data: created, message: 'Company created successfully' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to create company', data: {} as Company };
    }
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<ApiResponse<Company>> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (company.name !== undefined) updateData.name = company.name;
      if (company.code !== undefined) updateData.code = company.code;
      if (company.description !== undefined) updateData.description = company.description;
      if (company.canPay !== undefined) updateData.can_pay = company.canPay;
      if (company.status !== undefined) updateData.status = company.status;
      if (company.metadata !== undefined) updateData.metadata = company.metadata;

      const response = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      const updated = mapSupabaseRow<Company>(handleSupabaseResponse<any>(response));
      return { status: 'SUCCESS', data: updated, message: 'Company updated successfully' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to update company', data: {} as Company };
    }
  }

  async updateUserCompanyId(
    userId: string,
    companyId: string | null,
    email?: string
  ): Promise<ApiResponse<User>> {
    try {
      // Preferred: admin-only RPC (bypasses RLS + upserts profile if missing)
      if (companyId) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('admin_set_user_company', {
            p_user_id: userId,
            p_company_id: companyId,
          });

          if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
            const updated = mapSupabaseRow<User>(rpcData[0]);
            return { status: 'SUCCESS', data: updated, message: 'User updated successfully' };
          }
        } catch {
          // fall through to table write
        }
      }

      // If the profile row doesn't exist yet in public.users, UPDATE will 406/return no rows.
      // We upsert when email is provided so company assignment always persists.
      const response = email
        ? await supabase
          .from('users')
          .upsert(
            {
              id: userId,
              email,
              company_id: companyId,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'id' }
          )
          .select('*')
          .single()
        : await supabase
          .from('users')
          .update({ company_id: companyId, updated_at: new Date().toISOString() } as any)
          .eq('id', userId)
          .select('*')
          .single();

      const updated = mapSupabaseRow<User>(handleSupabaseResponse<any>(response));
      return { status: 'SUCCESS', data: updated, message: 'User updated successfully' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to update user', data: {} as User };
    }
  }

  // ==================== USERS ====================
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      // Preferred (Admin-only): ask the database (SECURITY DEFINER RPC) for all auth users.
      // This avoids the "only users with applications show up" limitation.
      // If the RPC is not installed or caller is not admin, we fall back to the legacy behavior.
      const userMap = new Map<string, User>();
      let rpcMissing = false;
      let rpcErrorMessage: string | null = null;
      try {
        const rpcResponse = await supabase.rpc('admin_get_users');
        if (rpcResponse.error) {
          // Most common case in local/dev: RPC not installed yet → PostgREST returns 404
          // (still safe to fall back to applications-derived users).
          rpcMissing = (rpcResponse.error as any)?.code === 'PGRST404' || (rpcResponse.error as any)?.status === 404;
          rpcErrorMessage = (rpcResponse.error as any)?.message || 'admin_get_users RPC failed';
        } else if (Array.isArray(rpcResponse.data)) {
          rpcResponse.data.forEach((row: any) => {
            const email = (row.email || '').toLowerCase();
            if (!email) return;
            const meta = row.raw_user_meta_data || {};
            userMap.set(email, {
              id: row.id || email,
              email: row.email,
              name: meta.name,
              firstName: meta.firstName,
              lastName: meta.lastName,
              phone: meta.phone,
              nationalId: meta.nationalId,
              nationality: meta.nationality,
              gender: meta.gender,
              role: meta.role || meta.user_role,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              totalApplications: 0,
              activeApplications: 0,
              membershipStatus: 'none',
              creditsBalance: 0, // Will be loaded separately
            });
          });
        }
      } catch {
        // ignore and fall back
      }

      // Fallback: derive users from applications (customers who have at least one application).
      if (userMap.size === 0) {
        const applicationsResponse = await supabase
          .from('applications')
          .select('customer_email, customer_name, customer_phone, customer_info, created_at, updated_at')
          .order('created_at', { ascending: false });
        
        if (applicationsResponse.error) {
          console.error('❌ Supabase getUsers error:', applicationsResponse.error);
          throw new Error(applicationsResponse.error.message || 'Failed to fetch users');
        }

        (applicationsResponse.data || []).forEach((app: any) => {
          const email = app.customer_email?.toLowerCase();
          if (!email) return;

          if (!userMap.has(email)) {
            const customerInfo = app.customer_info || {};
            const nameParts = app.customer_name?.split(' ') || [];
            
            userMap.set(email, {
              id: email, // Use email as ID for now
              email: app.customer_email,
              name: app.customer_name,
              firstName: nameParts[0] || customerInfo.firstName,
              lastName: nameParts.slice(1).join(' ') || customerInfo.lastName,
              phone: app.customer_phone || customerInfo.phone,
              nationalId: customerInfo.nationalId,
              nationality: customerInfo.nationality,
              gender: customerInfo.gender,
              createdAt: app.created_at,
              updatedAt: app.updated_at,
              totalApplications: 0,
              activeApplications: 0,
              membershipStatus: 'none',
              creditsBalance: 0, // Will be loaded separately
            });
          }
        });
      }

      // Get application counts for each user
      const allApplications = await this.getApplications();
      if (allApplications.status === 'SUCCESS' && allApplications.data) {
        // Build a "latest application per email" map for backfilling missing user fields.
        // `getApplications()` returns results ordered by created_at desc, so first hit is the latest.
        const latestAppByEmail = new Map<string, Application>();
        allApplications.data.forEach((app: Application) => {
          const email = app.customerEmail?.toLowerCase();
          if (!email) return;
          if (!latestAppByEmail.has(email)) {
            latestAppByEmail.set(email, app);
          }
        });

        allApplications.data.forEach((app: Application) => {
          const email = app.customerEmail?.toLowerCase();
          if (email && userMap.has(email)) {
            const user = userMap.get(email)!;
            user.totalApplications = (user.totalApplications || 0) + 1;
            if (app.status === 'active') {
              user.activeApplications = (user.activeApplications || 0) + 1;
            }
            // Check membership
            if (app.bloxMembership?.isActive) {
              user.membershipStatus = 'active';
            }
          }
        });

        // (Optional) Backfill missing user fields from their latest application record.
        // This helps show Auth users that never filled full metadata but have applied at least once.
        userMap.forEach((user, email) => {
          const latest = latestAppByEmail.get(email);
          if (!latest) return;

          const customerInfo = (latest as any).customerInfo || {};
          const nameFromApp = latest.customerName || '';
          const phoneFromApp = latest.customerPhone || '';

          // Fill name/first/last if missing
          if (!user.name && nameFromApp) user.name = nameFromApp;
          if (!user.firstName || !user.lastName) {
            const parts = (nameFromApp || '').trim().split(/\s+/).filter(Boolean);
            if (!user.firstName && parts.length > 0) user.firstName = parts[0];
            if (!user.lastName && parts.length > 1) user.lastName = parts.slice(1).join(' ');
          }
          if (!user.firstName && customerInfo.firstName) user.firstName = customerInfo.firstName;
          if (!user.lastName && customerInfo.lastName) user.lastName = customerInfo.lastName;

          // Fill phone and IDs if missing
          if (!user.phone && (phoneFromApp || customerInfo.phone)) user.phone = phoneFromApp || customerInfo.phone;
          if (!user.nationalId && customerInfo.nationalId) user.nationalId = customerInfo.nationalId;
          if (!user.nationality && customerInfo.nationality) user.nationality = customerInfo.nationality;
          if (!user.gender && customerInfo.gender) user.gender = customerInfo.gender;
        });
      }

      // Fetch credits for all users (admin can see all, customers will be filtered by RLS)
      const users = Array.from(userMap.values());
      
      // Load credits for all users in parallel
      try {
        const { data: creditsData, error: creditsError } = await supabase
          .from('user_credits')
          .select('user_email, balance');
        
        if (!creditsError && creditsData) {
          const creditsMap = new Map<string, number>();
          creditsData.forEach((credit: any) => {
            creditsMap.set(credit.user_email.toLowerCase(), parseFloat(credit.balance) || 0);
          });
          
          // Add credits to users
          users.forEach((user) => {
            const email = user.email?.toLowerCase();
            if (email && creditsMap.has(email)) {
              user.creditsBalance = creditsMap.get(email);
            } else {
              user.creditsBalance = 0; // Default to 0 if no record exists
            }
          });
        }
      } catch (creditsError: any) {
        console.warn('Failed to load credits for users:', creditsError);
        // Don't fail the entire request if credits load fails
        users.forEach((user) => {
          user.creditsBalance = 0;
        });
      }

      // Load company_id from public.users (best-effort). If table/RLS isn't ready yet, ignore.
      try {
        const ids = users.map((u) => u.id).filter(Boolean);
        if (ids.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('users')
            .select('id, company_id, role')
            .in('id', ids);

          if (!profileError && Array.isArray(profiles)) {
            const byId = new Map<string, any>(profiles.map((p: any) => [p.id, p]));
            users.forEach((u) => {
              const p = byId.get(u.id);
              if (!p) return;
              u.companyId = p.company_id || undefined;
              if (p.role && !u.role) u.role = p.role;
            });
          }
        }
      } catch {
        // ignore
      }
      
      return {
        status: 'SUCCESS',
        data: users,
        message: rpcMissing
          ? 'Users fetched (fallback). To list ALL auth users, install the admin_get_users RPC (see ADD_ADMIN_GET_USERS_RPC.sql).'
          : rpcErrorMessage
            ? `Users fetched (fallback). admin_get_users RPC failed: ${rpcErrorMessage}`
            : 'Users fetched successfully'
      };
    } catch (error: any) {
      console.error('❌ getUsers error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch users',
        data: []
      };
    }
  }

  async getUserByEmail(email: string): Promise<ApiResponse<User>> {
    try {
      const usersResponse = await this.getUsers();
      
      if (usersResponse.status === 'SUCCESS' && usersResponse.data) {
        const user = usersResponse.data.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (user) {
          // Get user's applications for detailed info
          const applicationsResponse = await this.getApplications();
          if (applicationsResponse.status === 'SUCCESS' && applicationsResponse.data) {
            const userApplications = applicationsResponse.data.filter(
              (app) => app.customerEmail?.toLowerCase() === email.toLowerCase()
            );
            
            user.totalApplications = userApplications.length;
            user.activeApplications = userApplications.filter(
              (app) => app.status === 'active'
            ).length;
            
            // Get membership status from latest application
            const latestApp = userApplications[0];
            if (latestApp?.bloxMembership?.isActive) {
              user.membershipStatus = 'active';
            } else if (userApplications.some((app) => app.bloxMembership)) {
              user.membershipStatus = 'inactive';
            }
          }
          
          // Load user credits
          try {
            const { data: creditsData, error: creditsError } = await supabase
              .from('user_credits')
              .select('balance')
              .eq('user_email', email)
              .single();
            
            if (!creditsError && creditsData) {
              user.creditsBalance = parseFloat(creditsData.balance) || 0;
            } else {
              user.creditsBalance = 0; // Default to 0 if no record exists
            }
          } catch (creditsError: any) {
            console.warn('Failed to load credits for user:', creditsError);
            user.creditsBalance = 0;
          }
          
          return {
            status: 'SUCCESS',
            data: user,
            message: 'User fetched successfully'
          };
        } else {
          return {
            status: 'ERROR',
            message: 'User not found',
            data: {} as User
          };
        }
      } else {
        throw new Error(usersResponse.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('❌ getUserByEmail error:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch user',
        data: {} as User
      };
    }
  }

  /**
   * Fetch the latest stored customer_info blob from the most recent application for the given email.
   * This is used by Admin "Create Application" to prefill the customer form for existing customers.
   */
  async getLatestCustomerInfoByEmail(email: string): Promise<ApiResponse<{
    customerInfo: any;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }>> {
    try {
      const response = await supabase
        .from('applications')
        .select('customer_info, customer_name, customer_email, customer_phone, created_at')
        .ilike('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const row = handleSupabaseResponse<any>(response);
      return {
        status: 'SUCCESS',
        data: {
          customerInfo: row.customer_info || {},
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerPhone: row.customer_phone,
        },
        message: 'Customer info fetched successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch customer info',
        data: { customerInfo: {} },
      };
    }
  }

  // ==================== SETTLEMENT DISCOUNT SETTINGS ====================
  async getSettlementDiscountSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await supabase
        .from('settlement_discount_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (response.error && response.error.code !== 'PGRST116') {
        throw new Error(response.error.message || 'Failed to fetch settlement discount settings');
      }

      if (!response.data) {
        // Return default settings if none exist
        return {
          status: 'SUCCESS',
          data: {
            id: '',
            name: 'Default Settings',
            principalDiscountEnabled: false,
            principalDiscountType: 'percentage',
            principalDiscountValue: 0,
            principalDiscountMinAmount: 0,
            interestDiscountEnabled: false,
            interestDiscountType: 'percentage',
            interestDiscountValue: 0,
            interestDiscountMinAmount: 0,
            isActive: true,
            minSettlementAmount: 0,
            minRemainingPayments: 1,
            maxDiscountAmount: 0,
            maxDiscountPercentage: 0,
            tieredDiscounts: [],
          },
          message: 'Using default settlement discount settings'
        };
      }

      const settings = {
        id: response.data.id,
        name: response.data.name || 'Default Settings',
        description: response.data.description,
        principalDiscountEnabled: response.data.principal_discount_enabled || false,
        principalDiscountType: response.data.principal_discount_type || 'percentage',
        principalDiscountValue: Number(response.data.principal_discount_value) || 0,
        principalDiscountMinAmount: Number(response.data.principal_discount_min_amount) || 0,
        interestDiscountEnabled: response.data.interest_discount_enabled || false,
        interestDiscountType: response.data.interest_discount_type || 'percentage',
        interestDiscountValue: Number(response.data.interest_discount_value) || 0,
        interestDiscountMinAmount: Number(response.data.interest_discount_min_amount) || 0,
        isActive: response.data.is_active !== false,
        minSettlementAmount: Number(response.data.min_settlement_amount) || 0,
        minRemainingPayments: Number(response.data.min_remaining_payments) || 1,
        maxDiscountAmount: response.data.max_discount_amount ? Number(response.data.max_discount_amount) : 0,
        maxDiscountPercentage: response.data.max_discount_percentage ? Number(response.data.max_discount_percentage) : 0,
        tieredDiscounts: Array.isArray(response.data.tiered_discounts) 
          ? response.data.tiered_discounts.map((tier: any) => ({
              // Support new format (minMonthsEarly) and backward compatibility with old formats
              minMonthsEarly: tier.minMonthsEarly !== undefined 
                ? tier.minMonthsEarly 
                : (tier.minMonthsIntoLoan !== undefined ? tier.minMonthsIntoLoan : (tier.minPayments || 1)),
              maxMonthsEarly: tier.maxMonthsEarly !== undefined 
                ? tier.maxMonthsEarly 
                : (tier.maxMonthsIntoLoan !== undefined ? tier.maxMonthsIntoLoan : (tier.maxPayments !== undefined ? tier.maxPayments : undefined)),
              principalDiscount: tier.principalDiscount || 0,
              interestDiscount: tier.interestDiscount || 0,
              installmentDiscount: tier.installmentDiscount || 0,
              principalDiscountType: tier.principalDiscountType || 'percentage',
              interestDiscountType: tier.interestDiscountType || 'percentage',
              installmentDiscountType: tier.installmentDiscountType || 'percentage',
            }))
          : [],
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        createdBy: response.data.created_by,
        updatedBy: response.data.updated_by,
      };
      
      return {
        status: 'SUCCESS',
        data: settings,
        message: 'Settlement discount settings fetched successfully'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settlement discount settings';
      return {
        status: 'ERROR',
        message: errorMessage,
        data: null
      };
    }
  }

  async updateSettlementDiscountSettings(settings: Partial<any>): Promise<ApiResponse<any>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (settings.name !== undefined) updateData.name = settings.name;
      if (settings.description !== undefined) updateData.description = settings.description;
      if (settings.principalDiscountEnabled !== undefined) updateData.principal_discount_enabled = settings.principalDiscountEnabled;
      if (settings.principalDiscountType !== undefined) updateData.principal_discount_type = settings.principalDiscountType;
      if (settings.principalDiscountValue !== undefined) updateData.principal_discount_value = settings.principalDiscountValue;
      if (settings.principalDiscountMinAmount !== undefined) updateData.principal_discount_min_amount = settings.principalDiscountMinAmount;
      if (settings.interestDiscountEnabled !== undefined) updateData.interest_discount_enabled = settings.interestDiscountEnabled;
      if (settings.interestDiscountType !== undefined) updateData.interest_discount_type = settings.interestDiscountType;
      if (settings.interestDiscountValue !== undefined) updateData.interest_discount_value = settings.interestDiscountValue;
      if (settings.interestDiscountMinAmount !== undefined) updateData.interest_discount_min_amount = settings.interestDiscountMinAmount;
      if (settings.isActive !== undefined) updateData.is_active = settings.isActive;
      if (settings.minSettlementAmount !== undefined) updateData.min_settlement_amount = settings.minSettlementAmount;
      if (settings.minRemainingPayments !== undefined) updateData.min_remaining_payments = settings.minRemainingPayments;
      if (settings.maxDiscountAmount !== undefined) updateData.max_discount_amount = settings.maxDiscountAmount > 0 ? settings.maxDiscountAmount : null;
      if (settings.maxDiscountPercentage !== undefined) updateData.max_discount_percentage = settings.maxDiscountPercentage > 0 ? settings.maxDiscountPercentage : null;
      if (settings.tieredDiscounts !== undefined) {
        updateData.tiered_discounts = settings.tieredDiscounts.map((tier: any) => ({
          // Use new format (minMonthsEarly) or fallback to old format for backward compatibility
          minMonthsEarly: tier.minMonthsEarly !== undefined 
            ? tier.minMonthsEarly 
            : (tier.minMonthsIntoLoan !== undefined ? tier.minMonthsIntoLoan : 1),
          maxMonthsEarly: tier.maxMonthsEarly !== undefined 
            ? tier.maxMonthsEarly 
            : (tier.maxMonthsIntoLoan !== undefined ? tier.maxMonthsIntoLoan : undefined),
          principalDiscount: tier.principalDiscount,
          interestDiscount: tier.interestDiscount,
          installmentDiscount: tier.installmentDiscount || 0,
          principalDiscountType: tier.principalDiscountType,
          interestDiscountType: tier.interestDiscountType,
          installmentDiscountType: tier.installmentDiscountType || 'percentage',
        }));
      }

      // Get current user for updated_by
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.updated_by = user.id;
      }

      let response;
      if (settings.id) {
        // Update existing
        response = await supabase
          .from('settlement_discount_settings')
          .update(updateData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Create new
        if (user) {
          updateData.created_by = user.id;
        }
        response = await supabase
          .from('settlement_discount_settings')
          .insert(updateData)
          .select()
          .single();
      }

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update settlement discount settings');
      }

      const updatedSettings = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        principalDiscountEnabled: response.data.principal_discount_enabled,
        principalDiscountType: response.data.principal_discount_type,
        principalDiscountValue: Number(response.data.principal_discount_value),
        principalDiscountMinAmount: Number(response.data.principal_discount_min_amount),
        interestDiscountEnabled: response.data.interest_discount_enabled,
        interestDiscountType: response.data.interest_discount_type,
        interestDiscountValue: Number(response.data.interest_discount_value),
        interestDiscountMinAmount: Number(response.data.interest_discount_min_amount),
        isActive: response.data.is_active,
        minSettlementAmount: Number(response.data.min_settlement_amount),
        minRemainingPayments: Number(response.data.min_remaining_payments),
        maxDiscountAmount: response.data.max_discount_amount ? Number(response.data.max_discount_amount) : 0,
        maxDiscountPercentage: response.data.max_discount_percentage ? Number(response.data.max_discount_percentage) : 0,
        tieredDiscounts: Array.isArray(response.data.tiered_discounts) ? response.data.tiered_discounts : [],
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        createdBy: response.data.created_by,
        updatedBy: response.data.updated_by,
      };
      
      return {
        status: 'SUCCESS',
        data: updatedSettings,
        message: 'Settlement discount settings updated successfully'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settlement discount settings';
      return {
        status: 'ERROR',
        message: errorMessage,
        data: null
      };
    }
  }

  // ==================== PAYMENT DEFERRALS ====================
  async getDeferrals(applicationId?: string, year?: number): Promise<ApiResponse<PaymentDeferral[]>> {
    try {
      let query = supabase
        .from('payment_deferrals')
        .select('*')
        .order('deferred_date', { ascending: false });

      if (applicationId) {
        query = query.eq('application_id', applicationId);
      }

      if (year) {
        query = query.eq('year', year);
      }

      const response = await query;
      const deferrals = handleSupabaseResponse<any[]>(response).map((deferral: any) => ({
        id: deferral.id,
        paymentId: deferral.payment_id,
        applicationId: deferral.application_id,
        originalDueDate: deferral.original_due_date,
        deferredToDate: deferral.deferred_to_date,
        deferredDate: deferral.deferred_date,
        reason: deferral.reason || '',
        year: deferral.year,
        deferredAmount: deferral.deferred_amount ? Number(deferral.deferred_amount) : undefined,
        originalAmount: deferral.original_amount ? Number(deferral.original_amount) : undefined,
      }));

      return {
        status: 'SUCCESS',
        data: deferrals,
        message: 'Deferrals fetched successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch deferrals',
        data: []
      };
    }
  }

  async createDeferral(deferral: Omit<PaymentDeferral, 'id' | 'deferredDate'>): Promise<ApiResponse<PaymentDeferral>> {
    try {
      const deferralData = {
        payment_id: deferral.paymentId,
        application_id: deferral.applicationId,
        original_due_date: deferral.originalDueDate,
        deferred_to_date: deferral.deferredToDate,
        reason: deferral.reason || null,
        year: deferral.year,
        deferred_amount: deferral.deferredAmount || null,
        original_amount: deferral.originalAmount || null,
      };

      const response = await supabase
        .from('payment_deferrals')
        .insert(deferralData)
        .select()
        .single();

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create deferral');
      }

      const createdDeferral: PaymentDeferral = {
        id: response.data.id,
        paymentId: response.data.payment_id,
        applicationId: response.data.application_id,
        originalDueDate: response.data.original_due_date,
        deferredToDate: response.data.deferred_to_date,
        deferredDate: response.data.deferred_date,
        reason: response.data.reason || '',
        year: response.data.year,
        deferredAmount: response.data.deferred_amount ? Number(response.data.deferred_amount) : undefined,
        originalAmount: response.data.original_amount ? Number(response.data.original_amount) : undefined,
      };

      // Log activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('create', 'payment', {
          resourceId: deferral.applicationId,
          resourceName: `Deferral for Application #${deferral.applicationId.slice(0, 8)}`,
          description: `Created payment deferral: ${deferral.originalDueDate} → ${deferral.deferredToDate}`,
          metadata: {
            paymentId: deferral.paymentId,
            year: deferral.year,
            deferredAmount: deferral.deferredAmount,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }

      return {
        status: 'SUCCESS',
        data: createdDeferral,
        message: 'Deferral created successfully'
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to create deferral',
        data: {} as PaymentDeferral
      };
    }
  }
}

export const supabaseApiService = new SupabaseApiService();

