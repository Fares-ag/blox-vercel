import { useState, useEffect, useCallback } from 'react';
import { creditsService } from '@shared/services';
import { useAppSelector } from '../store/hooks';
import { toast } from 'react-toastify';

/**
 * Hook to manage customer credits
 * Reads from database instead of localStorage
 */
export const useCredits = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load credits from database
  const loadCredits = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setCreditsBalance(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await creditsService.getUserCredits(user.email);
      
      if (response.status === 'SUCCESS' && response.data) {
        setCreditsBalance(response.data.balance || 0);
      } else {
        // If no record exists, balance is 0 (default)
        setCreditsBalance(0);
        if (response.message && !response.message.includes('not found')) {
          setError(response.message);
        }
      }
    } catch (err: any) {
      console.error('Failed to load credits:', err);
      setError(err.message || 'Failed to load credits');
      // Fallback to 0 on error
      setCreditsBalance(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.email]);

  // Refresh credits (public method)
  const refreshCredits = useCallback(async () => {
    await loadCredits();
  }, [loadCredits]);

  // Load credits on mount and when user changes
  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Listen for storage events (for cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blox_credits_updated') {
        // Credits were updated in another tab, refresh
        loadCredits();
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleCreditsUpdated = () => {
      loadCredits();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bloxCreditsUpdated', handleCreditsUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bloxCreditsUpdated', handleCreditsUpdated);
    };
  }, [loadCredits]);

  return {
    creditsBalance,
    loading,
    error,
    refreshCredits,
  };
};
