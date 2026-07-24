import { supabase, handleSupabaseResponse, mapSupabaseRow } from './supabase.service';
import { supabaseCache } from './supabase-cache.service';
import type { 
  Application, 
  Company,
  PartnerHubSummary,
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
import { assertApplicationStatusTransition, type TransitionActor } from '../utils/application-status-transitions';
import { mapInsuranceRateRow, mapPromotionRow } from '../utils/catalog-row-mappers';
import { getModelFamilyKey } from '../utils/product-display.utils';

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

  /** Write an admin audit log entry to public.audit_logs.
   *  Fire-and-forget: never throws so it never breaks the calling operation. */
  private async insertAuditLog(
    action: string,
    tableName: string,
    _resourceId: string,
    _description: string,
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle();
      await supabase.from('audit_logs').insert({
        table_name: tableName,
        operation: action,
        user_email: profile?.email ?? user.email ?? '',
        user_role: profile?.role ?? 'unknown',
        error_message: null,
      });
    } catch {
      // Never surface audit failures to the caller
    }
  }

  // ==================== PRODUCTS ====================

  /** Clear all product list / query caches (paged + legacy keys). */
  private invalidateProductsCache(): void {
    supabaseCache.invalidatePattern('^(products:|queryProducts:)');
  }

  /**
   * Server-paged product catalog query with filters + exact count.
   * Reserved exclusion must be applied via excludeIds BEFORE range.
   *
   * excludeIds URL-length threshold: if reserved IDs ever exceed ~200, switch
   * to a dedicated RPC that excludes reserved rows server-side.
   */
  async queryProducts(options: {
    limit: number;
    offset?: number;
    skipCache?: boolean;
    companyId?: string | null;
    status?: ('active' | 'inactive')[];
    condition?: ('new' | 'old')[];
    make?: string[];
    model?: string[];
    priceMin?: number;
    priceMax?: number;
    modelYearMin?: number;
    modelYearMax?: number;
    search?: string;
    excludeIds?: string[];
  }): Promise<ApiResponse<Product[]> & { count?: number | null }> {
    const {
      limit,
      offset = 0,
      skipCache = false,
      companyId,
      status,
      condition,
      make,
      model,
      priceMin,
      priceMax,
      modelYearMin,
      modelYearMax,
      search,
      excludeIds,
    } = options;

    const excludeSorted = (excludeIds ?? []).filter(Boolean).slice().sort();
    const filterKey = [
      companyId ?? '',
      (status ?? []).join(','),
      (condition ?? []).join(','),
      (make ?? []).join(','),
      (model ?? []).join(','),
      priceMin ?? '',
      priceMax ?? '',
      modelYearMin ?? '',
      modelYearMax ?? '',
      search?.trim() ?? '',
      excludeSorted.join(','),
      `${offset}:${limit}`,
    ].join('|');
    const cacheKey = `queryProducts:${filterKey}`;

    if (!skipCache) {
      const cached = supabaseCache.get<{ rows: Product[]; count: number | null }>(cacheKey);
      if (cached) {
        return {
          status: 'SUCCESS',
          data: cached.rows,
          count: cached.count,
          message: 'Products fetched successfully (cached)',
        };
      }
    }

    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (status && status.length > 0) {
        query = query.in('status', status);
      }
      if (condition && condition.length > 0) {
        query = query.in('condition', condition);
      }
      if (make && make.length > 0) {
        query = query.in('make', make);
      }
      if (model && model.length > 0) {
        query = query.in('model', model);
      }
      if (priceMin != null) {
        query = query.gte('price', priceMin);
      }
      if (priceMax != null) {
        query = query.lte('price', priceMax);
      }
      if (modelYearMin != null) {
        query = query.gte('model_year', modelYearMin);
      }
      if (modelYearMax != null) {
        query = query.lte('model_year', modelYearMax);
      }
      if (search?.trim()) {
        const q = search.trim().replace(/[%_,.()]/g, '');
        if (q) {
          query = query.or(
            `make.ilike.%${q}%,model.ilike.%${q}%,trim.ilike.%${q}%,id.ilike.%${q}%`
          );
        }
      }
      if (excludeSorted.length > 0) {
        // PostgREST in-list; quote text ids. Cap ~200 before URL length breaks.
        const inList = `(${excludeSorted.map((id) => `"${id.replace(/"/g, '')}"`).join(',')})`;
        query = query.not('id', 'in', inList);
      }

      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + Math.max(limit, 1) - 1);

      const response = await query;
      const rows = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Product>);
      const count = response.count ?? rows.length;

      if (!skipCache) {
        supabaseCache.set(cacheKey, { rows, count }, 60 * 1000);
      }

      return {
        status: 'SUCCESS',
        data: rows,
        count,
        message: 'Products fetched successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch products',
        data: [],
        count: 0,
      };
    }
  }

  /** Backward-compatible wrapper — prefer queryProducts from list UIs. */
  async getProducts(options?: { limit?: number; offset?: number }): Promise<ApiResponse<Product[]>> {
    // Default cap prevents accidental full-catalog pulls as inventory grows.
    const { limit = 2000, offset = 0 } = options ?? {};
    const result = await this.queryProducts({ limit, offset });
    return {
      status: result.status,
      data: result.data ?? [],
      message: result.message,
    };
  }

  async getProductMakes(status: string = 'active'): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase.rpc('product_distinct_makes', {
        p_status: status,
      });
      if (error) throw error;
      const makes = (Array.isArray(data) ? data : [])
        .map((v) => String(v))
        .filter((v) => v.trim().length > 0);
      return {
        status: 'SUCCESS',
        data: makes,
        message: 'Product makes fetched successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch product makes',
        data: [],
      };
    }
  }

  async getProductModels(make: string, status: string = 'active'): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase.rpc('product_distinct_models', {
        p_make: make,
        p_status: status,
      });
      if (error) throw error;
      const models = (Array.isArray(data) ? data : [])
        .map((v) => String(v))
        .filter((v) => v.trim().length > 0);
      return {
        status: 'SUCCESS',
        data: models,
        message: 'Product models fetched successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch product models',
        data: [],
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

  /**
   * Resolve the current caller's owning company from public.users.
   * Dealer inventory RLS requires products.company_id = the dealer's company.
   */
  private async currentUserCompanyId(): Promise<string | undefined> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return undefined;
      const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', uid)
        .maybeSingle();
      const companyId = (data as { company_id?: string } | null)?.company_id;
      return companyId || undefined;
    } catch {
      return undefined;
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    try {
      // Stamp ownership: explicit companyId wins, else inherit the caller's
      // company (dealers). Admins with no company create platform stock (null).
      const companyId =
        product.companyId !== undefined
          ? product.companyId
          : (await this.currentUserCompanyId()) ?? null;

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
        engine_number: product.engineNumber,
        company_id: companyId,
      };

      const response = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      const createdProduct = mapSupabaseRow<Product>(handleSupabaseResponse<any>(response));

      this.invalidateProductsCache();
      
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

      this.invalidateProductsCache();

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
      if (product.companyId !== undefined) updateData.company_id = product.companyId;

      const response = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const updatedProduct = mapSupabaseRow<Product>(handleSupabaseResponse<any>(response));
      
      this.invalidateProductsCache();
      
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
      this.invalidateProductsCache();
      
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
  /** Cache key must be session-scoped — RLS results differ by user. */
  private async applicationsCacheKey(suffix = ''): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id || 'anon';
    return `applications:${uid}${suffix}`;
  }

  /**
   * List applications with optional server-side filters / pagination.
   * Use `lean: true` for ops list UIs (narrow vehicle/company columns).
   */
  async getApplications(options?: {
    skipCache?: boolean;
    customerEmail?: string;
    status?: string;
    statusIn?: string[];
    companyId?: string;
    agentUserId?: string;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
    limit?: number;
    offset?: number;
    lean?: boolean;
    /** When lean: omit bulky installment_plan JSON (credit queue). */
    leanOmitInstallmentPlan?: boolean;
  }): Promise<ApiResponse<Application[]> & { count?: number | null }> {
    /** Hard cap when callers omit limit — prevents full-table joins at 10k+ scale. */
    const DEFAULT_APPLICATIONS_LIMIT = 500;
    const {
      skipCache,
      customerEmail,
      status,
      statusIn,
      companyId,
      agentUserId,
      search,
      createdFrom,
      createdTo,
      limit: limitOpt,
      offset = 0,
      lean = false,
      leanOmitInstallmentPlan = false,
    } = options ?? {};
    const limit = limitOpt ?? DEFAULT_APPLICATIONS_LIMIT;

    const filterKey = [
      customerEmail || '',
      status || '',
      (statusIn || []).join(','),
      companyId || '',
      agentUserId || '',
      search || '',
      createdFrom || '',
      createdTo || '',
      lean ? (leanOmitInstallmentPlan ? 'lean-noplan' : 'lean') : 'full',
      `${offset}:${limit}`,
    ].join('|');
    const cacheKey = await this.applicationsCacheKey(`:${filterKey}`);

    if (!skipCache) {
      const cached = supabaseCache.get<{ rows: Application[]; count: number | null }>(cacheKey);
      if (cached) {
        return {
          status: 'SUCCESS',
          data: cached.rows,
          count: cached.count,
          message: 'Applications fetched successfully (cached)',
        };
      }
    }

    try {
      const vehicleSelect = lean
        ? 'id, make, model, trim, price, model_year, color, status'
        : '*';
      const companySelect = lean ? 'id, name' : '*';
      const offerSelect = lean ? '' : ',\n          offer:offers!applications_offer_id_fkey(*)';
      const installmentCol =
        lean && leanOmitInstallmentPlan ? '' : ',\n          installment_plan';
      const appColumns = lean
        ? `
          id, status, customer_name, customer_email, customer_phone, customer_info,
          created_at, updated_at, submitted_at, submission_date,
          vehicle_id, company_id, agent_user_id, offer_id,
          selling_price, hide_interest, internal_annual_rate,
          loan_amount, down_payment,
          blox_membership${installmentCol}
        `
        : '*';

      const select = `
          ${appColumns},
          vehicle:products!applications_vehicle_id_fkey(${vehicleSelect})${offerSelect},
          company:companies(${companySelect})
        `;

      let query = supabase
        .from('applications')
        .select(select, { count: 'exact' });

      if (customerEmail) {
        query = query.eq('customer_email', customerEmail.toLowerCase());
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (statusIn && statusIn.length > 0) {
        query = query.in('status', statusIn);
      }
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (agentUserId) {
        query = query.eq('agent_user_id', agentUserId);
      }
      if (search?.trim()) {
        const q = search.trim().replace(/[%_]/g, '');
        if (q) {
          query = query.or(
            `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,id.ilike.%${q}%`
          );
        }
      }
      if (createdFrom) {
        query = query.gte('created_at', createdFrom);
      }
      if (createdTo) {
        query = query.lte('created_at', createdTo);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + Math.max(limit, 1) - 1);

      const response = await query;
      const rows = handleSupabaseResponse<any[]>(response).map((app: any) => {
        const mapped = mapSupabaseRow<Application>(app);
        if (app.vehicle) {
          mapped.vehicle = mapSupabaseRow<Product>(app.vehicle);
        }
        if (app.offer) {
          mapped.offer = mapSupabaseRow<Offer>(app.offer);
        }
        if (app.company) {
          mapped.company = mapSupabaseRow(app.company) as Application['company'];
        }
        return mapped;
      });

      const count = response.count ?? rows.length;
      supabaseCache.set(cacheKey, { rows, count }, 2 * 60 * 1000);

      return {
        status: 'SUCCESS',
        data: rows,
        count,
        message: 'Applications fetched successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch applications',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Returns only the vehicle_ids that are currently reserved by OTHER customers.
   * Replaces full `getApplications()` + client-side filter on VehicleBrowsePage.
   * Status list mirrors kReservedVehicleApplicationStatuses in Flutter.
   */
  async getReservedVehicleIds(currentUserEmail?: string): Promise<Set<string>> {
    const reservedStatuses = [
      'active',
      'under_review',
      'contract_signing_required',
      'contracts_submitted',
      'contract_under_review',
      'down_payment_required',
      'down_payment_submitted',
      'pending_finance_activation',
    ];
    try {
      let query = supabase
        .from('applications')
        .select('vehicle_id')
        .in('status', reservedStatuses)
        // Cap scan under growth; reserved set is for browse UX, not exhaustive inventory lock.
        .limit(5000);

      if (currentUserEmail) {
        query = query.neq('customer_email', currentUserEmail.toLowerCase());
      }

      const { data, error } = await query;
      if (error || !data) return new Set();
      return new Set(
        (data as { vehicle_id: string | null }[])
          .map((r) => r.vehicle_id)
          .filter((id): id is string => !!id)
      );
    } catch {
      return new Set();
    }
  }

  async getApplicationById(id: string): Promise<ApiResponse<Application>> {
    try {
      const response = await supabase
        .from('applications')
        .select(`
          *,
          vehicle:products!applications_vehicle_id_fkey(*),
          offer:offers!applications_offer_id_fkey(*),
          company:companies(*)
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
      if (app.company) {
        mapped.company = mapSupabaseRow(app.company) as Application['company'];
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

  async createApplication(
    application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { signupAuthUserId?: string }
  ): Promise<ApiResponse<Application>> {
    try {
      const useSignupRpc = Boolean(options?.signupAuthUserId);

      // Prefer getSession (local) over refreshSession — refresh can deadlock with
      // onAuthStateChange handlers that touch the Supabase client.
      let authUser = null as Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];
      if (!useSignupRpc) {
        const { data: sessionData } = await supabase.auth.getSession();
        authUser = sessionData.session?.user ?? null;
        if (!authUser) {
          const { data: authData } = await supabase.auth.getUser();
          authUser = authData?.user ?? null;
        }
      }

      let companyIdFromProfile: string | undefined;
      let profileEmail: string | undefined;
      let profileRole: string | undefined;
      // Signup RPC has no session — skip profile lookup (and avoid stale JWT email).
      if (!useSignupRpc && authUser?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('company_id, email, role')
          .eq('id', authUser.id)
          .maybeSingle();
        const p = profile as { company_id?: string; email?: string; role?: string } | null;
        companyIdFromProfile = p?.company_id ?? undefined;
        profileEmail = p?.email?.trim().toLowerCase() || undefined;
        profileRole = (p?.role || '').trim().toLowerCase() || undefined;
      }

      // The vehicle's owning partner is authoritative for routing: an application
      // for an Audi car must belong to Audi so their dealer/credit staff see it,
      // regardless of who submits it (customer self-serve, dealer, or admin).
      let vehicleCompanyId: string | undefined;
      if (application.vehicleId) {
        try {
          const { data: veh } = await supabase
            .from('products')
            .select('company_id')
            .eq('id', application.vehicleId)
            .maybeSingle();
          vehicleCompanyId = (veh as { company_id?: string } | null)?.company_id ?? undefined;
        } catch {
          // Non-fatal — fall back to explicit/profile company below.
        }
      }

      const sessionEmail = authUser?.email?.trim().toLowerCase() || '';
      // Prefer DB is_admin() (same gate as RLS) over JWT metadata — metadata is not authoritative.
      let isAdminActor =
        profileRole === 'admin' || profileRole === 'super_admin';
      const isDealerActor = profileRole === 'dealer_agent';
      if (!useSignupRpc && authUser && !isAdminActor) {
        try {
          const { data: adminFlag } = await supabase.rpc('is_admin');
          if (adminFlag === true) isAdminActor = true;
        } catch {
          // ignore — fall back to profileRole
        }
      }
      const isStaffCreateActor = isAdminActor || isDealerActor;
      let customerEmail: string;

      if (useSignupRpc) {
        customerEmail = (application.customerEmail || '').trim().toLowerCase();
        if (!customerEmail) {
          return {
            status: 'ERROR',
            message: 'Email is required to create an application after signup.',
            data: {} as Application,
          };
        }
      } else if (isStaffCreateActor) {
        // Admin/dealer create-for-customer: keep payload ownership (draft may omit email).
        customerEmail = (application.customerEmail || '').trim().toLowerCase();
        if (!customerEmail) {
          return {
            status: 'ERROR',
            message:
              'Customer email is required so the application shows under that user’s My Applications.',
            data: {} as Application,
          };
        }
      } else if (sessionEmail) {
        // Customer self-serve: bind to session so ownership cannot be spoofed.
        customerEmail = sessionEmail;
      } else if (profileEmail) {
        // Session missing email (rare); profile row still used by some RLS paths
        customerEmail = profileEmail;
      } else if (authUser) {
        return {
          status: 'ERROR',
          message:
            'Your session has no email address. Please sign in with email or contact support.',
          data: {} as Application,
        };
      } else {
        // No Supabase session (e.g. some test mocks); use payload — production RLS still needs auth.
        customerEmail = (application.customerEmail || '').trim().toLowerCase();
      }

      const appData: any = {
        customer_name: application.customerName,
        customer_email: customerEmail,
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
        blox_membership: application.bloxMembership || null,
      };

      if (application.agentUserId) appData.agent_user_id = application.agentUserId;
      else if (isDealerActor && authUser?.id) appData.agent_user_id = authUser.id;
      if (application.listPrice != null) appData.list_price = application.listPrice;
      if (application.sellingPrice != null) appData.selling_price = application.sellingPrice;
      if (application.internalAnnualRate != null) {
        appData.internal_annual_rate = application.internalAnnualRate;
      }
      if (application.hideInterest != null) appData.hide_interest = application.hideInterest;
      if (application.customerDisplayPrice != null) {
        appData.customer_display_price = application.customerDisplayPrice;
      }
      if (application.customerDisplayRate != null) {
        appData.customer_display_rate = application.customerDisplayRate;
      }
      if (application.pricingSnapshot) appData.pricing_snapshot = application.pricingSnapshot;
      if (application.submittedAt) appData.submitted_at = application.submittedAt;
      if (application.submittedBy) appData.submitted_by = application.submittedBy;

      // Ownership precedence: the vehicle's partner wins so cars route to the
      // right dealer/credit team; explicit payload and dealer profile are fallbacks.
      if (vehicleCompanyId) {
        appData.company_id = vehicleCompanyId;
      } else if (application.companyId) {
        appData.company_id = application.companyId;
      } else if (companyIdFromProfile) {
        appData.company_id = companyIdFromProfile;
      }

      // Dealer RLS requires company_id; fail early with a clear message instead of a raw policy error.
      if (isDealerActor && !appData.company_id) {
        return {
          status: 'ERROR',
          message:
            'Your dealer account is not assigned to a company. Ask an admin to set your company before creating applications.',
          data: {} as Application,
        };
      }

      // Keep customer_info.email aligned with ownership email when we have one.
      if (customerEmail && appData.customer_info && typeof appData.customer_info === 'object') {
        appData.customer_info = { ...appData.customer_info, email: customerEmail };
      }

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

      // Primary key is assigned by DB (e.g. trigger application-{n}); never send a client id.
      delete appData.id;

      let createdApp: Application;

      if (useSignupRpc) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_application_after_signup', {
          p_user_id: options!.signupAuthUserId,
          p_payload: appData,
        });
        if (rpcError) {
          const raw = rpcError.message || '';
          const message = /user_not_found/i.test(raw)
            ? 'Account could not be verified. If you already have an account, please log in. Otherwise try a different email or confirm your signup email and try again.'
            : /email_mismatch/i.test(raw)
              ? 'The email on your account does not match this application. Please use the same email you signed up with.'
              : /applications_vehicle_id_fkey|foreign key constraint.*vehicle_id/i.test(raw)
                ? 'This vehicle is not available. Please choose another vehicle from the catalog.'
                : raw || 'Failed to create application';
          return {
            status: 'ERROR',
            message,
            data: {} as Application,
          };
        }
        if (!rpcData) {
          return {
            status: 'ERROR',
            message: 'Failed to create application',
            data: {} as Application,
          };
        }
        createdApp = mapSupabaseRow<Application>(rpcData as Record<string, unknown>);
      } else {
        const response = await supabase
          .from('applications')
          .insert(appData)
          .select()
          .single();

        createdApp = mapSupabaseRow<Application>(handleSupabaseResponse<any>(response));
      }
      
      // Invalidate all session-scoped application list caches
      supabaseCache.invalidatePattern('^applications:');
      
      // Activity logging must not block create (or hang submit on RPC/network issues)
      void import('./activity-tracking.service')
        .then(({ activityTrackingService }) =>
          activityTrackingService.logActivity('create', 'application', {
            resourceId: createdApp.id,
            resourceName: `Application #${createdApp.id.slice(0, 8)}`,
            description: `Created application for ${application.customerName} (${customerEmail})`,
            metadata: {
              status: application.status,
              loanAmount: application.loanAmount,
              origin: application.origin || 'manual',
              vehicleId: application.vehicleId,
            },
          })
        )
        .catch((error) => {
          console.error('Failed to log activity:', error);
        });

      return {
        status: 'SUCCESS',
        data: createdApp,
        message: 'Application created successfully'
      };
    } catch (error: any) {
      const raw = error?.message || '';
      const message = /applications_vehicle_id_fkey|foreign key constraint.*vehicle_id/i.test(raw)
        ? 'This vehicle is not available. Please choose another vehicle from the catalog.'
        : raw || 'Failed to create application';
      return {
        status: 'ERROR',
        message,
        data: {} as Application
      };
    }
  }

  async updateApplication(id: string, application: Partial<Application>): Promise<ApiResponse<Application>> {
    try {
      // Status transition gate (fail closed) — see application-status-transitions.ts
      if (application.status !== undefined) {
        const { data: { user } } = await supabase.auth.getUser();
        let actor: TransitionActor = 'customer';
        if (user?.id) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          const { data: isAdminFlag } = await supabase.rpc('is_admin');
          const role = (profile?.role || '').trim().toLowerCase();
          if (isAdminFlag === true) {
            actor = role === 'super_admin' ? 'super_admin' : 'admin';
          } else if (role === 'dealer_agent') {
            actor = 'dealer_agent';
          } else if (role === 'credit_officer') {
            actor = 'credit_officer';
          } else if (role === 'finance_officer') {
            actor = 'finance_officer';
          } else if (role === 'customer') {
            actor = 'customer';
          } else {
            throw new Error('Unauthorized: unknown role cannot update application status');
          }
        } else {
          throw new Error('Unauthorized: must be signed in to update application status');
        }

        const { data: currentRow, error: currentErr } = await supabase
          .from('applications')
          .select('status')
          .eq('id', id)
          .single();
        if (currentErr || !currentRow?.status) {
          throw new Error(currentErr?.message || 'Application not found for status transition');
        }
        assertApplicationStatusTransition(
          currentRow.status as any,
          application.status as any,
          actor
        );
      }

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
      if (application.agentUserId !== undefined) updateData.agent_user_id = application.agentUserId;
      if (application.listPrice !== undefined) updateData.list_price = application.listPrice;
      if (application.sellingPrice !== undefined) updateData.selling_price = application.sellingPrice;
      if (application.internalAnnualRate !== undefined) {
        updateData.internal_annual_rate = application.internalAnnualRate;
      }
      if (application.hideInterest !== undefined) updateData.hide_interest = application.hideInterest;
      if (application.customerDisplayPrice !== undefined) {
        updateData.customer_display_price = application.customerDisplayPrice;
      }
      if (application.customerDisplayRate !== undefined) {
        updateData.customer_display_rate = application.customerDisplayRate;
      }
      if (application.pricingSnapshot !== undefined) {
        updateData.pricing_snapshot = application.pricingSnapshot;
      }
      if (application.submittedAt !== undefined) updateData.submitted_at = application.submittedAt;
      if (application.submittedBy !== undefined) updateData.submitted_by = application.submittedBy;
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
        
        // Best-effort activity — never block the write success path
        void (async () => {
          try {
            const { activityTrackingService } = await import('./activity-tracking.service');
            const changes: Record<string, any> = {};
            if (application.status !== undefined) changes.status = application.status;
            if (application.contractSigned !== undefined) changes.contractSigned = application.contractSigned;
            if (application.contractReviewComments !== undefined) {
              changes.contractReviewComments = application.contractReviewComments;
            }
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
        })();

        // Audit log status changes for admin compliance trail
        if (application.status !== undefined) {
          void this.insertAuditLog(
            'STATUS_CHANGE',
            'applications',
            id,
            `Application ${id} status changed to ${application.status}`,
          );
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
      
      // Best-effort activity — never block the write success path
      void (async () => {
        try {
          const { activityTrackingService } = await import('./activity-tracking.service');
          const changes: Record<string, any> = {};
          if (application.status !== undefined) changes.status = application.status;
          if (application.contractSigned !== undefined) changes.contractSigned = application.contractSigned;
          if (application.contractReviewComments !== undefined) {
            changes.contractReviewComments = application.contractReviewComments;
          }
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
      })();
      
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
      // Admin/super_admin only — customers must use SkipCash webhook / credits RPC / bank pending flow
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        return { status: 'ERROR', message: 'Unauthorized', data: {} as Application };
      }
      const { data: isAdminFlag, error: adminCheckErr } = await supabase.rpc('is_admin');
      if (adminCheckErr || isAdminFlag !== true) {
        return {
          status: 'ERROR',
          message: 'Only admins can mark installments as paid',
          data: {} as Application,
        };
      }

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

      // 2) Update payment_schedules first — fail closed (do not touch JSON on schedule failure)
      const { data: existingRows, error: selectError } = await supabase
        .from('payment_schedules')
        .select('id, paid_amount, paid_date')
        .eq('application_id', applicationId)
        .eq('due_date', paymentDueDate)
        .limit(1);

      if (selectError) {
        console.error('❌ markInstallmentAsPaid: select from payment_schedules failed', selectError);
        return {
          status: 'ERROR',
          message: selectError.message || 'Failed to read payment schedule row',
          data: {} as Application,
        };
      }

      // Idempotent schedule write: set absolute target from JSON intent (newPaidAmount),
      // never += onto existing schedule paid_amount (safe if JSON update previously failed).
      if (existingRows && existingRows.length > 0) {
        const existingId = existingRows[0].id;

        const { error: updateError } = await supabase
          .from('payment_schedules')
          .update({
            status: remainingAmount <= 0 ? 'paid' : 'partially_paid',
            paid_date: remainingAmount <= 0 ? paidAt : (existingRows[0].paid_date || paidAt),
            paid_amount: newPaidAmount,
            remaining_amount: Math.max(0, remainingAmount),
            updated_at: paidAt,
          })
          .eq('id', existingId);

        if (updateError) {
          console.error('❌ markInstallmentAsPaid: update payment_schedules failed', updateError);
          return {
            status: 'ERROR',
            message: updateError.message || 'Failed to update payment schedule row',
            data: {} as Application,
          };
        }
      } else {
        const { error: insertError } = await supabase
          .from('payment_schedules')
          .insert({
            application_id: applicationId,
            due_date: paymentDueDate,
            amount: originalAmount,
            paid_amount: newPaidAmount,
            remaining_amount: Math.max(0, remainingAmount),
            status: remainingAmount <= 0 ? 'paid' : 'partially_paid',
            paid_date: remainingAmount <= 0 ? paidAt : undefined,
            created_at: paidAt,
            updated_at: paidAt,
          });

        if (insertError) {
          console.error('❌ markInstallmentAsPaid: insert into payment_schedules failed', insertError);
          return {
            status: 'ERROR',
            message: insertError.message || 'Failed to insert payment schedule row',
            data: {} as Application,
          };
        }
      }

      // 3) Update the application installmentPlan JSON (only after schedule write succeeds)
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

      if (updateResult.status !== 'SUCCESS') {
        return {
          status: 'ERROR',
          message:
            updateResult.message ||
            'Payment schedule updated but application installment plan failed — safe to retry',
          data: {} as Application,
        };
      }

      // Audit trail: log the admin mark-paid action
      void this.insertAuditLog(
        'MARK_PAID',
        'payment_schedules',
        applicationId,
        `Admin marked installment for ${applicationId} due ${paymentDueDate} as paid (amount: ${paidAmount})`,
      );

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

  /**
   * Admin: replace payment_schedules rows from application.installment_plan.schedule.
   * Used after convert/edit schedule so dashboard rows match JSON.
   * Full replace (delete + insert) — call only after intentional schedule rewrite.
   */
  async replacePaymentSchedulesFromInstallmentPlan(
    applicationId: string
  ): Promise<ApiResponse<{ rows: number }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        return { status: 'ERROR', message: 'Unauthorized', data: { rows: 0 } };
      }
      const { data: isAdminFlag, error: adminCheckErr } = await supabase.rpc('is_admin');
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const role = (profile?.role || '').trim().toLowerCase();
      const canRebuild =
        isAdminFlag === true || role === 'finance_officer';
      if (adminCheckErr || !canRebuild) {
        return {
          status: 'ERROR',
          message: 'Only admins or finance officers can rebuild payment schedules',
          data: { rows: 0 },
        };
      }

      const appRes = await this.getApplicationById(applicationId);
      if (appRes.status !== 'SUCCESS' || !appRes.data?.installmentPlan?.schedule) {
        return {
          status: 'ERROR',
          message: appRes.message || 'Application schedule not found',
          data: { rows: 0 },
        };
      }

      const schedule = appRes.data.installmentPlan.schedule;
      if (!Array.isArray(schedule) || schedule.length === 0) {
        return { status: 'ERROR', message: 'Installment schedule is empty', data: { rows: 0 } };
      }

      const { error: delErr } = await supabase
        .from('payment_schedules')
        .delete()
        .eq('application_id', applicationId);

      if (delErr) {
        return {
          status: 'ERROR',
          message: delErr.message || 'Failed to clear existing payment schedules',
          data: { rows: 0 },
        };
      }

      const now = new Date().toISOString();
      const rows = schedule
        .map((payment: any) => {
          const dueDate = payment?.dueDate || payment?.due_date;
          if (!dueDate) return null;
          const amount = Number(payment.amount) || 0;
          const paidAmount = Number(payment.paidAmount ?? payment.paid_amount) || 0;
          let status = String(payment.status || 'upcoming').toLowerCase();
          if (status === 'completed') status = 'paid';
          if (status === 'partial' || status === 'partially paid') status = 'partially_paid';
          if (paidAmount >= amount && amount > 0) status = 'paid';
          else if (paidAmount > 0 && status !== 'paid') status = 'partially_paid';

          return {
            application_id: applicationId,
            due_date: dueDate,
            amount,
            paid_amount: paidAmount,
            remaining_amount: Math.max(0, amount - paidAmount),
            status,
            paid_date: status === 'paid' ? payment.paidDate || payment.paid_date || now : null,
            created_at: now,
            updated_at: now,
          };
        })
        .filter(Boolean) as Record<string, unknown>[];

      if (rows.length === 0) {
        return { status: 'ERROR', message: 'No valid schedule rows to insert', data: { rows: 0 } };
      }

      const { error: insErr } = await supabase.from('payment_schedules').insert(rows);
      if (insErr) {
        return {
          status: 'ERROR',
          message: insErr.message || 'Failed to insert rebuilt payment schedules',
          data: { rows: 0 },
        };
      }

      return {
        status: 'SUCCESS',
        message: 'Payment schedules rebuilt from installment plan',
        data: { rows: rows.length },
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to rebuild payment schedules',
        data: { rows: 0 },
      };
    }
  }


  /**
   * Admin: confirm a pending bank_transfer payment_transactions row.
   * Claim pending→processing first, mark schedules, then complete.
   * Retries on processing skip already-applied marks to avoid double-pay.
   */
  async confirmPendingBankTransfer(transactionId: string): Promise<ApiResponse<{ applicationId: string }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        return { status: 'ERROR', message: 'Unauthorized', data: { applicationId: '' } };
      }
      const { data: isAdminFlag, error: adminCheckErr } = await supabase.rpc('is_admin');
      if (adminCheckErr || isAdminFlag !== true) {
        return { status: 'ERROR', message: 'Only admins can confirm bank transfers', data: { applicationId: '' } };
      }

      const { data: txn, error: txnErr } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (txnErr || !txn) {
        return { status: 'ERROR', message: txnErr?.message || 'Transaction not found', data: { applicationId: '' } };
      }
      if (txn.method !== 'bank_transfer') {
        return { status: 'ERROR', message: 'Not a bank transfer transaction', data: { applicationId: '' } };
      }
      if (txn.status === 'completed') {
        return { status: 'SUCCESS', message: 'Already confirmed', data: { applicationId: txn.application_id || '' } };
      }
      if (txn.status !== 'pending' && txn.status !== 'processing') {
        return { status: 'ERROR', message: `Cannot confirm transaction in status ${txn.status}`, data: { applicationId: '' } };
      }
      if (!txn.application_id) {
        return { status: 'ERROR', message: 'Transaction missing application_id', data: { applicationId: '' } };
      }

      let claimedFromPending = false;
      if (txn.status === 'pending') {
        const { data: claimed, error: claimErr } = await supabase
          .from('payment_transactions')
          .update({ status: 'processing' })
          .eq('transaction_id', transactionId)
          .eq('status', 'pending')
          .select('transaction_id')
          .maybeSingle();

        if (claimErr || !claimed) {
          return {
            status: 'ERROR',
            message: claimErr?.message || 'Could not claim bank transfer (already claimed?)',
            data: { applicationId: txn.application_id },
          };
        }
        claimedFromPending = true;
      }

      let meta: any = {};
      try {
        meta = txn.failure_reason ? JSON.parse(txn.failure_reason) : {};
      } catch {
        // Legacy plain-text failure_reason: parse "due YYYY-MM-DD"
        const m = String(txn.failure_reason || '').match(/due\s+(\d{4}-\d{2}-\d{2}|settlement)/i);
        if (m) meta = { dueDate: m[1], isSettlement: m[1] === 'settlement' };
      }

      const isSettlement = !!meta.isSettlement || meta.dueDate === 'settlement';
      const amount = Number(txn.amount) || 0;

      const revertClaim = async () => {
        if (!claimedFromPending) return;
        await supabase
          .from('payment_transactions')
          .update({ status: 'pending' })
          .eq('transaction_id', transactionId)
          .eq('status', 'processing');
      };

      const installmentFullyPaid = (schedule: any[] | undefined, dueDate: string): boolean => {
        const row = (schedule || []).find((p: any) => p.dueDate === dueDate);
        if (!row) return false;
        if (row.status === 'paid') return true;
        const remaining = Number(row.remainingAmount);
        if (Number.isFinite(remaining)) return remaining <= 0;
        const total = Number(row.amount) || 0;
        const paid = Number(row.paidAmount) || 0;
        return total > 0 && paid >= total;
      };

      try {
        if (isSettlement) {
          const appRes = await this.getApplicationById(txn.application_id);
          if (appRes.status !== 'SUCCESS' || !appRes.data?.installmentPlan?.schedule) {
            await revertClaim();
            return { status: 'ERROR', message: 'Application schedule not found', data: { applicationId: '' } };
          }
          const unpaid = appRes.data.installmentPlan.schedule.filter((p: any) => p.status !== 'paid');
          if (unpaid.length > 0) {
            const totalRemaining = unpaid.reduce(
              (s: number, p: any) => s + (Number(p.remainingAmount ?? p.amount) || 0),
              0
            );
            // Cap to remaining unpaid so a retry after partial marks cannot over-allocate.
            const toApply = Math.min(amount, totalRemaining);
            if (toApply > 0 && totalRemaining > 0) {
              // Each installment targets a distinct due_date row — run in parallel
              // instead of sequential O(n) awaits to avoid N×RTT latency.
              const markResults = await Promise.all(
                unpaid.map((payment) => {
                  const rem = Number(payment.remainingAmount ?? payment.amount) || 0;
                  const portion = (rem / totalRemaining) * toApply;
                  if (portion <= 0) return Promise.resolve({ status: 'SUCCESS' as const, message: '', data: { applicationId: '' } });
                  return this.markInstallmentAsPaid(txn.application_id, payment.dueDate, portion);
                })
              );
              const failedMark = markResults.find((r) => r.status !== 'SUCCESS');
              if (failedMark) {
                await revertClaim();
                return {
                  status: 'ERROR',
                  message: failedMark.message || 'Failed to mark installment',
                  data: { applicationId: '' },
                };
              }
            }
          }
        } else {
          const dueDate = meta.dueDate || null;
          if (!dueDate || dueDate === 'settlement') {
            await revertClaim();
            return { status: 'ERROR', message: 'Bank transfer missing dueDate metadata', data: { applicationId: '' } };
          }

          const appRes = await this.getApplicationById(txn.application_id);
          const alreadyPaid =
            appRes.status === 'SUCCESS' &&
            installmentFullyPaid(appRes.data?.installmentPlan?.schedule, dueDate);

          if (!alreadyPaid) {
            const mark = await this.markInstallmentAsPaid(txn.application_id, dueDate, amount);
            if (mark.status !== 'SUCCESS') {
              await revertClaim();
              return {
                status: 'ERROR',
                message: mark.message || 'Failed to mark installment',
                data: { applicationId: '' },
              };
            }
          }
        }
      } catch (markErr: any) {
        await revertClaim();
        return {
          status: 'ERROR',
          message: markErr?.message || 'Failed to mark installment',
          data: { applicationId: txn.application_id },
        };
      }

      const { data: completed, error: updErr } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq('transaction_id', transactionId)
        .eq('status', 'processing')
        .select('transaction_id')
        .maybeSingle();

      if (updErr || !completed) {
        return {
          status: 'ERROR',
          message:
            updErr?.message ||
            'Installments updated but transaction still processing — retry confirm (safe)',
          data: { applicationId: txn.application_id },
        };
      }

      // Fire payment receipt email for confirmed bank transfer.
      // customer_email may not be on payment_transactions; look it up from applications.
      void (async () => {
        try {
          const { data: app } = await supabase
            .from('applications')
            .select('customer_email')
            .eq('id', txn.application_id)
            .maybeSingle();
          const emailReceipt = app?.customer_email as string | null;
          if (emailReceipt) {
            await this.triggerTransactionalEmail({
              to: emailReceipt.toLowerCase(),
              templateId: 'payment_receipt',
              data: { applicationId: txn.application_id, amount, method: 'Bank Transfer' },
              userEmail: emailReceipt.toLowerCase(),
              idempotencyKey: `receipt:bank:${transactionId}`,
            });
          }
        } catch {
          // Non-fatal — never block the confirm flow
        }
      })();

      return {
        status: 'SUCCESS',
        message: 'Bank transfer confirmed',
        data: { applicationId: txn.application_id },
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to confirm bank transfer',
        data: { applicationId: '' },
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
          mapped.insuranceRate = mapInsuranceRateRow(offer.insurance_rate);
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
        mapped.insuranceRate = mapInsuranceRateRow(offer.insurance_rate);
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
      supabaseCache.invalidate('offers:all');
      
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
      supabaseCache.invalidate('offers:all');
      
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
      
      const promotions = handleSupabaseResponse<any[]>(response).map(mapPromotionRow);
      
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
      
      const createdPromo = mapPromotionRow(handleSupabaseResponse<any>(response));
      
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
      
      const updatedPromo = mapPromotionRow(handleSupabaseResponse<any>(response));
      
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
      supabaseCache.invalidate('offers:all');
      
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
      
      const promo = mapPromotionRow(handleSupabaseResponse<any>(response));
      
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
      
      const rates = handleSupabaseResponse<any[]>(response).map(mapInsuranceRateRow);
      
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
      
      const rate = mapInsuranceRateRow(handleSupabaseResponse<any>(response));
      
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
      
      const createdRate = mapInsuranceRateRow(handleSupabaseResponse<any>(response));
      
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
      
      const updatedRate = mapInsuranceRateRow(handleSupabaseResponse<any>(response));
      
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
  async getLedgers(options?: { applicationId?: string; limit?: number; offset?: number }): Promise<ApiResponse<Ledger[]>> {
    try {
      const { applicationId, limit, offset = 0 } = options ?? {};
      let query = supabase
        .from('ledgers')
        .select('*')
        .order('date', { ascending: false });

      // Scope to a single application when provided — avoids full-table scan.
      if (applicationId) {
        query = query.eq('application_id', applicationId);
      }
      if (limit != null) {
        query = query.range(offset, offset + limit - 1);
      }

      const response = await query;
      
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
  /**
   * Fire-and-forget BLOX-branded transactional email via the send-email edge function.
   * Never throws — email failures must not break the calling action.
   */
  async triggerTransactionalEmail(args: {
    to: string;
    templateId: string;
    data?: Record<string, unknown>;
    userEmail?: string;
    idempotencyKey?: string;
  }): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', { body: args });
    } catch (err) {
      console.error('triggerTransactionalEmail failed (non-fatal):', err);
    }
  }

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

  async getCompanyById(id: string): Promise<ApiResponse<Company>> {
    try {
      const response = await supabase.from('companies').select('*').eq('id', id).single();
      const company = mapSupabaseRow<Company>(handleSupabaseResponse<any>(response));
      return { status: 'SUCCESS', data: company, message: 'Company fetched successfully' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch company',
        data: {} as Company,
      };
    }
  }

  /**
   * Partner Hub list KPIs: vehicles, open credit apps, dealer agents, assigned credit officers.
   */
  async getPartnerHubSummaries(): Promise<ApiResponse<PartnerHubSummary[]>> {
    try {
      const companiesRes = await this.getCompanies();
      if (companiesRes.status !== 'SUCCESS' || !companiesRes.data) {
        throw new Error(companiesRes.message || 'Failed to load companies');
      }

      const [
        { data: productRows, error: productErr },
        { data: agentRows, error: agentErr },
        { data: cocRows, error: cocErr },
        { data: appRows, error: appErr },
      ] = await Promise.all([
        supabase.from('products').select('company_id').not('company_id', 'is', null),
        supabase.from('users').select('company_id').eq('role', 'dealer_agent'),
        supabase.from('credit_officer_companies').select('company_id'),
        supabase
          .from('applications')
          .select('company_id')
          .not('company_id', 'is', null)
          .in('status', [
            'under_review',
            'resubmission_required',
            'contract_signing_required',
            'contracts_submitted',
            'contract_under_review',
            'down_payment_required',
            'down_payment_submitted',
          ]),
      ]);

      if (productErr) throw productErr;
      if (agentErr) throw agentErr;
      if (cocErr) throw cocErr;
      if (appErr) throw appErr;

      const countBy = (rows: { company_id?: string | null }[] | null) => {
        const map = new Map<string, number>();
        for (const r of rows || []) {
          const id = r.company_id;
          if (!id) continue;
          map.set(id, (map.get(id) || 0) + 1);
        }
        return map;
      };

      const vehicles = countBy(productRows as { company_id?: string | null }[]);
      const agents = countBy(agentRows as { company_id?: string | null }[]);
      const officers = countBy(cocRows as { company_id?: string | null }[]);
      const apps = countBy(appRows as { company_id?: string | null }[]);

      const summaries: PartnerHubSummary[] = companiesRes.data.map((c) => ({
        ...c,
        vehicleCount: vehicles.get(c.id) || 0,
        openApplicationCount: apps.get(c.id) || 0,
        dealerAgentCount: agents.get(c.id) || 0,
        creditOfficerCount: officers.get(c.id) || 0,
      }));

      return {
        status: 'SUCCESS',
        data: summaries,
        message: 'Partner hub summaries fetched',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch partner hub summaries',
        data: [],
      };
    }
  }

  async getProductsByCompanyId(companyId: string): Promise<ApiResponse<Product[]>> {
    try {
      const response = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      const products = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Product>);
      return { status: 'SUCCESS', data: products, message: 'Products fetched' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to fetch products', data: [] };
    }
  }

  async getUsersByCompanyId(companyId: string): Promise<ApiResponse<User[]>> {
    try {
      const response = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      const users = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<User>);
      return { status: 'SUCCESS', data: users, message: 'Users fetched' };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message || 'Failed to fetch users', data: [] };
    }
  }

  async getCreditOfficers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await supabase
        .from('users')
        .select('*')
        .eq('role', 'credit_officer')
        .order('email', { ascending: true });
      const users = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<User>);
      return { status: 'SUCCESS', data: users, message: 'Credit officers fetched' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch credit officers',
        data: [],
      };
    }
  }

  async getCreditOfficerCompanyIds(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('credit_officer_companies')
        .select('company_id')
        .eq('user_id', userId);
      if (error) throw error;
      return {
        status: 'SUCCESS',
        data: (data || []).map((r: { company_id: string }) => r.company_id),
        message: 'Assignments fetched',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch credit officer assignments',
        data: [],
      };
    }
  }

  async getCreditOfficersForCompany(companyId: string): Promise<ApiResponse<User[]>> {
    try {
      const { data: links, error } = await supabase
        .from('credit_officer_companies')
        .select('user_id')
        .eq('company_id', companyId);
      if (error) throw error;
      const ids = (links || []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) {
        return { status: 'SUCCESS', data: [], message: 'No credit officers assigned' };
      }
      const response = await supabase.from('users').select('*').in('id', ids);
      const users = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<User>);
      return { status: 'SUCCESS', data: users, message: 'Credit officers fetched' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch credit officers for company',
        data: [],
      };
    }
  }

  /**
   * Replace credit-officer ↔ company memberships for one company (admin).
   * Pass the full desired set of credit_officer user ids for this partner.
   */
  async setCompanyCreditOfficers(
    companyId: string,
    creditOfficerUserIds: string[]
  ): Promise<ApiResponse<{ companyId: string; userIds: string[] }>> {
    try {
      const desired = [...new Set(creditOfficerUserIds.filter(Boolean))];
      const { data: existing, error: existingErr } = await supabase
        .from('credit_officer_companies')
        .select('user_id')
        .eq('company_id', companyId);
      if (existingErr) throw existingErr;

      const current = new Set(
        (existing || []).map((r: { user_id: string }) => r.user_id)
      );
      const desiredSet = new Set(desired);
      const toRemove = [...current].filter((id) => !desiredSet.has(id));
      const toAdd = desired.filter((id) => !current.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('credit_officer_companies')
          .delete()
          .eq('company_id', companyId)
          .in('user_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('credit_officer_companies').insert(
          toAdd.map((user_id) => ({ user_id, company_id: companyId }))
        );
        if (error) throw error;
      }

      return {
        status: 'SUCCESS',
        data: { companyId, userIds: desired },
        message: 'Credit officer assignments updated',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update credit officer assignments',
        data: { companyId, userIds: [] },
      };
    }
  }

  /** Credit portal: current officer scope + assignment count for empty states. */
  async getMyCreditAssignmentInfo(): Promise<
    ApiResponse<{ creditScope: 'all' | 'assigned'; companyIds: string[] }>
  > {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        throw new Error('Not authenticated');
      }
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('credit_scope, role')
        .eq('id', uid)
        .single();
      if (userErr) throw userErr;
      const creditScope =
        ((userRow as { credit_scope?: string } | null)?.credit_scope as
          | 'all'
          | 'assigned') || 'assigned';
      const { data: links, error: linkErr } = await supabase
        .from('credit_officer_companies')
        .select('company_id')
        .eq('user_id', uid);
      if (linkErr) throw linkErr;
      return {
        status: 'SUCCESS',
        data: {
          creditScope,
          companyIds: (links || []).map((r: { company_id: string }) => r.company_id),
        },
        message: 'Credit assignment info',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to load credit assignment info',
        data: { creditScope: 'assigned', companyIds: [] },
      };
    }
  }

  async getFinanceOfficers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await supabase
        .from('users')
        .select('*')
        .eq('role', 'finance_officer')
        .order('email', { ascending: true });
      const users = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<User>);
      return { status: 'SUCCESS', data: users, message: 'Finance officers fetched' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch finance officers',
        data: [],
      };
    }
  }

  async getFinanceOfficersForCompany(companyId: string): Promise<ApiResponse<User[]>> {
    try {
      const { data: links, error } = await supabase
        .from('finance_officer_companies')
        .select('user_id')
        .eq('company_id', companyId);
      if (error) throw error;
      const ids = (links || []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) {
        return { status: 'SUCCESS', data: [], message: 'No finance officers assigned' };
      }
      const response = await supabase.from('users').select('*').in('id', ids);
      const users = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<User>);
      return { status: 'SUCCESS', data: users, message: 'Finance officers fetched' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch finance officers for company',
        data: [],
      };
    }
  }

  /**
   * Replace finance-officer ↔ company memberships for one company (admin).
   * Does not change finance_scope; set scope via SQL/users row when needed.
   */
  async setCompanyFinanceOfficers(
    companyId: string,
    financeOfficerUserIds: string[]
  ): Promise<ApiResponse<{ companyId: string; userIds: string[] }>> {
    try {
      const desired = [...new Set(financeOfficerUserIds.filter(Boolean))];
      const { data: existing, error: existingErr } = await supabase
        .from('finance_officer_companies')
        .select('user_id')
        .eq('company_id', companyId);
      if (existingErr) throw existingErr;

      const current = new Set(
        (existing || []).map((r: { user_id: string }) => r.user_id)
      );
      const desiredSet = new Set(desired);
      const toRemove = [...current].filter((id) => !desiredSet.has(id));
      const toAdd = desired.filter((id) => !current.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('finance_officer_companies')
          .delete()
          .eq('company_id', companyId)
          .in('user_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('finance_officer_companies').insert(
          toAdd.map((user_id) => ({ user_id, company_id: companyId }))
        );
        if (error) throw error;
      }

      return {
        status: 'SUCCESS',
        data: { companyId, userIds: desired },
        message: 'Finance officer assignments updated',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update finance officer assignments',
        data: { companyId, userIds: [] },
      };
    }
  }

  /** Finance portal: current officer scope + company assignments. */
  async getMyFinanceAssignmentInfo(): Promise<
    ApiResponse<{ financeScope: 'all' | 'assigned'; companyIds: string[] }>
  > {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        throw new Error('Not authenticated');
      }
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('finance_scope, role')
        .eq('id', uid)
        .single();
      if (userErr) throw userErr;
      const financeScope =
        ((userRow as { finance_scope?: string } | null)?.finance_scope as
          | 'all'
          | 'assigned') || 'all';
      const { data: links, error: linkErr } = await supabase
        .from('finance_officer_companies')
        .select('company_id')
        .eq('user_id', uid);
      if (linkErr) throw linkErr;
      return {
        status: 'SUCCESS',
        data: {
          financeScope,
          companyIds: (links || []).map((r: { company_id: string }) => r.company_id),
        },
        message: 'Finance assignment info',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to load finance assignment info',
        data: { financeScope: 'all', companyIds: [] },
      };
    }
  }

  /** Active sibling variants sharing model_family_key (detail page strip). */
  async getSiblingProductsByFamily(
    productId: string,
    modelFamilyKey: string
  ): Promise<ApiResponse<Product[]>> {
    try {
      if (!modelFamilyKey) {
        return { status: 'SUCCESS', data: [], message: 'No family key' };
      }
      const response = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('id', productId)
        .contains('attributes', [
          { id: 'model_family_key', name: 'model_family_key', value: modelFamilyKey },
        ]);
      let products = handleSupabaseResponse<any[]>(response).map(mapSupabaseRow<Product>);

      // Fallback if jsonb contains matching is picky about attribute shape
      if (products.length === 0) {
        const allRes = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .neq('id', productId);
        const all = handleSupabaseResponse<any[]>(allRes).map(mapSupabaseRow<Product>);
        products = all.filter((p) => getModelFamilyKey(p) === modelFamilyKey);
      }

      return { status: 'SUCCESS', data: products, message: 'Sibling products fetched' };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to fetch sibling products',
        data: [],
      };
    }
  }

  /**
   * Narrow id → display name map for queue/list UIs.
   * Avoids getUsers() (admin RPC + full applications aggregate).
   */
  async getUserDisplayNamesByIds(
    ids: string[]
  ): Promise<ApiResponse<Record<string, string>>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) {
      return { status: 'SUCCESS', data: {}, message: 'No user ids' };
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, first_name, last_name')
        .in('id', unique);
      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to load user names',
          data: {},
        };
      }
      const map: Record<string, string> = {};
      for (const row of data || []) {
        const r = row as {
          id: string;
          email?: string;
          name?: string;
          first_name?: string;
          last_name?: string;
        };
        map[r.id] =
          (r.name || `${r.first_name || ''} ${r.last_name || ''}`).trim() ||
          r.email ||
          r.id;
      }
      return { status: 'SUCCESS', data: map, message: 'User names loaded' };
    } catch (error: unknown) {
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to load user names',
        data: {},
      };
    }
  }

  async updateUserRole(userId: string, role: string): Promise<ApiResponse<User>> {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_set_user_role', {
        p_user_id: userId,
        p_role: role,
      });
      if (rpcError) {
        return {
          status: 'ERROR',
          message: rpcError.message || 'Failed to update user role',
          data: {} as User,
        };
      }
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!row) {
        return {
          status: 'ERROR',
          message: 'User not found',
          data: {} as User,
        };
      }
      return {
        status: 'SUCCESS',
        data: mapSupabaseRow<User>(row),
        message: 'User role updated successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to update user role',
        data: {} as User,
      };
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

      // Application counts / light backfill — narrow columns only (no vehicle/offer joins).
      // Avoids getApplications() full-table join payload on every Users list load.
      try {
        const { data: appRows, error: appAggError } = await supabase
          .from('applications')
          .select(
            'customer_email, customer_name, customer_phone, customer_info, status, blox_membership, created_at, updated_at'
          )
          .order('created_at', { ascending: false });

        if (appAggError) {
          console.warn('getUsers: application aggregate query failed', appAggError.message);
        } else if (appRows) {
          const latestAppByEmail = new Map<string, any>();
          (appRows as any[]).forEach((app) => {
            const email = (app.customer_email || '').toLowerCase();
            if (!email) return;
            if (!latestAppByEmail.has(email)) latestAppByEmail.set(email, app);

            if (!userMap.has(email)) return;
            const user = userMap.get(email)!;
            user.totalApplications = (user.totalApplications || 0) + 1;
            if (app.status === 'active') {
              user.activeApplications = (user.activeApplications || 0) + 1;
            }
            const membership = app.blox_membership;
            if (
              membership &&
              (membership.isActive === true || membership.is_active === true)
            ) {
              user.membershipStatus = 'active';
            }
          });

          userMap.forEach((user, email) => {
            const latest = latestAppByEmail.get(email);
            if (!latest) return;

            const customerInfo = latest.customer_info || {};
            const nameFromApp = latest.customer_name || '';
            const phoneFromApp = latest.customer_phone || '';

            if (!user.name && nameFromApp) user.name = nameFromApp;
            if (!user.firstName || !user.lastName) {
              const parts = (nameFromApp || '').trim().split(/\s+/).filter(Boolean);
              if (!user.firstName && parts.length > 0) user.firstName = parts[0];
              if (!user.lastName && parts.length > 1) user.lastName = parts.slice(1).join(' ');
            }
            if (!user.firstName && customerInfo.firstName) user.firstName = customerInfo.firstName;
            if (!user.lastName && customerInfo.lastName) user.lastName = customerInfo.lastName;
            if (!user.phone && (phoneFromApp || customerInfo.phone)) {
              user.phone = phoneFromApp || customerInfo.phone;
            }
            if (!user.nationalId && customerInfo.nationalId) user.nationalId = customerInfo.nationalId;
            if (!user.nationality && customerInfo.nationality) {
              user.nationality = customerInfo.nationality;
            }
            if (!user.gender && customerInfo.gender) user.gender = customerInfo.gender;
          });
        }
      } catch (aggErr) {
        console.warn('getUsers: application aggregate failed', aggErr);
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
          const applicationsResponse = await this.getApplications({
            customerEmail: email,
            lean: true,
            skipCache: true,
          });
          if (applicationsResponse.status === 'SUCCESS' && applicationsResponse.data) {
            const userApplications = applicationsResponse.data;

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

