import express from 'express';
import { Request, Response } from 'express';
import { StreamableWeatherServer } from './streamable-weather-server.js';

export class HttpWeatherServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.addPost();
    this.addGet();
    this.addDelete();
  }

  public async start(port: number) {
    this.app.listen(port, () => {
      console.log(`MCP Stateless Streamable HTTP Server listening on port ${port}`);
    });
  }

  /**
   * Adds a POST endpoint to the server for handling MCP requests.
   * @private
   */
  private addPost() {
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const server = new StreamableWeatherServer();

        res.on('close', () => {
          console.log('Request closed');
          server.close();
        });
        await server.connect();
        await server.handleRequest(req, res);
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
  }

  private addGet() {
    this.app.get('/mcp', async (req: Request, res: Response) => {
      console.log('Received GET MCP request');
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
  }

  private addDelete() {
    this.app.delete('/mcp', async (req: Request, res: Response) => {
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
  }
}

async function main() {
  const server = new HttpWeatherServer();
  await server.start(3000);
  console.error('Http Weather Server running.');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
