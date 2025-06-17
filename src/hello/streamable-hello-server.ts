import { HelloServer } from './hello-server.js';
import { StreamableServer } from '../util/streamable-server.js';

export class StreamableHelloServer extends HelloServer {
  private streamableServer: StreamableServer;

  public constructor() {
    super();
    this.streamableServer = new StreamableServer(this.server, 3000);
  }

  public async connect() {
    this.streamableServer.connect();
  }
}

async function main() {
  const server = new StreamableHelloServer();
  await server.connect();
  console.log('Streamable Hello Server is running.');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
