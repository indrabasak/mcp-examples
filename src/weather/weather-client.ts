import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class WeatherClient {
  private readonly transport: StdioClientTransport;
  private client: Client;

  constructor() {
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['./build/weather/weather-server.js']
    });

    this.client = new Client({
      name: 'Weather Client',
      version: '1.0.0'
    });
  }

  public async connect() {
    await this.client.connect(this.transport);
  }

  public getServerCapabilities() {
    return this.client.getServerCapabilities();
  }

  public async listResources(): Promise<any> {
    return await this.client.listResources();
  }

  public async listTools(): Promise<any> {
    return await this.client.listTools();
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
  const client = new WeatherClient();
  await client.connect();
  console.error('Weather client running');
  // const resources = await client.listResources();
  // console.log('Resources:', resources);
  const capabilities = await client.getServerCapabilities();
  console.log('Server Capabilities:', capabilities);
  const tools = await client.listTools();
  for (const tool of tools.tools) {
    console.log('Tool:', tool.name);
    console.log('Description:', tool.description);
    console.log('Input Schema:', tool.inputSchema);
  }

  const toolResult = await client.callTool('get-alerts', { state: 'OR' });
  console.log('Tool Result:', toolResult);

  const toolResult2 = await client.callTool('get-forecast', {
    latitude: 45.3556,
    longitude: -122.6059
  });
  console.log('Forecast Result:', toolResult2);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
