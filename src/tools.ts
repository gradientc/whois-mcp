import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { whoisAsn, whoisDomain, whoisTld, whoisIp } from 'whoiser';

const WHOIS_TIMEOUT = parseInt(process.env.WHOIS_TIMEOUT || '15000', 10);

function withTimeout<T>(promise: Promise<T>, ms: number = WHOIS_TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`WHOIS lookup timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const domainSchema = z.string()
  .min(1)
  .max(253)
  .regex(/^[a-z0-9.-]+$/i, 'Invalid domain format');

const tldSchema = z.string()
  .min(2)
  .max(63)
  .regex(/^(xn--)?[a-z0-9-]+$/i, 'Invalid TLD format');

const ipSchema = z.string().ip();

const asnSchema = z.string()
  .regex(/^AS\d+$/i, 'ASN must be in format AS12345')
  .transform(s => parseInt(s.slice(2)));

export function registerTools(server: McpServer) {
  server.tool(
    'whois_domain',
    'Looksup whois information about the domain',
    { domain: domainSchema },
    async ({ domain }) => {
      try {
        const result = await withTimeout(whoisDomain(domain));
        return {
          content: [{ type: 'text', text: `Domain whois lookup for: \n${JSON.stringify(result)}` }],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'whois_tld',
    'Looksup whois information about the Top Level Domain (TLD)',
    { tld: tldSchema },
    async ({ tld }) => {
      try {
        const result = await withTimeout(whoisTld(tld));
        return {
          content: [{ type: 'text', text: `TLD whois lookup for: \n${JSON.stringify(result)}` }],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'whois_ip',
    'Looksup whois information about the IP',
    { ip: ipSchema },
    async ({ ip }) => {
      try {
        const result = await withTimeout(whoisIp(ip));
        return {
          content: [{ type: 'text', text: `IP whois lookup for: \n${JSON.stringify(result)}` }],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'whois_as',
    'Looksup whois information about the Autonomous System Number (ASN)',
    { asn: asnSchema },
    async ({ asn }) => {
      try {
        const result = await withTimeout(whoisAsn(asn));
        return {
          content: [{ type: 'text', text: `ASN whois lookup for: \n${JSON.stringify(result)}` }],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
