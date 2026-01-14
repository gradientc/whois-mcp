#!/usr/bin/env node

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTools } from './tools.js';
import { green, red, yellow, blue } from './utils.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '100', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
const API_KEY = process.env.MCP_API_KEY || '';

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

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) return next();
  const auth = req.header('authorization') || req.header('x-api-key') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const app = express();

app.disable('x-powered-by');

app.use(cors({
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
}));

app.use(express.json({ limit: '256kb' }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Whois MCP Server',
    version: '1.0.0',
    status: 'running',
    activeSessions: transports.size,
    endpoints: {
      sse: '/sse',
      message: '/message',
    },
  });
});

app.get('/sse', requireApiKey, async (req: Request, res: Response) => {
  console.log(blue('New SSE connection request'));

  if (transports.size >= MAX_SESSIONS) {
    console.log(yellow(`Session limit reached (${MAX_SESSIONS})`));
    res.status(503).json({ error: 'Too many sessions' });
    return;
  }

  const transport = new SSEServerTransport('/message', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  const cleanup = () => {
    transports.delete(sessionId);
  };

  transport.onclose = () => {
    console.log(yellow(`SSE connection closed: ${sessionId}`));
    cleanup();
  };

  req.on('close', cleanup);

  const server = createServer();

  try {
    await server.connect(transport);
    console.log(green(`SSE connection established: ${sessionId}`));
  } catch (error) {
    console.error(red(`Failed to connect SSE transport: ${error}`));
    cleanup();
    try { transport.close(); } catch {}
  }
});

app.post('/message', requireApiKey, async (req: Request, res: Response) => {
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
  console.log(blue(`   Max sessions: ${MAX_SESSIONS}`));
  if (API_KEY) {
    console.log(yellow('   API key authentication: enabled'));
  }
  if (CORS_ORIGINS.length) {
    console.log(yellow(`   CORS origins: ${CORS_ORIGINS.join(', ')}`));
  }
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
