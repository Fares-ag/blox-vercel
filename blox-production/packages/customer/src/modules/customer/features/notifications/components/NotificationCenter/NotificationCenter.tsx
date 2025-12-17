import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../../store/hooks';
import { supabaseApiService } from '@shared/services';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.scss';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

// Dummy data removed - using only localStorage and API

export const NotificationCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const response = await supabaseApiService.getNotifications(user.email);
      
      if (response.status === 'SUCCESS' && response.data) {
        // Map database notifications to component format
        const mappedNotifications: Notification[] = response.data.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.createdAt || n.created_at,
          read: n.read,
          link: n.link,
        }));
        setNotifications(mappedNotifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Refresh notifications when opening
    loadNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    
    // Update in database
    try {
      await supabaseApiService.markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    if (!user?.email) return;
    
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    
    // Update in database
    try {
      await supabaseApiService.markAllNotificationsAsRead(user.email);
      loadNotifications(); // Refresh to ensure consistency
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      loadNotifications(); // Refresh to revert on error
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      default:
        return <Info sx={{ fontSize: 20 }} />;
    }
  };

  const getNotificationColor = (type: Notification['type'], variant: 'bg' | 'icon') => {
    const colors = {
      success: { bg: '#E8F5E9', icon: '#4CAF50' },
      warning: { bg: '#FFF3E0', icon: '#FF9800' },
      error: { bg: '#FFEBEE', icon: '#F44336' },
      info: { bg: '#E3F2FD', icon: '#2196F3' },
    };
    return colors[type][variant];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} className="notification-button">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
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
            mt: 1.5,
            width: 420,
            maxHeight: 650,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <Box className="notification-center">
          <Box className="notification-header">
            <Box className="header-content">
              <Typography variant="h6" className="header-title">
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  sx={{
                    backgroundColor: '#00CFA2',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11px',
                    height: '20px',
                  }}
                />
              )}
            </Box>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={markAllAsRead}
                className="mark-all-read-btn"
              >
                Mark all as read
              </Button>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />

          {notifications.length === 0 ? (
            <Box className="empty-state">
              <NotificationsIcon sx={{ fontSize: 48, color: '#CCCCCC', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                You'll see updates about your applications and payments here
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 550, overflow: 'auto', py: 0 }} className="notification-list">
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        handleClose();
                        navigate(notification.link);
                      }
                    }}
                    sx={{
                      cursor: notification.link ? 'pointer' : 'default',
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <Box
                      className="notification-icon-wrapper"
                      sx={{
                        backgroundColor: getNotificationColor(notification.type, 'bg'),
                        color: getNotificationColor(notification.type, 'icon'),
                      }}
                    >
                      {getIcon(notification.type)}
                    </Box>
                    <Box className="notification-content" sx={{ flex: 1, ml: 1.5 }}>
                      <Box className="notification-title-row">
                        <Typography
                          variant="subtitle2"
                          className="notification-title"
                          sx={{
                            fontWeight: notification.read ? 500 : 700,
                            color: notification.read ? '#666666' : '#1a1a1a',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.read && <Box className="unread-dot" />}
                      </Box>
                      <Typography
                        variant="body2"
                        className="notification-message"
                        sx={{
                          color: '#666666',
                          mt: 0.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="notification-time"
                        sx={{
                          color: '#999999',
                          mt: 0.5,
                          display: 'block',
                        }}
                      >
                        {formatTime(notification.timestamp)}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)', mx: 2 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};


