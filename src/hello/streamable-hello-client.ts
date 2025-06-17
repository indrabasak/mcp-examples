import { AzureStreamableClient } from '../util/azure-streamable-client.js';

export class StreamableHelloClient extends AzureStreamableClient {
  constructor() {
    super('Streamable Hello Client', '1.0.0', 'http://localhost:3000/mcp');
  }
}

async function main() {
  const client = new StreamableHelloClient();
  await client.connect();
  console.log('Streamable Hello Client is running.');
  await client.listTools();
  await client.callTool('greet', { name: 'Indra' });
  await client.callTool('multi-greet', { name: 'Indra' });
  await client.quit();
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
