import { HelloServer } from './hello-server.js';
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { randomUUID } from 'node:crypto';

export class StreamableHelloServer extends HelloServer {
  private app!: express.Express;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport };
  private port = 3000;

  public constructor() {
    super();
    this.app = express();
    this.app.use(express.json());
    // Map to store transports by session ID
    this.transports = {};
    this.app.post('/mcp', this.postHandler.bind(this));
    this.addGet();
    this.addDelete();
    this.addListeners();
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

  private addGet() {
    // Handle GET requests for server-to-client notifications via SSE
    this.app.get('/mcp', async (req: express.Request, res: express.Response) => {
      console.log(`GET Request received: ${req.method} ${req.url}`);

      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          console.log(`Invalid session ID in GET request: ${sessionId}`);
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

        // Set up connection close monitoring
        res.on('close', () => {
          console.log(`SSE connection closed for session ${sessionId}`);
        });

        console.log(`Starting SSE transport.handleRequest for session ${sessionId}...`);
        const startTime = Date.now();
        await transport.handleRequest(req, res);
        const duration = Date.now() - startTime;
        console.log(`SSE stream setup completed in ${duration}ms for session: ${sessionId}`);
      } catch (error) {
        console.error('Error handling GET request:', error);
        if (!res.headersSent) {
          res.status(500).send('Internal server error');
        }
      }
    });
  }

  private addDelete() {
    // Handle DELETE requests for session termination
    this.app.delete('/mcp', async (req: express.Request, res: express.Response) => {
      console.log(`DELETE Request received: ${req.method} ${req.url}`);
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          console.log(`Invalid session ID in DELETE request: ${sessionId}`);
          res.status(400).send('Invalid or missing session ID');
          return;
        }

        console.log(`Received session termination request for session ${sessionId}`);
        const transport = this.transports[sessionId];

        // Capture response for logging
        const originalSend = res.send;
        res.send = function (body) {
          console.log(`DELETE response being sent:`, body);
          return originalSend.call(this, body);
        };

        console.log(`Processing session termination...`);
        const startTime = Date.now();
        await transport.handleRequest(req, res);
        const duration = Date.now() - startTime;
        console.log(`Session termination completed in ${duration}ms for session: ${sessionId}`);

        // Check if transport was actually closed
        setTimeout(() => {
          if (this.transports[sessionId]) {
            console.log(
              `Note: Transport for session ${sessionId} still exists after DELETE request`
            );
          } else {
            console.log(
              `Transport for session ${sessionId} successfully removed after DELETE request`
            );
          }
        }, 100);
      } catch (error) {
        console.error('Error handling DELETE request:', error);
        if (!res.headersSent) {
          res.status(500).send('Error processing session termination');
        }
      }
    });
  }

  private addListeners() {
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
}

async function main() {
  new StreamableHelloServer();
  console.log('Streamable Hello Server is running.');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
