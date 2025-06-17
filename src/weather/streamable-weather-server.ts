import { Request, Response } from 'express';
import { WeatherServer } from './weather-server.js';
import { StreamableServerUtil } from '../util/streamable-server-util.js';

export class StreamableWeatherServer extends WeatherServer {
  private util: StreamableServerUtil;

  public constructor() {
    super();
    this.util = new StreamableServerUtil(this.server, 3000);
  }

  public async connect() {
    this.util.connect();
  }

  public async close() {
    await this.server.close();
  }

  public async handleRequest(req: Request, res: Response) {}
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
