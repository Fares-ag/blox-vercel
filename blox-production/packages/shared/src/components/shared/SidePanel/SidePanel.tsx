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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Logout } from '@mui/icons-material';
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
  /** When true, drawer overlays content and closes after navigation. */
  isMobile?: boolean;
  menuItems: MenuItem[];
  user?: {
    name?: string;
    email?: string;
  } | null;
  onLogout?: () => void;
  logoPath?: string;
}

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 80;

export const SidePanel: React.FC<SidePanelProps> = ({
  collapsed: collapsedProp,
  onToggleCollapse,
  isMobile: isMobileProp,
  menuItems,
  user,
  onLogout,
  logoPath = '/BloxLogoNav.png',
}) => {
  const theme = useTheme();
  const isMobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const isMobile = isMobileProp ?? isMobileQuery;

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const navigate = useNavigate();
  const location = useLocation();

  const mobileOpen = isMobile && !collapsed;
  const desktopCollapsed = !isMobile && collapsed;

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile && !collapsed) {
      toggleCollapse();
    }
  };

  const handleLogoutClick = async () => {
    if (onLogout) {
      try {
        await onLogout();
      } catch (error) {
        console.error('[SidePanel] Error in onLogout:', error);
      }
    }
  };

  const getHomePath = () => (menuItems.length > 0 ? menuItems[0].path : '/');

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const drawerWidth = isMobile
    ? DRAWER_WIDTH
    : desktopCollapsed
      ? DRAWER_WIDTH_COLLAPSED
      : DRAWER_WIDTH;

  const panelContent = (
    <Box className="side-panel-content">
      <Box className="logo-section">
        <div className="logo" onClick={() => navigate(getHomePath())}>
          <img
            src={logoPath}
            alt="Blox Logo"
            className={desktopCollapsed ? 'logo-image collapsed' : 'logo-image'}
          />
        </div>
        <IconButton
          className={`collapse-button ${desktopCollapsed ? 'collapsed' : ''}`}
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
            ...(desktopCollapsed
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
          {desktopCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
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
              {(!desktopCollapsed || isMobile) && <ListItemText primary={item.label} />}
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
          {(!desktopCollapsed || isMobile) && (
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
        <ListItemButton className="logout-button" onClick={handleLogoutClick} sx={{ cursor: 'pointer' }}>
          <ListItemIcon
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              minWidth: desktopCollapsed && !isMobile ? 'auto' : 40,
            }}
          >
            <Logout fontSize="small" />
          </ListItemIcon>
          {(!desktopCollapsed || isMobile) && <ListItemText primary="Logout" />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={() => isMobile && toggleCollapse()}
      ModalProps={{ keepMounted: true }}
      className={`side-panel ${desktopCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}
      sx={{
        width: isMobile ? 0 : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #0F3A40 0%, #16535B 100%)',
          borderRight: '1px solid rgba(0, 207, 162, 0.18)',
          transition: 'width 0.3s ease',
        },
      }}
    >
      {panelContent}
    </Drawer>
  );
};
