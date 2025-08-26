# PrdReader MCP

A Model Context Protocol (MCP) server that provide read aiblity from Product Requirement Document like Confluence, Notion and Google Docs.

## Key Features

- Read prd from popular online document platform that include confluence, Notion and Google Docs.
- Support llm option to summary document content. 

## Requirement 
- Node.js 18 or newer

## Getting started

First, install PrdReader MCP server with your client.

**Standard Config** works in most of the tools:

```
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