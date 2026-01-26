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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Menu as MenuIcon, AccountCircle, Logout, DirectionsCar, AccountBalanceWallet, Add } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter/NotificationCenter';
import { formatCurrency } from '@shared/utils/formatters';
import { skipCashService, supabase } from '@shared/services';
import { toast } from 'react-toastify';
import { useCredits } from '../../hooks/useCredits';
import './CustomerNav.scss';

export const CustomerNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { logout } = useAuth();
  const { creditsBalance: bloxCredits } = useCredits();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [creditsToBuy, setCreditsToBuy] = useState<string>('1');
  const [processingTopUp, setProcessingTopUp] = useState(false);

  const BLOX_CREDIT_PRICE_QAR = 1;

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

  const handleOpenTopUp = () => {
    setCreditsToBuy('1');
    setTopUpDialogOpen(true);
  };

  const handleConfirmTopUp = async () => {
    const credits = parseInt(creditsToBuy, 10);
    if (isNaN(credits) || credits <= 0) {
      toast.error('Please enter a valid number of Blox Credits.');
      return;
    }

    if (!user?.email) {
      toast.error('User information is required to process payment.');
      return;
    }

    try {
      setProcessingTopUp(true);
      const totalCost = credits * BLOX_CREDIT_PRICE_QAR;

      // Fetch user metadata to get phone number if needed
      let userPhone = '';
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser?.user_metadata) {
          userPhone = supabaseUser.user_metadata.phone_number || supabaseUser.user_metadata.phone || '';
        }
      } catch (e) {
        console.warn('Could not fetch user phone:', e);
      }

      // Generate unique transaction ID using UUID (prevents collisions)
      // Remove dashes to fit SkipCash 40-char limit: CREDIT-(32 chars) = 39 chars
      const transactionId = `CREDIT-${crypto.randomUUID().replace(/-/g, '')}`;

      // Parse customer name
      const nameParts = (user.name || user.email || '').split(' ');
      const firstName = nameParts[0] || user.email?.split('@')[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Build return URL for payment callback
      const returnUrl = `${window.location.origin}/customer/credit-topup-callback?transactionId=${encodeURIComponent(transactionId)}&credits=${encodeURIComponent(credits)}`;

      // Prepare SkipCash payment request
      const skipCashRequest = {
        amount: totalCost,
        firstName: firstName,
        lastName: lastName,
        phone: userPhone,
        email: user.email,
        transactionId: transactionId,
        returnUrl: returnUrl,
        subject: `Top Up ${credits} Blox Credits`,
        description: `Purchase ${credits} Blox Credits for ${formatCurrency(totalCost)}`,
        custom1: JSON.stringify({
          type: 'credit_topup',
          credits: credits,
          transactionId: transactionId,
          email: user.email, // Include email for webhook processing
        }),
      };

      // Process payment through SkipCash
      const result = await skipCashService.processPayment(skipCashRequest);

      // The Edge Function returns data directly (not wrapped in resultObj)
      // So we check both result.data.paymentUrl and result.data.resultObj.paymentUrl for compatibility
      const responseData = result.data as {
        paymentUrl?: string;
        payUrl?: string;
        paymentId?: string;
        id?: string;
        resultObj?: {
          paymentUrl?: string;
          payUrl?: string;
          paymentId?: string;
          id?: string;
        };
      };
      const paymentUrl = responseData?.paymentUrl || responseData?.resultObj?.paymentUrl || responseData?.payUrl || responseData?.resultObj?.payUrl;
      const paymentId = responseData?.paymentId || responseData?.resultObj?.paymentId || responseData?.id || responseData?.resultObj?.id;

      if (result.status === 'SUCCESS' && paymentUrl) {
        // Store pending transaction data in localStorage for callback
        localStorage.setItem(`pending_credit_topup_${transactionId}`, JSON.stringify({
          credits: credits,
          transactionId: transactionId,
          paymentId: paymentId, // Store paymentId for verification
          timestamp: Date.now(),
        }));

        console.log('Redirecting to SkipCash payment page:', paymentUrl);
        
        // Redirect to SkipCash payment page
        window.location.href = paymentUrl;
        return; // Don't continue with other logic, user will be redirected
      } else {
        console.error('Credit top-up payment initiation failed:', {
          status: result.status,
          message: result.message,
          creditsRequested: credits,
        });
        // Provide user-friendly error message
        const userFriendlyMessage = result.message?.includes('authorization') || result.message?.includes('permission')
          ? 'Credit top-up not available. Please ensure you have an active application or contact support.'
          : result.message?.includes('Rate limit') || result.message?.includes('Too many')
          ? 'Too many attempts. Please wait a minute before trying again.'
          : result.message?.includes('Price validation')
          ? 'Payment amount mismatch detected. Please refresh the page and try again.'
          : result.message || 'Failed to initiate credit top-up. Please try again.';
        
        toast.error(userFriendlyMessage);
        setProcessingTopUp(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process credit top-up. Please try again.';
      console.error('Failed to process credit top-up:', error);
      toast.error(errorMessage);
      setProcessingTopUp(false);
    }
  };

  const handleLogoutClick = async () => {
    handleMenuClose();
    await logout();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
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
          <img 
            src="/BloxLogoNav.png" 
            alt="Blox Logo" 
            className="logo-image"
            onError={() => {
              console.error('Failed to load logo at /BloxLogoNav.png');
            }}
          />
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
              backgroundColor: 'var(--card-background)',
              color: 'var(--primary-text)',
              boxShadow: 'var(--card-shadow-hover)',
              '& .MuiMenuItem-root': {
                color: 'var(--primary-text)',
                '&:hover': {
                  backgroundColor: 'var(--card-hover)',
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
              {/* Blox Credits Wallet */}
              <Box 
                className="blox-wallet"
                onClick={handleOpenTopUp}
                sx={{ cursor: 'pointer' }}
              >
                <Box className="wallet-icon-wrapper">
                  <AccountBalanceWallet className="wallet-icon" />
                </Box>
                <Box className="wallet-content">
                  <Typography variant="caption" className="wallet-label">
                    Blox Credits
                  </Typography>
                  <Typography variant="h6" className="wallet-balance">
                    {bloxCredits.toLocaleString('en-US')}
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  className="wallet-add-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTopUp();
                  }}
                  sx={{ 
                    ml: 1,
                    color: 'var(--primary-color)',
                    '&:hover': {
                      backgroundColor: 'rgba(218, 255, 1, 0.2)',
                    }
                  }}
                >
                  <Add />
                </IconButton>
              </Box>
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
                    backgroundColor: 'var(--card-background)',
                    color: 'var(--primary-text)',
                    boxShadow: 'var(--card-shadow-hover)',
                    '& .MuiMenuItem-root': {
                      color: 'var(--primary-text)',
                      '&:hover': {
                        backgroundColor: 'var(--card-hover)',
                        color: 'var(--primary-text)',
                      },
                    },
                  },
                }}
              >
                <MenuItem onClick={() => { handleMenuClose(); navigate('/customer/profile'); }}>
                  <AccountCircle sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); handleOpenTopUp(); }}>
                  <AccountBalanceWallet sx={{ mr: 1 }} />
                  Manage Wallet
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
      <Dialog open={topUpDialogOpen} onClose={() => setTopUpDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Top Up Blox Credits</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Each Blox Credit costs <strong>{formatCurrency(BLOX_CREDIT_PRICE_QAR)}</strong>.
            All amounts are in QAR.
          </Typography>
          <TextField
            label="Number of Credits"
            type="number"
            fullWidth
            value={creditsToBuy}
            onChange={(e) => setCreditsToBuy(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2">
            Total: <strong>{formatCurrency((parseInt(creditsToBuy, 10) || 0) * BLOX_CREDIT_PRICE_QAR)}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopUpDialogOpen(false)} disabled={processingTopUp}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmTopUp}
            disabled={processingTopUp || !creditsToBuy || parseInt(creditsToBuy, 10) <= 0}
            startIcon={processingTopUp ? <CircularProgress size={16} /> : null}
          >
            {processingTopUp ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

