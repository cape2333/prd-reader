# PrdReader MCP （WIP）

A Model Context Protocol (MCP) server that provides read ability from Product Requirement Documents like Confluence, Notion and Google Docs, with AI summarization capabilities.

## Key Features

- **Multi-platform Support**: Read PRD from popular online document platforms including Confluence, Notion and Google Docs
- **AI Summarization**: Support Claude AI to summarize document content and extract key points
- **MCP Compatible**: Follows MCP specification for seamless integration with Claude Code and other MCP clients

## Requirements 
- Node.js 18 or newer

## Getting Started

First, install PrdReader MCP server with your client.

**Standard Config** works in most of the tools:

```json
{
  "mcpServers": {
    "prd-reader": {
      "command": "npx",
      "args": [
        "@prd-reader@latest"
      ]
    }
  }
}
```

## Available Tools

### 1. read_confluence_page
Read content from a Confluence page by URL.

**Parameters:**
- `url` (string, required): The URL of the Confluence page to read
- `username` (string, required): Confluence username for authentication  
- `token` (string, required): Confluence API token for authentication

**Example:**
```json
{
  "url": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title",
  "username": "your-email@domain.com",
  "token": "your-confluence-api-token"
}
```

### 2. read_notion_page
Read content from a Notion page by URL.

**Parameters:**
- `url` (string, required): The URL of the Notion page to read
- `token` (string, required): Notion integration token for authentication

**Example:**
```json
{
  "url": "https://www.notion.so/your-workspace/Page-Title-123abc456def",
  "token": "secret_your-notion-integration-token"
}
```

### 3. read_google_doc
Read content from a Google Doc by URL.

**Parameters:**
- `url` (string, required): The URL of the Google Doc to read
- `credentials` (string, required): Google service account credentials JSON

**Example:**
```json
{
  "url": "https://docs.google.com/document/d/your-document-id/edit",
  "credentials": "{\"type\":\"service_account\",\"project_id\":\"your-project\",...}"
}
```

### 4. summarize_document
Summarize document content using Claude AI.

**Parameters:**
- `content` (string, required): The document content to summarize
- `title` (string, optional): Document title for better context
- `apiKey` (string, required): Anthropic Claude API key
- `model` (string, optional): Claude model to use (defaults to claude-3-haiku-20240307)

**Example:**
```json
{
  "content": "Your long document content here...",
  "title": "Product Requirements Document",
  "apiKey": "sk-ant-your-claude-api-key",
  "model": "claude-3-haiku-20240307"
}
```

## Authentication Setup

### Confluence
1. Go to your Atlassian account settings
2. Create an API token under "Security" → "Create and manage API tokens"
3. Use your email and API token for authentication

### Notion
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the integration token
4. Share your pages with the integration

### Google Docs
1. Go to Google Cloud Console
2. Enable Google Docs API
3. Create a service account
4. Download the credentials JSON
5. Share your documents with the service account email

### Claude AI
1. Go to https://console.anthropic.com/
2. Create an API key
3. Use the key for summarization features

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev

# Build for production
pnpm run build

# Run built version
pnpm run start
```

## License

MIT
