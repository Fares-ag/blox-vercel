/**
 * Feature flags utility for gradual rollouts and A/B testing
 */

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetRoles?: string[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  /**
   * Initialize feature flags from environment or API
   */
  init(flags: FeatureFlag[]) {
    flags.forEach((flag) => {
      this.flags.set(flag.name, flag);
    });
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagName: string, userId?: string, userRole?: string): boolean {
    const flag = this.flags.get(flagName);

    if (!flag) {
      // Default to disabled if flag not found
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check user targeting
    if (flag.targetUsers && userId && !flag.targetUsers.includes(userId)) {
      return false;
    }

    // Check role targeting
    if (flag.targetRoles && userRole && !flag.targetRoles.includes(userRole)) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      if (userId) {
        // Deterministic based on user ID
        const hash = this.hashCode(userId);
        const percentage = (hash % 100) + 1;
        return percentage <= flag.rolloutPercentage;
      } else {
        // Random for anonymous users
        return Math.random() * 100 <= flag.rolloutPercentage;
      }
    }

    return true;
  }

  /**
   * Simple hash function for deterministic user-based rollouts
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all enabled features for a user
   */
  getEnabledFeatures(userId?: string, userRole?: string): string[] {
    const enabled: string[] = [];
    this.flags.forEach((flag, name) => {
      if (this.isEnabled(name, userId, userRole)) {
        enabled.push(name);
      }
    });
    return enabled;
  }
}

export const featureFlags = new FeatureFlagService();

/**
 * Initialize feature flags from environment variables
 */
export function initFeatureFlags() {
  const flags: FeatureFlag[] = [];

  // Example: Load from environment variables
  // In production, load from API or feature flag service
  if (import.meta.env.VITE_FEATURE_NEW_DASHBOARD === 'true') {
    flags.push({
      name: 'new_dashboard',
      enabled: true,
      rolloutPercentage: parseInt(import.meta.env.VITE_FEATURE_NEW_DASHBOARD_ROLLOUT || '0'),
    });
  }

  featureFlags.init(flags);
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagName: string, userId?: string, userRole?: string): boolean {
  return featureFlags.isEnabled(flagName, userId, userRole);
}

