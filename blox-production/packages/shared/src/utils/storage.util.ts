/**
 * Storage utility for managing localStorage across the application
 */


/**
 * List of all localStorage keys used in the application
 */
export const STORAGE_KEYS = {
  // Customer auth
  CUSTOMER_TOKEN: 'customer_token',
  CUSTOMER_USER: 'customer_user',
  
  // Admin auth (if any)
  ADMIN_TOKEN: 'admin_token',
  ADMIN_USER: 'admin_user',
  
  // Applications
  CUSTOMER_APPLICATIONS: 'customer-applications',
  APPLICATIONS: 'applications',
  
  // Packages
  PACKAGES: 'packages',
  
  // Deferrals
  PAYMENT_DEFERRALS: 'customer-payment-deferrals',
  
  // Products/Vehicles
  PRODUCTS: 'products',
  
  // Offers
  OFFERS: 'offers',
  
  // Promotions
  PROMOTIONS: 'promotions',
  
  // Insurance Rates
  INSURANCE_RATES: 'insurance-rates',
} as const;

/**
 * Clear all application storage
 */
export const clearAllStorage = (): void => {
  try {
    // Clear all known keys
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    
    // Also clear sessionStorage
    sessionStorage.clear();
    
    console.log('✅ All storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    throw error;
  }
};

/**
 * Clear only customer-related storage
 */
export const clearCustomerStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_USER);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_APPLICATIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_DEFERRALS);
    
    sessionStorage.removeItem(STORAGE_KEYS.CUSTOMER_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.CUSTOMER_USER);
    
    console.log('✅ Customer storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing customer storage:', error);
    throw error;
  }
};

/**
 * Clear only application data (keeps auth)
 */
export const clearApplicationData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_APPLICATIONS);
    localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
    localStorage.removeItem(STORAGE_KEYS.PACKAGES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.OFFERS);
    localStorage.removeItem(STORAGE_KEYS.PROMOTIONS);
    localStorage.removeItem(STORAGE_KEYS.INSURANCE_RATES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_DEFERRALS);
    
    console.log('✅ Application data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing application data:', error);
    throw error;
  }
};

/**
 * Get storage size information
 */
export const getStorageInfo = (): {
  localStorageSize: number;
  sessionStorageSize: number;
  localStorageKeys: string[];
  sessionStorageKeys: string[];
} => {
  let localStorageSize = 0;
  let sessionStorageSize = 0;
  
  const localStorageKeys: string[] = [];
  const sessionStorageKeys: string[] = [];
  
  // Calculate localStorage size
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      localStorageKeys.push(key);
      const value = localStorage.getItem(key) || '';
      localStorageSize += key.length + value.length;
    }
  }
  
  // Calculate sessionStorage size
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      sessionStorageKeys.push(key);
      const value = sessionStorage.getItem(key) || '';
      sessionStorageSize += key.length + value.length;
    }
  }
  
  return {
    localStorageSize,
    sessionStorageSize,
    localStorageKeys,
    sessionStorageKeys,
  };
};

/**
 * Export all localStorage data to JSON
 */
export const exportStorage = (): string => {
  try {
    const data: Record<string, any> = {};
    
    // Export all known keys
    Object.entries(STORAGE_KEYS).forEach(([, key]) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value; // Store as string if not JSON
        }
      }
    });
    
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ Error exporting storage:', error);
    throw error;
  }
};

/**
 * Import localStorage data from JSON
 */
export const importStorage = (jsonData: string, merge: boolean = false): void => {
  try {
    const data = JSON.parse(jsonData);
    
    Object.entries(data).forEach(([key, value]) => {
      if (merge) {
        // Merge arrays if they exist
        const existing = localStorage.getItem(key);
        if (existing && Array.isArray(value) && Array.isArray(JSON.parse(existing))) {
          const existingArray = JSON.parse(existing);
          const merged = [...existingArray, ...value];
          // Remove duplicates by ID if objects have id property
          const unique = merged.filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.id === item.id)
          );
          localStorage.setItem(key, JSON.stringify(unique));
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    
    console.log('✅ Storage imported successfully');
  } catch (error) {
    console.error('❌ Error importing storage:', error);
    throw error;
  }
};

/**
 * Download storage data as JSON file
 */
export const downloadStorage = (filename: string = 'blox-storage-backup.json'): void => {
  try {
    const data = exportStorage();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✅ Storage backup downloaded');
  } catch (error) {
    console.error('❌ Error downloading storage:', error);
    throw error;
  }
};

/**
 * Restore storage from uploaded file
 */
export const restoreStorage = (file: File, merge: boolean = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importStorage(content, merge);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Expose to window in development for easy console access
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).clearStorage = clearAllStorage;
  (window as any).clearCustomerStorage = clearCustomerStorage;
  (window as any).clearApplicationData = clearApplicationData;
  (window as any).getStorageInfo = getStorageInfo;
  (window as any).exportStorage = exportStorage;
  (window as any).importStorage = importStorage;
  (window as any).downloadStorage = downloadStorage;
  
  // Log helper info on first load
  if (!(window as any).__storageUtilsLogged) {
    console.log('%c💡 Storage Utilities Available', 'color: #00CFA2; font-weight: bold; font-size: 14px;');
    console.log('  - clearStorage() - Clear all storage');
    console.log('  - clearCustomerStorage() - Clear customer data only');
    console.log('  - clearApplicationData() - Clear application data only');
    console.log('  - getStorageInfo() - Get storage information');
    console.log('  - exportStorage() - Export all storage as JSON string');
    console.log('  - importStorage(jsonString, merge?) - Import storage from JSON');
    console.log('  - downloadStorage(filename?) - Download storage backup file');
    (window as any).__storageUtilsLogged = true;
  }
}

