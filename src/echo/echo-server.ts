import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class EchoServer {
  private server: McpServer;
  constructor() {
    this.server = new McpServer({
      name: 'Echo App',
      version: '1.0.0',
      capabilities: {
        resources: {},
        tools: {}
      }
    });

    this.addResource();
    this.addTool();
    this.addPrompt();
  }

  private addResource() {
    this.server.resource(
      'echo',
      new ResourceTemplate('echo://{message}', { list: undefined }),
      async (uri, { message }) => ({
        contents: [
          {
            uri: uri.href,
            text: `Resource echo: ${message}`
          }
        ]
      })
    );
  }

  private addTool() {
    this.server.tool('echo', { message: z.string() }, async ({ message }) => ({
      content: [{ type: 'text', text: `Tool echo: ${message}` }]
    }));
  }

  private addPrompt() {
    this.server.prompt('echo', { message: z.string() }, ({ message }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please process this message: ${message}`
          }
        }
      ]
    }));
  }

  public async connect() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Echo MCP Server started');
  }
}

async function main() {
  const server = new EchoServer();
  await server.connect();
  console.error('Echo Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
