import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { whoisAsn, whoisDomain, whoisTld, whoisIp } from 'whoiser';

export function registerTools(server: McpServer) {
  server.tool(
    'whois_domain',
    'Looksup whois information about the domain',
    { domain: z.string().min(1) },
    async ({ domain }) => {
      try {
        const result = await whoisDomain(domain);
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
    { tld: z.string().min(1) },
    async ({ tld }) => {
      try {
        const result = await whoisTld(tld);
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
    { ip: z.string().ip() },
    async ({ ip }) => {
      try {
        const result = await whoisIp(ip);
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
    { asn: z.string().regex(/^AS\d+$/i).transform(s => parseInt(s.slice(2))) },
    async ({ asn }) => {
      try {
        const result = await whoisAsn(asn);
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
