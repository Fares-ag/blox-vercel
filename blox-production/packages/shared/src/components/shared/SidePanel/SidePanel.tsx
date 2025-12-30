import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Divider,
  Typography,
  IconButton,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import './SidePanel.scss';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface SidePanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  menuItems: MenuItem[];
  user?: {
    name?: string;
    email?: string;
  } | null;
  onLogout?: () => void;
  logoPath?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({ 
  collapsed: collapsedProp, 
  onToggleCollapse,
  menuItems,
  user,
  onLogout,
  logoPath = '/BloxLogo.png'
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleLogoutClick = async () => {
    if (onLogout) {
      await onLogout();
    }
  };
  
  const getHomePath = () => {
    if (menuItems.length > 0) {
      return menuItems[0].path;
    }
    return '/';
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Drawer
      variant="permanent"
      className={`side-panel ${collapsed ? 'collapsed' : ''}`}
      sx={{
        width: { xs: collapsed ? 0 : 280, md: collapsed ? 80 : 280 },
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: { xs: collapsed ? 0 : 280, md: collapsed ? 80 : 280 },
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #787663 0%, #0E1909 100%)',
          transition: 'width 0.3s ease',
          display: { xs: collapsed ? 'none' : 'block' },
        },
      }}
    >
      <Box className="side-panel-content">
        <Box className="logo-section">
          <div className="logo" onClick={() => navigate(getHomePath())}>
            <img 
              src={logoPath} 
              alt="Blox Logo" 
              className={collapsed ? 'logo-image collapsed' : 'logo-image'}
            />
          </div>
          <IconButton
            className={`collapse-button ${collapsed ? 'collapsed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            sx={{
              color: 'white',
              position: 'absolute',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
              transition: 'all 0.3s ease',
              ...(collapsed
                ? {
                    top: 'var(--spacing-sm)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    right: 'auto',
                    width: '36px',
                    height: '36px',
                  }
                : {
                    top: 'var(--spacing-sm)',
                    right: 'var(--spacing-xs)',
                  }),
            }}
          >
            {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </IconButton>
        </Box>

        <List className="menu-list">
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.path)}
              >
                {item.icon && <ListItemIcon className="menu-icon">{item.icon}</ListItemIcon>}
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box className="user-section">
          <Divider />
          <Box className="user-info">
            <Avatar className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            {!collapsed && (
              <Box className="user-details">
                <Typography variant="body2" className="user-name">
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" className="user-email">
                  {user?.email || ''}
                </Typography>
              </Box>
            )}
          </Box>
          <ListItemButton className="logout-button" onClick={handleLogoutClick}>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItemButton>
        </Box>
      </Box>
    </Drawer>
  );
};
