import React from 'react';
import { Box, Typography } from '@mui/material';
import './Loading.scss';

export interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
  size?: number;
}

export const Loading: React.FC<LoadingProps> = ({
  fullScreen = false,
  message,
  size = 120,
}) => {
  const content = (
    <Box className={`loading-container ${fullScreen ? 'fullscreen' : ''}`}>
      <Box className="animated-logo-wrapper" style={{ width: size, height: size }}>
        <img 
          src="/BloxLogoNav.png" 
          alt="Blox Logo" 
          className="animated-logo"
          onError={() => {
            console.error('Failed to load logo at /BloxLogoNav.png');
            console.error('Current path:', window.location.pathname);
          }}
        />
        <Box className="logo-pulse" />
      </Box>
      {message && (
        <Typography variant="body1" className="loading-message">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return <div className="loading-overlay">{content}</div>;
  }

  return content;
};
