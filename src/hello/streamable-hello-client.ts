import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureChatOpenAI } from '@langchain/openai';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import {
  CallToolRequest,
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListToolsRequest,
  ListToolsResultSchema,
  LoggingMessageNotificationSchema,
  ResourceListChangedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

export class StreamableHelloClient {
  private transport: StreamableHTTPClientTransport;
  private sessionId: string | undefined = undefined;
  private client: Client;
  private agent: any;
  private model: AzureChatOpenAI;
  private notificationCount: number = 0;

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

    // Get tools with custom configuration
    // const tools = await loadMcpTools('Hello App', this.client, {
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

      // console.log('Tool result:');
      // result.content.forEach((item) => {
      //   if (item.type === 'text') {
      //     console.log(`  ${item.text}`);
      //   } else {
      //     console.log(`  ${item.type} content:`, item);
      //   }
      // });

      console.log('Tool result:');
      // const resourceLinks: ResourceLink[] = [];

      result.content.forEach((item) => {
        if (item.type === 'text') {
          console.log(`  ${item.text}`);
          // } else if (item.type === 'resource_link') {
          //   const resourceLink = item as ResourceLink;
          //   resourceLinks.push(resourceLink);
          //   console.log(`  📁 Resource Link: ${resourceLink.name}`);
          //   console.log(`     URI: ${resourceLink.uri}`);
          //   if (resourceLink.mimeType) {
          //     console.log(`     Type: ${resourceLink.mimeType}`);
          //   }
          //   if (resourceLink.description) {
          //     console.log(`     Description: ${resourceLink.description}`);
          //   }
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

      // Offer to read resource links
      // if (resourceLinks.length > 0) {
      //   console.log(
      //     `\nFound ${resourceLinks.length} resource link(s). Use 'read-resource <uri>' to read their content.`
      //   );
      // }
    } catch (error) {
      console.log(`Error calling tool ${name}: ${error}`);
    }
  }
}

async function main() {
  const client = new StreamableHelloClient();
  await client.connect();
  console.log('Streamable Hello Client is running.');
  await client.listTools();
  // await client.callTool('greet', { name: 'Indra' });
  // await client.callTool('get-session', {});
  // await client.callTool('multi-greet', { name: 'Indra' });
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
