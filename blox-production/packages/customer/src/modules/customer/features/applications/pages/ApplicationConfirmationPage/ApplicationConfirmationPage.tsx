import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Divider } from '@mui/material';
import { CheckCircle, AccessTime, NotificationsActive, DirectionsCar, Login, ListAlt } from '@mui/icons-material';
import { Button } from '@shared/components';
import './ApplicationConfirmationPage.scss';

interface ConfirmationState {
  applicationId?: string;
  email?: string;
  isNewUser?: boolean;
  emailVerificationRequired?: boolean;
}

export const ApplicationConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ConfirmationState) || {};
  const { applicationId, email, isNewUser, emailVerificationRequired } = state;

  const shortId = applicationId ? applicationId.slice(0, 8).toUpperCase() : null;

  const steps = [
    {
      icon: <AccessTime />,
      title: 'Under Review',
      description: 'Our team will review your application within 24 hours.',
    },
    {
      icon: <NotificationsActive />,
      title: 'Decision Notification',
      description: `You'll be notified at ${email || 'your email'} once a decision is made.`,
    },
    {
      icon: <DirectionsCar />,
      title: 'Vehicle Handover',
      description: "Upon approval, we'll arrange contract signing and vehicle delivery.",
    },
  ];

  return (
    <Box className="application-confirmation-page">
      <Box className="confirmation-card">

        {/* Hero */}
        <Box className="confirmation-hero">
          <Box className="success-ring">
            <CheckCircle className="success-icon" />
          </Box>
          <Typography variant="h4" className="confirmation-title">
            Application Submitted!
          </Typography>
          {shortId && (
            <Box className="application-id-badge">
              <Typography variant="caption" className="id-label">Application ID</Typography>
              <Typography variant="body2" className="id-value">#{shortId}</Typography>
            </Box>
          )}
          <Typography variant="body2" className="confirmation-subtitle">
            Thank you! Your application is now under review.
          </Typography>
        </Box>

        {emailVerificationRequired && (
          <Box className="email-notice">
            <Typography variant="body2">
              📧 Verify your email at <strong>{email}</strong> to track your application.
            </Typography>
          </Box>
        )}

        <Divider className="section-divider" />

        {/* Steps */}
        <Box className="steps-container">
          <Typography variant="overline" className="steps-heading">
            What happens next
          </Typography>
          <Box className="steps-list">
            {steps.map((step, index) => (
              <Box key={index} className="step-item">
                <Box className="step-left">
                  <Box className="step-icon-wrap">{step.icon}</Box>
                  {index < steps.length - 1 && <Box className="step-connector" />}
                </Box>
                <Box className="step-body">
                  <Typography variant="body1" className="step-title">{step.title}</Typography>
                  <Typography variant="body2" className="step-desc">{step.description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider className="section-divider" />

        {/* Actions */}
        <Box className="confirmation-actions">
          {isNewUser ? (
            <>
              <Button
                variant="primary"
                fullWidth
                startIcon={<Login />}
                onClick={() => navigate('/customer/auth/login', {
                  state: { message: 'Log in to track your application.' }
                })}
              >
                Log In to Track Application
              </Button>
              <Button
                variant="secondary"
                fullWidth
                startIcon={<DirectionsCar />}
                onClick={() => navigate('/customer/vehicles')}
              >
                Browse More Vehicles
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                fullWidth
                startIcon={<ListAlt />}
                onClick={() => navigate('/customer/my-applications')}
              >
                View My Applications
              </Button>
              <Button
                variant="secondary"
                fullWidth
                startIcon={<DirectionsCar />}
                onClick={() => navigate('/customer/vehicles')}
              >
                Browse More Vehicles
              </Button>
            </>
          )}
        </Box>

      </Box>
    </Box>
  );
};
