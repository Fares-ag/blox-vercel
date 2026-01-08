import React, { useState } from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { CustomerNav } from '../../components/CustomerNav/CustomerNav';
import { Chat } from '@mui/icons-material';
import { ChatModal } from '../../features/help/components/ChatModal';
import './CustomerLayout.scss';

export const CustomerLayout: React.FC = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Box className="customer-layout">
      <CustomerNav />
      <Box className="customer-content">
        <Outlet />
      </Box>
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
    </Box>
  );
};

