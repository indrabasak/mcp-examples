MCP Examples
========================
This project contains TypeScript examples featuring Model Context Protocol(MCP).

MCP allows you to build servers that expose data and functionality to LLM 
applications in a secured and standard manner. MCP servers can expose data via **resources** (similar to GET endpoints),
provide functionality through **tools**, and define interaction patterns through **prompts**.

Clients can access MCP servers using the following protocols:
 - **StandardIO:** This protocol is used for connecting to servers running on the same machine as the client.
 - **SSE:** This protocol is used for connecting to remote servers.

npx @modelcontextprotocol/inspector node build/echo/echo-server.js