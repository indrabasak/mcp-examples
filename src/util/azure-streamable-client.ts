import {
  CallToolRequest,
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListToolsRequest,
  ListToolsResultSchema,
  LoggingMessageNotificationSchema,
  ResourceListChangedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { AzureChatOpenAI } from '@langchain/openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import 'dotenv/config';

export class AzureStreamableClient {
  private model: AzureChatOpenAI;
  private readonly transport: StreamableHTTPClientTransport;
  private readonly client: Client;
  private sessionId: string | undefined = undefined;
  private agent: any;
  private notificationCount: number = 0;

  constructor(name: string, version: string, url: string) {
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

    this.transport = new StreamableHTTPClientTransport(new URL(url), {
      sessionId: this.sessionId
    });

    this.client = new Client({
      name,
      version
    });
    this.addNotificationHandlers();
  }

  private addNotificationHandlers() {
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

  public async listTools() {
    if (!this.client) {
      console.log('Not connected to server.');
      return;
    }

    try {
      const toolsRequest: ListToolsRequest = {
        method: 'tools/list',
        params: {}
      };
      console.log('------------------ Tools requested');
      const toolsResult = await this.client.request(toolsRequest, ListToolsResultSchema);

      console.log('Available tools:');
      if (toolsResult.tools.length === 0) {
        console.log('  No tools available');
      } else {
        for (const tool of toolsResult.tools) {
          console.log(`  - ${tool.name}: ${tool.description}`);
        }
      }
    } catch (error) {
      console.log(`Tools not supported by this server (${error})`);
    }
  }

  public async callTool(name: string, args: Record<string, unknown>) {
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^');
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
        } else if (item.type === 'resource') {
          console.log(`  [Embedded Resource: ${item.resource.uri}]`);
        } else if (item.type === 'image') {
          console.log(`  [Image: ${item.mimeType}]`);
        } else if (item.type === 'audio') {
          console.log(`  [Audio: ${item.mimeType}]`);
        } else {
          console.log(`  [Unknown content type]:`, item);
        }
      });
    } catch (error) {
      console.log(`Error calling tool ${name}: ${error}`);
    }
  }

  public async quit(): Promise<void> {
    if (this.client && this.transport) {
      try {
        // First try to terminate the session gracefully
        if (this.transport.sessionId) {
          try {
            console.log('Terminating session before exit...');
            await this.transport.terminateSession();
            console.log('Session terminated successfully');
          } catch (error) {
            console.error('Error terminating session:', error);
          }
        }

        // Then close the transport
        await this.transport.close();
      } catch (error) {
        console.error('Error closing transport:', error);
      }
    }

    process.stdin.setRawMode(false);
    console.log('\nGoodbye!');
    process.exit(0);
  }

  public async invoke(message: string) {
    return this.agent.invoke({
      messages: [{ role: 'user', content: message }]
    });
  }
}
