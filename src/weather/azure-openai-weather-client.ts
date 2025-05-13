import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

export class AzureOpenaiWeatherClient {
  private model: AzureChatOpenAI;
  private readonly transport: StdioClientTransport;
  private readonly client: Client;
  private agent: any;

  constructor() {
    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    this.model = new AzureChatOpenAI({
      azureADTokenProvider,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      temperature: 0
    });

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

    // Get tools with custom configuration
    const tools = await loadMcpTools('Weather App', this.client, {
      // Whether to throw errors if a tool fails to load (optional, default: true)
      throwOnLoadError: true,
      // Whether to prefix tool names with the server name (optional, default: false)
      prefixToolNameWithServerName: false,
      // Optional additional prefix for tool names (optional, default: "")
      additionalToolNamePrefix: ''
    });

    this.agent = createReactAgent({ llm: this.model, tools });
  }

  public async invoke(message: string) {
    const agentResponse = await this.agent.invoke({
      messages: [{ role: 'user', content: message }]
    });
    // console.log(agentResponse);

    return agentResponse;
  }
}

async function main() {
  const client = new AzureOpenaiWeatherClient();
  await client.connect();
  console.error('Azure OpenAI Weather client running');
  let result = await client.invoke('What is the weather like in Seattle?');
  let finalMessage = result.messages[result.messages.length - 1];
  console.log(`\nResult: ${finalMessage.content}`);

  result = await client.invoke('What is the weather forecast for Oregon?');
  finalMessage = result.messages[result.messages.length - 1];
  console.log(`\nResult: ${finalMessage.content}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});