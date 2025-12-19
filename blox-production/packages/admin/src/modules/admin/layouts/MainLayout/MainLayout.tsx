import React, { useState, useEffect } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { SidePanel, type MenuItem } from '@shared/components';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useAppDispatch } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/auth.slice';
import { authService } from '@shared/services';
import './MainLayout.scss';

const adminMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { id: 'applications', label: 'Applications', path: '/admin/applications' },
  { id: 'users', label: 'Users', path: '/admin/users' },
  { id: 'products', label: 'Vehicles', path: '/admin/vehicles' },
  { id: 'offers', label: 'Offers', path: '/admin/offers' },
  { id: 'promotions', label: 'Promotions', path: '/admin/promotions' },
  { id: 'insurance-rates', label: 'Insurance & Rates', path: '/admin/insurance-rates' },
  { id: 'packages', label: 'Packages', path: '/admin/packages' },
  { id: 'ledgers', label: 'Ledgers', path: '/admin/ledgers' },
];

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // md breakpoint is typically 960px

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/admin/auth/login');
    } catch (err) {
      dispatch(logout());
      navigate('/admin/auth/login');
    }
  };

  // Auto-collapse sidebar on mobile on initial load and after navigation
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile, location.pathname]);

  return (
    <Box className="main-layout">
      <SidePanel 
        collapsed={collapsed} 
        onToggleCollapse={() => setCollapsed(!collapsed)}
        menuItems={adminMenuItems}
        user={user}
        onLogout={handleLogout}
      />
      <Box className="main-content">
        {collapsed && (
          <IconButton
            className="sidebar-toggle-button"
            onClick={() => setCollapsed(false)}
            sx={{
              position: 'fixed',
              left: '8px',
              top: '16px',
              zIndex: 1200,
              backgroundColor: '#008A6C',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                backgroundColor: '#16535B',
              },
            }}
            title="Expand sidebar"
          >
            <Menu />
          </IconButton>
        )}
        <Outlet />
      </Box>
    </Box>
  );
};
