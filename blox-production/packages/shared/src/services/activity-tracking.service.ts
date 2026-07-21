import { supabase } from './supabase.service';
import type { User } from '../models/user.model';

export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'login' 
  | 'logout'
  | 'approve'
  | 'reject'
  | 'export'
  | 'download'
  | 'upload'
  | 'payment'
  | 'sign_contract'
  | 'search'
  | 'filter';

export type ResourceType =
  | 'application'
  | 'product'
  | 'offer'
  | 'package'
  | 'promotion'
  | 'payment'
  | 'user'
  | 'contract'
  | 'document'
  | 'credit'
  | 'settings'
  | 'dashboard'
  | 'ledger';

export interface ActivityLog {
  id?: string;
  userId?: string;
  userEmail: string;
  userRole?: string;
  actionType: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt?: string;
}

class ActivityTrackingService {
  private getClientInfo(): { ipAddress?: string; userAgent?: string } {
    if (typeof window === 'undefined') {
      return {};
    }

    return {
      userAgent: navigator.userAgent,
      // IP address would need to be obtained from backend
    };
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('blox_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('blox_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Log a user activity
   */
  async logActivity(
    actionType: ActionType,
    resourceType: ResourceType,
    options: {
      resourceId?: string;
      resourceName?: string;
      description: string;
      metadata?: Record<string, unknown>;
      user?: User | null;
    }
  ): Promise<void> {
    try {
      console.log('[ActivityTracking] logActivity called with:', { actionType, resourceType, options });
      
      // If user is explicitly provided (e.g., during logout), use it
      // Otherwise, try to get current user from auth
      let authUser = null;
      let getUserError = null;
      
      if (!options.user) {
        try {
          const result = await supabase.auth.getUser();
          authUser = result.data?.user || null;
          getUserError = result.error;
        } catch (error) {
          getUserError = error;
        }
      }
      
      console.log('[ActivityTracking] Current auth user:', authUser ? { id: authUser.id, email: authUser.email } : 'null', 'Error:', getUserError, 'Provided user:', options.user ? { id: options.user.id, email: options.user.email } : 'null');
      
      // Use provided user if available, otherwise use auth user
      if (!options.user && !authUser) {
        // Don't log if no user (might be public access)
        console.warn('[ActivityTracking] No user found, skipping activity log');
        return;
      }

      let resolvedRole = 'unknown';
      if (options.user?.role) {
        resolvedRole = options.user.role;
      } else if (authUser?.id) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle();
          const r = (profile?.role || '').trim().toLowerCase();
          if (r === 'customer' || r === 'admin' || r === 'super_admin') {
            resolvedRole = r;
          }
        } catch {
          resolvedRole = 'unknown';
        }
      }

      const user = options.user || {
        id: authUser?.id || '',
        email: authUser?.email || 'unknown',
        role: resolvedRole,
      };

      const clientInfo = this.getClientInfo();
      const sessionId = this.getSessionId();

      const activityLog: Omit<ActivityLog, 'id' | 'createdAt'> = {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        actionType,
        resourceType,
        resourceId: options.resourceId,
        resourceName: options.resourceName,
        description: options.description,
        metadata: options.metadata || {},
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        sessionId,
      };

      // Insert into activity_logs table
      console.log('[ActivityTracking] Attempting to insert activity log:', {
        userEmail: activityLog.userEmail,
        userRole: activityLog.userRole,
        actionType: activityLog.actionType,
        resourceType: activityLog.resourceType,
      });
      
      // Fail closed: only SECURITY DEFINER RPC (no direct client INSERT — forgeable)
      const { error: rpcError } = await supabase.rpc('log_activity_secure', {
        p_action: activityLog.actionType,
        p_resource_type: activityLog.resourceType,
        p_resource_id: activityLog.resourceId || null,
        p_resource_name: activityLog.resourceName || null,
        p_description: activityLog.description,
        p_metadata: {
          ...(activityLog.metadata || {}),
          user_role: activityLog.userRole,
          user_email: activityLog.userEmail,
        },
      });

      if (rpcError) {
        console.error('[ActivityTracking] log_activity_secure failed:', rpcError);
        return;
      }
      console.log('[ActivityTracking] Activity logged via log_activity_secure');
    } catch (error) {
      // Log the error but don't throw - activity logging should not break the app
      console.error('[ActivityTracking] Activity logging exception:', error);
    }
  }

  /**
   * Get activity logs (super admin only)
   */
  async getActivityLogs(options: {
    userId?: string;
    userEmail?: string;
    actionType?: ActionType;
    resourceType?: ResourceType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ActivityLog[]; total: number }> {
    try {
      console.log('[ActivityTracking] Starting getActivityLogs with options:', options);
      
      // Get current user info for debugging (role from public.users, not metadata)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let debugRole = 'unknown';
      if (authUser?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();
        debugRole = (profile?.role || 'unknown').toString();
      }
      console.log('[ActivityTracking] Current auth user:', {
        id: authUser?.id,
        email: authUser?.email,
        role: debugRole,
      });
      
      // Build the main query directly (skip test query to avoid double query)
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.userEmail) {
        query = query.eq('user_email', options.userEmail);
      }

      if (options.actionType) {
        query = query.eq('action_type', options.actionType);
      }

      if (options.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      console.log('[ActivityTracking] Executing query...');
      
      // Execute query with timeout
      let queryResult: { data: any; error: any; count: number | null };
      try {
        const queryPromise = query;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 10 seconds - RLS policy may be blocking access')), 10000)
        );
        
        queryResult = await Promise.race([queryPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.error('[ActivityTracking] Query timed out:', timeoutError);
        const errorMsg = timeoutError instanceof Error ? timeoutError.message : 'Query timeout';
        throw new Error(`${errorMsg}. This usually means RLS policy is blocking access. Please run FIX_ACTIVITY_LOGS_ACCESS.sql in Supabase SQL Editor to fix the RLS policy.`);
      }
      
      const { data, error, count } = queryResult;
      console.log('[ActivityTracking] Query completed. Data:', data?.length || 0, 'rows, Count:', count, 'Error:', error);

      if (error) {
        console.error('[ActivityTracking] Activity logs query error:', error);
        console.error('[ActivityTracking] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Provide more helpful error messages
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          let currentRole = 'unknown';
          if (authUser?.id) {
            const { data: profile } = await supabase
              .from('users')
              .select('role')
              .eq('id', authUser.id)
              .maybeSingle();
            currentRole = (profile?.role || 'unknown').toString();
          }
          throw new Error(
            `Access denied: You must be logged in as super_admin to view activity logs. ` +
            `Current role: ${currentRole || 'unknown'}.`
          );
        }
        
        throw new Error(error.message || 'Failed to fetch activity logs');
      }

      console.log('[ActivityTracking] Mapping logs...');
      const logs: ActivityLog[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        actionType: row.action_type,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        resourceName: row.resource_name,
        description: row.description,
        metadata: row.metadata || {},
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        sessionId: row.session_id,
        createdAt: row.created_at,
      }));

      console.log('[ActivityTracking] Returning', logs.length, 'logs, total:', count || 0);
      return {
        data: logs,
        total: count || 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch activity logs';
      console.error('[ActivityTracking] Exception in getActivityLogs:', error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(options: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Array<{ userEmail: string; count: number }>;
    actionsByResource: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('activity_logs')
        .select('action_type, resource_type, user_email');

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Activity stats query error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(error.message || 'Failed to fetch activity stats');
      }

      const actionsByType: Record<string, number> = {};
      const actionsByResource: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      (data || []).forEach((log: any) => {
        // Count by action type
        actionsByType[log.action_type] = (actionsByType[log.action_type] || 0) + 1;
        
        // Count by resource type
        actionsByResource[log.resource_type] = (actionsByResource[log.resource_type] || 0) + 1;
        
        // Count by user
        userCounts[log.user_email] = (userCounts[log.user_email] || 0) + 1;
      });

      const actionsByUser = Object.entries(userCounts)
        .map(([userEmail, count]) => ({ userEmail, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalActions: data?.length || 0,
        actionsByType,
        actionsByUser,
        actionsByResource,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch activity stats');
    }
  }
}

export const activityTrackingService = new ActivityTrackingService();
