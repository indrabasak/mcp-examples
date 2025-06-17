import { AzureStreamableClient } from '../util/azure-streamable-client.js';

export class AzureStreamableWeatherClient extends AzureStreamableClient {
  constructor() {
    super('Streamable Weather Client', '1.0.0', 'http://localhost:3000/mcp');
  }
}

async function main() {
  const client = new AzureStreamableWeatherClient();
  await client.connect();
  console.error('Azure OpenAI Streamable Weather client running');
  await client.listTools();
  await client.callTool('get-alerts', { state: 'OR' });
  let result = await client.invoke('What is the weather like in Seattle?');
  let finalMessage = result.messages[result.messages.length - 1];
  console.log(`\nResult: ${finalMessage.content}`);

  result = await client.invoke('What is the weather forecast for Oregon?');
  finalMessage = result.messages[result.messages.length - 1];
  console.log(`\nResult: ${finalMessage.content}`);

  await client.quit();
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
