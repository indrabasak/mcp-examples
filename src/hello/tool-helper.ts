import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export class ToolHelper {
  private server: Server;
  private tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }> = [];
  constructor(server: Server) {
    this.server = server;
    this.tools.push({
      name: 'greet',
      description: 'A simple greeting tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    });

    this.tools.push({
      name: 'multi-greet',
      description: 'A tool that sends different greetings with delays between them',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    });
  }

  public getTools() {
    console.log('------------------ Tools requested');
    console.log(this.tools);
    return {
      tools: this.tools
    };
  }

  public async handleToolCall(name: string, args: any) {
    try {
      switch (name) {
        case 'greet':
          return await this.handleGreet(args);
        case 'multi-greet':
          return await this.handleMultiGreet(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return this.formatErrorResponse(error);
    }
  }

  private async handleGreet(
    args: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const { name } = args;
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

  private async handleMultiGreet(args: any) {
    const { name, sendNotification } = args;
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

  private formatErrorResponse(error: Error | string): {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  } {
    const message = error instanceof Error ? error.message : error;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2)
        }
      ],
      isError: true
    };
  }
}
