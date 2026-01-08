import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Fade,
} from '@mui/material';
import { Send, Close, SmartToy, Person, AttachFile, Image as ImageIcon, PictureAsPdf, InsertDriveFile, Cancel } from '@mui/icons-material';
import { Button } from '@shared/components';
import { bloxAIClient } from '@shared/services';
import { toast } from 'react-toastify';
import './ChatModal.scss';

interface ChatFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64 or object URL
  preview?: string; // for images
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  files?: ChatFile[];
}

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your BLOX AI assistant. How can I help you today?',
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, messages.length]);

  // Connect WebSocket when modal opens
  useEffect(() => {
    if (open && !isConnected && !isConnecting && !wsRef.current) {
      connectWebSocket();
    }

    // Cleanup: disconnect when modal closes
    return () => {
      if (!open && wsRef.current) {
        disconnectWebSocket();
      }
    };
  }, [open]);

  const connectWebSocket = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check health first to verify server is accessible
      const baseUrl = bloxAIClient.getBaseUrl();
      const healthUrl = `${baseUrl}/weaviate_status/`;
      
      try {
        console.log('🔍 Checking BLOX AI server health at:', healthUrl);
        const healthStatus = await bloxAIClient.checkHealth();
        console.log('✅ BLOX AI health check passed:', healthStatus);
        console.log('Server is reachable, attempting WebSocket connection...');
      } catch (healthError: any) {
        const errorMsg = healthError?.message || 'Unknown error';
        console.error('❌ Health check failed:', errorMsg);
        console.error('Health check URL attempted:', healthUrl);
        console.error('Base URL:', baseUrl);
        
        // Provide specific guidance based on the tunnel type
        let errorMessage = `Cannot reach BLOX AI server at ${baseUrl}`;
        
        if (baseUrl.includes('loca.lt')) {
          errorMessage = 
            `Cannot reach BLOX AI server. Please verify:\n` +
            `1. BLOX AI server is running on localhost:8000\n` +
            `2. Localtunnel is active and connected (check your terminal)\n` +
            `3. The tunnel URL matches: ${baseUrl}\n` +
            `4. Try opening this URL in your browser: ${healthUrl}`;
        } else if (baseUrl.includes('trycloudflare.com')) {
          errorMessage = 
            `Cannot reach BLOX AI server. Please verify:\n` +
            `1. BLOX AI server is running on localhost:8000\n` +
            `2. Cloudflare Tunnel is active and connected\n` +
            `3. The tunnel URL matches: ${baseUrl}`;
        } else {
          errorMessage = 
            `Cannot reach BLOX AI server. Please verify:\n` +
            `1. Server is running on localhost:8000\n` +
            `2. Tunnel/proxy is active\n` +
            `3. URL is correct: ${baseUrl}`;
        }
        
        setError(errorMessage);
        setIsConnecting(false);
        return; // Don't attempt WebSocket if health check fails
      }

      // Create WebSocket connection using the new API
      const ws = bloxAIClient.createChatConnection('user_chatbot');
      wsRef.current = ws;

      let connectionTimeout: NodeJS.Timeout;

      ws.onopen = () => {
        console.log('WebSocket connected to BLOX AI');
        setIsConnected(true);
        setIsConnecting(false);
        if (connectionTimeout) clearTimeout(connectionTimeout);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle the new response format: { response?: string, error?: string }
          if (data.error) {
            setError(data.error);
            return;
          }

          const responseText = data.response || data.message || '';
          if (responseText) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState); // 3 = CLOSED
        console.error('WebSocket URL:', ws.url);
        
        // Check if it's an ngrok issue
        const baseUrl = bloxAIClient.getBaseUrl();
        let errorMessage = 'Failed to connect to chat. Please try again.';
        
        if (baseUrl.includes('ngrok-free.dev')) {
          errorMessage = 
            'WebSocket connection failed. ngrok-free.dev may require browser verification. ' +
            'Please ensure your BLOX AI server is running and accessible. ' +
            'If using ngrok, try opening the HTTP URL in a browser first to bypass the interstitial.';
        } else if (baseUrl.includes('trycloudflare.com')) {
          errorMessage = 
            'WebSocket connection failed. Please verify:\n' +
            '1. BLOX AI server is running on localhost:8000\n' +
            '2. Cloudflare Tunnel is active and connected\n' +
            '3. WebSocket endpoint /ws is available on your server\n' +
            '4. Try testing the health endpoint: ' + baseUrl + '/weaviate_status/';
        } else if (baseUrl.includes('localhost')) {
          errorMessage = 
            'WebSocket connection failed. Please ensure your BLOX AI server is running on localhost:8000.';
        }
        
        setError(errorMessage);
        setIsConnecting(false);
        setIsConnected(false);
        if (connectionTimeout) clearTimeout(connectionTimeout);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected from BLOX AI');
        setIsConnected(false);
        wsRef.current = null;
      };

      // Set a timeout in case connection doesn't establish
      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          setError('Connection timeout. Please check your network and try again.');
          setIsConnecting(false);
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setError('Chat service is not available. Please check your connection.');
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain'];

    const validFiles: File[] = [];
    const previews: Record<string, string> = {};

    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        continue;
      }

      validFiles.push(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setFilePreviews((prev) => ({
              ...prev,
              [file.name]: e.target.result as string,
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) selected`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setFilePreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon />;
    if (fileType === 'application/pdf') return <PictureAsPdf />;
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSend = async () => {
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    // Convert files to base64
    const chatFiles: ChatFile[] = await Promise.all(
      selectedFiles.map(async (file) => {
        return new Promise<ChatFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: e.target?.result as string,
              preview: filePreviews[file.name],
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim() || (selectedFiles.length > 0 ? `Sent ${selectedFiles.length} file(s)` : ''),
      timestamp: new Date(),
      files: chatFiles.length > 0 ? chatFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage.trim() || 'I have uploaded some files';
    setInputMessage('');
    setSelectedFiles([]);
    setFilePreviews({});

    try {
      if (wsRef.current && isConnected) {
        // Use the new API method
        bloxAIClient.sendUserQuery(wsRef.current, messageToSend);
        // TODO: Send file data if API supports it
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        // Wait for connection
        wsRef.current.addEventListener('open', () => {
          if (wsRef.current) {
            bloxAIClient.sendUserQuery(wsRef.current, messageToSend);
          }
        }, { once: true });
      } else {
        // If not connected, try to reconnect
        connectWebSocket();
        // Wait a bit and try again
        setTimeout(() => {
          if (wsRef.current && isConnected) {
            bloxAIClient.sendUserQuery(wsRef.current, messageToSend);
          } else {
            setError('Unable to send message. Please try again.');
            // Remove the message if we can't send it
            setMessages((prev) => prev.filter((msg) => msg !== userMessage));
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      // Remove the message if sending failed
      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    disconnectWebSocket();
    setError(null);
    setSelectedFiles([]);
    setFilePreviews({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: '85vh',
          maxHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #00CFA2 0%, #00B892 100%)',
          color: 'white',
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              width: 40,
              height: 40,
            }}
          >
            <SmartToy />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} component="span" sx={{ color: 'white' }}>
              BLOX AI Assistant
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isConnected ? '#4ade80' : isConnecting ? '#fbbf24' : '#ef4444',
                  animation: isConnecting ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.7rem' }}>
                {isConnected ? 'Online' : isConnecting ? 'Connecting...' : 'Offline'}
              </Typography>
            </Box>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto', p: 0, bgcolor: '#f8fafc' }}>
        <Box className="chat-messages" sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Fade in={!!error}>
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {isConnecting && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 3,
                gap: 1.5,
              }}
            >
              <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Connecting to chat...
              </Typography>
            </Box>
          )}

          {messages.map((message, index) => (
            <Fade in key={index} timeout={300}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 1.5,
                  animation: 'slideIn 0.3s ease-out',
                  '@keyframes slideIn': {
                    from: {
                      opacity: 0,
                      transform: message.role === 'user' ? 'translateX(20px)' : 'translateX(-20px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              >
                {message.role === 'assistant' && (
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 32,
                      height: 32,
                      boxShadow: '0 2px 8px rgba(0, 207, 162, 0.3)',
                    }}
                  >
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      position: 'relative',
                      bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #00CFA2 0%, #00B892 100%)'
                        : 'white',
                      color: message.role === 'user' ? '#FFFFFF' : '#111827',
                      borderRadius: message.role === 'user' 
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      boxShadow: message.role === 'user'
                        ? '0 4px 12px rgba(0, 207, 162, 0.25)'
                        : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: message.role === 'user'
                          ? '0 6px 16px rgba(0, 207, 162, 0.3)'
                          : '0 4px 12px rgba(0, 0, 0, 0.12)',
                      },
                    }}
                  >
                    {message.content && (
                      <Typography
                        variant="body1"
                        component="div"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                          fontSize: '0.9rem',
                          fontWeight: message.role === 'user' ? 500 : 400,
                          color: message.role === 'user' ? '#FFFFFF' : '#111827',
                          mb: message.files && message.files.length > 0 ? 1.5 : 0,
                          '& *': {
                            color: 'inherit',
                          },
                        }}
                      >
                        {message.content}
                      </Typography>
                    )}
                    {message.files && message.files.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: message.content ? 1 : 0 }}>
                        {message.files.map((file, fileIndex) => (
                          <Box
                            key={fileIndex}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: message.role === 'user' ? 'rgba(255, 255, 255, 0.15)' : '#f1f5f9',
                              border: `1px solid ${message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0'}`,
                            }}
                          >
                            {file.preview && file.type.startsWith('image/') ? (
                              <Box
                                component="img"
                                src={file.preview}
                                alt={file.name}
                                sx={{
                                  maxWidth: 200,
                                  maxHeight: 150,
                                  borderRadius: 1.5,
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                }}
                                onClick={() => window.open(file.preview, '_blank')}
                              />
                            ) : (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  flex: 1,
                                  color: message.role === 'user' ? 'rgba(255, 255, 255, 0.9)' : '#475569',
                                }}
                              >
                                <Box
                                  sx={{
                                    p: 1,
                                    borderRadius: 1.5,
                                    bgcolor: message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {getFileIcon(file.type)}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 500,
                                      color: message.role === 'user' ? '#FFFFFF' : '#111827',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {file.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: message.role === 'user' ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {formatFileSize(file.size)}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>
                  {message.timestamp && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
                {message.role === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 32,
                      height: 32,
                      boxShadow: '0 2px 8px rgba(46, 44, 52, 0.2)',
                    }}
                  >
                    <Person sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
              </Box>
            </Fade>
          ))}
          <div ref={messagesEndRef} />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2.5,
          bgcolor: 'white',
          gap: 1.5,
          flexDirection: 'column',
        }}
      >
        {selectedFiles.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              width: '100%',
              pb: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {selectedFiles.map((file) => (
              <Chip
                key={file.name}
                icon={getFileIcon(file.type)}
                label={`${file.name} (${formatFileSize(file.size)})`}
                onDelete={() => removeFile(file.name)}
                deleteIcon={<Cancel />}
                sx={{
                  bgcolor: '#f1f5f9',
                  '& .MuiChip-deleteIcon': {
                    color: '#64748b',
                    '&:hover': {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            ))}
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, width: '100%', alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected && !isConnecting}
            sx={{
              bgcolor: '#f8fafc',
              color: 'text.secondary',
              width: 48,
              height: 48,
              border: '1.5px solid #e2e8f0',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#f1f5f9',
                borderColor: 'primary.main',
                color: 'primary.main',
              },
              '&:disabled': {
                bgcolor: '#f1f5f9',
                borderColor: '#e2e8f0',
                color: '#cbd5e1',
              },
            }}
          >
            <AttachFile />
          </IconButton>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected && !isConnecting}
            size="medium"
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f8fafc',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                },
                '&.Mui-focused': {
                  bgcolor: 'white',
                  boxShadow: '0 0 0 3px rgba(0, 207, 162, 0.1)',
                },
                '& fieldset': {
                  borderColor: '#e2e8f0',
                  borderWidth: 1.5,
                },
                '&:hover fieldset': {
                  borderColor: '#cbd5e1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
              },
              '& .MuiInputBase-input': {
                fontSize: '0.95rem',
                py: 1.5,
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={(!inputMessage.trim() && selectedFiles.length === 0) || (!isConnected && !isConnecting)}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 48,
              height: 48,
              boxShadow: '0 4px 12px rgba(0, 207, 162, 0.3)',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(0, 207, 162, 0.4)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                bgcolor: '#e2e8f0',
                color: '#94a3b8',
                boxShadow: 'none',
                transform: 'none',
              },
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

