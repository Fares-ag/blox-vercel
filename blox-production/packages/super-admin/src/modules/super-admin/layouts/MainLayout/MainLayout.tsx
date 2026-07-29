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
    try {
      await authService.logout();
    } catch {
      // Continue logout cleanup even if remote sign-out fails
    }

    try {
      dispatch(logout());
      navigate('/super-admin/auth/login', { replace: true });
    } catch {
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
        isMobile={isMobile}
        menuItems={superAdminMenuItems}
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
