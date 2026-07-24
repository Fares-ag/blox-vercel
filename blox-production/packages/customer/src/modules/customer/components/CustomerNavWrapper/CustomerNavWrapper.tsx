import React, { useState } from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { Chat } from '@mui/icons-material';
import { CustomerNav } from '../CustomerNav/CustomerNav';
import { CustomerFooter } from '../CustomerFooter/CustomerFooter';
import { ChatModal } from '../../features/help/components/ChatModal';
import { Config } from '@shared/config/app.config';
import './CustomerNavWrapper.scss';

interface CustomerNavWrapperProps {
  children: React.ReactNode;
}

// Only enable when flag is on and a non-localhost AI URL is configured.
const bloxAiUrl = (import.meta.env.VITE_BLOX_AI_URL || '').trim();
const CHATBOT_ENABLED =
  Config.chatbotEnabled &&
  !!bloxAiUrl &&
  !/localhost|127\.0\.0\.1/i.test(bloxAiUrl);

export const CustomerNavWrapper: React.FC<CustomerNavWrapperProps> = ({ children }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Box className="customer-nav-wrapper">
      <CustomerNav />
      <Box className="customer-content-wrapper">
        {children}
      </Box>
      <CustomerFooter />
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

