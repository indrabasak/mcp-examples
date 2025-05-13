import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class EchoClient {
  private readonly transport: StdioClientTransport;
  private client: Client;

  constructor() {
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['./build/echo/echo-server.js']
    });

    this.client = new Client({
      name: 'Echo Client',
      version: '1.0.0'
    });
  }

  public async connect() {
    await this.client.connect(this.transport);
  }

  public async listResources(): Promise<any> {
    return await this.client.listResources();
  }

  public async callTool(toolName: string, args: any): Promise<any> {
    return await this.client.callTool({
      name: toolName,
      arguments: {
        ...args
      }
    });
  }
}

async function main() {
  const client = new EchoClient();
  await client.connect();
  console.error('Echo client running');
  const resources = await client.listResources();
  console.log('Resources:', resources);
  const toolResult = await client.callTool('echo', { message: 'Hello, World!' });
  console.log('Tool Result:', toolResult);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
