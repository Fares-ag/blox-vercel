import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';
import { customerAuthService } from '../services/customerAuth.service';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingEmail, setCheckingEmail] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (isAuthenticated) {
        try {
          const status = await customerAuthService.checkEmailVerificationStatus();
          setEmailVerified(status.verified);
          setUserEmail(status.email);
        } catch (error) {
          console.error('Error checking email verification:', error);
          setEmailVerified(true); // Default to allowing access if check fails
        }
      }
      setCheckingEmail(false);
    };

    checkEmailVerification();
  }, [isAuthenticated]);

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/auth/login" state={{ from: location }} replace />;
  }

  if (checkingEmail) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!emailVerified) {
    return (
      <Box sx={{ maxWidth: 600, margin: '0 auto', mt: 4, p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Email Verification Required
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please verify your email address to access your applications.
          </Typography>
          {userEmail && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              A verification email has been sent to <strong>{userEmail}</strong>
            </Typography>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please check your inbox and click the verification link to continue.
          </Typography>
          <Button
            variant="contained"
            onClick={async () => {
              // Resend verification email
              if (userEmail) {
                try {
                  // Supabase doesn't have a direct resend verification method in the client
                  // User needs to use the link from the original email or sign up again
                  navigate('/customer/auth/login');
                } catch (error) {
                  console.error('Error resending verification:', error);
                }
              }
            }}
            sx={{ mt: 1 }}
          >
            Go to Login
          </Button>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

