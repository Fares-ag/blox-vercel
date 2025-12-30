import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button as MuiButton } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import { loggingService } from '../../../services/logging.service';
import './ErrorBoundary.scss';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to Sentry
    loggingService.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box className="error-boundary">
          <Box className="error-content">
            <ErrorOutline className="error-icon" />
            <Typography variant="h3" className="error-title">
              Something went wrong
            </Typography>
            <Typography variant="body1" className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            {import.meta.env.DEV && this.state.errorInfo && (
              <Box className="error-details">
                <Typography variant="body2" component="pre">
                  {this.state.error?.stack}
                </Typography>
              </Box>
            )}
            <MuiButton
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleReset}
              className="error-button"
              sx={{
                backgroundColor: 'var(--primary-btn-bg)',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#B8E001',
                },
              }}
            >
              Go to Home
            </MuiButton>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
