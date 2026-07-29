import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { SidePanel, type MenuItem } from '@shared/components';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useAppDispatch } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/auth.slice';
import { authService } from '@shared/services';
import './MainLayout.scss';

const adminMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { id: 'applications', label: 'Applications', path: '/admin/applications' },
  { id: 'pending-bank', label: 'Bank Transfers', path: '/admin/payments/pending-bank' },
  { id: 'users', label: 'Users', path: '/admin/users' },
  { id: 'companies', label: 'Partner Hub', path: '/admin/companies' },
  { id: 'products', label: 'Vehicles', path: '/admin/vehicles' },
  { id: 'offers', label: 'Offers', path: '/admin/offers' },
  { id: 'promotions', label: 'Promotions', path: '/admin/promotions' },
  { id: 'insurance-rates', label: 'Insurance & Rates', path: '/admin/insurance-rates' },
  { id: 'packages', label: 'Packages', path: '/admin/packages' },
  { id: 'ledgers', label: 'Ledgers', path: '/admin/ledgers' },
  { id: 'settings', label: 'Settings', path: '/admin/settings/settlement-discounts' },
];

export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(() => isMobile);
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue local logout even if remote sign-out fails
    }

    try {
      dispatch(logout());
      navigate('/admin/auth/login', { replace: true });
    } catch {
      window.location.href = '/admin/auth/login';
    }
  };

  const prevIsMobile = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobile.current !== isMobile) {
      prevIsMobile.current = isMobile;
      if (isMobile) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    }
  }, [isMobile]);

  return (
    <Box className="main-layout">
      <SidePanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobile={isMobile}
        menuItems={adminMenuItems}
        user={user}
        onLogout={handleLogout}
      />
      <Box className="main-content">
        {collapsed && (
          <IconButton
            className="sidebar-toggle-button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            sx={{
              position: 'fixed',
              left: '8px',
              top: '16px',
              zIndex: 1200,
              backgroundColor: 'var(--blox-black)',
              color: 'var(--primary-color)',
              boxShadow: 'var(--card-shadow)',
              borderRadius: '10px',
              transition: 'color 160ms ease, transform 160ms ease',
              '&:hover': {
                backgroundColor: 'var(--blox-black)',
                color: 'var(--primary-dark)',
                transform: 'translateY(-1px)',
              },
              '&:focus-visible': {
                outline: '2px solid var(--primary-color)',
                outlineOffset: 2,
              },
            }}
          >
            <Menu />
          </IconButton>
        )}
        <Outlet />
      </Box>
    </Box>
  );
};
