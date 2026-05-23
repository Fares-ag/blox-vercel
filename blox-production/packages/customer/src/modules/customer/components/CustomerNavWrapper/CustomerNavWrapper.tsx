import React, { useState } from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { Chat } from '@mui/icons-material';
import { CustomerNav } from '../CustomerNav/CustomerNav';
import { ChatModal } from '../../features/help/components/ChatModal';
import './CustomerNavWrapper.scss';

interface CustomerNavWrapperProps {
  children: React.ReactNode;
}

// Feature flag to enable/disable chatbot
const CHATBOT_ENABLED = true;

export const CustomerNavWrapper: React.FC<CustomerNavWrapperProps> = ({ children }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Box className="customer-nav-wrapper">
      <CustomerNav />
      <Box className="customer-content-wrapper">
        {children}
      </Box>
      {/* Chatbot for non-authenticated users */}
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

