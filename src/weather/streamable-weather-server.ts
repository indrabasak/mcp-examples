import { WeatherServer } from './weather-server.js';
import { StreamableServer } from '../util/streamable-server.js';

export class StreamableWeatherServer extends WeatherServer {
  private streamableServer: StreamableServer;

  public constructor() {
    super();
    this.streamableServer = new StreamableServer(this.server, 3000);
  }

  public async connect() {
    this.streamableServer.connect();
  }

  public async close() {
    await this.server.close();
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
