#!/usr/bin/env node

import express, { Request, Response } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTools } from './tools.js';
import { green, red, yellow, blue } from './utils.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const transports = new Map<string, SSEServerTransport>();

function createServer(): McpServer {
  const server = new McpServer({
    name: 'whois',
    version: '1.0.0',
    description: 'MCP for whois lookup about domain, IP, TLD, ASN, etc.',
  });
  registerTools(server);
  return server;
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Whois MCP Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      sse: '/sse',
      message: '/message',
    },
  });
});

app.get('/sse', async (req: Request, res: Response) => {
  console.log(blue('New SSE connection request'));

  const transport = new SSEServerTransport('/message', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  transport.onclose = () => {
    console.log(yellow(`SSE connection closed: ${sessionId}`));
    transports.delete(sessionId);
  };

  const server = createServer();

  try {
    await server.connect(transport);
    console.log(green(`SSE connection established: ${sessionId}`));
  } catch (error) {
    console.error(red(`Failed to connect SSE transport: ${error}`));
    transports.delete(sessionId);
  }
});

app.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }

  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(red(`Error handling message: ${error}`));
    res.status(500).json({ error: 'Internal server error' });
  }
});

const httpServer = app.listen(PORT, () => {
  console.log(green(`\n✅ Whois MCP Server running on http://localhost:${PORT}`));
  console.log(blue(`   SSE endpoint: http://localhost:${PORT}/sse`));
  console.log(blue(`   Message endpoint: http://localhost:${PORT}/message`));
  console.log(yellow('\nFor Poke.com integration, use the /sse endpoint URL\n'));
});

const cleanup = () => {
  console.log(yellow('\n⚠️ Shutting down MCP server...'));
  for (const transport of transports.values()) {
    transport.close();
  }
  httpServer.close(() => {
    console.log(green('Server shut down gracefully'));
    process.exit(0);
  });
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
