import React, { createContext, useContext } from 'react';

/** Base path for the current Vite portal: `/admin` | `/dealer` | `/credit` | `/finance`. */
export const PortalBasePathContext = createContext<string>('/admin');

export function usePortalBasePath(): string {
  return useContext(PortalBasePathContext);
}

/**
 * Build an in-portal absolute path.
 * Accepts short paths (`/applications`) or legacy prefixed paths (`/admin/applications`).
 */
export function withPortalBase(base: string, path: string): string {
  const stripped = path.replace(/^\/(admin|dealer|credit|finance)(?=\/|$)/, '');
  const normalized = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return `${base}${normalized}`;
}

export const PortalBasePathProvider: React.FC<{
  basePath: string;
  children: React.ReactNode;
}> = ({ basePath, children }) => (
  <PortalBasePathContext.Provider value={basePath}>{children}</PortalBasePathContext.Provider>
);
