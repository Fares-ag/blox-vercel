import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { SidePanel, type MenuItem } from '@shared/components';
import { Outlet } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/auth.slice';
import { authService } from '@shared/services';
import './MainLayout.scss';

const superAdminMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/super-admin/dashboard' },
  { id: 'activity-logs', label: 'Activity Logs', path: '/super-admin/activity-logs' },
];

export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(() => isMobile);
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    console.log('[MainLayout] Logout initiated');
    try {
      console.log('[MainLayout] Calling authService.logout()...');
      await authService.logout();
      console.log('[MainLayout] authService.logout() completed');
    } catch (error) {
      console.error('[MainLayout] Logout error:', error);
      // Continue with logout even if authService.logout() fails
    }
    
    try {
      console.log('[MainLayout] Dispatching logout action...');
      dispatch(logout());
      console.log('[MainLayout] Navigating to login page...');
      navigate('/super-admin/auth/login', { replace: true });
    } catch (error) {
      console.error('[MainLayout] Error during logout cleanup:', error);
      // Force navigation even if dispatch fails
      window.location.href = '/super-admin/auth/login';
    }
  };

  // Update collapsed state when mobile breakpoint changes
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
        menuItems={superAdminMenuItems}
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
