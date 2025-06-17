import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { randomUUID } from 'node:crypto';

export class StreamableServer {
  private server: McpServer;
  private app!: express.Express;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport };
  private port;

  constructor(server: McpServer, port: number) {
    this.server = server;
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.transports = {};
    this.app.post('/mcp', this.postHandler.bind(this));
    this.app.get('/mcp', this.getHandler.bind(this));
    this.app.delete('/mcp', this.deleteHandler.bind(this));
  }

  public connect() {
    const expressServer = this.app.listen(this.port, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${this.port}`);
    });

    // Add server event listeners for better visibility
    expressServer.on('connect', (transport) => {
      console.log(`[Server] Transport connected: ${transport}`);
    });

    expressServer.on('disconnect', (transport) => {
      console.log(`[Server] Transport disconnected: ${transport.sessionId}`);
    });

    expressServer.on('request', (request, transport) => {
      console.log(`[Server] Received request: ${request.method} from transport: ${transport}`);
    });

    expressServer.on('response', (response, transport) => {
      console.log(
        `[Server] Sending response for id: ${response.id} to transport: ${transport.sessionId}`
      );
    });

    expressServer.on('notification', (notification, transport) => {
      console.log(
        `[Server] Sending notification: ${notification.method} to transport: ${transport.sessionId}`
      );
    });

    expressServer.on('error', (error: any, transport: any) => {
      console.error(`[Server] Error with transport ${transport?.sessionId || 'unknown'}:`, error);
    });

    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');

      // Close all active transports to properly clean up resources
      for (const sessionId in this.transports) {
        try {
          console.log(`Closing transport for session ${sessionId}`);
          await this.transports[sessionId].close();
          delete this.transports[sessionId];
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }

      await expressServer.close();
      await this.server.close();
      console.log('Server shutdown complete');
      process.exit(0);
    });
  }

  private async postHandler(req: Request, res: Response) {
    console.log('Received MCP request:', req.body);
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.transports[sessionId]) {
        // Reuse existing transport
        transport = this.transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore, // Enable resumability
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID when session is initialized
            // This avoids race conditions where requests might come in before the session is stored
            console.log(`Session initialized with ID: ${sessionId}`);
            this.transports[sessionId] = transport;
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && this.transports[sid]) {
            console.log(`Transport closed for session ${sid}, removing from transports map`);
            delete this.transports[sid];
          }
        };

        // Connect the transport to the MCP server BEFORE handling the request
        // so responses can flow back through the same transport
        const server = this.server;
        await server.connect(transport);

        await transport.handleRequest(req, res, req.body);
        return; // Already handled
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided'
          },
          id: null
        });
        return;
      }

      // Handle the request with existing transport - no need to reconnect
      // The existing transport is already connected to the server
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  }

  private async getHandler(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.log(`Establishing new SSE stream for session ${sessionId}`);
    }

    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
  }

  private async deleteHandler(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`Received session termination request for session ${sessionId}`);

    try {
      const transport = this.transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  }
}
