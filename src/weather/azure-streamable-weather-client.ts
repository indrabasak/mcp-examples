import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureChatOpenAI } from '@langchain/openai';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import 'dotenv/config';
import {
  CallToolRequest,
  CallToolResultSchema,
  ListResourcesResultSchema,
  LoggingMessageNotificationSchema,
  ResourceListChangedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

export class AzureStreamableWeatherClient {
  private model: AzureChatOpenAI;
  private readonly transport: StreamableHTTPClientTransport;
  private readonly client: Client;
  private sessionId: string | undefined = undefined;
  private notificationCount: number = 0;
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

    this.transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'), {
      sessionId: this.sessionId
    });

    this.client = new Client({
      name: 'Weather Client',
      version: '1.0.0'
    });

    this.client.onerror = (error) => {
      console.error('\x1b[31mClient error:', error, '\x1b[0m');
    };

    // Set up notification handlers
    this.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      this.notificationCount++;
      console.log(
        `\nNotification #${this.notificationCount}: ${notification.params.level} - ${notification.params.data}`
      );
      // Re-display the prompt
      process.stdout.write('> ');
    });

    this.client.setNotificationHandler(ResourceListChangedNotificationSchema, async () => {
      console.log(`\nResource list changed notification received!`);
      try {
        if (!this.client) {
          console.log('Client disconnected, cannot fetch resources');
          return;
        }
        const resourcesResult = await this.client.request(
          {
            method: 'resources/list',
            params: {}
          },
          ListResourcesResultSchema
        );
        console.log('Available resources count:', resourcesResult.resources.length);
      } catch {
        console.log('Failed to list resources after change notification');
      }
      // Re-display the prompt
      process.stdout.write('> ');
    });
  }

  public async connect() {
    await this.client.connect(this.transport);
    this.sessionId = this.transport.sessionId;
    console.log('Transport created with session ID:', this.sessionId);
    console.log('Connected to MCP server');
    //
    // // Get tools with custom configuration
    // const tools = await loadMcpTools('Weather App', this.client, {
    //   // Whether to throw errors if a tool fails to load (optional, default: true)
    //   throwOnLoadError: true,
    //   // Whether to prefix tool names with the server name (optional, default: false)
    //   prefixToolNameWithServerName: false,
    //   // Optional additional prefix for tool names (optional, default: "")
    //   additionalToolNamePrefix: ''
    // });
    //
    // this.agent = createReactAgent({ llm: this.model, tools });
  }

  public async listTools() {
    if (!this.client) {
      console.log('Not connected to server.');
      return;
    }

    try {
      const toolsRequest = {
        method: 'tools/list',
        params: {}
      };
      const toolsResult = await this.client.request(toolsRequest, ListResourcesResultSchema);

      console.log('Available tools:');
      if (toolsResult.resources.length === 0) {
        console.log('  No tools available');
      } else {
        for (const tool of toolsResult.resources) {
          console.log(`  - ${tool.name}: ${tool.description}`);
        }
      }
    } catch (error) {
      console.log(`Tools not supported by this server (${error})`);
    }
  }

  public async callTool(name: string, args: Record<string, unknown>) {
    if (!this.client) {
      console.log('Not connected to server.');
      return;
    }

    try {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      };

      console.log(`Calling tool '${name}' with args:`, args);
      const result = await this.client.request(request, CallToolResultSchema);

      console.log('Tool result:');
      result.content.forEach((item) => {
        if (item.type === 'text') {
          console.log(`  ${item.text}`);
        } else {
          console.log(`  ${item.type} content:`, item);
        }
      });
    } catch (error) {
      console.log(`Error calling tool ${name}: ${error}`);
    }
  }

  public async invoke(message: string) {
    return this.agent.invoke({
      messages: [{ role: 'user', content: message }]
    });
  }
}

async function main() {
  const client = new AzureStreamableWeatherClient();
  await client.connect();
  console.error('Azure OpenAI Streamable Weather client running');
  await client.listTools();
  // await client.callTool('get-alerts', { state: 'OR' });
  // await client.callTool('get-forecast', { state: 'OR' });
  // let result = await client.invoke('What is the weather like in Seattle?');
  // let finalMessage = result.messages[result.messages.length - 1];
  // console.log(`\nResult: ${finalMessage.content}`);
  //
  // result = await client.invoke('What is the weather forecast for Oregon?');
  // finalMessage = result.messages[result.messages.length - 1];
  // console.log(`\nResult: ${finalMessage.content}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
