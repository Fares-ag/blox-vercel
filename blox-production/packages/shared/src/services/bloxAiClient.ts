/**
 * BLOX AI API Client
 * 
 * Use this client in your external chatbot application to communicate with the BLOX AI API.
 * 
 * Setup:
 * 1. Set environment variable: REACT_APP_BLOX_AI_URL (or VITE_BLOX_AI_URL for Vite)
 * 2. Import and use: import { bloxAIClient } from './bloxAiClient';
 */

interface AssessmentResponse {
  decision: 'Approved' | 'Denied';
  reasons: string[];
}

interface UserData {
  first_name?: string;
  last_name?: string;
  employment_type?: string;
  monthly_income?: number;
  documents?: Array<{
    document_type: string;
    document_path: string; // Must be a valid URL
  }>;
  [key: string]: any; // Allow additional fields
}

interface WebSocketMessage {
  response?: string;
  error?: string;
}

interface FileUploadResponse {
  file_id: string;
  file_url: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  document_type?: string;
  content_type: string;
}

interface BatchUploadResponse {
  total: number;
  processed: number;
  failed: number;
  files: Array<{
    filename: string;
    status: 'processed' | 'failed';
    file_id?: string;
    extracted_data?: any;
    error?: string;
  }>;
  processing_time_seconds: number;
}

interface ChatHistory {
  session_id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface VoiceResponse {
  text?: string;
  audio_url?: string;
  error?: string;
}

/**
 * Custom error class for AI application submission errors
 */
export class AIApplicationError extends Error {
  public code: 'VALIDATION_ERROR' | 'MISSING_FIELD' | 'INVALID_DATA' | 'INVALID_TYPE';

  constructor(message: string, code: 'VALIDATION_ERROR' | 'MISSING_FIELD' | 'INVALID_DATA' | 'INVALID_TYPE') {
    super(message);
    this.code = code;
    this.name = 'AIApplicationError';
    Object.setPrototypeOf(this, AIApplicationError.prototype);
  }
}

/**
 * Input document from AI API
 */
export interface AIDocumentInput {
  file_id?: string;
  document_type: string;
  name?: string;
  url?: string;
  category?: string;
}

/**
 * Input data for creating an application from AI
 */
export interface AIApplicationInput {
  customerInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    nationality?: string;
    qid?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    employment?: {
      company?: string;
      position?: string;
      employmentType?: string;
      employmentDuration?: string;
      salary?: number;
    };
    income?: {
      monthlyIncome?: number;
      totalIncome?: number;
    };
    [key: string]: unknown;
  };
  vehicleId: string;
  offerId?: string;
  loanAmount: number;
  downPayment: number;
  installmentPlan?: {
    tenure?: string;
    interval?: string;
    monthlyAmount?: number;
    totalAmount?: number;
    schedule?: unknown[];
    [key: string]: unknown;
  };
  documents?: AIDocumentInput[];
}

/**
 * Formatted application data ready for Supabase
 */
export interface FormattedAIApplication {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleId: string;
  offerId?: string;
  status: 'under_review';
  loanAmount: number;
  downPayment: number;
  customerInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    _origin: 'ai';
    _createdByAI: true;
    [key: string]: unknown;
  };
  installmentPlan?: {
    tenure?: string;
    interval?: string;
    monthlyAmount?: number;
    totalAmount?: number;
    schedule?: unknown[];
    [key: string]: unknown;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    url: string;
    uploadedAt: string;
  }>;
  origin: 'ai';
}

class BloxAIClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Support both React and Vite environment variables
    // Note: In Vite, use import.meta.env. In Create React App, use process.env (but that's server-side only)
    // For browser compatibility, we check window global first, then Vite's import.meta.env
    this.baseUrl =
      baseUrl ||
      (typeof window !== 'undefined' && (window as any).__BLOX_AI_URL__) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BLOX_AI_URL) ||
      'http://localhost:8000';

    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  /**
   * Assess an application using the REST API
   * 
   * @param userData - Application data including user info and documents
   * @returns Promise with decision and reasons
   * 
   * @example
   * const assessment = await bloxAIClient.assessApplication({
   *   first_name: "John",
   *   last_name: "Doe",
   *   employment_type: "Employed",
   *   monthly_income: 5000,
   *   documents: [{
   *     document_type: "Qatar_national_id",
   *     document_path: "https://example.com/id.pdf"
   *   }]
   * });
   */
  async assessApplication(userData: UserData): Promise<AssessmentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_data: userData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const result = await response.json();

      // Parse the nested JSON response
      if (typeof result.response === 'string') {
        return JSON.parse(result.response);
      }

      return result.response;
    } catch (error: any) {
      console.error('Assessment failed:', error);
      throw new Error(
        `Failed to assess application: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create WebSocket connection for real-time chat
   * 
   * @param sessionType - 'user_chatbot' for general questions, 'admin_chatbot' for application review
   * @returns WebSocket connection
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('user_chatbot');
   * ws.onmessage = (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('AI Response:', data.response);
   * };
   */
  createChatConnection(
    sessionType: 'user_chatbot' | 'admin_chatbot' = 'user_chatbot'
  ): WebSocket {
    const wsUrl = this.baseUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');

    const fullWsUrl = `${wsUrl}/ws`;
    
    console.log('Attempting WebSocket connection to:', fullWsUrl);

    const ws = new WebSocket(fullWsUrl);

    // Store session type for later use
    (ws as any).__sessionType = sessionType;

    // Add error logging with more details
    ws.addEventListener('error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('WebSocket URL attempted:', fullWsUrl);
      console.error('Base URL:', this.baseUrl);
      console.error('WebSocket readyState:', ws.readyState);
      
      if (this.baseUrl.includes('ngrok-free.dev')) {
        console.warn(
          'Note: ngrok-free.dev may require browser verification. ' +
          'Try opening the URL in a browser first to bypass the interstitial, ' +
          'or consider using a paid ngrok plan for WebSocket support.'
        );
      } else if (this.baseUrl.includes('trycloudflare.com')) {
        console.warn(
          'Note: Cloudflare Tunnel WebSocket connection failed. ' +
          'Please verify: 1) Your BLOX AI server is running, 2) WebSocket endpoint /ws is available, ' +
          '3) Cloudflare Tunnel is properly configured for WebSocket support.'
        );
      }
    });

    return ws;
  }

  /**
   * Send user query via WebSocket
   * 
   * @param ws - WebSocket connection from createChatConnection
   * @param query - User's question
   * @param fileIds - Optional array of uploaded file IDs to include in the query
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('user_chatbot');
   * bloxAIClient.sendUserQuery(ws, 'What are the eligibility requirements?');
   * // Or with file IDs:
   * bloxAIClient.sendUserQuery(ws, 'Review this document', [fileId1, fileId2]);
   */
  sendUserQuery(ws: WebSocket, query: string, fileIds?: string[]): void {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => {
        this.sendUserQuery(ws, query, fileIds);
      });
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        `WebSocket not connected. State: ${ws.readyState}`
      );
    }

    const message: any = {
      session_type: 'user_chatbot',
      user_query: query,
    };

    if (fileIds && fileIds.length > 0) {
      message.file_ids = fileIds;
    }

    ws.send(JSON.stringify(message));
  }

  /**
   * Send admin query via WebSocket (for reviewing applications)
   * 
   * @param ws - WebSocket connection from createChatConnection
   * @param query - Admin's question
   * @param userData - Application data
   * @param documents - Array of document URLs
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('admin_chatbot');
   * bloxAIClient.sendAdminQuery(ws, 'Review this application', userData, documents);
   */
  sendAdminQuery(
    ws: WebSocket,
    query: string,
    userData: UserData,
    documents: Array<{ document_type: string; document_path: string }> = []
  ): void {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => {
        this.sendAdminQuery(ws, query, userData, documents);
      });
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        `WebSocket not connected. State: ${ws.readyState}`
      );
    }

    ws.send(
      JSON.stringify({
        session_type: 'admin_chatbot',
        admin_query: query,
        data: {
          user_data: userData,
          documents: documents,
        },
      })
    );
  }

  /**
   * Check API health and Weaviate connection
   * 
   * @returns Promise with status information
   * 
   * @example
   * const status = await bloxAIClient.checkHealth();
   * console.log(status.status); // "Weaviate is ready!"
   */
  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/weaviate_status/`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to check health: ${error.message}`);
    }
  }

  /**
   * Get the base URL being used
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Upload a file and send a chat message in one call
   * 
   * @param ws - WebSocket connection from createChatConnection
   * @param message - Chat message to send
   * @param file - File to upload
   * @param documentType - Type of document (e.g., 'Qatar_national_id', 'Bank_statements')
   * @returns Promise with upload result
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('user_chatbot');
   * await bloxAIClient.uploadAndChat(ws, 'Review this document', file, 'Qatar_national_id');
   */
  async uploadAndChat(
    ws: WebSocket,
    message: string,
    file: File,
    documentType: string
  ): Promise<FileUploadResponse> {
    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      // Ensure file_size is sent as an integer (not float) to avoid backend errors
      formData.append('file_size', Math.floor(file.size).toString());

      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        let errorText: string;
        let errorDetail: any = null;
        try {
          errorText = await uploadResponse.text();
          // Try to parse as JSON for better error details
          try {
            errorDetail = JSON.parse(errorText);
          } catch {
            // Not JSON, use as-is
          }
        } catch {
          errorText = `HTTP ${uploadResponse.status} ${uploadResponse.statusText}`;
        }
        
        console.error('Upload endpoint error:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorText,
          errorDetail,
          url: `${this.baseUrl}/upload`,
          fileSize: file.size,
          fileName: file.name,
          fileType: file.type,
        });
        
        // Provide user-friendly error message
        let userMessage = `File upload failed (${uploadResponse.status})`;
        if (errorDetail?.detail) {
          // Handle both string and object detail formats
          const detailMessage = typeof errorDetail.detail === 'string' 
            ? errorDetail.detail 
            : errorDetail.detail.message || JSON.stringify(errorDetail.detail);
          
          userMessage = `Upload error: ${detailMessage}`;
          
          // Check for specific backend errors and provide user-friendly messages
          if (detailMessage.includes('bit_length')) {
            userMessage = 'File upload error: Backend processing issue. Please try again or contact support.';
          } else if (detailMessage.includes('PDF contains JavaScript') || 
                     detailMessage.includes('JavaScript - potential security risk') ||
                     detailMessage.includes('script tag detected') ||
                     detailMessage.includes('JavaScript protocol detected')) {
            userMessage = 'This PDF file contains JavaScript which is not allowed for security reasons. Please use a different PDF file or convert your document to a simpler PDF format without interactive features.';
          } else if (detailMessage.includes('unexpected keyword argument') && 
                     detailMessage.includes('media_type')) {
            userMessage = 'File upload error: Backend configuration issue. Please contact support.';
          }
        } else if (errorText) {
          // Try to parse errorText if it's a JSON string
          try {
            const parsedError = JSON.parse(errorText);
            if (parsedError.detail) {
              const detailMsg = typeof parsedError.detail === 'string' 
                ? parsedError.detail 
                : parsedError.detail.message || JSON.stringify(parsedError.detail);
              
            if (detailMsg.includes('PDF contains JavaScript') || 
                detailMsg.includes('JavaScript - potential security risk') ||
                detailMsg.includes('script tag detected') ||
                detailMsg.includes('JavaScript protocol detected')) {
              userMessage = 'This PDF file contains JavaScript which is not allowed for security reasons. Please use a different PDF file or convert your document to a simpler PDF format without interactive features.';
            } else if (detailMsg.includes('unexpected keyword argument') && 
                       detailMsg.includes('media_type')) {
              userMessage = 'File upload error: Backend configuration issue. Please contact support.';
            } else {
              userMessage = `Upload error: ${detailMsg}`;
            }
            } else {
              userMessage = `Upload error: ${errorText}`;
            }
          } catch {
            // Not JSON, check if it contains JavaScript validation error
            if (errorText.includes('PDF contains JavaScript') || 
                errorText.includes('JavaScript - potential security risk') ||
                errorText.includes('script tag detected') ||
                errorText.includes('JavaScript protocol detected')) {
              userMessage = 'This PDF file contains JavaScript which is not allowed for security reasons. Please use a different PDF file or convert your document to a simpler PDF format without interactive features.';
            } else if (errorText.includes('unexpected keyword argument') && 
                       errorText.includes('media_type')) {
              userMessage = 'File upload error: Backend configuration issue. Please contact support.';
            } else {
              userMessage = `Upload error: ${errorText}`;
            }
          }
        }
        
        throw new Error(userMessage);
      }

      let uploadResult: FileUploadResponse;
      try {
        uploadResult = await uploadResponse.json();
      } catch (parseError) {
        console.error('Failed to parse upload response:', parseError);
        throw new Error('Failed to parse upload response from server');
      }

      // Log file upload activity
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('upload', 'document', {
          resourceId: uploadResult.file_id,
          resourceName: file.name,
          description: `Uploaded document: ${file.name} (${documentType})`,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            documentType,
            fileId: uploadResult.file_id,
          },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }

      // Then send the chat message with file_id
      if (ws.readyState === WebSocket.OPEN) {
        this.sendUserQuery(ws, message, [uploadResult.file_id]);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', () => {
          this.sendUserQuery(ws, message, [uploadResult.file_id]);
        }, { once: true });
      }

      return uploadResult;
    } catch (error: any) {
      console.error('Upload and chat failed:', error);
      throw new Error(`Failed to upload and chat: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files and send a chat message
   * 
   * @param ws - WebSocket connection from createChatConnection
   * @param message - Chat message to send
   * @param files - Array of files to upload
   * @param documentTypes - Array of document types corresponding to files
   * @returns Promise with batch upload results
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('user_chatbot');
   * await bloxAIClient.uploadMultipleAndChat(
   *   ws,
   *   'Review these documents',
   *   [file1, file2],
   *   ['Qatar_national_id', 'Bank_statements']
   * );
   */
  async uploadMultipleAndChat(
    ws: WebSocket,
    message: string,
    files: File[],
    documentTypes: string[]
  ): Promise<BatchUploadResponse> {
    try {
      if (files.length !== documentTypes.length) {
        throw new Error('Number of files must match number of document types');
      }

      // Upload files using batch endpoint
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      documentTypes.forEach(type => formData.append('document_types', type));
      // Ensure file sizes are sent as integers (not floats) to avoid backend errors
      files.forEach((file, index) => {
        formData.append(`file_size_${index}`, Math.floor(file.size).toString());
      });

      const batchResponse = await fetch(`${this.baseUrl}/batch/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!batchResponse.ok) {
        let errorText: string;
        let errorDetail: any = null;
        try {
          errorText = await batchResponse.text();
          // Try to parse as JSON for better error details
          try {
            errorDetail = JSON.parse(errorText);
          } catch {
            // Not JSON, use as-is
          }
        } catch {
          errorText = `HTTP ${batchResponse.status} ${batchResponse.statusText}`;
        }
        console.error('Batch upload endpoint error:', {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          errorText,
          errorDetail,
          url: `${this.baseUrl}/batch/upload`,
        });
        
        // Provide user-friendly error message
        let userMessage = `Batch upload failed (${batchResponse.status})`;
        if (errorDetail?.detail) {
          // Handle both string and object detail formats
          const detailMessage = typeof errorDetail.detail === 'string' 
            ? errorDetail.detail 
            : errorDetail.detail.message || JSON.stringify(errorDetail.detail);
          
          userMessage = `Upload error: ${detailMessage}`;
          
          // Check for specific backend errors and provide user-friendly messages
          if (detailMessage.includes('PDF contains JavaScript') || 
              detailMessage.includes('JavaScript - potential security risk') ||
              detailMessage.includes('script tag detected') ||
              detailMessage.includes('JavaScript protocol detected')) {
            userMessage = 'One or more PDF files contain JavaScript which is not allowed for security reasons. Please use different PDF files or convert your documents to simpler PDF formats without interactive features.';
          } else if (detailMessage.includes('unexpected keyword argument') && 
                     detailMessage.includes('media_type')) {
            userMessage = 'File upload error: Backend configuration issue. Please contact support.';
          }
        } else if (errorText) {
          // Try to parse errorText if it's a JSON string
          try {
            const parsedError = JSON.parse(errorText);
            if (parsedError.detail) {
              const detailMsg = typeof parsedError.detail === 'string' 
                ? parsedError.detail 
                : parsedError.detail.message || JSON.stringify(parsedError.detail);
              
              if (detailMsg.includes('PDF contains JavaScript') || 
                  detailMsg.includes('JavaScript - potential security risk') ||
                  detailMsg.includes('script tag detected') ||
                  detailMsg.includes('JavaScript protocol detected')) {
                userMessage = 'One or more PDF files contain JavaScript which is not allowed for security reasons. Please use different PDF files or convert your documents to simpler PDF formats without interactive features.';
              } else if (detailMsg.includes('unexpected keyword argument') && 
                         detailMsg.includes('media_type')) {
                userMessage = 'File upload error: Backend configuration issue. Please contact support.';
              } else {
                userMessage = `Upload error: ${detailMsg}`;
              }
            } else {
              userMessage = `Upload error: ${errorText}`;
            }
          } catch {
            // Not JSON, check if it contains JavaScript validation error
            if (errorText.includes('PDF contains JavaScript') || 
                errorText.includes('JavaScript - potential security risk') ||
                errorText.includes('script tag detected') ||
                errorText.includes('JavaScript protocol detected')) {
              userMessage = 'One or more PDF files contain JavaScript which is not allowed for security reasons. Please use different PDF files or convert your documents to simpler PDF formats without interactive features.';
            } else if (errorText.includes('unexpected keyword argument') && 
                       errorText.includes('media_type')) {
              userMessage = 'File upload error: Backend configuration issue. Please contact support.';
            } else {
              userMessage = `Upload error: ${errorText}`;
            }
          }
        }
        
        throw new Error(userMessage);
      }

      let batchResult: BatchUploadResponse;
      try {
        batchResult = await batchResponse.json();
      } catch (parseError) {
        console.error('Failed to parse batch upload response:', parseError);
        throw new Error('Failed to parse batch upload response from server');
      }

      // Extract file IDs from batch result and send chat message with file IDs
      const fileIds = batchResult.files
        ?.filter(f => f.status === 'processed' && f.file_id)
        .map(f => f.file_id!) || [];

      // Send chat message with file IDs
      if (ws.readyState === WebSocket.OPEN) {
        this.sendUserQuery(ws, message, fileIds);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', () => {
          this.sendUserQuery(ws, message, fileIds);
        }, { once: true });
      }

      return batchResult;
    } catch (error: any) {
      console.error('Batch upload and chat failed:', error);
      throw new Error(`Failed to upload multiple files and chat: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a WebSocket connection and send an initial message
   * 
   * @param sessionType - 'user_chatbot' or 'admin_chatbot'
   * @param initialMessage - Initial message to send
   * @returns WebSocket connection
   * 
   * @example
   * const ws = await bloxAIClient.createChatAndSend('user_chatbot', 'Hello, I need help');
   */
  createChatAndSend(
    sessionType: 'user_chatbot' | 'admin_chatbot',
    initialMessage: string
  ): WebSocket {
    const ws = this.createChatConnection(sessionType);
    
    if (ws.readyState === WebSocket.OPEN) {
      if (sessionType === 'user_chatbot') {
        this.sendUserQuery(ws, initialMessage);
      }
    } else {
      ws.addEventListener('open', () => {
        if (sessionType === 'user_chatbot') {
          this.sendUserQuery(ws, initialMessage);
        }
      }, { once: true });
    }
    
    return ws;
  }

  /**
   * Get chat history for a session
   * 
   * @param sessionId - Session ID to retrieve history for
   * @param authToken - Optional authentication token
   * @returns Promise with chat history
   * 
   * @example
   * const history = await bloxAIClient.getChatHistory('session-123', 'auth-token');
   */
  async getChatHistory(
    sessionId: string,
    authToken?: string
  ): Promise<ChatHistory> {
    try {
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/chat/history/${sessionId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get chat history: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Get chat history failed:', error);
      throw new Error(`Failed to get chat history: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Upload a single file to the API
   * 
   * @param file - File to upload
   * @param documentType - Type of document
   * @returns Promise with upload result
   */
  async uploadFile(
    file: File,
    documentType: string
  ): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorText: string;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        console.error('Upload endpoint error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url: `${this.baseUrl}/upload`,
        });
        throw new Error(`File upload failed (${response.status}): ${errorText}`);
      }

      let uploadResult: FileUploadResponse;
      try {
        uploadResult = await response.json();
      } catch (parseError) {
        console.error('Failed to parse upload response:', parseError);
        throw new Error('Failed to parse upload response from server');
      }

      return uploadResult;
    } catch (error: any) {
      console.error('File upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Batch upload multiple files
   * 
   * @param files - Array of files to upload
   * @param documentTypes - Array of document types
   * @returns Promise with batch upload results
   */
  async batchUpload(
    files: File[],
    documentTypes: string[]
  ): Promise<BatchUploadResponse> {
    try {
      if (files.length !== documentTypes.length) {
        throw new Error('Number of files must match number of document types');
      }

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      documentTypes.forEach(type => formData.append('document_types', type));

      const response = await fetch(`${this.baseUrl}/batch/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch upload failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Batch upload failed:', error);
      throw new Error(`Failed to batch upload: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Convert speech to text using the voice API
   * 
   * @param audioFile - Audio file to convert
   * @param language - Language code (e.g., 'en-US')
   * @returns Promise with transcribed text
   */
  async speechToText(
    audioFile: File,
    language: string = 'en-US'
  ): Promise<VoiceResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('language', language);

      const response = await fetch(`${this.baseUrl}/voice/speech-to-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Speech to text failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Speech to text failed:', error);
      throw new Error(`Failed to convert speech to text: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Convert text to speech using the voice API
   * 
   * @param text - Text to convert to speech
   * @param language - Language code (e.g., 'en')
   * @returns Promise with audio blob URL
   */
  async textToSpeech(
    text: string,
    language: string = 'en'
  ): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', language);

      const response = await fetch(`${this.baseUrl}/voice/text-to-speech`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Text to speech failed: ${response.status} ${errorText}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Text to speech failed:', error);
      throw new Error(`Failed to convert text to speech: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check voice processing status
   * 
   * @returns Promise with voice status
   */
  async getVoiceStatus(): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/voice/status`);
      if (!response.ok) {
        return { available: false, message: 'Voice processing not available' };
      }
      return await response.json();
    } catch (error: any) {
      return { available: false, message: error.message };
    }
  }

  /**
   * Maps AI document types to application document categories
   * 
   * @param aiType - Document type from AI API (e.g., "Qatar_national_id")
   * @returns Mapped category ID for the application system
   */
  private static mapDocumentType(aiType: string): string {
    const mapping: Record<string, string> = {
      // Map to admin-expected categories: 'id', 'bank', 'salary', 'passport', 'license', 'other'
      'Qatar_national_id': 'id',
      'qatar_national_id': 'id',
      'Qatar_ID': 'id',
      'qatar_id': 'id',
      'national_id': 'id',
      'id': 'id',
      'Bank_statements': 'bank',
      'bank_statements': 'bank',
      'Bank_statement': 'bank',
      'bank_statement': 'bank',
      'bank': 'bank',
      'Salary_certificate': 'salary',
      'Salary_certificates': 'salary',
      'salary_certificate': 'salary',
      'salary_certificates': 'salary',
      'salary': 'salary',
      'Passport': 'passport',
      'passport': 'passport',
      'Driving_license': 'license',
      'driving_license': 'license',
      'license': 'license',
    };
    
    // Return mapped value or use lowercase version, or default to 'other'
    return mapping[aiType] || mapping[aiType.toLowerCase()] || 'other';
  }

  /**
   * Validates input data for AI application submission
   * 
   * @param applicationData - Application data to validate
   * @throws {AIApplicationError} If validation fails
   */
  private static validateApplicationData(applicationData: AIApplicationInput): void {
    // Validate customer info
    if (!applicationData.customerInfo) {
      throw new AIApplicationError('Customer information is required', 'MISSING_FIELD');
    }

    const { customerInfo } = applicationData;

    // Validate required customer fields
    if (!customerInfo.email || typeof customerInfo.email !== 'string' || !customerInfo.email.trim()) {
      throw new AIApplicationError('Customer email is required', 'MISSING_FIELD');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      throw new AIApplicationError('Invalid email format', 'INVALID_DATA');
    }

    if (!customerInfo.phone || typeof customerInfo.phone !== 'string' || !customerInfo.phone.trim()) {
      throw new AIApplicationError('Customer phone is required', 'MISSING_FIELD');
    }

    // Validate vehicle ID
    if (!applicationData.vehicleId || typeof applicationData.vehicleId !== 'string' || !applicationData.vehicleId.trim()) {
      throw new AIApplicationError('Vehicle ID is required', 'MISSING_FIELD');
    }

    // Validate loan amount
    if (typeof applicationData.loanAmount !== 'number' || applicationData.loanAmount < 0) {
      throw new AIApplicationError('Loan amount must be a non-negative number', 'INVALID_DATA');
    }

    // Validate down payment
    if (typeof applicationData.downPayment !== 'number' || applicationData.downPayment < 0) {
      throw new AIApplicationError('Down payment must be a non-negative number', 'INVALID_DATA');
    }

    // Validate loan amount is greater than down payment (optional check)
    if (applicationData.loanAmount < applicationData.downPayment) {
      throw new AIApplicationError('Loan amount must be greater than or equal to down payment', 'INVALID_DATA');
    }
  }

  /**
   * Formats application data collected by AI for submission to Supabase.
   * 
   * This method validates, formats, and prepares application data from the AI chatbot
   * for creation in Supabase. It handles:
   * - Input validation
   * - Document type mapping
   * - Document URL construction from file_ids
   * - Customer info formatting with AI origin markers
   * - Status and origin assignment
   * 
   * @param applicationData - Application data collected by AI
   * @param baseUrl - Optional base URL for constructing document URLs (defaults to instance baseUrl)
   * @returns Formatted application data ready for Supabase submission
   * @throws {AIApplicationError} If validation fails or data is invalid
   * 
   * @example
   * ```typescript
   * import { BloxAIClient } from '@shared/services';
   * 
   * try {
   *   const formattedData = BloxAIClient.createApplicationFromAIData({
   *     customerInfo: {
   *       firstName: "John",
   *       lastName: "Doe",
   *       email: "john@example.com",
   *       phone: "+97412345678",
   *     },
   *     vehicleId: "vehicle-uuid",
   *     loanAmount: 50000,
   *     downPayment: 10000,
   *     documents: [
   *       { file_id: "file-uuid", document_type: "Qatar_national_id" }
   *     ]
   *   });
   *   
   *   // Use with supabaseApiService.createApplication()
   *   const result = await supabaseApiService.createApplication(formattedData);
   * } catch (error) {
   *   if (error instanceof AIApplicationError) {
   *     console.error('Validation error:', error.message, error.code);
   *   }
   * }
   * ```
   */
  static createApplicationFromAIData(
    applicationData: AIApplicationInput,
    baseUrl?: string
  ): FormattedAIApplication {
    // Validate input data
    this.validateApplicationData(applicationData);

    const customerInfo = applicationData.customerInfo;
    const firstName = customerInfo.firstName || '';
    const lastName = customerInfo.lastName || '';

    // Get base URL for document URLs (use provided, instance baseUrl, or default)
    const documentBaseUrl = baseUrl || 
      (typeof window !== 'undefined' && (window as any).__BLOX_AI_URL__) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BLOX_AI_URL) ||
      'http://localhost:8000';

    // Mark origin as AI in customer_info
    const customerInfoWithOrigin = {
      ...customerInfo,
      _origin: 'ai' as const,
      _createdByAI: true as const,
    };

    // Convert documents format with proper mapping and URL construction
    const timestamp = Date.now();
    const documents = applicationData.documents?.map((doc, index) => {
      // Generate unique document ID (timestamp + index + random to prevent collisions)
      const uniqueId = `DOC${timestamp}-${index}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Map document type to category
      const category = this.mapDocumentType(doc.document_type);
      
      // Construct URL from file_id if URL not provided
      let documentUrl = doc.url || '';
      if (!documentUrl && doc.file_id) {
        documentUrl = `${documentBaseUrl}/files/${doc.file_id}`;
      }

      // If category is already provided, map it to admin format; otherwise use mapped category
      let finalCategory = category;
      if (doc.category) {
        // Map provided category to admin format if needed
        const categoryMap: Record<string, string> = {
          'qatar-id': 'id',
          'national-id': 'id',
          'bank-statement': 'bank',
          'salary-certificate': 'salary',
          'driving-license': 'license',
          'additional': 'other',
        };
        finalCategory = categoryMap[doc.category] || doc.category;
      }
      
      return {
        id: uniqueId,
        name: doc.name || `${doc.document_type} document`,
        type: 'application/pdf', // Default type, can be enhanced to detect from file_id
        category: finalCategory,
        url: documentUrl,
        uploadedAt: new Date().toISOString(),
      };
    }) || [];

    return {
      customerName: `${firstName} ${lastName}`.trim() || 'Unknown Customer',
      customerEmail: customerInfo.email!.trim(),
      customerPhone: customerInfo.phone!.trim(),
      vehicleId: applicationData.vehicleId,
      offerId: applicationData.offerId,
      status: 'under_review',
      loanAmount: applicationData.loanAmount,
      downPayment: applicationData.downPayment,
      customerInfo: customerInfoWithOrigin,
      installmentPlan: applicationData.installmentPlan,
      documents: documents,
      origin: 'ai',
    };
  }

}

// Export singleton instance
export const bloxAIClient = new BloxAIClient();

// Also export the class for custom instances
export { BloxAIClient };

// Export types
export type { 
  AssessmentResponse, 
  UserData, 
  WebSocketMessage, 
  FileUploadResponse, 
  BatchUploadResponse, 
  ChatHistory, 
  VoiceResponse
};
