import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import { Menu as MenuIcon, AccountCircle, Logout, DirectionsCar } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter/NotificationCenter';
import './CustomerNav.scss';

export const CustomerNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleLogoutClick = async () => {
    handleMenuClose();
    await logout();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <AppBar position="static" className="customer-nav" elevation={0}>
      <Toolbar className="nav-toolbar">
        {/* Mobile Menu Button */}
        <IconButton
          className="mobile-menu-button"
          onClick={handleMobileMenuOpen}
          sx={{ display: { xs: 'flex', md: 'none' }, mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box className="logo-section" onClick={() => navigate('/customer/home')}>
          <img src="/BloxLogoDark.png" alt="Blox Logo" className="logo-image" />
        </Box>

        {/* Navigation Links */}
        <Box className="nav-links">
          <Button
            className={`nav-link ${isActive('/customer/home') ? 'active' : ''}`}
            onClick={() => navigate('/customer/home')}
          >
            Home
          </Button>
          <Button
            className={`nav-link ${isActive('/customer/vehicles') ? 'active' : ''}`}
            onClick={() => navigate('/customer/vehicles')}
            startIcon={<DirectionsCar sx={{ color: 'inherit' }} />}
          >
            Browse Vehicles
          </Button>
          {isAuthenticated && (
            <>
              <Button
                className={`nav-link ${isActive('/customer/dashboard') ? 'active' : ''}`}
                onClick={() => navigate('/customer/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                className={`nav-link ${isActive('/customer/my-applications') ? 'active' : ''}`}
                onClick={() => navigate('/customer/my-applications')}
              >
                My Applications
              </Button>
              <Button
                className={`nav-link ${isActive('/customer/payment-calendar') ? 'active' : ''}`}
                onClick={() => navigate('/customer/payment-calendar')}
              >
                Payment Calendar
              </Button>
              <Button
                className={`nav-link ${isActive('/customer/help') ? 'active' : ''}`}
                onClick={() => navigate('/customer/help/faq')}
              >
                Help
              </Button>
            </>
          )}
        </Box>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              '& .MuiMenuItem-root': {
                '&:hover': {
                  backgroundColor: '#EAF7F3',
                },
              },
            },
          }}
        >
          <MenuItem 
            onClick={() => { handleMobileMenuClose(); navigate('/customer/home'); }}
            selected={isActive('/customer/home')}
          >
            Home
          </MenuItem>
          <MenuItem 
            onClick={() => { handleMobileMenuClose(); navigate('/customer/vehicles'); }}
            selected={isActive('/customer/vehicles')}
          >
            <DirectionsCar sx={{ mr: 1 }} />
            Browse Vehicles
          </MenuItem>
          {isAuthenticated && [
            <MenuItem 
              key="dashboard"
              onClick={() => { handleMobileMenuClose(); navigate('/customer/dashboard'); }}
              selected={isActive('/customer/dashboard')}
            >
              Dashboard
            </MenuItem>,
            <MenuItem 
              key="applications"
              onClick={() => { handleMobileMenuClose(); navigate('/customer/my-applications'); }}
              selected={isActive('/customer/my-applications')}
            >
              My Applications
            </MenuItem>,
            <MenuItem 
              key="calendar"
              onClick={() => { handleMobileMenuClose(); navigate('/customer/payment-calendar'); }}
              selected={isActive('/customer/payment-calendar')}
            >
              Payment Calendar
            </MenuItem>,
            <MenuItem 
              key="help"
              onClick={() => { handleMobileMenuClose(); navigate('/customer/help/faq'); }}
              selected={isActive('/customer/help')}
            >
              Help
            </MenuItem>
          ]}
        </Menu>

        {/* Right Side - Auth Actions */}
        <Box className="nav-actions">
          {isAuthenticated ? (
            <>
              <NotificationCenter />
              <Box className="user-info" onClick={handleMenuOpen}>
                <Avatar className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="body2" className="user-name">
                  {user?.name || user?.email || 'User'}
                </Typography>
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    '& .MuiMenuItem-root': {
                      '&:hover': {
                        backgroundColor: '#EAF7F3',
                      },
                    },
                  },
                }}
              >
                <MenuItem onClick={() => { handleMenuClose(); navigate('/customer/profile'); }}>
                  <AccountCircle sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate('/customer/profile/change-password'); }}>
                  <AccountCircle sx={{ mr: 1 }} />
                  Change Password
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogoutClick}>
                  <Logout sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box className="auth-buttons">
              <Button
                variant="outlined"
                className="login-button"
                onClick={() => navigate('/customer/auth/login')}
              >
                Login
              </Button>
              <Button
                variant="contained"
                className="signup-button"
                onClick={() => navigate('/customer/auth/signup')}
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

