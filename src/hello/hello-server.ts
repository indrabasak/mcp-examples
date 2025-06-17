// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
// import { ToolHelper } from './tool-helper.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class HelloServer {
  protected server: McpServer;
  // protected server: Server;
  // private toolHelper: ToolHelper;
  constructor() {
    this.server = new McpServer({
      name: 'Hello App',
      version: '1.0.0',
      capabilities: {
        logging: {},
        resources: {},
        tools: {}
      }
    });

    // this.server = new Server(
    //   {
    //     name: 'Hello App',
    //     version: '1.0.0'
    //   },
    //   {
    //     capabilities: {
    //       logging: {},
    //       prompts: {},
    //       resources: {},
    //       tools: {}
    //     }
    //   }
    // );

    // this.toolHelper = new ToolHelper(this.server);
    // this.server.setRequestHandler(ListToolsRequestSchema, async () => {
    //   console.log('List Tools Request Received');
    //   return this.toolHelper.getTools();
    // });
    // this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    //   return await this.toolHelper.handleToolCall(request.params.name, request.params.arguments);
    // });
  }

  private addTools() {
    // this.server.registerTool(
    //   'greet',
    //   {
    //     name: 'Greeting Tool', // Display name for UI
    //     description: 'A simple greeting tool',
    //     inputSchema: {
    //       name: z.string().describe('Name to greet')
    //     }
    //   },
    //   async ({ name }): Promise<CallToolResult> => {
    //     return {
    //       content: [
    //         {
    //           type: 'text',
    //           text: `Hello, ${name}!`
    //         }
    //       ]
    //     };
    //   }
    // );
    this.server.tool(
      'greet',
      'A simple greeting tool',
      {
        name: z.string().describe('Name to greet')
      },
      async ({ name }): Promise<CallToolResult> => {
        console.log(`Tool Called: greet (name=${name})`);
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

    this.server.tool(
      'get-session',
      'gets the session id and context',
      {},
      async (): Promise<CallToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: `session`
            }
          ]
        };
      }
    );

    // Register a tool that sends multiple greetings with notifications
    this.server.tool(
      'multi-greet',
      'A tool that sends different greetings with delays between them',
      {
        name: z.string().describe('Name to greet')
      },
      async ({ name }, { sendNotification }): Promise<CallToolResult> => {
        console.log(`Tool Called: multi-greet (name=${name})`);
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
