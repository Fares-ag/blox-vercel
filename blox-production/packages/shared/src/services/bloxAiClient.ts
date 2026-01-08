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
   * 
   * @example
   * const ws = bloxAIClient.createChatConnection('user_chatbot');
   * bloxAIClient.sendUserQuery(ws, 'What are the eligibility requirements?');
   */
  sendUserQuery(ws: WebSocket, query: string): void {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => {
        this.sendUserQuery(ws, query);
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
        session_type: 'user_chatbot',
        user_query: query,
      })
    );
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
}

// Export singleton instance
export const bloxAIClient = new BloxAIClient();

// Also export the class for custom instances
export { BloxAIClient };

// Export types
export type { AssessmentResponse, UserData, WebSocketMessage };
