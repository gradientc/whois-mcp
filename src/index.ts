#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { green, red, yellow } from './utils.js'

async function main() {
  const server = new McpServer({
    name: 'whois',
    version: '1.0.0',
    description: 'MCP for whois lookup about domain, IP, TLD, ASN, etc.',
  });
  registerTools(server);

	let transport = new StdioServerTransport();
	await server.connect(transport);

	const cleanup = async () => {
		console.log(yellow('\n⚠️ Shutting down MCP server...'));
    await transport.close();
    process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	console.error(green('✅ Whois MCP Server running on stdio'));
}

function handleError(error: any) {
	console.error(red('\n🚨  Error initializing Whois MCP server:\n'));
	console.error(yellow(`   ${error.message}\n`));
}

main().catch((error) => {
	handleError(error);
});
