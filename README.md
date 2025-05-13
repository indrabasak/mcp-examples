MCP Examples
========================
The Model Context Protocol (MCP) allows you to build servers that expose data and functionality to LLM 
applications in a secured and standard manner. MCP servers can expose data via **resources** (similar to GET endpoints),
provide functionality through **tools**, and define interaction patterns through **prompts**.

npx @modelcontextprotocol/inspector node build/echo/echo-server.js