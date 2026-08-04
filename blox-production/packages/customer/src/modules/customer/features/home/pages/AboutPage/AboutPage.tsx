import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Stack } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import './AboutPage.scss';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box className="about-page">
      <Box className="about-hero">
        <Container maxWidth="lg" className="about-hero-content">
          <Typography component="p" className="about-brand">
            BLOX
          </Typography>
          <Typography variant="h1" className="about-hero-title">
            About us
          </Typography>
          <Typography className="about-hero-lead">
            Equitable ownership for a world that moves.
          </Typography>
        </Container>
      </Box>

      <Box className="about-section about-section--who">
        <Container maxWidth="md">
          <Typography variant="h2" className="about-section-title">
            Who we are
          </Typography>
          <Typography className="about-section-body">
            BLOX is a Qatar-built ownership platform. We help people move from rigid vehicle loans
            into transparent, Sharia-compliant equity partnerships—so financing adapts to real life,
            not the other way around.
          </Typography>
          <Typography className="about-section-body">
            From browsing vehicles to signing and paying, we design every step around clarity,
            flexibility, and ownership that feels fair.
          </Typography>
        </Container>
      </Box>

      <Box className="about-section about-section--vision">
        <Container maxWidth="md">
          <Typography component="p" className="about-kicker">
            Vision statement
          </Typography>
          <Typography variant="h2" className="about-statement">
            To make equitable ownership the default standard for the world.
          </Typography>
        </Container>
      </Box>

      <Box className="about-section about-section--mission">
        <Container maxWidth="md" className="about-mission-content">
          <Typography component="p" className="about-kicker">
            Mission statement
          </Typography>
          <Typography variant="h2" className="about-statement about-statement--mission">
            To empower individuals to own their future by transforming rigid loans into dynamic,
            Sharia-compliant equity partnerships that adapt to their lives.
          </Typography>
        </Container>
      </Box>

      <Box className="about-cta">
        <Container maxWidth="md">
          <Typography variant="h3" className="about-cta-title">
            Ready to start?
          </Typography>
          <Typography className="about-cta-body">
            Explore vehicles or talk to our team—we’re here to help you own with confidence.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mt: 3 }}
          >
            <CustomButton
              variant="primary"
              size="large"
              onClick={() => navigate('/customer/vehicles')}
              endIcon={<ArrowForward />}
            >
              Browse vehicles
            </CustomButton>
            <CustomButton
              variant="secondary"
              size="large"
              onClick={() => navigate('/customer/contact')}
            >
              Contact us
            </CustomButton>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};
