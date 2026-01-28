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
import { Send, Close, SmartToy, Person, AttachFile, Image as ImageIcon, PictureAsPdf, InsertDriveFile, Cancel, Mic, Stop, CheckCircle, Description } from '@mui/icons-material';
import { Button } from '@shared/components';
import { bloxAIClient, supabaseApiService, BloxAIClient, type AIApplicationInput, type AIDocumentInput } from '@shared/services';
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
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [applicationData, setApplicationData] = useState<Partial<AIApplicationInput>>({});
  const [uploadedFileIds, setUploadedFileIds] = useState<Map<string, { fileId: string; documentType: string }>>(new Map());
  const [uploadedDocumentTypes, setUploadedDocumentTypes] = useState<Set<string>>(new Set());
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null); // SpeechRecognition is a browser API
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Generate a new session ID for each chat session (no persistence for anonymous users)
  const getOrCreateSessionId = (): string => {
    if (sessionId) return sessionId;
    // Generate a fresh session ID for each chat session
    const newSessionId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
    return newSessionId;
  };

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

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      
      // Improved accuracy settings
      recognition.continuous = true; // Keep listening until stopped
      recognition.interimResults = true; // Show partial results for better UX
      recognition.lang = 'en-US'; // Primary language
      recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
      
      // Try to improve accuracy with service hints
      if ('serviceURI' in recognition) {
        (recognition as any).serviceURI = 'wss://speech.googleapis.com/v1/speech:recognize';
      }
      
      recognition.onstart = () => {
        setIsListening(true);
        setIsRecording(true);
        setInterimTranscript('');
        toast.info('Listening... Speak clearly', { autoClose: 2000 });
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimText = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.5;
          
          // Filter low confidence results (below 0.3)
          if (confidence < 0.3 && !result.isFinal) {
            continue;
          }
          
          if (result.isFinal) {
            // Use the highest confidence alternative
            let bestTranscript = transcript;
            let bestConfidence = confidence;
            
            if (result.length > 1) {
              for (let j = 0; j < result.length; j++) {
                if (result[j].confidence > bestConfidence) {
                  bestTranscript = result[j].transcript;
                  bestConfidence = result[j].confidence;
                }
              }
            }
            
            finalTranscript += bestTranscript + ' ';
          } else {
            interimText += transcript;
          }
        }
        
        // Update interim transcript for real-time feedback
        if (interimText) {
          setInterimTranscript(interimText);
        }
        
        // Update final message when we have final results
        if (finalTranscript) {
          const currentText = inputMessage.trim();
          const newText = (currentText ? currentText + ' ' : '') + finalTranscript.trim();
          setInputMessage(newText);
          setInterimTranscript('');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle specific error types
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not found. Please check your microphone settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          case 'aborted':
            // User stopped, don't show error
            return;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        toast.error(errorMessage);
        setIsListening(false);
        setIsRecording(false);
        setInterimTranscript('');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        setIsRecording(false);
        setInterimTranscript('');
      };
      
      recognition.onnomatch = () => {
        toast.warning('Could not recognize speech. Please try speaking more clearly.');
        setInterimTranscript('');
      };
      
      recognitionRef.current = recognition;
    }
    
    // Check for text-to-speech support
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Load available vehicles when chat opens
  useEffect(() => {
    if (open && !vehiclesLoaded) {
      loadAvailableVehicles();
    }
  }, [open, vehiclesLoaded]);

  const loadAvailableVehicles = async () => {
    try {
      const response = await supabaseApiService.getProducts();
      if (response.status === 'SUCCESS' && response.data) {
        // Only show active vehicles (admin can control visibility via status field)
        const activeVehicles = response.data.filter((v) => v.status === 'active');
        setAvailableVehicles(activeVehicles);
        setVehiclesLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  // Initialize chat with welcome message (no history for anonymous users)
  useEffect(() => {
    if (open && messages.length === 0) {
      // Generate a fresh session ID for each new chat session
      getOrCreateSessionId();
      
      // Show welcome message - no history loading for anonymous users
      const welcomeMessage = {
        role: 'assistant' as const,
        content: 'Hello! I\'m your BLOX AI assistant. How can I help you today?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Speak welcome message if TTS is enabled
      if (ttsEnabled && synthRef.current) {
        speakMessage(welcomeMessage.content);
      }
    }
  }, [open, messages.length, ttsEnabled]);

  // Connect WebSocket when modal opens
  useEffect(() => {
    if (!open) {
      // Cleanup: disconnect when modal closes
      if (wsRef.current) {
        disconnectWebSocket();
      }
      return;
    }

    // Only connect if no existing connection
    if (!wsRef.current) {
      connectWebSocket();
    }

    // Cleanup: disconnect when component unmounts or modal closes
    return () => {
      if (!open && wsRef.current) {
        disconnectWebSocket();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      let connectionTimeout: ReturnType<typeof setTimeout>;

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
            // Try to parse structured application data from response
            parseApplicationDataFromResponse(responseText, data);
            
            // Use functional update to prevent duplicates
            setMessages((prev) => {
              // Check if this exact message already exists (prevent duplicates)
              const lastMessage = prev[prev.length - 1];
              if (
                lastMessage &&
                lastMessage.role === 'assistant' &&
                lastMessage.content === responseText
              ) {
                // Message already exists, don't add duplicate
                return prev;
              }
              
              const assistantMessage = {
                role: 'assistant' as const,
                content: responseText,
                timestamp: new Date(),
              };
              return [...prev, assistantMessage];
            });
            
            // Speak the response if TTS is enabled
            if (ttsEnabled && synthRef.current) {
              speakMessage(responseText);
            }
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

  // Reset chat state when modal closes (fresh session for each chat)
  useEffect(() => {
    if (!open) {
      // Clear messages and session when modal closes
      setMessages([]);
      setSessionId(null);
      setError(null);
      setSelectedFiles([]);
      setFilePreviews({});
      setApplicationData({});
      setUploadedFileIds(new Map());
      setUploadedDocumentTypes(new Set());
      setShowSubmitButton(false);
      disconnectWebSocket();
    }
  }, [open]);

  // Check if we have enough data to submit an application
  useEffect(() => {
    const hasRequiredData = 
      applicationData.customerInfo?.email &&
      applicationData.customerInfo?.phone &&
      applicationData.vehicleId &&
      applicationData.loanAmount !== undefined &&
      applicationData.downPayment !== undefined;
    
    setShowSubmitButton(hasRequiredData || false);
  }, [applicationData]);

  // Parse application data from AI response
  const parseApplicationDataFromResponse = (responseText: string, data: any) => {
    try {
      // Try to extract JSON from response (AI might return structured data)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.applicationData || parsed.customerInfo || parsed.vehicleId) {
            setApplicationData((prev) => ({
              ...prev,
              ...(parsed.applicationData || parsed),
            }));
            return;
          }
        } catch (e) {
          // Not valid JSON, continue with keyword parsing
        }
      }

      // Keyword-based parsing for common patterns
      const lowerText = responseText.toLowerCase();
      
      // Extract email
      const emailMatch = responseText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        setApplicationData((prev) => ({
          ...prev,
          customerInfo: {
            ...prev.customerInfo,
            email: emailMatch[0],
          },
        }));
      }

      // Extract phone (Qatar format: +974 or 974)
      const phoneMatch = responseText.match(/(\+?974\s?\d{8})|(\d{8})/);
      if (phoneMatch) {
        const phone = phoneMatch[0].replace(/\s/g, '');
        setApplicationData((prev) => ({
          ...prev,
          customerInfo: {
            ...prev.customerInfo,
            phone: phone.startsWith('+') ? phone : `+974${phone}`,
          },
        }));
      }

      // Extract vehicle ID if mentioned (UUID format)
      const vehicleIdMatch = responseText.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
      if (vehicleIdMatch && lowerText.includes('vehicle')) {
        setApplicationData((prev) => ({
          ...prev,
          vehicleId: vehicleIdMatch[0],
        }));
      }

      // Extract amounts
      const amountMatches = responseText.match(/(?:loan|amount|price)[:\s]*([\d,]+\.?\d*)/gi);
      if (amountMatches) {
        const amounts = amountMatches.map(m => {
          const num = m.replace(/[^\d.]/g, '');
          return parseFloat(num);
        });
        if (amounts.length > 0) {
          setApplicationData((prev) => ({
            ...prev,
            loanAmount: amounts[0],
          }));
        }
      }

      const downPaymentMatches = responseText.match(/(?:down\s*payment|downpayment)[:\s]*([\d,]+\.?\d*)/gi);
      if (downPaymentMatches) {
        const amounts = downPaymentMatches.map(m => {
          const num = m.replace(/[^\d.]/g, '');
          return parseFloat(num);
        });
        if (amounts.length > 0) {
          setApplicationData((prev) => ({
            ...prev,
            downPayment: amounts[0],
          }));
        }
      }
    } catch (error) {
      console.error('Error parsing application data from response:', error);
    }
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
          const result = e.target?.result;
          if (result) {
            setFilePreviews((prev) => ({
              ...prev,
              [file.name]: result as string,
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

  // Helper function to detect document type from file name/type
  const detectDocumentType = (file: File): string => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    
    // Try to detect from file name
    if (name.includes('id') || name.includes('national') || name.includes('qid')) {
      return 'Qatar_national_id';
    }
    if (name.includes('bank') || name.includes('statement')) {
      return 'Bank_statements';
    }
    if (name.includes('salary') || name.includes('income')) {
      return 'Salary_certificates';
    }
    if (name.includes('passport')) {
      return 'Passport';
    }
    if (name.includes('license') || name.includes('driving')) {
      return 'Driving_license';
    }
    
    // Default based on file type
    if (type.includes('image')) {
      return 'Qatar_national_id'; // Default for images
    }
    if (type.includes('pdf')) {
      return 'Bank_statements'; // Default for PDFs
    }
    
    return 'Other_documents';
  };

  const handleSend = async () => {
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    // Convert files to base64 for preview
    const chatFiles: ChatFile[] = await Promise.all(
      selectedFiles.map(async (file) => {
        return new Promise<ChatFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result) {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: result as string,
                preview: filePreviews[file.name],
              });
            }
          };
          reader.readAsDataURL(file);
        });
      })
    );

    // Check if user is asking about vehicles/cars
    const messageLower = inputMessage.toLowerCase();
    const isVehicleQuery = messageLower.includes('car') || 
                          messageLower.includes('vehicle') || 
                          messageLower.includes('audi') || 
                          messageLower.includes('sedan') || 
                          messageLower.includes('what do you have') ||
                          messageLower.includes('what cars') ||
                          messageLower.includes('available');

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim() || (selectedFiles.length > 0 ? `Sent ${selectedFiles.length} file(s)` : ''),
      timestamp: new Date(),
      files: chatFiles.length > 0 ? chatFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Enhance message with vehicle data if asking about vehicles
    let messageToSend = inputMessage.trim() || (selectedFiles.length > 0 ? 'Please review these documents' : '');
    
    // Add context about already collected documents
    if (uploadedDocumentTypes.size > 0) {
      const collectedDocs = Array.from(uploadedDocumentTypes).join(', ');
      messageToSend = `${messageToSend}\n\n[Already Collected Documents]\nThe following document types have already been uploaded: ${collectedDocs}\nPlease do NOT ask for these again. Move on to the next required document or proceed with the application if all documents are collected.\n[End Context]`;
    }
    
    if (isVehicleQuery && availableVehicles.length > 0) {
      // Format vehicle data for the AI
      const vehicleSummary = availableVehicles
        .slice(0, 20) // Limit to first 20 vehicles
        .map(v => `${v.make} ${v.model} ${v.modelYear} - ${v.condition} - ${v.price} QAR`)
        .join('\n');
      
      messageToSend = `${messageToSend}\n\n[Available Vehicles Context]\nHere are the available vehicles:\n${vehicleSummary}\n[End Context]`;
    } else if (isVehicleQuery && availableVehicles.length === 0 && !vehiclesLoaded) {
      // Load vehicles if not already loaded
      await loadAvailableVehicles();
    }
    
    const filesToUpload = [...selectedFiles];
    setInputMessage('');
    setSelectedFiles([]);
    setFilePreviews({});

    try {
      if (!wsRef.current) {
        // Try to reconnect
        connectWebSocket();
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            handleSendAfterConnection(filesToUpload, messageToSend, userMessage);
          } else {
            setError('Unable to send message. Please try again.');
            setMessages((prev) => prev.filter((msg) => msg !== userMessage));
          }
        }, 1000);
        return;
      }

      if (wsRef.current.readyState === WebSocket.CONNECTING) {
        // Wait for connection
        wsRef.current.addEventListener('open', () => {
          handleSendAfterConnection(filesToUpload, messageToSend, userMessage);
        }, { once: true });
        return;
      }

      if (wsRef.current.readyState !== WebSocket.OPEN) {
        // Not connected, try to reconnect
        connectWebSocket();
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            handleSendAfterConnection(filesToUpload, messageToSend, userMessage);
          } else {
            setError('Unable to send message. Please try again.');
            setMessages((prev) => prev.filter((msg) => msg !== userMessage));
          }
        }, 1000);
        return;
      }

      await handleSendAfterConnection(filesToUpload, messageToSend, userMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    }
  };

  const handleSendAfterConnection = async (
    files: File[],
    message: string,
    userMessage: ChatMessage
  ) => {
    if (!wsRef.current) return;

    try {
      setUploadingFiles(files.length > 0);

      if (files.length > 0) {
        // Use new upload and chat methods
        if (files.length === 1) {
          // Single file upload
          const documentType = detectDocumentType(files[0]);
          const uploadResult = await bloxAIClient.uploadAndChat(
            wsRef.current,
            message || 'Please review this document',
            files[0],
            documentType
          );
          
          // Track uploaded file ID for application submission
          if (uploadResult && uploadResult.file_id) {
            setUploadedFileIds((prev) => {
              const newMap = new Map(prev);
              newMap.set(files[0].name, {
                fileId: uploadResult.file_id,
                documentType: documentType,
              });
              return newMap;
            });
            // Track document type as collected
            setUploadedDocumentTypes((prev) => new Set([...prev, documentType]));
          }
        } else {
          // Multiple files upload
          const documentTypes = files.map(file => detectDocumentType(file));
          const uploadResult = await bloxAIClient.uploadMultipleAndChat(
            wsRef.current,
            message || 'Please review these documents',
            files,
            documentTypes
          );
          
          // Track uploaded file IDs
          if (uploadResult && uploadResult.files) {
            setUploadedFileIds((prev) => {
              const newMap = new Map(prev);
              uploadResult.files.forEach((file, index: number) => {
                if (file.file_id && file.status === 'processed' && files[index]) {
                  newMap.set(files[index].name, {
                    fileId: file.file_id,
                    documentType: documentTypes[index],
                  });
                }
              });
              return newMap;
            });
            // Track document types as collected
            setUploadedDocumentTypes((prev) => {
              const newSet = new Set(prev);
              documentTypes.forEach(type => newSet.add(type));
              return newSet;
            });
          }
        }
      } else {
        // Just send message without files
        bloxAIClient.sendUserQuery(wsRef.current, message);
      }
    } catch (error: any) {
      console.error('Failed to upload files and send message:', error);
      toast.error(error.message || 'Failed to upload files. Please try again.');
      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }
    
    try {
      if (isRecording) {
        // Stop recording
        recognitionRef.current.stop();
        setIsRecording(false);
        setInterimTranscript('');
        
        // If we have interim text, add it to the input
        if (interimTranscript.trim()) {
          const currentText = inputMessage.trim();
          const newText = (currentText ? currentText + ' ' : '') + interimTranscript.trim();
          setInputMessage(newText);
          setInterimTranscript('');
        }
      } else {
        // Request microphone permission first
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            // Permission granted, start recognition
            recognitionRef.current?.start();
          })
          .catch((error) => {
            console.error('Microphone permission error:', error);
            toast.error('Microphone access is required for voice input. Please allow microphone access in your browser settings.');
          });
      }
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);
      
      // Handle specific errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else {
        toast.error('Failed to start voice recording. Please try again.');
      }
    }
  };

  const speakMessage = (text: string) => {
    if (!synthRef.current || !ttsEnabled) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    // Clean text for better TTS (remove markdown, URLs, etc.)
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\*\*([^\*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^\*]+)\*/g, '$1') // Remove italic markdown
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\n{3,}/g, '\n\n') // Limit multiple newlines
      .trim();
    
    if (!cleanText) return;
    
    // Split long text into sentences for better quality
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+/g) || [cleanText];
    
    sentences.forEach((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      
      // Optimized TTS settings for better accuracy and naturalness
      utterance.rate = 0.95; // Slightly slower for better clarity
      utterance.pitch = 1.0; // Natural pitch
      utterance.volume = 0.85; // Comfortable volume
      utterance.lang = 'en-US';
      
      // Try to use a high-quality voice if available
      if (!synthRef.current) return;
      const voices = synthRef.current.getVoices();
      const preferredVoices = voices.filter(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Google') || 
         voice.name.includes('Microsoft') || 
         voice.name.includes('Natural') ||
         voice.name.includes('Enhanced'))
      );
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
      } else {
        // Fallback to any English voice
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
        }
      }
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };
      
      // Add small delay between sentences for natural speech
      setTimeout(() => {
        synthRef.current?.speak(utterance);
      }, index * 100);
    });
  };

  const handleSubmitApplication = async () => {
    if (!applicationData.customerInfo?.email || !applicationData.customerInfo?.phone || !applicationData.vehicleId) {
      toast.error('Please provide all required information (email, phone, and vehicle selection) before submitting.');
      return;
    }

    setIsSubmittingApplication(true);
    try {
      // Convert uploaded file IDs to document format
      const documents: AIDocumentInput[] = Array.from(uploadedFileIds.entries()).map(([fileName, { fileId, documentType }]) => ({
        file_id: fileId,
        document_type: documentType,
        name: fileName,
      }));

      // Prepare application data
      const appInput: AIApplicationInput = {
        customerInfo: {
          firstName: applicationData.customerInfo?.firstName || '',
          lastName: applicationData.customerInfo?.lastName || '',
          email: applicationData.customerInfo.email!,
          phone: applicationData.customerInfo.phone!,
          ...applicationData.customerInfo,
        },
        vehicleId: applicationData.vehicleId!,
        offerId: applicationData.offerId,
        loanAmount: applicationData.loanAmount || 0,
        downPayment: applicationData.downPayment || 0,
        installmentPlan: applicationData.installmentPlan,
        documents: documents.length > 0 ? documents : undefined,
      };

      // Format using helper method
      const formattedData = BloxAIClient.createApplicationFromAIData(appInput);

      // Convert to Application format (add required fields with defaults)
      const customerInfo = formattedData.customerInfo;
      const applicationPayload: any = {
        customerName: formattedData.customerName,
        customerEmail: formattedData.customerEmail,
        customerPhone: formattedData.customerPhone,
        vehicleId: formattedData.vehicleId,
        offerId: formattedData.offerId || '', // Ensure offerId is a string
        status: formattedData.status,
        loanAmount: formattedData.loanAmount,
        downPayment: formattedData.downPayment,
        installmentPlan: formattedData.installmentPlan ? {
          ...formattedData.installmentPlan,
          tenure: formattedData.installmentPlan.tenure || '',
          interval: formattedData.installmentPlan.interval || 'Monthly',
        } : undefined,
        documents: formattedData.documents,
        origin: formattedData.origin,
        customerInfo: {
          firstName: customerInfo.firstName || '',
          lastName: customerInfo.lastName || '',
          email: formattedData.customerEmail,
          phone: formattedData.customerPhone,
          dateOfBirth: (customerInfo.dateOfBirth as string) || '',
          nationality: (customerInfo.nationality as string) || '',
          address: (customerInfo.address as any) || {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'Qatar',
          },
          employment: (customerInfo.employment as any) || {
            company: '',
            position: '',
            employmentType: '',
            employmentDuration: '',
            salary: 0,
          },
          income: (customerInfo.income as any) || {
            monthlyIncome: 0,
            totalIncome: 0,
          },
          // Preserve AI origin markers
          _origin: 'ai' as const,
          _createdByAI: true as const,
          // Preserve any other fields from customerInfo
          ...Object.fromEntries(
            Object.entries(customerInfo).filter(([key]) => 
              !['dateOfBirth', 'nationality', 'address', 'employment', 'income'].includes(key)
            )
          ),
        },
      };

      // Submit to Supabase
      const result = await supabaseApiService.createApplication(applicationPayload);

      if (result.status === 'SUCCESS' && result.data) {
        const appId = result.data.id || '';
        toast.success(`Application #${appId.slice(0, 8)} submitted successfully! It will be reviewed by our team.`);
        
        // Add success message to chat
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ Your application has been successfully submitted! Application ID: ${appId.slice(0, 8)}. Our team will review it and get back to you soon.`,
            timestamp: new Date(),
          },
        ]);

        // Reset application data
        setApplicationData({});
        setUploadedFileIds(new Map());
        setUploadedDocumentTypes(new Set());
        setShowSubmitButton(false);
      } else {
        throw new Error(result.message || 'Failed to submit application');
      }
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      let errorMessage = 'Failed to submit application. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.code === 'MISSING_FIELD' || error.code === 'INVALID_DATA') {
        errorMessage = `Please provide all required information: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const handleClose = () => {
    disconnectWebSocket();
    setError(null);
    setSelectedFiles([]);
    setFilePreviews({});
    setApplicationData({});
    setUploadedFileIds(new Map());
    setUploadedDocumentTypes(new Set());
    setShowSubmitButton(false);
    // Optionally clear session ID on close, or keep it for persistence
    // localStorage.removeItem('blox-chat-session-id');
    // setSessionId(null);
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
          borderColor: '#C9C4B7', // Mid Grey
          bgcolor: '#DAFF01', // Lime Yellow
          color: '#0E1909', // Blox Black
          py: 2,
          px: 3,
        }}
      >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(14, 25, 9, 0.1)', // Blox Black with opacity
              width: 40,
              height: 40,
            }}
          >
            <SmartToy sx={{ color: '#0E1909' }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} component="span" sx={{ color: '#0E1909' }}>
              BLOX AI Assistant
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isConnected ? '#DAFF01' : isConnecting ? '#B8D900' : '#787663', // Lime Yellow / Darker Lime Yellow / Dark Grey
                  animation: isConnecting ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#787663', fontSize: '0.7rem' }}>
                {isConnected ? 'Online' : isConnecting ? 'Connecting...' : 'Offline'}
              </Typography>
            </Box>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: '#0E1909', // Blox Black
            '&:hover': {
              bgcolor: 'rgba(14, 25, 9, 0.1)', // Blox Black with opacity
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto', p: 0, bgcolor: '#F3F0ED' }}>
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

          {showSubmitButton && (
            <Fade in={showSubmitButton}>
              <Alert
                severity="info"
                icon={<Description />}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  bgcolor: '#E3F2FD',
                  border: '1px solid #2196F3',
                }}
                action={
                  <Button
                    variant="primary"
                    onClick={handleSubmitApplication}
                    disabled={isSubmittingApplication}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.875rem',
                    }}
                  >
                    {isSubmittingApplication ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle sx={{ mr: 0.5, fontSize: 18 }} />
                        Submit Application
                      </>
                    )}
                  </Button>
                }
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Ready to submit your application?
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                  {applicationData.customerInfo?.email && `Email: ${applicationData.customerInfo.email} • `}
                  {applicationData.vehicleId && `Vehicle selected • `}
                  {uploadedFileIds.size > 0 && `${uploadedFileIds.size} document(s) uploaded`}
                </Typography>
              </Alert>
            </Fade>
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
                      bgcolor: '#DAFF01', // Lime Yellow
                      width: 32,
                      height: 32,
                      boxShadow: '0 2px 8px rgba(218, 255, 1, 0.3)',
                    }}
                  >
                    <SmartToy sx={{ fontSize: 18, color: '#0E1909' }} />
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
                      bgcolor: message.role === 'user' ? '#DAFF01' : '#F3F0ED', // Lime Yellow for user, Light Grey for assistant
                      color: message.role === 'user' ? '#0E1909' : '#0E1909', // Blox Black for both
                      borderRadius: message.role === 'user' 
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      boxShadow: message.role === 'user'
                        ? '0 4px 12px rgba(218, 255, 1, 0.25)'
                        : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: message.role === 'user'
                          ? '0 6px 16px rgba(218, 255, 1, 0.3)'
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
                          color: '#0E1909', // Blox Black for both
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
                              bgcolor: message.role === 'user' ? 'rgba(14, 25, 9, 0.1)' : '#E8E5DF', // Blox Black with opacity for user, darker light grey for assistant
                              border: `1px solid ${message.role === 'user' ? 'rgba(14, 25, 9, 0.2)' : '#C9C4B7'}`, // Blox Black with opacity / Mid Grey
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
                                  color: '#0E1909', // Blox Black for both
                                }}
                              >
                                <Box
                                  sx={{
                                    p: 1,
                                    borderRadius: 1.5,
                                    bgcolor: message.role === 'user' ? 'rgba(14, 25, 9, 0.15)' : '#C9C4B7', // Blox Black with opacity / Mid Grey
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
                                      color: '#0E1909', // Blox Black for both
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
                                      color: '#787663', // Dark Grey for both
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
                      bgcolor: '#787663', // Dark Grey
                      width: 32,
                      height: 32,
                      boxShadow: '0 2px 8px rgba(120, 118, 99, 0.2)',
                    }}
                  >
                    <Person sx={{ fontSize: 18, color: '#F3F0ED' }} />
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
          borderColor: '#C9C4B7', // Mid Grey
          p: 2.5,
          bgcolor: '#F3F0ED', // Light Grey
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
                  bgcolor: '#E8E5DF', // Slightly darker light grey
                  '& .MuiChip-deleteIcon': {
                    color: '#787663', // Dark Grey
                    '&:hover': {
                      color: '#0E1909', // Blox Black
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
              bgcolor: '#F3F0ED', // Light Grey
              color: '#787663', // Dark Grey
              width: 48,
              height: 48,
              border: '1.5px solid #C9C4B7', // Mid Grey
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#E8E5DF', // Slightly darker light grey
                borderColor: '#DAFF01', // Lime Yellow
                color: '#0E1909', // Blox Black
              },
              '&:disabled': {
                bgcolor: '#E8E5DF', // Slightly darker light grey
                borderColor: '#C9C4B7', // Mid Grey
                color: '#C9C4B7', // Mid Grey
              },
            }}
          >
            <AttachFile />
          </IconButton>
          {speechSupported && (
            <IconButton
              onClick={handleStartRecording}
              disabled={!isConnected && !isConnecting}
              sx={{
                bgcolor: isRecording ? '#787663' : '#F3F0ED', // Dark Grey when recording, Light Grey otherwise
                color: isRecording ? '#F3F0ED' : '#787663', // Light Grey text when recording, Dark Grey otherwise
                width: 48,
                height: 48,
                border: '1.5px solid',
                borderColor: isRecording ? '#787663' : '#C9C4B7', // Dark Grey / Mid Grey
                transition: 'all 0.2s',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                },
                '&:hover': {
                  bgcolor: isRecording ? '#5A5849' : '#E8E5DF', // Darker grey / Slightly darker light grey
                  borderColor: isRecording ? '#5A5849' : '#DAFF01', // Darker grey / Lime Yellow
                  color: isRecording ? '#F3F0ED' : '#0E1909', // Light Grey / Blox Black
                },
                '&:disabled': {
                  bgcolor: '#E8E5DF', // Slightly darker light grey
                  borderColor: '#C9C4B7', // Mid Grey
                  color: '#C9C4B7', // Mid Grey
                },
              }}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? <Stop /> : <Mic />}
            </IconButton>
          )}
          <Box sx={{ position: 'relative', width: '100%' }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              placeholder={
                isRecording && interimTranscript
                  ? interimTranscript
                  : isConnected
                  ? "Type your message or use voice input..."
                  : "Connecting..."
              }
              value={isRecording && interimTranscript ? `${inputMessage}${interimTranscript ? ' ' + interimTranscript : ''}` : inputMessage}
              onChange={(e) => {
                if (!isRecording) {
                  setInputMessage(e.target.value);
                }
              }}
              onKeyPress={handleKeyPress}
              disabled={(!isConnected && !isConnecting) || isRecording}
              size="medium"
              multiline
              maxRows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: isRecording ? '#E8E5DF' : '#F3F0ED', // Slightly darker light grey when recording, Light Grey otherwise
                  transition: 'all 0.2s',
                  border: isRecording ? '2px solid #787663' : 'none', // Dark Grey border when recording
                  '&:hover': {
                    bgcolor: isRecording ? '#E8E5DF' : '#E8E5DF', // Slightly darker light grey
                  },
                  '&.Mui-focused': {
                    bgcolor: '#F3F0ED', // Light Grey
                    boxShadow: isRecording 
                      ? '0 0 0 3px rgba(120, 118, 99, 0.1)' // Dark Grey focus ring
                      : '0 0 0 3px rgba(218, 255, 1, 0.4)', // Lime Yellow focus ring
                  },
                  '& fieldset': {
                    borderColor: isRecording ? '#787663' : '#C9C4B7', // Dark Grey / Mid Grey
                    borderWidth: isRecording ? 2 : 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: isRecording ? '#787663' : '#787663', // Dark Grey
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: isRecording ? '#787663' : '#DAFF01', // Dark Grey / Lime Yellow
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.95rem',
                  py: 1.5,
                  color: isRecording && interimTranscript ? '#787663' : '#0E1909', // Dark Grey / Blox Black
                  fontStyle: isRecording && interimTranscript ? 'italic' : 'normal',
                },
              }}
            />
            {isRecording && interimTranscript && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 12,
                  fontSize: '0.75rem',
                  color: '#787663', // Dark Grey
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#787663', // Dark Grey
                    animation: 'pulse 1s infinite',
                  }}
                />
                Listening...
              </Box>
            )}
          </Box>
          <IconButton
            onClick={handleSend}
            disabled={(!inputMessage.trim() && selectedFiles.length === 0) || (!isConnected && !isConnecting) || uploadingFiles}
            sx={{
              bgcolor: '#DAFF01', // Lime Yellow
              color: '#0E1909', // Blox Black
              width: 48,
              height: 48,
              boxShadow: '0 4px 12px rgba(218, 255, 1, 0.3)',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#B8D900', // Darker Lime Yellow
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(218, 255, 1, 0.4)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                bgcolor: '#C9C4B7', // Mid Grey
                color: '#787663', // Dark Grey
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

