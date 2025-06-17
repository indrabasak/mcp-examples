import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class HelloServer {
  protected server: McpServer;
  constructor() {
    this.server = new McpServer(
      {
        name: 'Hello Server',
        version: '1.0.0'
      },
      { capabilities: { logging: {} } }
    );
    this.addTools();
  }

  private addTools() {
    // Register a simple tool that returns a greeting
    this.server.tool(
      'greet',
      'A simple greeting tool',
      {
        name: z.string().describe('Name to greet')
      },
      async ({ name }): Promise<CallToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: `Hello, ${name}!`
            }
          ]
        };
      }
    );

    // Register a tool that sends multiple greetings with notifications (with annotations)
    this.server.tool(
      'multi-greet',
      'A tool that sends different greetings with delays between them',
      {
        name: z.string().describe('Name to greet')
      },
      {
        title: 'Multiple Greeting Tool',
        readOnlyHint: true,
        openWorldHint: false
      },
      async ({ name }, { sendNotification }): Promise<CallToolResult> => {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        await sendNotification({
          method: 'notifications/message',
          params: { level: 'debug', data: `Starting multi-greet for ${name}` }
        });

        await sleep(1000); // Wait 1 second before first greeting

        await sendNotification({
          method: 'notifications/message',
          params: { level: 'info', data: `Sending first greeting to ${name}` }
        });

        await sleep(1000); // Wait another second before second greeting

        await sendNotification({
          method: 'notifications/message',
          params: { level: 'info', data: `Sending second greeting to ${name}` }
        });

        return {
          content: [
            {
              type: 'text',
              text: `Good morning, ${name}!`
            }
          ]
        };
      }
    );
  }
}
