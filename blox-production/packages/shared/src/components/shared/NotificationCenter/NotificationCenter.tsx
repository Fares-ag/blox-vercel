import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase.service';
import { supabaseApiService } from '../../../services/supabase-api.service';
import './NotificationCenter.scss';

export interface NotificationItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NotificationCenterProps {
  /** Authenticated user email (required for fetch + realtime filter). */
  userEmail?: string | null;
  /**
   * Portal path prefix used to resolve relative links, e.g. `/admin`, `/credit`,
   * `/finance`, `/customer`. Absolute links (starting with http) are used as-is.
   */
  portalPrefix?: string;
  /** Optional empty-state caption override. */
  emptyCaption?: string;
}

function resolveLink(link: string | undefined, portalPrefix?: string): string | undefined {
  if (!link) return undefined;
  if (/^https?:\/\//i.test(link)) return link;
  if (!portalPrefix) return link;
  const prefix = portalPrefix.replace(/\/$/, '');
  if (link.startsWith(prefix + '/') || link === prefix) return link;
  if (link.startsWith('/')) return `${prefix}${link}`;
  return `${prefix}/${link}`;
}

function mapRow(n: Record<string, unknown>): NotificationItem {
  return {
    id: String(n.id),
    type: (n.type as NotificationItem['type']) || 'info',
    title: String(n.title || ''),
    message: String(n.message || ''),
    timestamp: String(n.createdAt || n.created_at || new Date().toISOString()),
    read: Boolean(n.read),
    link: n.link ? String(n.link) : undefined,
  };
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userEmail,
  portalPrefix,
  emptyCaption = "You'll see updates about applications and payments here",
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();
  const email = (userEmail || '').trim();
  const emailKey = email.toLowerCase();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    if (!email) return;
    try {
      const response = await supabaseApiService.getNotifications(email);
      if (response.status === 'SUCCESS' && response.data) {
        setNotifications(response.data.map((n: Record<string, unknown>) => mapRow(n)));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [email]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription for this user's rows
  useEffect(() => {
    if (!emailKey) return;

    const channel = supabase
      .channel(`notifications:${emailKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_email=eq.${emailKey}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const row = mapRow(payload.new as Record<string, unknown>);
            setNotifications((prev) => {
              if (prev.some((n) => n.id === row.id)) return prev;
              return [row, ...prev];
            });
            return;
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            const row = mapRow(payload.new as Record<string, unknown>);
            setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
            return;
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            const id = String((payload.old as { id?: string }).id || '');
            if (id) setNotifications((prev) => prev.filter((n) => n.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [emailKey]);

  // Also try case-sensitive filter if stored emails are mixed-case (legacy rows)
  useEffect(() => {
    if (!email || email === emailKey) return;

    const channel = supabase
      .channel(`notifications:raw:${email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_email=eq.${email}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [email, emailKey, loadNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    void loadNotifications();
  };

  const handleClose = () => setAnchorEl(null);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await supabaseApiService.markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    if (!email) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await supabaseApiService.markAllNotificationsAsRead(email);
      void loadNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      void loadNotifications();
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
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

  const getNotificationColor = (type: NotificationItem['type'], variant: 'bg' | 'icon') => {
    const colors = {
      success: { bg: '#E6FBF5', icon: '#00CFA2' },
      warning: { bg: '#F7FFE0', icon: '#DBFF00' },
      error: { bg: '#FFEBEE', icon: '#C62828' },
      info: { bg: '#EEF3F3', icon: '#16535B' },
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

  if (!email) return null;

  return (
    <>
      <IconButton onClick={handleClick} className="notification-button" aria-label="Notifications">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 420,
            maxHeight: 650,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'var(--blox-black)',
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
                    backgroundColor: '#DBFF00',
                    color: '#16535B',
                    fontWeight: 700,
                    fontSize: '11px',
                    height: '20px',
                  }}
                />
              )}
            </Box>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead} className="mark-all-read-btn">
                Mark all as read
              </Button>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

          {notifications.length === 0 ? (
            <Box className="empty-state">
              <NotificationsIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.5)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                No notifications yet
              </Typography>
              <Typography variant="caption" sx={{ mt: 0.5, color: 'rgba(255, 255, 255, 0.65)' }}>
                {emptyCaption}
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 550, overflow: 'auto', py: 0 }} className="notification-list">
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => {
                      if (!notification.read) void markAsRead(notification.id);
                      const href = resolveLink(notification.link, portalPrefix);
                      if (href) {
                        handleClose();
                        navigate(href);
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
                            color: notification.read
                              ? 'rgba(255, 255, 255, 0.75)'
                              : 'rgba(255, 255, 255, 0.95)',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.read && <Box className="unread-dot" />}
                      </Box>
                      <Typography
                        variant="body2"
                        className="notification-message"
                        sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 0.5, lineHeight: 1.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="notification-time"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5, display: 'block' }}
                      >
                        {formatTime(notification.timestamp)}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mx: 2 }} />
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
