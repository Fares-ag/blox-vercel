import React, { useState } from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Chat } from '@mui/icons-material';
import { CustomerNav } from '../../components/CustomerNav/CustomerNav';
import { ChatModal } from '../../features/help/components/ChatModal';
import './CustomerLayout.scss';

// Feature flag to enable/disable chatbot
const CHATBOT_ENABLED = true;

export const CustomerLayout: React.FC = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const location = useLocation();
  
  // Check if we're on the dashboard/home page
  const isDashboardPage = location.pathname === '/customer' || location.pathname === '/customer/dashboard';

  return (
    <Box className={`customer-layout ${!isDashboardPage ? 'with-green-background' : ''}`}>
      <CustomerNav />
      <Box className="customer-content">
        <Outlet />
      </Box>
      {/* Chatbot */}
      {CHATBOT_ENABLED && (
        <>
          <Tooltip title="Chat with BLOX AI">
            <Fab
              color="primary"
              aria-label="chat"
              className="fab-chat"
              onClick={() => setChatOpen(true)}
            >
              <Chat />
            </Fab>
          </Tooltip>
          <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
        </>
      )}
    </Box>
  );
};

