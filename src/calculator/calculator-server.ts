import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class CalculatorServer {
  private server: McpServer;
  constructor() {
    this.server = new McpServer({
      name: 'Calculator App',
      version: '1.0.0'
    });

    this.addTool();
    this.addResource();
  }

  /**
   * Adds an addition tool to the server.
   */
  private addTool() {
    this.server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
      content: [{ type: 'text', text: String(a + b) }]
    }));
  }

  /**
   * Adds a greeting resource to the server.
   * @private
   */
  private addResource() {
    this.server.resource(
      'greeting',
      new ResourceTemplate('greeting://{name}', { list: undefined }),
      async (uri, { name }) => ({
        contents: [
          {
            uri: uri.href,
            text: `Hello, ${name}!`
          }
        ]
      })
    );
  }

  async connect() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
