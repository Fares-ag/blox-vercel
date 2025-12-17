import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  DirectionsCar,
  TrendingUp,
  Security,
  Payment,
  Speed,
  CheckCircle,
  ArrowForward,
} from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import './LandingPage.scss';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <DirectionsCar sx={{ fontSize: 40 }} />,
      title: 'Wide Vehicle Selection',
      description: 'Browse through our extensive collection of premium vehicles from top brands.',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: 'Flexible Financing',
      description: 'Customizable payment plans that fit your budget and lifestyle.',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Transparent',
      description: 'Your data and transactions are protected with industry-leading security.',
    },
    {
      icon: <Payment sx={{ fontSize: 40 }} />,
      title: 'Easy Payments',
      description: 'Manage your installments with our intuitive payment calendar and tracking.',
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'Quick Approval',
      description: 'Fast application process with quick approval times to get you on the road sooner.',
    },
    {
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      title: 'Blox Membership',
      description: 'Premium membership with payment deferral options and exclusive benefits.',
    },
  ];

  const benefits = [
    'No hidden fees or charges',
    'Transparent pricing and terms',
    '24/7 customer support',
    'Easy online application process',
    'Flexible payment schedules',
    'Early ownership options',
  ];

  const steps = [
    {
      number: '01',
      title: 'Browse Vehicles',
      description: 'Explore our wide selection of vehicles and find the perfect match for you.',
    },
    {
      number: '02',
      title: 'Apply Online',
      description: 'Fill out a simple application form with your details and preferences.',
    },
    {
      number: '03',
      title: 'Get Approved',
      description: 'Receive quick approval and review your personalized payment plan.',
    },
    {
      number: '04',
      title: 'Drive Away',
      description: 'Complete the process and start enjoying your new vehicle.',
    },
  ];

  return (
    <Box className="landing-page">
      {/* Hero Section */}
      <Box className="hero-section">
        <Container maxWidth="lg">
          <Box className="hero-content">
            <Box className="hero-badge">
              <Typography variant="body2" className="badge-text">
                Trusted by 1000+ Customers
              </Typography>
            </Box>
            <Typography variant="h1" className="hero-title">
              Your Journey to Vehicle Ownership Starts Here
            </Typography>
            <Typography variant="h5" className="hero-subtitle">
              Experience transparent, flexible financing with BLOX. Turn your vehicle's value into
              virtual assets for smarter financial management.
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={{ xs: 2, sm: 3 }} 
              sx={{ mt: 5 }}
              justifyContent="center"
            >
              <CustomButton
                variant="primary"
                size="large"
                onClick={() => navigate('/customer/vehicles')}
                endIcon={<ArrowForward />}
                sx={{ 
                  minWidth: { xs: '100%', sm: 220 },
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                Browse Vehicles
              </CustomButton>
              <CustomButton
                variant="secondary"
                size="large"
                onClick={() => navigate('/customer/auth/signup')}
                sx={{ 
                  minWidth: { xs: '100%', sm: 220 },
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                  }
                }}
              >
                Get Started
              </CustomButton>
            </Stack>
            <Box className="hero-stats">
              <Box className="stat-item">
                <Typography variant="h4" className="stat-value">1000+</Typography>
                <Typography variant="body2" className="stat-label">Happy Customers</Typography>
              </Box>
              <Box className="stat-item">
                <Typography variant="h4" className="stat-value">500+</Typography>
                <Typography variant="body2" className="stat-label">Vehicles Available</Typography>
              </Box>
              <Box className="stat-item">
                <Typography variant="h4" className="stat-value">24/7</Typography>
                <Typography variant="body2" className="stat-label">Support</Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box className="features-section">
        <Container maxWidth="lg">
          <Box className="section-header">
            <Typography variant="h2" className="section-title">
              Why Choose BLOX?
            </Typography>
            <Typography variant="body1" className="section-description">
              We make vehicle financing simple, transparent, and flexible.
            </Typography>
          </Box>
          <Grid container spacing={4} sx={{ mt: { xs: 5, md: 8 } }}>
            {features.map((feature, index) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4}
                key={index}
              >
                <Card 
                  className="feature-card" 
                  elevation={0} 
                  sx={{ 
                    width: '100%',
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column'
                  }}
                >
                  <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box className="feature-icon-wrapper">
                      <Box className="feature-icon">{feature.icon}</Box>
                    </Box>
                    <Typography variant="h6" className="feature-title">
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" className="feature-description" sx={{ flexGrow: 1 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box className="how-it-works-section">
        <Container maxWidth="lg">
          <Box className="section-header">
            <Typography variant="h2" className="section-title">
              How It Works
            </Typography>
            <Typography variant="body1" className="section-description">
              Get started in just four simple steps.
            </Typography>
          </Box>
          <Grid container spacing={4} sx={{ mt: 8 }}>
            {steps.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box className="step-card">
                  <Box className="step-number-wrapper">
                    <Typography variant="h3" className="step-number">
                      {step.number}
                    </Typography>
                  </Box>
                  <Typography variant="h6" className="step-title">
                    {step.title}
                  </Typography>
                  <Typography variant="body2" className="step-description">
                    {step.description}
                  </Typography>
                  {index < steps.length - 1 && (
                    <Box className="step-connector" />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box className="benefits-section">
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" className="section-title">
                Everything You Need for a Smooth Experience
              </Typography>
              <Typography variant="body1" className="section-description" sx={{ mt: 3, mb: 4 }}>
                We've designed our platform to make vehicle financing as straightforward and
                convenient as possible.
              </Typography>
              <Box className="benefits-list">
                {benefits.map((benefit, index) => (
                  <Box key={index} className="benefit-item">
                    <CheckCircle className="benefit-icon" />
                    <Typography variant="body1" className="benefit-text">{benefit}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="benefits-visual">
                <Card className="benefits-card" elevation={0}>
                  <CardContent sx={{ p: 3 }}>
                    <Box className="stat-box">
                      <Typography variant="h3" className="stat-number">
                        1000+
                      </Typography>
                      <Typography variant="body2" className="stat-label">
                        Happy Customers
                      </Typography>
                    </Box>
                    <Box className="stat-box">
                      <Typography variant="h3" className="stat-number">
                        500+
                      </Typography>
                      <Typography variant="body2" className="stat-label">
                        Vehicles Available
                      </Typography>
                    </Box>
                    <Box className="stat-box">
                      <Typography variant="h3" className="stat-number">
                        24/7
                      </Typography>
                      <Typography variant="body2" className="stat-label">
                        Customer Support
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box className="cta-section">
        <Container maxWidth="md">
          <Box className="cta-content">
            <Typography variant="h2" className="cta-title">
              Ready to Get Started?
            </Typography>
            <Typography variant="body1" className="cta-description">
              Join thousands of satisfied customers who have found their perfect vehicle with BLOX.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 2, sm: 2 }}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 4 }}
            >
              <CustomButton
                variant="primary"
                size="large"
                onClick={() => navigate('/customer/vehicles')}
                endIcon={<ArrowForward />}
                sx={{ minWidth: 200 }}
              >
                Browse Vehicles
              </CustomButton>
              <CustomButton
                variant="secondary"
                size="large"
                onClick={() => navigate('/customer/auth/signup')}
                sx={{ minWidth: 200 }}
              >
                Create Account
              </CustomButton>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

