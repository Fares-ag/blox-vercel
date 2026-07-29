import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { SidePanel, type MenuItem } from '@shared/components';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@admin-module/store/hooks';
import { logout } from '@admin-module/store/slices/auth.slice';
import { authService } from '@shared/services';
import '@admin-module/layouts/MainLayout/MainLayout.scss';

const menuItems: MenuItem[] = [
  { id: 'queue', label: 'Activation Queue', path: '/finance/queue' },
  { id: 'book', label: 'Active Book', path: '/finance/book' },
  { id: 'payments', label: 'Payments', path: '/finance/payments' },
  { id: 'settlements', label: 'Settlements', path: '/finance/settlements' },
  { id: 'credits', label: 'Credits', path: '/finance/credits' },
  { id: 'exports', label: 'Exports', path: '/finance/exports' },
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
      // continue
    }
    try {
      dispatch(logout());
      navigate('/finance/auth/login', { replace: true });
    } catch {
      window.location.href = '/finance/auth/login';
    }
  };

  const prevIsMobile = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobile.current !== isMobile) {
      prevIsMobile.current = isMobile;
      if (isMobile) setCollapsed(true);
    }
  }, [isMobile]);

  return (
    <Box className="main-layout">
      <SidePanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobile={isMobile}
        menuItems={menuItems}
        user={user}
        onLogout={handleLogout}
      />
      <Box className="main-content">
        {collapsed && (
          <IconButton
            className="sidebar-toggle-button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            sx={{
              position: 'fixed',
              left: '8px',
              top: '16px',
              zIndex: 1200,
              backgroundColor: 'var(--blox-black)',
              color: 'var(--primary-color)',
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
