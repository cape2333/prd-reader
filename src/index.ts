#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceClient } from './confluence.js';
import { NotionClient } from './notion.js';
import { GoogleDocsClient } from './google-docs.js';
import { DocumentSummarizer } from './summarizer.js';

interface ConfluencePageArgs {
  url: string;
  username: string;
  token: string;
}

interface NotionPageArgs {
  url: string;
  token: string;
}

interface GoogleDocArgs {
  url: string;
  credentials: string;
}

interface SummarizeArgs {
  content: string;
  title?: string;
  apiKey: string;
  model?: string;
}

function isConfluencePageArgs(args: unknown): args is ConfluencePageArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof (args as Record<string, unknown>).url === 'string' &&
    typeof (args as Record<string, unknown>).username === 'string' &&
    typeof (args as Record<string, unknown>).token === 'string'
  );
}

function isNotionPageArgs(args: unknown): args is NotionPageArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof (args as Record<string, unknown>).url === 'string' &&
    typeof (args as Record<string, unknown>).token === 'string'
  );
}

function isGoogleDocArgs(args: unknown): args is GoogleDocArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof (args as Record<string, unknown>).url === 'string' &&
    typeof (args as Record<string, unknown>).credentials === 'string'
  );
}

function isSummarizeArgs(args: unknown): args is SummarizeArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof (args as Record<string, unknown>).content === 'string' &&
    typeof (args as Record<string, unknown>).apiKey === 'string'
  );
}

class PrdReaderServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'prd-reader',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_confluence_page',
            description: 'Read content from a Confluence page by URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the Confluence page to read'
                },
                username: {
                  type: 'string',
                  description: 'Confluence username for authentication'
                },
                token: {
                  type: 'string',
                  description: 'Confluence API token for authentication'
                }
              },
              required: ['url', 'username', 'token']
            }
          },
          {
            name: 'read_notion_page',
            description: 'Read content from a Notion page by URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the Notion page to read'
                },
                token: {
                  type: 'string',
                  description: 'Notion integration token for authentication'
                }
              },
              required: ['url', 'token']
            }
          },
          {
            name: 'read_google_doc',
            description: 'Read content from a Google Doc by URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the Google Doc to read'
                },
                credentials: {
                  type: 'string',
                  description: 'Google service account credentials JSON'
                }
              },
              required: ['url', 'credentials']
            }
          },
          {
            name: 'summarize_document',
            description: 'Summarize document content using Claude AI',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The document content to summarize'
                },
                title: {
                  type: 'string',
                  description: 'Optional document title for better context'
                },
                apiKey: {
                  type: 'string',
                  description: 'Anthropic Claude API key'
                },
                model: {
                  type: 'string',
                  description: 'Claude model to use (optional, defaults to claude-3-haiku-20240307)'
                }
              },
              required: ['content', 'apiKey']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_confluence_page':
            if (!isConfluencePageArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for read_confluence_page'
              );
            }
            return await this.readConfluencePage(args);
          case 'read_notion_page':
            if (!isNotionPageArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for read_notion_page'
              );
            }
            return await this.readNotionPage(args);
          case 'read_google_doc':
            if (!isGoogleDocArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for read_google_doc'
              );
            }
            return await this.readGoogleDoc(args);
          case 'summarize_document':
            if (!isSummarizeArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for summarize_document'
              );
            }
            return await this.summarizeDocument(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${errorMessage}`
        );
      }
    });
  }

  private async readConfluencePage(args: ConfluencePageArgs) {
    try {
      const { baseUrl } = ConfluenceClient.parseConfluenceUrl(args.url);
      
      const client = new ConfluenceClient({
        baseUrl,
        username: args.username,
        token: args.token
      });

      const page = await client.getPageByUrl(args.url);

      return {
        content: [
          {
            type: 'text',
            text: `# ${page.title}\n\n${page.content}\n\nSource: ${page.url}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error reading Confluence page: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private async readNotionPage(args: NotionPageArgs) {
    try {
      const client = new NotionClient({
        token: args.token
      });

      const page = await client.getPageByUrl(args.url);

      return {
        content: [
          {
            type: 'text',
            text: `# ${page.title}\n\n${page.content}\n\nSource: ${page.url}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error reading Notion page: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private async readGoogleDoc(args: GoogleDocArgs) {
    try {
      const client = new GoogleDocsClient({
        credentials: args.credentials
      });

      const doc = await client.getDocByUrl(args.url);

      return {
        content: [
          {
            type: 'text',
            text: `# ${doc.title}\n\n${doc.content}\n\nSource: ${doc.url}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error reading Google Doc: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private async summarizeDocument(args: SummarizeArgs) {
    try {
      const summarizer = new DocumentSummarizer({
        apiKey: args.apiKey,
        model: args.model
      });

      const summary = await summarizer.summarize(args.content, args.title);

      return {
        content: [
          {
            type: 'text',
            text: `## Document Summary\n\n${summary}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error summarizing document: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PrdReader MCP server running on stdio');
  }
}

const server = new PrdReaderServer();
server.run().catch(console.error);