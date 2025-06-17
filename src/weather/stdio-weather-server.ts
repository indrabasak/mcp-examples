import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WeatherServer } from './weather-server.js';

export class StdioWeatherServer extends WeatherServer {
  private transport!: StdioServerTransport;

  public async connect() {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.log('Weather MCP Server started');
  }

  public async close() {
    await this.transport.close();
    await this.server.close();
  }
}

async function main() {
  const server = new StdioWeatherServer();
  await server.connect();
  console.error('Weather Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
