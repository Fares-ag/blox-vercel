/**
 * Role-Based Access Control (RBAC) utilities
 */

export type UserRole = 'admin' | 'super_admin' | 'customer' | 'viewer';

export interface Permission {
  resource: string;
  action: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

/**
 * Define permissions for each role
 */
const rolePermissions: RolePermissions[] = [
  {
    role: 'super_admin',
    permissions: [
      // Super admin has all admin permissions PLUS activity log access
      { resource: 'applications', action: 'create' },
      { resource: 'applications', action: 'read' },
      { resource: 'applications', action: 'update' },
      { resource: 'applications', action: 'delete' },
      { resource: 'products', action: 'create' },
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'update' },
      { resource: 'products', action: 'delete' },
      { resource: 'offers', action: 'create' },
      { resource: 'offers', action: 'read' },
      { resource: 'offers', action: 'update' },
      { resource: 'offers', action: 'delete' },
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      { resource: 'dashboard', action: 'read' },
      { resource: 'ledgers', action: 'read' },
      { resource: 'activity_logs', action: 'read' }, // Super admin only
      { resource: 'activity_logs', action: 'export' }, // Super admin only
      { resource: 'settings', action: 'read' },
      { resource: 'settings', action: 'update' },
    ],
  },
  {
    role: 'admin',
    permissions: [
      { resource: 'applications', action: 'create' },
      { resource: 'applications', action: 'read' },
      { resource: 'applications', action: 'update' },
      { resource: 'applications', action: 'delete' },
      { resource: 'products', action: 'create' },
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'update' },
      { resource: 'products', action: 'delete' },
      { resource: 'offers', action: 'create' },
      { resource: 'offers', action: 'read' },
      { resource: 'offers', action: 'update' },
      { resource: 'offers', action: 'delete' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'dashboard', action: 'read' },
      { resource: 'ledgers', action: 'read' },
    ],
  },
  {
    role: 'customer',
    permissions: [
      { resource: 'applications', action: 'create' },
      { resource: 'applications', action: 'read' },
      { resource: 'applications', action: 'update' }, // Only own applications
      { resource: 'products', action: 'read' },
      { resource: 'payments', action: 'read' },
      { resource: 'payments', action: 'create' },
      { resource: 'profile', action: 'read' },
      { resource: 'profile', action: 'update' },
    ],
  },
  {
    role: 'viewer',
    permissions: [
      { resource: 'applications', action: 'read' },
      { resource: 'products', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ],
  },
];

/**
 * Check if a role has permission for a resource and action
 */
export function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const rolePerms = rolePermissions.find((rp) => rp.role === role);
  if (!rolePerms) {
    return false;
  }

  return rolePerms.permissions.some(
    (perm) => perm.resource === resource && perm.action === action
  );
}

/**
 * Check if user can access a resource
 */
export function canAccess(role: UserRole, resource: string, action: string): boolean {
  return hasPermission(role, resource, action);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const rolePerms = rolePermissions.find((rp) => rp.role === role);
  return rolePerms ? rolePerms.permissions : [];
}

/**
 * Check if user owns a resource (for customer role)
 */
export function ownsResource(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId;
}

/**
 * Higher-order function to create permission check
 */
export function requirePermission(resource: string, action: string) {
  return (userRole: UserRole) => {
    if (!hasPermission(userRole, resource, action)) {
      throw new Error(`Access denied: ${userRole} does not have ${action} permission for ${resource}`);
    }
  };
}

