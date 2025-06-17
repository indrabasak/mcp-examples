import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { WeatherServer } from './weather-server.js';

export class StreamableWeatherServer extends WeatherServer {
  public async connect() {
    // this.transport = new StreamableHTTPServerTransport({
    //   sessionIdGenerator: undefined
    // });
    // await this.server.connect(this.transport);

    const app = express();
    app.use(express.json());

    app.post('/mcp', async (req: Request, res: Response) => {
      // In stateless mode, create a new instance of transport and server for each request
      // to ensure complete isolation. A single instance would cause request ID collisions
      // when multiple clients connect concurrently.
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined
        });

        res.on('close', () => {
          console.log('Request closed');
          transport.close();
          this.server.close();
        });

        await this.server.connect(transport);
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
    });

    app.get('/mcp', async (req: Request, res: Response) => {
      console.log('Received GET MCP request');
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined
        });

        res.on('close', () => {
          console.log('Request closed');
          transport.close();
          this.server.close();
        });

        // console.log(req);
        await this.server.connect(transport);
        console.log('Handling GET MCP request - 1');
        await transport.handleRequest(req, res);
        console.log(res);
        console.log('Handling GET MCP request - 2');
        // res.writeHead(405).end(
        //   JSON.stringify({
        //     jsonrpc: '2.0',
        //     error: {
        //       code: -32000,
        //       message: 'Method not allowed.'
        //     },
        //     id: null
        //   })
        // );
      } catch (error) {
        console.error('Error handling GET MCP request:', error);
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
    });

    app.delete('/mcp', async (req: Request, res: Response) => {
      console.log('Received DELETE MCP request');
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.'
          },
          id: null
        })
      );
    });

    // Start the server
    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
    });

    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
    console.log('MCP Stateless Streamable Weather MCP Server started');
  }

  public async close() {
    await this.server.close();
  }

  public async handleRequest(req: Request, res: Response) {
  }
}

async function main() {
  const server = new StreamableWeatherServer();
  await server.connect();
  console.error('Weather Server running on SSE');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
